import { prisma } from "@/lib/prisma";
import { buildTripGeo } from "@/services/route.service";
import { createBooking } from "@/services/booking.service";

export async function createProposal(input: {
  driverId: string;
  wishId: string;
  tripId?: string;
  price: number;
  time?: string;
  message?: string;
}) {
  const wish = await prisma.tripRequest.findUnique({
    where: { id: input.wishId },
  });

  if (!wish || wish.status !== "OPEN") {
    throw new Error("Пожелание недоступно");
  }

  if (wish.passengerId === input.driverId) {
    throw new Error("Нельзя предлагать место самому себе");
  }

  const driver = await prisma.user.findUnique({
    where: { id: input.driverId },
    select: { phone: true },
  });
  if (!driver?.phone || driver.phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите телефон в профиле, чтобы предлагать места");
  }

  let tripId = input.tripId;

  if (tripId) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, driverId: input.driverId },
      include: {
        bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } } },
      },
    });
    if (!trip) throw new Error("Поездка не найдена");
    if (trip.seats - trip.bookings.length < wish.seats) {
      throw new Error("Недостаточно свободных мест в поездке");
    }
  }

  const existing = await prisma.proposal.findUnique({
    where: {
      wishId_driverId: { wishId: input.wishId, driverId: input.driverId },
    },
  });

  if (existing?.status === "PENDING") {
    throw new Error("Вы уже отправили предложение этому пассажиру");
  }

  if (existing) {
    return prisma.proposal.update({
      where: { id: existing.id },
      data: {
        tripId: tripId ?? null,
        price: input.price,
        time: input.time,
        message: input.message,
        status: "PENDING",
      },
    });
  }

  return prisma.proposal.create({
    data: {
      wishId: input.wishId,
      driverId: input.driverId,
      tripId: tripId ?? null,
      price: input.price,
      time: input.time,
      message: input.message,
      status: "PENDING",
    },
  });
}

export async function acceptProposal(proposalId: string, passengerId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      wish: true,
      driver: { select: { id: true, name: true, phone: true, image: true, rating: true } },
    },
  });

  if (!proposal || proposal.wish.passengerId !== passengerId) {
    throw new Error("Предложение не найдено");
  }

  if (proposal.status !== "PENDING") {
    throw new Error("Предложение уже обработано");
  }

  if (proposal.wish.status !== "OPEN") {
    throw new Error("Пожелание уже закрыто");
  }

  const passenger = await prisma.user.findUnique({
    where: { id: passengerId },
    select: { phone: true, name: true },
  });
  if (!passenger?.phone || passenger.phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите телефон в профиле перед принятием");
  }

  let tripId = proposal.tripId;

  if (!tripId) {
    const geo = await buildTripGeo(proposal.wish.fromCity, proposal.wish.toCity);
    const trip = await prisma.trip.create({
      data: {
        fromCity: proposal.wish.fromCity,
        toCity: proposal.wish.toCity,
        fromLat: geo.fromLat,
        fromLng: geo.fromLng,
        toLat: geo.toLat,
        toLng: geo.toLng,
        routePolyline: geo.routePolyline,
        durationMin: geo.durationMin,
        distanceKm: geo.distanceKm,
        date: proposal.wish.date,
        time: proposal.time || "12:00",
        seats: Math.max(proposal.wish.seats, 1) + 1,
        price: proposal.price,
        comment: proposal.message,
        driverId: proposal.driverId,
      },
    });

    await prisma.user.update({
      where: { id: proposal.driverId },
      data: { tripsCount: { increment: 1 } },
    });

    tripId = trip.id;
  }

  // Водитель уже предложил место — взаимное согласие = сразу CONFIRMED
  const booking = await createBooking(tripId, passengerId, { autoConfirm: true });

  await prisma.$transaction([
    prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED", tripId },
    }),
    prisma.tripRequest.update({
      where: { id: proposal.wishId },
      data: { status: "MATCHED" },
    }),
    prisma.proposal.updateMany({
      where: {
        wishId: proposal.wishId,
        id: { not: proposalId },
        status: "PENDING",
      },
      data: { status: "DECLINED" },
    }),
  ]);

  return {
    tripId,
    bookingId: booking.id,
    driverPhone: proposal.driver.phone,
    passengerPhone: passenger.phone,
    driverName: proposal.driver.name,
  };
}

export async function declineProposal(proposalId: string, passengerId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { wish: true },
  });

  if (!proposal || proposal.wish.passengerId !== passengerId) {
    throw new Error("Предложение не найдено");
  }

  if (proposal.status !== "PENDING") {
    throw new Error("Предложение уже обработано");
  }

  return prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "DECLINED" },
  });
}

export async function cancelProposal(proposalId: string, driverId: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, driverId },
  });

  if (!proposal) throw new Error("Предложение не найдено");
  if (proposal.status !== "PENDING") {
    throw new Error("Нельзя отменить обработанное предложение");
  }

  return prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "CANCELLED" },
  });
}

export async function getDriverProposals(driverId: string) {
  const proposals = await prisma.proposal.findMany({
    where: { driverId },
    include: {
      wish: {
        include: {
          passenger: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
              phone: true,
            },
          },
        },
      },
      trip: {
        select: {
          id: true,
          fromCity: true,
          toCity: true,
          date: true,
          time: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = proposals.filter((p) => p.status === "ACCEPTED" && p.tripId);
  const bookings =
    accepted.length > 0
      ? await prisma.booking.findMany({
          where: {
            tripId: { in: accepted.map((p) => p.tripId as string) },
            status: { in: ["PENDING", "CONFIRMED"] },
            trip: { driverId },
          },
          select: { id: true, tripId: true, userId: true },
        })
      : [];

  return proposals.map((p) => {
    const passengerId = p.wish.passengerId;
    const booking = p.tripId
      ? bookings.find((b) => b.tripId === p.tripId && b.userId === passengerId)
      : undefined;
    return { ...p, bookingId: booking?.id ?? null };
  });
}

export async function getPassengerPendingProposalsCount(passengerId: string) {
  return prisma.proposal.count({
    where: {
      status: "PENDING",
      wish: { passengerId, status: "OPEN" },
    },
  });
}

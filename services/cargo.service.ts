import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED"];

export async function createCargoTrip(
  carrierId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    vehicleType: string;
    maxWeightKg: number;
    maxVolumeM3?: number;
    price: number;
    comment?: string;
    routePolyline?: string;
  }
) {
  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(
    data.fromCity,
    data.toCity,
    data.routePolyline
  );

  return prisma.cargoTrip.create({
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      date: data.date,
      time: data.time,
      vehicleType: data.vehicleType,
      maxWeightKg: data.maxWeightKg,
      maxVolumeM3: data.maxVolumeM3 ?? null,
      price: data.price,
      comment: data.comment,
      carrierId,
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      routePolyline: geo.routePolyline,
    },
  });
}

export async function updateCargoTrip(
  tripId: string,
  carrierId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    vehicleType: string;
    maxWeightKg: number;
    maxVolumeM3?: number;
    price: number;
    comment?: string;
    routePolyline?: string;
  }
) {
  const trip = await prisma.cargoTrip.findFirst({
    where: { id: tripId, carrierId },
  });
  if (!trip) throw new Error("Рейс не найден");

  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(
    data.fromCity,
    data.toCity,
    data.routePolyline
  );

  return prisma.cargoTrip.update({
    where: { id: tripId },
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      date: data.date,
      time: data.time,
      vehicleType: data.vehicleType,
      maxWeightKg: data.maxWeightKg,
      maxVolumeM3: data.maxVolumeM3 ?? null,
      price: data.price,
      comment: data.comment,
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      routePolyline: geo.routePolyline,
    },
  });
}

export async function getCarrierCargoTrips(carrierId: string) {
  return prisma.cargoTrip.findMany({
    where: { carrierId },
    include: {
      bookings: {
        where: { status: { in: ACTIVE } },
        include: {
          shipper: {
            select: { id: true, name: true, image: true, phone: true, rating: true },
          },
        },
      },
    },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
}

export async function searchCargoTrips(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
}) {
  const where: {
    date?: Date;
  } = {};

  if (filters.date) where.date = new Date(filters.date);

  const trips = await prisma.cargoTrip.findMany({
    where,
    include: {
      carrier: {
        select: {
          id: true,
          name: true,
          image: true,
          rating: true,
        },
      },
      bookings: {
        where: { status: { in: ACTIVE } },
        select: { id: true, shipperId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: 50,
  });

  const fromQ = filters.fromCity?.trim().toLowerCase();
  const toQ = filters.toCity?.trim().toLowerCase();

  return trips.filter((t) => {
    const fromOk = !fromQ || t.fromCity.toLowerCase().includes(fromQ);
    const toOk = !toQ || t.toCity.toLowerCase().includes(toQ);
    return fromOk && toOk;
  });
}

export async function deleteCargoTrip(tripId: string, carrierId: string) {
  const trip = await prisma.cargoTrip.findFirst({
    where: { id: tripId, carrierId },
  });
  if (!trip) throw new Error("Рейс не найден");
  return prisma.cargoTrip.delete({ where: { id: tripId } });
}

export async function createCargoRequest(
  shipperId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    title: string;
    weightKg: number;
    volumeM3?: number;
    comment?: string;
    image?: string | null;
  }
) {
  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(data.fromCity, data.toCity);

  return prisma.cargoRequest.create({
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      date: data.date,
      time: data.time,
      title: data.title,
      weightKg: data.weightKg,
      volumeM3: data.volumeM3 ?? null,
      comment: data.comment,
      image: data.image ?? null,
      shipperId,
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      status: "OPEN",
    },
  });
}

export async function updateCargoRequest(
  requestId: string,
  shipperId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    title: string;
    weightKg: number;
    volumeM3?: number;
    comment?: string;
    image?: string | null;
  }
) {
  const req = await prisma.cargoRequest.findFirst({
    where: { id: requestId, shipperId },
  });
  if (!req) throw new Error("Заявка не найдена");
  if (req.status !== "OPEN") {
    throw new Error("Редактировать можно только открытую заявку");
  }

  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(data.fromCity, data.toCity);

  return prisma.cargoRequest.update({
    where: { id: requestId },
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      date: data.date,
      time: data.time,
      title: data.title,
      weightKg: data.weightKg,
      volumeM3: data.volumeM3 ?? null,
      comment: data.comment,
      ...(data.image !== undefined ? { image: data.image } : {}),
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
    },
  });
}

export async function getShipperCargoRequests(shipperId: string) {
  return prisma.cargoRequest.findMany({
    where: {
      shipperId,
      status: { in: ["OPEN", "MATCHED"] },
    },
    include: {
      bookings: {
        where: { status: { in: ACTIVE } },
        include: {
          carrier: {
            select: { id: true, name: true, image: true, phone: true, rating: true },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });
}

export async function searchCargoRequests(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
}) {
  const where: {
    status: "OPEN";
    date?: Date;
  } = { status: "OPEN" };

  if (filters.date) where.date = new Date(filters.date);

  const requests = await prisma.cargoRequest.findMany({
    where,
    include: {
      shipper: {
        select: { id: true, name: true, image: true, rating: true },
      },
      bookings: {
        where: { status: { in: ACTIVE } },
        select: { id: true, carrierId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take: 50,
  });

  const fromQ = filters.fromCity?.trim().toLowerCase();
  const toQ = filters.toCity?.trim().toLowerCase();

  return requests.filter((r) => {
    const fromOk = !fromQ || r.fromCity.toLowerCase().includes(fromQ);
    const toOk = !toQ || r.toCity.toLowerCase().includes(toQ);
    return fromOk && toOk;
  });
}

export async function cancelCargoRequest(requestId: string, shipperId: string) {
  const req = await prisma.cargoRequest.findFirst({
    where: { id: requestId, shipperId },
  });
  if (!req) throw new Error("Заявка не найдена");

  await prisma.cargoBooking.updateMany({
    where: { cargoRequestId: requestId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  return prisma.cargoRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
}

/** Грузоотправитель бронирует рейс перевозчика */
export async function bookCargoTrip(cargoTripId: string, shipperId: string) {
  const trip = await prisma.cargoTrip.findUnique({
    where: { id: cargoTripId },
    include: {
      bookings: { where: { status: { in: ACTIVE } } },
      carrier: { select: { id: true, phone: true } },
    },
  });

  if (!trip) throw new Error("Рейс не найден");
  if (trip.carrierId === shipperId) {
    throw new Error("Нельзя забронировать свой рейс");
  }

  const shipper = await prisma.user.findUnique({
    where: { id: shipperId },
    select: { phone: true },
  });
  if (!shipper?.phone || shipper.phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите телефон в профиле");
  }

  const existing = await prisma.cargoBooking.findFirst({
    where: { cargoTripId, shipperId },
  });

  if (existing?.status === "CONFIRMED" || existing?.status === "PENDING") {
    throw new Error(
      existing.status === "PENDING"
        ? "Заявка уже отправлена — ждите подтверждения"
        : "Вы уже забронировали этот рейс"
    );
  }

  if (existing) {
    return prisma.cargoBooking.update({
      where: { id: existing.id },
      data: { status: "PENDING", carrierId: trip.carrierId },
    });
  }

  return prisma.cargoBooking.create({
    data: {
      cargoTripId,
      shipperId,
      carrierId: trip.carrierId,
      status: "PENDING",
    },
  });
}

/** Перевозчик берёт груз (заявку) */
export async function takeCargoRequest(cargoRequestId: string, carrierId: string) {
  const request = await prisma.cargoRequest.findUnique({
    where: { id: cargoRequestId },
    include: {
      bookings: { where: { status: { in: ACTIVE } } },
      shipper: { select: { id: true, phone: true } },
    },
  });

  if (!request || request.status !== "OPEN") {
    throw new Error("Заявка недоступна");
  }
  if (request.shipperId === carrierId) {
    throw new Error("Нельзя взять свой груз");
  }

  const carrier = await prisma.user.findUnique({
    where: { id: carrierId },
    select: { phone: true },
  });
  if (!carrier?.phone || carrier.phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите телефон в профиле");
  }

  if (request.bookings.some((b) => b.status === "CONFIRMED")) {
    throw new Error("Груз уже забронирован");
  }

  const existing = await prisma.cargoBooking.findFirst({
    where: { cargoRequestId, carrierId },
  });

  if (existing?.status === "PENDING" || existing?.status === "CONFIRMED") {
    throw new Error(
      existing.status === "PENDING"
        ? "Заявка уже отправлена — ждите подтверждения владельца"
        : "Вы уже взяли этот груз"
    );
  }

  if (existing) {
    return prisma.cargoBooking.update({
      where: { id: existing.id },
      data: { status: "PENDING", shipperId: request.shipperId },
    });
  }

  return prisma.cargoBooking.create({
    data: {
      cargoRequestId,
      carrierId,
      shipperId: request.shipperId,
      status: "PENDING",
    },
  });
}

export async function confirmCargoBooking(bookingId: string, userId: string) {
  const booking = await prisma.cargoBooking.findUnique({
    where: { id: bookingId },
    include: {
      cargoTrip: true,
      cargoRequest: true,
    },
  });

  if (!booking || booking.status !== "PENDING") {
    throw new Error("Заявка не найдена или уже обработана");
  }

  // Подтверждает владелец рейса (carrier) или владелец груза (shipper)
  const isTripOwner =
    booking.cargoTripId && booking.cargoTrip?.carrierId === userId;
  const isRequestOwner =
    booking.cargoRequestId && booking.cargoRequest?.shipperId === userId;

  if (!isTripOwner && !isRequestOwner) {
    throw new Error("Нет прав на подтверждение");
  }

  const updated = await prisma.cargoBooking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  });

  if (booking.cargoRequestId) {
    await prisma.cargoRequest.update({
      where: { id: booking.cargoRequestId },
      data: { status: "MATCHED" },
    });
    // Отклоняем другие pending на этот груз
    await prisma.cargoBooking.updateMany({
      where: {
        cargoRequestId: booking.cargoRequestId,
        id: { not: bookingId },
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });
  }

  return updated;
}

export async function rejectCargoBooking(bookingId: string, userId: string) {
  return cancelCargoBooking(bookingId, userId, "Отклонено");
}

/** Отмена перевозчиком или грузоотправителем (ожидание или подтверждено) */
export async function cancelCargoBooking(
  bookingId: string,
  userId: string,
  reasonRaw: string
) {
  const reason = reasonRaw.trim();
  if (reason.length < 5) {
    throw new Error("Укажите причину отмены (минимум 5 символов)");
  }
  if (reason.length > 500) {
    throw new Error("Причина слишком длинная");
  }

  const booking = await prisma.cargoBooking.findUnique({
    where: { id: bookingId },
    include: { cargoTrip: true, cargoRequest: true },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  if (booking.status === "CANCELLED") {
    throw new Error("Уже отменено");
  }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("Нельзя отменить это бронирование");
  }

  const isShipper = booking.shipperId === userId;
  const isCarrier = booking.carrierId === userId;
  const isTripOwner =
    booking.cargoTripId && booking.cargoTrip?.carrierId === userId;
  const isRequestOwner =
    booking.cargoRequestId && booking.cargoRequest?.shipperId === userId;

  if (!isShipper && !isCarrier && !isTripOwner && !isRequestOwner) {
    throw new Error("Нет прав на отмену");
  }

  const updated = await prisma.cargoBooking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledById: userId,
    },
  });

  // Если отменили подтверждённую передачу груза — снова открываем заявку
  if (
    booking.status === "CONFIRMED" &&
    booking.cargoRequestId &&
    booking.cargoRequest?.status === "MATCHED"
  ) {
    await prisma.cargoRequest.update({
      where: { id: booking.cargoRequestId },
      data: { status: "OPEN" },
    });
  }

  return updated;
}

export async function getMyCargoBookings(userId: string) {
  return prisma.cargoBooking.findMany({
    where: {
      status: { in: ACTIVE },
      OR: [{ shipperId: userId }, { carrierId: userId }],
    },
    include: {
      cargoTrip: {
        include: {
          carrier: {
            select: { id: true, name: true, image: true, phone: true, rating: true },
          },
        },
      },
      cargoRequest: {
        include: {
          shipper: {
            select: { id: true, name: true, image: true, phone: true, rating: true },
          },
        },
      },
      shipper: {
        select: { id: true, name: true, image: true, phone: true, rating: true },
      },
      carrier: {
        select: { id: true, name: true, image: true, phone: true, rating: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

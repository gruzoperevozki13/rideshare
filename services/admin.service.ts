import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminStats() {
  const today = startOfToday();
  const week = daysAgo(7);

  const [
    usersTotal,
    usersToday,
    usersWeek,
    tripsTotal,
    tripsToday,
    tripsWeek,
    bookingsTotal,
    bookingsToday,
    bookingsWeek,
    bookingsPending,
    wishesOpen,
    cargoTrips,
    cargoRequests,
    bannedUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.trip.count(),
    prisma.trip.count({ where: { createdAt: { gte: today } } }),
    prisma.trip.count({ where: { createdAt: { gte: week } } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: today } } }),
    prisma.booking.count({ where: { createdAt: { gte: week } } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.tripRequest.count({ where: { status: "OPEN" } }),
    prisma.cargoTrip.count(),
    prisma.cargoRequest.count(),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
  ]);

  return {
    usersTotal,
    usersToday,
    usersWeek,
    tripsTotal,
    tripsToday,
    tripsWeek,
    bookingsTotal,
    bookingsToday,
    bookingsWeek,
    bookingsPending,
    wishesOpen,
    cargoTrips,
    cargoRequests,
    bannedUsers,
  };
}

export async function listAdminUsers(opts: {
  q?: string;
  page?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rating: true,
        isAdmin: true,
        bannedAt: true,
        createdAt: true,
        tripsCount: true,
        emailVerified: true,
      },
    }),
  ]);

  return {
    users,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listAdminTrips(opts: { page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const [total, trips] = await Promise.all([
    prisma.trip.count(),
    prisma.trip.findMany({
      orderBy: [{ date: "desc" }, { time: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        driver: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    }),
  ]);

  return {
    trips,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listAdminBookings(opts: { page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const [total, bookings] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true } },
        trip: {
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            date: true,
            time: true,
            driver: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return {
    bookings,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function banUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { bannedAt: new Date() },
  });
}

export async function unbanUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { bannedAt: null },
  });
}

export async function deleteTripAdmin(tripId: string) {
  return prisma.trip.delete({ where: { id: tripId } });
}

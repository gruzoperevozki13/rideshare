import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED"];

export async function createBooking(
  tripId: string,
  userId: string,
  options?: { autoConfirm?: boolean }
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bookings: { where: { status: { in: ACTIVE } } },
      driver: { select: { id: true, phone: true } },
    },
  });

  if (!trip) {
    throw new Error("Поездка не найдена");
  }

  if (trip.driverId === userId) {
    throw new Error("Нельзя забронировать свою поездку");
  }

  const passenger = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (!passenger?.phone || passenger.phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите телефон в профиле перед бронированием");
  }

  const availableSeats = trip.seats - trip.bookings.length;
  if (availableSeats <= 0) {
    throw new Error("Нет свободных мест");
  }

  const status: BookingStatus = options?.autoConfirm ? "CONFIRMED" : "PENDING";

  const existing = await prisma.booking.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });

  if (existing?.status === "CONFIRMED") {
    throw new Error("Вы уже забронировали эту поездку");
  }

  if (existing?.status === "PENDING") {
    throw new Error("Заявка уже отправлена — ждите подтверждения водителя");
  }

  if (existing) {
    return prisma.booking.update({
      where: { id: existing.id },
      data: { status },
    });
  }

  return prisma.booking.create({
    data: { tripId, userId, status },
  });
}

export async function confirmBooking(bookingId: string, driverId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!booking || booking.trip.driverId !== driverId) {
    throw new Error("Бронирование не найдено");
  }

  if (booking.status !== "PENDING") {
    throw new Error("Заявка уже обработана");
  }

  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    select: { phone: true },
  });
  if (!driver?.phone) {
    throw new Error("Укажите свой телефон в профиле перед подтверждением");
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
    include: {
      user: { select: { id: true, name: true, phone: true, image: true } },
      trip: {
        include: {
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });
}

export async function rejectBooking(bookingId: string, driverId: string) {
  return cancelBooking(bookingId, driverId, "Отклонено водителем");
}

/** Отмена пассажиром или водителем (ожидание или уже подтверждено) */
export async function cancelBooking(
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

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { trip: { select: { driverId: true } } },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  const isPassenger = booking.userId === userId;
  const isDriver = booking.trip.driverId === userId;
  if (!isPassenger && !isDriver) {
    throw new Error("Нет доступа к этой брони");
  }

  if (booking.status === "CANCELLED") {
    throw new Error("Уже отменено");
  }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new Error("Нельзя отменить это бронирование");
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledById: userId,
    },
  });
}

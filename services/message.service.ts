import { prisma } from "@/lib/prisma";

async function assertBookingParticipant(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { select: { driverId: true } },
    },
  });

  if (!booking) throw new Error("Бронирование не найдено");
  if (booking.status === "CANCELLED") {
    throw new Error("Бронирование отменено");
  }

  const isPassenger = booking.userId === userId;
  const isDriver = booking.trip.driverId === userId;
  if (!isPassenger && !isDriver) {
    throw new Error("Нет доступа к чату");
  }

  return booking;
}

export async function getBookingMessages(bookingId: string, userId: string) {
  await assertBookingParticipant(bookingId, userId);

  return prisma.message.findMany({
    where: { bookingId },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function sendBookingMessage(
  bookingId: string,
  senderId: string,
  body: string
) {
  const text = body.trim();
  if (!text) throw new Error("Введите сообщение");
  if (text.length > 1000) throw new Error("Сообщение слишком длинное");

  await assertBookingParticipant(bookingId, senderId);

  return prisma.message.create({
    data: { bookingId, senderId, body: text },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });
}

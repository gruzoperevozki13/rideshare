import { prisma } from "@/lib/prisma";

async function assertCargoBookingParticipant(
  cargoBookingId: string,
  userId: string
) {
  const booking = await prisma.cargoBooking.findUnique({
    where: { id: cargoBookingId },
  });

  if (!booking) throw new Error("Бронирование не найдено");
  if (booking.status === "CANCELLED") {
    throw new Error("Бронирование отменено");
  }

  const isShipper = booking.shipperId === userId;
  const isCarrier = booking.carrierId === userId;
  if (!isShipper && !isCarrier) {
    throw new Error("Нет доступа к чату");
  }

  return booking;
}

export async function getCargoBookingMessages(
  cargoBookingId: string,
  userId: string
) {
  await assertCargoBookingParticipant(cargoBookingId, userId);

  return prisma.cargoMessage.findMany({
    where: { cargoBookingId },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function sendCargoBookingMessage(
  cargoBookingId: string,
  senderId: string,
  body: string
) {
  const text = body.trim();
  if (!text) throw new Error("Введите сообщение");
  if (text.length > 1000) throw new Error("Сообщение слишком длинное");

  await assertCargoBookingParticipant(cargoBookingId, senderId);

  return prisma.cargoMessage.create({
    data: { cargoBookingId, senderId, body: text },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });
}

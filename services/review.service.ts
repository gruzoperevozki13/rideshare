import { prisma } from "@/lib/prisma";

function tripDateTime(date: Date, time: string) {
  const [h = "0", m = "0"] = time.split(":");
  const d = new Date(date);
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

export async function createReview(data: {
  bookingId: string;
  authorId: string;
  rating: number;
  comment?: string;
}) {
  if (data.rating < 1 || data.rating > 5) {
    throw new Error("Оценка от 1 до 5");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      trip: { select: { driverId: true, date: true, time: true } },
    },
  });

  if (!booking) throw new Error("Бронирование не найдено");
  if (booking.status !== "CONFIRMED") {
    throw new Error("Оценить можно только подтверждённую поездку");
  }

  const isPassenger = booking.userId === data.authorId;
  const isDriver = booking.trip.driverId === data.authorId;
  if (!isPassenger && !isDriver) {
    throw new Error("Вы не участник этой поездки");
  }

  const departure = tripDateTime(booking.trip.date, booking.trip.time);
  if (departure.getTime() > Date.now()) {
    throw new Error("Оценку можно поставить после времени выезда");
  }

  const receiverId = isPassenger ? booking.trip.driverId : booking.userId;

  const existing = await prisma.review.findUnique({
    where: {
      bookingId_authorId: {
        bookingId: data.bookingId,
        authorId: data.authorId,
      },
    },
  });
  if (existing) throw new Error("Вы уже оценили этого пользователя");

  const review = await prisma.review.create({
    data: {
      bookingId: data.bookingId,
      authorId: data.authorId,
      receiverId,
      rating: data.rating,
      comment: data.comment?.trim() || null,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { receiverId },
    _avg: { rating: true },
  });

  await prisma.user.update({
    where: { id: receiverId },
    data: { rating: Math.round((agg._avg.rating ?? data.rating) * 10) / 10 },
  });

  return review;
}

export async function getMyReviewForBooking(bookingId: string, authorId: string) {
  return prisma.review.findUnique({
    where: {
      bookingId_authorId: { bookingId, authorId },
    },
  });
}

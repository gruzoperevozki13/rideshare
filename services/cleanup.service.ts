import { prisma } from "@/lib/prisma";

/** Дата+время + 1 час — порог удаления. Время интерпретируется как Europe/Moscow. */
function expiredBefore(now = new Date()) {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

function combineDateAndTime(date: Date, time: string): Date {
  const [h = "0", m = "0"] = time.split(":");
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(Number(h)).padStart(2, "0");
  const mm = String(Number(m)).padStart(2, "0");
  return new Date(`${y}-${mo}-${day}T${hh}:${mm}:00+03:00`);
}

export async function cleanupExpiredTripsAndWishes() {
  const threshold = expiredBefore();

  const trips = await prisma.trip.findMany({
    select: { id: true, date: true, time: true },
  });
  const expiredTripIds = trips
    .filter((t) => combineDateAndTime(t.date, t.time) < threshold)
    .map((t) => t.id);

  const wishes = await prisma.tripRequest.findMany({
    select: { id: true, date: true, time: true },
  });
  const expiredWishIds = wishes
    .filter((w) => combineDateAndTime(w.date, w.time || "12:00") < threshold)
    .map((w) => w.id);

  const cargoTrips = await prisma.cargoTrip.findMany({
    select: { id: true, date: true, time: true },
  });
  const expiredCargoTripIds = cargoTrips
    .filter((t) => combineDateAndTime(t.date, t.time) < threshold)
    .map((t) => t.id);

  const cargoRequests = await prisma.cargoRequest.findMany({
    select: { id: true, date: true, time: true },
  });
  const expiredCargoRequestIds = cargoRequests
    .filter((r) => combineDateAndTime(r.date, r.time) < threshold)
    .map((r) => r.id);

  let deletedTrips = 0;
  let deletedWishes = 0;
  let deletedCargoTrips = 0;
  let deletedCargoRequests = 0;

  if (expiredTripIds.length) {
    const result = await prisma.trip.deleteMany({
      where: { id: { in: expiredTripIds } },
    });
    deletedTrips = result.count;
  }

  if (expiredWishIds.length) {
    const result = await prisma.tripRequest.deleteMany({
      where: { id: { in: expiredWishIds } },
    });
    deletedWishes = result.count;
  }

  if (expiredCargoTripIds.length) {
    deletedCargoTrips = (
      await prisma.cargoTrip.deleteMany({
        where: { id: { in: expiredCargoTripIds } },
      })
    ).count;
  }

  if (expiredCargoRequestIds.length) {
    deletedCargoRequests = (
      await prisma.cargoRequest.deleteMany({
        where: { id: { in: expiredCargoRequestIds } },
      })
    ).count;
  }

  return { deletedTrips, deletedWishes, deletedCargoTrips, deletedCargoRequests };
}

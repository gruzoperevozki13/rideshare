import { prisma } from "@/lib/prisma";
import {
  isPointNearRoute,
  parseRoutePolyline,
  type LatLng,
} from "@/lib/geo";
import { buildDateFilter } from "@/lib/search-filters";

export type WishSearchFilters = {
  fromCity?: string;
  toCity?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  seatsMin?: number;
  alongRoute?: boolean;
  driverId?: string;
};

export async function getPassengerWishes(passengerId: string) {
  return prisma.tripRequest.findMany({
    where: {
      passengerId,
      status: { in: ["OPEN", "MATCHED"] },
    },
    include: {
      proposals: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: {
          driver: {
            select: { id: true, name: true, image: true, rating: true, phone: true },
          },
          trip: {
            select: { id: true, fromCity: true, toCity: true, time: true, price: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });
}

export async function getOpenWishes() {
  return prisma.tripRequest.findMany({
    where: { status: "OPEN" },
    include: {
      passenger: {
        select: { id: true, name: true, image: true, rating: true },
      },
      proposals: {
        select: { driverId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });
}

export async function searchOpenWishes(filters: WishSearchFilters = {}) {
  const where: {
    status: "OPEN";
    date?: Date | { gte?: Date; lte?: Date };
    seats?: { gte: number };
  } = { status: "OPEN" };

  const dateFilter = buildDateFilter(filters);
  if (dateFilter) {
    if ("equals" in dateFilter && dateFilter.equals) {
      where.date = dateFilter.equals;
    } else {
      where.date = {
        ...(dateFilter.gte ? { gte: dateFilter.gte } : {}),
        ...(dateFilter.lte ? { lte: dateFilter.lte } : {}),
      };
    }
  }

  if (filters.seatsMin != null && filters.seatsMin > 0) {
    where.seats = { gte: filters.seatsMin };
  }

  const wishes = await prisma.tripRequest.findMany({
    where,
    include: {
      passenger: {
        select: { id: true, name: true, image: true, rating: true },
      },
      proposals: {
        select: { driverId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  const fromQ = filters.fromCity?.trim();
  const toQ = filters.toCity?.trim();

  let result = wishes;

  if (fromQ || toQ) {
    const textMatched = wishes.filter((w) => {
      const fromOk =
        !fromQ || w.fromCity.toLowerCase().includes(fromQ.toLowerCase());
      const toOk = !toQ || w.toCity.toLowerCase().includes(toQ.toLowerCase());
      return fromOk && toOk;
    });

    if (!filters.alongRoute || !filters.driverId) {
      result = textMatched;
    } else {
      const trips = await prisma.trip.findMany({
        where: { driverId: filters.driverId },
        select: {
          fromLat: true,
          fromLng: true,
          toLat: true,
          toLng: true,
          routePolyline: true,
        },
      });

      const { geocodeCity } = await import("@/services/geocode.service");
      const [fromCoords, toCoords] = await Promise.all([
        fromQ ? geocodeCity(fromQ) : Promise.resolve(null),
        toQ ? geocodeCity(toQ) : Promise.resolve(null),
      ]);

      const alongMatched = wishes.filter((wish) => {
        const inText = textMatched.some((t) => t.id === wish.id);
        if (inText) return true;

        for (const trip of trips) {
          const polyline = parseRoutePolyline(trip.routePolyline);
          const fallback: LatLng[] = [];
          if (trip.fromLat != null && trip.fromLng != null) {
            fallback.push({ lat: trip.fromLat, lng: trip.fromLng });
          }
          if (trip.toLat != null && trip.toLng != null) {
            fallback.push({ lat: trip.toLat, lng: trip.toLng });
          }
          const line = polyline.length >= 2 ? polyline : fallback;
          if (line.length < 2) continue;

          const fromPoint =
            wish.fromLat != null && wish.fromLng != null
              ? { lat: wish.fromLat, lng: wish.fromLng }
              : fromCoords;
          const toPoint =
            wish.toLat != null && wish.toLng != null
              ? { lat: wish.toLat, lng: wish.toLng }
              : toCoords;

          if (!fromPoint && !toPoint) continue;
          const fromNear = !fromPoint || isPointNearRoute(fromPoint, line);
          const toNear = !toPoint || isPointNearRoute(toPoint, line);
          if (fromNear && toNear) return true;
        }
        return false;
      });

      const exactIds = new Set(textMatched.map((t) => t.id));
      result = [
        ...textMatched,
        ...alongMatched.filter((t) => !exactIds.has(t.id)),
      ];
    }
  }

  return result.map((w) => ({
    ...w,
    alreadyProposed: filters.driverId
      ? w.proposals.some(
          (p) => p.driverId === filters.driverId && p.status === "PENDING"
        )
      : false,
  }));
}

export async function getWishesAlongDriverTrips(driverId: string) {
  const [trips, wishes] = await Promise.all([
    prisma.trip.findMany({
      where: { driverId },
      select: {
        id: true,
        fromCity: true,
        toCity: true,
        fromLat: true,
        fromLng: true,
        toLat: true,
        toLng: true,
        routePolyline: true,
        date: true,
      },
    }),
    getOpenWishes(),
  ]);

  type Matched = (typeof wishes)[number] & {
    matchedTripId: string;
    matchedTripLabel: string;
    alreadyProposed: boolean;
  };

  const results: Matched[] = [];

  for (const wish of wishes) {
    if (wish.fromLat == null || wish.fromLng == null || wish.toLat == null || wish.toLng == null) {
      continue;
    }
    if (wish.passengerId === driverId) continue;

    const from: LatLng = { lat: wish.fromLat, lng: wish.fromLng };
    const to: LatLng = { lat: wish.toLat, lng: wish.toLng };

    for (const trip of trips) {
      const polyline = parseRoutePolyline(trip.routePolyline);
      const fallback: LatLng[] = [];
      if (trip.fromLat != null && trip.fromLng != null) {
        fallback.push({ lat: trip.fromLat, lng: trip.fromLng });
      }
      if (trip.toLat != null && trip.toLng != null) {
        fallback.push({ lat: trip.toLat, lng: trip.toLng });
      }
      const line = polyline.length >= 2 ? polyline : fallback;
      if (line.length < 2) continue;

      if (isPointNearRoute(from, line) && isPointNearRoute(to, line)) {
        results.push({
          ...wish,
          matchedTripId: trip.id,
          matchedTripLabel: `${trip.fromCity} → ${trip.toCity}`,
          alreadyProposed: wish.proposals.some(
            (p) => p.driverId === driverId && p.status === "PENDING"
          ),
        });
        break;
      }
    }
  }

  return results;
}

export async function createWish(
  passengerId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    seats: number;
    comment?: string;
  }
) {
  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(data.fromCity, data.toCity);

  return prisma.tripRequest.create({
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      date: data.date,
      time: data.time,
      seats: data.seats,
      comment: data.comment,
      passengerId,
      status: "OPEN",
    },
  });
}

export async function updateWish(
  wishId: string,
  passengerId: string,
  data: {
    fromCity: string;
    toCity: string;
    date: Date;
    time: string;
    seats: number;
    comment?: string;
  }
) {
  const wish = await prisma.tripRequest.findFirst({
    where: { id: wishId, passengerId },
  });
  if (!wish) throw new Error("Запрос не найден");
  if (wish.status !== "OPEN") {
    throw new Error("Редактировать можно только активный запрос");
  }

  const { buildTripGeo } = await import("@/services/route.service");
  const geo = await buildTripGeo(data.fromCity, data.toCity);

  return prisma.tripRequest.update({
    where: { id: wishId },
    data: {
      fromCity: data.fromCity,
      toCity: data.toCity,
      fromLat: geo.fromLat,
      fromLng: geo.fromLng,
      toLat: geo.toLat,
      toLng: geo.toLng,
      date: data.date,
      time: data.time,
      seats: data.seats,
      comment: data.comment,
    },
  });
}

export async function cancelWish(wishId: string, passengerId: string) {
  const wish = await prisma.tripRequest.findFirst({
    where: { id: wishId, passengerId },
  });
  if (!wish) throw new Error("Запрос не найден");
  if (wish.status === "CANCELLED") {
    throw new Error("Запрос уже отменён");
  }
  if (wish.status === "MATCHED") {
    throw new Error(
      "По этому запросу уже есть бронь — отмените её в чате или в кабинете"
    );
  }

  await prisma.proposal.updateMany({
    where: { wishId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  return prisma.tripRequest.update({
    where: { id: wishId },
    data: { status: "CANCELLED" },
  });
}

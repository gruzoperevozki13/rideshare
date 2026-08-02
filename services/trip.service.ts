import { prisma } from "@/lib/prisma";
import { TripSearchData } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import {
  isPointNearRoute,
  parseRoutePolyline,
  type LatLng,
} from "@/lib/geo";

export type TripWithDriver = Prisma.TripGetPayload<{
  include: {
    driver: {
      select: {
        id: true;
        name: true;
        image: true;
        rating: true;
        carBrand: true;
        carModel: true;
        carColor: true;
        carYear: true;
        carImage: true;
      };
    };
    bookings: true;
  };
}>;

export async function getTrips(filters: TripSearchData = {}) {
  const where: Prisma.TripWhereInput = {};

  if (filters.date) {
    where.date = new Date(filters.date);
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          image: true,
          rating: true,
          carBrand: true,
          carModel: true,
          carColor: true,
          carYear: true,
          carImage: true,
        },
      },
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { id: true, userId: true, status: true },
      },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  const fromQ = filters.fromCity?.trim();
  const toQ = filters.toCity?.trim();

  if (!fromQ && !toQ) {
    return trips;
  }

  // Exact / contains city match
  const textMatched = trips.filter((trip) => {
    const fromOk =
      !fromQ || trip.fromCity.toLowerCase().includes(fromQ.toLowerCase());
    const toOk = !toQ || trip.toCity.toLowerCase().includes(toQ.toLowerCase());
    return fromOk && toOk;
  });

  if (!filters.alongRoute) {
    return textMatched;
  }

  // Along-route: geocode search cities and check proximity to trip polyline
  const { geocodeCity } = await import("@/services/geocode.service");
  const [fromCoords, toCoords] = await Promise.all([
    fromQ ? geocodeCity(fromQ) : Promise.resolve(null),
    toQ ? geocodeCity(toQ) : Promise.resolve(null),
  ]);

  if (!fromCoords && !toCoords) {
    return textMatched;
  }

  const alongMatched = trips.filter((trip) => {
    // Already in text match — keep
    const inText = textMatched.some((t) => t.id === trip.id);
    if (inText) return true;

    const polyline = parseRoutePolyline(trip.routePolyline);
    const fallback: LatLng[] = [];
    if (trip.fromLat != null && trip.fromLng != null) {
      fallback.push({ lat: trip.fromLat, lng: trip.fromLng });
    }
    if (trip.toLat != null && trip.toLng != null) {
      fallback.push({ lat: trip.toLat, lng: trip.toLng });
    }
    const line = polyline.length >= 2 ? polyline : fallback;
    if (line.length < 2) return false;

    const fromNear = !fromCoords || isPointNearRoute(fromCoords, line);
    const toNear = !toCoords || isPointNearRoute(toCoords, line);
    return fromNear && toNear;
  });

  // Prefer exact matches first
  const exactIds = new Set(textMatched.map((t) => t.id));
  return [
    ...textMatched,
    ...alongMatched.filter((t) => !exactIds.has(t.id)),
  ];
}

export async function getTripById(id: string) {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      driver: {
        select: { id: true, name: true, image: true, rating: true, phone: true },
      },
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
          user: {
            select: { id: true, name: true, image: true, phone: true },
          },
        },
      },
    },
  });
}

export async function getDriverTrips(driverId: string) {
  return prisma.trip.findMany({
    where: { driverId },
    include: {
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
          user: {
            select: { id: true, name: true, image: true, phone: true, rating: true },
          },
          reviews: {
            where: { authorId: driverId },
            select: { id: true },
          },
        },
      },
    },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
}

export async function getUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId, status: { in: ["PENDING", "CONFIRMED"] } },
    include: {
      trip: {
        include: {
          driver: {
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
      reviews: {
        where: { authorId: userId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getTrips } from "@/services/trip.service";
import { parseRoutePolyline } from "@/lib/geo";
import { tripSearchSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = tripSearchSchema.safeParse({
    fromCity: searchParams.get("fromCity") ?? undefined,
    toCity: searchParams.get("toCity") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    priceMin: searchParams.get("priceMin") ?? undefined,
    priceMax: searchParams.get("priceMax") ?? undefined,
    seatsMin: searchParams.get("seatsMin") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    alongRoute: searchParams.get("alongRoute") === "true",
  });

  const filters = parsed.success
    ? parsed.data
    : ({ alongRoute: true } as const);

  // Фоновая очистка просроченных объявлений (не блокируем ответ при ошибке)
  void import("@/services/cleanup.service").then((m) =>
    m.cleanupExpiredTripsAndWishes().catch(() => null)
  );

  const alongRoute = Boolean(filters.alongRoute);

  const trips = await getTrips(filters);

  const fromQ = "fromCity" in filters ? filters.fromCity?.trim().toLowerCase() : undefined;
  const toQ = "toCity" in filters ? filters.toCity?.trim().toLowerCase() : undefined;

  const enriched = trips.map((trip) => {
    const exactFrom = !fromQ || trip.fromCity.toLowerCase().includes(fromQ);
    const exactTo = !toQ || trip.toCity.toLowerCase().includes(toQ);
    const along =
      alongRoute &&
      Boolean(fromQ || toQ) &&
      !(exactFrom && exactTo) &&
      parseRoutePolyline(trip.routePolyline).length >= 2;

    return { ...trip, alongRoute: along };
  });

  return NextResponse.json(enriched);
}

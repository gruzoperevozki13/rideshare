import { NextRequest, NextResponse } from "next/server";
import { getTrips } from "@/services/trip.service";
import { parseRoutePolyline } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const alongRoute = searchParams.get("alongRoute") === "true";

  const trips = await getTrips({
    fromCity: searchParams.get("fromCity") ?? undefined,
    toCity: searchParams.get("toCity") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    alongRoute,
  });

  // Mark along-route matches (not exact city text match)
  const fromQ = searchParams.get("fromCity")?.trim().toLowerCase();
  const toQ = searchParams.get("toCity")?.trim().toLowerCase();

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

import { NextRequest, NextResponse } from "next/server";
import { searchCargoTrips, searchCargoRequests } from "@/services/cargo.service";
import { cargoSearchSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "trips";

  const parsed = cargoSearchSchema.safeParse({
    fromCity: sp.get("from") || undefined,
    toCity: sp.get("to") || undefined,
    date: sp.get("date") || undefined,
    dateFrom: sp.get("dateFrom") || undefined,
    dateTo: sp.get("dateTo") || undefined,
    priceMin: sp.get("priceMin") || undefined,
    priceMax: sp.get("priceMax") || undefined,
    sortBy: sp.get("sortBy") || undefined,
  });

  const filters = parsed.success ? parsed.data : {};

  void import("@/services/cleanup.service").then((m) =>
    m.cleanupExpiredTripsAndWishes().catch(() => null)
  );

  if (type === "requests") {
    const data = await searchCargoRequests(filters);
    return NextResponse.json(data);
  }

  const data = await searchCargoTrips(filters);
  return NextResponse.json(data);
}

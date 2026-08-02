import { NextRequest, NextResponse } from "next/server";
import { searchCargoTrips, searchCargoRequests } from "@/services/cargo.service";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "trips";
  const filters = {
    fromCity: sp.get("from") || undefined,
    toCity: sp.get("to") || undefined,
    date: sp.get("date") || undefined,
  };

  if (type === "requests") {
    const data = await searchCargoRequests(filters);
    return NextResponse.json(data);
  }

  const data = await searchCargoTrips(filters);
  return NextResponse.json(data);
}

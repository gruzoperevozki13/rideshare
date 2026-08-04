import { NextRequest, NextResponse } from "next/server";
import { suggestCities } from "@/services/geocode.service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const cities = await suggestCities(q, 8);
  return NextResponse.json({ cities });
}

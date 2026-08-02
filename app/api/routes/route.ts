import { NextRequest, NextResponse } from "next/server";
import { resolveCityPair } from "@/services/geocode.service";
import { fetchRouteAlternatives } from "@/services/route.service";
import type { LatLng } from "@/lib/geo";

function parseCoord(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const fromCity = sp.get("from");
  const toCity = sp.get("to");

  const fromLat = parseCoord(sp.get("fromLat"));
  const fromLng = parseCoord(sp.get("fromLng"));
  const toLat = parseCoord(sp.get("toLat"));
  const toLng = parseCoord(sp.get("toLng"));

  let from: LatLng | null = null;
  let to: LatLng | null = null;

  if (
    fromLat != null &&
    fromLng != null &&
    toLat != null &&
    toLng != null
  ) {
    from = { lat: fromLat, lng: fromLng };
    to = { lat: toLat, lng: toLng };
  } else if (fromCity && toCity) {
    const pair = await resolveCityPair(fromCity, toCity);
    from = pair.from;
    to = pair.to;
  } else {
    return NextResponse.json(
      { error: "Укажите from/to или координаты fromLat/fromLng/toLat/toLng" },
      { status: 400 }
    );
  }

  if (!from || !to) {
    return NextResponse.json(
      { error: "Не удалось найти координаты городов" },
      { status: 404 }
    );
  }

  const routes = await fetchRouteAlternatives(from, to);

  return NextResponse.json({
    from,
    to,
    routes,
  });
}

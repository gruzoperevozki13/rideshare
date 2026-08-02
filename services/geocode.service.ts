import { prisma } from "@/lib/prisma";
import type { LatLng } from "@/lib/geo";

const memoryCache = new Map<string, LatLng>();

function normalizeCity(name: string) {
  return name.trim().toLowerCase();
}

export async function geocodeCity(city: string): Promise<LatLng | null> {
  const key = normalizeCity(city);
  if (!key) return null;

  const mem = memoryCache.get(key);
  if (mem) return mem;

  const cached = await prisma.cityCache.findUnique({ where: { name: key } });
  if (cached) {
    const coords = { lat: cached.lat, lng: cached.lng };
    memoryCache.set(key, coords);
    return coords;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", city);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ru,by,kz,ua");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RideShare/1.0 (https://github.com; contact@rideshare.local)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;

    const coords = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };

    await prisma.cityCache.upsert({
      where: { name: key },
      create: { name: key, lat: coords.lat, lng: coords.lng },
      update: { lat: coords.lat, lng: coords.lng },
    });

    memoryCache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

export async function resolveCityPair(fromCity: string, toCity: string) {
  const [from, to] = await Promise.all([geocodeCity(fromCity), geocodeCity(toCity)]);
  return { from, to };
}

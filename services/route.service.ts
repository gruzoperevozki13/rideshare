import { decodePolyline, type LatLng } from "@/lib/geo";

export type RouteOption = {
  id: string;
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  summary: string;
  /** true, если дорожный маршрут недоступен и осталась прямая */
  isFallback?: boolean;
};

const OSRM_BASES = [
  "https://router.project-osrm.org/route/v1/driving",
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatRoute(
  points: LatLng[],
  distanceM: number,
  durationSec: number,
  index: number
): RouteOption {
  const distanceKm = Math.round((distanceM / 1000) * 10) / 10;
  const durationMin = Math.round(durationSec / 60);
  return {
    id: `route-${index}`,
    points,
    distanceKm,
    durationMin,
    summary:
      index === 0
        ? `Основной · ${distanceKm} км · ~${durationMin} мин`
        : `Вариант ${index + 1} · ${distanceKm} км · ~${durationMin} мин`,
  };
}

async function fetchFromOsrmBase(
  base: string,
  from: LatLng,
  to: LatLng
): Promise<RouteOption[] | null> {
  const url = `${base}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline&alternatives=true&steps=false`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Не кэшируем ошибки/лимиты OSRM на час — иначе «прямая» залипает
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    code: string;
    routes?: {
      geometry: string;
      distance: number;
      duration: number;
    }[];
  };

  if (data.code !== "Ok" || !data.routes?.length) return null;

  const routes = data.routes
    .map((route, index) => {
      const points = decodePolyline(route.geometry);
      if (points.length < 2) return null;
      return formatRoute(points, route.distance, route.duration, index);
    })
    .filter((r): r is RouteOption => Boolean(r));

  return routes.length > 0 ? routes : null;
}

function fallbackRoute(from: LatLng, to: LatLng): RouteOption[] {
  const distanceKm =
    Math.round(
      (Math.hypot(from.lat - to.lat, from.lng - to.lng) * 111) * 10
    ) / 10;
  return [
    {
      id: "route-0",
      points: [from, to],
      distanceKm,
      durationMin: 0,
      summary: "Прямая (дороги временно недоступны)",
      isFallback: true,
    },
  ];
}

/** Есть ли полноценный маршрут по дорогам (не просто A→B) */
export function isRoadPolyline(points: LatLng[] | null | undefined): boolean {
  return Boolean(points && points.length >= 3);
}

export async function fetchRouteAlternatives(
  from: LatLng,
  to: LatLng
): Promise<RouteOption[]> {
  for (const base of OSRM_BASES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const routes = await fetchFromOsrmBase(base, from, to);
        if (routes?.length) return routes;
      } catch {
        // пробуем ещё раз / другой сервер
      }
      await sleep(250 * (attempt + 1));
    }
  }
  return fallbackRoute(from, to);
}

export async function fetchRoutePolyline(
  from: LatLng,
  to: LatLng
): Promise<{ points: LatLng[]; isFallback: boolean }> {
  const routes = await fetchRouteAlternatives(from, to);
  const first = routes[0];
  if (!first) {
    return { points: [from, to], isFallback: true };
  }
  return {
    points: first.points,
    isFallback: Boolean(first.isFallback),
  };
}

export async function buildTripGeo(
  fromCity: string,
  toCity: string,
  selectedPolylineJson?: string | null
) {
  const { resolveCityPair } = await import("@/services/geocode.service");
  const { from, to } = await resolveCityPair(fromCity, toCity);

  if (!from || !to) {
    return {
      fromLat: from?.lat ?? null,
      fromLng: from?.lng ?? null,
      toLat: to?.lat ?? null,
      toLng: to?.lng ?? null,
      routePolyline: null as string | null,
    };
  }

  if (selectedPolylineJson) {
    try {
      const parsed = JSON.parse(selectedPolylineJson) as LatLng[];
      // 2 точки = почти всегда «прямая», а не дороги — пересчитаем
      if (Array.isArray(parsed) && isRoadPolyline(parsed)) {
        return {
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
          routePolyline: JSON.stringify(parsed),
        };
      }
    } catch {
      // fall through
    }
  }

  const route = await fetchRoutePolyline(from, to);

  return {
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
    routePolyline: JSON.stringify(route.points),
  };
}

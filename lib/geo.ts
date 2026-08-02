export type LatLng = { lat: number; lng: number };

const EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

function projectOnSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;

  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return a;

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return { lat: ay + t * dy, lng: ax + t * dx };
}

/** Shortest distance from point to polyline in km */
export function distanceToPolylineKm(point: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineKm(point, polyline[0]);

  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const proj = projectOnSegment(point, polyline[i], polyline[i + 1]);
    min = Math.min(min, haversineKm(point, proj));
  }
  return min;
}

/** Decode Google-encoded polyline (OSRM uses this) */
export function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

export const MAX_DETOUR_KM = 35;

export function isPointNearRoute(
  point: LatLng,
  polyline: LatLng[],
  maxKm = MAX_DETOUR_KM
): boolean {
  return distanceToPolylineKm(point, polyline) <= maxKm;
}

export function parseRoutePolyline(raw: string | null | undefined): LatLng[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LatLng[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // encoded string
  }
  return decodePolyline(raw);
}

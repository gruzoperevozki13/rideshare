import { prisma } from "@/lib/prisma";
import type { LatLng } from "@/lib/geo";

const memoryCache = new Map<string, LatLng>();

/** Частые города для мгновенных подсказок без запроса в сеть */
export const POPULAR_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Саранск",
  "Казань",
  "Нижний Новгород",
  "Самара",
  "Уфа",
  "Пермь",
  "Екатеринбург",
  "Челябинск",
  "Новосибирск",
  "Красноярск",
  "Воронеж",
  "Ростов-на-Дону",
  "Краснодар",
  "Сочи",
  "Волгоград",
  "Саратов",
  "Тула",
  "Рязань",
  "Ярославль",
  "Тверь",
  "Владимир",
  "Иваново",
  "Пенза",
  "Ульяновск",
  "Тольятти",
  "Ижевск",
  "Оренбург",
  "Чебоксары",
  "Йошкар-Ола",
  "Петрозаводск",
  "Мурманск",
  "Архангельск",
  "Калининград",
  "Белгород",
  "Курск",
  "Орёл",
  "Брянск",
  "Смоленск",
  "Липецк",
  "Тамбов",
  "Астрахань",
  "Махачкала",
  "Грозный",
  "Владикавказ",
  "Ставрополь",
  "Симферополь",
  "Севастополь",
  "Омск",
  "Томск",
  "Барнаул",
  "Иркутск",
  "Хабаровск",
  "Владивосток",
  "Сергиев Посад",
  "Подольск",
  "Химки",
  "Мытищи",
  "Королёв",
  "Люберцы",
  "Балашиха",
  "Домодедово",
  "Одинцово",
  "Набережные Челны",
  "Дзержинск",
  "Арзамас",
];

function normalizeCity(name: string) {
  return name.trim().toLowerCase();
}

function titleCaseCity(name: string) {
  const t = name.trim();
  if (!t) return t;
  return t
    .split(/([\s-]+)/)
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
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
    url.searchParams.set("countrycodes", "ru,by,kz");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "ru");

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

function uniquePreserve(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = normalizeCity(n);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(n.trim());
  }
  return out;
}

type PhotonProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  town?: string;
  village?: string;
  locality?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
};

function formatPhotonLabel(p: PhotonProps): string {
  const settlement =
    p.city || p.town || p.village || p.locality || p.county || "";
  const street = p.street?.trim() || "";
  const house = p.housenumber?.trim() || "";

  const parts: string[] = [];

  if (street && house) {
    parts.push(`${street}, ${house}`);
  } else if (street) {
    parts.push(street);
  } else if (house && p.name) {
    parts.push(`${p.name}, ${house}`);
  } else if (
    p.name &&
    p.name !== settlement &&
    p.osm_key !== "place" &&
    p.type !== "city" &&
    p.type !== "town" &&
    p.type !== "village"
  ) {
    parts.push(p.name);
  }

  if (settlement) parts.push(settlement);
  else if (p.name && parts.length === 0) parts.push(p.name);

  if (p.state && p.state !== settlement) parts.push(p.state);

  return parts.join(", ").replace(/\s+/g, " ").trim();
}

async function suggestFromPhoton(query: string, limit: number): Promise<string[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "ru");
  url.searchParams.set("limit", String(Math.min(limit * 2, 16)));
  // Смещение к центру РФ — ближе релевантные улицы/дома
  url.searchParams.set("lat", "55.75");
  url.searchParams.set("lon", "37.62");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "RideShare/1.0 (contact@rideshare.local)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { features?: { properties?: PhotonProps }[] };
  const allowed = new Set(["ru", "by", "kz"]);

  return (data.features ?? [])
    .map((f) => f.properties)
    .filter((p): p is PhotonProps => Boolean(p))
    .filter((p) => {
      const cc = (p.countrycode || "").toLowerCase();
      return !cc || allowed.has(cc);
    })
    .map(formatPhotonLabel)
    .filter(Boolean);
}

async function suggestFromNominatim(
  query: string,
  limit: number
): Promise<string[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "ru,by,kz");
  url.searchParams.set("accept-language", "ru");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "RideShare/1.0 (contact@rideshare.local)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    display_name?: string;
    name?: string;
    address?: {
      house_number?: string;
      road?: string;
      pedestrian?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
    };
  }[];

  return data
    .map((item) => {
      const a = item.address;
      if (!a) return item.display_name?.split(",").slice(0, 3).join(",").trim() ?? "";

      const street = a.road || a.pedestrian || "";
      const house = a.house_number || "";
      const settlement =
        a.city || a.town || a.village || a.municipality || "";
      const parts: string[] = [];
      if (street && house) parts.push(`${street}, ${house}`);
      else if (street) parts.push(street);
      else if (item.name && item.name !== settlement) parts.push(item.name);
      if (settlement) parts.push(settlement);
      if (a.state && a.state !== settlement) parts.push(a.state);
      return parts.join(", ") || item.display_name?.split(",")[0]?.trim() || "";
    })
    .filter(Boolean);
}

/**
 * Подсказки адресов: город, улица, дом.
 * Короткие запросы — популярные города; длиннее — Photon/Nominatim.
 */
export async function suggestCities(query: string, limit = 8): Promise<string[]> {
  const q = query.trim();
  if (q.length < 1) {
    return POPULAR_CITIES.slice(0, limit);
  }

  const qLower = q.toLowerCase();
  const local = POPULAR_CITIES.filter((c) =>
    c.toLowerCase().includes(qLower)
  ).slice(0, limit);

  let fromCache: string[] = [];
  try {
    const rows = await prisma.cityCache.findMany({
      where: { name: { contains: qLower } },
      take: limit,
      orderBy: { name: "asc" },
    });
    fromCache = rows.map((r) => titleCaseCity(r.name));
  } catch {
    // ignore
  }

  let remote: string[] = [];
  if (q.length >= 2) {
    try {
      remote = await suggestFromPhoton(q, limit);
    } catch {
      // fallback ниже
    }
    if (remote.length < 3) {
      try {
        const extra = await suggestFromNominatim(q, limit);
        remote = [...remote, ...extra];
      } catch {
        // сеть недоступна
      }
    }
  }

  // Адреса с улицей/домом — выше популярных городов при детальном вводе
  const looksDetailed =
    /\d/.test(q) ||
    /\s/.test(q) ||
    /ул|улиц|пр\.|просп|пер\.|переул|шоссе|бульвар|наб/i.test(q);

  if (looksDetailed) {
    return uniquePreserve([...remote, ...local, ...fromCache]).slice(0, limit);
  }
  return uniquePreserve([...local, ...fromCache, ...remote]).slice(0, limit);
}


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

/** Подсказки городов по началу ввода */
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

  let fromNominatim: string[] = [];
  if (q.length >= 2) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("countrycodes", "ru,by,kz");
      url.searchParams.set("featuretype", "city");

      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "RideShare/1.0 (contact@rideshare.local)",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as {
          display_name?: string;
          name?: string;
          address?: {
            city?: string;
            town?: string;
            village?: string;
            municipality?: string;
            state?: string;
          };
        }[];

        fromNominatim = data
          .map((item) => {
            const a = item.address;
            const place =
              a?.city ||
              a?.town ||
              a?.village ||
              a?.municipality ||
              item.name ||
              item.display_name?.split(",")[0];
            return place?.trim() ?? "";
          })
          .filter(Boolean);
      }
    } catch {
      // сеть недоступна — останутся локальные
    }
  }

  return uniquePreserve([...local, ...fromCache, ...fromNominatim]).slice(
    0,
    limit
  );
}

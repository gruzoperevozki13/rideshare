/** Общие хелперы фильтров поиска */

export function buildDateFilter(filters: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): { equals?: Date; gte?: Date; lte?: Date } | undefined {
  if (filters.date) {
    return { equals: new Date(filters.date) };
  }
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
  if (filters.dateTo) range.lte = new Date(filters.dateTo);
  return Object.keys(range).length ? range : undefined;
}

export function buildPriceFilter(filters: {
  priceMin?: number;
  priceMax?: number;
}): { gte?: number; lte?: number } | undefined {
  const range: { gte?: number; lte?: number } = {};
  if (filters.priceMin != null && !Number.isNaN(filters.priceMin)) {
    range.gte = filters.priceMin;
  }
  if (filters.priceMax != null && !Number.isNaN(filters.priceMax)) {
    range.lte = filters.priceMax;
  }
  return Object.keys(range).length ? range : undefined;
}

export type SortBy = "date" | "price_asc" | "price_desc" | "duration";

export function sortByDatePriceDuration<
  T extends {
    date: Date | string;
    time?: string;
    price?: number;
    durationMin?: number | null;
  },
>(items: T[], sortBy: SortBy = "date"): T[] {
  const list = [...items];
  list.sort((a, b) => {
    if (sortBy === "price_asc") {
      return (a.price ?? 0) - (b.price ?? 0);
    }
    if (sortBy === "price_desc") {
      return (b.price ?? 0) - (a.price ?? 0);
    }
    if (sortBy === "duration") {
      return (a.durationMin ?? 1e9) - (b.durationMin ?? 1e9);
    }
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
  return list;
}

export function appendSearchParams(
  params: URLSearchParams,
  filters: Record<string, string | number | boolean | undefined | null>
) {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      continue;
    }
    params.set(key, String(value));
  }
}

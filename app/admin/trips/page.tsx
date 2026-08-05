import Link from "next/link";
import { listAdminTrips } from "@/services/admin.service";
import { DeleteTripButton } from "@/features/admin/delete-trip-button";
import { formatDate, formatDurationMin, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: string;
    priceMax?: string;
    q?: string;
    sortBy?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const sortBy = (sp.sortBy as "date" | "price_asc" | "price_desc" | "duration") || "date";
  const data = await listAdminTrips({
    page,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
    priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
    q: sp.q,
    sortBy,
  });

  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.dateFrom) p.set("dateFrom", sp.dateFrom);
    if (sp.dateTo) p.set("dateTo", sp.dateTo);
    if (sp.priceMin) p.set("priceMin", sp.priceMin);
    if (sp.priceMax) p.set("priceMax", sp.priceMax);
    if (sp.sortBy) p.set("sortBy", sp.sortBy);
    for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
    return p.toString();
  };

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-2xl border bg-white/90 p-4 sm:grid-cols-2 lg:grid-cols-3" action="/admin/trips">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Маршрут / водитель" />
        <Input name="dateFrom" type="date" defaultValue={sp.dateFrom ?? ""} />
        <Input name="dateTo" type="date" defaultValue={sp.dateTo ?? ""} />
        <Input name="priceMin" type="number" min={0} defaultValue={sp.priceMin ?? ""} placeholder="Цена от" />
        <Input name="priceMax" type="number" min={0} defaultValue={sp.priceMax ?? ""} placeholder="Цена до" />
        <select
          name="sortBy"
          defaultValue={sortBy}
          className="flex h-11 w-full rounded-xl border border-border/90 bg-white/90 px-4 text-sm"
        >
          <option value="date">По дате</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
          <option value="duration">По времени в пути</option>
        </select>
        <Button type="submit" className="sm:col-span-2 lg:col-span-3">
          Применить фильтры
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Всего: {data.total} · стр. {data.page}/{data.totalPages}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/90">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Маршрут</th>
              <th className="px-3 py-2 font-medium">Когда</th>
              <th className="px-3 py-2 font-medium">Водитель</th>
              <th className="px-3 py-2 font-medium">Цена</th>
              <th className="px-3 py-2 font-medium">В пути</th>
              <th className="px-3 py-2 font-medium">Брони</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.trips.map((t) => (
              <tr key={t.id} className="border-b border-border/50 align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">
                    {t.fromCity} → {t.toCity}
                  </p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDate(t.date)} · {t.time}
                </td>
                <td className="px-3 py-2">
                  <p>{t.driver.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t.driver.email}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{formatPrice(t.price)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.durationMin
                    ? `~${formatDurationMin(t.durationMin)}`
                    : "—"}
                  {t.distanceKm ? ` · ${t.distanceKm} км` : ""}
                </td>
                <td className="px-3 py-2 tabular-nums">{t._count.bookings}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteTripButton tripId={t.id} />
                </td>
              </tr>
            ))}
            {data.trips.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Поездок не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/trips?${qs({ page: page - 1 })}`}
              className="text-sm text-primary hover:underline"
            >
              ← Назад
            </Link>
          )}
          {page < data.totalPages && (
            <Link
              href={`/admin/trips?${qs({ page: page + 1 })}`}
              className="text-sm text-primary hover:underline"
            >
              Вперёд →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { listAdminTrips } from "@/services/admin.service";
import { DeleteTripButton } from "@/features/admin/delete-trip-button";
import { formatDate, formatDurationMin, formatPrice } from "@/lib/utils";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const data = await listAdminTrips({ page });

  return (
    <div className="space-y-4">
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
                  Поездок пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/admin/trips?page=${page - 1}`} className="text-sm text-primary hover:underline">
              ← Назад
            </Link>
          )}
          {page < data.totalPages && (
            <Link href={`/admin/trips?page=${page + 1}`} className="text-sm text-primary hover:underline">
              Вперёд →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

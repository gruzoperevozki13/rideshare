import Link from "next/link";
import { listAdminBookings } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждена",
  CANCELLED: "Отменена",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const data = await listAdminBookings({ page });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Всего: {data.total} · стр. {data.page}/{data.totalPages}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/90">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium">Поездка</th>
              <th className="px-3 py-2 font-medium">Пассажир</th>
              <th className="px-3 py-2 font-medium">Водитель</th>
              <th className="px-3 py-2 font-medium">Создана</th>
            </tr>
          </thead>
          <tbody>
            {data.bookings.map((b) => (
              <tr key={b.id} className="border-b border-border/50 align-top">
                <td className="px-3 py-2">
                  {statusLabel[b.status] ?? b.status}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium">
                    {b.trip.fromCity} → {b.trip.toCity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.trip.date)} · {b.trip.time}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <p>{b.user.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{b.user.email}</p>
                </td>
                <td className="px-3 py-2">
                  <p>{b.trip.driver.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.trip.driver.email}
                  </p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDate(b.createdAt)}
                </td>
              </tr>
            ))}
            {data.bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Броней пока нет
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
              href={`/admin/bookings?page=${page - 1}`}
              className="text-sm text-primary hover:underline"
            >
              ← Назад
            </Link>
          )}
          {page < data.totalPages && (
            <Link
              href={`/admin/bookings?page=${page + 1}`}
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

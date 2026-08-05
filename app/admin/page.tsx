import { getAdminStats } from "@/services/admin.service";

function StatCard({
  title,
  total,
  today,
  week,
}: {
  title: string;
  total: number;
  today?: number;
  week?: number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/90 p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{total}</p>
      {(today != null || week != null) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {today != null && <>сегодня +{today}</>}
          {today != null && week != null && " · "}
          {week != null && <>7 дней +{week}</>}
        </p>
      )}
    </div>
  );
}

export default async function AdminStatsPage() {
  const s = await getAdminStats();

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Пользователи"
          total={s.usersTotal}
          today={s.usersToday}
          week={s.usersWeek}
        />
        <StatCard
          title="Поездки"
          total={s.tripsTotal}
          today={s.tripsToday}
          week={s.tripsWeek}
        />
        <StatCard
          title="Бронирования"
          total={s.bookingsTotal}
          today={s.bookingsToday}
          week={s.bookingsWeek}
        />
        <StatCard title="Ожидают подтверждения" total={s.bookingsPending} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Открытые запросы" total={s.wishesOpen} />
        <StatCard title="Грузовые рейсы" total={s.cargoTrips} />
        <StatCard title="Заявки на груз" total={s.cargoRequests} />
        <StatCard title="Заблокированы" total={s.bannedUsers} />
      </div>
    </div>
  );
}

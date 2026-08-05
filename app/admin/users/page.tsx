import Link from "next/link";
import { listAdminUsers } from "@/services/admin.service";
import { BanUserButton } from "@/features/admin/ban-user-button";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const roleLabel: Record<string, string> = {
  DRIVER: "Водитель",
  PASSENGER: "Пассажир",
  CARGO_CARRIER: "Перевозчик",
  CARGO_SHIPPER: "Грузоотправитель",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Number(sp.page || "1") || 1;
  const data = await listAdminUsers({ q, page });

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-2 sm:flex-row" action="/admin/users">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Поиск: email, имя, телефон"
          className="sm:max-w-sm"
        />
        <Button type="submit">Найти</Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Найдено: {data.total} · стр. {data.page}/{data.totalPages}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/90">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Пользователь</th>
              <th className="px-3 py-2 font-medium">Роль</th>
              <th className="px-3 py-2 font-medium">Рейтинг</th>
              <th className="px-3 py-2 font-medium">Регистрация</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{u.name || "—"}</p>
                  <p className="text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.phone || "нет телефона"}</p>
                  {u.isAdmin && (
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.role ? roleLabel[u.role] ?? u.role : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">{u.rating.toFixed(1)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2">
                  {u.bannedAt ? (
                    <span className="text-destructive">Бан</span>
                  ) : u.emailVerified ? (
                    <span className="text-green-700">OK</span>
                  ) : (
                    <span className="text-amber-700">Не подтверждён</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <BanUserButton userId={u.id} banned={Boolean(u.bannedAt)} />
                </td>
              </tr>
            ))}
            {data.users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Никого не найдено
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
              href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="text-sm text-primary hover:underline"
            >
              ← Назад
            </Link>
          )}
          {page < data.totalPages && (
            <Link
              href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
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

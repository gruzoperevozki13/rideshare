import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isUserAdmin } from "@/lib/session";

const links = [
  { href: "/admin", label: "Статистика" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/trips", label: "Поездки" },
  { href: "/admin/bookings", label: "Брони" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }
  const ok = await isUserAdmin(session.user.id);
  if (!ok) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Админ
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Панель управления
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-border/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}

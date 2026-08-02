import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/session";
import { getDriverTrips, getUserBookings } from "@/services/trip.service";
import { getDriverProposals } from "@/services/proposal.service";
import { getPassengerWishes } from "@/services/wish.service";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/utils";
import { BookingsPanel } from "@/features/bookings/bookings-panel";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getCurrentUser();
  if (!user?.role) {
    redirect("/onboarding");
  }

  const [driverTrips, bookings, myProposals, wishes, incoming] = await Promise.all([
    getDriverTrips(user.id),
    getUserBookings(user.id),
    getDriverProposals(user.id),
    getPassengerWishes(user.id),
    prisma.proposal.findMany({
      where: {
        wish: { passengerId: user.id },
        status: "PENDING",
      },
      include: {
        driver: { select: { name: true, rating: true } },
        wish: { select: { fromCity: true, toCity: true } },
      },
      take: 5,
    }),
  ]);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-5 animate-fade-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Личный кабинет
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            Ваши поездки и заявки
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button>На главную</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">Профиль</Button>
          </Link>
        </div>
      </div>

      {incoming.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Входящие предложения ({incoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incoming.map((p) => (
              <p key={p.id} className="text-sm">
                <span className="font-medium">{p.driver.name}</span> предлагает{" "}
                {p.wish.fromCity} → {p.wish.toCity} за {formatPrice(p.price)}
              </p>
            ))}
            <Link href="/">
              <Button size="sm" className="mt-2">
                Открыть и принять
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Мои поездки (водитель)</h2>
          <Link href="/">
            <Button variant="outline" size="sm">
              На главную
            </Button>
          </Link>
        </div>
        {driverTrips.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Нет созданных поездок
            </CardContent>
          </Card>
        ) : (
          driverTrips.slice(0, 5).map((trip) => (
            <Card key={trip.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {trip.fromCity} → {trip.toCity}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatDate(trip.date)} · {trip.time} · {formatPrice(trip.price)} ·{" "}
                {trip.bookings.length}/{trip.seats} мест
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Мои предложения пассажирам</h2>
        {myProposals.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Пока нет отправленных предложений — найдите пассажиров на главной
            </CardContent>
          </Card>
        ) : (
          myProposals.slice(0, 5).map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1 p-4 text-sm">
                <p className="font-medium">
                  {p.wish.fromCity} → {p.wish.toCity}
                </p>
                <p className="text-muted-foreground">
                  {p.wish.passenger.name} · {formatPrice(p.price)} · {p.status}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Мои бронирования</h2>
        <BookingsPanel bookings={bookings} currentUserId={user.id} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Мои запросы на поездку</h2>
        {wishes.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Пока нет запросов
            </CardContent>
          </Card>
        ) : (
          wishes.slice(0, 5).map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4 text-sm">
                <p className="font-medium">
                  {w.fromCity} → {w.toCity}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(w.date)} · {w.status} · предложений: {w.proposals.length}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

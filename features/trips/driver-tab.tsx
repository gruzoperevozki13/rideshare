"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Users, Pencil, Trash2 } from "lucide-react";
import { deleteTrip, confirmBookingAction, rejectBookingAction } from "@/features/actions";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { TripForm } from "@/features/trips/trip-form";
import { TripSearch } from "@/features/trips/trip-search";
import { WishCard, WishCardData } from "@/features/wishes/wish-card";
import { ProposalCard, ProposalCardData } from "@/features/proposals/proposal-card";
import { BookingChat } from "@/features/chat/booking-chat";
import { ReviewForm } from "@/features/reviews/review-form";
import { RouteMap } from "@/components/map/route-map";
import { useWishSearch } from "@/hooks/use-wishes";
import { TripSearchData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatPrice } from "@/lib/utils";
import { parseRoutePolyline } from "@/lib/geo";

function canRateTrip(date: Date | string, time: string) {
  const d = new Date(date);
  const [h = "0", m = "0"] = time.split(":");
  d.setHours(Number(h), Number(m), 0, 0);
  return d.getTime() <= Date.now();
}

type DriverTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  date: Date;
  time: string;
  seats: number;
  price: number;
  comment: string | null;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  routePolyline?: string | null;
  bookings: {
    id: string;
    status: string;
    reviews?: { id: string }[];
    user: {
      id: string;
      name: string | null;
      image: string | null;
      phone: string | null;
      rating?: number;
    };
  }[];
};

interface DriverTabProps {
  trips: DriverTrip[];
  nearbyWishes: WishCardData[];
  myProposals: ProposalCardData[];
}

type Mode = "trips" | "passengers" | "offers";

export function DriverTab({ trips, nearbyWishes, myProposals }: DriverTabProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [mode, setMode] = useState<Mode>("trips");
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<DriverTrip | null>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [mapTrip, setMapTrip] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [wishFilters, setWishFilters] = useState<TripSearchData>({
    alongRoute: true,
  });

  const { data: searchedWishes, isLoading: wishesLoading } = useWishSearch(
    wishFilters,
    mode === "passengers"
  );

  const handleDelete = (tripId: string) => {
    if (!confirm("Удалить поездку?")) return;
    startTransition(async () => {
      await deleteTrip(tripId);
    });
  };

  const formatDateForInput = (date: Date) =>
    new Date(date).toISOString().split("T")[0];

  if (showForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setEditingTrip(null);
          }}
        >
          ← Назад
        </Button>
        <TripForm
          tripId={editingTrip?.id}
          defaultValues={
            editingTrip
              ? {
                  fromCity: editingTrip.fromCity,
                  toCity: editingTrip.toCity,
                  date: formatDateForInput(editingTrip.date),
                  time: editingTrip.time,
                  seats: editingTrip.seats,
                  price: editingTrip.price,
                  comment: editingTrip.comment ?? "",
                }
              : undefined
          }
          onSuccess={() => {
            setShowForm(false);
            setEditingTrip(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/80 bg-white/50 p-1.5 backdrop-blur-sm">
        <Button
          variant={mode === "trips" ? "default" : "ghost"}
          onClick={() => setMode("trips")}
          className="text-xs sm:text-sm"
        >
          Мои поездки
        </Button>
        <Button
          variant={mode === "passengers" ? "default" : "ghost"}
          onClick={() => setMode("passengers")}
          className="text-xs sm:text-sm"
        >
          Пассажиры
        </Button>
        <Button
          variant={mode === "offers" ? "default" : "ghost"}
          onClick={() => setMode("offers")}
          className="text-xs sm:text-sm"
        >
          Предложения
          {myProposals.filter((p) => p.status === "PENDING").length > 0 && (
            <span className="ml-1 rounded-md bg-white/20 px-1.5 text-[10px]">
              {myProposals.filter((p) => p.status === "PENDING").length}
            </span>
          )}
        </Button>
      </div>

      {mode === "trips" && (
        <div className="space-y-6">
          <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
            + Создать поездку
          </Button>

          {nearbyWishes.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Попутчики по пути</h2>
              <p className="text-sm text-muted-foreground">
                Пассажиры рядом с вашими маршрутами — предложите место первым
              </p>
              {nearbyWishes.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  canPropose
                  driverTrips={trips}
                />
              ))}
            </section>
          )}

          {trips.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              У вас пока нет поездок. Создайте первую!
            </p>
          ) : (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">Мои поездки</h2>
              {trips.map((trip) => {
                const from =
                  trip.fromLat != null && trip.fromLng != null
                    ? { lat: trip.fromLat, lng: trip.fromLng }
                    : null;
                const to =
                  trip.toLat != null && trip.toLng != null
                    ? { lat: trip.toLat, lng: trip.toLng }
                    : null;
                const polyline = parseRoutePolyline(trip.routePolyline);

                return (
                  <Card key={trip.id} className="animate-fade-up">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {trip.fromCity} → {trip.toCity}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTrip(trip);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            onClick={() => handleDelete(trip.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(trip.date)} · {trip.time} · {formatPrice(trip.price)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setMapTrip(mapTrip === trip.id ? null : trip.id)}
                      >
                        {mapTrip === trip.id ? "Скрыть карту" : "Показать маршрут"}
                      </Button>
                      {mapTrip === trip.id && (
                        <RouteMap from={from} to={to} polyline={polyline} height={180} />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setExpandedTrip(expandedTrip === trip.id ? null : trip.id)
                        }
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Пассажиры ({trip.bookings.length}/{trip.seats})
                      </Button>
                      {expandedTrip === trip.id && (
                        <div className="space-y-3 border-t pt-2">
                          {trip.bookings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Пока нет пассажиров</p>
                          ) : (
                            trip.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="space-y-2 rounded-xl border p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={booking.user.image ?? undefined} />
                                    <AvatarFallback>
                                      {booking.user.name?.[0]?.toUpperCase() ?? "P"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{booking.user.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {booking.status === "PENDING"
                                        ? "Ожидает вашего подтверждения"
                                        : "Подтверждено"}
                                    </p>
                                    {booking.status === "CONFIRMED" && booking.user.phone && (
                                      <a
                                        href={`tel:${booking.user.phone}`}
                                        className="text-xs font-medium text-primary"
                                      >
                                        {booking.user.phone}
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {booking.status === "PENDING" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      disabled={isPending}
                                      onClick={() =>
                                        startTransition(async () => {
                                          const result = await confirmBookingAction(booking.id);
                                          if (result.error) {
                                            alert(result.error);
                                          }
                                        })
                                      }
                                    >
                                      Подтвердить
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isPending}
                                      onClick={() =>
                                        startTransition(async () => {
                                          await rejectBookingAction(booking.id);
                                        })
                                      }
                                    >
                                      Отклонить
                                    </Button>
                                  </div>
                                )}

                                {booking.status === "CONFIRMED" && (
                                  <CancelBookingButton
                                    bookingId={booking.id}
                                    label="Отменить бронь"
                                    className="w-full"
                                  />
                                )}

                                {currentUserId &&
                                  (booking.status === "PENDING" ||
                                    booking.status === "CONFIRMED") && (
                                    <BookingChat
                                      bookingId={booking.id}
                                      currentUserId={currentUserId}
                                    />
                                  )}

                                {booking.status === "CONFIRMED" && currentUserId && (
                                  <ReviewForm
                                    bookingId={booking.id}
                                    targetName={booking.user.name}
                                    alreadyReviewed={(booking.reviews?.length ?? 0) > 0}
                                    canReview={canRateTrip(trip.date, trip.time)}
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "passengers" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Найти пассажиров</h2>
            <p className="text-sm text-muted-foreground">
              Ищите запросы пассажиров и предлагайте место — быстрее, чем ждать бронирования
            </p>
          </div>
          <TripSearch onSearch={setWishFilters} />
          {wishesLoading && (
            <p className="py-6 text-center text-muted-foreground">Ищем пассажиров...</p>
          )}
          {!wishesLoading && searchedWishes?.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">
              Пока нет подходящих запросов — попробуйте другие города
            </p>
          )}
          <div className="space-y-4">
            {searchedWishes?.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                canPropose
                driverTrips={trips}
              />
            ))}
          </div>
        </div>
      )}

      {mode === "offers" && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Мои предложения</h2>
          {myProposals.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Вы ещё не предлагали места. Найдите пассажиров во вкладке выше.
            </p>
          ) : (
            myProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} mode="driver" />
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, Trash2, Users } from "lucide-react";
import {
  deleteCargoTripAction,
  confirmCargoBookingAction,
  rejectCargoBookingAction,
} from "@/features/actions";
import { BookingChat } from "@/features/chat/booking-chat";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { CargoTripForm } from "@/features/cargo/cargo-trip-form";
import { CargoRequestCard, CargoRequestCardData } from "@/features/cargo/cargo-request-card";
import { TripSearch } from "@/features/trips/trip-search";
import { RouteMap } from "@/components/map/route-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatPrice } from "@/lib/utils";
import { parseRoutePolyline } from "@/lib/geo";
import type { CargoSearchData } from "@/lib/validations";

type CarrierTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  date: Date | string;
  time: string;
  vehicleType: string;
  maxWeightKg: number;
  maxVolumeM3?: number | null;
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
    shipper: {
      id: string;
      name: string | null;
      image: string | null;
      phone: string | null;
      rating: number;
    } | null;
  }[];
};

interface CarrierTabProps {
  trips: CarrierTrip[];
}

type Mode = "trips" | "find";

function formatDateForInput(date: Date | string) {
  return new Date(date).toISOString().split("T")[0];
}

export function CarrierTab({ trips }: CarrierTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("trips");
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<CarrierTrip | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CargoSearchData>({});
  const [isPending, startTransition] = useTransition();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["cargo-requests", filters],
    queryFn: async () => {
      const sp = new URLSearchParams({ type: "requests" });
      if (filters.fromCity) sp.set("from", filters.fromCity);
      if (filters.toCity) sp.set("to", filters.toCity);
      if (filters.date) sp.set("date", filters.date);
      const res = await fetch(`/api/cargo?${sp}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<CargoRequestCardData[]>;
    },
    enabled: mode === "find",
  });

  if (mode === "trips" && showForm) {
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
        <CargoTripForm
          tripId={editingTrip?.id}
          defaultValues={
            editingTrip
              ? {
                  fromCity: editingTrip.fromCity,
                  toCity: editingTrip.toCity,
                  date: formatDateForInput(editingTrip.date),
                  time: editingTrip.time,
                  vehicleType: editingTrip.vehicleType,
                  maxWeightKg: editingTrip.maxWeightKg,
                  maxVolumeM3: editingTrip.maxVolumeM3 ?? undefined,
                  price: editingTrip.price,
                  comment: editingTrip.comment ?? "",
                  routePolyline: editingTrip.routePolyline ?? "",
                }
              : undefined
          }
          onSuccess={() => {
            setShowForm(false);
            setEditingTrip(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border/80 bg-white/50 p-1.5 backdrop-blur-sm">
        <Button
          variant={mode === "trips" ? "default" : "ghost"}
          onClick={() => setMode("trips")}
        >
          Мои рейсы
        </Button>
        <Button
          variant={mode === "find" ? "default" : "ghost"}
          onClick={() => setMode("find")}
        >
          Найти груз
        </Button>
      </div>

      {mode === "trips" && (
        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setEditingTrip(null);
              setShowForm(true);
            }}
          >
            Создать грузовой рейс
          </Button>

          {trips.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Пока нет рейсов — создайте первый
            </p>
          ) : (
            trips.map((trip) => {
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
                    <div className="flex items-start justify-between gap-2">
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
                          aria-label="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => {
                            if (!confirm("Удалить рейс?")) return;
                            startTransition(async () => {
                              await deleteCargoTripAction(trip.id);
                              router.refresh();
                            });
                          }}
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      {formatDate(trip.date)} · {trip.time} · {trip.vehicleType} · до{" "}
                      {trip.maxWeightKg} кг · {formatPrice(trip.price)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setMapId(mapId === trip.id ? null : trip.id)}
                    >
                      {mapId === trip.id ? "Скрыть карту" : "Показать маршрут"}
                    </Button>
                    {mapId === trip.id && (
                      <RouteMap from={from} to={to} polyline={polyline} height={180} />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setExpanded(expanded === trip.id ? null : trip.id)
                      }
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Заявки ({trip.bookings.length})
                    </Button>
                    {expanded === trip.id && (
                      <div className="space-y-3 border-t pt-2">
                        {trip.bookings.length === 0 ? (
                          <p className="text-muted-foreground">Пока нет заявок</p>
                        ) : (
                          trip.bookings.map((b) => (
                            <div key={b.id} className="space-y-2 rounded-xl border p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={b.shipper?.image ?? undefined} />
                                  <AvatarFallback>
                                    {b.shipper?.name?.[0]?.toUpperCase() ?? "S"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium">{b.shipper?.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {b.status === "PENDING"
                                      ? "Ожидает подтверждения"
                                      : "Подтверждено"}
                                  </p>
                                  {b.status === "CONFIRMED" && b.shipper?.phone && (
                                    <a
                                      href={`tel:${b.shipper.phone}`}
                                      className="text-xs font-medium text-primary"
                                    >
                                      {b.shipper.phone}
                                    </a>
                                  )}
                                </div>
                              </div>
                              {b.status === "PENDING" && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    disabled={isPending}
                                    onClick={() =>
                                      startTransition(async () => {
                                        const r = await confirmCargoBookingAction(b.id);
                                        if (r.error) alert(r.error);
                                        else router.refresh();
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
                                        await rejectCargoBookingAction(b.id);
                                        router.refresh();
                                      })
                                    }
                                  >
                                    Отклонить
                                  </Button>
                                </div>
                              )}
                              {b.status === "CONFIRMED" && (
                                <CancelBookingButton
                                  bookingId={b.id}
                                  kind="cargo"
                                  label="Отменить бронь"
                                  className="w-full"
                                />
                              )}
                              {session?.user?.id && (
                                <BookingChat
                                  bookingId={b.id}
                                  currentUserId={session.user.id}
                                  kind="cargo"
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
            })
          )}
        </div>
      )}

      {mode === "find" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ищите грузы по маршруту и предлагайте перевозку
          </p>
          <TripSearch onSearch={setFilters} />
          {isLoading && (
            <p className="py-6 text-center text-muted-foreground">Ищем грузы…</p>
          )}
          {!isLoading && requests?.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">Подходящих грузов нет</p>
          )}
          {requests?.map((req) => (
            <CargoRequestCard key={req.id} request={req} canTake />
          ))}
        </div>
      )}
    </div>
  );
}

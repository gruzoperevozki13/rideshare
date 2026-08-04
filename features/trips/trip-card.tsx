"use client";

import { useState, useTransition, useMemo } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Star, MapPin, Calendar, Clock, Users, Route, Car } from "lucide-react";
import { bookTrip } from "@/features/actions";
import { BookingChat } from "@/features/chat/booking-chat";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RouteMap } from "@/components/map/route-map";
import { formatDate, formatDurationMin, formatPrice, formatRating, getAvailableSeats } from "@/lib/utils";
import { parseRoutePolyline } from "@/lib/geo";

export type TripCardData = {
  id: string;
  fromCity: string;
  toCity: string;
  date: string | Date;
  time: string;
  seats: number;
  price: number;
  comment: string | null;
  driverId: string;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  routePolyline?: string | null;
  durationMin?: number | null;
  distanceKm?: number | null;
  alongRoute?: boolean;
  driver: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number;
    phone?: string | null;
    carBrand?: string | null;
    carModel?: string | null;
    carColor?: string | null;
    carPlate?: string | null;
    carYear?: number | null;
    carImage?: string | null;
  };
  bookings: { id?: string; userId: string; status?: string }[];
};

interface TripCardProps {
  trip: TripCardData;
}

export function TripCard({ trip }: TripCardProps) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [myBookingStatus, setMyBookingStatus] = useState<string | null>(null);
  const [localBookingId, setLocalBookingId] = useState<string | null>(null);

  const availableSeats = getAvailableSeats(trip.seats, trip.bookings.length);
  const isOwnTrip = session?.user?.id === trip.driverId;
  const myBooking = trip.bookings.find((b) => b.userId === session?.user?.id);
  const bookingId = localBookingId ?? myBooking?.id ?? null;
  const bookingStatus = myBookingStatus ?? myBooking?.status ?? null;
  const isBooked = Boolean(bookingStatus);
  const isConfirmed = bookingStatus === "CONFIRMED";
  const isPendingBooking = bookingStatus === "PENDING";
  const showPassengerChat =
    Boolean(session?.user?.id) &&
    !isOwnTrip &&
    Boolean(bookingId) &&
    (isPendingBooking || isConfirmed);

  const polyline = useMemo(
    () => parseRoutePolyline(trip.routePolyline),
    [trip.routePolyline]
  );

  const from =
    trip.fromLat != null && trip.fromLng != null
      ? { lat: trip.fromLat, lng: trip.fromLng }
      : null;
  const to =
    trip.toLat != null && trip.toLng != null
      ? { lat: trip.toLat, lng: trip.toLng }
      : null;

  const handleBook = () => {
    startTransition(async () => {
      const result = await bookTrip(trip.id);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMyBookingStatus("PENDING");
        if (result.bookingId) setLocalBookingId(result.bookingId);
        setMessage("Заявка отправлена — ждите подтверждения водителя");
      }
    });
  };

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md animate-fade-up">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={trip.driver.image ?? undefined} />
              <AvatarFallback>{trip.driver.name?.[0]?.toUpperCase() ?? "D"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{trip.driver.name ?? "Водитель"}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{formatRating(trip.driver.rating)}</span>
              </div>
              {isConfirmed && trip.driver.phone && (
                <a
                  href={`tel:${trip.driver.phone}`}
                  className="mt-1 block text-sm font-medium text-primary"
                >
                  Телефон: {trip.driver.phone}
                </a>
              )}
              {isPendingBooking && (
                <p className="mt-1 text-xs text-amber-700">Ожидает подтверждения водителя</p>
              )}
            </div>
          </div>
          {trip.alongRoute && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Route className="h-3.5 w-3.5" />
              По пути
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-base font-medium">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span>
              {trip.fromCity} → {trip.toCity}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(trip.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {trip.time}
            </span>
            {trip.durationMin != null && trip.durationMin > 0 && (
              <span className="flex items-center gap-1">
                <Route className="h-4 w-4" />
                в пути ~{formatDurationMin(trip.durationMin)}
                {trip.distanceKm != null && trip.distanceKm > 0
                  ? ` · ${trip.distanceKm} км`
                  : ""}
              </span>
            )}
          </div>
        </div>

        {(trip.driver.carBrand || trip.driver.carModel || trip.driver.carImage) && (
          <div className="overflow-hidden rounded-xl border bg-muted/40">
            {trip.driver.carImage && (
              <div className="relative h-36 w-full">
                <Image
                  src={trip.driver.carImage}
                  alt="Автомобиль водителя"
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="400px"
                />
              </div>
            )}
            <div className="flex items-start gap-2 p-3 text-sm">
              <Car className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">
                  {[trip.driver.carBrand, trip.driver.carModel].filter(Boolean).join(" ") ||
                    "Автомобиль"}
                  {trip.driver.carYear ? `, ${trip.driver.carYear}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {[trip.driver.carColor, trip.driver.carPlate].filter(Boolean).join(" · ") ||
                    "Детали авто в профиле водителя"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-primary">{formatPrice(trip.price)}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {availableSeats} из {trip.seats} мест
            </p>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
              {showMap ? "Скрыть карту" : "Маршрут"}
            </Button>
            {session?.user && !isOwnTrip && (
              <Button
                size="lg"
                disabled={isPending || availableSeats === 0 || isBooked}
                onClick={handleBook}
              >
                {isBooked
                  ? isPendingBooking
                    ? "Ожидает подтверждения водителя"
                    : "Забронировано"
                  : "Забронировать"}
              </Button>
            )}
          </div>
        </div>

        {showMap && (
          <RouteMap from={from} to={to} polyline={polyline} height={200} />
        )}

        {message && (
          <p
            className={`text-sm ${
              message.includes("ошиб") || message.includes("Ошиб") || message.includes("Укажите") || message.includes("Нет") || message.includes("уже")
                ? "text-destructive"
                : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        {showPassengerChat && bookingId && session?.user?.id && (
          <div className="space-y-2 border-t pt-3">
            <CancelBookingButton
              bookingId={bookingId}
              label={isPendingBooking ? "Отменить заявку" : "Отменить бронь"}
              className="w-full"
            />
            <BookingChat bookingId={bookingId} currentUserId={session.user.id} />
          </div>
        )}

        {trip.comment && (
          <p className="text-sm text-muted-foreground border-t pt-3">{trip.comment}</p>
        )}
      </CardContent>
    </Card>
  );
}

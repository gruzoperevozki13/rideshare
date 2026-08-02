"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Calendar, Clock, Truck, Weight, Star } from "lucide-react";
import { bookCargoTripAction } from "@/features/actions";
import { BookingChat } from "@/features/chat/booking-chat";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { RouteMap } from "@/components/map/route-map";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatPrice, formatRating } from "@/lib/utils";
import { parseRoutePolyline } from "@/lib/geo";

export type CargoTripCardData = {
  id: string;
  fromCity: string;
  toCity: string;
  date: string | Date;
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
  carrierId: string;
  carrier: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number;
    phone?: string | null;
  };
  bookings: { id: string; shipperId?: string | null; status: string }[];
};

export function CargoTripCard({ trip }: { trip: CargoTripCardData }) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [localBookingId, setLocalBookingId] = useState<string | null>(null);

  const isOwn = session?.user?.id === trip.carrierId;
  const myBooking = trip.bookings.find((b) => b.shipperId === session?.user?.id);
  const bookingId = localBookingId ?? myBooking?.id ?? null;
  const status = localStatus ?? myBooking?.status ?? null;
  const isConfirmed = status === "CONFIRMED";
  const isPendingBooking = status === "PENDING";
  const showChat =
    Boolean(session?.user?.id) &&
    !isOwn &&
    Boolean(bookingId) &&
    (isPendingBooking || isConfirmed);

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
    <Card className="animate-fade-up overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={trip.carrier.image ?? undefined} />
            <AvatarFallback>{trip.carrier.name?.[0]?.toUpperCase() ?? "C"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{trip.carrier.name ?? "Перевозчик"}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {formatRating(trip.carrier.rating)}
            </p>
            {isConfirmed && trip.carrier.phone && (
              <a href={`tel:${trip.carrier.phone}`} className="text-sm font-medium text-primary">
                Телефон: {trip.carrier.phone}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          {trip.fromCity} → {trip.toCity}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(trip.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {trip.time}
          </span>
          <span className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            {trip.vehicleType}
          </span>
          <span className="flex items-center gap-1">
            <Weight className="h-4 w-4" />
            до {trip.maxWeightKg} кг
            {trip.maxVolumeM3 ? ` / ${trip.maxVolumeM3} м³` : ""}
          </span>
        </div>

        <p className="text-lg font-semibold text-primary">{formatPrice(trip.price)}</p>
        {trip.comment && <p className="text-sm text-muted-foreground">{trip.comment}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Скрыть карту" : "Карта"}
          </Button>
          {!isOwn && !status && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await bookCargoTripAction(trip.id);
                  if (result.error) setMessage(result.error);
                  else {
                    setLocalStatus("PENDING");
                    if (result.bookingId) setLocalBookingId(result.bookingId);
                    setMessage("Заявка отправлена перевозчику");
                  }
                })
              }
            >
              Забронировать
            </Button>
          )}
          {isPendingBooking && (
            <span className="self-center text-xs text-amber-700">Ожидает подтверждения</span>
          )}
          {isConfirmed && (
            <span className="self-center text-xs font-medium text-primary">Подтверждено</span>
          )}
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {showMap && <RouteMap from={from} to={to} polyline={polyline} height={180} />}
        {showChat && bookingId && session?.user?.id && (
          <>
            <CancelBookingButton
              bookingId={bookingId}
              kind="cargo"
              label={status === "PENDING" ? "Отменить заявку" : "Отменить бронь"}
              className="w-full"
            />
            <BookingChat
              bookingId={bookingId}
              currentUserId={session.user.id}
              kind="cargo"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

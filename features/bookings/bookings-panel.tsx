"use client";

import { BookingChat } from "@/features/chat/booking-chat";
import { ReviewForm } from "@/features/reviews/review-form";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatPrice, formatRating } from "@/lib/utils";
import { Calendar, Clock, MapPin, Star } from "lucide-react";

function canRateTrip(date: Date | string, time: string) {
  const d = new Date(date);
  const [h = "0", m = "0"] = time.split(":");
  d.setHours(Number(h), Number(m), 0, 0);
  return d.getTime() <= Date.now();
}

type BookingItem = {
  id: string;
  status: string;
  reviews: { id: string }[];
  trip: {
    fromCity: string;
    toCity: string;
    date: Date | string;
    time: string;
    price: number;
    driver: {
      id: string;
      name: string | null;
      image: string | null;
      rating: number;
      phone?: string | null;
    };
  };
};

interface BookingsPanelProps {
  bookings: BookingItem[];
  currentUserId: string;
}

export function BookingsPanel({ bookings, currentUserId }: BookingsPanelProps) {
  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Нет бронирований</p>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="surface space-y-3 p-4 sm:p-5 animate-fade-up">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={booking.trip.driver.image ?? undefined} />
              <AvatarFallback>
                {booking.trip.driver.name?.[0]?.toUpperCase() ?? "D"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{booking.trip.driver.name}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {formatRating(booking.trip.driver.rating)}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {booking.trip.fromCity} → {booking.trip.toCity}
            </p>
            <p className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(booking.trip.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {booking.trip.time}
              </span>
            </p>
            <p className="font-semibold text-primary">{formatPrice(booking.trip.price)}</p>
            <p className="text-xs text-muted-foreground">
              {booking.status === "PENDING"
                ? "Ожидает подтверждения водителя"
                : "Подтверждено"}
            </p>
            {booking.status === "CONFIRMED" && booking.trip.driver.phone && (
              <a
                href={`tel:${booking.trip.driver.phone}`}
                className="block font-medium text-primary"
              >
                Телефон водителя: {booking.trip.driver.phone}
              </a>
            )}
          </div>

          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <>
              <CancelBookingButton
                bookingId={booking.id}
                label={
                  booking.status === "PENDING"
                    ? "Отменить заявку"
                    : "Отменить бронь"
                }
                className="w-full"
              />
              <BookingChat bookingId={booking.id} currentUserId={currentUserId} />
            </>
          )}

          {booking.status === "CONFIRMED" && (
            <ReviewForm
              bookingId={booking.id}
              targetName={booking.trip.driver.name}
              alreadyReviewed={booking.reviews.length > 0}
              canReview={canRateTrip(booking.trip.date, booking.trip.time)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

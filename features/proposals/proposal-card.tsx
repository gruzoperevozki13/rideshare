"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Star, MapPin, Calendar, Clock } from "lucide-react";
import {
  acceptProposalAction,
  declineProposalAction,
  cancelProposalAction,
} from "@/features/actions";
import { BookingChat } from "@/features/chat/booking-chat";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, formatRating } from "@/lib/utils";

export type ProposalCardData = {
  id: string;
  price: number;
  time: string | null;
  message: string | null;
  status: string;
  bookingId?: string | null;
  driver?: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number;
    phone: string | null;
  };
  wish?: {
    fromCity: string;
    toCity: string;
    date: string | Date;
    passenger?: {
      name: string | null;
      image: string | null;
      phone: string | null;
    };
  };
  trip?: {
    fromCity: string;
    toCity: string;
    time?: string;
    price?: number;
  } | null;
};

interface ProposalCardProps {
  proposal: ProposalCardData;
  mode: "passenger" | "driver";
}

export function ProposalCard({ proposal, mode }: ProposalCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(proposal.status);
  const [bookingId, setBookingId] = useState(proposal.bookingId ?? null);
  const [driverPhone, setDriverPhone] = useState(proposal.driver?.phone ?? null);
  const [passengerPhone, setPassengerPhone] = useState(
    proposal.wish?.passenger?.phone ?? null
  );

  const person =
    mode === "passenger" ? proposal.driver : proposal.wish?.passenger;

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptProposalAction(proposal.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus("ACCEPTED");
      if (result.bookingId) setBookingId(result.bookingId);
      if (result.driverPhone) setDriverPhone(result.driverPhone);
      if (result.passengerPhone) setPassengerPhone(result.passengerPhone);
      router.refresh();
    });
  };

  return (
    <Card className="border-primary/15 animate-fade-up">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={person?.image ?? undefined} />
              <AvatarFallback>{person?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {person?.name ?? (mode === "passenger" ? "Водитель" : "Пассажир")}
              </p>
              {proposal.driver && mode === "passenger" && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {formatRating(proposal.driver.rating)}
                </p>
              )}
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              status === "PENDING"
                ? "bg-amber-100 text-amber-800"
                : status === "ACCEPTED"
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {status === "PENDING"
              ? "Ожидает ответа"
              : status === "ACCEPTED"
                ? "Принято"
                : status === "DECLINED"
                  ? "Отклонено"
                  : status}
          </span>
        </div>

        {proposal.wish && (
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            {proposal.wish.fromCity} → {proposal.wish.toCity}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{formatPrice(proposal.price)}</span>
          {proposal.time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {proposal.time}
            </span>
          )}
          {proposal.wish?.date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(proposal.wish.date).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>

        {proposal.message && (
          <p className="text-sm text-muted-foreground border-t pt-2">{proposal.message}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {mode === "passenger" && status === "PENDING" && (
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              size="lg"
              disabled={isPending}
              onClick={handleAccept}
            >
              {isPending ? "Бронируем…" : "Принять и забронировать"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await declineProposalAction(proposal.id);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setStatus("DECLINED");
                  router.refresh();
                })
              }
            >
              Отклонить
            </Button>
          </div>
        )}

        {mode === "driver" && status === "PENDING" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await cancelProposalAction(proposal.id);
                setStatus("CANCELLED");
                router.refresh();
              })
            }
          >
            Отозвать предложение
          </Button>
        )}

        {status === "ACCEPTED" && (
          <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">Бронь подтверждена — можно связываться</p>
            {mode === "passenger" && driverPhone && (
              <a href={`tel:${driverPhone}`} className="block font-medium text-primary">
                Телефон водителя: {driverPhone}
              </a>
            )}
            {mode === "driver" && passengerPhone && (
              <a href={`tel:${passengerPhone}`} className="block font-medium text-primary">
                Телефон пассажира: {passengerPhone}
              </a>
            )}
            {mode === "passenger" && !driverPhone && (
              <p className="text-muted-foreground">
                Телефон водителя появится после обновления страницы
              </p>
            )}
            {bookingId && session?.user?.id && (
              <>
                <CancelBookingButton
                  bookingId={bookingId}
                  label="Отменить бронь"
                  className="w-full"
                />
                <BookingChat bookingId={bookingId} currentUserId={session.user.id} />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

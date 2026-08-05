"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Clock, Users, Star, Pencil, Trash2 } from "lucide-react";
import { cancelWishAction } from "@/features/actions";
import { ProposeForm } from "@/features/proposals/propose-form";
import { ProposalCard, ProposalCardData } from "@/features/proposals/proposal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RouteMap } from "@/components/map/route-map";
import { formatDate, formatPrice, formatRating } from "@/lib/utils";

export type WishCardData = {
  id: string;
  fromCity: string;
  toCity: string;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  date: string | Date;
  time?: string | null;
  seats: number;
  price: number;
  comment: string | null;
  status: string;
  matchedTripLabel?: string;
  alreadyProposed?: boolean;
  passenger?: {
    id?: string;
    name: string | null;
    image: string | null;
    rating?: number;
    phone?: string | null;
  };
  proposals?: ProposalCardData[];
};

type TripOption = {
  id: string;
  fromCity: string;
  toCity: string;
  date: Date | string;
  time: string;
  price: number;
  seats: number;
  bookings: unknown[];
};

interface WishCardProps {
  wish: WishCardData;
  canCancel?: boolean;
  onEdit?: () => void;
  /** Driver can send a proposal */
  canPropose?: boolean;
  driverTrips?: TripOption[];
}

export function WishCard({
  wish,
  canCancel,
  onEdit,
  canPropose,
  driverTrips = [],
}: WishCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPropose, setShowPropose] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from =
    wish.fromLat != null && wish.fromLng != null
      ? { lat: wish.fromLat, lng: wish.fromLng }
      : null;
  const to =
    wish.toLat != null && wish.toLng != null
      ? { lat: wish.toLat, lng: wish.toLng }
      : null;

  const pendingProposals =
    wish.proposals?.filter((p) => p.status === "PENDING") ?? [];

  if (cancelled) return null;

  const handleDelete = () => {
    if (!confirm("Удалить запрос?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelWishAction(wish.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCancelled(true);
      router.refresh();
    });
  };

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            {wish.fromCity} → {wish.toCity}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <p className="text-lg font-bold text-primary">{formatPrice(wish.price)}</p>
            {canCancel && wish.status === "OPEN" && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Редактировать">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={handleDelete}
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {wish.passenger?.name && (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={wish.passenger.image ?? undefined} />
              <AvatarFallback>
                {wish.passenger.name?.[0]?.toUpperCase() ?? "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{wish.passenger.name}</p>
              {wish.passenger.rating != null && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {formatRating(wish.passenger.rating)}
                </p>
              )}
            </div>
          </div>
        )}

        {wish.matchedTripLabel && (
          <p className="text-xs font-medium text-primary">
            По пути вашего рейса: {wish.matchedTripLabel}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(wish.date)}
          </span>
          {wish.time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {wish.time}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {wish.seats} мест
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
            {wish.status === "OPEN"
              ? "Активен"
              : wish.status === "MATCHED"
                ? "Подобран"
                : wish.status}
          </span>
        </div>

        {wish.comment && (
          <p className="text-sm text-muted-foreground">{wish.comment}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Скрыть карту" : "Карта"}
          </Button>

          {canPropose && wish.status === "OPEN" && !wish.alreadyProposed && (
            <Button size="sm" onClick={() => setShowPropose((v) => !v)}>
              {showPropose ? "Закрыть" : "Предложить место"}
            </Button>
          )}

          {wish.alreadyProposed && (
            <span className="self-center text-xs font-medium text-primary">
              Предложение отправлено
            </span>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {showMap && <RouteMap from={from} to={to} height={160} />}

        {showPropose && canPropose && (
          <ProposeForm
            wishId={wish.id}
            defaultPrice={wish.price}
            trips={driverTrips}
            onDone={() => setShowPropose(false)}
          />
        )}

        {pendingProposals.length > 0 && canCancel && (
          <div className="space-y-2 border-t pt-3">
            <h4 className="text-sm font-semibold">
              Предложения водителей ({pendingProposals.length})
            </h4>
            {pendingProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} mode="passenger" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

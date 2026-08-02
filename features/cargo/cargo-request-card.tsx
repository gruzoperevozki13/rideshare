"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  Clock,
  Package,
  Weight,
  Star,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  takeCargoRequestAction,
  cancelCargoRequestAction,
  confirmCargoBookingAction,
  rejectCargoBookingAction,
} from "@/features/actions";
import { BookingChat } from "@/features/chat/booking-chat";
import { CancelBookingButton } from "@/features/bookings/cancel-booking-button";
import { RouteMap } from "@/components/map/route-map";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatRating } from "@/lib/utils";

export type CargoRequestCardData = {
  id: string;
  fromCity: string;
  toCity: string;
  date: string | Date;
  time: string;
  title: string;
  weightKg: number;
  volumeM3?: number | null;
  comment: string | null;
  image?: string | null;
  status: string;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  shipperId: string;
  shipper?: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number;
    phone?: string | null;
  };
  bookings?: {
    id: string;
    status: string;
    carrierId?: string | null;
    carrier?: {
      id: string;
      name: string | null;
      image: string | null;
      phone: string | null;
      rating: number;
    } | null;
  }[];
};

interface CargoRequestCardProps {
  request: CargoRequestCardData;
  canTake?: boolean;
  canManage?: boolean;
  onEdit?: () => void;
}

export function CargoRequestCard({
  request,
  canTake,
  canManage,
  onEdit,
}: CargoRequestCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [taken, setTaken] = useState(false);
  const [localBookingId, setLocalBookingId] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const from =
    request.fromLat != null && request.fromLng != null
      ? { lat: request.fromLat, lng: request.fromLng }
      : null;
  const to =
    request.toLat != null && request.toLng != null
      ? { lat: request.toLat, lng: request.toLng }
      : null;

  const myTake = request.bookings?.find((b) => b.carrierId === session?.user?.id);
  const pendingForOwner =
    canManage
      ? request.bookings?.filter((b) => b.status === "PENDING") ?? []
      : [];
  const confirmed = request.bookings?.find((b) => b.status === "CONFIRMED");
  const chatBooking =
    myTake && (myTake.status === "PENDING" || myTake.status === "CONFIRMED")
      ? myTake
      : localBookingId && (taken || myTake)
        ? {
            id: localBookingId,
            status: myTake?.status ?? "PENDING",
            carrierId: session?.user?.id,
          }
        : canManage && confirmed
          ? confirmed
          : null;

  if (removed) return null;

  const handleDelete = () => {
    if (!confirm("Удалить заявку?")) return;
    startTransition(async () => {
      const result = await cancelCargoRequestAction(request.id);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setRemoved(true);
      router.refresh();
    });
  };

  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Package className="h-4 w-4 shrink-0 text-primary" />
            {request.title}
          </CardTitle>
          {canManage && request.status === "OPEN" && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  aria-label="Редактировать"
                >
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
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {request.shipper && (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.shipper.image ?? undefined} />
              <AvatarFallback>
                {request.shipper.name?.[0]?.toUpperCase() ?? "G"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{request.shipper.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {formatRating(request.shipper.rating)}
              </p>
            </div>
          </div>
        )}

        {request.image && (
          <div className="relative overflow-hidden rounded-xl border">
            <Image
              src={request.image}
              alt={request.title}
              width={640}
              height={360}
              className="h-40 w-full object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          {request.fromCity} → {request.toCity}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Передать {formatDate(request.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            в {request.time}
          </span>
          <span className="flex items-center gap-1">
            <Weight className="h-4 w-4" />
            {request.weightKg} кг
            {request.volumeM3 ? ` / ${request.volumeM3} м³` : ""}
          </span>
        </div>

        {request.comment && (
          <p className="text-sm text-muted-foreground">{request.comment}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Скрыть карту" : "Карта"}
          </Button>

          {canTake && request.status === "OPEN" && !myTake && !taken && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await takeCargoRequestAction(request.id);
                  if (result.error) setMessage(result.error);
                  else {
                    setTaken(true);
                    if (result.bookingId) setLocalBookingId(result.bookingId);
                    setMessage("Заявка отправлена владельцу груза");
                  }
                })
              }
            >
              Предложить перевозку
            </Button>
          )}

          {(myTake?.status === "PENDING" || taken) && (
            <span className="self-center text-xs text-amber-700">Ожидает подтверждения</span>
          )}
          {myTake?.status === "CONFIRMED" && (
            <span className="self-center text-xs font-medium text-primary">Подтверждено</span>
          )}
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {showMap && <RouteMap from={from} to={to} height={160} />}

        {confirmed && canManage && confirmed.carrier && (
          <div className="space-y-2 rounded-lg border bg-primary/5 p-3 text-sm">
            <p className="font-medium">Перевозчик: {confirmed.carrier.name}</p>
            {confirmed.carrier.phone && (
              <a href={`tel:${confirmed.carrier.phone}`} className="text-primary">
                {confirmed.carrier.phone}
              </a>
            )}
            <CancelBookingButton
              bookingId={confirmed.id}
              kind="cargo"
              label="Отменить бронь"
              className="w-full"
            />
          </div>
        )}

        {chatBooking &&
          session?.user?.id &&
          chatBooking.status === "CONFIRMED" &&
          !canManage && (
            <CancelBookingButton
              bookingId={chatBooking.id}
              kind="cargo"
              label="Отменить бронь"
              className="w-full"
            />
          )}

        {(myTake?.status === "PENDING" ||
          (taken && localBookingId && chatBooking?.status === "PENDING")) &&
          session?.user?.id &&
          chatBooking && (
            <CancelBookingButton
              bookingId={chatBooking.id}
              kind="cargo"
              label="Отменить заявку"
              className="w-full"
            />
          )}

        {chatBooking && session?.user?.id && (
          <BookingChat
            bookingId={chatBooking.id}
            currentUserId={session.user.id}
            kind="cargo"
          />
        )}

        {pendingForOwner.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-semibold">
              Заявки перевозчиков ({pendingForOwner.length})
            </p>
            {pendingForOwner.map((b) => (
              <div key={b.id} className="space-y-2 rounded-lg border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-sm">{b.carrier?.name ?? "Перевозчик"}</span>
                  <Button
                    size="sm"
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
                {session?.user?.id && (
                  <BookingChat
                    bookingId={b.id}
                    currentUserId={session.user.id}
                    kind="cargo"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

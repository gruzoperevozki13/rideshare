"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProposalAction } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface ProposeFormProps {
  wishId: string;
  defaultPrice?: number;
  trips: TripOption[];
  onDone?: () => void;
}

export function ProposeForm({ wishId, defaultPrice = 500, trips, onDone }: ProposeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [price, setPrice] = useState(String(trips[0]?.price ?? defaultPrice));
  const [time, setTime] = useState(trips[0]?.time ?? "12:00");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("wishId", wishId);
    if (tripId) formData.set("tripId", tripId);
    formData.set("price", price);
    formData.set("time", time);
    if (message) formData.set("message", message);

    startTransition(async () => {
      const result = await createProposalAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  };

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Предложить место пассажиру</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          {trips.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="tripId">Ваша поездка</Label>
              <select
                id="tripId"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={tripId}
                onChange={(e) => {
                  const id = e.target.value;
                  setTripId(id);
                  const trip = trips.find((t) => t.id === id);
                  if (trip) {
                    setPrice(String(trip.price));
                    setTime(trip.time);
                  }
                }}
              >
                <option value="">Создать поездку после принятия</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fromCity} → {t.toCity} · {t.time} · свободно мест:{" "}
                    {t.seats - t.bookings.length}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Поездка создастся автоматически, когда пассажир примет предложение
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Цена, ₽</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Время</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Сообщение</Label>
            <Textarea
              id="message"
              placeholder="Могу забрать у метро, есть место для багажа…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Отправка..." : "Отправить предложение"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

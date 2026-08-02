"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CargoRequestForm } from "@/features/cargo/cargo-request-form";
import { CargoRequestCard, CargoRequestCardData } from "@/features/cargo/cargo-request-card";
import { CargoTripCard, CargoTripCardData } from "@/features/cargo/cargo-trip-card";
import { TripSearch } from "@/features/trips/trip-search";
import { Button } from "@/components/ui/button";
import type { CargoSearchData } from "@/lib/validations";

interface ShipperTabProps {
  myRequests: CargoRequestCardData[];
}

type Mode = "search" | "publish";

function formatDateForInput(date: Date | string) {
  return new Date(date).toISOString().split("T")[0];
}

export function ShipperTab({ myRequests }: ShipperTabProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("search");
  const [filters, setFilters] = useState<CargoSearchData>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CargoRequestCardData | null>(null);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["cargo-trips", filters],
    queryFn: async () => {
      const sp = new URLSearchParams({ type: "trips" });
      if (filters.fromCity) sp.set("from", filters.fromCity);
      if (filters.toCity) sp.set("to", filters.toCity);
      if (filters.date) sp.set("date", filters.date);
      const res = await fetch(`/api/cargo?${sp}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<CargoTripCardData[]>;
    },
    enabled: mode === "search",
  });

  if (mode === "publish" && showForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          ← Назад
        </Button>
        <CargoRequestForm
          requestId={editing?.id}
          existingImage={editing?.image}
          defaultValues={
            editing
              ? {
                  title: editing.title,
                  fromCity: editing.fromCity,
                  toCity: editing.toCity,
                  date: formatDateForInput(editing.date),
                  time: editing.time,
                  weightKg: editing.weightKg,
                  volumeM3: editing.volumeM3 ?? undefined,
                  comment: editing.comment ?? "",
                }
              : undefined
          }
          onSuccess={() => {
            setShowForm(false);
            setEditing(null);
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
          variant={mode === "search" ? "default" : "ghost"}
          onClick={() => setMode("search")}
        >
          Рейсы
        </Button>
        <Button
          variant={mode === "publish" ? "default" : "ghost"}
          onClick={() => setMode("publish")}
        >
          Моя заявка
        </Button>
      </div>

      {mode === "search" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Найдите перевозчика и оставьте заявку на рейс
          </p>
          <TripSearch onSearch={setFilters} />
          {isLoading && (
            <p className="py-6 text-center text-muted-foreground">Загрузка рейсов…</p>
          )}
          {!isLoading && trips?.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">Рейсов пока нет</p>
          )}
          {trips?.map((trip) => (
            <CargoTripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {mode === "publish" && (
        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Создать заявку
          </Button>

          <h3 className="font-display text-lg font-semibold">Мои заявки</h3>
          {myRequests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Вы ещё не публиковали груз
            </p>
          ) : (
            myRequests.map((req) => (
              <CargoRequestCard
                key={req.id}
                request={req}
                canManage
                onEdit={
                  req.status === "OPEN"
                    ? () => {
                        setEditing(req);
                        setShowForm(true);
                      }
                    : undefined
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

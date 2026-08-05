"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrips } from "@/hooks/use-trips";
import { TripSearch } from "@/features/trips/trip-search";
import { TripCard } from "@/features/trips/trip-card";
import { WishForm } from "@/features/wishes/wish-form";
import { WishCard, WishCardData } from "@/features/wishes/wish-card";
import { ProposalCard, ProposalCardData } from "@/features/proposals/proposal-card";
import { TripSearchData } from "@/lib/validations";
import { Button } from "@/components/ui/button";

interface PassengerTabProps {
  wishes: WishCardData[];
  incomingProposals: ProposalCardData[];
}

function formatDateForInput(date: Date | string) {
  return new Date(date).toISOString().split("T")[0];
}

export function PassengerTab({ wishes, incomingProposals }: PassengerTabProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<TripSearchData>({ alongRoute: true });
  const [mode, setMode] = useState<"search" | "wish" | "offers">("search");
  const [showForm, setShowForm] = useState(false);
  const [editingWish, setEditingWish] = useState<WishCardData | null>(null);
  const { data: trips, isLoading, error } = useTrips(filters);

  const pendingCount = incomingProposals.filter((p) => p.status === "PENDING").length;

  if (mode === "wish" && showForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setEditingWish(null);
          }}
        >
          ← Назад
        </Button>
        <WishForm
          wishId={editingWish?.id}
          defaultValues={
            editingWish
              ? {
                  fromCity: editingWish.fromCity,
                  toCity: editingWish.toCity,
                  date: formatDateForInput(editingWish.date),
                  time: editingWish.time ?? "12:00",
                  seats: editingWish.seats,
                  price: editingWish.price,
                  comment: editingWish.comment ?? "",
                }
              : undefined
          }
          onSuccess={() => {
            setShowForm(false);
            setEditingWish(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/80 bg-white/50 p-1.5 backdrop-blur-sm">
        <Button
          variant={mode === "search" ? "default" : "ghost"}
          className="text-xs sm:text-sm"
          onClick={() => setMode("search")}
        >
          Поездки
        </Button>
        <Button
          variant={mode === "wish" ? "default" : "ghost"}
          className="text-xs sm:text-sm"
          onClick={() => setMode("wish")}
        >
          Запрос
        </Button>
        <Button
          variant={mode === "offers" ? "default" : "ghost"}
          className="text-xs sm:text-sm"
          onClick={() => setMode("offers")}
        >
          Входящие
          {pendingCount > 0 && (
            <span className="ml-1 rounded-md bg-white/20 px-1.5 text-[10px]">
              {pendingCount}
            </span>
          )}
        </Button>
      </div>

      {mode === "search" && (
        <>
          <TripSearch onSearch={setFilters} />

          {isLoading && (
            <p className="py-8 text-center text-muted-foreground">Загрузка поездок…</p>
          )}

          {error && (
            <p className="py-8 text-center text-destructive">Не удалось загрузить поездки</p>
          )}

          {trips && trips.length === 0 && (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-40 w-full max-w-sm items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200/80 text-sm text-sky-800/70">
                Пока пусто на этом маршруте
              </div>
              <p className="text-muted-foreground">
                Поездок не найдено — опубликуйте запрос, водители сами предложат место
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMode("wish");
                  setShowForm(true);
                }}
              >
                Создать запрос
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {trips?.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </>
      )}

      {mode === "wish" && (
        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setEditingWish(null);
              setShowForm(true);
            }}
          >
            Создать запрос
          </Button>

          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Мои запросы</h3>
            {wishes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет опубликованных запросов
              </p>
            ) : (
              wishes.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  canCancel
                  onEdit={
                    wish.status === "OPEN"
                      ? () => {
                          setEditingWish(wish);
                          setShowForm(true);
                        }
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      )}

      {mode === "offers" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Предложения водителей</h3>
            <p className="text-sm text-muted-foreground">
              Примите предложение — место забронируется автоматически
            </p>
          </div>
          {incomingProposals.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Пока нет предложений. Опубликуйте запрос — водители найдут вас.
            </p>
          ) : (
            incomingProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} mode="passenger" />
            ))
          )}
        </div>
      )}
    </div>
  );
}

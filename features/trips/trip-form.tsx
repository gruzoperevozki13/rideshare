"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { tripSchema, TripFormData } from "@/lib/validations";
import { createTrip, updateTrip } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteMap } from "@/components/map/route-map";
import type { LatLng } from "@/lib/geo";

type RouteOption = {
  id: string;
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  summary: string;
  isFallback?: boolean;
};

interface TripFormProps {
  defaultValues?: Partial<TripFormData>;
  tripId?: string;
  onSuccess?: () => void;
}

export function TripForm({ defaultValues, tripId, onSuccess }: TripFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fromPoint, setFromPoint] = useState<LatLng | null>(null);
  const [toPoint, setToPoint] = useState<LatLng | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    setError,
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      fromCity: "",
      toCity: "",
      date: "",
      time: "",
      seats: 3,
      price: 500,
      comment: "",
      routePolyline: "",
      ...defaultValues,
    },
  });

  const fromCity = watch("fromCity");
  const toCity = watch("toCity");

  const loadRoutes = useCallback(async (from: string, to: string) => {
    if (from.trim().length < 2 || to.trim().length < 2) {
      setRoutes([]);
      setSelectedRouteId(null);
      setFromPoint(null);
      setToPoint(null);
      setValue("routePolyline", "");
      return;
    }

    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const res = await fetch(
        `/api/routes?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setRoutesError(data.error ?? "Не удалось загрузить маршруты");
        setRoutes([]);
        return;
      }

      setFromPoint(data.from);
      setToPoint(data.to);
      const list = (data.routes ?? []) as RouteOption[];
      setRoutes(list);
      const first = list[0];
      if (first && !first.isFallback && first.points.length >= 3) {
        setSelectedRouteId(first.id);
        setValue("routePolyline", JSON.stringify(first.points));
      } else {
        setSelectedRouteId(first?.id ?? null);
        // Пусто → на сервере пересчитаем по дорогам
        setValue("routePolyline", "");
        if (first?.isFallback) {
          setRoutesError(
            "Сервис дорог временно недоступен — при сохранении маршрут попробуем построить снова"
          );
        }
      }
    } catch {
      setRoutesError("Ошибка загрузки маршрутов");
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, [setValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRoutes(fromCity || "", toCity || "");
    }, 500);
    return () => clearTimeout(timer);
  }, [fromCity, toCity, loadRoutes]);

  const selectRoute = (route: RouteOption) => {
    setSelectedRouteId(route.id);
    if (!route.isFallback && route.points.length >= 3) {
      setValue("routePolyline", JSON.stringify(route.points));
    } else {
      setValue("routePolyline", "");
    }
  };

  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
  const selectedPoints = selected?.points ?? [];
  const altPolylines = useMemo(
    () =>
      routes
        .filter((r) => r.id !== selected?.id)
        .map((r) => r.points)
        .filter((p) => p.length >= 2),
    [routes, selected?.id]
  );

  const onSubmit = (data: TripFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") formData.set(key, String(value));
    });

    startTransition(async () => {
      const result = tripId
        ? await updateTrip(tripId, formData)
        : await createTrip(formData);

      if (result.error) {
        setError("root", { message: result.error });
        return;
      }

      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tripId ? "Редактировать поездку" : "Создать поездку"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromCity">Откуда</Label>
              <Input id="fromCity" placeholder="Москва" {...register("fromCity")} />
              {errors.fromCity && (
                <p className="text-sm text-destructive">{errors.fromCity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toCity">Куда</Label>
              <Input id="toCity" placeholder="Санкт-Петербург" {...register("toCity")} />
              {errors.toCity && (
                <p className="text-sm text-destructive">{errors.toCity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Время</Label>
              <Input id="time" type="time" {...register("time")} />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Маршрут</Label>
            {routesLoading && (
              <p className="text-sm text-muted-foreground">Ищем варианты маршрута…</p>
            )}
            {routesError && (
              <p className="text-sm text-destructive">{routesError}</p>
            )}
            {routes.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {routes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectRoute(route)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedRouteId === route.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {route.summary}
                    </button>
                  ))}
                </div>
                <RouteMap
                  from={fromPoint}
                  to={toPoint}
                  polyline={selectedPoints}
                  alternatives={altPolylines}
                  height={280}
                />
                <p className="text-xs text-muted-foreground">
                  Выберите, каким путём поедете — пассажиры увидят этот маршрут
                </p>
              </div>
            )}
            <input type="hidden" {...register("routePolyline")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seats">Свободные места</Label>
              <Input id="seats" type="number" min={1} max={8} {...register("seats")} />
              {errors.seats && (
                <p className="text-sm text-destructive">{errors.seats.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Цена за место, ₽</Label>
              <Input id="price" type="number" min={0} {...register("price")} />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Остановки, багаж, предпочтения…"
              {...register("comment")}
            />
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Сохранение..." : tripId ? "Сохранить" : "Опубликовать поездку"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

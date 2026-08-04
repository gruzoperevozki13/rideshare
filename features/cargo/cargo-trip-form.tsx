"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { cargoTripSchema, CargoTripFormData } from "@/lib/validations";
import { createCargoTripAction, updateCargoTripAction } from "@/features/actions";
import { RouteMap } from "@/components/map/route-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityInput } from "@/components/ui/city-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LatLng } from "@/lib/geo";

type RouteOption = {
  id: string;
  points: LatLng[];
  summary: string;
  isFallback?: boolean;
};

interface CargoTripFormProps {
  tripId?: string;
  defaultValues?: Partial<CargoTripFormData>;
  onSuccess?: () => void;
}

export function CargoTripForm({
  tripId,
  defaultValues,
  onSuccess,
}: CargoTripFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fromPoint, setFromPoint] = useState<LatLng | null>(null);
  const [toPoint, setToPoint] = useState<LatLng | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    setError,
    reset,
  } = useForm<CargoTripFormData>({
    resolver: zodResolver(cargoTripSchema),
    defaultValues: {
      fromCity: "",
      toCity: "",
      date: "",
      time: "",
      vehicleType: "Тент",
      maxWeightKg: 1500,
      price: 5000,
      comment: "",
      routePolyline: "",
      ...defaultValues,
    },
  });

  const fromCity = watch("fromCity");
  const toCity = watch("toCity");

  const loadRoutes = useCallback(
    async (from: string, to: string) => {
      if (from.trim().length < 2 || to.trim().length < 2) {
        setRoutes([]);
        setSelectedRouteId(null);
        setValue("routePolyline", "");
        return;
      }
      try {
        const res = await fetch(
          `/api/routes?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}`
        );
        const data = await res.json();
        if (!res.ok) return;
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
          setValue("routePolyline", "");
        }
      } catch {
        /* ignore */
      }
    },
    [setValue]
  );

  useEffect(() => {
    const t = setTimeout(() => void loadRoutes(fromCity || "", toCity || ""), 500);
    return () => clearTimeout(t);
  }, [fromCity, toCity, loadRoutes]);

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

  const onSubmit = (data: CargoTripFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== "") formData.set(k, String(v));
    });
    startTransition(async () => {
      const result = tripId
        ? await updateCargoTripAction(tripId, formData)
        : await createCargoTripAction(formData);
      if (result.error) {
        setError("root", { message: result.error });
        return;
      }
      reset();
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          {tripId ? "Редактировать грузовой рейс" : "Создать грузовой рейс"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Откуда</Label>
              <Controller
                name="fromCity"
                control={control}
                render={({ field }) => (
                  <CityInput
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Город, улица, дом"
                  />
                )}
              />
              {errors.fromCity && (
                <p className="text-sm text-destructive">{errors.fromCity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Куда</Label>
              <Controller
                name="toCity"
                control={control}
                render={({ field }) => (
                  <CityInput
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Город, улица, дом"
                  />
                )}
              />
              {errors.toCity && (
                <p className="text-sm text-destructive">{errors.toCity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Время выезда</Label>
              <Input type="time" {...register("time")} />
            </div>
          </div>

          {routes.length > 0 && (
            <div className="space-y-2">
              <Label>Маршрут</Label>
              <div className="flex flex-wrap gap-2">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => {
                      setSelectedRouteId(route.id);
                      if (!route.isFallback && route.points.length >= 3) {
                        setValue("routePolyline", JSON.stringify(route.points));
                      } else {
                        setValue("routePolyline", "");
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedRouteId === route.id
                        ? "border-primary bg-primary/10"
                        : "border-border"
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
                height={220}
              />
              <input type="hidden" {...register("routePolyline")} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип транспорта</Label>
              <Input placeholder="Тент / рефрижератор / борт" {...register("vehicleType")} />
            </div>
            <div className="space-y-2">
              <Label>Грузоподъёмность, кг</Label>
              <Input type="number" min={1} {...register("maxWeightKg")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Объём, м³ (необязательно)</Label>
              <Input type="number" step="0.1" min={0} {...register("maxVolumeM3")} />
            </div>
            <div className="space-y-2">
              <Label>Цена рейса, ₽</Label>
              <Input type="number" min={0} {...register("price")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea placeholder="Габариты, условия погрузки…" {...register("comment")} />
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending
              ? "Сохранение…"
              : tripId
                ? "Сохранить"
                : "Опубликовать рейс"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

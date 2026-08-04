"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { wishSchema, WishFormData } from "@/lib/validations";
import { createWishAction, updateWishAction } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityInput } from "@/components/ui/city-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WishFormProps {
  wishId?: string;
  defaultValues?: Partial<WishFormData>;
  onSuccess?: () => void;
}

export function WishForm({ wishId, defaultValues, onSuccess }: WishFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    reset,
  } = useForm<WishFormData>({
    resolver: zodResolver(wishSchema),
    defaultValues: {
      fromCity: "",
      toCity: "",
      date: "",
      time: "12:00",
      seats: 1,
      comment: "",
      ...defaultValues,
    },
  });

  const onSubmit = (data: WishFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) formData.set(key, String(value));
    });

    startTransition(async () => {
      const result = wishId
        ? await updateWishAction(wishId, formData)
        : await createWishAction(formData);
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
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          {wishId ? "Редактировать запрос" : "Запрос на поездку"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Водители по маршруту увидят ваш запрос
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wishFrom">Откуда</Label>
              <Controller
                name="fromCity"
                control={control}
                render={({ field }) => (
                  <CityInput
                    id="wishFrom"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Москва"
                  />
                )}
              />
              {errors.fromCity && (
                <p className="text-sm text-destructive">{errors.fromCity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wishTo">Куда</Label>
              <Controller
                name="toCity"
                control={control}
                render={({ field }) => (
                  <CityInput
                    id="wishTo"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Тула"
                  />
                )}
              />
              {errors.toCity && (
                <p className="text-sm text-destructive">{errors.toCity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wishDate">Дата</Label>
              <Input id="wishDate" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wishTime">Время</Label>
              <Input id="wishTime" type="time" {...register("time")} />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wishSeats">Число мест</Label>
              <Input id="wishSeats" type="number" min={1} max={8} {...register("seats")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wishComment">Комментарий</Label>
            <Textarea
              id="wishComment"
              placeholder="Гибкость по времени, багаж…"
              {...register("comment")}
            />
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending
              ? "Сохранение…"
              : wishId
                ? "Сохранить"
                : "Опубликовать запрос"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

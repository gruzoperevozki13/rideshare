"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { cargoRequestSchema, CargoRequestFormData } from "@/lib/validations";
import { createCargoRequestAction, updateCargoRequestAction } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityInput } from "@/components/ui/city-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CargoRequestFormProps {
  requestId?: string;
  defaultValues?: Partial<CargoRequestFormData>;
  existingImage?: string | null;
  onSuccess?: () => void;
}

export function CargoRequestForm({
  requestId,
  defaultValues,
  existingImage,
  onSuccess,
}: CargoRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    existingImage ?? null
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    reset,
  } = useForm<CargoRequestFormData>({
    resolver: zodResolver(cargoRequestSchema),
    defaultValues: {
      fromCity: "",
      toCity: "",
      date: "",
      time: "10:00",
      title: "",
      weightKg: 100,
      comment: "",
      ...defaultValues,
    },
  });

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(file ? URL.createObjectURL(file) : existingImage ?? null);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(existingImage ?? null);
    if (photoRef.current) photoRef.current.value = "";
  };

  const onSubmit = (data: CargoRequestFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== "") formData.set(k, String(v));
    });
    if (photoFile) formData.set("image", photoFile);

    startTransition(async () => {
      const result = requestId
        ? await updateCargoRequestAction(requestId, formData)
        : await createCargoRequestAction(formData);
      if (result.error) {
        setError("root", { message: result.error });
        return;
      }
      reset();
      clearPhoto();
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-xl">
          {requestId ? "Редактировать заявку" : "Заявка на перевозку груза"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Укажите маршрут и удобное время передачи — перевозчики смогут откликнуться
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Описание груза</Label>
            <Input placeholder="Мебель, стройматериалы…" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Фото груза (необязательно)</Label>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPhotoChange}
            />
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl border">
                <Image
                  src={photoPreview}
                  alt="Превью груза"
                  width={640}
                  height={360}
                  className="h-40 w-full object-cover"
                  unoptimized
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => photoRef.current?.click()}>
                    Заменить
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={clearPhoto}>
                    Убрать
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => photoRef.current?.click()}
              >
                Прикрепить фото
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG или WebP до 5 МБ</p>
          </div>

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
                    placeholder="Саранск"
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
                    placeholder="Москва"
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
              <Label>Дата передачи</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label>Время передачи</Label>
              <Input type="time" {...register("time")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Вес, кг</Label>
              <Input type="number" min={1} {...register("weightKg")} />
            </div>
            <div className="space-y-2">
              <Label>Объём, м³ (необязательно)</Label>
              <Input type="number" step="0.1" min={0} {...register("volumeM3")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea
              placeholder="Адрес, этаж, нужна ли помощь с погрузкой…"
              {...register("comment")}
            />
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending
              ? "Сохранение…"
              : requestId
                ? "Сохранить"
                : "Опубликовать заявку"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

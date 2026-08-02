"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { profileSchema, ProfileFormData } from "@/lib/validations";
import { updateProfile } from "@/features/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRating } from "@/lib/utils";
import { Star } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
    bio: string | null;
    role: string | null;
    rating: number;
    tripsCount: number;
    carBrand: string | null;
    carModel: string | null;
    carColor: string | null;
    carPlate: string | null;
    carYear: number | null;
    carImage: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
  const [carPreview, setCarPreview] = useState<string | null>(user.carImage);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [carFile, setCarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const carInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      carBrand: user.carBrand ?? "",
      carModel: user.carModel ?? "",
      carColor: user.carColor ?? "",
      carPlate: user.carPlate ?? "",
      carYear: user.carYear ?? undefined,
    },
  });

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onCarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarFile(file);
    setCarPreview(URL.createObjectURL(file));
  };

  const onSubmit = (data: ProfileFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") formData.set(key, String(value));
    });
    if (avatarFile) formData.set("avatar", avatarFile);
    if (carFile) formData.set("carImage", carFile);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError("root", { message: result.error });
        return;
      }
      router.refresh();
    });
  };

  const isDriver = user.role === "DRIVER";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-28 w-28 ring-4 ring-primary/10">
          <AvatarImage src={avatarPreview ?? undefined} />
          <AvatarFallback className="text-2xl">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatarChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => avatarInputRef.current?.click()}
        >
          Загрузить фото профиля
        </Button>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {formatRating(user.rating)}
          </span>
          <span>{user.tripsCount} поездок</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" placeholder="+7 (999) 123-45-67" {...register("phone")} required />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">О себе</Label>
              <Textarea id="bio" placeholder="Расскажите о себе…" {...register("bio")} />
            </div>

            {isDriver && (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div>
                  <h3 className="font-semibold">Автомобиль</h3>
                  <p className="text-xs text-muted-foreground">
                    Эти данные увидят пассажиры при выборе поездки
                  </p>
                </div>

                <div className="relative mx-auto h-36 w-full overflow-hidden rounded-xl bg-muted">
                  {carPreview ? (
                    <Image src={carPreview} alt="Авто" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Фото автомобиля
                    </div>
                  )}
                </div>
                <input
                  ref={carInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onCarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => carInputRef.current?.click()}
                >
                  Загрузить фото автомобиля
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="carBrand">Марка</Label>
                    <Input id="carBrand" placeholder="Toyota" {...register("carBrand")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carModel">Модель</Label>
                    <Input id="carModel" placeholder="Camry" {...register("carModel")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carColor">Цвет</Label>
                    <Input id="carColor" placeholder="Белый" {...register("carColor")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carYear">Год</Label>
                    <Input id="carYear" type="number" placeholder="2020" {...register("carYear")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carPlate">Номер</Label>
                  <Input id="carPlate" placeholder="А123БВ 777" {...register("carPlate")} />
                </div>
              </div>
            )}

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

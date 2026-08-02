"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Car, Package, Truck, UserRound } from "lucide-react";
import { setUserRole } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AppRole = "DRIVER" | "PASSENGER" | "CARGO_CARRIER" | "CARGO_SHIPPER";

interface RoleSelectorProps {
  initialPhone?: string | null;
}

const ROLES: {
  role: AppRole;
  title: string;
  desc: string;
  cta: string;
  icon: typeof Car;
  group: string;
}[] = [
  {
    role: "DRIVER",
    title: "Водитель",
    desc: "Создаёте поездки и предлагаете места пассажирам",
    cta: "Войти как водитель",
    icon: Car,
    group: "Попутчики",
  },
  {
    role: "PASSENGER",
    title: "Пассажир",
    desc: "Ищете поездки или публикуете запрос на поездку",
    cta: "Войти как пассажир",
    icon: UserRound,
    group: "Попутчики",
  },
  {
    role: "CARGO_CARRIER",
    title: "Грузоперевозчик",
    desc: "Публикуете рейсы со свободным местом и ищете грузы",
    cta: "Войти как грузоперевозчик",
    icon: Truck,
    group: "Грузоперевозки",
  },
  {
    role: "CARGO_SHIPPER",
    title: "Отправитель груза",
    desc: "Публикуете заявку на перевозку или бронируете рейс",
    cta: "Войти как отправитель",
    icon: Package,
    group: "Грузоперевозки",
  },
];

export function RoleSelector({ initialPhone }: RoleSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectRole = (role: AppRole) => {
    setError(null);
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Укажите номер телефона — он нужен для связи после бронирования");
      return;
    }

    const formData = new FormData();
    formData.set("role", role);
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await setUserRole(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  const groups = ["Попутчики", "Грузоперевозки"] as const;

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-2xl flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center animate-fade-up">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          RideShare
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Выберите роль
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Интерфейс подстроится под ваш сценарий. Телефон нужен для связи после
          бронирования.
        </p>
      </div>

      <div className="surface mb-8 space-y-3 p-5 animate-rise stagger-1">
        <Label htmlFor="onboarding-phone" className="text-sm font-semibold">
          Телефон
        </Label>
        <Input
          id="onboarding-phone"
          type="tel"
          placeholder="+7 999 123-45-67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="h-12"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="space-y-8">
        {groups.map((group, gi) => (
          <div key={group} className={`space-y-3 animate-rise stagger-${gi + 2}`}>
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.filter((r) => r.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    type="button"
                    disabled={isPending}
                    onClick={() => selectRole(item.role)}
                    className="role-tile group"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">
                      {item.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                    <span className="mt-4 inline-flex text-sm font-semibold text-primary">
                      {item.cta} →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {isPending && (
        <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in">
          Сохраняем роль…
        </p>
      )}
    </div>
  );
}

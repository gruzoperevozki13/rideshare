"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerAction } from "@/features/actions";
import { VerifyCodeForm } from "@/features/auth/verify-code-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!accepted) {
      setError("Отметьте, что ознакомились с правилами безопасности");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("acceptTerms", "true");

    startTransition(async () => {
      const result = await registerAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsVerification && result.email) {
        setSentTo(result.email);
        return;
      }
      window.location.href = "/login?verified=1";
    });
  };

  if (sentTo) {
    return <VerifyCodeForm email={sentTo} />;
  }

  return (
    <div className="surface-strong w-full max-w-md mx-auto p-6 sm:p-8 animate-rise">
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Регистрация</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          После регистрации придёт код на email — введите его на сайте
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" name="name" placeholder="Иван" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+7 999 123-45-67"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@mail.ru"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Минимум 6 символов"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <label className="flex cursor-pointer gap-3 rounded-xl border border-border/80 bg-white/60 p-3 text-sm leading-snug">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
            required
          />
          <span className="text-muted-foreground">
            Подтверждаю, что ознакомился(-ась) с{" "}
            <Link
              href="/safety"
              target="_blank"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              правилами безопасности
            </Link>{" "}
            и условиями сервиса: оплата только при встрече, предоплата не требуется
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending || !accepted}>
          {isPending ? "Регистрация…" : "Зарегистрироваться"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

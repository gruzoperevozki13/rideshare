"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await requestPasswordResetAction(email);
      if (r.error) {
        setError(r.error);
        return;
      }
      setEmail(r.email ?? email.toLowerCase().trim());
      setStep("reset");
      setInfo("Если аккаунт есть, код отправлен на почту");
    });
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await resetPasswordAction(email, code, password);
      if (r.error) {
        setError(r.error);
        return;
      }
      window.location.href = "/login?reset=1";
    });
  };

  if (step === "reset") {
    return (
      <div className="surface-strong w-full max-w-md mx-auto p-6 sm:p-8 animate-rise">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Новый пароль
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Код отправили на{" "}
            <span className="font-semibold text-foreground">{email}</span>.
            Введите код и придумайте новый пароль.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Письмо может быть в «Спам». Код действует 30 минут.
          </p>
        </div>

        <form onSubmit={submitReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-code">Код из письма</Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-2xl tracking-[0.35em] font-semibold"
              required
              minLength={6}
              maxLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль</Label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Сохранение…" : "Сохранить пароль"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await requestPasswordResetAction(email);
                if (r.error) setError(r.error);
                else {
                  setInfo("Новый код отправлен");
                  setCode("");
                }
              });
            }}
          >
            Отправить код ещё раз
          </Button>
          <Link href="/login" className="block">
            <Button type="button" variant="ghost" className="w-full">
              Вернуться ко входу
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-strong w-full max-w-md mx-auto p-6 sm:p-8 animate-rise">
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Забыли пароль?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Укажите email — пришлём код для сброса пароля
        </p>
      </div>

      <form onSubmit={requestCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="you@mail.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Отправка…" : "Получить код"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Вспомнили пароль?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

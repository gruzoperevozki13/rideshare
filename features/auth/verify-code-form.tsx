"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  resendVerificationAction,
  verifyEmailCodeAction,
} from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
  onVerified?: () => void;
  /** После успеха по умолчанию редирект на /login?verified=1 */
  redirectToLogin?: boolean;
};

export function VerifyCodeForm({
  email,
  onVerified,
  redirectToLogin = true,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await verifyEmailCodeAction(email, code);
      if (r.error) {
        setError(r.error);
        return;
      }
      onVerified?.();
      if (redirectToLogin) {
        window.location.href = "/login?verified=1";
      }
    });
  };

  return (
    <div className="surface-strong w-full max-w-md mx-auto p-6 sm:p-8 animate-rise">
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Код из письма
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Отправили 6-значный код на{" "}
          <span className="font-semibold text-foreground">{email}</span>.
          Введите его ниже — без перехода по ссылкам.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Письмо может попасть в «Спам». Код действует 30 минут.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-code">Код подтверждения</Label>
          <Input
            id="verify-code"
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Проверка…" : "Подтвердить"}
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
              const r = await resendVerificationAction(email);
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

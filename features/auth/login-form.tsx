"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  checkCredentialsAction,
  resendVerificationAction,
} from "@/features/actions";
import { VerifyCodeForm } from "@/features/auth/verify-code-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [needVerify, setNeedVerify] = useState(false);
  const [info, setInfo] = useState<string | null>(
    verified ? "Email подтверждён — можно войти" : null
  );

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedVerify(false);
    setLoading(true);

    const check = await checkCredentialsAction(email, password);
    if ("error" in check && check.error) {
      setLoading(false);
      setError(check.error);
      return;
    }
    if ("needsVerification" in check && check.needsVerification) {
      const resent = await resendVerificationAction(email);
      setLoading(false);
      if (resent.error) {
        setError(resent.error);
        return;
      }
      setNeedVerify(true);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }
    if (result?.url) {
      window.location.href = result.url;
    }
  };

  if (needVerify && email) {
    return (
      <VerifyCodeForm
        email={email.toLowerCase().trim()}
        onVerified={() => {
          setNeedVerify(false);
          setInfo("Email подтверждён — войдите снова");
        }}
      />
    );
  }

  return (
    <div className="surface-strong w-full max-w-md mx-auto p-6 sm:p-8 animate-rise">
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Вход</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Войдите с email и паролем, указанными при регистрации
        </p>
      </div>

      {info && <p className="mb-4 text-center text-sm font-medium text-primary">{info}</p>}

      <form onSubmit={handleCredentialsLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@mail.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="relative min-h-[calc(100vh-4.25rem)] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,hsl(199_89%_48%/_0.55),transparent_50%),radial-gradient(ellipse_at_80%_0%,hsl(210_90%_30%/_0.7),transparent_45%),linear-gradient(160deg,#0b3d6b_0%,#0b6bcb_45%,#38bdf8_100%)]" />
      <div className="absolute inset-0 hero-scrim" />

      <div className="relative container mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-5xl flex-col justify-center gap-10 px-4 py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md text-white animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
            RideShare
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Восстановление доступа
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Код придёт на email, которым вы регистрировались. Новый пароль
            заработает сразу после подтверждения.
          </p>
        </div>
        <div className="w-full max-w-md animate-rise stagger-2">
          <Suspense
            fallback={
              <div className="surface-strong h-80 animate-pulse p-8" />
            }
          >
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

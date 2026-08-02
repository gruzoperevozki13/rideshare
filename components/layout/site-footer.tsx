import Link from "next/link";
import { Phone, Send } from "lucide-react";

const PHONE_DISPLAY = "+7 902 234-48-49";
const PHONE_TEL = "+79022344849";
const TELEGRAM = "RideShare13";

export function SiteFooter() {
  return (
    <footer className="relative z-[1] mt-auto border-t border-white/50 bg-white/55 backdrop-blur-xl">
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
              RideShare
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Попутчики и попутные грузы — проще договориться о дороге и доставке.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">
                Сотрудничество
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Есть идея партнёрства, рекламы или совместного проекта? Напишите —
                обсудим, как сделать сервис полезнее вместе.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">
                Нашли ошибку?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Заметили сбой или странное поведение — расскажите. Ваши сообщения
                помогают быстрее всё починить.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </span>
              {PHONE_DISPLAY}
            </a>
            <a
              href={`https://t.me/${TELEGRAM}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Send className="h-4 w-4" />
              </span>
              @{TELEGRAM}
            </a>
          </div>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            © {new Date().getFullYear()} RideShare
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/80 sm:text-left">
          Связь по телефону и в Telegram — для партнёров и сообщений об ошибках.{" "}
          <Link href="/safety" className="underline-offset-2 hover:underline">
            Безопасность и оплата
          </Link>
          {" · "}
          <Link href="/login" className="underline-offset-2 hover:underline">
            Вход в аккаунт
          </Link>
        </p>
      </div>
    </footer>
  );
}

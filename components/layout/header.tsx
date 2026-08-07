"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/50 bg-white/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-[4.25rem] max-w-4xl items-center justify-between gap-2 px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(198_85%_42%)] text-sm font-bold text-primary-foreground shadow-[0_10px_22px_-10px_rgba(11,107,203,0.8)] transition-transform duration-200 group-hover:scale-[1.04]">
            RS
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            RideShare
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1.5">
          {session?.user ? (
            <>
              <Link href="/board?kind=RIDES">
                <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                  Попутчики
                </Button>
              </Link>
              <Link href="/board?kind=CARGO">
                <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                  Груз
                </Button>
              </Link>
              <Link href="/safety">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-primary sm:inline-flex"
                >
                  Безопасность
                </Button>
              </Link>
              {session.user.isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-primary">
                    Админ
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Кабинет
                </Button>
              </Link>
              <Link href="/profile">
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 ring-offset-2 ring-offset-white/80 transition hover:ring-primary/40">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Выйти
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/board">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Объявления
                </Button>
              </Link>
              <Link href="/safety">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-primary sm:inline-flex"
                >
                  Безопасность
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm">
                  Регистрация
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Войти</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

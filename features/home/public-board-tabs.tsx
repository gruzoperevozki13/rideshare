"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, Loader2, Package, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type BoardKind = "RIDES" | "CARGO";

type BoardPost = {
  id: string;
  source?: "VK" | "TELEGRAM";
  kind: BoardKind;
  text: string;
  postUrl: string;
  postedAt: string;
  groupName: string;
  groupScreen: string;
  authorName: string | null;
};

function formatPostedAt(value: string) {
  const d = new Date(value);
  const date = formatDate(d);
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

export function PublicBoardTabs({
  initialKind = "RIDES",
}: {
  initialKind?: BoardKind;
}) {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [kind, setKind] = useState<BoardKind>(initialKind);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      kind,
      sync: "1",
    });
    if (debouncedQuery) params.set("q", debouncedQuery);

    fetch(`/api/board?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Не удалось загрузить объявления");
        return res.json() as Promise<{
          posts: BoardPost[];
          sync?: { error?: string };
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts ?? []);
        if (
          data.sync &&
          typeof data.sync === "object" &&
          "error" in data.sync &&
          data.sync.error
        ) {
          setError(String(data.sync.error));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
          setPosts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, debouncedQuery]);

  const loginForVk = useMemo(
    () => (postUrl: string) =>
      `/login?callbackUrl=${encodeURIComponent(`/board/open?to=${encodeURIComponent(postUrl)}`)}`,
    []
  );

  const loginHome = `/login?callbackUrl=${encodeURIComponent(`/board?kind=${kind}`)}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border/80 bg-white/50 p-1.5 backdrop-blur-sm">
        <Button
          variant={kind === "RIDES" ? "default" : "ghost"}
          className="gap-2"
          onClick={() => setKind("RIDES")}
        >
          <Users className="h-4 w-4" />
          Попутчики
        </Button>
        <Button
          variant={kind === "CARGO" ? "default" : "ghost"}
          className="gap-2"
          onClick={() => setKind("CARGO")}
        >
          <Package className="h-4 w-4" />
          Грузоперевозки
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            kind === "RIDES"
              ? "Поиск: Москва, Казань, попутчик…"
              : "Поиск: груз, газель, Самара…"
          }
          className="h-11 pl-10"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Объявления из открытых групп ВКонтакте.
        {!isAuthed &&
          " Чтобы открыть пост в VK или откликнуться — войдите или зарегистрируйтесь."}
      </p>

      {!isAuthed && (
        <div className="flex flex-wrap gap-2">
          <Link href={loginHome}>
            <Button size="sm">Войти</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" variant="outline">
              Регистрация
            </Button>
          </Link>
        </div>
      )}

      {loading && (
        <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем объявления…
        </p>
      )}

      {!loading && error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Синхронизация с VK: {error}. Показаны сохранённые объявления, если они есть.
        </p>
      )}

      {!loading && posts.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          {debouncedQuery
            ? "Ничего не найдено по этому запросу — попробуйте другие слова."
            : "Пока нет подходящих объявлений. Загляните чуть позже — доска обновляется автоматически."}
        </p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="animate-fade-up overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base font-medium">
                  {post.authorName || "Объявление"}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {formatPostedAt(post.postedAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {post.source === "TELEGRAM" ? "Telegram" : "VK"}: {post.groupName}
                {post.groupScreen ? ` (@${post.groupScreen.replace(/^-100/, "")})` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {post.text}
              </p>
              <div className="flex flex-wrap gap-2">
                {isAuthed ? (
                  <a
                    href={`/board/open?to=${encodeURIComponent(post.postUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      {post.source === "TELEGRAM" ? "Открыть в Telegram" : "Открыть в VK"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                ) : (
                  <Link href={loginForVk(post.postUrl)}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      {post.source === "TELEGRAM" ? "Открыть в Telegram" : "Открыть в VK"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
                {!isAuthed ? (
                  <Link href={loginHome}>
                    <Button size="sm">Откликнуться в RideShare</Button>
                  </Link>
                ) : (
                  <Link href="/">
                    <Button size="sm">К своим объявлениям</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

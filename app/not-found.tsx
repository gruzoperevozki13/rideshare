import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Страница не найдена</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Такой страницы нет или она была удалена.
      </p>
      <Link href="/">
        <Button>На главную</Button>
      </Link>
    </div>
  );
}

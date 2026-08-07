import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

function isSafeExternalUrl(target: string) {
  try {
    const u = new URL(target);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.replace(/^www\./, "");
    return (
      host === "vk.com" ||
      host === "vk.ru" ||
      host === "m.vk.com" ||
      host === "t.me" ||
      host === "telegram.me" ||
      host.endsWith(".t.me")
    );
  } catch {
    return false;
  }
}

/** Открыть пост VK/Telegram только для авторизованных */
export default async function BoardOpenPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const target = typeof to === "string" ? to.trim() : "";

  if (!isSafeExternalUrl(target)) {
    redirect("/board");
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/board/open?to=${encodeURIComponent(target)}`)}`
    );
  }

  redirect(target);
}

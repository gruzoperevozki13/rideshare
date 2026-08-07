import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** Открыть пост VK только для авторизованных */
export default async function BoardOpenPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const target = typeof to === "string" ? to.trim() : "";

  const safe =
    target.startsWith("https://vk.com/") ||
    target.startsWith("https://vk.ru/") ||
    target.startsWith("http://vk.com/") ||
    target.startsWith("http://vk.ru/");

  if (!safe) {
    redirect("/board");
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/board/open?to=${encodeURIComponent(target)}`)}`);
  }

  redirect(target);
}

import { NextResponse } from "next/server";

/** Старые ссылки из писем больше не используются — только код на сайте */
export async function GET() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent(
      "Подтверждение теперь кодом из письма. Войдите — мы отправим новый код."
    )}`
  );
}

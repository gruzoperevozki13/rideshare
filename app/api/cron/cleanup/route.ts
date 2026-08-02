import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredTripsAndWishes } from "@/services/cleanup.service";

function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Без секрета эндпоинт закрыт в проде; локально можно без CRON_SECRET
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query = request.nextUrl.searchParams.get("secret");
  return bearer === secret || query === secret;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await cleanupExpiredTripsAndWishes();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await cleanupExpiredTripsAndWishes();
  return NextResponse.json({ ok: true, ...result });
}

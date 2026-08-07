import { NextRequest, NextResponse } from "next/server";
import { syncAllBoards } from "@/services/vk-board.service";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
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
  try {
    const result = await syncAllBoards();
    // удобный плоский срез по VK для отладки в curl
    const vk =
      result && typeof result === "object" && "vk" in result
        ? (result as { vk: Record<string, unknown> }).vk
        : null;
    return NextResponse.json({
      ok: true,
      ...result,
      configuredGroups: vk?.configuredGroups ?? null,
      perGroup: vk?.perGroup ?? null,
      groupErrors: vk?.groupErrors ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

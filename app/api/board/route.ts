import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listBoardPosts,
  maybeSyncVkBoards,
} from "@/services/vk-board.service";

const querySchema = z.object({
  kind: z.enum(["RIDES", "CARGO"]).default("RIDES"),
  sync: z.enum(["0", "1"]).optional(),
  q: z.string().max(120).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    kind: request.nextUrl.searchParams.get("kind") ?? "RIDES",
    sync: request.nextUrl.searchParams.get("sync") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  let syncMeta: unknown = null;
  if (parsed.data.sync === "1") {
    try {
      syncMeta = await maybeSyncVkBoards(false);
    } catch (error) {
      syncMeta = {
        error: error instanceof Error ? error.message : "Ошибка синхронизации",
      };
    }
  } else {
    void import("@/services/cleanup.service").then((m) =>
      m.cleanupExpiredTripsAndWishes().catch(() => null)
    );
  }

  const posts = await listBoardPosts(
    parsed.data.kind,
    80,
    parsed.data.q?.trim() || undefined
  );
  return NextResponse.json({ posts, sync: syncMeta });
}

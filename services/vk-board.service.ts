import { prisma } from "@/lib/prisma";
import type { BoardKind } from "@prisma/client";
import { VK_BOARD_GROUPS } from "@/lib/vk-groups";
import {
  boardTextHash,
  isRelevantBoardPost,
  textSimilarity,
} from "@/lib/vk-filter";
import { resolveVkPostExpiresAt } from "@/lib/vk-expire";
import {
  cleanupExpiredTripsAndWishes,
  expiredBefore,
} from "@/services/cleanup.service";
import {
  buildVkPostUrl,
  extractPostText,
  fetchVkWall,
  resolveVkGroup,
  vkThrottle,
  type VkProfile,
} from "@/services/vk-api.service";

const STALE_MS = 20 * 60 * 1000;

export async function listBoardPosts(
  kind: BoardKind,
  limit = 60,
  query?: string
) {
  const threshold = expiredBefore();
  const posts = await prisma.vkBoardPost.findMany({
    where: {
      kind,
      isDuplicate: false,
      OR: [
        { expiresAt: { gt: threshold } },
        {
          expiresAt: null,
          postedAt: {
            gt: new Date(threshold.getTime() - 2 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
    orderBy: { postedAt: "desc" },
    take: Math.max(limit * 3, 120),
  });

  const tokens = (query ?? "")
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const filtered =
    tokens.length === 0
      ? posts
      : posts.filter((p) => {
          const hay = `${p.text} ${p.groupName} ${p.groupScreen} ${p.authorName ?? ""}`.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        });

  return filtered.slice(0, limit);
}

export async function getSyncState() {
  return prisma.vkSyncState.findUnique({ where: { id: "default" } });
}

export async function maybeSyncVkBoards(force = false) {
  await cleanupExpiredTripsAndWishes().catch(() => null);
  const state = await getSyncState();
  const last = state?.lastSyncAt?.getTime() ?? 0;
  if (!force && Date.now() - last < STALE_MS) {
    return { skipped: true as const, reason: "fresh" as const };
  }
  return syncVkBoards();
}

export async function syncVkBoards() {
  let fetched = 0;
  let kept = 0;
  let duplicates = 0;
  let skippedSpam = 0;

  try {
    if (!process.env.VK_SERVICE_TOKEN) {
      throw new Error("VK_SERVICE_TOKEN не задан");
    }

    await cleanupExpiredTripsAndWishes().catch(() => null);

    for (const group of VK_BOARD_GROUPS) {
      await vkThrottle();
      const meta = await resolveVkGroup(group.screenName);
      if (!meta) continue;

      await vkThrottle();
      const wall = await fetchVkWall(-meta.id, 40);
      const profileMap = new Map<number, VkProfile>(
        wall.profiles.map((p) => [p.id, p])
      );

      for (const post of wall.items) {
        fetched++;
        const text = extractPostText(post);
        const relevant = isRelevantBoardPost(text, group.kind, {
          markedAsAds: post.marked_as_ads === 1,
          postType: post.post_type,
        });
        if (!relevant) {
          skippedSpam++;
          continue;
        }

        const vkPostId = `${post.owner_id}_${post.id}`;
        const authorVkId = post.from_id && post.from_id > 0 ? post.from_id : null;
        const author = authorVkId ? profileMap.get(authorVkId) : undefined;
        const authorName = author
          ? `${author.first_name} ${author.last_name}`.trim()
          : null;
        const hash = boardTextHash(text);
        const postedAt = new Date(post.date * 1000);
        const expiresAt = resolveVkPostExpiresAt(text, postedAt);

        if (expiresAt < expiredBefore()) {
          skippedSpam++;
          continue;
        }

        const existing = await prisma.vkBoardPost.findUnique({
          where: { vkPostId },
        });
        if (existing) {
          if (!existing.expiresAt) {
            await prisma.vkBoardPost.update({
              where: { id: existing.id },
              data: { expiresAt },
            });
          }
          kept++;
          continue;
        }

        const isDup = await findDuplicate({
          kind: group.kind,
          text,
          textHash: hash,
          authorVkId,
          postedAt,
        });

        await prisma.vkBoardPost.create({
          data: {
            kind: group.kind,
            vkPostId,
            groupId: meta.id,
            groupScreen: meta.screen_name || group.screenName,
            groupName: meta.name,
            authorVkId,
            authorName,
            text,
            postUrl: buildVkPostUrl(post.owner_id, post.id),
            postedAt,
            expiresAt,
            textHash: hash,
            isDuplicate: isDup,
          },
        });

        if (isDup) duplicates++;
        else kept++;
      }
    }

    await prisma.vkSyncState.upsert({
      where: { id: "default" },
      create: { id: "default", lastSyncAt: new Date(), lastError: null },
      update: { lastSyncAt: new Date(), lastError: null },
    });

    return {
      skipped: false as const,
      fetched,
      kept,
      duplicates,
      skippedSpam,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка синхронизации VK";
    await prisma.vkSyncState.upsert({
      where: { id: "default" },
      create: { id: "default", lastError: message },
      update: { lastError: message },
    });
    throw error;
  }
}

async function findDuplicate(input: {
  kind: BoardKind;
  text: string;
  textHash: string;
  authorVkId: number | null;
  postedAt: Date;
}) {
  const sameHash = await prisma.vkBoardPost.findFirst({
    where: {
      kind: input.kind,
      textHash: input.textHash,
      isDuplicate: false,
    },
    select: { id: true },
  });
  if (sameHash) return true;

  if (input.authorVkId) {
    const from = new Date(input.postedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date(input.postedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.vkBoardPost.findMany({
      where: {
        kind: input.kind,
        authorVkId: input.authorVkId,
        isDuplicate: false,
        postedAt: { gte: from, lte: to },
      },
      select: { text: true },
      take: 30,
    });
    for (const c of candidates) {
      if (textSimilarity(input.text, c.text) >= 0.72) return true;
    }
  }

  return false;
}

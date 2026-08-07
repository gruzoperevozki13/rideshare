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
  fetchVkWallByDomain,
  vkThrottle,
  type VkProfile,
} from "@/services/vk-api.service";

const STALE_MS = 5 * 60 * 1000;
/** Prisma Int = INT4; VK/TG id иногда больше — в БД не пишем */
const INT4_MAX = 2147483647;

function fitAuthorId(id: number | null | undefined): number | null {
  if (id == null || !Number.isFinite(id) || id <= 0 || id > INT4_MAX) return null;
  return Math.trunc(id);
}

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

  if (!force) {
    const state = await getSyncState();
    const last = state?.lastSyncAt?.getTime() ?? 0;

    // Если в конфиге есть группы, с которых ещё ни разу не сохранили посты — синхронизируем сразу
    const configured = VK_BOARD_GROUPS.map((g) => g.screenName);
    const seen = await prisma.vkBoardPost.findMany({
      where: {
        OR: [
          { groupScreen: { in: configured } },
          // иногда VK отдаёт screen без club-префикса и наоборот
        ],
      },
      distinct: ["groupScreen"],
      select: { groupScreen: true },
      take: 100,
    });
    const seenSet = new Set(seen.map((s) => s.groupScreen));
    const hasUnsyncedGroup = configured.some((name) => !seenSet.has(name));

    if (!hasUnsyncedGroup && Date.now() - last < STALE_MS) {
      return { skipped: true as const, reason: "fresh" as const };
    }
  }

  return syncAllBoards();
}

export async function syncAllBoards() {
  const vk = await syncVkBoards().catch((error) => ({
    skipped: false as const,
    error: error instanceof Error ? error.message : "VK error",
    fetched: 0,
    kept: 0,
    duplicates: 0,
    skippedSpam: 0,
  }));

  const { syncTelegramBoards } = await import(
    "@/services/telegram-board.service"
  );
  const telegram = await syncTelegramBoards().catch((error) => ({
    skipped: false as const,
    error: error instanceof Error ? error.message : "Telegram error",
    fetched: 0,
    kept: 0,
    duplicates: 0,
    skippedSpam: 0,
  }));

  await prisma.vkSyncState.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      lastSyncAt: new Date(),
      lastError:
        ("error" in vk && vk.error) || ("error" in telegram && telegram.error)
          ? [ ("error" in vk && vk.error) || null, ("error" in telegram && telegram.error) || null]
              .filter(Boolean)
              .join(" | ")
          : null,
    },
    update: {
      lastSyncAt: new Date(),
      lastError:
        ("error" in vk && vk.error) || ("error" in telegram && telegram.error)
          ? [("error" in vk && vk.error) || null, ("error" in telegram && telegram.error) || null]
              .filter(Boolean)
              .join(" | ")
          : null,
    },
  });

  return { skipped: false as const, vk, telegram };
}

export async function syncVkBoards() {
  let fetched = 0;
  let kept = 0;
  let duplicates = 0;
  let skippedSpam = 0;

  try {
    if (!process.env.VK_SERVICE_TOKEN) {
      return {
        skipped: true as const,
        reason: "not_configured" as const,
        fetched: 0,
        kept: 0,
        duplicates: 0,
        skippedSpam: 0,
      };
    }

    await cleanupExpiredTripsAndWishes().catch(() => null);

    const groupErrors: string[] = [];
    const perGroup: {
      screen: string;
      fetched: number;
      kept: number;
      skipped: number;
      error?: string;
    }[] = [];

    for (const group of VK_BOARD_GROUPS) {
      await vkThrottle();
      let wall;
      let groupFetched = 0;
      let groupKept = 0;
      let groupSkipped = 0;
      try {
        wall = await fetchVkWallByDomain(group.screenName, 50);
      } catch (error) {
        // запасной путь: resolve id → wall.get по owner_id
        try {
          await vkThrottle();
          const { resolveVkGroup, fetchVkWall } = await import(
            "@/services/vk-api.service"
          );
          const metaOnly = await resolveVkGroup(group.screenName);
          if (!metaOnly) throw error;
          await vkThrottle();
          wall = await fetchVkWall(-metaOnly.id, 50);
          if (!wall.groups.length) {
            wall.groups = [metaOnly];
          }
        } catch (error2) {
          const msg =
            error2 instanceof Error
              ? error2.message
              : error instanceof Error
                ? error.message
                : "ошибка";
          groupErrors.push(`${group.screenName}: ${msg}`);
          perGroup.push({
            screen: group.screenName,
            fetched: 0,
            kept: 0,
            skipped: 0,
            error: msg,
          });
          continue;
        }
      }

      const meta = wall.groups[0];
      const groupId = meta
        ? String(meta.id)
        : wall.items[0]
          ? String(Math.abs(wall.items[0].owner_id))
          : group.screenName;
      const groupScreen = meta?.screen_name || group.screenName;
      const groupName = meta?.name || group.screenName;

      const profileMap = new Map<number, VkProfile>(
        wall.profiles.map((p) => [p.id, p])
      );

      for (const post of wall.items) {
        fetched++;
        groupFetched++;
        const text = extractPostText(post);
        const relevant = isRelevantBoardPost(text, group.kind, {
          markedAsAds: post.marked_as_ads === 1,
          postType: post.post_type,
        });
        if (!relevant) {
          skippedSpam++;
          groupSkipped++;
          continue;
        }

        const vkPostId = `${post.owner_id}_${post.id}`;
        const authorVkId = fitAuthorId(post.from_id);
        const author = authorVkId ? profileMap.get(authorVkId) : undefined;
        const authorName = author
          ? `${author.first_name} ${author.last_name}`.trim()
          : null;
        const hash = boardTextHash(text);
        const postedAt = new Date(post.date * 1000);
        const expiresAt = resolveVkPostExpiresAt(text, postedAt);

        if (expiresAt < expiredBefore()) {
          skippedSpam++;
          groupSkipped++;
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
          groupKept++;
          continue;
        }

        try {
          const isDup = await findDuplicate({
            kind: group.kind,
            text,
            textHash: hash,
            authorVkId,
            postedAt,
          });

          try {
            await prisma.vkBoardPost.create({
              data: {
                kind: group.kind,
                vkPostId,
                groupId,
                groupScreen,
                groupName,
                authorVkId,
                authorName,
                text,
                postUrl: buildVkPostUrl(post.owner_id, post.id),
                postedAt,
                expiresAt,
                textHash: hash,
                isDuplicate: isDup,
                source: "VK",
              },
            });
          } catch {
            // совместимость со старой схемой без source
            await prisma.vkBoardPost.create({
              data: {
                kind: group.kind,
                vkPostId,
                groupId,
                groupScreen,
                groupName,
                authorVkId,
                authorName,
                text,
                postUrl: buildVkPostUrl(post.owner_id, post.id),
                postedAt,
                expiresAt,
                textHash: hash,
                isDuplicate: isDup,
              } as never,
            });
          }

          if (isDup) duplicates++;
          else {
            kept++;
            groupKept++;
          }
        } catch (postErr) {
          const msg =
            postErr instanceof Error ? postErr.message : "post failed";
          groupErrors.push(`${group.screenName} ${vkPostId}: ${msg}`);
          groupSkipped++;
        }
      }

      perGroup.push({
        screen: group.screenName,
        fetched: groupFetched,
        kept: groupKept,
        skipped: groupSkipped,
      });
    }

    return {
      skipped: false as const,
      configuredGroups: VK_BOARD_GROUPS.map((g) => `${g.kind}:${g.screenName}`),
      fetched,
      kept,
      duplicates,
      skippedSpam,
      groupErrors,
      perGroup,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка синхронизации VK";
    throw new Error(message);
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

  const authorId = fitAuthorId(input.authorVkId);
  if (authorId) {
    const from = new Date(input.postedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date(input.postedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.vkBoardPost.findMany({
      where: {
        kind: input.kind,
        authorVkId: authorId,
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

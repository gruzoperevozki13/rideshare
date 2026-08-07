import { prisma } from "@/lib/prisma";
import type { BoardKind } from "@prisma/client";
import { TELEGRAM_BOARD_CHATS } from "@/lib/telegram-groups";
import {
  boardTextHash,
  isRelevantBoardPost,
  textSimilarity,
} from "@/lib/vk-filter";
import { resolveVkPostExpiresAt } from "@/lib/vk-expire";
import { expiredBefore } from "@/services/cleanup.service";
import {
  disconnectTelegram,
  fetchTelegramChatMessages,
  isTelegramConfigured,
} from "@/services/telegram-api.service";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

export async function syncTelegramBoards() {
  if (!isTelegramConfigured()) {
    return {
      skipped: true as const,
      reason: "not_configured" as const,
      fetched: 0,
      kept: 0,
      duplicates: 0,
      skippedSpam: 0,
    };
  }

  if (TELEGRAM_BOARD_CHATS.length === 0) {
    return {
      skipped: true as const,
      reason: "no_chats" as const,
      fetched: 0,
      kept: 0,
      duplicates: 0,
      skippedSpam: 0,
    };
  }

  let fetched = 0;
  let kept = 0;
  let duplicates = 0;
  let skippedSpam = 0;

  try {
    for (const chat of TELEGRAM_BOARD_CHATS) {
      await sleep(400);
      const messages = await fetchTelegramChatMessages(chat.chat, 40);

      for (const msg of messages) {
        fetched++;
        const relevant = isRelevantBoardPost(msg.text, chat.kind);
        if (!relevant) {
          skippedSpam++;
          continue;
        }

        const externalId = `tg:${msg.chatId}:${msg.id}`;
        const hash = boardTextHash(msg.text);
        const expiresAt = resolveVkPostExpiresAt(msg.text, msg.date);

        if (expiresAt < expiredBefore()) {
          skippedSpam++;
          continue;
        }

        const existing = await prisma.vkBoardPost.findUnique({
          where: { vkPostId: externalId },
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

        const authorVkId =
          msg.authorId != null &&
          Number.isFinite(msg.authorId) &&
          msg.authorId <= 2147483647
            ? msg.authorId
            : null;

        const isDup = await findDuplicate({
          kind: chat.kind,
          text: msg.text,
          textHash: hash,
          authorVkId,
          postedAt: msg.date,
        });

        await prisma.vkBoardPost.create({
          data: {
            source: "TELEGRAM",
            kind: chat.kind,
            vkPostId: externalId,
            groupId: msg.chatId,
            groupScreen: msg.chatUsername || msg.chatId,
            groupName: msg.chatTitle,
            authorVkId,
            authorName: msg.authorName,
            text: msg.text,
            postUrl: msg.postUrl,
            postedAt: msg.date,
            expiresAt,
            textHash: hash,
            isDuplicate: isDup,
          },
        });

        if (isDup) duplicates++;
        else kept++;
      }
    }

    return {
      skipped: false as const,
      fetched,
      kept,
      duplicates,
      skippedSpam,
    };
  } finally {
    await disconnectTelegram().catch(() => null);
  }
}

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

let clientPromise: Promise<TelegramClient> | null = null;

export function isTelegramConfigured() {
  return Boolean(
    process.env.TELEGRAM_API_ID &&
      process.env.TELEGRAM_API_HASH &&
      process.env.TELEGRAM_SESSION
  );
}

export async function getTelegramClient(): Promise<TelegramClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const apiId = Number(process.env.TELEGRAM_API_ID);
      const apiHash = process.env.TELEGRAM_API_HASH || "";
      const session = process.env.TELEGRAM_SESSION || "";
      if (!apiId || !apiHash || !session) {
        throw new Error(
          "Telegram не настроен: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION"
        );
      }
      const client = new TelegramClient(
        new StringSession(session),
        apiId,
        apiHash,
        { connectionRetries: 5 }
      );
      await client.connect();
      if (!(await client.checkAuthorization())) {
        throw new Error(
          "Сессия Telegram недействительна — заново выполните npm run tg:login"
        );
      }
      return client;
    })();
  }
  return clientPromise;
}

export type TgMessageRow = {
  id: number;
  chatId: string;
  chatUsername: string | null;
  chatTitle: string;
  text: string;
  date: Date;
  authorId: number | null;
  authorName: string | null;
  postUrl: string;
};

function buildTelegramPostUrl(
  chatId: string,
  messageId: number,
  username: string | null
): string {
  if (username) {
    return `https://t.me/${username}/${messageId}`;
  }
  const raw = chatId.replace(/^-100/, "").replace(/^-/, "");
  return `https://t.me/c/${raw}/${messageId}`;
}

export async function fetchTelegramChatMessages(
  chatRef: string,
  limit = 40
): Promise<TgMessageRow[]> {
  const client = await getTelegramClient();
  const entity = await client.getEntity(chatRef);
  const entityAny = entity as {
    id?: { toString(): string } | number | bigint;
    username?: string;
    title?: string;
    className?: string;
  };

  const idStr = entityAny.id != null ? String(entityAny.id) : chatRef;
  const isChannel =
    entityAny.className === "Channel" ||
    Boolean(entityAny.username) ||
    chatRef.startsWith("-100");
  const chatId = isChannel && !idStr.startsWith("-")
    ? `-100${idStr}`
    : idStr.startsWith("-")
      ? idStr
      : `-${idStr}`;
  const chatUsername = entityAny.username ?? null;
  const chatTitle = entityAny.title || chatRef;

  const messages = await client.getMessages(entity, { limit });
  const rows: TgMessageRow[] = [];

  for (const msg of messages) {
    if (!msg?.id) continue;
    const text = String(msg.message || "").trim();
    if (!text) continue;

    let authorId: number | null = null;
    let authorName: string | null = null;
    try {
      const sender = await msg.getSender();
      const s = sender as {
        id?: { toString(): string } | number;
        firstName?: string;
        lastName?: string;
        title?: string;
      } | null;
      if (s) {
        if (s.firstName) {
          const n = Number(s.id);
          authorId = Number.isFinite(n) && n <= 2147483647 ? n : null;
          authorName = `${s.firstName}${s.lastName ? ` ${s.lastName}` : ""}`.trim();
        } else if (s.title) {
          authorName = s.title;
        }
      }
    } catch {
      // ignore
    }

    const idNum = Number(msg.id);
    const resolvedChatId = chatId || String(msg.chatId ?? chatRef);
    rows.push({
      id: idNum,
      chatId: resolvedChatId,
      chatUsername,
      chatTitle,
      text,
      date: new Date((msg.date || 0) * 1000),
      authorId,
      authorName,
      postUrl: buildTelegramPostUrl(resolvedChatId, idNum, chatUsername),
    });
  }

  return rows;
}

export async function disconnectTelegram() {
  if (!clientPromise) return;
  try {
    const client = await clientPromise;
    await client.disconnect();
  } catch {
    // ignore
  }
  clientPromise = null;
}

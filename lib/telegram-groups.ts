import type { BoardKind } from "@prisma/client";

export type TelegramChatConfig = {
  /** @username без @ или числовой id чата (-100...) */
  chat: string;
  kind: BoardKind;
};

function parseEnvChats(envValue: string | undefined, kind: BoardKind): TelegramChatConfig[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(/[,;\s]+/)
    .map((s) => s.trim().replace(/^@/, ""))
    .filter(Boolean)
    .map((chat) => ({ chat, kind }));
}

/**
 * Чаты второго аккаунта.
 * Можно задать в .env:
 * TELEGRAM_RIDES_CHATS=poputchiki_chat, -100123
 * TELEGRAM_CARGO_CHATS=gruz_chat
 * Плюс список ниже — скидывай мне username/ссылки.
 */
export const TELEGRAM_BOARD_CHATS: TelegramChatConfig[] = [
  ...parseEnvChats(process.env.TELEGRAM_RIDES_CHATS, "RIDES"),
  ...parseEnvChats(process.env.TELEGRAM_CARGO_CHATS, "CARGO"),
];

import type { BoardKind } from "@prisma/client";
import { createHash } from "crypto";

const SPAM_RE =
  /казино|ставк[аи]|букмекер|крипт|биткоин|займ|кредит без|микрозайм|ваканси|зарплат[аы] от|удал[её]нн|подпишись|розыгрыш|бесплатн[аяоы].{0,20}подписк|только сегодня|жми сюда|телеграм.?канал.*(реклам|заработ)|интим|эскорт|18\+|секс/i;

const ROUTE_RE =
  /(?:из|от)\s+[\wа-яё\-.\s]{2,40}\s+(?:в|до|на)\s+[\wа-яё\-.\s]{2,40}|[→\-–—]+|\b\w{3,}\s*[→\-–—]\s*\w{3,}/i;

const RIDES_KW =
  /попутчик|ищу\s+(?:вод|мест|попут)|еду\s+(?:из|в|до)|отвезу|подвезу|есть\s+мест|свободн\w*\s+мест|за\s+\d+\s*(?:р|руб)|руб(?:лей|\.?)\b|км\/ч|водитель|пассажир/i;

const CARGO_KW =
  /груз|перевоз|доставк|газел|фура|газель|тонн|кг\b|попутный\s+груз|ищу\s+(?:машин|перевоз|водител)|везу\s+груз|отправл\w*\s+груз|забер\w*\s+груз|объем|м³|м3/i;

export function normalizeBoardText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[.*?\|.*?\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

export function boardTextHash(text: string): string {
  const normalized = normalizeBoardText(text);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/** Насколько два нормализованных текста похожи (0..1) по общим словам */
export function textSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeBoardText(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalizeBoardText(b).split(" ").filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.max(wa.size, wb.size);
}

export function isRelevantBoardPost(
  text: string,
  kind: BoardKind,
  opts?: { markedAsAds?: boolean; postType?: string }
): boolean {
  if (opts?.markedAsAds) return false;
  if (opts?.postType === "copy" && !text.trim()) return false;

  const raw = (text || "").trim();
  if (raw.length < 25) return false;
  if (SPAM_RE.test(raw)) return false;

  const hasRoute = ROUTE_RE.test(raw);
  if (kind === "RIDES") {
    return hasRoute || RIDES_KW.test(raw);
  }
  return hasRoute || CARGO_KW.test(raw);
}

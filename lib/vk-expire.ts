/** Парсинг даты поездки/передачи из текста VK-объявления (Europe/Moscow). */

const MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
  янв: 0,
  фев: 1,
  мар: 2,
  апр: 3,
  май: 4,
  июн: 5,
  июл: 6,
  авг: 7,
  сен: 8,
  окт: 9,
  ноя: 10,
  дек: 11,
};

function moscowParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { y: get("year"), m: get("month"), day: get("day") };
}

function endOfMoscowDay(y: number, monthIndex: number, day: number): Date {
  const mo = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  // конец дня МСК + 1 час «запас», как у внутренних объявлений
  return new Date(`${y}-${mo}-${dd}T23:59:00+03:00`);
}

/**
 * Ищет дату в тексте. Если не нашли — срок = конец дня публикации + 1 сутки.
 */
export function resolveVkPostExpiresAt(text: string, postedAt: Date): Date {
  const parsed = parseDateFromAdText(text, postedAt);
  if (parsed) return parsed;

  const { y, m, day } = moscowParts(postedAt);
  const endPostDay = endOfMoscowDay(y, m - 1, day);
  return new Date(endPostDay.getTime() + 24 * 60 * 60 * 1000);
}

export function parseDateFromAdText(text: string, postedAt: Date): Date | null {
  const raw = text.toLowerCase().replace(/\s+/g, " ");
  const { y: py, m: pm, day: pd } = moscowParts(postedAt);

  if (/\bсегодня\b/.test(raw)) {
    return endOfMoscowDay(py, pm - 1, pd);
  }
  if (/\bзавтра\b/.test(raw)) {
    const t = new Date(`${py}-${String(pm).padStart(2, "0")}-${String(pd).padStart(2, "0")}T12:00:00+03:00`);
    t.setTime(t.getTime() + 24 * 60 * 60 * 1000);
    const n = moscowParts(t);
    return endOfMoscowDay(n.y, n.m - 1, n.day);
  }

  const numeric = raw.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    let year = numeric[3] ? Number(numeric[3]) : py;
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      // если дата без года уже прошла относительно поста — следующий год
      let expires = endOfMoscowDay(year, month, day);
      if (!numeric[3] && expires.getTime() < postedAt.getTime() - 12 * 60 * 60 * 1000) {
        expires = endOfMoscowDay(year + 1, month, day);
      }
      return expires;
    }
  }

  const monthName = raw.match(
    /\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)\.?(?:\s+(\d{4}))?\b/
  );
  if (monthName) {
    const day = Number(monthName[1]);
    const month = MONTHS[monthName[2]];
    let year = monthName[3] ? Number(monthName[3]) : py;
    if (month == null || day < 1 || day > 31) return null;
    let expires = endOfMoscowDay(year, month, day);
    if (!monthName[3] && expires.getTime() < postedAt.getTime() - 12 * 60 * 60 * 1000) {
      expires = endOfMoscowDay(year + 1, month, day);
    }
    return expires;
  }

  return null;
}

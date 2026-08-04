import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Минуты → «45 мин» / «2 ч» / «2 ч 15 мин» */
export function formatDurationMin(totalMin: number | null | undefined): string {
  if (totalMin == null || !Number.isFinite(totalMin) || totalMin <= 0) {
    return "";
  }
  const mins = Math.round(totalMin);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function getAvailableSeats(seats: number, bookedCount: number): number {
  return Math.max(0, seats - bookedCount);
}

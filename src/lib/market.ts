import type { RankedTicker } from "./types";

export function getEasternDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getMarketStatus(date = new Date()): "open" | "closed" {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const minutes = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") return "closed";
  return minutes >= 9 * 60 + 30 && minutes <= 16 * 60 ? "open" : "closed";
}

export function rankMovements(tickers: RankedTicker[]) {
  const sorted = [...tickers].sort(
    (a, b) => b.quote.percentChange - a.quote.percentChange,
  );

  return {
    gainers: sorted.slice(0, 5),
    losers: sorted.slice(-5).reverse(),
  };
}

export function ageFromUnix(timestamp: number) {
  const diffMs = Date.now() - timestamp * 1000;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

import type {
  InsiderTransaction,
  PoliticianTrade,
  Quote,
  TradingSignal,
} from "./types";

export function calculateRangePosition(quote: Quote) {
  const range = quote.high - quote.low;
  if (range <= 0) return 50;

  return Math.min(100, Math.max(0, ((quote.current - quote.low) / range) * 100));
}

export function calculateInsiderNetShares(transactions: InsiderTransaction[]) {
  return transactions.reduce((total, transaction) => total + transaction.change, 0);
}

export function calculatePoliticianNetTrades(trades: PoliticianTrade[]) {
  return trades.reduce((total, trade) => {
    if (trade.transaction === "purchase") return total + 1;
    if (trade.transaction === "sale") return total - 1;
    return total;
  }, 0);
}

export function createTradingSignal({
  quote,
  newsCount,
  insiderTransactions,
  politicianTrades,
}: {
  quote: Quote;
  newsCount: number;
  insiderTransactions: InsiderTransaction[];
  politicianTrades: PoliticianTrade[];
}): TradingSignal {
  const rangePosition = calculateRangePosition(quote);
  const insiderNetShares = calculateInsiderNetShares(insiderTransactions);
  const politicianNetTrades = calculatePoliticianNetTrades(politicianTrades);
  const tags: string[] = [];

  if (quote.percentChange >= 3) tags.push("Momentum surge");
  if (quote.percentChange <= -3) tags.push("Sharp pullback");
  if (rangePosition >= 75) tags.push("Near day high");
  if (rangePosition <= 25) tags.push("Near day low");
  if (newsCount >= 3) tags.push("News heavy");
  if (insiderNetShares > 0) tags.push("Insider buying");
  if (insiderNetShares < 0) tags.push("Insider selling");
  if (politicianNetTrades > 0) tags.push("Congress buys");
  if (politicianNetTrades < 0) tags.push("Congress sells");

  const momentumScore = Math.min(35, Math.abs(quote.percentChange) * 6);
  const rangeScore = Math.abs(rangePosition - 50) / 2;
  const newsScore = Math.min(14, newsCount * 3.5);
  const insiderScore = Math.min(12, Math.abs(insiderNetShares) > 0 ? 8 : 0);
  const politicianScore = Math.min(12, Math.abs(politicianNetTrades) * 6);
  const score = Math.round(
    Math.min(100, momentumScore + rangeScore + newsScore + insiderScore + politicianScore),
  );

  const risk =
    Math.abs(quote.percentChange) >= 5 || score >= 72
      ? "high"
      : Math.abs(quote.percentChange) >= 2.5 || score >= 46
        ? "medium"
        : "low";

  return {
    score,
    risk,
    rangePosition,
    insiderNetShares,
    politicianNetTrades,
    tags: tags.slice(0, 4),
  };
}

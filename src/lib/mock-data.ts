import { SECTORS } from "./tickers";
import type { DashboardPayload, NewsItem, Quote, RankedTicker } from "./types";
import { getEasternDateKey, getMarketStatus, rankMovements } from "./market";

function mockQuote(symbol: string, index: number): Quote {
  const seed = symbol.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const current = 30 + ((seed * 17) % 700) + index * 1.73;
  const percentChange = Number((((seed % 17) - 8 + index * 0.35) / 2).toFixed(2));
  const change = Number(((current * percentChange) / 100).toFixed(2));

  return {
    current: Number(current.toFixed(2)),
    change,
    percentChange,
    high: Number((current * 1.018).toFixed(2)),
    low: Number((current * 0.982).toFixed(2)),
    open: Number((current - change * 0.6).toFixed(2)),
    previousClose: Number((current - change).toFixed(2)),
    timestamp: Math.floor(Date.now() / 1000),
  };
}

function mockNews(symbol: string, company: string, index: number): NewsItem[] {
  return [
    {
      id: `${symbol}-mock-${index}`,
      symbol,
      headline: `${company} moves on fresh sector momentum and investor positioning`,
      source: "Demo Wire",
      url: "#",
      summary: "Placeholder headline used until FINNHUB_API_KEY is configured.",
      datetime: Math.floor(Date.now() / 1000) - index * 1800,
    },
  ];
}

export function createMockDashboard(error?: string): DashboardPayload {
  const sectors = Object.fromEntries(
    SECTORS.map((sector) => {
      const ranked = sector.tickers
        .map((ticker, index) => {
          const quote = mockQuote(ticker.symbol, index);
          const news = mockNews(ticker.symbol, ticker.company, index);
          return {
            rank: index + 1,
            symbol: ticker.symbol,
            company: ticker.company,
            sector: ticker.sector,
            quote,
            news,
            newsCount: news.length,
            score: Math.abs(quote.percentChange) * 2 + news.length * 0.75,
          } satisfies RankedTicker;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((ticker, index) => ({ ...ticker, rank: index + 1 }));

      return [sector.id, ranked];
    }),
  ) as DashboardPayload["sectors"];

  const selected = Object.values(sectors).flat();
  const news = selected.flatMap((ticker) => ticker.news);

  return {
    ok: !error,
    generatedAt: new Date().toISOString(),
    selectionDate: getEasternDateKey(),
    marketStatus: getMarketStatus(),
    sectors,
    movements: rankMovements(selected),
    news,
    error,
  };
}

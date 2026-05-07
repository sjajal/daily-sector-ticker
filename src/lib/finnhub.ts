import { SECTORS, type SectorId, type TickerCandidate } from "./tickers";
import type {
  DashboardPayload,
  InsiderTransaction,
  NewsItem,
  PoliticianTrade,
  Quote,
  RankedTicker,
} from "./types";
import { createMockDashboard } from "./mock-data";
import { getEasternDateKey, getMarketStatus, rankMovements } from "./market";
import { createTradingSignal } from "./signals";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const QUIVER_BASE_URL = "https://api.quiverquant.com/beta";

let dailySelectionCache:
  | {
      date: string;
      sectors: Record<SectorId, TickerCandidate[]>;
    }
  | undefined;
let lastGoodDashboard: DashboardPayload | undefined;

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubNewsItem = {
  id?: number;
  datetime?: number;
  headline?: string;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
};

type FinnhubInsiderTransaction = {
  name?: string;
  share?: number;
  change?: number;
  transactionPrice?: number;
  transactionCode?: string;
  filingDate?: string;
  transactionDate?: string;
};

type FinnhubInsiderResponse = {
  symbol?: string;
  data?: FinnhubInsiderTransaction[];
};

type QuiverCongressTrade = {
  Ticker?: string;
  Symbol?: string;
  Representative?: string;
  Senator?: string;
  Name?: string;
  Chamber?: string;
  Party?: string;
  Transaction?: string;
  TransactionType?: string;
  Amount?: string;
  Range?: string;
  ReportDate?: string;
  DisclosureDate?: string;
  TransactionDate?: string;
};

function getFinnhubToken() {
  return process.env.FINNHUB_API_KEY?.trim();
}

function getQuiverToken() {
  return process.env.QUIVER_API_KEY?.trim();
}

async function finnhubFetch<T>(
  path: string,
  params: Record<string, string>,
  init?: RequestInit,
) {
  const token = getFinnhubToken();
  if (!token) {
    throw new Error("Missing FINNHUB_API_KEY");
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("token", token);

  const response = await fetch(url, {
    ...init,
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Finnhub request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchQuote(symbol: string): Promise<Quote> {
  const data = await finnhubFetch<FinnhubQuote>("/quote", { symbol });

  return {
    current: data.c ?? 0,
    change: data.d ?? 0,
    percentChange: data.dp ?? 0,
    high: data.h ?? 0,
    low: data.l ?? 0,
    open: data.o ?? 0,
    previousClose: data.pc ?? 0,
    timestamp: data.t ?? null,
  };
}

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 3);

  const data = await finnhubFetch<FinnhubNewsItem[]>("/company-news", {
    symbol,
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  });

  return data
    .filter((item) => item.headline && item.url)
    .slice(0, 4)
    .map((item, index) => ({
      id: String(item.id ?? `${symbol}-${item.datetime ?? Date.now()}-${index}`),
      symbol,
      headline: item.headline ?? "Untitled headline",
      source: item.source ?? "Finnhub",
      url: item.url ?? "#",
      summary: item.summary ?? "",
      datetime: item.datetime ?? Math.floor(Date.now() / 1000),
    }));
}

async function fetchInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 120);

  const data = await finnhubFetch<FinnhubInsiderResponse>("/stock/insider-transactions", {
    symbol,
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  });

  return (data.data ?? []).slice(0, 5).map((item, index) => ({
    id: `${symbol}-insider-${item.filingDate ?? "unknown"}-${index}`,
    symbol,
    name: item.name ?? "Unknown insider",
    share: item.share ?? 0,
    change: item.change ?? 0,
    transactionPrice: item.transactionPrice ?? 0,
    transactionCode: item.transactionCode ?? "N/A",
    filingDate: item.filingDate ?? "N/A",
    transactionDate: item.transactionDate ?? "N/A",
  }));
}

function normalizeCongressTrade(symbol: string, trade: QuiverCongressTrade, index: number) {
  const rawTransaction = (trade.Transaction ?? trade.TransactionType ?? "").toLowerCase();
  const transaction = rawTransaction.includes("purchase")
    ? "purchase"
    : rawTransaction.includes("sale")
      ? "sale"
      : "unknown";

  return {
    id: `${symbol}-congress-${trade.ReportDate ?? trade.DisclosureDate ?? "unknown"}-${index}`,
    symbol,
    politician: trade.Representative ?? trade.Senator ?? trade.Name ?? "Unknown politician",
    chamber: trade.Chamber ?? "Congress",
    party: trade.Party ?? "N/A",
    transaction,
    amount: trade.Amount ?? trade.Range ?? "Undisclosed",
    reportDate: trade.ReportDate ?? trade.DisclosureDate ?? "N/A",
    transactionDate: trade.TransactionDate ?? "N/A",
  } satisfies PoliticianTrade;
}

async function fetchPoliticianTrades(symbol: string): Promise<PoliticianTrade[]> {
  const token = getQuiverToken();
  if (!token) return [];

  const url = new URL(`${QUIVER_BASE_URL}/live/congresstrading`);
  url.searchParams.set("ticker", symbol);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as QuiverCongressTrade[] | { data?: QuiverCongressTrade[] };
  const rows = Array.isArray(payload) ? payload : (payload.data ?? []);

  return rows
    .filter((trade) => (trade.Ticker ?? trade.Symbol ?? symbol).toUpperCase() === symbol)
    .slice(0, 5)
    .map((trade, index) => normalizeCongressTrade(symbol, trade, index));
}

function scoreTicker(quote: Quote, newsCount: number) {
  const movementScore = Math.abs(quote.percentChange) * 2;
  const directionBonus = quote.percentChange > 0 ? 1.25 : 0;
  const range =
    quote.high && quote.low && quote.current
      ? Math.min(5, ((quote.high - quote.low) / quote.current) * 100)
      : 0;

  return movementScore + directionBonus + range + newsCount * 0.8;
}

async function rankTicker(candidate: TickerCandidate): Promise<RankedTicker> {
  const [quote, news, insiderTransactions, politicianTrades] = await Promise.all([
    fetchQuote(candidate.symbol),
    fetchNews(candidate.symbol).catch(() => []),
    fetchInsiderTransactions(candidate.symbol).catch(() => []),
    fetchPoliticianTrades(candidate.symbol).catch(() => []),
  ]);
  const signal = createTradingSignal({
    quote,
    newsCount: news.length,
    insiderTransactions,
    politicianTrades,
  });

  return {
    rank: 0,
    symbol: candidate.symbol,
    company: candidate.company,
    sector: candidate.sector,
    quote,
    news,
    newsCount: news.length,
    insiderTransactions,
    politicianTrades,
    signal,
    score: scoreTicker(quote, news.length),
  };
}

async function selectDailyTickers(selectionDate: string) {
  if (dailySelectionCache?.date === selectionDate) {
    return dailySelectionCache.sectors;
  }

  const sectorEntries = await Promise.all(
    SECTORS.map(async (sector) => {
      const ranked = await Promise.all(sector.tickers.map(rankTicker));
      const selected = ranked
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((ticker) => ({
          symbol: ticker.symbol,
          company: ticker.company,
          sector: ticker.sector,
        }));

      return [sector.id, selected] as const;
    }),
  );

  dailySelectionCache = {
    date: selectionDate,
    sectors: Object.fromEntries(sectorEntries) as Record<SectorId, TickerCandidate[]>,
  };

  return dailySelectionCache.sectors;
}

export async function getDashboardData(): Promise<DashboardPayload> {
  if (!getFinnhubToken()) {
    return createMockDashboard("Missing FINNHUB_API_KEY. Showing demo data.");
  }

  try {
    const selectionDate = getEasternDateKey();
    const dailySelection = await selectDailyTickers(selectionDate);
    const sectorEntries = await Promise.all(
      SECTORS.map(async (sector) => {
        const selectedCandidates = dailySelection[sector.id] ?? sector.tickers.slice(0, 5);
        const ranked = await Promise.all(selectedCandidates.map(rankTicker));
        const topFive = ranked.map((ticker, index) => ({ ...ticker, rank: index + 1 }));

        return [sector.id, topFive] as const;
      }),
    );

    const sectors = Object.fromEntries(sectorEntries) as DashboardPayload["sectors"];
    const selected = Object.values(sectors).flat();
    const news = selected
      .flatMap((ticker) => ticker.news)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 30);

    const dashboard = {
      ok: true,
      generatedAt: new Date().toISOString(),
      selectionDate,
      marketStatus: getMarketStatus(),
      sectors,
      movements: rankMovements(selected),
      news,
    };

    lastGoodDashboard = dashboard;

    return dashboard;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Finnhub error";

    if (lastGoodDashboard) {
      return {
        ...lastGoodDashboard,
        ok: false,
        generatedAt: new Date().toISOString(),
        error: `${message}. Showing last successful market snapshot.`,
      };
    }

    return createMockDashboard(`${message}. Showing demo data.`);
  }
}

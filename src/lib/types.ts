import type { SectorId } from "./tickers";

export type Quote = {
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number | null;
};

export type NewsItem = {
  id: string;
  symbol: string;
  headline: string;
  source: string;
  url: string;
  summary: string;
  datetime: number;
};

export type RankedTicker = {
  rank: number;
  symbol: string;
  company: string;
  sector: SectorId;
  quote: Quote;
  news: NewsItem[];
  newsCount: number;
  score: number;
};

export type DashboardPayload = {
  ok: boolean;
  generatedAt: string;
  selectionDate: string;
  marketStatus: "open" | "closed";
  sectors: Record<SectorId, RankedTicker[]>;
  movements: {
    gainers: RankedTicker[];
    losers: RankedTicker[];
  };
  news: NewsItem[];
  error?: string;
};

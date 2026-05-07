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

export type InsiderTransaction = {
  id: string;
  symbol: string;
  name: string;
  share: number;
  change: number;
  transactionPrice: number;
  transactionCode: string;
  filingDate: string;
  transactionDate: string;
};

export type PoliticianTrade = {
  id: string;
  symbol: string;
  politician: string;
  chamber: string;
  party: string;
  transaction: "purchase" | "sale" | "unknown";
  amount: string;
  reportDate: string;
  transactionDate: string;
};

export type TradingSignal = {
  score: number;
  risk: "low" | "medium" | "high";
  rangePosition: number;
  insiderNetShares: number;
  politicianNetTrades: number;
  tags: string[];
};

export type RankedTicker = {
  rank: number;
  symbol: string;
  company: string;
  sector: SectorId;
  quote: Quote;
  news: NewsItem[];
  newsCount: number;
  insiderTransactions: InsiderTransaction[];
  politicianTrades: PoliticianTrade[];
  signal: TradingSignal;
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

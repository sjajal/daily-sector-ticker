export type SectorId = "ai" | "energy" | "space";

export type SectorDefinition = {
  id: SectorId;
  label: string;
  accent: string;
  tickers: TickerCandidate[];
};

export type TickerCandidate = {
  symbol: string;
  company: string;
  sector: SectorId;
};

export const SECTORS: SectorDefinition[] = [
  {
    id: "ai",
    label: "AI",
    accent: "#38bdf8",
    tickers: [
      { symbol: "NVDA", company: "NVIDIA", sector: "ai" },
      { symbol: "AMD", company: "Advanced Micro Devices", sector: "ai" },
      { symbol: "MSFT", company: "Microsoft", sector: "ai" },
      { symbol: "GOOGL", company: "Alphabet", sector: "ai" },
      { symbol: "PLTR", company: "Palantir", sector: "ai" },
      { symbol: "SMCI", company: "Super Micro Computer", sector: "ai" },
      { symbol: "AVGO", company: "Broadcom", sector: "ai" },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    accent: "#fbbf24",
    tickers: [
      { symbol: "XOM", company: "Exxon Mobil", sector: "energy" },
      { symbol: "CVX", company: "Chevron", sector: "energy" },
      { symbol: "COP", company: "ConocoPhillips", sector: "energy" },
      { symbol: "SLB", company: "SLB", sector: "energy" },
      { symbol: "NEE", company: "NextEra Energy", sector: "energy" },
      { symbol: "ENPH", company: "Enphase Energy", sector: "energy" },
      { symbol: "FSLR", company: "First Solar", sector: "energy" },
    ],
  },
  {
    id: "space",
    label: "Space",
    accent: "#a78bfa",
    tickers: [
      { symbol: "RKLB", company: "Rocket Lab", sector: "space" },
      { symbol: "LUNR", company: "Intuitive Machines", sector: "space" },
      { symbol: "ASTS", company: "AST SpaceMobile", sector: "space" },
      { symbol: "PL", company: "Planet Labs", sector: "space" },
      { symbol: "SPCE", company: "Virgin Galactic", sector: "space" },
      { symbol: "BA", company: "Boeing", sector: "space" },
      { symbol: "LMT", company: "Lockheed Martin", sector: "space" },
    ],
  },
];

export const ALL_TICKERS = SECTORS.flatMap((sector) => sector.tickers);

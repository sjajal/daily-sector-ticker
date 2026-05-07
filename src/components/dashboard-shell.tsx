"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DashboardPayload, NewsItem, RankedTicker } from "@/lib/types";
import { SECTORS, type SectorId } from "@/lib/tickers";
import { ageFromUnix } from "@/lib/market";

type DashboardShellProps = {
  initialData: DashboardPayload;
};

type SectorSummary = {
  id: SectorId;
  label: string;
  accent: string;
  tickers: RankedTicker[];
  averageMove: number;
  leader?: RankedTicker;
  newsCount: number;
};

type TradingMode = "momentum" | "news" | "insider" | "risk";

type WatchlistDraft = Record<SectorId, string>;

const WATCHLIST_STORAGE_KEY = "daily-sector-ticker-watchlist";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function formatQuoteTime(timestamp: number | null) {
  if (!timestamp) return "No timestamp";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function pct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function signedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function changeClass(value: number) {
  return value >= 0 ? "positive" : "negative";
}

function activityLabel(value: number, positiveLabel: string, negativeLabel: string) {
  if (value > 0) return positiveLabel;
  if (value < 0) return negativeLabel;
  return "Quiet";
}

function compactHeadline(news?: NewsItem) {
  if (!news) return "No fresh headlines";
  return news.headline.length > 82 ? `${news.headline.slice(0, 79)}...` : news.headline;
}

function RangeMeter({ ticker }: { ticker: RankedTicker }) {
  const { current, high, low } = ticker.quote;
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="range-meter" aria-label={`${ticker.symbol} day range`}>
      <div className="range-track">
        <span style={{ left: `${Math.min(100, Math.max(0, position))}%` }} />
      </div>
      <div className="range-labels">
        <span>{currency.format(low)}</span>
        <span>{currency.format(high)}</span>
      </div>
    </div>
  );
}

function BriefTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="brief-tile">
      <span className="tile-label">{label}</span>
      <strong className={tone && tone !== "neutral" ? tone : undefined}>{value}</strong>
      <span className="tile-detail">{detail}</span>
    </div>
  );
}

function SignalGauge({ ticker }: { ticker: RankedTicker }) {
  return (
    <div className="signal-gauge">
      <span className={`score-ring risk-${ticker.signal.risk}`}>
        {ticker.signal.score}
      </span>
      <span className="ticker-sub">{ticker.signal.risk} risk</span>
    </div>
  );
}

function SectorCard({
  summary,
  active,
  onSelect,
}: {
  summary: SectorSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`sector-card ${active ? "active" : ""}`}
      onClick={onSelect}
      style={{ "--sector-accent": summary.accent } as CSSProperties}
    >
      <span className="sector-card-top">
        <span>{summary.label}</span>
        <span className={changeClass(summary.averageMove)}>{pct(summary.averageMove)}</span>
      </span>
      <strong>{summary.leader?.symbol ?? "--"}</strong>
      <span className="sector-card-bottom">
        {summary.newsCount} headlines / {summary.tickers.length} tracked
      </span>
    </button>
  );
}

function SectorTable({ tickers }: { tickers: RankedTicker[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Ticker</th>
            <th>Price</th>
            <th>Move</th>
            <th>Signal</th>
            <th>Range</th>
            <th>Insider</th>
            <th>Congress</th>
            <th>News</th>
            <th>Quote Time</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((ticker) => (
            <tr key={ticker.symbol}>
              <td>
                <span className="rank-badge">#{ticker.rank}</span>
              </td>
              <td>
                <div className="ticker-cell">
                  <strong>{ticker.symbol}</strong>
                  <span>{ticker.company}</span>
                </div>
              </td>
              <td className="price">{currency.format(ticker.quote.current)}</td>
              <td>
                <div className="move-stack">
                  <span className={`move-chip ${changeClass(ticker.quote.percentChange)}`}>
                    {pct(ticker.quote.percentChange)}
                  </span>
                  <span className={`change ${changeClass(ticker.quote.change)}`}>
                    {signedNumber(ticker.quote.change)}
                  </span>
                </div>
              </td>
              <td>
                <SignalGauge ticker={ticker} />
              </td>
              <td>
                <RangeMeter ticker={ticker} />
              </td>
              <td>
                <span className={changeClass(ticker.signal.insiderNetShares)}>
                  {activityLabel(ticker.signal.insiderNetShares, "Buying", "Selling")}
                </span>
              </td>
              <td>
                <span className={changeClass(ticker.signal.politicianNetTrades)}>
                  {activityLabel(ticker.signal.politicianNetTrades, "Buys", "Sells")}
                </span>
              </td>
              <td>
                <span className="news-count">{ticker.newsCount}</span>
              </td>
              <td className="ticker-sub">{formatQuoteTime(ticker.quote.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradingModes({
  mode,
  onChange,
}: {
  mode: TradingMode;
  onChange: (mode: TradingMode) => void;
}) {
  const modes: { id: TradingMode; label: string }[] = [
    { id: "momentum", label: "Momentum" },
    { id: "news", label: "News Flow" },
    { id: "insider", label: "Insiders" },
    { id: "risk", label: "Risk" },
  ];

  return (
    <div className="mode-switcher" aria-label="Trading view mode">
      {modes.map((item) => (
        <button
          className={item.id === mode ? "active" : ""}
          key={item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function defaultWatchlistDraft(): WatchlistDraft {
  return Object.fromEntries(
    SECTORS.map((sector) => [
      sector.id,
      sector.tickers.map((ticker) => ticker.symbol).join(", "),
    ]),
  ) as WatchlistDraft;
}

function parseStoredWatchlist(): WatchlistDraft {
  if (typeof window === "undefined") return defaultWatchlistDraft();

  try {
    const stored = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!stored) return defaultWatchlistDraft();
    const parsed = JSON.parse(stored) as Partial<WatchlistDraft>;
    return {
      ...defaultWatchlistDraft(),
      ...parsed,
    };
  } catch {
    return defaultWatchlistDraft();
  }
}

function buildWatchlistParams(draft: WatchlistDraft) {
  const params = new URLSearchParams();

  SECTORS.forEach((sector) => {
    const symbols = draft[sector.id]
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 12);

    if (symbols.length > 0) {
      params.set(sector.id, symbols.join(","));
    }
  });

  return params;
}

function WatchlistEditor({
  draft,
  onChange,
  onSave,
  onReset,
}: {
  draft: WatchlistDraft;
  onChange: (sector: SectorId, value: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <section className="panel watchlist-editor">
      <div className="panel-header compact">
        <div>
          <h2>Customize Watchlist</h2>
          <div className="meta">Enter comma-separated tickers. Saved in this browser.</div>
        </div>
        <div className="editor-actions">
          <button onClick={onReset}>Reset</button>
          <button className="primary" onClick={onSave}>Apply</button>
        </div>
      </div>
      <div className="watchlist-grid">
        {SECTORS.map((sector) => (
          <label className="watchlist-field" key={sector.id}>
            <span>{sector.label}</span>
            <input
              value={draft[sector.id]}
              onChange={(event) => onChange(sector.id, event.target.value)}
              placeholder="NVDA, AMD, PLTR"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function SignalPanel({ tickers }: { tickers: RankedTicker[] }) {
  const leaders = [...tickers].sort((a, b) => b.signal.score - a.signal.score).slice(0, 5);

  return (
    <section className="panel signal-panel">
      <div className="panel-header compact">
        <div>
          <h2>Trading Intelligence</h2>
          <div className="meta">Momentum, risk, insider, and Congress activity signals.</div>
        </div>
      </div>
      <div className="signal-list">
        {leaders.map((ticker) => (
          <div className="signal-row" key={`signal-${ticker.symbol}`}>
            <SignalGauge ticker={ticker} />
            <div>
              <strong className="mono">{ticker.symbol}</strong>
              <div className="tag-row">
                {ticker.signal.tags.length > 0
                  ? ticker.signal.tags.map((tag) => <span key={`${ticker.symbol}-${tag}`}>{tag}</span>)
                  : <span>Normal tape</span>}
              </div>
            </div>
            <span className={`move-chip ${changeClass(ticker.quote.percentChange)}`}>
              {pct(ticker.quote.percentChange)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ tickers }: { tickers: RankedTicker[] }) {
  const activity = tickers
    .flatMap((ticker) => [
      ...ticker.insiderTransactions.map((item) => ({
        id: item.id,
        symbol: ticker.symbol,
        title: item.name,
        detail: `${item.change > 0 ? "Bought" : "Sold"} ${Math.abs(item.change).toLocaleString()} shares`,
        meta: `Insider / filed ${item.filingDate}`,
        tone: item.change >= 0 ? "positive" : "negative",
      })),
      ...ticker.politicianTrades.map((item) => ({
        id: item.id,
        symbol: ticker.symbol,
        title: item.politician,
        detail: `${item.transaction} ${item.amount}`,
        meta: `${item.chamber} / reported ${item.reportDate}`,
        tone: item.transaction === "purchase" ? "positive" : "negative",
      })),
    ])
    .slice(0, 8);

  return (
    <section className="panel activity-panel">
      <div className="panel-header compact">
        <div>
          <h2>Insider / Politician Tape</h2>
          <div className="meta">Insider filings now; Congress trades when Quiver is configured.</div>
        </div>
      </div>
      <div className="activity-list">
        {activity.length > 0 ? (
          activity.map((item) => (
            <div className="activity-row" key={item.id}>
              <span className="ticker-symbol">{item.symbol}</span>
              <div>
                <strong>{item.title}</strong>
                <span className={item.tone}>{item.detail}</span>
                <small>{item.meta}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No insider or politician activity in the current window.</div>
        )}
      </div>
    </section>
  );
}

function MovementPanel({
  title,
  tickers,
  tone,
}: {
  title: string;
  tickers: RankedTicker[];
  tone: "positive" | "negative";
}) {
  const max = Math.max(
    1,
    ...tickers.map((ticker) => Math.abs(ticker.quote.percentChange)),
  );

  return (
    <section className="panel movement-panel">
      <div className="panel-header compact">
        <h3>{title}</h3>
      </div>
      <div className="movement-list">
        {tickers.map((ticker) => {
          const width = `${Math.max(6, (Math.abs(ticker.quote.percentChange) / max) * 100)}%`;
          return (
            <div className="movement-row" key={`${title}-${ticker.symbol}`}>
              <span className="mono">{ticker.symbol}</span>
              <div className="movement-bar">
                <div
                  className="movement-fill"
                  style={{
                    width,
                    background: tone === "positive" ? "var(--green)" : "var(--red)",
                  }}
                />
              </div>
              <span className={`change ${changeClass(ticker.quote.percentChange)}`}>
                {pct(ticker.quote.percentChange)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NewsCard({ item, priority = false }: { item: NewsItem; priority?: boolean }) {
  return (
    <a
      className={`news-card ${priority ? "priority" : ""}`}
      href={item.url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="news-source">
        <span>
          <strong className="ticker-symbol">{item.symbol}</strong> {item.source}
        </span>
        <span>{ageFromUnix(item.datetime)} ago</span>
      </div>
      <h4>{item.headline}</h4>
      {item.summary ? <p>{item.summary}</p> : null}
    </a>
  );
}

function NewsTape({ news }: { news: NewsItem[] }) {
  const repeated = [...news, ...news];

  return (
    <div className="ticker-tape" aria-label="Ticker news tape">
      <div className="ticker-track">
        {repeated.map((item, index) => (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="ticker-item"
            key={`${item.id}-${index}`}
          >
            <span className="ticker-symbol">{item.symbol}</span>
            <span>{item.headline}</span>
            <span className="ticker-sub">{item.source}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [data, setData] = useState(initialData);
  const [activeSector, setActiveSector] = useState<SectorId>("ai");
  const [tradingMode, setTradingMode] = useState<TradingMode>("momentum");
  const [watchlistDraft, setWatchlistDraft] = useState<WatchlistDraft>(() => defaultWatchlistDraft());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async (overrideDraft?: WatchlistDraft) => {
    setIsRefreshing(true);
    try {
      const params = buildWatchlistParams(overrideDraft ?? watchlistDraft);
      const query = params.size > 0 ? `?${params.toString()}` : "";
      const response = await fetch(`/api/dashboard${query}`, { cache: "no-store" });
      const nextData = (await response.json()) as DashboardPayload;
      setData(nextData);
    } finally {
      setIsRefreshing(false);
    }
  }, [watchlistDraft]);

  useEffect(() => {
    const interval = window.setInterval(refreshData, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    setWatchlistDraft(parseStoredWatchlist());
  }, []);

  const updateWatchlistDraft = useCallback((sector: SectorId, value: string) => {
    setWatchlistDraft((current) => ({
      ...current,
      [sector]: value.toUpperCase(),
    }));
  }, []);

  const saveWatchlist = useCallback(() => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlistDraft));
    void refreshData();
  }, [refreshData, watchlistDraft]);

  const resetWatchlist = useCallback(() => {
    const defaults = defaultWatchlistDraft();
    window.localStorage.removeItem(WATCHLIST_STORAGE_KEY);
    setWatchlistDraft(defaults);
    void refreshData(defaults);
  }, [refreshData]);

  const allSelected = useMemo(() => Object.values(data.sectors).flat(), [data]);
  const visibleNews = data.news.length > 0 ? data.news : allSelected.flatMap((item) => item.news);
  const selectedSector = SECTORS.find((sector) => sector.id === activeSector) ?? SECTORS[0];
  const selectedTickers = data.sectors[activeSector] ?? [];

  const sectorSummaries = useMemo<SectorSummary[]>(
    () =>
      SECTORS.map((sector) => {
        const tickers = data.sectors[sector.id] ?? [];
        const averageMove =
          tickers.length === 0
            ? 0
            : tickers.reduce((total, ticker) => total + ticker.quote.percentChange, 0) /
              tickers.length;
        const leader = [...tickers].sort(
          (a, b) => b.quote.percentChange - a.quote.percentChange,
        )[0];
        const newsCount = tickers.reduce((total, ticker) => total + ticker.newsCount, 0);

        return {
          id: sector.id,
          label: sector.label,
          accent: sector.accent,
          tickers,
          averageMove,
          leader,
          newsCount,
        };
      }),
    [data],
  );

  const strongestSector = [...sectorSummaries].sort(
    (a, b) => b.averageMove - a.averageMove,
  )[0];
  const biggestMover = [...allSelected].sort(
    (a, b) => Math.abs(b.quote.percentChange) - Math.abs(a.quote.percentChange),
  )[0];
  const mostCovered = [...allSelected].sort((a, b) => b.newsCount - a.newsCount)[0];
  const strongestSignal = [...allSelected].sort((a, b) => b.signal.score - a.signal.score)[0];
  const latestNews = visibleNews[0];

  return (
    <main className="dashboard">
      <div className="terminal-frame">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Market command center</span>
            <h1>Daily Sector Ticker Dashboard</h1>
            <span>AI, energy, and space stocks ranked from live market signals.</span>
          </div>
          <div className="controls">
            <span className="pill status-pill">
              <span
                className={`live-dot ${data.marketStatus === "closed" ? "closed" : ""}`}
              />
              Market {data.marketStatus}
            </span>
            <span className="pill">Set {data.selectionDate}</span>
            <span className="pill">Updated {formatTime(data.generatedAt)}</span>
            <button className="refresh-button" onClick={() => void refreshData()} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        <NewsTape news={visibleNews.slice(0, 16)} />

        {data.error ? <div className="setup-alert">{data.error}</div> : null}

        <section className="brief-strip" aria-label="Daily market brief">
          <BriefTile
            label="Strongest Sector"
            value={strongestSector?.label ?? "--"}
            detail={strongestSector ? pct(strongestSector.averageMove) : "No data"}
            tone={strongestSector?.averageMove && strongestSector.averageMove < 0 ? "negative" : "positive"}
          />
          <BriefTile
            label="Biggest Mover"
            value={biggestMover?.symbol ?? "--"}
            detail={biggestMover ? pct(biggestMover.quote.percentChange) : "No data"}
            tone={
              biggestMover?.quote.percentChange && biggestMover.quote.percentChange < 0
                ? "negative"
                : "positive"
            }
          />
          <BriefTile
            label="Most Covered"
            value={mostCovered?.symbol ?? "--"}
            detail={`${mostCovered?.newsCount ?? 0} headlines`}
            tone="neutral"
          />
          <BriefTile
            label="Best Signal"
            value={strongestSignal?.symbol ?? "--"}
            detail={strongestSignal ? `${strongestSignal.signal.score}/100 ${strongestSignal.signal.risk} risk` : "No data"}
            tone={
              strongestSignal?.signal.risk === "high"
                ? "negative"
                : strongestSignal?.signal.risk === "low"
                  ? "positive"
                  : "neutral"
            }
          />
          <BriefTile
            label="Latest Flash"
            value={latestNews?.symbol ?? "--"}
            detail={compactHeadline(latestNews)}
            tone="neutral"
          />
        </section>

        <div className="content-grid">
          <div className="main-column">
            <TradingModes mode={tradingMode} onChange={setTradingMode} />
            <WatchlistEditor
              draft={watchlistDraft}
              onChange={updateWatchlistDraft}
              onSave={saveWatchlist}
              onReset={resetWatchlist}
            />
            <section className="sector-overview" aria-label="Sector overview">
              {sectorSummaries.map((summary) => (
                <SectorCard
                  key={summary.id}
                  summary={summary}
                  active={summary.id === activeSector}
                  onSelect={() => setActiveSector(summary.id)}
                />
              ))}
            </section>

            <SignalPanel tickers={allSelected} />

            <section
              className="panel ranking-panel"
              style={{ "--sector-accent": selectedSector.accent } as CSSProperties}
            >
              <div className="panel-header">
                <div>
                  <h2>{selectedSector.label} Top Stocks Today</h2>
                  <div className="meta">
                    Five daily picks stay fixed while quotes and headlines refresh each minute.
                  </div>
                </div>
                <div className="section-stat">
                  <span>{selectedTickers.length}</span>
                  selected
                </div>
              </div>
              <SectorTable tickers={selectedTickers} />
              <div className="status-line">
                Ranking weighs movement, day range, positive momentum, and recent news.
              </div>
            </section>

            <div className="movement-grid">
              <MovementPanel
                title="Top Gainers"
                tickers={data.movements.gainers}
                tone="positive"
              />
              <MovementPanel
                title="Top Losers"
                tickers={data.movements.losers}
                tone="negative"
              />
            </div>
          </div>

          <aside className="side-column">
            <ActivityPanel tickers={allSelected} />
            <section className="panel lead-news">
              <div className="panel-header compact">
                <div>
                  <h2>News Alerts</h2>
                  <div className="meta">Ticker-specific flashes, newest first.</div>
                </div>
              </div>
              <div className="news-list">
                {visibleNews.slice(0, 24).map((item, index) => (
                  <NewsCard item={item} key={item.id} priority={index === 0} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

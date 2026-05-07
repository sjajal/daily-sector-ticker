"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DashboardPayload, NewsItem, RankedTicker } from "@/lib/types";
import { SECTORS, type SectorId } from "@/lib/tickers";
import { ageFromUnix } from "@/lib/market";

type DashboardShellProps = {
  initialData: DashboardPayload;
};

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

function changeClass(value: number) {
  return value >= 0 ? "positive" : "negative";
}

function SectorTable({ tickers }: { tickers: RankedTicker[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Ticker</th>
            <th>Company</th>
            <th>Price</th>
            <th>Change</th>
            <th>Percent</th>
            <th>News</th>
            <th>Quote Time</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((ticker) => (
            <tr key={ticker.symbol}>
              <td className="rank">#{ticker.rank}</td>
              <td className="mono">
                <strong>{ticker.symbol}</strong>
              </td>
              <td>{ticker.company}</td>
              <td className="price">{currency.format(ticker.quote.current)}</td>
              <td className={`change ${changeClass(ticker.quote.change)}`}>
                {ticker.quote.change > 0 ? "+" : ""}
                {ticker.quote.change.toFixed(2)}
              </td>
              <td className={`change ${changeClass(ticker.quote.percentChange)}`}>
                {pct(ticker.quote.percentChange)}
              </td>
              <td className="mono">{ticker.newsCount}</td>
              <td className="ticker-sub">{formatQuoteTime(ticker.quote.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <section className="panel">
      <div className="panel-header">
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

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a className="news-card" href={item.url} target="_blank" rel="noreferrer">
      <div className="news-source">
        <span>
          <strong className="ticker-symbol">{item.symbol}</strong> {item.source}
        </span>
        <span>{ageFromUnix(item.datetime)} ago</span>
      </div>
      <h4>{item.headline}</h4>
    </a>
  );
}

function NewsTape({ news }: { news: NewsItem[] }) {
  const tapeNews = news.length > 0 ? news : [];
  const repeated = [...tapeNews, ...tapeNews];

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const nextData = (await response.json()) as DashboardPayload;
      setData(nextData);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refreshData, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshData]);

  const selectedSector = SECTORS.find((sector) => sector.id === activeSector) ?? SECTORS[0];
  const selectedTickers = data.sectors[activeSector] ?? [];
  const allSelected = useMemo(() => Object.values(data.sectors).flat(), [data]);
  const visibleNews = data.news.length > 0 ? data.news : allSelected.flatMap((item) => item.news);

  return (
    <main className="dashboard">
      <div className="terminal-frame">
        <header className="topbar">
          <div className="brand">
            <h1>Daily Sector Ticker Dashboard</h1>
            <span>AI / Energy / Space</span>
          </div>
          <div className="controls">
            <span className="pill">
              <span
                className={`live-dot ${data.marketStatus === "closed" ? "closed" : ""}`}
              />
              Market {data.marketStatus}
            </span>
            <span className="pill">Daily set {data.selectionDate}</span>
            <span className="pill">Updated {formatTime(data.generatedAt)}</span>
            <button className="refresh-button" onClick={refreshData} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        <NewsTape news={visibleNews.slice(0, 16)} />

        {data.error ? <div className="setup-alert">{data.error}</div> : null}

        <div className="content-grid">
          <div className="main-column">
            <section
              className="panel"
              style={{ "--sector-accent": selectedSector.accent } as CSSProperties}
            >
              <div className="panel-header">
                <div>
                  <h2>Top Stocks Today</h2>
                  <div className="meta">
                    Ranked daily by movement, quote range, direction, and news count.
                  </div>
                </div>
                <div className="sector-tabs" aria-label="Sector tabs">
                  {SECTORS.map((sector) => (
                    <button
                      className={`sector-tab ${sector.id === activeSector ? "active" : ""}`}
                      key={sector.id}
                      onClick={() => setActiveSector(sector.id)}
                      style={{ "--sector-accent": sector.accent } as CSSProperties}
                    >
                      {sector.label}
                    </button>
                  ))}
                </div>
              </div>
              <SectorTable tickers={selectedTickers} />
              <div className="status-line">
                Showing {selectedTickers.length} selected tickers for {selectedSector.label}.
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
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>News Alerts</h2>
                  <div className="meta">Ticker-specific headlines, newest first.</div>
                </div>
              </div>
              <div className="news-list">
                {visibleNews.slice(0, 24).map((item) => (
                  <NewsCard item={item} key={item.id} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

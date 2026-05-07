# Daily Sector Ticker Dashboard

A Vercel-ready Next.js dashboard for tracking AI, energy, and space stocks. The app selects five US-listed tickers per sector each day, refreshes quotes and news every minute, and presents the results in a compact trading-terminal interface.

## Setup

Create a `.env.local` file:

```bash
FINNHUB_API_KEY=your_finnhub_api_key_here
QUIVER_API_KEY=optional_quiver_api_key_for_congress_trades
```

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Data Behavior

- `/api/dashboard` fetches Finnhub quotes and company news.
- Finnhub also powers recent company insider transaction signals when the endpoint is available for a ticker.
- `QUIVER_API_KEY` is optional and enables congressional/politician trade signals through Quiver Quantitative.
- The selected five tickers per sector are cached for the current New York trading date.
- Quotes and news refresh every minute.
- Users can customize ticker lists in the dashboard; those watchlists are saved in browser local storage and passed to `/api/dashboard` as sector query parameters.
- If `FINNHUB_API_KEY` is missing, the app renders demo data with a visible setup warning.
- If Finnhub fails after a successful fetch, the API returns the last successful market snapshot with a warning.

## Deploying To Vercel

Add `FINNHUB_API_KEY` to the Vercel project environment variables, then deploy normally. Vercel will install dependencies from `package.json` and serve the Next.js App Router project.

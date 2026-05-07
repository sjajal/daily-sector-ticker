# Daily Sector Ticker Dashboard

A Vercel-ready Next.js dashboard for tracking AI, energy, and space stocks. The app selects five US-listed tickers per sector each day, refreshes quotes and news every minute, and presents the results in a compact trading-terminal interface.

## Setup

Create a `.env.local` file:

```bash
FINNHUB_API_KEY=your_finnhub_api_key_here
```

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Data Behavior

- `/api/dashboard` fetches Finnhub quotes and company news.
- The selected five tickers per sector are cached for the current New York trading date.
- Quotes and news refresh every minute.
- If `FINNHUB_API_KEY` is missing, the app renders demo data with a visible setup warning.
- If Finnhub fails after a successful fetch, the API returns the last successful market snapshot with a warning.

## Deploying To Vercel

Add `FINNHUB_API_KEY` to the Vercel project environment variables, then deploy normally. Vercel will install dependencies from `package.json` and serve the Next.js App Router project.

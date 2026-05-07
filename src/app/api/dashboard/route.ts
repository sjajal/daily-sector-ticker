import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/finnhub";
import type { CustomWatchlist, SectorId } from "@/lib/tickers";

export const revalidate = 60;

const sectorIds: SectorId[] = ["ai", "energy", "space"];

function parseWatchlist(searchParams: URLSearchParams): CustomWatchlist | undefined {
  const custom: CustomWatchlist = {};

  sectorIds.forEach((sector) => {
    const value = searchParams.get(sector);
    if (!value) return;

    const symbols = value
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 12);

    if (symbols.length > 0) {
      custom[sector] = symbols;
    }
  });

  return Object.keys(custom).length > 0 ? custom : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await getDashboardData(parseWatchlist(url.searchParams));

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}

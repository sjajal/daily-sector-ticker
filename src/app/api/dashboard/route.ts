import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/finnhub";

export const revalidate = 60;

export async function GET() {
  const data = await getDashboardData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}

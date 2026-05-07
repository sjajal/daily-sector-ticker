import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardData } from "@/lib/finnhub";

export default async function Home() {
  const data = await getDashboardData();

  return <DashboardShell initialData={data} />;
}

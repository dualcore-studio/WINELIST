import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t.stock.dashboard.title} · Wine List Manager` };
}

/** Homepage: dashboard delle scorte (cosa ordinare, cosa è in arrivo). */
export default function HomePage() {
  return <DashboardView />;
}

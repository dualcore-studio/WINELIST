import type { Metadata } from "next";
import { MovementsView } from "@/components/stock/movements-view";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: `${t.stock.movements.title} · Wine List Manager` };
}

export default function MovementsPage() {
  return <MovementsView />;
}

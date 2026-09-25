import type { Metadata } from "next";
import { OrdersPrintView } from "@/components/print/orders-view";
import type { DashboardScope } from "@/components/dashboard/dashboard-view";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.stock.print.title };
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** La sezione (tutti / vini / distillati) arriva dalla dashboard. */
export default async function OrdersPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const raw = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const scope: DashboardScope = raw === "wines" || raw === "spirits" ? raw : "all";
  return <OrdersPrintView scope={scope} />;
}

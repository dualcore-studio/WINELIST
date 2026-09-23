import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n/server";
import { InternalSpiritsPrintView } from "@/components/print/internal-view";
import { spiritFiltersFromSearchParams } from "@/features/grappe/filters";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.print.internal.spiritsTitle };
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** I filtri arrivano dalla pagina Distillati come query string. */
export default async function InternalSpiritsPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <InternalSpiritsPrintView filters={spiritFiltersFromSearchParams(params)} />;
}

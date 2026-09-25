import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n/server";
import { InternalSpiritsPrintView } from "@/components/print/internal-view";
import { spiritFiltersFromSearchParams } from "@/features/grappe/filters";
import { SPIRIT_SORT_KEYS } from "@/features/grappe/sort";
import { sortFromSearchParams } from "@/lib/table-sort";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.print.internal.spiritsTitle };
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Filtri e ordinamento arrivano dalla pagina Distillati come query string. */
export default async function InternalSpiritsPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <InternalSpiritsPrintView
      filters={spiritFiltersFromSearchParams(params)}
      sort={sortFromSearchParams(params, SPIRIT_SORT_KEYS)}
    />;
}

import type { Metadata } from "next";
import { getServerI18n } from "@/lib/i18n/server";
import { InternalPrintView } from "@/components/print/internal-view";
import { filtersFromSearchParams } from "@/features/wines/filters";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.print.internal.winesTitle };
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** I filtri arrivano dalla lista vini come query string. */
export default async function InternalPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <InternalPrintView filters={filtersFromSearchParams(params)} />;
}

import type { Metadata } from "next";
import { InternalSpiritsPrintView } from "@/components/print/internal-view";
import { spiritFiltersFromSearchParams } from "@/features/grappe/filters";

export const metadata: Metadata = {
  title: "Distillati – uso interno"
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** I filtri arrivano dalla pagina Distillati come query string. */
export default async function InternalSpiritsPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <InternalSpiritsPrintView filters={spiritFiltersFromSearchParams(params)} />;
}

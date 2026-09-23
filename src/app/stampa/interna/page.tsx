import type { Metadata } from "next";
import { InternalPrintView } from "@/components/print/internal-view";
import { filtersFromSearchParams } from "@/features/wines/filters";

export const metadata: Metadata = {
  title: "Lista vini – uso interno"
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** I filtri arrivano dalla lista vini come query string. */
export default async function InternalPrintPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <InternalPrintView filters={filtersFromSearchParams(params)} />;
}

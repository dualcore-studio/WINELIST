import { WinesClientPage } from "@/components/wines/wines-client-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WinesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const raw = sp.seedPage26;
  const flag =
    raw === "1" || (Array.isArray(raw) && raw.some((v) => v === "1"));
  return <WinesClientPage autoSeedPage26={flag} />;
}

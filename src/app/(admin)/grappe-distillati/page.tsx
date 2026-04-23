import { GrappeDistillatiClientPage } from "@/components/grappe/grappe-client-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GrappeDistillatiPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const raw = sp.seedDistillati;
  const flag =
    raw === "1" || (Array.isArray(raw) && raw.some((v) => v === "1"));
  return <GrappeDistillatiClientPage autoSeedDistillati={flag} />;
}

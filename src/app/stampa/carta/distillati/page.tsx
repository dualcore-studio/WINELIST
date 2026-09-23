import type { Metadata } from "next";
import { CartaView } from "@/components/print/carta-view";

export const metadata: Metadata = {
  title: "Spirits List"
};

export default function CartaDistillatiPage() {
  return <CartaView scope="spirits" />;
}

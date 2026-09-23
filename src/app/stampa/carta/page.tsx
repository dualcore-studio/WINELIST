import type { Metadata } from "next";
import { CartaView } from "@/components/print/carta-view";

export const metadata: Metadata = {
  title: "Wine List"
};

export default function CartaPage() {
  return <CartaView />;
}

import { Truck } from "lucide-react";
import { isOrdered, stockQuantity, stockStatus, type StockStatus } from "@/features/stock/stock";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Wine } from "@/types/wine";

/** Colore della quantità secondo la scorta minima dell'articolo (neutro se non monitorato). */
export const STOCK_TEXT: Record<StockStatus, string> = {
  untracked: "text-neutral-800",
  out: "text-red-600",
  low: "text-amber-600",
  ok: "text-emerald-600"
};

/** Quantità in tabella: colore dello stato, camioncino se c'è un ordine in arrivo. */
export function StockQuantity({ item }: { item: Wine }) {
  const { t } = useI18n();
  const qty = stockQuantity(item);
  const ordered = isOrdered(item);
  const title = [t.stock.qtyTitle(qty, item.minStock), ordered ? t.stock.status.ordered : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <span className="inline-flex items-center justify-end gap-1" title={title}>
      {ordered ? <Truck className="size-3.5 text-sky-600" strokeWidth={2} aria-label={t.stock.status.ordered} /> : null}
      <span className={cn("tabular-nums text-[14px] font-semibold", STOCK_TEXT[stockStatus(item)])}>{qty}</span>
    </span>
  );
}

"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MovementDialog } from "@/components/stock/movement-dialog";
import { StockQuantity } from "@/components/stock/stock-quantity";
import { applyMovement } from "@/features/stock/movements";
import { stockQuantity } from "@/features/stock/stock";
import { useUsername } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

const stepButton =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:pointer-events-none disabled:opacity-30";

/**
 * Quantità in tabella con − (vendita) e + (carico) di una bottiglia; clic sul numero apre il
 * movimento con motivo (rottura, uso interno, rettifica…). Ogni variazione finisce nel registro.
 * I clic non aprono la riga (stopPropagation).
 */
export function StockAdjuster({ item, collection }: { item: Wine; collection: string }) {
  const { t } = useI18n();
  const tm = t.stock.movements;
  const username = useUsername();
  const [dialogOpen, setDialogOpen] = useState(false);
  const qty = stockQuantity(item);

  function step(delta: 1 | -1) {
    applyMovement({
      item,
      collection,
      qtyAfter: qty + delta,
      reason: delta > 0 ? "load" : "sale",
      username
    }).catch((err: unknown) => window.alert(err instanceof Error ? err.message : t.common.operationFailed));
  }

  return (
    <div className="inline-flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={stepButton}
        onClick={() => step(-1)}
        disabled={qty === 0}
        aria-label={tm.decrease(item.name)}
        title={tm.decrease(item.name)}
      >
        <Minus className="size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label={tm.openDialog(item.name)}
        className="min-w-[2.25rem] rounded-md px-1 py-0.5 text-right transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <StockQuantity item={item} />
      </button>
      <button
        type="button"
        className={stepButton}
        onClick={() => step(1)}
        aria-label={tm.increase(item.name)}
        title={tm.increase(item.name)}
      >
        <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
      {dialogOpen ? (
        <MovementDialog item={item} collection={collection} username={username} onClose={() => setDialogOpen(false)} />
      ) : null}
    </div>
  );
}

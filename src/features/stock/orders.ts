"use client";

import { db, isInstantConfigured } from "@/lib/instant/client";
import { applyMovement } from "@/features/stock/movements";
import { stockQuantity } from "@/features/stock/stock";
import type { Wine } from "@/types/wine";

function instant() {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }
  return db;
}

async function patch(itemId: string, fields: Record<string, unknown>): Promise<void> {
  const d = instant();
  await d.transact(d.tx.wines[itemId].update({ ...fields, updatedAt: new Date().toISOString() }));
}

/** Segna l'articolo come ordinato: resta visibile nella dashboard come "in arrivo". */
export function markOrdered(item: Wine, qty: number): Promise<void> {
  return patch(item.id, { orderedAt: new Date().toISOString(), orderedQty: qty });
}

export function cancelOrder(item: Wine): Promise<void> {
  return patch(item.id, { orderedAt: null, orderedQty: null });
}

/** Merce arrivata: aggiunge le bottiglie alla cantina, chiude l'ordine e registra il movimento. */
export function receiveOrder(item: Wine, qty: number, collection: string, username: string): Promise<void> {
  return applyMovement({
    item,
    collection,
    qtyAfter: stockQuantity(item) + qty,
    reason: "delivery",
    username,
    itemFields: { orderedAt: null, orderedQty: null }
  });
}

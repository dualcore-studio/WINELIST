"use client";

import { useMemo } from "react";
import { db, id, isInstantConfigured } from "@/lib/instant/client";
import { stockQuantity } from "@/features/stock/stock";
import type { Wine } from "@/types/wine";

/**
 * Registro movimenti di magazzino (entità `stockMovements`): ogni variazione di quantità con
 * motivo, utente e ora. La quantità dell'articolo e il movimento si scrivono nella stessa
 * transazione, così il registro non può restare indietro rispetto alla cantina.
 */

/** Motivi: vendita, carico, arrivo ordine, rottura, uso interno/omaggio, rettifica inventario. */
export const MOVEMENT_REASONS = ["sale", "load", "delivery", "breakage", "internal", "inventory"] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

/** Motivi che tolgono bottiglie; "inventory" può andare in entrambi i versi. */
export const OUTGOING_REASONS: readonly MovementReason[] = ["sale", "breakage", "internal"];

export type StockMovement = {
  id: string;
  itemId: string;
  itemName: string;
  /** Collection dell'articolo (vini o distillati). */
  collection: string;
  delta: number;
  qtyBefore: number;
  qtyAfter: number;
  reason: MovementReason;
  note: string;
  username: string;
  createdAt: string;
};

type MovementInput = {
  item: Wine;
  collection: string;
  /** Nuova quantità in cantina (≥ 0). */
  qtyAfter: number;
  reason: MovementReason;
  note?: string;
  username?: string;
  /** Altri campi dell'articolo da aggiornare insieme (es. chiusura dell'ordine). */
  itemFields?: Record<string, unknown>;
};

function instant() {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }
  return db;
}

/** Cambia la quantità di un articolo e registra il movimento. */
export async function applyMovement({
  item,
  collection,
  qtyAfter,
  reason,
  note = "",
  username = "",
  itemFields = {}
}: MovementInput): Promise<void> {
  const d = instant();
  const qtyBefore = stockQuantity(item);
  const after = Math.max(0, Math.trunc(qtyAfter));
  const now = new Date().toISOString();
  await d.transact([
    d.tx.wines[item.id].update({
      quantity: after,
      // Tornano bottiglie in cantina: l'articolo torna disponibile.
      ...(after > 0 ? { isAvailable: true } : {}),
      ...itemFields,
      updatedAt: now
    }),
    d.tx.stockMovements[id()].update({
      itemId: item.id,
      itemName: item.name,
      collection,
      delta: after - qtyBefore,
      qtyBefore,
      qtyAfter: after,
      reason,
      note: note.trim(),
      username,
      createdAt: now
    })
  ]);
}

/** Solo la registrazione (quando la quantità è già stata salvata, es. dal modulo di modifica). */
export async function recordMovement(
  item: Wine,
  collection: string,
  qtyBefore: number,
  qtyAfter: number,
  reason: MovementReason,
  username = ""
): Promise<void> {
  if (qtyBefore === qtyAfter) return;
  const d = instant();
  await d.transact(
    d.tx.stockMovements[id()].update({
      itemId: item.id,
      itemName: item.name,
      collection,
      delta: qtyAfter - qtyBefore,
      qtyBefore,
      qtyAfter,
      reason,
      note: "",
      username,
      createdAt: new Date().toISOString()
    })
  );
}

function normalize(raw: Record<string, unknown>): StockMovement | null {
  if (typeof raw.id !== "string" || typeof raw.itemId !== "string") return null;
  const reason = MOVEMENT_REASONS.includes(raw.reason as MovementReason) ? (raw.reason as MovementReason) : "inventory";
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    id: raw.id,
    itemId: raw.itemId,
    itemName: String(raw.itemName ?? ""),
    collection: String(raw.collection ?? ""),
    delta: num(raw.delta),
    qtyBefore: num(raw.qtyBefore),
    qtyAfter: num(raw.qtyAfter),
    reason,
    note: String(raw.note ?? ""),
    username: String(raw.username ?? ""),
    createdAt: String(raw.createdAt ?? "")
  };
}

/** Tutti i movimenti, dal più recente. */
export function useMovements(): { movements: StockMovement[]; isLoading: boolean; error: boolean } {
  if (!isInstantConfigured || !db) return { movements: [], isLoading: false, error: true };
  const query = db.useQuery({ stockMovements: {} });
  const data = query?.data ?? null;
  const movements = useMemo(
    () =>
      ((data?.stockMovements ?? []) as Record<string, unknown>[])
        .map(normalize)
        .filter((m): m is StockMovement => m !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data]
  );
  return { movements, isLoading: query?.isLoading ?? true, error: Boolean(query?.error) };
}

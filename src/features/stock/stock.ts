import type { Wine } from "@/types/wine";

/**
 * Scorte: ogni vino/distillato può avere una scorta minima (avviso) e una scorta ideale
 * (quanto riordinare). Senza scorta minima l'articolo non è monitorato: è il caso delle
 * bottiglie singole di annate che non si possono riordinare.
 */

export type StockStatus = "untracked" | "out" | "low" | "ok";

/** Bottiglie in cantina: un articolo non disponibile conta 0. */
export function stockQuantity(item: Wine): number {
  return item.isAvailable ? Math.max(0, item.quantity) : 0;
}

export function isTracked(item: Wine): boolean {
  return item.minStock !== null;
}

export function stockStatus(item: Wine): StockStatus {
  if (item.minStock === null) return "untracked";
  const qty = stockQuantity(item);
  if (qty === 0) return "out";
  if (qty <= item.minStock) return "low";
  return "ok";
}

/** Da riordinare: monitorato e a scorta minima o sotto. */
export function needsReorder(item: Wine): boolean {
  const status = stockStatus(item);
  return status === "out" || status === "low";
}

/** Ordine già fatto e non ancora arrivato. */
export function isOrdered(item: Wine): boolean {
  return item.orderedAt !== null;
}

/** Quanto ordinare per tornare alla scorta ideale; null se la scorta ideale non è impostata. */
export function suggestedOrder(item: Wine): number | null {
  if (item.targetStock === null) return null;
  return Math.max(0, item.targetStock - stockQuantity(item));
}

/** Urgenza per l'ordinamento della lista ordini: prima gli esauriti, poi i più lontani dal minimo. */
export function compareUrgency(a: Wine, b: Wine): number {
  const rank = (w: Wine) => (stockStatus(w) === "out" ? 0 : 1);
  const ratio = (w: Wine) => (w.minStock ? stockQuantity(w) / w.minStock : 0);
  return rank(a) - rank(b) || ratio(a) - ratio(b) || a.name.localeCompare(b.name, "it");
}

/** Valore di magazzino ai prezzi di carta (i distillati con prezzo segnaposto 1 non contano). */
export function stockValue(items: readonly Wine[]): number {
  return items.reduce((sum, w) => sum + (w.price > 1 ? stockQuantity(w) * w.price : 0), 0);
}

/** Filtro "Scorte" delle liste: vuoto = tutti. */
export const STOCK_FILTERS = ["reorder", "ordered", "tracked", "untracked"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export function matchesStockFilter(item: Wine, filter: string): boolean {
  switch (filter) {
    case "reorder":
      return needsReorder(item) && !isOrdered(item);
    case "ordered":
      return isOrdered(item);
    case "tracked":
      return isTracked(item);
    case "untracked":
      return !isTracked(item);
    default:
      return true;
  }
}

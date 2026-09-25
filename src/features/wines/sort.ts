import type { Lang } from "@/lib/i18n/config";
import { countryLabel, wineTypeLabel } from "@/lib/i18n/format";
import { sortRows, textValue, type SortColumn, type SortState } from "@/lib/table-sort";
import { compareBins, type Wine } from "@/types/wine";

/** Colonne ordinabili della lista vini (stesso ordine per tabella e stampa interna). */
export const WINE_SORT_KEYS = [
  "bin",
  "name",
  "winery",
  "category",
  "vintage",
  "type",
  "country",
  "region",
  "price",
  "quantity"
] as const;

export type WineSortKey = (typeof WINE_SORT_KEYS)[number];
export type WineSort = SortState<WineSortKey>;

const positive = (v: number | undefined) => (v !== undefined && Number.isFinite(v) && v > 0 ? v : null);

function columns(lang: Lang): Record<WineSortKey, SortColumn<Wine>> {
  return {
    // Ordine naturale dei bin ("GB 2" prima di "GB 10"), non alfabetico.
    bin: { value: (w) => textValue(w.binNumber), compare: (a, b) => compareBins(String(a), String(b)) },
    name: { value: (w) => textValue(w.name) },
    winery: { value: (w) => textValue(w.winery) },
    category: { value: (w) => textValue([w.grape.trim(), w.category.trim()].filter(Boolean).join(" - ")) },
    // NV (0) e annata assente (null) in fondo.
    vintage: { value: (w) => (w.vintage ? w.vintage : null) },
    type: { value: (w) => textValue(wineTypeLabel(w.type, lang)) },
    country: { value: (w) => textValue(countryLabel(w.country, lang)) },
    region: { value: (w) => textValue(w.region) },
    price: { value: (w) => positive(w.price) },
    quantity: { value: (w) => w.quantity }
  };
}

export function sortWines(wines: readonly Wine[], sort: WineSort, lang: Lang): Wine[] {
  return sortRows(wines, sort, columns(lang), lang);
}

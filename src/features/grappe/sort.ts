import type { Lang } from "@/lib/i18n/config";
import { sortRows, textValue, type SortColumn, type SortState } from "@/lib/table-sort";
import type { Wine } from "@/types/wine";

/** Colonne ordinabili della pagina Distillati (stesso ordine per tabella e stampa interna). */
export const SPIRIT_SORT_KEYS = ["name", "producer", "type", "glass", "bottle", "quantity"] as const;

export type SpiritSortKey = (typeof SPIRIT_SORT_KEYS)[number];
export type SpiritSort = SortState<SpiritSortKey>;

const COLUMNS: Record<SpiritSortKey, SortColumn<Wine>> = {
  name: { value: (w) => textValue(w.name) },
  producer: { value: (w) => textValue(w.winery) },
  type: { value: (w) => textValue(w.spiritType) },
  // 0 = venduto solo in bottiglia: conta come prezzo assente.
  glass: {
    value: (w) => {
      const v = Number(w.pricePerGlass);
      return w.pricePerGlass !== undefined && w.pricePerGlass !== null && Number.isFinite(v) && v > 0 ? v : null;
    }
  },
  // 1 = segnaposto dei distillati venduti solo al bicchiere: conta come prezzo assente.
  bottle: { value: (w) => (w.price > 1 ? w.price : null) },
  quantity: { value: (w) => w.quantity }
};

export function sortSpirits(spirits: readonly Wine[], sort: SpiritSort, lang: Lang): Wine[] {
  return sortRows(spirits, sort, COLUMNS, lang);
}

import { initialGrappaFilters, type GrappaFiltersState } from "@/components/grappe/grappa-filters";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { matchesStockFilter, STOCK_FILTERS, type StockFilter } from "@/features/stock/stock";
import type { Wine } from "@/types/wine";

const isStockFilter = (v: string): v is StockFilter => (STOCK_FILTERS as readonly string[]).includes(v);

/** Applica i filtri della pagina Distillati (stessa logica per tabella e stampa interna). */
export function filterSpirits(spirits: readonly Wine[], filters: GrappaFiltersState): Wine[] {
  const byName = filters.name.trim().toLowerCase();
  const byWinery = filters.winery.trim().toLowerCase();
  const priceMax = Number(filters.priceMax);
  const glassMax = Number(filters.pricePerGlassMax);
  const qtyMin = Number(filters.quantityMin);
  const qtyMax = Number(filters.quantityMax);
  const hasPriceMax = filters.priceMax.trim() !== "" && !Number.isNaN(priceMax);
  const hasGlassMax = filters.pricePerGlassMax.trim() !== "" && !Number.isNaN(glassMax);
  const hasQtyMin = filters.quantityMin.trim() !== "" && !Number.isNaN(qtyMin);
  const hasQtyMax = filters.quantityMax.trim() !== "" && !Number.isNaN(qtyMax);

  return spirits.filter((wine) => {
    if (byName && !wine.name.toLowerCase().includes(byName)) return false;
    if (byWinery && !wine.winery.toLowerCase().includes(byWinery)) return false;
    if (filters.spiritType) {
      // Il filtro può essere una tipologia completa ("Tequila Blanco") o una famiglia
      // ("Tequila") che include le sottocategorie ("Tequila Blanco", "Tequila Reposado", …).
      const st = (wine.spiritType ?? "").trim();
      const f = filters.spiritType.trim();
      if (st !== f && !st.startsWith(`${f} `)) return false;
    }
    if (hasPriceMax && wine.price > priceMax) return false;
    if (hasGlassMax) {
      // Filtrando per prezzo al bicchiere restano solo i distillati che ce l'hanno.
      const glass = Number(wine.pricePerGlass);
      if (wine.pricePerGlass === undefined || wine.pricePerGlass === null || !Number.isFinite(glass) || glass > glassMax) {
        return false;
      }
    }
    if (hasQtyMin && wine.quantity < qtyMin) return false;
    if (hasQtyMax && wine.quantity > qtyMax) return false;
    if (!matchesStockFilter(wine, filters.stock)) return false;
    return true;
  });
}

const KEYS = Object.keys(initialGrappaFilters) as Array<keyof GrappaFiltersState>;

/** Filtri → query string (solo i valori impostati). */
export function spiritFiltersToSearchParams(filters: GrappaFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  return params;
}

/** Query string → filtri (i parametri mancanti restano vuoti). */
export function spiritFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>
): GrappaFiltersState {
  const filters: GrappaFiltersState = { ...initialGrappaFilters };
  for (const key of KEYS) {
    const v = params[key];
    filters[key] = (Array.isArray(v) ? v[0] : v) ?? "";
  }
  return filters;
}

/** Riassunto leggibile dei filtri attivi, per l'intestazione della stampa. */
export function describeSpiritFilters(filters: GrappaFiltersState, t: Dictionary): string[] {
  const f = t.print.filterSummary;
  const parts: string[] = [];
  if (filters.name.trim()) parts.push(`${f.name}: ${filters.name.trim()}`);
  if (filters.winery.trim()) parts.push(`${f.producer}: ${filters.winery.trim()}`);
  if (filters.spiritType) parts.push(`${f.type}: ${filters.spiritType}`);
  if (filters.pricePerGlassMax.trim()) parts.push(`${f.glassMax}: ${filters.pricePerGlassMax.trim()}`);
  if (filters.priceMax.trim()) parts.push(`${f.bottleMax}: ${filters.priceMax.trim()}`);
  if (filters.quantityMin.trim()) parts.push(`${t.common.qtyMin}: ${filters.quantityMin.trim()}`);
  if (filters.quantityMax.trim()) parts.push(`${t.common.qtyMax}: ${filters.quantityMax.trim()}`);
  if (isStockFilter(filters.stock)) parts.push(`${t.stock.filter.label}: ${t.stock.filter[filters.stock]}`);
  return parts;
}

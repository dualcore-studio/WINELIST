import { initialGrappaFilters, type GrappaFiltersState } from "@/components/grappe/grappa-filters";
import type { Wine } from "@/types/wine";

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
export function describeSpiritFilters(filters: GrappaFiltersState): string[] {
  const parts: string[] = [];
  if (filters.name.trim()) parts.push(`Nome: ${filters.name.trim()}`);
  if (filters.winery.trim()) parts.push(`Produttore: ${filters.winery.trim()}`);
  if (filters.spiritType) parts.push(`Tipologia: ${filters.spiritType}`);
  if (filters.pricePerGlassMax.trim()) parts.push(`Prezzo bicch. max: ${filters.pricePerGlassMax.trim()}`);
  if (filters.priceMax.trim()) parts.push(`Prezzo bott. max: ${filters.priceMax.trim()}`);
  if (filters.quantityMin.trim()) parts.push(`Q.min: ${filters.quantityMin.trim()}`);
  if (filters.quantityMax.trim()) parts.push(`Q.max: ${filters.quantityMax.trim()}`);
  return parts;
}

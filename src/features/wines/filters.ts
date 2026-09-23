import type { WineFiltersState } from "@/components/wines/wine-filters";
import { formatVintage, type Wine } from "@/types/wine";

export const initialWineFilters: WineFiltersState = {
  binNumber: "",
  name: "",
  winery: "",
  categoryText: "",
  type: "",
  country: "",
  region: "",
  category: "",
  vintage: "",
  quantityMin: "",
  quantityMax: "",
  onlyAvailable: true
};

/** Applica i filtri della lista vini (stessa logica per tabella e stampa interna). */
export function filterWines(wines: readonly Wine[], filters: WineFiltersState): Wine[] {
  const byName = filters.name.trim().toLowerCase();
  const byWinery = filters.winery.trim().toLowerCase();
  const byCategoryText = filters.categoryText.trim().toLowerCase();
  const byBin = filters.binNumber.trim().toLowerCase();
  const byVintage = filters.vintage.trim().toLowerCase();
  const qtyMin = Number(filters.quantityMin);
  const qtyMax = Number(filters.quantityMax);

  return wines.filter((wine) => {
    if (filters.onlyAvailable && !wine.isAvailable) return false;
    if (filters.country && wine.country !== filters.country) return false;
    if (filters.type && wine.type !== filters.type) return false;
    if (filters.region && wine.region !== filters.region) return false;
    if (filters.category && wine.category !== filters.category) return false;
    if (byBin && !wine.binNumber.toLowerCase().includes(byBin)) return false;
    if (byName && !wine.name.toLowerCase().includes(byName)) return false;
    if (byWinery && !wine.winery.toLowerCase().includes(byWinery)) return false;
    if (byVintage && !formatVintage(wine.vintage).toLowerCase().includes(byVintage)) return false;
    if (!Number.isNaN(qtyMin) && filters.quantityMin.trim() !== "" && wine.quantity < qtyMin) return false;
    if (!Number.isNaN(qtyMax) && filters.quantityMax.trim() !== "" && wine.quantity > qtyMax) return false;
    if (byCategoryText && !`${wine.grape} ${wine.category}`.toLowerCase().includes(byCategoryText)) {
      return false;
    }
    return true;
  });
}

const TEXT_KEYS = [
  "binNumber",
  "name",
  "winery",
  "categoryText",
  "type",
  "country",
  "region",
  "category",
  "vintage",
  "quantityMin",
  "quantityMax"
] as const;

/** Filtri → query string (solo i valori diversi dal default). */
export function filtersToSearchParams(filters: WineFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of TEXT_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  if (!filters.onlyAvailable) params.set("onlyAvailable", "0");
  return params;
}

/** Query string → filtri (i parametri mancanti restano al default). */
export function filtersFromSearchParams(
  params: Record<string, string | string[] | undefined>
): WineFiltersState {
  const read = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const filters: WineFiltersState = { ...initialWineFilters };
  for (const key of TEXT_KEYS) filters[key] = read(key);
  filters.onlyAvailable = read("onlyAvailable") !== "0";
  return filters;
}

/** Riassunto leggibile dei filtri attivi, per l'intestazione della stampa. */
export function describeFilters(filters: WineFiltersState): string[] {
  const parts: string[] = [];
  if (filters.binNumber.trim()) parts.push(`Bin: ${filters.binNumber.trim()}`);
  if (filters.name.trim()) parts.push(`Nome: ${filters.name.trim()}`);
  if (filters.winery.trim()) parts.push(`Cantina: ${filters.winery.trim()}`);
  if (filters.categoryText.trim()) parts.push(`Vitigno/Cat.: ${filters.categoryText.trim()}`);
  if (filters.type) parts.push(`Tipologia: ${filters.type}`);
  if (filters.country) parts.push(`Nazione: ${filters.country}`);
  if (filters.region) parts.push(`Regione: ${filters.region}`);
  if (filters.category) parts.push(`Categoria: ${filters.category}`);
  if (filters.vintage.trim()) parts.push(`Annata: ${filters.vintage.trim()}`);
  if (filters.quantityMin.trim()) parts.push(`Q.min: ${filters.quantityMin.trim()}`);
  if (filters.quantityMax.trim()) parts.push(`Q.max: ${filters.quantityMax.trim()}`);
  if (filters.onlyAvailable) parts.push("Solo disponibili");
  return parts;
}

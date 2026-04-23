import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Wine } from "@/types/wine";

const selectBase =
  "min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-0 text-sm text-text outline-none focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200";

export type WineFiltersState = {
  binNumber: string;
  name: string;
  winery: string;
  categoryText: string;
  type: string;
  country: string;
  region: string;
  category: string;
  vintage: string;
  quantityMin: string;
  quantityMax: string;
  onlyAvailable: boolean;
};

type Props = {
  filters: WineFiltersState;
  wines: Wine[];
  onFiltersChange: (next: WineFiltersState) => void;
  onReset: () => void;
};

export function WineFilters({ filters, wines, onFiltersChange, onReset }: Props) {
  const regions = useMemo(
    () => {
      const source = filters.country
        ? wines.filter((wine) => wine.country === filters.country)
        : wines;
      return Array.from(new Set(source.map((wine) => wine.region).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      );
    },
    [wines, filters.country]
  );

  const types = useMemo(
    () =>
      Array.from(new Set(wines.map((wine) => wine.type).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [wines]
  );

  const countries = useMemo(
    () =>
      Array.from(new Set(wines.map((wine) => wine.country).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [wines]
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(wines.map((wine) => wine.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [wines]
  );

  const field = "min-w-0 flex-1 px-2 text-sm";

  return (
    <div className="w-full rounded-[12px] border border-neutral-200 bg-white p-4 shadow-soft">
      <div className="flex w-full flex-nowrap items-center gap-2">
        {/*
          Ordine dei filtri allineato all'ordine delle colonne della tabella:
          Bin · Nome vino · Cantina · Categoria · Vitigno · Annata · Tipologia · Nazione · Regione
        */}
        <Input
          placeholder="Bin"
          value={filters.binNumber}
          onChange={(e) => onFiltersChange({ ...filters, binNumber: e.target.value })}
          className={cn(field, "max-w-[4.5rem] shrink-0")}
        />
        <Input
          placeholder="Nome vino"
          value={filters.name}
          onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
          className={field}
        />
        <Input
          placeholder="Cantina"
          value={filters.winery}
          onChange={(e) => onFiltersChange({ ...filters, winery: e.target.value })}
          className={field}
        />
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
          className={cn(selectBase, "h-10")}
        >
          <option value="">Categoria</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Input
          placeholder="Vitigno"
          value={filters.categoryText}
          onChange={(e) => onFiltersChange({ ...filters, categoryText: e.target.value })}
          className={field}
        />
        <Input
          placeholder="Annata"
          value={filters.vintage}
          onChange={(e) => onFiltersChange({ ...filters, vintage: e.target.value })}
          className={cn(field, "max-w-[4.5rem] shrink-0")}
        />
        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className={cn(selectBase, "h-10")}
        >
          <option value="">Tipologia</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={filters.country}
          onChange={(e) => {
            const nextCountry = e.target.value;
            const resetRegion =
              filters.region &&
              nextCountry &&
              !wines.some(
                (wine) => wine.country === nextCountry && wine.region === filters.region
              );
            onFiltersChange({
              ...filters,
              country: nextCountry,
              region: resetRegion ? "" : filters.region
            });
          }}
          className={cn(selectBase, "h-10")}
        >
          <option value="">Nazione</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        <select
          value={filters.region}
          onChange={(e) => onFiltersChange({ ...filters, region: e.target.value })}
          className={cn(selectBase, "h-10")}
        >
          <option value="">Regione</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <Input
          placeholder="Q.min"
          value={filters.quantityMin}
          onChange={(e) => onFiltersChange({ ...filters, quantityMin: e.target.value })}
          className={cn(field, "max-w-[4rem] shrink-0")}
        />
        <Input
          placeholder="Q.max"
          value={filters.quantityMax}
          onChange={(e) => onFiltersChange({ ...filters, quantityMax: e.target.value })}
          className={cn(field, "max-w-[4rem] shrink-0")}
        />
        <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap pl-1 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => onFiltersChange({ ...filters, onlyAvailable: e.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-neutral-300"
          />
          Solo disp.
        </label>
        <button
          type="button"
          onClick={onReset}
          style={{ backgroundColor: "#dc2626", width: 40, height: 40, padding: 0 }}
          className="ml-2 box-border inline-flex aspect-square shrink-0 items-center justify-center rounded-lg !text-white shadow-sm transition-colors hover:!bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
          aria-label="Reimposta filtri"
          title="Reimposta filtri"
        >
          <RotateCcw className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { countryLabel, wineTypeLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Wine } from "@/types/wine";

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
  const { t, lang } = useI18n();
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

  const field = "h-9 w-40 min-w-[8rem] flex-auto rounded-full border border-line bg-white px-3.5 text-[13px] text-text outline-none transition-colors placeholder:text-neutral-500 hover:border-neutral-300 focus:border-accent/40 focus:ring-2 focus:ring-accent-ring";

  return (
    <div className="w-full">
      <div className="flex w-full flex-wrap items-center gap-2">
        {/*
          Ordine dei filtri allineato all'ordine delle colonne della tabella:
          Bin · Nome vino · Cantina · Categoria · Vitigno · Annata · Tipologia · Nazione · Regione
        */}
        <input
          placeholder={t.wines.col.bin}
          value={filters.binNumber}
          onChange={(e) => onFiltersChange({ ...filters, binNumber: e.target.value })}
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
        <input
          placeholder={t.wines.col.name}
          value={filters.name}
          onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
          className={field}
        />
        <input
          placeholder={t.wines.col.winery}
          value={filters.winery}
          onChange={(e) => onFiltersChange({ ...filters, winery: e.target.value })}
          className={field}
        />
        <FilterSelect
          value={filters.category}
          onChange={(category) => onFiltersChange({ ...filters, category })}
          placeholder={t.wines.col.category}
          options={categories.map((category) => ({ value: category, label: category }))}
        />
        <input
          placeholder={t.wines.col.grape}
          value={filters.categoryText}
          onChange={(e) => onFiltersChange({ ...filters, categoryText: e.target.value })}
          className={field}
        />
        <input
          placeholder={t.wines.col.vintage}
          value={filters.vintage}
          onChange={(e) => onFiltersChange({ ...filters, vintage: e.target.value })}
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
        <FilterSelect
          value={filters.type}
          onChange={(type) => onFiltersChange({ ...filters, type })}
          placeholder={t.wines.col.type}
          options={types.map((type) => ({ value: type, label: wineTypeLabel(type, lang) }))}
        />
        <FilterSelect
          value={filters.country}
          onChange={(nextCountry) => {
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
          placeholder={t.wines.col.country}
          options={countries.map((country) => ({ value: country, label: countryLabel(country, lang) }))}
        />
        <FilterSelect
          value={filters.region}
          onChange={(region) => onFiltersChange({ ...filters, region })}
          placeholder={t.wines.col.region}
          options={regions.map((region) => ({ value: region, label: region }))}
        />
        <input
          placeholder={t.common.qtyMin}
          value={filters.quantityMin}
          onChange={(e) => onFiltersChange({ ...filters, quantityMin: e.target.value })}
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
        <input
          placeholder={t.common.qtyMax}
          value={filters.quantityMax}
          onChange={(e) => onFiltersChange({ ...filters, quantityMax: e.target.value })}
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
        <label className="flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3.5 text-[13px] text-neutral-700 transition-colors hover:border-neutral-300">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => onFiltersChange({ ...filters, onlyAvailable: e.target.checked })}
            className="size-4 shrink-0 rounded border-neutral-300 accent-[#8e2f45]"
          />
          {t.wines.onlyAvailable}
        </label>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-500 transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label={t.common.resetFilters}
          title={t.common.resetFilters}
        >
          <RotateCcw className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

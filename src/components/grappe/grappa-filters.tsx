import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { SPIRIT_TYPE_SUGGESTIONS } from "@/components/grappe/grappa-form-modal";
import type { Wine } from "@/types/wine";

/**
 * Filtri della pagina Distillati.
 * Layout visivo allineato a `WineFilters`: card a piena larghezza con campi
 * in riga e pulsante di reset (quadrato rosso) a destra.
 */

export type GrappaFiltersState = {
  name: string;
  winery: string;
  /** Tipologia selezionata (stringa vuota = nessun filtro). */
  spiritType: string;
  /** Prezzo al bicchiere massimo (stringa, vuota = nessun filtro). */
  pricePerGlassMax: string;
  /** Prezzo bottiglia massimo (stringa, vuota = nessun filtro). */
  priceMax: string;
  /** Quantità minima (stringa, vuota = nessun filtro). */
  quantityMin: string;
  /** Quantità massima (stringa, vuota = nessun filtro). */
  quantityMax: string;
};

export const initialGrappaFilters: GrappaFiltersState = {
  name: "",
  winery: "",
  spiritType: "",
  pricePerGlassMax: "",
  priceMax: "",
  quantityMin: "",
  quantityMax: ""
};

type Props = {
  filters: GrappaFiltersState;
  wines: Wine[];
  onFiltersChange: (next: GrappaFiltersState) => void;
  onReset: () => void;
};

export function GrappaFilters({
  filters,
  wines,
  onFiltersChange,
  onReset
}: Props) {
  const { t } = useI18n();
  const field = "h-9 w-40 min-w-[8rem] flex-auto rounded-full border border-line bg-white px-3.5 text-[13px] text-text outline-none transition-colors placeholder:text-neutral-500 hover:border-neutral-300 focus:border-accent/40 focus:ring-2 focus:ring-accent-ring";

  // Costruisce la lista delle tipologie disponibili: unione dei suggerimenti
  // predefiniti e delle tipologie effettivamente presenti nei dati, più i
  // "raggruppamenti madre" sintetici (es. `Tequila` raggruppa Tequila Blanco /
  // Reposado / Anejo / ...). Ogni opzione riporta `value` (usato per il match)
  // e `label` (mostrato nel dropdown, con suffisso "(tutte)" per i padri).
  const spiritTypeOptions = useMemo(() => {
    const present = new Set<string>();
    for (const w of wines) {
      const t = (w.spiritType ?? "").trim();
      if (t) present.add(t);
    }
    const merged = new Set<string>([
      ...SPIRIT_TYPE_SUGGESTIONS,
      ...present
    ]);
    const leaves = Array.from(merged);

    // Individua i primi-termine condivisi da almeno 2 valori multi-parola che
    // non siano già presenti come valore puro (evita duplicati del tipo
    // "Tequila (tutte)" quando esiste anche "Tequila" da solo).
    const firstWordCount = new Map<string, number>();
    for (const v of leaves) {
      const parts = v.split(/\s+/);
      if (parts.length < 2) continue;
      firstWordCount.set(parts[0], (firstWordCount.get(parts[0]) ?? 0) + 1);
    }
    const parents: string[] = [];
    for (const [word, count] of firstWordCount) {
      if (count >= 2 && !merged.has(word)) parents.push(word);
    }

    const options = [
      ...parents.map((p) => ({ value: p, label: t.spirits.filter.allOf(p) })),
      ...leaves.map((v) => ({ value: v, label: v }))
    ];
    return options.sort((a, b) =>
      a.label.localeCompare(b.label, "it", { sensitivity: "base" })
    );
  }, [wines, t]);

  return (
    <div className="w-full">
      <div className="flex w-full flex-wrap items-center gap-2">
        <input
          placeholder={t.spirits.col.name}
          value={filters.name}
          onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
          className={field}
        />
        <input
          placeholder={t.spirits.col.producer}
          value={filters.winery}
          onChange={(e) =>
            onFiltersChange({ ...filters, winery: e.target.value })
          }
          className={field}
        />
        <FilterSelect
          value={filters.spiritType}
          onChange={(spiritType) => onFiltersChange({ ...filters, spiritType })}
          placeholder={t.spirits.col.type}
          options={spiritTypeOptions}
        />
        <input
          placeholder={t.spirits.filter.glassMax}
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={filters.pricePerGlassMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, pricePerGlassMax: e.target.value })
          }
          className={cn(field, "!w-44 flex-none no-number-spin")}
        />
        <input
          placeholder={t.spirits.filter.bottleMax}
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={filters.priceMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, priceMax: e.target.value })
          }
          className={cn(field, "!w-44 flex-none no-number-spin")}
        />
        <input
          placeholder={t.common.qtyMin}
          value={filters.quantityMin}
          onChange={(e) =>
            onFiltersChange({ ...filters, quantityMin: e.target.value })
          }
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
        <input
          placeholder={t.common.qtyMax}
          value={filters.quantityMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, quantityMax: e.target.value })
          }
          className={cn(field, "!w-[5.5rem] !min-w-0 flex-none")}
        />
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

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const field = "min-w-0 flex-1 px-2 text-sm";

  const selectBase =
    "min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-0 text-sm text-text outline-none focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200";

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
      ...parents.map((p) => ({ value: p, label: `${p} (tutte)` })),
      ...leaves.map((v) => ({ value: v, label: v }))
    ];
    return options.sort((a, b) =>
      a.label.localeCompare(b.label, "it", { sensitivity: "base" })
    );
  }, [wines]);

  return (
    <div className="w-full rounded-[12px] border border-neutral-200 bg-white p-4 shadow-soft">
      <div className="flex w-full flex-nowrap items-center gap-2">
        <Input
          placeholder="Nome distillato"
          value={filters.name}
          onChange={(e) => onFiltersChange({ ...filters, name: e.target.value })}
          className={field}
        />
        <Input
          placeholder="Produttore"
          value={filters.winery}
          onChange={(e) =>
            onFiltersChange({ ...filters, winery: e.target.value })
          }
          className={field}
        />
        <select
          value={filters.spiritType}
          onChange={(e) =>
            onFiltersChange({ ...filters, spiritType: e.target.value })
          }
          className={cn(selectBase, "h-10")}
        >
          <option value="">Tipologia</option>
          {spiritTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Prezzo bicch. max"
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={filters.pricePerGlassMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, pricePerGlassMax: e.target.value })
          }
          className={cn(field, "max-w-[11rem] shrink-0 no-number-spin")}
        />
        <Input
          placeholder="Prezzo bott. max"
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={filters.priceMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, priceMax: e.target.value })
          }
          className={cn(field, "max-w-[11rem] shrink-0 no-number-spin")}
        />
        <Input
          placeholder="Q.min"
          value={filters.quantityMin}
          onChange={(e) =>
            onFiltersChange({ ...filters, quantityMin: e.target.value })
          }
          className={cn(field, "max-w-[4rem] shrink-0")}
        />
        <Input
          placeholder="Q.max"
          value={filters.quantityMax}
          onChange={(e) =>
            onFiltersChange({ ...filters, quantityMax: e.target.value })
          }
          className={cn(field, "max-w-[4rem] shrink-0")}
        />
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

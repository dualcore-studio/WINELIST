"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ITALIAN_REGIONS } from "@/constants/italian-regions";
import type { Wine, WineCategory, WineType } from "@/types/wine";
import type { WineInput } from "@/features/wines/repository";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  wine: Wine | null;
  /** Elenco aggiornato da InstantDB: unicità Bin calcolata solo su questi record. */
  wines: Wine[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: WineInput) => Promise<void>;
  /** Sostantivo mostrato nei titoli/CTA (es. "vino", "distillato"). Default: "vino". */
  itemNoun?: string;
};

const BIN_DUPLICATE_MESSAGE =
  "Bin Number già in uso. Scegline uno libero o elimina il vino che lo occupa.";

/** Bin ≤ 0 = non assegnato; nessun vincolo di unicità. */
function isBinNumberTaken(bin: number, wines: Wine[], excludeWineId?: string): boolean {
  if (bin <= 0) return false;
  return wines.some((w) => w.binNumber === bin && w.id !== excludeWineId);
}

const WINE_TYPES: WineType[] = [
  "Rosso",
  "Bianco",
  "Rosato",
  "Bollicine",
  "Dolce",
  "Fortificato"
];

const WINE_CATEGORIES: WineCategory[] = [
  "DOCG",
  "DOC",
  "IGT",
  "DOP",
  "IGP",
  "VdT",
  "AOC",
  "AVA",
  "Riserva"
];

const NATIONS = ["Italia", "Francia", "Stati Uniti"] as const;

const FRENCH_REGIONS = [
  "Bordeaux",
  "Borgogna",
  "Valle del Rodano",
  "Champagne",
  "Loira",
  "Alsazia",
  "Provenza",
  "Languedoc-Roussillon"
] as const;

const US_REGIONS = ["California", "Oregon", "Washington", "New York", "Virginia"] as const;

/** Valore vuoto = nessun paese selezionato (regione disabilitata). */
const NATION_PLACEHOLDER = "";
const TYPE_PLACEHOLDER = "";
const CATEGORY_PLACEHOLDER = "";

const NATION_OPTIONS: readonly string[] = [NATION_PLACEHOLDER, ...NATIONS];
const TYPE_OPTIONS: readonly string[] = [TYPE_PLACEHOLDER, ...WINE_TYPES];
const CATEGORY_OPTIONS: readonly string[] = [CATEGORY_PLACEHOLDER, ...WINE_CATEGORIES];

function nationLabel(value: string): string {
  return value === NATION_PLACEHOLDER ? "— Seleziona nazione —" : value;
}

function typeLabel(value: string): string {
  return value === TYPE_PLACEHOLDER ? "— Seleziona tipologia —" : value;
}

function categoryLabel(value: string): string {
  return value === CATEGORY_PLACEHOLDER ? "— Seleziona categoria —" : value;
}

function isItaly(country: string): boolean {
  return country.trim().toLowerCase() === "italia";
}

function isFrance(country: string): boolean {
  return country.trim().toLowerCase() === "francia";
}

function isUnitedStates(country: string): boolean {
  return country.trim().toLowerCase() === "stati uniti";
}

function regionsForNation(country: string): readonly string[] {
  if (isItaly(country)) return ITALIAN_REGIONS;
  if (isFrance(country)) return FRENCH_REGIONS;
  if (isUnitedStates(country)) return US_REGIONS;
  return [];
}

type FormState = Omit<WineInput, "type" | "category" | "binNumber"> & {
  type: WineType | "";
  category: WineCategory | "";
  binNumber: number | "";
};

const initialState: FormState = {
  name: "",
  winery: "",
  type: "",
  category: "",
  grape: "",
  region: "",
  country: "",
  binNumber: "",
  vintage: new Date().getFullYear(),
  price: 0,
  quantity: 1,
  isAvailable: true
};

function nationChoices(current: string): string[] {
  const base = [...NATION_OPTIONS];
  if (current && !base.includes(current)) base.push(current);
  return base;
}

export function WineFormModal({
  open,
  mode,
  wine,
  wines,
  isSaving,
  onClose,
  onSubmit,
  itemNoun = "vino"
}: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const binInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && wine) {
      setForm({
        name: wine.name,
        winery: wine.winery,
        type: wine.type,
        category: wine.category,
        grape: wine.grape,
        region: wine.region,
        country: wine.country,
        binNumber: wine.binNumber,
        vintage: wine.vintage,
        price: wine.price,
        quantity: wine.isAvailable ? wine.quantity : 0,
        isAvailable: wine.isAvailable
      });
    } else {
      setForm(initialState);
    }
    setError(null);
  }, [open, mode, wine]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    const t = window.setTimeout(() => binInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, mode]);

  const title = useMemo(
    () => (mode === "create" ? `Aggiungi ${itemNoun}` : `Modifica ${itemNoun}`),
    [mode, itemNoun]
  );

  const nationOptions = useMemo(() => nationChoices(form.country), [form.country]);

  const hasCountry = Boolean(form.country.trim());

  const regionOptions = useMemo(() => {
    if (!hasCountry) return [] as string[];
    const canonical = regionsForNation(form.country);
    const r = form.region.trim();
    if (canonical.length === 0) {
      return r ? [r] : [];
    }
    const canon = canonical as readonly string[];
    const list: string[] = [...canonical];
    if (r && !canon.includes(r)) list.unshift(r);
    return list;
  }, [form.country, form.region, hasCountry]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.country.trim()) {
      setError("Seleziona una nazione.");
      return;
    }
    if (!form.type.trim()) {
      setError("Seleziona una tipologia.");
      return;
    }
    if (!form.name.trim() || !form.winery.trim() || !form.region.trim()) {
      setError("Compila nome, cantina e regione.");
      return;
    }
    if (Number.isNaN(form.vintage) || form.vintage < 1900 || form.vintage > 2100) {
      setError("Inserisci un'annata valida.");
      return;
    }
    if (Number.isNaN(form.price) || form.price < 0) {
      setError("Inserisci un prezzo valido.");
      return;
    }
    const binResolved = form.binNumber === "" ? 0 : Number(form.binNumber);
    if (Number.isNaN(binResolved) || binResolved < 0) {
      setError("Inserisci un Bin Number valido (minimo 0).");
      return;
    }
    const excludeId = mode === "edit" && wine ? wine.id : undefined;
    if (isBinNumberTaken(binResolved, wines, excludeId)) {
      setError(BIN_DUPLICATE_MESSAGE);
      return;
    }
    const quantity = form.isAvailable ? form.quantity : 0;
    if (form.isAvailable && (Number.isNaN(quantity) || quantity < 0)) {
      setError("Inserisci una quantità valida (minimo 0).");
      return;
    }

    try {
      await onSubmit({
        ...form,
        type: form.type as WineType,
        category: (form.category.trim() ? form.category : "") as WineCategory | "",
        name: form.name.trim(),
        winery: form.winery.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        binNumber: binResolved,
        grape: form.grape.trim(),
        quantity
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Operazione non riuscita. Riprova.";
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-text">{title}</h4>
          <p className="text-sm text-neutral-500">
            Gestisci i dati del {itemNoun} selezionato.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="wine-bin">
                Bin Number
              </label>
              <Input
                ref={binInputRef}
                id="wine-bin"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="no-number-spin"
                value={form.binNumber === "" ? "" : form.binNumber}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setForm((prev) => ({ ...prev, binNumber: "" }));
                    return;
                  }
                  const n = Number(v);
                  if (!Number.isNaN(n)) {
                    setForm((prev) => ({ ...prev, binNumber: n }));
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="wine-type">
                Tipologia
              </label>
              <SearchableSelect
                id="wine-type"
                value={form.type.trim() ? form.type : TYPE_PLACEHOLDER}
                options={TYPE_OPTIONS}
                getOptionLabel={typeLabel}
                onChange={(type) =>
                  setForm((prev) => ({ ...prev, type: type as WineType | "" }))
                }
                allowCustom
                placeholder="Cerca tipologia…"
                aria-required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="wine-category">
                Categoria
              </label>
              <SearchableSelect
                id="wine-category"
                value={form.category.trim() ? form.category : CATEGORY_PLACEHOLDER}
                options={CATEGORY_OPTIONS}
                getOptionLabel={categoryLabel}
                onChange={(category) =>
                  setForm((prev) => ({ ...prev, category: category as WineCategory | "" }))
                }
                allowCustom
                placeholder="Cerca categoria…"
                aria-required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="wine-country">
                Nazione
              </label>
              <SearchableSelect
                id="wine-country"
                value={form.country.trim() ? form.country : NATION_PLACEHOLDER}
                options={nationOptions}
                getOptionLabel={nationLabel}
                onChange={(country) => {
                  setForm((prev) => ({
                    ...prev,
                    country,
                    region: prev.country.trim() !== country.trim() ? "" : prev.region
                  }));
                }}
                allowCustom
                placeholder="Cerca nazione…"
                aria-required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700" htmlFor="wine-region">
                Regione
              </label>
              {hasCountry ? (
                <SearchableSelect
                  id="wine-region"
                  value={form.region}
                  options={regionOptions}
                  onChange={(region) => setForm((prev) => ({ ...prev, region }))}
                  allowCustom
                  placeholder="Cerca regione…"
                  aria-required
                />
              ) : (
                <p
                  id="wine-region"
                  className="flex h-10 items-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500"
                >
                  Seleziona prima una nazione
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="wine-grape">
              Vitigno
            </label>
            <Input
              id="wine-grape"
              value={form.grape}
              onChange={(e) => setForm((prev) => ({ ...prev, grape: e.target.value }))}
              placeholder="es. Sangiovese, Chardonnay…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Cantina</label>
              <Input
                value={form.winery}
                onChange={(e) => setForm((prev) => ({ ...prev, winery: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Nome vino</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({
                  ...prev,
                  isAvailable: checked,
                  quantity: checked ? (prev.quantity > 0 ? prev.quantity : 1) : 0
                }));
              }}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Disponibile
          </label>

          <div
            className={`grid gap-3 ${form.isAvailable ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Annata</label>
              <Input
                type="number"
                inputMode="numeric"
                className="no-number-spin"
                value={form.vintage}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vintage: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Prezzo</label>
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                className="no-number-spin"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: Number(e.target.value) }))
                }
              />
            </div>
            {form.isAvailable ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700" htmlFor="wine-quantity">
                  Quantità
                </label>
                <Input
                  id="wine-quantity"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="no-number-spin"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                  }
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Salvataggio..."
                : mode === "create"
                  ? `Crea ${itemNoun}`
                  : "Salva modifiche"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

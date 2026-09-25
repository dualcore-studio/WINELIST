"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter, SideDrawer } from "@/components/ui/side-drawer";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ITALIAN_REGIONS } from "@/constants/italian-regions";
import { countryLabel, wineTypeLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { binKey, formatVintage, type Wine, type WineCategory, type WineType } from "@/types/wine";
import type { WineInput } from "@/features/wines/repository";
import {
  emptyStockForm,
  parseStockForm,
  StockFields,
  stockFormFrom,
  type StockFormState
} from "@/components/stock/stock-fields";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  wine: Wine | null;
  /** Elenco aggiornato da InstantDB: unicità Bin calcolata solo su questi record. */
  wines: Wine[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: WineInput) => Promise<void>;
};

function isBinNumberTaken(bin: string, wines: Wine[], excludeWineId?: string): boolean {
  const key = binKey(bin);
  if (!key) return false;
  return wines.some((w) => binKey(w.binNumber) === key && w.id !== excludeWineId);
}

/** Annata dal campo di testo: anno, "NV" (0) o vuoto (null). Undefined se non valida. */
function parseVintage(raw: string): number | null | undefined {
  const v = raw.trim();
  if (!v) return null;
  if (/^nv$/i.test(v)) return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) return undefined;
  return n;
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

type FormState = Omit<WineInput, "type" | "category" | "vintage" | "pricePerGlass"> & {
  type: WineType | "";
  category: WineCategory | "";
  vintage: string;
  pricePerGlass: number | "";
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
  vintage: String(new Date().getFullYear()),
  price: 0,
  pricePerGlass: "",
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
  onSubmit
}: Props) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState<FormState>(initialState);
  const [stockForm, setStockForm] = useState<StockFormState>(emptyStockForm);
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
        vintage: formatVintage(wine.vintage),
        price: wine.price,
        pricePerGlass: wine.pricePerGlass ?? "",
        quantity: wine.isAvailable ? wine.quantity : 0,
        isAvailable: wine.isAvailable
      });
    } else {
      setForm(initialState);
    }
    setStockForm(stockFormFrom(mode === "edit" ? wine : null));
    setError(null);
  }, [open, mode, wine]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    const timer = window.setTimeout(() => binInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const title = mode === "create" ? t.wines.form.createTitle : t.wines.form.editTitle;

  // Etichette nella lingua scelta; i valori salvati restano in italiano.
  const nationLabel = useCallback(
    (value: string) => (value === NATION_PLACEHOLDER ? t.wines.form.selectCountry : countryLabel(value, lang)),
    [t, lang]
  );
  const typeLabel = useCallback(
    (value: string) => (value === TYPE_PLACEHOLDER ? t.wines.form.selectType : wineTypeLabel(value, lang)),
    [t, lang]
  );
  const categoryLabel = useCallback(
    (value: string) => (value === CATEGORY_PLACEHOLDER ? t.wines.form.selectCategory : value),
    [t]
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
      setError(t.wines.form.errCountry);
      return;
    }
    if (!form.type.trim()) {
      setError(t.wines.form.errType);
      return;
    }
    if (!form.name.trim()) {
      setError(t.wines.form.errName);
      return;
    }
    const vintage = parseVintage(form.vintage);
    if (vintage === undefined) {
      setError(t.wines.form.errVintage);
      return;
    }
    if (Number.isNaN(form.price) || form.price < 0) {
      setError(t.wines.form.errPrice);
      return;
    }
    if (form.pricePerGlass !== "" && (Number.isNaN(form.pricePerGlass) || form.pricePerGlass < 0)) {
      setError(t.wines.form.errGlassPrice);
      return;
    }
    const binResolved = form.binNumber.trim().replace(/\s+/g, " ");
    const excludeId = mode === "edit" && wine ? wine.id : undefined;
    if (isBinNumberTaken(binResolved, wines, excludeId)) {
      setError(t.wines.form.binTaken);
      return;
    }
    const quantity = form.isAvailable ? form.quantity : 0;
    if (form.isAvailable && (Number.isNaN(quantity) || quantity < 0)) {
      setError(t.wines.form.errQuantity);
      return;
    }
    const stock = parseStockForm(stockForm, t);
    if (typeof stock === "string") {
      setError(stock);
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
        vintage,
        pricePerGlass: form.pricePerGlass === "" ? undefined : form.pricePerGlass,
        grape: form.grape.trim(),
        quantity,
        ...stock
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.common.operationFailed;
      setError(message);
    }
  }

  return (
    <SideDrawer title={title} subtitle={t.wines.form.subtitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DrawerBody>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-bin">
                {t.wines.form.binLabel}
              </label>
              <Input
                ref={binInputRef}
                id="wine-bin"
                type="text"
                placeholder={t.wines.form.binPlaceholder}
                value={form.binNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, binNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-type">
                {t.wines.col.type}
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
                placeholder={t.wines.form.searchType}
                aria-required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-category">
                {t.wines.col.category}
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
                placeholder={t.wines.form.searchCategory}
                aria-required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-country">
                {t.wines.col.country}
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
                placeholder={t.wines.form.searchCountry}
                aria-required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-region">
                {t.wines.col.region}
              </label>
              {hasCountry ? (
                <SearchableSelect
                  id="wine-region"
                  value={form.region}
                  options={regionOptions}
                  onChange={(region) => setForm((prev) => ({ ...prev, region }))}
                  allowCustom
                  placeholder={t.wines.form.searchRegion}
                  aria-required
                />
              ) : (
                <p
                  id="wine-region"
                  className="flex h-10 items-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500"
                >
                  {t.wines.form.selectCountryFirst}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-grape">
              {t.wines.col.grape}
            </label>
            <Input
              id="wine-grape"
              value={form.grape}
              onChange={(e) => setForm((prev) => ({ ...prev, grape: e.target.value }))}
              placeholder={t.wines.form.grapePlaceholder}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700">{t.wines.col.winery}</label>
              <Input
                value={form.winery}
                onChange={(e) => setForm((prev) => ({ ...prev, winery: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700">{t.wines.col.name}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-neutral-700">
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
            {t.wines.form.available}
          </label>

          <div
            className={`grid gap-3 ${form.isAvailable ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
          >
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700">{t.wines.col.vintage}</label>
              <Input
                type="text"
                placeholder={t.wines.form.vintagePlaceholder}
                value={form.vintage}
                onChange={(e) => setForm((prev) => ({ ...prev, vintage: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700">{t.wines.col.price}</label>
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
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-700">{t.wines.col.glassPrice}</label>
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                className="no-number-spin"
                placeholder="—"
                value={form.pricePerGlass}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pricePerGlass: e.target.value === "" ? "" : Number(e.target.value)
                  }))
                }
              />
            </div>
            {form.isAvailable ? (
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-neutral-700" htmlFor="wine-quantity">
                  {t.wines.form.quantity}
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

          <StockFields idPrefix="wine" value={stockForm} onChange={setStockForm} />

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? t.common.saving
              : mode === "create"
                ? t.wines.form.create
                : t.common.saveChanges}
          </Button>
        </DrawerFooter>
      </form>
    </SideDrawer>
  );
}

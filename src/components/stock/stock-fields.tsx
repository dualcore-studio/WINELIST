"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_WINES_COLLECTION, SPIRITS_COLLECTION, useWines } from "@/features/wines/repository";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

/** Campi scorta del modulo, come testo: vuoto = non impostato. */
export type StockFormState = { minStock: string; targetStock: string; supplier: string };

export const emptyStockForm: StockFormState = { minStock: "", targetStock: "", supplier: "" };

export function stockFormFrom(item: Wine | null): StockFormState {
  if (!item) return emptyStockForm;
  return {
    minStock: item.minStock === null ? "" : String(item.minStock),
    targetStock: item.targetStock === null ? "" : String(item.targetStock),
    supplier: item.supplier
  };
}

export type StockValues = { minStock: number | null; targetStock: number | null; supplier: string };

function parseCount(raw: string): number | null | undefined {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Valori da salvare, oppure il messaggio d'errore. */
export function parseStockForm(form: StockFormState, t: Dictionary): StockValues | string {
  const minStock = parseCount(form.minStock);
  if (minStock === undefined) return t.stock.errMin;
  const targetStock = parseCount(form.targetStock);
  if (targetStock === undefined || (targetStock !== null && minStock !== null && targetStock <= minStock)) {
    return t.stock.errTarget;
  }
  return { minStock, targetStock, supplier: form.supplier.trim().replace(/\s+/g, " ") };
}

/** Fornitori già usati su vini e distillati, per suggerirli nei campi. */
export function useSuppliers(): string[] {
  const { wines } = useWines(DEFAULT_WINES_COLLECTION);
  const { wines: spirits } = useWines(SPIRITS_COLLECTION);
  return useMemo(
    () =>
      Array.from(new Set([...wines, ...spirits].map((w) => w.supplier).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [wines, spirits]
  );
}

type Props = {
  idPrefix: string;
  value: StockFormState;
  onChange: (next: StockFormState) => void;
};

/** Sezione "Scorte" dei moduli vino e distillato. */
export function StockFields({ idPrefix, value, onChange }: Props) {
  const { t } = useI18n();
  const suppliers = useSuppliers();
  const supplierOptions = useMemo(() => {
    const v = value.supplier.trim();
    return v && !suppliers.includes(v) ? [v, ...suppliers] : suppliers;
  }, [suppliers, value.supplier]);

  const label = "text-[13px] font-semibold text-neutral-700";
  const hint = "text-xs text-muted";

  return (
    <fieldset className="space-y-3 rounded-xl border border-line bg-canvas/60 p-4">
      <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-neutral-600">
        {t.stock.section}
      </legend>
      <p className={hint}>{t.stock.sectionHint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={label} htmlFor={`${idPrefix}-min-stock`}>
            {t.stock.minStock}
          </label>
          <Input
            id={`${idPrefix}-min-stock`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="no-number-spin"
            placeholder="—"
            value={value.minStock}
            onChange={(e) => onChange({ ...value, minStock: e.target.value })}
          />
          <p className={hint}>{t.stock.minHint}</p>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor={`${idPrefix}-target-stock`}>
            {t.stock.targetStock}
          </label>
          <Input
            id={`${idPrefix}-target-stock`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="no-number-spin"
            placeholder="—"
            value={value.targetStock}
            onChange={(e) => onChange({ ...value, targetStock: e.target.value })}
          />
          <p className={hint}>{t.stock.targetHint}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor={`${idPrefix}-supplier`}>
          {t.stock.supplier}
        </label>
        <SearchableSelect
          id={`${idPrefix}-supplier`}
          value={value.supplier}
          options={supplierOptions}
          onChange={(supplier) => onChange({ ...value, supplier })}
          allowCustom
          placeholder={t.stock.supplierPlaceholder}
        />
      </div>
    </fieldset>
  );
}

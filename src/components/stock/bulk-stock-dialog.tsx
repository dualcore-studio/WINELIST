"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useSuppliers } from "@/components/stock/stock-fields";
import { isTracked } from "@/features/stock/stock";
import { updateWines, type WineInput } from "@/features/wines/repository";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

type Props = {
  /** Articoli della lista attuale (filtri compresi). */
  items: readonly Wine[];
  onClose: () => void;
};

function parseCount(raw: string): number | null | undefined {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Scorta minima, ideale e fornitore su tutti gli articoli della lista filtrata in un colpo. */
export function BulkStockDialog({ items, onClose }: Props) {
  const { t } = useI18n();
  const tb = t.stock.bulk;
  const suppliers = useSuppliers();
  const [minStock, setMinStock] = useState("");
  const [targetStock, setTargetStock] = useState("");
  const [supplier, setSupplier] = useState("");
  const [untrack, setUntrack] = useState(false);
  const [onlyUntracked, setOnlyUntracked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targets = onlyUntracked ? items.filter((w) => !isTracked(w)) : items;

  async function apply() {
    setError(null);
    const min = parseCount(minStock);
    if (min === undefined) return setError(t.stock.errMin);
    const target = parseCount(targetStock);
    if (target === undefined || (target !== null && min !== null && target <= min)) {
      return setError(t.stock.errTarget);
    }
    const patch: Partial<WineInput> = {};
    if (untrack) {
      patch.minStock = null;
      patch.targetStock = null;
    } else {
      if (min !== null) patch.minStock = min;
      if (target !== null) patch.targetStock = target;
    }
    if (supplier.trim()) patch.supplier = supplier.trim().replace(/\s+/g, " ");
    if (Object.keys(patch).length === 0) return setError(tb.nothing);
    if (targets.length === 0) return setError(tb.none);

    setSaving(true);
    try {
      await updateWines(
        targets.map((w) => w.id),
        patch
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const label = "text-[13px] font-semibold text-neutral-700";

  return (
    <Modal
      title={tb.title}
      subtitle={
        <>
          {tb.subtitle(targets.length)} {tb.keepHint}
        </>
      }
      onClose={onClose}
      onSubmit={() => void apply()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving || targets.length === 0}>
            {saving ? t.common.saving : tb.apply(targets.length)}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className={label} htmlFor="bulk-min">
            {t.stock.minStock}
          </label>
          <Input
            id="bulk-min"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="no-number-spin"
            placeholder="—"
            value={minStock}
            disabled={untrack}
            onChange={(e) => setMinStock(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="bulk-target">
            {t.stock.targetStock}
          </label>
          <Input
            id="bulk-target"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="no-number-spin"
            placeholder="—"
            value={targetStock}
            disabled={untrack}
            onChange={(e) => setTargetStock(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={label} htmlFor="bulk-supplier">
          {t.stock.supplier}
        </label>
        <SearchableSelect
          id="bulk-supplier"
          value={supplier}
          options={supplier && !suppliers.includes(supplier) ? [supplier, ...suppliers] : suppliers}
          onChange={setSupplier}
          allowCustom
          placeholder={t.stock.supplierPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700">
          <input
            type="checkbox"
            checked={onlyUntracked}
            onChange={(e) => setOnlyUntracked(e.target.checked)}
            className="size-4"
          />
          {tb.onlyUntracked}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700">
          <input type="checkbox" checked={untrack} onChange={(e) => setUntrack(e.target.checked)} className="size-4" />
          {tb.untrack}
        </label>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </Modal>
  );
}

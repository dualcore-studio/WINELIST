"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/lib/i18n/provider";

type Props = {
  title: string;
  /** Nome dell'articolo, sotto il titolo. */
  itemLabel: string;
  label: string;
  hint?: string;
  defaultValue: number | null;
  confirmLabel: string;
  onConfirm: (qty: number) => Promise<void>;
  onClose: () => void;
};

/** Chiede una quantità (ordinata o arrivata) e conferma. */
export function QuantityDialog({
  title,
  itemLabel,
  label,
  hint,
  defaultValue,
  confirmLabel,
  onConfirm,
  onClose
}: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState(defaultValue ? String(defaultValue) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const qty = Number(value);
    if (!Number.isInteger(qty) || qty < 1) return setError(t.stock.dashboard.errQty);
    setSaving(true);
    setError(null);
    try {
      await onConfirm(qty);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailed);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={<span className="font-semibold text-text">{itemLabel}</span>}
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t.common.saving : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-neutral-700" htmlFor="qty-dialog-input">
          {label}
        </label>
        <Input
          id="qty-dialog-input"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="no-number-spin"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </Modal>
  );
}

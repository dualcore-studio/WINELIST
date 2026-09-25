"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { applyMovement, OUTGOING_REASONS, type MovementReason } from "@/features/stock/movements";
import { stockQuantity } from "@/features/stock/stock";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

/** Motivi scelti a mano ("Arrivo ordine" si registra dalla dashboard). */
const MANUAL_REASONS: MovementReason[] = ["sale", "load", "breakage", "internal", "inventory"];

type Props = {
  item: Wine;
  collection: string;
  username: string;
  onClose: () => void;
};

/**
 * Movimento con motivo: per vendita, rottura e uso interno si indicano le bottiglie uscite,
 * per il carico quelle entrate, per la rettifica la quantità contata in cantina.
 */
export function MovementDialog({ item, collection, username, onClose }: Props) {
  const { t } = useI18n();
  const tm = t.stock.movements;
  const before = stockQuantity(item);
  const [reason, setReason] = useState<MovementReason>("sale");
  const [value, setValue] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isInventory = reason === "inventory";
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(n) && (isInventory ? n >= 0 : n >= 1);
  const after = !valid ? null : isInventory ? n : OUTGOING_REASONS.includes(reason) ? before - n : before + n;

  function chooseReason(next: MovementReason) {
    setReason(next);
    setError(null);
    // Per la rettifica si parte dalla quantità attuale, per gli altri da una bottiglia.
    setValue(next === "inventory" ? String(before) : "1");
  }

  async function submit() {
    if (!valid || after === null) return setError(isInventory ? tm.errCounted : tm.errBottles);
    if (after < 0) return setError(tm.errNotEnough(before));
    setSaving(true);
    setError(null);
    try {
      await applyMovement({ item, collection, qtyAfter: after, reason, note, username });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailed);
      setSaving(false);
    }
  }

  const label = "text-[13px] font-semibold text-neutral-700";

  return (
    <Modal
      title={tm.dialogTitle}
      subtitle={<span className="font-semibold text-text">{item.name}</span>}
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t.common.saving : tm.confirm}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <div className={label}>{tm.reasonLabel}</div>
        <div role="radiogroup" aria-label={tm.reasonLabel} className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-canvas p-1">
          {MANUAL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => chooseReason(r)}
              className={clsx(
                "h-8 rounded-md px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                r === "inventory" && "col-span-2",
                reason === r ? "bg-accent text-white shadow-sm" : "text-neutral-600 hover:bg-white hover:text-text"
              )}
            >
              {tm.reason[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="movement-qty">
          {isInventory ? tm.counted : tm.bottles}
        </label>
        <Input
          id="movement-qty"
          type="number"
          min={isInventory ? 0 : 1}
          step={1}
          inputMode="numeric"
          className="no-number-spin"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className={clsx("text-xs", after !== null && after < 0 ? "text-red-700" : "text-muted")}>
          {tm.preview(before, after ?? before)}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className={label} htmlFor="movement-note">
          {tm.note}
        </label>
        <Input
          id="movement-note"
          value={note}
          placeholder={tm.notePlaceholder}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </Modal>
  );
}

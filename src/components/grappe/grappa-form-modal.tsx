"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";
import type { WineInput } from "@/features/wines/repository";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  wine: Wine | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: WineInput) => Promise<void>;
};

/**
 * Valori di default applicati ai campi non esposti nel form "grappa".
 * Servono a soddisfare lo schema condiviso con la winelist (i record vivono
 * nella stessa entità `wines` con `collectionTag = "grappeDistillati"`).
 */
const DEFAULTS = {
  type: "Fortificato" as const,
  category: "" as const,
  grape: "",
  region: "—",
  country: "Italia",
  binNumber: "",
  quantity: 1,
  isAvailable: true
};

type FormState = {
  name: string;
  winery: string;
  /** Tipologia libera (es. Grappa, Cognac, Whisky). Vuoto = non specificata. */
  spiritType: string;
  /** Prezzo al bicchiere: stringa; vuoto = non disponibile al bicchiere. */
  pricePerGlass: string;
  /** Prezzo bottiglia: stringa per consentire il campo vuoto in editing. */
  price: string;
  /** Quantità bottiglie in stock. */
  quantity: string;
};

const emptyForm: FormState = {
  name: "",
  winery: "",
  spiritType: "",
  pricePerGlass: "",
  price: "",
  quantity: "1"
};

/** Suggerimenti per la tipologia (datalist): l'utente può comunque scriverne uno nuovo. */
export const SPIRIT_TYPE_SUGGESTIONS = [
  "Grappa",
  "Cognac",
  "Armagnac",
  "Brandy",
  "Whisky",
  "Rum",
  "Vodka",
  "Gin",
  "Tequila",
  "Mezcal",
  "Calvados",
  "Liquore",
  "Amaro",
  "Acquavite"
] as const;

export function GrappaFormModal({
  open,
  mode,
  wine,
  isSaving,
  onClose,
  onSubmit
}: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && wine) {
      setForm({
        name: wine.name,
        winery: wine.winery,
        spiritType: wine.spiritType ?? "",
        price: String(wine.price ?? 0),
        pricePerGlass:
          wine.pricePerGlass === undefined || wine.pricePerGlass === null
            ? ""
            : String(wine.pricePerGlass),
        quantity: String(
          Number.isFinite(Number(wine.quantity)) ? wine.quantity : 0
        )
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, mode, wine]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const title = mode === "create" ? t.spirits.form.createTitle : t.spirits.form.editTitle;

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const winery = form.winery.trim();
    const spiritTypeRaw = form.spiritType.trim();
    const spiritTypeValue = spiritTypeRaw === "" ? undefined : spiritTypeRaw;
    const priceValue = Number(form.price);
    const pricePerGlassRaw = form.pricePerGlass.trim();
    const pricePerGlassValue =
      pricePerGlassRaw === "" ? undefined : Number(pricePerGlassRaw);
    const quantityRaw = form.quantity.trim();
    const quantityValue =
      quantityRaw === "" ? 0 : Math.trunc(Number(quantityRaw));

    if (!name) {
      setError(t.spirits.form.errName);
      return;
    }
    if (!winery) {
      setError(t.spirits.form.errProducer);
      return;
    }
    if (
      form.price.trim() === "" ||
      Number.isNaN(priceValue) ||
      priceValue < 0
    ) {
      setError(t.spirits.form.errBottlePrice);
      return;
    }
    if (
      pricePerGlassValue !== undefined &&
      (Number.isNaN(pricePerGlassValue) || pricePerGlassValue < 0)
    ) {
      setError(t.spirits.form.errGlassPrice);
      return;
    }
    if (Number.isNaN(quantityValue) || quantityValue < 0) {
      setError(t.spirits.form.errQuantity);
      return;
    }

    const isAvailable = quantityValue > 0;

    try {
      if (mode === "edit" && wine) {
        // In edit preserva gli eventuali valori esistenti per i campi non esposti.
        await onSubmit({
          name,
          winery,
          spiritType: spiritTypeValue,
          price: priceValue,
          pricePerGlass: pricePerGlassValue,
          type: wine.type || DEFAULTS.type,
          category: wine.category ?? DEFAULTS.category,
          grape: wine.grape ?? DEFAULTS.grape,
          region: wine.region || DEFAULTS.region,
          country: wine.country || DEFAULTS.country,
          binNumber: wine.binNumber ?? DEFAULTS.binNumber,
          vintage: wine.vintage,
          quantity: quantityValue,
          isAvailable
        });
      } else {
        await onSubmit({
          name,
          winery,
          spiritType: spiritTypeValue,
          price: priceValue,
          pricePerGlass: pricePerGlassValue,
          type: DEFAULTS.type,
          category: DEFAULTS.category,
          grape: DEFAULTS.grape,
          region: DEFAULTS.region,
          country: DEFAULTS.country,
          binNumber: DEFAULTS.binNumber,
          vintage: null,
          quantity: quantityValue,
          isAvailable
        });
      }
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.common.operationFailed;
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-text">{title}</h4>
          <p className="text-sm text-neutral-500">
            {t.spirits.form.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor="grappa-name"
            >
              {t.spirits.form.name}
            </label>
            <Input
              id="grappa-name"
              ref={firstFieldRef}
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t.spirits.form.namePlaceholder}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor="grappa-producer"
            >
              {t.spirits.form.producer}
            </label>
            <Input
              id="grappa-producer"
              value={form.winery}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, winery: e.target.value }))
              }
              placeholder={t.spirits.form.producerPlaceholder}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor="grappa-spirit-type"
            >
              {t.spirits.form.type}
            </label>
            <Input
              id="grappa-spirit-type"
              list="grappa-spirit-type-options"
              value={form.spiritType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, spiritType: e.target.value }))
              }
              placeholder={t.spirits.form.typePlaceholder}
              autoComplete="off"
            />
            <datalist id="grappa-spirit-type-options">
              {SPIRIT_TYPE_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="grappa-price-glass"
              >
                {t.spirits.form.glassPrice}
              </label>
              <Input
                id="grappa-price-glass"
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                className="no-number-spin"
                value={form.pricePerGlass}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pricePerGlass: e.target.value
                  }))
                }
                placeholder="8"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="grappa-price"
              >
                {t.spirits.form.bottlePrice}
              </label>
              <Input
                id="grappa-price"
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                className="no-number-spin"
                value={form.price}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="45"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-neutral-700"
                htmlFor="grappa-quantity"
              >
                {t.spirits.form.quantity}
              </label>
              <Input
                id="grappa-quantity"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="no-number-spin"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                placeholder="6"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={onClose}
              type="button"
              disabled={isSaving}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t.common.saving
                : mode === "create"
                  ? t.spirits.form.create
                  : t.common.saveChanges}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { saveCurrency, useCurrency } from "@/features/settings/currency";
import { CURRENCIES, CURRENCY_SYMBOL, type Currency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n/provider";

/** Riquadro delle Impostazioni: scelta della valuta (solo simbolo, nessuna conversione). */
export function CurrencyPanel() {
  const { t } = useI18n();
  const currency = useCurrency();
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Currency) {
    if (next === currency) return;
    setError(null);
    try {
      await saveCurrency(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.saveFailed);
    }
  }

  const labels: Record<Currency, string> = { USD: t.settings.currency.usd, EUR: t.settings.currency.eur };

  return (
    <section className="mt-8 rounded-xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-base font-semibold text-text">{t.settings.currency.title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t.settings.currency.description}</p>

      <div
        role="radiogroup"
        aria-label={t.settings.currency.title}
        className="mt-5 inline-flex rounded-lg border border-line bg-canvas p-1"
      >
        {CURRENCIES.map((c) => {
          const active = c === currency;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void choose(c)}
              className={clsx(
                "inline-flex h-8 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                active ? "bg-accent text-white shadow-sm" : "text-neutral-600 hover:text-text"
              )}
            >
              <span className="text-base leading-none">{CURRENCY_SYMBOL[c]}</span>
              {labels[c]}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
}

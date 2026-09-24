"use client";

import { DEFAULT_CURRENCY, parseCurrency, type Currency } from "@/lib/currency";
import { db, isInstantConfigured } from "@/lib/instant/client";

/**
 * Impostazioni generali dell'app: un solo record con id fisso nell'entità `appSettings`,
 * condiviso da tutti i dispositivi (a differenza della lingua, che è per browser).
 */
const APP_SETTINGS_ID = "7c1f6a52-3b8e-4d2a-9f64-0a5b2c8e1d01";

/** Valuta corrente (dollaro finché l'impostazione non è stata caricata o scelta). */
export function useCurrency(): Currency {
  if (!isInstantConfigured || !db) return DEFAULT_CURRENCY;

  const query = db.useQuery({ appSettings: {} });
  const row = (query?.data?.appSettings ?? []).find(
    (r: { id?: string }) => r.id === APP_SETTINGS_ID
  ) as { currency?: unknown } | undefined;
  return parseCurrency(row?.currency);
}

export async function saveCurrency(currency: Currency): Promise<void> {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }
  await db.transact([
    db.tx.appSettings[APP_SETTINGS_ID].update({ currency, updatedAt: new Date().toISOString() })
  ]);
}

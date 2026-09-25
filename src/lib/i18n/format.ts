import { CURRENCY_SYMBOL, type Currency } from "@/lib/currency";
import type { Lang } from "@/lib/i18n/config";

/**
 * Separatori dei numeri secondo la valuta, indipendenti dalla lingua: il dollaro usa il formato USA
 * (1,000 · 12.50), l'euro quello europeo (1.000 · 12,50). "de-DE" mette il punto già da 1.000,
 * mentre "it-IT" lo ometterebbe fino a 10.000.
 */
const PRICE_LOCALE: Record<Currency, string> = { USD: "en-US", EUR: "de-DE" };

/**
 * Prezzo con il simbolo della valuta scelta nelle Impostazioni, secondo l'uso di ciascuna:
 * dollaro davanti e attaccato ("$1,500" / "$12.50"), euro dopo il numero con uno spazio
 * non divisibile ("1.500 €" / "12,50 €").
 */
export function formatPrice(value: number, currency: Currency): string {
  const n = Number(value);
  const safe = Number.isFinite(n) && n >= 0 ? n : 0;
  const hasCents = Math.round(safe * 100) % 100 !== 0;
  const options = { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 };
  const amount = safe.toLocaleString(PRICE_LOCALE[currency], options);
  const symbol = CURRENCY_SYMBOL[currency];
  return currency === "USD" ? `${symbol}${amount}` : `${amount}\u00A0${symbol}`;
}

/** Data e ora nella lingua scelta (per le intestazioni di stampa). */
export function formatDateTime(date: Date, lang: Lang): string {
  return date.toLocaleString(lang === "en" ? "en-US" : "it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Solo data, nella lingua scelta. */
export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(lang === "en" ? "en-US" : "it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

/**
 * Valori salvati in italiano nel database (tipologia, nazione) mostrati nella lingua scelta.
 * Il database non cambia: si traduce solo a schermo. Le regioni restano col nome originale.
 */
const WINE_TYPES_EN: Record<string, string> = {
  Rosso: "Red",
  Bianco: "White",
  Rosato: "Rosé",
  Bollicine: "Sparkling",
  Dolce: "Dessert",
  Fortificato: "Fortified"
};

const COUNTRIES_EN: Record<string, string> = {
  Italia: "Italy",
  Francia: "France",
  "Stati Uniti": "USA",
  USA: "USA",
  Spagna: "Spain",
  Germania: "Germany",
  Portogallo: "Portugal",
  Austria: "Austria",
  Australia: "Australia",
  Argentina: "Argentina",
  Cile: "Chile",
  Canada: "Canada",
  "Nuova Zelanda": "New Zealand",
  Sudafrica: "South Africa",
  Grecia: "Greece",
  Ungheria: "Hungary",
  Scozia: "Scotland",
  Irlanda: "Ireland",
  Messico: "Mexico",
  Giappone: "Japan"
};

export function wineTypeLabel(type: string, lang: Lang): string {
  return lang === "en" ? (WINE_TYPES_EN[type] ?? type) : type;
}

export function countryLabel(country: string, lang: Lang): string {
  return lang === "en" ? (COUNTRIES_EN[country] ?? country) : country;
}

import type { Lang } from "@/lib/i18n/config";

/**
 * Prezzo in dollari (il ristorante è negli USA), simbolo davanti e staccato da uno spazio
 * non divisibile: "$ 1,500" / "$ 12.50" in inglese, "$ 1.500" / "$ 12,50" in italiano.
 */
export function formatPrice(value: number, lang: Lang): string {
  const n = Number(value);
  const safe = Number.isFinite(n) && n >= 0 ? n : 0;
  const hasCents = Math.round(safe * 100) % 100 !== 0;
  const options = { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 };
  return `$\u00A0${safe.toLocaleString(lang === "en" ? "en-US" : "it-IT", options)}`;
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

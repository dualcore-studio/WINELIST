import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Migliaia separate da punto (es. 2000 → "2.000"). */
function integerWithThousandsDots(n: number): string {
  const i = Math.trunc(Math.abs(n));
  return String(i).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Prezzo per la tabella: punto tra le migliaia, simbolo € a destra (es. 2.000 €).
 * Decimali: virgola italiana (es. 12,50 €).
 */
export function formatPriceEur(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "0 €";
  const cents = Math.round(n * 100);
  const euros = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100);
  const intPart = integerWithThousandsDots(euros);
  if (frac === 0) return `${intPart} €`;
  const dec = frac < 10 ? `0${frac}` : String(frac);
  return `${intPart},${dec} €`;
}

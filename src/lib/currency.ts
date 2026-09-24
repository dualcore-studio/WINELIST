/** Valuta mostrata accanto ai prezzi. Cambia solo il simbolo: i prezzi non vengono convertiti. */
export type Currency = "USD" | "EUR";

export const CURRENCIES: readonly Currency[] = ["USD", "EUR"] as const;

export const DEFAULT_CURRENCY: Currency = "USD";

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", EUR: "€" };

export function parseCurrency(raw: unknown): Currency {
  return raw === "EUR" || raw === "USD" ? raw : DEFAULT_CURRENCY;
}

/**
 * Ordinamento delle tabelle per colonna: clic su un'intestazione = crescente, secondo clic =
 * decrescente, terzo = ordine predefinito. I valori vuoti (null) vanno sempre in fondo, e a
 * parità di valore resta l'ordine predefinito (l'ordinamento è stabile).
 */

export type SortDir = "asc" | "desc";

export type SortState<K extends string> = { key: K; dir: SortDir } | null;

export type SortValue = string | number | null;

export type SortColumn<T> = {
  value: (row: T) => SortValue;
  /** Confronto dei valori non vuoti; predefinito: numerico o alfabetico. */
  compare?: (a: SortValue, b: SortValue) => number;
};

export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (!current || current.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

const collators: Record<string, Intl.Collator> = {};
function collator(lang: string): Intl.Collator {
  return (collators[lang] ??= new Intl.Collator(lang, { numeric: true, sensitivity: "base" }));
}

function defaultCompare(a: SortValue, b: SortValue, lang: string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator(lang).compare(String(a), String(b));
}

/** Testo per l'ordinamento: stringa vuota → null (in fondo). */
export function textValue(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K>,
  columns: Record<K, SortColumn<T>>,
  lang: string
): T[] {
  if (!sort) return rows as T[];
  const column = columns[sort.key];
  if (!column) return rows as T[];
  const sign = sort.dir === "asc" ? 1 : -1;
  const compare = column.compare ?? ((a: SortValue, b: SortValue) => defaultCompare(a, b, lang));
  return rows
    .map((row) => ({ row, v: column.value(row) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? 0 : a.v === null ? 1 : -1;
      return sign * compare(a.v, b.v);
    })
    .map((x) => x.row);
}

/** Ordinamento → parametri della query string (per le stampe). */
export function sortToSearchParams<K extends string>(sort: SortState<K>, params: URLSearchParams): URLSearchParams {
  if (sort) {
    params.set("sort", sort.key);
    params.set("dir", sort.dir);
  }
  return params;
}

export function sortFromSearchParams<K extends string>(
  params: Record<string, string | string[] | undefined>,
  keys: readonly K[]
): SortState<K> {
  const read = (name: string) => {
    const v = params[name];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const key = read("sort") as K;
  if (!keys.includes(key)) return null;
  return { key, dir: read("dir") === "desc" ? "desc" : "asc" };
}

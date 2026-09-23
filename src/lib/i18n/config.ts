/** Lingue dell'interfaccia. La carta per il cliente resta sempre in inglese. */
export type Lang = "it" | "en";

export const LANGS: readonly Lang[] = ["it", "en"] as const;

export const DEFAULT_LANG: Lang = "it";

/** Cookie con la lingua scelta: letto dal layout per renderizzare subito nella lingua giusta. */
export const LANG_COOKIE = "wl_lang";

/** Cookie con lo stato della barra laterale ("open" / "closed"); di default è chiusa. */
export const SIDEBAR_COOKIE = "wl_sidebar";

export function parseLang(value: string | undefined | null): Lang {
  return value === "en" || value === "it" ? value : DEFAULT_LANG;
}

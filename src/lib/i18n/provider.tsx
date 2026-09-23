"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

/** Lingua iniziale letta dal cookie nel layout: niente sfarfallio al caricamento. */
export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: dictionaries[lang] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n va usato dentro <I18nProvider>.");
  return ctx;
}

"use client";

import { clsx } from "clsx";
import { LANGS } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/** Selettore IT / EN nella barra in alto; la scelta resta salvata (cookie). */
export function LanguageSwitch({
  className,
  tone = "dark",
  vertical = false
}: {
  className?: string;
  /** "dark" su sfondo scuro, "light" su sfondo chiaro. */
  tone?: "dark" | "light";
  /** In colonna (barra laterale ridotta). */
  vertical?: boolean;
}) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={clsx(
        "flex items-center rounded-lg border p-0.5",
        vertical && "flex-col",
        tone === "dark" ? "border-white/[0.12]" : "border-neutral-200",
        className
      )}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={clsx(
            "rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
            tone === "dark"
              ? lang === l
                ? "bg-white/[0.14] text-white"
                : "text-wine-mist/70 hover:text-white"
              : lang === l
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

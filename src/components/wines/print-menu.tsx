"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

type Props = {
  /** Carta per il cliente: pagina da aprire, titolo e descrizione della voce. */
  cartaHref: string;
  cartaLabel: string;
  cartaDescription: string;
  /** Stampa ad uso interno della lista filtrata. */
  onPrintInternal: () => void;
  /** Descrizione della voce "Uso interno" (cambia tra vini e distillati). */
  internalDescription: string;
  disabled?: boolean;
};

/** Pulsante "Stampa" con le due stampe della sezione: carta per il cliente e lista interna. */
export function PrintMenu({
  cartaHref,
  cartaLabel,
  cartaDescription,
  onPrintInternal,
  internalDescription,
  disabled = false
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Printer className="size-4" strokeWidth={2} aria-hidden />
        {t.common.print}
        <ChevronDown className="size-4 text-neutral-500" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(17,17,17,0.12)]"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              window.open(cartaHref, "_blank");
            }}
          >
            <BookOpen className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-neutral-800">{cartaLabel}</span>
              <span className="block text-xs text-neutral-500">{cartaDescription}</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onPrintInternal();
            }}
          >
            <ClipboardList className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-neutral-800">{t.print.menu.internal}</span>
              <span className="block text-xs text-neutral-500">{internalDescription}</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

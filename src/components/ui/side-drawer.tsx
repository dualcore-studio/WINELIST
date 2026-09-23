"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Pannello laterale destro (dettaglio/modifica): si chiude con Esc, clic fuori o X. */
export function SideDrawer({ title, subtitle, onClose, children }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/20" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-dvh w-full max-w-[580px] animate-drawer-in flex-col bg-white shadow-drawer">
        <header className="flex items-start justify-between gap-4 border-b border-line px-7 pb-5 pt-6">
          <div className="min-w-0">
            <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-text">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-canvas hover:text-text"
            aria-label={t.common.close}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

/** Contenuto scorrevole del pannello. */
export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-7 py-6">{children}</div>;
}

/** Pulsanti fissi in fondo al pannello. */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 border-t border-line bg-white px-7 py-4">{children}</div>;
}

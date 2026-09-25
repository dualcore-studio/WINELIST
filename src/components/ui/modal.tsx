"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  /** Pulsanti in fondo (dentro il form: il primario può essere type="submit"). */
  footer: ReactNode;
  children: ReactNode;
};

/**
 * Finestra centrata con form: si chiude con Esc o clic fuori, Invio conferma.
 * Montata in <body> (portal): aperta da una cella di tabella non eredita stili né resta sotto
 * l'intestazione fissa della tabella.
 */
export function Modal({ title, subtitle, onClose, onSubmit, footer, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc già gestito da un campo (es. chiusura di una tendina) non chiude la finestra.
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex animate-fade-in items-center justify-center bg-black/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_rgba(17,17,17,0.14)]"
      >
        <h4 className="font-display text-2xl font-bold text-text">{title}</h4>
        {subtitle ? <div className="mt-2 text-sm text-neutral-600">{subtitle}</div> : null}
        <div className="mt-5 space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </form>
    </div>,
    document.body
  );
}

"use client";

import Link from "next/link";
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useExtraSections } from "@/components/layout/extra-sections-provider";

export function SettingsView() {
  const {
    extraSections,
    addSection,
    removeSection,
    renameSection,
    resetToDefaults
  } = useExtraSections();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);

  const handleAdd = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    addSection(t);
    setDraft("");
  }, [addSection, draft]);

  const startEdit = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditingDraft(currentLabel);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingDraft("");
  }, []);

  const confirmEdit = useCallback(() => {
    if (!editingId) return;
    const t = editingDraft.trim();
    if (!t) {
      cancelEdit();
      return;
    }
    renameSection(editingId, t);
    setEditingId(null);
    setEditingDraft("");
  }, [editingId, editingDraft, renameSection, cancelEdit]);

  useEffect(() => {
    if (editingId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingId]);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 md:px-6 md:py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-wine-graphite sm:text-3xl">
        Impostazioni
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
        Gestisci le categorie che compaiono nella barra di navigazione accanto a
        &quot;Winelist&quot;.
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-wine-graphite">Categorie winelist</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Aggiungi nuove categorie o elimina quelle esistenti. Le voci compaiono subito nel menu
              in alto e sono salvate in InstantDB (stesso elenco su Vercel e su ogni dispositivo).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Vuoi ripristinare le categorie predefinite? Le categorie correnti verranno sostituite."
                )
              ) {
                resetToDefaults();
              }
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            title="Ripristina le categorie predefinite (Distillati, Cognac e Brandy)"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Ripristina default
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor="new-section-name">
            Nome nuova categoria
          </label>
          <input
            id="new-section-name"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Es. Port and Sherry"
            className="min-h-10 w-full flex-1 rounded-lg border border-neutral-200 bg-wine-cream/40 px-3 text-sm outline-none ring-wine-bordeaux/20 placeholder:text-neutral-400 focus:border-wine-bordeaux/35 focus:ring-2"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-wine-bordeaux px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-wine-bordeauxMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-bordeaux/40"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            Aggiungi categoria
          </button>
        </div>

        {extraSections.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Nessuna categoria configurata.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
            {extraSections.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg"
                >
                  {isEditing ? (
                    <input
                      ref={editingInputRef}
                      type="text"
                      value={editingDraft}
                      onChange={(e) => setEditingDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          confirmEdit();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-800 outline-none ring-wine-bordeaux/20 focus:border-wine-bordeaux/35 focus:ring-2"
                      aria-label={`Nome categoria ${s.label}`}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">
                      {s.label}
                    </span>
                  )}

                  <div className="flex shrink-0 items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={confirmEdit}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          aria-label="Conferma modifica"
                          title="Conferma"
                        >
                          <Check className="size-3.5" aria-hidden />
                          Salva
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                          aria-label="Annulla modifica"
                          title="Annulla"
                        >
                          <X className="size-3.5" aria-hidden />
                          Annulla
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(s.id, s.label)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-wine-bordeaux hover:bg-wine-bordeaux/5"
                          aria-label={`Modifica ${s.label}`}
                          title="Modifica nome"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(s.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          aria-label={`Elimina ${s.label}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Elimina
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/"
        className="mt-8 inline-flex text-sm font-semibold text-wine-bordeaux underline-offset-4 hover:underline"
      >
        ← Torna alla dashboard
      </Link>
    </div>
  );
}

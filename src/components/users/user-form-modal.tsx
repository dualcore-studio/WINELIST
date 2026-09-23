"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppUser, AppUserInput } from "@/types/app-user";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  user: AppUser | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: AppUserInput) => Promise<void>;
};

type FormState = {
  username: string;
  password: string;
  isAdmin: boolean;
};

const initialState: FormState = { username: "", password: "", isAdmin: false };

export function UserFormModal({ open, mode, user, isSaving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({ username: user.username, password: "", isAdmin: user.isAdmin });
    } else {
      setForm(initialState);
    }
    setError(null);
  }, [open, mode, user]);

  if (!open) return null;

  const title = mode === "create" ? "Aggiungi utente" : "Modifica utente";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    if (!username) {
      setError("Inserisci un username.");
      return;
    }
    if (mode === "create" && form.password.length < 8) {
      setError("Inserisci una password di almeno 8 caratteri.");
      return;
    }
    if (mode === "edit" && form.password && form.password.length < 8) {
      setError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }

    try {
      await onSubmit({
        username,
        password: form.password ? form.password : undefined,
        isAdmin: form.isAdmin
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operazione non riuscita. Riprova.";
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-text">{title}</h4>
          <p className="text-sm text-neutral-500">Gestisci le credenziali di accesso.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="user-username">
              Username
            </label>
            <Input
              id="user-username"
              autoFocus
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="user-password">
              {mode === "create" ? "Password" : "Nuova password"}
            </label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              placeholder={mode === "edit" ? "Lascia vuoto per non cambiarla" : undefined}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={form.isAdmin}
              onChange={(e) => setForm((prev) => ({ ...prev, isAdmin: e.target.checked }))}
              className="size-4 rounded border-neutral-300"
            />
            Amministratore
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvataggio..." : mode === "create" ? "Crea utente" : "Salva modifiche"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

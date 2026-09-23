"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
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
  const { t } = useI18n();

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

  const title = mode === "create" ? t.users.form.createTitle : t.users.form.editTitle;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    if (!username) {
      setError(t.users.form.errUsername);
      return;
    }
    if (mode === "create" && form.password.length < 8) {
      setError(t.users.form.errPassword);
      return;
    }
    if (mode === "edit" && form.password && form.password.length < 8) {
      setError(t.users.form.errNewPassword);
      return;
    }

    try {
      await onSubmit({
        username,
        password: form.password ? form.password : undefined,
        isAdmin: form.isAdmin
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.common.operationFailed;
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex animate-fade-in items-center justify-center bg-black/25 p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_rgba(17,17,17,0.14)]">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-text">{title}</h4>
          <p className="text-sm text-neutral-500">{t.users.form.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="user-username">
              {t.users.form.username}
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
              {mode === "create" ? t.users.form.password : t.users.form.newPassword}
            </label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              placeholder={mode === "edit" ? t.users.form.keepPassword : undefined}
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
            {t.users.form.isAdmin}
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t.common.saving : mode === "create" ? t.users.form.create : t.common.saveChanges}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

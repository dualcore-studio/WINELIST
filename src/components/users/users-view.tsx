"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserFormModal } from "@/components/users/user-form-modal";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { readApiError } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import type { AppUser, AppUserInput } from "@/types/app-user";

export function UsersView() {
  const { user: currentUser } = useCurrentUser();
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        setListError(await readApiError(res, t));
        return;
      }
      const data = (await res.json()) as { users: AppUser[] };
      setUsers(data.users);
    } catch {
      setListError(t.users.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreate() {
    setModalMode("create");
    setSelectedUser(null);
    setModalOpen(true);
  }

  function openEdit(user: AppUser) {
    setModalMode("edit");
    setSelectedUser(user);
    setModalOpen(true);
  }

  async function handleSubmit(input: AppUserInput) {
    setIsSaving(true);
    try {
      const res =
        modalMode === "create"
          ? await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input)
            })
          : await fetch(`/api/users/${selectedUser?.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input)
            });

      if (!res.ok) {
        throw new Error(await readApiError(res, t));
      }
      setModalOpen(false);
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: AppUser) {
    if (!window.confirm(t.users.confirmDelete(user.username))) {
      return;
    }
    setListError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        setListError(await readApiError(res, t));
        return;
      }
      await loadUsers();
    } catch {
      setListError(t.users.deleteFailed);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 md:px-6 md:py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-wine-graphite sm:text-3xl">
        {t.users.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
        {t.users.description}
      </p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-wine-graphite">{t.users.listTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {t.users.listDescription}
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="mr-1.5 size-4" aria-hidden />
            {t.users.add}
          </Button>
        </div>

        {listError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-4 text-sm text-neutral-500">{t.common.loading}</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">{t.users.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-neutral-800">{u.username}</span>
                  {u.isAdmin ? (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                      {t.users.admin}
                    </span>
                  ) : null}
                  {u.id === currentUser?.id ? (
                    <span className="ml-2 text-xs text-neutral-400">{t.users.you}</span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-wine-bordeaux hover:bg-wine-bordeaux/5"
                    aria-label={t.common.editItem(u.username)}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    {t.common.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    disabled={u.id === currentUser?.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t.common.deleteItem(u.username)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {t.common.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/wines"
        className="mt-8 inline-flex text-sm font-semibold text-wine-bordeaux underline-offset-4 hover:underline"
      >
        {t.common.backToWineList}
      </Link>

      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        user={selectedUser}
        isSaving={isSaving}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

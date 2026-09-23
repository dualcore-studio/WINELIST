"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { WineFilters, type WineFiltersState } from "@/components/wines/wine-filters";
import { WineFormModal } from "@/components/wines/wine-form-modal";
import { PrintMenu } from "@/components/wines/print-menu";
import { WineTable } from "@/components/wines/wine-table";
import { filterWines, filtersToSearchParams, initialWineFilters } from "@/features/wines/filters";
import {
  createWine,
  DEFAULT_WINES_COLLECTION,
  deleteWine,
  getWines,
  updateWine,
  type WineInput
} from "@/features/wines/repository";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

export function WinesClientPage() {
  const collection = DEFAULT_WINES_COLLECTION;
  const { t } = useI18n();
  const { wines, isLoading, error } = getWines(collection);
  const [filters, setFilters] = useState<WineFiltersState>(initialWineFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Wine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredWines = useMemo(() => filterWines(wines, filters), [wines, filters]);

  const openCreate = useCallback(() => {
    setActionError(null);
    setSelectedWine(null);
    setFormMode("create");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((wine: Wine) => {
    setActionError(null);
    setSelectedWine(wine);
    setFormMode("edit");
    setFormOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setFormOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (input: WineInput) => {
      setActionError(null);
      setIsSaving(true);
      try {
        if (formMode === "create") {
          await createWine(input, collection);
        } else if (selectedWine) {
          await updateWine(selectedWine.id, input, collection);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t.common.saveFailed;
        setActionError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [formMode, selectedWine, collection, t]
  );

  const requestDelete = useCallback((wine: Wine) => {
    setDeleteError(null);
    setPendingDelete(wine);
  }, []);

  const cancelDelete = useCallback(() => {
    if (!isDeleting) {
      setPendingDelete(null);
      setDeleteError(null);
    }
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteWine(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.common.operationFailed;
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete, t]);

  return (
    <div className="box-border flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-transparent p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="w-full min-w-0 shrink-0 space-y-4">
          <section className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-text">{t.wines.heading}</h3>
              <p className="mt-1 text-sm text-neutral-600">{t.wines.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <PrintMenu
                cartaHref="/stampa/carta"
                cartaLabel={t.print.menu.cartaWines}
                cartaDescription={t.print.menu.cartaWinesDesc}
                internalDescription={t.print.menu.internalWinesDesc}
                onPrintInternal={() =>
                  window.open(`/stampa/interna?${filtersToSearchParams(filters)}`, "_blank")
                }
                disabled={isLoading || filteredWines.length === 0}
              />
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center rounded-lg bg-[#f2711c] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#d95f10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2711c]/45"
              >
                {t.wines.add}
              </button>
            </div>
          </section>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {actionError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}


          <WineFilters
            filters={filters}
            wines={wines}
            onFiltersChange={setFilters}
            onReset={() => setFilters(initialWineFilters)}
          />
        </div>

        <div className="mt-3 flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <WineTable
            wines={filteredWines}
            isLoading={isLoading}
            deletingWineId={isDeleting && pendingDelete ? pendingDelete.id : null}
            onEdit={openEdit}
            onDeleteRequest={requestDelete}
            className="min-h-0 flex-1"
          />
        </div>
      </div>

      <WineFormModal
        open={formOpen}
        mode={formMode}
        wine={selectedWine}
        wines={wines}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-wine-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelDelete();
          }}
        >
          <div className="w-full max-w-md rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
            <h4 id="delete-wine-title" className="text-lg font-semibold text-text">
              {t.common.confirmDeleteTitle}
            </h4>
            <p className="mt-3 text-sm text-neutral-700">
              {t.common.confirmDeleteText(pendingDelete.name)}
            </p>
            {deleteError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={cancelDelete} disabled={isDeleting}>
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                className="!bg-red-600 !text-white hover:!bg-red-700"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? t.common.deleting : t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

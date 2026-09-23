"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GrappaFilters,
  initialGrappaFilters,
  type GrappaFiltersState
} from "@/components/grappe/grappa-filters";
import { GrappaFormModal } from "@/components/grappe/grappa-form-modal";
import { GrappaTable } from "@/components/grappe/grappa-table";
import { filterSpirits, spiritFiltersToSearchParams } from "@/features/grappe/filters";
import { PrintMenu } from "@/components/wines/print-menu";
import { useI18n } from "@/lib/i18n/provider";
import {
  createWine,
  deleteWine,
  getWines,
  updateWine,
  type WineInput
} from "@/features/wines/repository";
import type { Wine } from "@/types/wine";

/**
 * Pagina "Distillati".
 * Layout visivo identico alla winelist: titolo a sinistra, pulsanti a destra,
 * card filtri a piena larghezza e tabella sottostante. I dati vivono nella
 * stessa entità `wines` ma sono filtrati per `collectionTag = "grappeDistillati"`
 * (tag storico mantenuto per non perdere eventuali record già salvati).
 */

const GRAPPE_COLLECTION = "grappeDistillati";

export function GrappeDistillatiClientPage() {
  const { t } = useI18n();
  const { wines, isLoading, error } = getWines(GRAPPE_COLLECTION);
  const [filters, setFilters] = useState<GrappaFiltersState>(initialGrappaFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Wine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredWines = useMemo(() => filterSpirits(wines, filters), [wines, filters]);

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
          await createWine(input, GRAPPE_COLLECTION);
        } else if (selectedWine) {
          await updateWine(selectedWine.id, input, GRAPPE_COLLECTION);
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
    [formMode, selectedWine, t]
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
    <div className="box-border flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-transparent px-5 pb-5 pt-7 sm:px-8 md:pt-9 lg:px-10">
      {/*
        Blocco centrato con larghezza adattata al contenuto più largo (la tabella).
        La barra titolo/pulsanti e la card filtri ereditano la stessa larghezza
        tramite `w-full`, così si proporzionano automaticamente alla tabella.
      */}
      <div className="mx-auto flex min-h-0 w-fit max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="w-full min-w-0 shrink-0 space-y-5">
          <section className="flex w-full items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-[34px] font-bold leading-none tracking-tight text-text">{t.spirits.heading}</h1>
              <p className="mt-2 text-sm text-muted">{t.spirits.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <PrintMenu
                cartaHref="/stampa/carta/distillati"
                cartaLabel={t.print.menu.cartaSpirits}
                cartaDescription={t.print.menu.cartaSpiritsDesc}
                onPrintInternal={() =>
                  window.open(
                    `/stampa/interna/distillati?${spiritFiltersToSearchParams(filters)}`,
                    "_blank"
                  )
                }
                internalDescription={t.print.menu.internalSpiritsDesc}
                disabled={isLoading || filteredWines.length === 0}
              />
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                {t.spirits.add}
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

          <GrappaFilters
            filters={filters}
            wines={wines}
            onFiltersChange={setFilters}
            onReset={() => setFilters(initialGrappaFilters)}
          />
        </div>

        <div className="mt-4 flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <GrappaTable
            wines={filteredWines}
            isLoading={isLoading}
            deletingWineId={isDeleting && pendingDelete ? pendingDelete.id : null}
            onEdit={openEdit}
            onDeleteRequest={requestDelete}
            selectedId={formOpen && selectedWine ? selectedWine.id : null}
            className="min-h-0 flex-1"
          />
        </div>
      </div>

      <GrappaFormModal
        open={formOpen}
        mode={formMode}
        wine={selectedWine}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[200] flex animate-fade-in items-center justify-center bg-black/25 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-grappa-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelDelete();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_rgba(17,17,17,0.14)]">
            <h4 id="delete-grappa-title" className="font-display text-2xl font-bold text-text">
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

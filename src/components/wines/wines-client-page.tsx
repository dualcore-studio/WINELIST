"use client";

import { useCallback, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WineFilters, type WineFiltersState } from "@/components/wines/wine-filters";
import { WineFormModal } from "@/components/wines/wine-form-modal";
import { Page26ClientSeed } from "@/components/wines/page26-client-seed";
import { WineTable } from "@/components/wines/wine-table";
import { printWines } from "@/features/wines/print";
import {
  createWine,
  DEFAULT_WINES_COLLECTION,
  deleteWine,
  getWines,
  updateWine,
  type WineInput
} from "@/features/wines/repository";
import type { Wine } from "@/types/wine";

const initialFilters: WineFiltersState = {
  binNumber: "",
  name: "",
  winery: "",
  categoryText: "",
  type: "",
  country: "",
  region: "",
  category: "",
  vintage: "",
  quantityMin: "",
  quantityMax: "",
  onlyAvailable: true
};

type WinesPageProps = {
  /** Con `?seedPage26=1` in dev: import client bin 322–463 (senza token admin). */
  autoSeedPage26?: boolean;
  /** Nome della collection InstantDB da usare come storage. Default: "wines". */
  collection?: string;
  /** Titolo mostrato in testa alla pagina. Default: "Wine List Manager". */
  heading?: string;
  /** Sottotitolo descrittivo. */
  description?: string;
  /** Sostantivo usato nei pulsanti/modali (es. "vino", "distillato"). */
  itemNoun?: string;
};

export function WinesClientPage({
  autoSeedPage26 = false,
  collection = DEFAULT_WINES_COLLECTION,
  heading = "Wine List Manager",
  description = "Cerca, filtra e organizza l'elenco vini del ristorante.",
  itemNoun = "vino"
}: WinesPageProps) {
  const { wines, isLoading, error } = getWines(collection);
  const [filters, setFilters] = useState<WineFiltersState>(initialFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Wine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredWines = useMemo(() => {
    const byName = filters.name.trim().toLowerCase();
    const byWinery = filters.winery.trim().toLowerCase();
    const byCategoryText = filters.categoryText.trim().toLowerCase();
    const byBin = filters.binNumber.trim();
    const byVintage = filters.vintage.trim();
    const qtyMin = Number(filters.quantityMin);
    const qtyMax = Number(filters.quantityMax);

    return wines.filter((wine) => {
      if (filters.onlyAvailable && !wine.isAvailable) return false;
      if (filters.country && wine.country !== filters.country) return false;
      if (filters.type && wine.type !== filters.type) return false;
      if (filters.region && wine.region !== filters.region) return false;
      if (filters.category && wine.category !== filters.category) return false;
      if (byBin && !String(wine.binNumber).includes(byBin)) return false;
      if (byName && !wine.name.toLowerCase().includes(byName)) return false;
      if (byWinery && !wine.winery.toLowerCase().includes(byWinery)) return false;
      if (byVintage && !String(wine.vintage).includes(byVintage)) return false;
      if (!Number.isNaN(qtyMin) && filters.quantityMin.trim() !== "" && wine.quantity < qtyMin) return false;
      if (!Number.isNaN(qtyMax) && filters.quantityMax.trim() !== "" && wine.quantity > qtyMax) return false;
      if (
        byCategoryText &&
        !`${wine.grape} ${wine.category}`.toLowerCase().includes(byCategoryText)
      ) {
        return false;
      }
      return true;
    });
  }, [wines, filters]);

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
          err instanceof Error ? err.message : "Salvataggio non riuscito.";
        setActionError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [formMode, selectedWine, collection]
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
        err instanceof Error ? err.message : "Operazione non riuscita.";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete]);

  return (
    <div className="box-border flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-transparent p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="w-full min-w-0 shrink-0 space-y-4">
          <section className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-text">{heading}</h3>
              <p className="mt-1 text-sm text-neutral-600">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printWines(filteredWines, filters)}
                disabled={isLoading || filteredWines.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Stampa lista filtrata"
                title="Stampa lista filtrata"
              >
                <Printer className="size-4" strokeWidth={2} aria-hidden />
                Stampa
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center rounded-lg bg-[#f2711c] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#d95f10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2711c]/45"
              >
                + Aggiungi {itemNoun}
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

          <Page26ClientSeed
            enabled={
              autoSeedPage26 ||
              process.env.NEXT_PUBLIC_TRIGGER_PAGE26_SEED === "1"
            }
            wines={wines}
            isLoading={isLoading}
          />

          <WineFilters
            filters={filters}
            wines={wines}
            onFiltersChange={setFilters}
            onReset={() => setFilters(initialFilters)}
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
        itemNoun={itemNoun}
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
              Conferma eliminazione
            </h4>
            <p className="mt-3 text-sm text-neutral-700">
              Vuoi eliminare definitivamente &quot;{pendingDelete.name}&quot;? Il record
              verrà rimosso dal database e non potrà essere recuperato.
            </p>
            {deleteError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={cancelDelete} disabled={isDeleting}>
                Annulla
              </Button>
              <Button
                type="button"
                className="!bg-red-600 !text-white hover:!bg-red-700"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminazione..." : "Elimina"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

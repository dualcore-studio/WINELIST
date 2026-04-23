"use client";

import { useCallback, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GrappaFilters,
  initialGrappaFilters,
  type GrappaFiltersState
} from "@/components/grappe/grappa-filters";
import { GrappaFormModal } from "@/components/grappe/grappa-form-modal";
import { GrappaTable } from "@/components/grappe/grappa-table";
import { DistillatiClientSeed } from "@/components/grappe/distillati-client-seed";
import { printGrappe } from "@/features/grappe/print";
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
const HEADING = "Distillati";
const DESCRIPTION = "Cerca, filtra e organizza l'elenco dei distillati.";
const ITEM_NOUN = "distillato";

type Props = {
  /** Se true e in dev, esegue l'upsert dei record da `src/data/distillati.json`. */
  autoSeedDistillati?: boolean;
};

export function GrappeDistillatiClientPage({
  autoSeedDistillati = false
}: Props = {}) {
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

  const filteredWines = useMemo(() => {
    const byName = filters.name.trim().toLowerCase();
    const byWinery = filters.winery.trim().toLowerCase();
    const priceMax = Number(filters.priceMax);
    const glassMax = Number(filters.pricePerGlassMax);
    const qtyMin = Number(filters.quantityMin);
    const qtyMax = Number(filters.quantityMax);
    const hasPriceMax =
      filters.priceMax.trim() !== "" && !Number.isNaN(priceMax);
    const hasGlassMax =
      filters.pricePerGlassMax.trim() !== "" && !Number.isNaN(glassMax);
    const hasQtyMin =
      filters.quantityMin.trim() !== "" && !Number.isNaN(qtyMin);
    const hasQtyMax =
      filters.quantityMax.trim() !== "" && !Number.isNaN(qtyMax);

    return wines.filter((wine) => {
      if (byName && !wine.name.toLowerCase().includes(byName)) return false;
      if (byWinery && !wine.winery.toLowerCase().includes(byWinery)) return false;
      if (filters.spiritType) {
        // Il valore del filtro può essere una tipologia completa (es. "Tequila Blanco")
        // oppure una "famiglia" che raggruppa più sottocategorie (es. "Tequila",
        // che deve includere Tequila Blanco/Reposado/Anejo/…). Accetto la riga se la
        // sua spiritType coincide col filtro oppure inizia con "<filtro> ".
        const st = (wine.spiritType ?? "").trim();
        const f = filters.spiritType.trim();
        if (st !== f && !st.startsWith(`${f} `)) return false;
      }
      if (hasPriceMax && wine.price > priceMax) return false;
      if (hasGlassMax) {
        // Se filtri per prezzo al bicchiere, mostra solo quelli che ce l'hanno e rientrano.
        if (
          wine.pricePerGlass === undefined ||
          wine.pricePerGlass === null ||
          !Number.isFinite(Number(wine.pricePerGlass)) ||
          Number(wine.pricePerGlass) > glassMax
        ) {
          return false;
        }
      }
      if (hasQtyMin && wine.quantity < qtyMin) return false;
      if (hasQtyMax && wine.quantity > qtyMax) return false;
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
          await createWine(input, GRAPPE_COLLECTION);
        } else if (selectedWine) {
          await updateWine(selectedWine.id, input, GRAPPE_COLLECTION);
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
    [formMode, selectedWine]
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
    <div className="box-border flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto bg-transparent p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      {/*
        Blocco centrato con larghezza adattata al contenuto più largo (la tabella).
        La barra titolo/pulsanti e la card filtri ereditano la stessa larghezza
        tramite `w-full`, così si proporzionano automaticamente alla tabella.
      */}
      <div className="mx-auto flex min-h-0 w-fit max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="w-full min-w-0 shrink-0 space-y-4">
          <section className="flex w-full items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-text">{HEADING}</h3>
              <p className="mt-1 text-sm text-neutral-600">{DESCRIPTION}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printGrappe(filteredWines, filters)}
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
                + Aggiungi {ITEM_NOUN}
              </button>
            </div>
          </section>

          <DistillatiClientSeed
            enabled={autoSeedDistillati}
            wines={wines}
            isLoading={isLoading}
          />

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

        <div className="mt-3 flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <GrappaTable
            wines={filteredWines}
            isLoading={isLoading}
            deletingWineId={isDeleting && pendingDelete ? pendingDelete.id : null}
            onEdit={openEdit}
            onDeleteRequest={requestDelete}
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-grappa-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelDelete();
          }}
        >
          <div className="w-full max-w-md rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
            <h4 id="delete-grappa-title" className="text-lg font-semibold text-text">
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

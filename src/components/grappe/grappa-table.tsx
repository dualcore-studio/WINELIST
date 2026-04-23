import { Pencil, Trash2 } from "lucide-react";
import { cn, formatPriceEur } from "@/lib/utils";
import type { Wine } from "@/types/wine";

type Props = {
  wines: Wine[];
  isLoading: boolean;
  deletingWineId: string | null;
  onEdit: (wine: Wine) => void;
  onDeleteRequest: (wine: Wine) => void;
  className?: string;
};

/** Contenitore verticale: riempie il wrapper (larghezza = barra filtri). */
const tableRoot = "flex min-h-0 w-full min-w-0 flex-col pb-1";

const messageCardShell =
  "rounded-[12px] border border-neutral-200 bg-white shadow-soft";

/** Card tabella: larghezza piena del wrapper, coerente con la card filtri. */
const tableCardShell =
  "flex w-full min-w-0 min-h-0 flex-col rounded-[12px] border border-neutral-200 bg-white shadow-soft";

const cellPad = "px-3 py-2.5 md:px-4 md:py-3";

const cellNowrap = "whitespace-nowrap";

const thBase =
  "sticky top-0 z-30 whitespace-nowrap border-b border-[#2d3236] bg-[#383e42] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-white first:rounded-tl-[12px] last:rounded-tr-[12px] md:px-4 md:py-3 md:text-[11px]";

const rowZebra =
  "odd:bg-white even:bg-neutral-100 hover:bg-neutral-200/90 [&>td]:border-t [&>td]:border-neutral-100";

function formatGlassPrice(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(Number(value))) return "—";
  return formatPriceEur(Number(value));
}

/** Soglia "scorte basse" coerente con la winelist: sotto 6 bottiglie il numero diventa rosso. */
function quantityLabelClass(qty: number) {
  return qty >= 6
    ? "font-semibold text-emerald-600"
    : "font-semibold text-red-600";
}

export function GrappaTable({
  wines,
  isLoading,
  deletingWineId,
  onEdit,
  onDeleteRequest,
  className
}: Props) {
  if (isLoading) {
    return (
      <div className={cn(tableRoot, className)}>
        <div
          className={cn(
            messageCardShell,
            "flex min-h-0 flex-1 items-center justify-center p-7"
          )}
        >
          <p className="text-[15px] text-neutral-600">
            Caricamento distillati da InstantDB...
          </p>
        </div>
      </div>
    );
  }

  if (wines.length === 0) {
    return (
      <div className={cn(tableRoot, className)}>
        <div
          className={cn(
            messageCardShell,
            "flex min-h-0 flex-1 items-center justify-center p-7"
          )}
        >
          <p className="text-[15px] text-neutral-600">
            Nessun distillato trovato con i filtri correnti.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(tableRoot, className)}>
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className={tableCardShell}>
          <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]">
            <table
              className={cn(
                "w-full table-auto border-separate border-spacing-0 text-[13px] leading-snug text-neutral-800 md:text-[14px]"
              )}
            >
              <thead>
                <tr>
                  <th className={cn(thBase, "text-left")}>Nome distillato</th>
                  <th className={cn(thBase, "text-left")}>Produttore</th>
                  <th className={cn(thBase, "text-left")}>Tipologia</th>
                  <th className={cn(thBase, "text-right")}>Prezzo bicchiere</th>
                  <th className={cn(thBase, "text-right")}>Prezzo bottiglia</th>
                  <th className={cn(thBase, "w-[3rem] text-right")}>Qtà</th>
                  <th className={cn(thBase, "text-center")}>Azioni</th>
                </tr>
              </thead>
              <tbody className="relative z-0 [&_tr:first-child>td]:border-t-0">
                {wines.map((wine) => (
                  <tr key={wine.id} className={rowZebra}>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-left font-semibold text-text"
                      )}
                    >
                      {wine.name}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-left text-neutral-600"
                      )}
                    >
                      {wine.winery}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-left text-neutral-800"
                      )}
                    >
                      {wine.spiritType ?? "—"}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {formatGlassPrice(wine.pricePerGlass)}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {formatPriceEur(wine.price)}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block tabular-nums text-[14px]",
                          quantityLabelClass(wine.quantity)
                        )}
                      >
                        {wine.quantity}
                      </span>
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-center"
                      )}
                    >
                      <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={`Modifica ${wine.name}`}
                          onClick={() => onEdit(wine)}
                          disabled={deletingWineId === wine.id}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={`Elimina ${wine.name}`}
                          onClick={() => onDeleteRequest(wine)}
                          disabled={deletingWineId === wine.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

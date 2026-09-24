import { Pencil, Trash2 } from "lucide-react";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { formatPrice } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { Wine } from "@/types/wine";

type Props = {
  wines: Wine[];
  isLoading: boolean;
  deletingWineId: string | null;
  onEdit: (wine: Wine) => void;
  onDeleteRequest: (wine: Wine) => void;
  /** Riga aperta nel pannello laterale (evidenziata). */
  selectedId?: string | null;
  className?: string;
};

/** Contenitore verticale: riempie il wrapper (larghezza = barra filtri). */
const tableRoot = "flex min-h-0 w-full min-w-0 flex-1 flex-col pb-1";

const messageCardShell =
  "rounded-xl border border-line bg-white shadow-soft";

/** Card tabella: larghezza piena del wrapper, coerente con la card filtri. */
const tableCardShell =
  "flex w-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-soft";

const cellPad = "px-3 py-3 md:px-4";

const cellNowrap = "whitespace-nowrap";

/** Celle testuali: vanno a capo così la tabella resta nella larghezza della pagina. */
const cellWrap = "break-words [overflow-wrap:anywhere]";

const thBase =
  "sticky top-0 z-30 whitespace-nowrap border-b border-accent bg-accent px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-white md:px-4";

const rowZebra =
  "cursor-pointer bg-white transition-colors hover:bg-canvas [&>td]:border-t [&>td]:border-line/70";

function formatGlassPrice(value: number | undefined, lang: Lang): string {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(Number(value))) return "—";
  return formatPrice(Number(value), lang);
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
  selectedId = null,
  className
}: Props) {
  const { t, lang } = useI18n();
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
            {t.spirits.loading}
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
            {t.spirits.empty}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(tableRoot, className)}>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <div className={tableCardShell}>
          <TableScrollArea>
            <table
              className={cn(
                "w-full table-auto border-separate border-spacing-0 text-[13px] leading-snug text-neutral-800 md:text-[14px]"
              )}
            >
              <thead>
                <tr>
                  <th className={cn(thBase, "text-left")}>{t.spirits.col.name}</th>
                  <th className={cn(thBase, "text-left")}>{t.spirits.col.producer}</th>
                  <th className={cn(thBase, "text-left")}>{t.spirits.col.type}</th>
                  <th className={cn(thBase, "text-right")}>{t.spirits.col.glassPrice}</th>
                  <th className={cn(thBase, "text-right")}>{t.spirits.col.bottlePrice}</th>
                  <th className={cn(thBase, "w-[3rem] text-right")}>{t.common.qty}</th>
                  <th className={cn(thBase, "text-center")}>{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="relative z-0 [&_tr:first-child>td]:border-t-0">
                {wines.map((wine) => (
                  <tr
                    key={wine.id}
                    className={cn(rowZebra, selectedId === wine.id && "!bg-accent-soft")}
                    onClick={() => onEdit(wine)}
                  >
                    <td
                      className={cn(
                        cellPad,
                        cellWrap,
                        "bg-inherit text-left font-semibold text-text"
                      )}
                    >
                      {wine.name}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellWrap,
                        "bg-inherit text-left text-neutral-600"
                      )}
                    >
                      {wine.winery}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellWrap,
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
                      {formatGlassPrice(wine.pricePerGlass, lang)}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {/* 1 = segnaposto dei distillati venduti solo al bicchiere */}
                      {wine.price > 1 ? formatPrice(wine.price, lang) : "—"}
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
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-white hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                          aria-label={t.common.editItem(wine.name)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(wine);
                          }}
                          disabled={deletingWineId === wine.id}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-white hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={t.common.deleteItem(wine.name)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(wine);
                          }}
                          disabled={deletingWineId === wine.id}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollArea>
        </div>
      </div>
    </div>
  );
}

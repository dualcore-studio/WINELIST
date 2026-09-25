import { Pencil, Trash2 } from "lucide-react";
import { StockAdjuster } from "@/components/stock/stock-adjuster";
import { SPIRITS_COLLECTION } from "@/features/wines/repository";
import { SortableTh } from "@/components/ui/sortable-th";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import type { SpiritSort } from "@/features/grappe/sort";
import { formatPrice } from "@/lib/i18n/format";
import type { Currency } from "@/lib/currency";
import { useCurrency } from "@/features/settings/currency";
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
  sort: SpiritSort;
  onSortChange: (sort: SpiritSort) => void;
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

function formatGlassPrice(value: number | undefined, currency: Currency): string {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(Number(value))) return "—";
  return formatPrice(Number(value), currency);
}

export function GrappaTable({
  wines,
  isLoading,
  deletingWineId,
  onEdit,
  onDeleteRequest,
  selectedId = null,
  sort,
  onSortChange,
  className
}: Props) {
  const { t } = useI18n();
  const currency = useCurrency();
  const sortProps = { sort, onSortChange };
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
                  <SortableTh
                    {...sortProps}
                    sortKey="name"
                    label={t.spirits.col.name}
                    align="left"
                    className={cn(thBase, "text-left")}
                  />
                  <SortableTh
                    {...sortProps}
                    sortKey="producer"
                    label={t.spirits.col.producer}
                    align="left"
                    className={cn(thBase, "text-left")}
                  />
                  <SortableTh
                    {...sortProps}
                    sortKey="type"
                    label={t.spirits.col.type}
                    align="left"
                    className={cn(thBase, "text-left")}
                  />
                  <SortableTh
                    {...sortProps}
                    sortKey="glass"
                    label={t.spirits.col.glassPrice}
                    align="right"
                    className={cn(thBase, "text-right")}
                  />
                  <SortableTh
                    {...sortProps}
                    sortKey="bottle"
                    label={t.spirits.col.bottlePrice}
                    align="right"
                    className={cn(thBase, "text-right")}
                  />
                  <SortableTh
                    {...sortProps}
                    sortKey="quantity"
                    label={t.common.qty}
                    align="right"
                    className={cn(thBase, "w-[7.5rem] text-right")}
                  />
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
                      {formatGlassPrice(wine.pricePerGlass, currency)}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {/* 1 = segnaposto dei distillati venduti solo al bicchiere */}
                      {wine.price > 1 ? formatPrice(wine.price, currency) : "—"}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right"
                      )}
                    >
                      <StockAdjuster item={wine} collection={SPIRITS_COLLECTION} />
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

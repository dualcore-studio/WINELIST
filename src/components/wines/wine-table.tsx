import { Pencil, Trash2 } from "lucide-react";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { countryLabel, formatPrice, wineTypeLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { formatVintage, type Wine } from "@/types/wine";

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

function quantityLabelClass(qty: number) {
  return qty >= 6 ? "font-semibold text-emerald-600" : "font-semibold text-red-600";
}

function vitignoCategoryLabel(grape: string, category: string) {
  const v = grape.trim();
  const c = category.trim();
  if (v && c) return `${v} - ${c}`;
  if (v) return v;
  return c;
}

/** Riempie lo slot verticale; larghezza segue il genitore (pagina w-fit). */
const tableRoot = "flex min-h-0 w-full min-w-0 flex-1 flex-col pb-1";

/** Messaggi vuoto/caricamento: 12px su tutti gli angoli. */
const messageCardShell =
  "rounded-xl border border-line bg-white shadow-soft";

/** Card tabella: larghezza piena tra i margini; scroll orizzontale per tutte le colonne. */
const tableCardShell =
  "flex w-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-soft";

const cellPad = "px-3 py-3 md:px-4";

const cellNowrap = "whitespace-nowrap";

/** Celle testuali: vanno a capo e spezzano parole lunghe per adattarsi allo spazio senza scroll orizzontale. */
const cellWrap = "break-words [overflow-wrap:anywhere]";

/** Sticky su ogni th rispetto al contenitore overflow-y-auto; border-separate abilita sticky sulle celle. */
const thBase =
  "sticky top-0 z-30 whitespace-nowrap border-b border-accent bg-accent px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-white md:px-4";

/** Zebra solido su ogni tr (niente alpha) così non si interrompe su lunghe liste. */
const rowZebra =
  "cursor-pointer bg-white transition-colors hover:bg-canvas [&>td]:border-t [&>td]:border-line/70";

export function WineTable({
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
        <div className={cn(messageCardShell, "flex min-h-0 flex-1 items-center justify-center p-7")}>
          <p className="text-[15px] text-neutral-600">{t.wines.loading}</p>
        </div>
      </div>
    );
  }

  if (wines.length === 0) {
    return (
      <div className={cn(tableRoot, className)}>
        <div className={cn(messageCardShell, "flex min-h-0 flex-1 items-center justify-center p-7")}>
          <p className="text-[15px] text-neutral-600">{t.wines.empty}</p>
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
                  <th className={cn(thBase, "w-[3.5rem] text-right")}>{t.wines.col.bin}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.name}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.winery}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.category}</th>
                  <th className={cn(thBase, "w-[4rem] text-right")}>{t.wines.col.vintage}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.type}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.country}</th>
                  <th className={cn(thBase, "text-left")}>{t.wines.col.region}</th>
                  <th className={cn(thBase, "w-[4.5rem] text-right")}>{t.wines.col.price}</th>
                  <th className={cn(thBase, "w-[3rem] text-right")}>{t.common.qty}</th>
                  <th className={cn(thBase, "w-[4.5rem] text-center")}>{t.common.actions}</th>
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
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {wine.binNumber || "—"}
                    </td>
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
                      className={cn(cellPad, cellWrap, "bg-inherit text-left text-neutral-600")}
                    >
                      {wine.winery}
                    </td>
                    <td
                      className={cn(cellPad, cellWrap, "bg-inherit text-left")}
                    >
                      {vitignoCategoryLabel(wine.grape, wine.category)}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {formatVintage(wine.vintage) || "—"}
                    </td>
                    <td className={cn(cellPad, cellWrap, "bg-inherit text-left")}>
                      {wineTypeLabel(wine.type, lang)}
                    </td>
                    <td className={cn(cellPad, cellWrap, "bg-inherit text-left")}>
                      {countryLabel(wine.country, lang)}
                    </td>
                    <td className={cn(cellPad, cellWrap, "bg-inherit text-left")}>
                      {wine.region}
                    </td>
                    <td
                      className={cn(
                        cellPad,
                        cellNowrap,
                        "bg-inherit text-right tabular-nums text-neutral-800"
                      )}
                    >
                      {formatPrice(wine.price, lang)}
                    </td>
                    <td className={cn(cellPad, cellNowrap, "bg-inherit text-right")}>
                      <span
                        className={cn(
                          "inline-block tabular-nums text-[14px]",
                          quantityLabelClass(wine.quantity)
                        )}
                      >
                        {wine.quantity}
                      </span>
                    </td>
                    <td className={cn(cellPad, cellNowrap, "bg-inherit text-center")}>
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

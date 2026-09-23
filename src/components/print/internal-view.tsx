"use client";

import { useMemo } from "react";
import { Printer, X } from "lucide-react";
import type { GrappaFiltersState } from "@/components/grappe/grappa-filters";
import type { WineFiltersState } from "@/components/wines/wine-filters";
import { describeSpiritFilters, filterSpirits } from "@/features/grappe/filters";
import { formatCartaPrice } from "@/features/print/carta";
import { describeFilters, filterWines } from "@/features/wines/filters";
import { useWines } from "@/features/wines/repository";
import { formatVintage, type Wine } from "@/types/wine";

/**
 * Stampa ad uso interno (vini e distillati): la lista filtrata con tutte le colonne, quantità
 * comprese, una colonna vuota "Conteggio" per l'inventario a mano e i totali in fondo.
 */

/** Stessa soglia della tabella: sotto 6 bottiglie la quantità è evidenziata. */
const LOW_STOCK = 6;

const CSS = `
@page {
  size: letter landscape;
  margin: 0.45in 0.4in 0.5in;
  @bottom-right {
    content: "Pagina " counter(page) " di " counter(pages);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #555;
  }
}
html, body { background: #fff !important; }
.int-root { color: #111; background: #fff; min-height: 100dvh; font-family: Arial, Helvetica, sans-serif; }
.int-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid #e5e5e5; background: #fafafa;
  font-family: system-ui, sans-serif; font-size: 14px; color: #333;
}
.int-toolbar button {
  display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
  border-radius: 8px; border: 1px solid #d4d4d4; background: #fff; font-weight: 600; cursor: pointer;
}
.int-toolbar .primary { background: #f2711c; border-color: #f2711c; color: #fff; }
.int-sheet { width: 11in; margin: 24px auto; padding: 0.45in 0.4in 0.5in; background: #fff; box-shadow: 0 1px 12px rgba(0,0,0,.12); }
.int-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 6pt; }
.int-head h1 { font-size: 15pt; margin: 0; letter-spacing: .02em; }
.int-head .meta { font-size: 8.5pt; color: #444; text-align: right; line-height: 1.4; }
.int-filters { margin-top: 5pt; font-size: 8.5pt; color: #333; }
.int-table { width: 100%; border-collapse: collapse; margin-top: 8pt; font-size: 8pt; table-layout: fixed; }
.int-table thead th {
  text-align: left; background: #2e2e2e; color: #fff; font-weight: 700; padding: 4pt 5pt;
  font-size: 7pt; text-transform: uppercase; letter-spacing: .03em;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.int-table td { padding: 2pt 4pt; line-height: 1.2; border-bottom: 1px solid #ddd; vertical-align: top; overflow-wrap: anywhere; }
.int-table tbody tr:nth-child(even) td { background: #f6f6f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.int-table tr { break-inside: avoid; }
.int-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.int-table th.num { text-align: right; }
.int-table .name { font-weight: 700; }
.int-table .low { font-weight: 700; }
.int-table .out td { color: #777; }
.int-table .count { border-left: 1px solid #bbb; }
.int-table .count-box { display: inline-block; width: 100%; height: 9pt; border-bottom: 1px solid #999; }
.int-totals { margin-top: 10pt; display: flex; gap: 28pt; font-size: 9pt; break-inside: avoid; }
.int-totals b { font-size: 11pt; }
.int-legend { margin-top: 4pt; font-size: 7.5pt; color: #666; }
.int-status { font-family: system-ui, sans-serif; padding: 48px; text-align: center; color: #555; }
@media print {
  .int-toolbar { display: none; }
  .int-sheet { width: auto; margin: 0; padding: 0; box-shadow: none; }
}
`;

type Column = {
  label: string;
  width: string;
  numeric?: boolean;
  bold?: boolean;
  value: (item: Wine) => string;
};

function grapeAndCategory(wine: Wine): string {
  return [wine.grape.trim(), wine.category.trim()].filter(Boolean).join(" · ");
}

const dash = (v: string) => v || "—";

const WINE_COLUMNS: Column[] = [
  { label: "Bin", width: "5%", value: (w) => dash(w.binNumber) },
  { label: "Vino", width: "17%", bold: true, value: (w) => w.name },
  { label: "Cantina", width: "13%", value: (w) => dash(w.winery) },
  { label: "Vitigno · Cat.", width: "12%", value: (w) => dash(grapeAndCategory(w)) },
  { label: "Annata", width: "5%", numeric: true, value: (w) => dash(formatVintage(w.vintage)) },
  { label: "Tipologia", width: "7%", value: (w) => w.type },
  { label: "Nazione", width: "7%", value: (w) => dash(w.country) },
  { label: "Regione", width: "10%", value: (w) => dash(w.region) },
  { label: "Prezzo", width: "6%", numeric: true, value: (w) => dash(formatCartaPrice(w.price)) },
  { label: "Calice", width: "5%", numeric: true, value: (w) => dash(formatCartaPrice(w.pricePerGlass)) }
];

/** I distillati non hanno bottiglia a listino (prezzo segnaposto 1): mostrata solo se > 1. */
const SPIRIT_COLUMNS: Column[] = [
  { label: "Distillato", width: "30%", bold: true, value: (w) => w.name },
  { label: "Produttore", width: "18%", value: (w) => (w.winery.trim().toLowerCase() === "other" ? "—" : dash(w.winery)) },
  { label: "Tipologia", width: "16%", value: (w) => dash(w.spiritType ?? "") },
  { label: "Calice", width: "8%", numeric: true, value: (w) => dash(formatCartaPrice(w.pricePerGlass)) },
  { label: "Bottiglia", width: "8%", numeric: true, value: (w) => dash(w.price > 1 ? formatCartaPrice(w.price) : "") }
];

type LayoutProps = {
  title: string;
  noun: [string, string];
  items: Wine[];
  columns: Column[];
  filterParts: string[];
  isLoading: boolean;
  error: string | null;
  /** Valore di magazzino: solo dove esiste un prezzo a bottiglia. */
  showValue: boolean;
  footnote: string;
};

function InternalPrintLayout({
  title,
  noun,
  items,
  columns,
  filterParts,
  isLoading,
  error,
  showValue,
  footnote
}: LayoutProps) {
  const totals = useMemo(() => {
    let bottles = 0;
    let value = 0;
    for (const w of items) {
      const qty = w.isAvailable ? w.quantity : 0;
      bottles += qty;
      if (w.price > 1) value += qty * w.price;
    }
    return { labels: items.length, bottles, value };
  }, [items]);

  const printedAt = new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const colCount = columns.length + 2;

  return (
    <div className="int-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="int-toolbar">
        <span>
          <strong>Stampa uso interno</strong> · anteprima, Letter orizzontale
        </span>
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => window.close()}>
            <X size={16} aria-hidden /> Chiudi
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => window.print()}
            disabled={isLoading || Boolean(error)}
          >
            <Printer size={16} aria-hidden /> Stampa
          </button>
        </span>
      </div>

      {isLoading ? (
        <p className="int-status">Caricamento…</p>
      ) : error ? (
        <p className="int-status">{error}</p>
      ) : (
        <div className="int-sheet">
          <div className="int-head">
            <h1>{title}</h1>
            <div className="meta">
              Stampata il {printedAt}
              <br />
              {items.length} {items.length === 1 ? noun[0] : noun[1]}
            </div>
          </div>
          <div className="int-filters">
            <strong>Filtri:</strong> {filterParts.length ? filterParts.join(" · ") : "nessuno"}
          </div>

          <table className="int-table">
            <colgroup>
              {columns.map((c) => (
                <col key={c.label} style={{ width: c.width }} />
              ))}
              <col style={{ width: "4%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className={c.numeric ? "num" : undefined}>
                    {c.label}
                  </th>
                ))}
                <th className="num">Qtà</th>
                <th>Conteggio</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ textAlign: "center", padding: "20pt", color: "#666" }}>
                    Nessun elemento con i filtri correnti.
                  </td>
                </tr>
              ) : (
                items.map((w) => {
                  const qty = w.isAvailable ? w.quantity : 0;
                  return (
                    <tr key={w.id} className={qty === 0 ? "out" : undefined}>
                      {columns.map((c) => (
                        <td key={c.label} className={[c.numeric ? "num" : "", c.bold ? "name" : ""].join(" ")}>
                          {c.value(w)}
                        </td>
                      ))}
                      <td className={`num ${qty < LOW_STOCK ? "low" : ""}`}>{qty === 0 ? "esaurito" : qty}</td>
                      <td className="count">
                        <span className="count-box" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="int-totals">
            <span>
              Etichette <b>{totals.labels}</b>
            </span>
            <span>
              Bottiglie totali <b>{totals.bottles}</b>
            </span>
            {showValue ? (
              <span>
                Valore magazzino (prezzi di carta) <b>{formatCartaPrice(totals.value) || "0"}</b>
              </span>
            ) : null}
          </div>
          <div className="int-legend">
            Quantità in grassetto: sotto {LOW_STOCK} bottiglie. {footnote}
          </div>
        </div>
      )}
    </div>
  );
}

export function InternalPrintView({ filters }: { filters: WineFiltersState }) {
  const { wines, isLoading, error } = useWines("wines");
  const items = useMemo(() => filterWines(wines, filters), [wines, filters]);
  return (
    <InternalPrintLayout
      title="Lista vini · uso interno"
      noun={["vino", "vini"]}
      items={items}
      columns={WINE_COLUMNS}
      filterParts={describeFilters(filters)}
      isLoading={isLoading}
      error={error}
      showValue
      footnote="Ordine per bin."
    />
  );
}

export function InternalSpiritsPrintView({ filters }: { filters: GrappaFiltersState }) {
  const { wines, isLoading, error } = useWines("grappeDistillati");
  const items = useMemo(() => filterSpirits(wines, filters), [wines, filters]);
  return (
    <InternalPrintLayout
      title="Distillati · uso interno"
      noun={["distillato", "distillati"]}
      items={items}
      columns={SPIRIT_COLUMNS}
      filterParts={describeSpiritFilters(filters)}
      isLoading={isLoading}
      error={error}
      showValue={false}
      footnote="Ordine della carta."
    />
  );
}

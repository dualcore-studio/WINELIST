"use client";

import { useMemo } from "react";
import { PagedPreview, type FlowItem, type FlowRow } from "@/components/print/paged-preview";
import type { GrappaFiltersState } from "@/components/grappe/grappa-filters";
import type { WineFiltersState } from "@/components/wines/wine-filters";
import { describeSpiritFilters, filterSpirits } from "@/features/grappe/filters";
import { describeFilters, filterWines } from "@/features/wines/filters";
import { sortSpirits, type SpiritSort, type SpiritSortKey } from "@/features/grappe/sort";
import { sortWines, type WineSort, type WineSortKey } from "@/features/wines/sort";
import { needsReorder } from "@/features/stock/stock";
import { useWines } from "@/features/wines/repository";
import type { Lang } from "@/lib/i18n/config";
import type { Currency } from "@/lib/currency";
import { useCurrency } from "@/features/settings/currency";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { countryLabel, formatDateTime, formatPrice, wineTypeLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { formatVintage, type Wine } from "@/types/wine";

/**
 * Stampa ad uso interno (vini e distillati): la lista filtrata con tutte le colonne, quantità
 * comprese, una colonna vuota "Conteggio" per l'inventario a mano e i totali in fondo.
 */

const CSS = `
.int-doc { color: #111; font-family: Arial, Helvetica, sans-serif; }
.int-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 6pt; }
.int-head h1 { font-size: 15pt; margin: 0; letter-spacing: .02em; }
.int-head .meta { font-size: 8.5pt; color: #444; text-align: right; line-height: 1.4; }
.int-filters { margin-top: 5pt; font-size: 8.5pt; color: #333; padding-bottom: 8pt; }
.int-table { width: 100%; border-collapse: collapse; font-size: 8pt; table-layout: fixed; }
.int-table thead th {
  text-align: left; background: #2e2e2e; color: #fff; font-weight: 700; padding: 4pt 5pt;
  font-size: 7pt; text-transform: uppercase; letter-spacing: .03em;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.int-table td { padding: 2pt 4pt; line-height: 1.2; border-bottom: 1px solid #ddd; vertical-align: top; overflow-wrap: anywhere; }
.int-table tr.even td { background: #f6f6f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.int-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.int-table th.num { text-align: right; }
.int-table .name { font-weight: 700; }
.int-table .low { font-weight: 700; }
.int-table .out td { color: #777; }
.int-table .count { border-left: 1px solid #bbb; }
.int-table .count-box { display: inline-block; width: 100%; height: 9pt; border-bottom: 1px solid #999; }
.int-totals { padding-top: 10pt; display: flex; gap: 28pt; font-size: 9pt; }
.int-totals b { font-size: 11pt; }
.int-legend { margin-top: 4pt; font-size: 7.5pt; color: #666; }
.int-page-number { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #555; }
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

/** Prezzo in dollari nella lingua scelta; vuoto se assente o segnaposto (≤ 0). */
function money(value: number | undefined, currency: Currency): string {
  return value !== undefined && Number.isFinite(value) && value > 0 ? formatPrice(value, currency) : "";
}

function wineColumns(t: Dictionary, lang: Lang, currency: Currency): Column[] {
  const c = t.wines.col;
  return [
    { label: c.bin, width: "5%", value: (w) => dash(w.binNumber) },
    { label: t.print.internal.wine, width: "17%", bold: true, value: (w) => w.name },
    { label: c.winery, width: "13%", value: (w) => dash(w.winery) },
    { label: t.print.internal.grapeCategory, width: "12%", value: (w) => dash(grapeAndCategory(w)) },
    { label: c.vintage, width: "5%", numeric: true, value: (w) => dash(formatVintage(w.vintage)) },
    { label: c.type, width: "7%", value: (w) => wineTypeLabel(w.type, lang) },
    { label: c.country, width: "7%", value: (w) => dash(countryLabel(w.country, lang)) },
    { label: c.region, width: "10%", value: (w) => dash(w.region) },
    { label: c.price, width: "6%", numeric: true, value: (w) => dash(money(w.price, currency)) },
    { label: t.print.internal.glass, width: "5%", numeric: true, value: (w) => dash(money(w.pricePerGlass, currency)) }
  ];
}

/** I distillati non hanno bottiglia a listino (prezzo segnaposto 1): mostrata solo se > 1. */
function spiritColumns(t: Dictionary, currency: Currency): Column[] {
  return [
    { label: t.print.internal.spirit, width: "30%", bold: true, value: (w) => w.name },
    {
      label: t.spirits.col.producer,
      width: "18%",
      value: (w) => (w.winery.trim().toLowerCase() === "other" ? "—" : dash(w.winery))
    },
    { label: t.spirits.col.type, width: "16%", value: (w) => dash(w.spiritType ?? "") },
    { label: t.print.internal.glass, width: "8%", numeric: true, value: (w) => dash(money(w.pricePerGlass, currency)) },
    {
      label: t.print.internal.bottle,
      width: "8%",
      numeric: true,
      value: (w) => dash(w.price > 1 ? money(w.price, currency) : "")
    }
  ];
}

type LayoutProps = {
  title: string;
  countLabel: (n: number) => string;
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
  countLabel,
  items,
  columns,
  filterParts,
  isLoading,
  error,
  showValue,
  footnote
}: LayoutProps) {
  const { t, lang } = useI18n();
  const currency = useCurrency();
  const ti = t.print.internal;
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

  const printedAt = useMemo(() => formatDateTime(new Date(), lang), [lang]);

  const flow = useMemo((): FlowItem[] => {
    const colCount = columns.length + 2;
    const rows: FlowRow[] =
      items.length === 0
        ? [
            {
              key: "empty",
              node: (
                <tr>
                  <td colSpan={colCount} style={{ textAlign: "center", padding: "20pt", color: "#666" }}>
                    {ti.noItems}
                  </td>
                </tr>
              )
            }
          ]
        : items.map((w, i) => {
            const qty = w.isAvailable ? w.quantity : 0;
            // Righe alterne con una classe: nth-child ripartirebbe da capo a ogni pagina.
            const cls = [qty === 0 ? "out" : "", i % 2 === 1 ? "even" : ""].join(" ").trim();
            return {
              key: w.id,
              node: (
                <tr className={cls || undefined}>
                  {columns.map((c) => (
                    <td key={c.label} className={[c.numeric ? "num" : "", c.bold ? "name" : ""].join(" ")}>
                      {c.value(w)}
                    </td>
                  ))}
                  <td className={`num ${needsReorder(w) ? "low" : ""}`}>{qty === 0 ? ti.soldOut : qty}</td>
                  <td className="count">
                    <span className="count-box" />
                  </td>
                </tr>
              )
            };
          });

    return [
      {
        kind: "block",
        key: "head",
        keepWithNext: true,
        node: (
          <>
            <div className="int-head">
              <h1>{title}</h1>
              <div className="meta">
                {ti.printedAt(printedAt)}
                <br />
                {countLabel(items.length)}
              </div>
            </div>
            <div className="int-filters">
              <strong>{ti.filters}</strong> {filterParts.length ? filterParts.join(" · ") : ti.noFilters}
            </div>
          </>
        )
      },
      {
        kind: "table",
        key: "list",
        className: "int-table",
        colgroup: (
          <colgroup>
            {columns.map((c) => (
              <col key={c.label} style={{ width: c.width }} />
            ))}
            <col style={{ width: "4%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
        ),
        head: (
          <tr>
            {columns.map((c) => (
              <th key={c.label} className={c.numeric ? "num" : undefined}>
                {c.label}
              </th>
            ))}
            <th className="num">{t.common.qty}</th>
            <th>{ti.count}</th>
          </tr>
        ),
        rows
      },
      {
        kind: "block",
        key: "totals",
        keepWithNext: true,
        node: (
          <div className="int-totals">
            <span>
              {ti.labels} <b>{totals.labels}</b>
            </span>
            <span>
              {ti.bottles} <b>{totals.bottles}</b>
            </span>
            {showValue ? (
              <span>
                {ti.stockValue} <b>{formatPrice(totals.value, currency)}</b>
              </span>
            ) : null}
          </div>
        )
      },
      {
        kind: "block",
        key: "legend",
        node: (
          <div className="int-legend">
            {ti.lowStock} {footnote}
          </div>
        )
      }
    ];
  }, [items, columns, title, countLabel, filterParts, showValue, footnote, totals, currency, printedAt, t, ti]);

  return (
    <PagedPreview
      title={ti.toolbarTitle}
      storageKey="print-settings:internal"
      defaultOrientation="landscape"
      documentMargins={INTERNAL_MARGINS}
      css={CSS}
      contentClassName="int-doc"
      items={flow}
      footer={(page, total) => <span className="int-page-number">{t.print.preview.pageOf(page, total)}</span>}
      footerAlign="right"
      loading={isLoading}
      error={error}
    />
  );
}

/** Margini della stampa interna, in pollici. */
const INTERNAL_MARGINS = { top: 0.45, right: 0.4, bottom: 0.5, left: 0.4 };

/** Nome della colonna ordinata, come nell'intestazione della tabella a schermo. */
function wineSortLabel(t: Dictionary, key: WineSortKey): string {
  const c = t.wines.col;
  const labels: Record<WineSortKey, string> = {
    bin: c.bin,
    name: c.name,
    winery: c.winery,
    category: c.category,
    vintage: c.vintage,
    type: c.type,
    country: c.country,
    region: c.region,
    price: c.price,
    quantity: t.common.qty
  };
  return labels[key];
}

function spiritSortLabel(t: Dictionary, key: SpiritSortKey): string {
  const c = t.spirits.col;
  const labels: Record<SpiritSortKey, string> = {
    name: c.name,
    producer: c.producer,
    type: c.type,
    glass: c.glassPrice,
    bottle: c.bottlePrice,
    quantity: t.common.qty
  };
  return labels[key];
}

/** Stesso ordine della tabella a schermo; la nota in fondo dice quale. */
export function InternalPrintView({ filters, sort }: { filters: WineFiltersState; sort: WineSort }) {
  const { t, lang } = useI18n();
  const currency = useCurrency();
  const { wines, isLoading, error } = useWines("wines");
  const items = useMemo(() => sortWines(filterWines(wines, filters), sort, lang), [wines, filters, sort, lang]);
  // Colonne e filtri stabili: ogni nuovo array farebbe rimisurare e reimpaginare il documento.
  const columns = useMemo(() => wineColumns(t, lang, currency), [t, lang, currency]);
  const filterParts = useMemo(() => describeFilters(filters, t, lang), [filters, t, lang]);
  return (
    <InternalPrintLayout
      title={t.print.internal.winesTitle}
      countLabel={t.print.internal.wineCount}
      items={items}
      columns={columns}
      filterParts={filterParts}
      isLoading={isLoading}
      error={error}
      showValue
      footnote={sort ? t.print.internal.sortedBy(wineSortLabel(t, sort.key), sort.dir === "desc") : t.print.internal.orderByBin}
    />
  );
}

export function InternalSpiritsPrintView({ filters, sort }: { filters: GrappaFiltersState; sort: SpiritSort }) {
  const { t, lang } = useI18n();
  const currency = useCurrency();
  const { wines, isLoading, error } = useWines("grappeDistillati");
  const items = useMemo(
    () => sortSpirits(filterSpirits(wines, filters), sort, lang),
    [wines, filters, sort, lang]
  );
  const columns = useMemo(() => spiritColumns(t, currency), [t, currency]);
  const filterParts = useMemo(() => describeSpiritFilters(filters, t), [filters, t]);
  return (
    <InternalPrintLayout
      title={t.print.internal.spiritsTitle}
      countLabel={t.print.internal.spiritCount}
      items={items}
      columns={columns}
      filterParts={filterParts}
      isLoading={isLoading}
      error={error}
      showValue={false}
      footnote={
        sort ? t.print.internal.sortedBy(spiritSortLabel(t, sort.key), sort.dir === "desc") : t.print.internal.orderByCarta
      }
    />
  );
}

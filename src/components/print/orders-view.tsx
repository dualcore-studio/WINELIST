"use client";

import { useMemo } from "react";
import { PagedPreview, type FlowItem } from "@/components/print/paged-preview";
import { toOrderRows, useStockRows, type DashboardScope } from "@/components/dashboard/dashboard-view";
import { stockQuantity, suggestedOrder } from "@/features/stock/stock";
import { formatDateTime } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { formatVintage } from "@/types/wine";

/**
 * Lista ordini da stampare: articoli sotto scorta non ancora ordinati, raggruppati per fornitore
 * (quelli senza fornitore in fondo), con una colonna vuota per scrivere la quantità ordinata.
 */

const CSS = `
.ord-doc { color: #111; font-family: Arial, Helvetica, sans-serif; }
.ord-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 6pt; }
.ord-head h1 { font-size: 16pt; margin: 0; }
.ord-head .meta { font-size: 8.5pt; color: #444; text-align: right; line-height: 1.4; }
.ord-supplier { font-size: 11.5pt; font-weight: 700; padding: 14pt 0 4pt; }
.ord-table { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: fixed; }
.ord-table thead th {
  text-align: left; background: #2e2e2e; color: #fff; font-weight: 700; padding: 3.5pt 5pt;
  font-size: 7.5pt; text-transform: uppercase; letter-spacing: .03em;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ord-table td { padding: 3pt 5pt; border-bottom: 1px solid #ddd; vertical-align: top; overflow-wrap: anywhere; line-height: 1.25; }
.ord-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ord-table th.num { text-align: right; }
.ord-table .name { font-weight: 700; }
.ord-table .sub { color: #555; font-size: 8pt; }
.ord-table .out { color: #b91c1c; font-weight: 700; }
.ord-table .box { border-left: 1px solid #bbb; }
.ord-table th.box-head { padding-left: 8pt; }
.ord-table .box span { display: inline-block; width: 100%; height: 10pt; border-bottom: 1px solid #999; }
.ord-legend { margin-top: 10pt; font-size: 7.5pt; color: #666; }
.ord-empty { padding: 30pt 0; text-align: center; color: #666; font-size: 10pt; }
.ord-page-number { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #555; }
`;

const MARGINS = { top: 0.5, right: 0.5, bottom: 0.55, left: 0.5 };

export function OrdersPrintView({ scope }: { scope: DashboardScope }) {
  const { t, lang } = useI18n();
  const td = t.stock.dashboard;
  const tp = t.stock.print;
  const { rows, isLoading, error } = useStockRows(scope);
  const printedAt = useMemo(() => formatDateTime(new Date(), lang), [lang]);

  const items = useMemo((): FlowItem[] => {
    const list = toOrderRows(rows);
    const scopeLabel = { all: td.scopeAll, wines: td.scopeWines, spirits: td.scopeSpirits }[scope];
    const head: FlowItem = {
      kind: "block",
      key: "head",
      keepWithNext: true,
      node: (
        <div className="ord-head">
          <h1>
            {tp.title} · {scopeLabel}
          </h1>
          <div className="meta">
            {t.print.internal.printedAt(printedAt)}
            <br />
            {tp.count(list.length)}
          </div>
        </div>
      )
    };
    if (list.length === 0) {
      return [head, { kind: "block", key: "empty", node: <div className="ord-empty">{tp.empty}</div> }];
    }

    // Fornitori in ordine alfabetico, "senza fornitore" per ultimo.
    const groups = new Map<string, typeof list>();
    for (const row of list) {
      const key = row.item.supplier;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const suppliers = Array.from(groups.keys()).sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b)));

    const flow: FlowItem[] = [head];
    for (const supplier of suppliers) {
      const group = groups.get(supplier) ?? [];
      flow.push({
        kind: "block",
        key: `supplier-${supplier}`,
        keepWithNext: true,
        node: <div className="ord-supplier">{supplier || td.noSupplier}</div>
      });
      flow.push({
        kind: "table",
        key: `table-${supplier}`,
        className: "ord-table",
        colgroup: (
          <colgroup>
            <col style={{ width: "7%" }} />
            <col />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
        ),
        head: (
          <tr>
            <th>Bin</th>
            <th>{td.colItem}</th>
            <th className="num">{t.wines.col.vintage}</th>
            <th className="num">{td.colQty}</th>
            <th className="num">{td.colMin}</th>
            <th className="num">{td.colTarget}</th>
            <th className="num">{td.colSuggested}</th>
            <th className="box-head">{td.colOrdered}</th>
          </tr>
        ),
        rows: group.map(({ item, kind }) => {
          const qty = stockQuantity(item);
          const producer = item.winery && item.winery.toLowerCase() !== "other" ? item.winery : "";
          const sub = [producer, kind === "spirit" ? item.spiritType ?? td.kindSpirit : ""].filter(Boolean).join(" · ");
          return {
            key: item.id,
            node: (
              <tr>
                <td>{item.binNumber || "—"}</td>
                <td>
                  <span className="name">{item.name}</span>
                  {sub ? <div className="sub">{sub}</div> : null}
                </td>
                <td className="num">{(kind === "wine" && formatVintage(item.vintage)) || "—"}</td>
                <td className={`num ${qty === 0 ? "out" : ""}`}>{qty}</td>
                <td className="num">{item.minStock}</td>
                <td className="num">{item.targetStock ?? "—"}</td>
                <td className="num">
                  <b>{suggestedOrder(item) ?? "—"}</b>
                </td>
                <td className="box">
                  <span />
                </td>
              </tr>
            )
          };
        })
      });
    }
    flow.push({ kind: "block", key: "legend", node: <div className="ord-legend">{tp.legend}</div> });
    return flow;
  }, [rows, scope, t, td, tp, printedAt]);

  return (
    <PagedPreview
      title={tp.toolbarTitle}
      storageKey="print-settings:orders"
      defaultOrientation="portrait"
      documentMargins={MARGINS}
      css={CSS}
      contentClassName="ord-doc"
      items={items}
      footer={(page, total) => <span className="ord-page-number">{t.print.preview.pageOf(page, total)}</span>}
      footerAlign="right"
      loading={isLoading}
      error={error}
    />
  );
}

import { formatPriceEur } from "@/lib/utils";
import type { GrappaFiltersState } from "@/components/grappe/grappa-filters";
import type { Wine } from "@/types/wine";

function escapeHtml(value: string | number): string {
  const s = String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatGlassPrice(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(Number(value))) return "—";
  return formatPriceEur(Number(value));
}

function buildFiltersSummary(filters: GrappaFiltersState): string[] {
  const parts: string[] = [];
  if (filters.name.trim()) parts.push(`Nome: ${filters.name.trim()}`);
  if (filters.winery.trim()) parts.push(`Produttore: ${filters.winery.trim()}`);
  if (filters.spiritType) parts.push(`Tipologia: ${filters.spiritType}`);
  if (filters.pricePerGlassMax.trim())
    parts.push(`Prezzo bicch. max: ${filters.pricePerGlassMax.trim()}`);
  if (filters.priceMax.trim())
    parts.push(`Prezzo bott. max: ${filters.priceMax.trim()}`);
  if (filters.quantityMin.trim())
    parts.push(`Q.min: ${filters.quantityMin.trim()}`);
  if (filters.quantityMax.trim())
    parts.push(`Q.max: ${filters.quantityMax.trim()}`);
  return parts;
}

/** Apre una finestra di stampa con la lista filtrata di grappe/distillati. */
export function printGrappe(
  wines: readonly Wine[],
  filters: GrappaFiltersState
): void {
  const win = window.open("", "_blank", "width=1200,height=800,noopener");
  if (!win) {
    alert(
      "Impossibile aprire la finestra di stampa. Consenti i popup per questo sito e riprova."
    );
    return;
  }

  const now = new Date();
  const dateLabel = now.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const filtersLine = buildFiltersSummary(filters);
  const filtersHtml = filtersLine.length
    ? `<div class="filters"><strong>Filtri:</strong> ${filtersLine
        .map((p) => escapeHtml(p))
        .join(" · ")}</div>`
    : "";

  const rows = wines
    .map(
      (w) => `
      <tr>
        <td class="strong">${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.winery)}</td>
        <td>${escapeHtml(w.spiritType ?? "—")}</td>
        <td class="num">${escapeHtml(formatGlassPrice(w.pricePerGlass))}</td>
        <td class="num">${escapeHtml(formatPriceEur(w.price))}</td>
        <td class="num">${escapeHtml(String(w.quantity ?? 0))}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>Distillati - Stampa</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      body { padding: 16mm 12mm; }
      h1 { font-size: 18pt; margin: 0 0 4px 0; letter-spacing: 0.02em; }
      .meta { color: #555; font-size: 9.5pt; }
      .filters { margin-top: 8px; font-size: 9.5pt; color: #333; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 9.5pt; }
      thead th {
        text-align: left;
        background: #2e2e2e;
        color: #fff;
        font-weight: 700;
        padding: 6px 8px;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      tbody td {
        padding: 6px 8px;
        border-bottom: 1px solid #e5e5e5;
        vertical-align: top;
      }
      tbody tr:nth-child(even) td { background: #fafafa; }
      td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      td.strong { font-weight: 600; }
      tfoot td { padding-top: 10px; color: #555; font-size: 9pt; }
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body { padding: 0; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <h1>Distillati</h1>
    <div class="meta">Stampa del ${escapeHtml(dateLabel)} · ${wines.length} ${wines.length === 1 ? "distillato" : "distillati"}</div>
    ${filtersHtml}
    <table>
      <thead>
        <tr>
          <th>Nome distillato</th>
          <th>Produttore</th>
          <th>Tipologia</th>
          <th>Prezzo bicchiere</th>
          <th>Prezzo bottiglia</th>
          <th>Qtà</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6" style="padding:20px;text-align:center;color:#666">Nessun distillato da stampare con i filtri correnti.</td></tr>`}
      </tbody>
    </table>
    <script>
      window.addEventListener("load", function () {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

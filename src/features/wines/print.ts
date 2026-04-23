import { formatPriceEur } from "@/lib/utils";
import type { WineFiltersState } from "@/components/wines/wine-filters";
import type { Wine } from "@/types/wine";

/** Escape HTML basilare per iniezione sicura nel documento di stampa. */
function escapeHtml(value: string | number): string {
  const s = String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function grapeAndCategory(wine: Wine): string {
  const g = wine.grape.trim();
  const c = (wine.category || "").trim();
  if (g && c) return `${g} - ${c}`;
  return g || c || "—";
}

/** Riassunto leggibile dei filtri attivi da stampare sotto al titolo. */
function buildFiltersSummary(filters: WineFiltersState): string[] {
  const parts: string[] = [];
  if (filters.binNumber.trim()) parts.push(`Bin: ${filters.binNumber.trim()}`);
  if (filters.name.trim()) parts.push(`Nome: ${filters.name.trim()}`);
  if (filters.winery.trim()) parts.push(`Cantina: ${filters.winery.trim()}`);
  if (filters.categoryText.trim()) parts.push(`Vitigno/Cat.: ${filters.categoryText.trim()}`);
  if (filters.type) parts.push(`Tipologia: ${filters.type}`);
  if (filters.country) parts.push(`Nazione: ${filters.country}`);
  if (filters.region) parts.push(`Regione: ${filters.region}`);
  if (filters.category) parts.push(`Categoria: ${filters.category}`);
  if (filters.vintage.trim()) parts.push(`Annata: ${filters.vintage.trim()}`);
  if (filters.quantityMin.trim()) parts.push(`Q.min: ${filters.quantityMin.trim()}`);
  if (filters.quantityMax.trim()) parts.push(`Q.max: ${filters.quantityMax.trim()}`);
  if (filters.onlyAvailable) parts.push("Solo disponibili");
  return parts;
}

/** Apre una finestra di stampa con la lista filtrata. */
export function printWines(wines: readonly Wine[], filters: WineFiltersState): void {
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
        <td class="num">${w.binNumber > 0 ? escapeHtml(w.binNumber) : "—"}</td>
        <td class="strong">${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.winery)}</td>
        <td>${escapeHtml(grapeAndCategory(w))}</td>
        <td class="num">${escapeHtml(w.vintage)}</td>
        <td>${escapeHtml(w.type)}</td>
        <td>${escapeHtml(w.country)}</td>
        <td>${escapeHtml(w.region)}</td>
        <td class="num">${escapeHtml(formatPriceEur(w.price))}</td>
        <td class="num">${escapeHtml(w.quantity)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>Wine List Manager - Stampa</title>
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
      @page { size: A4 landscape; margin: 12mm; }
      @media print {
        body { padding: 0; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <h1>Wine List Manager</h1>
    <div class="meta">Stampa del ${escapeHtml(dateLabel)} · ${wines.length} ${wines.length === 1 ? "vino" : "vini"}</div>
    ${filtersHtml}
    <table>
      <thead>
        <tr>
          <th>Bin</th>
          <th>Nome vino</th>
          <th>Cantina</th>
          <th>Categoria</th>
          <th>Annata</th>
          <th>Tipologia</th>
          <th>Nazione</th>
          <th>Regione</th>
          <th>Prezzo</th>
          <th>Qtà</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="10" style="padding:20px;text-align:center;color:#666">Nessun vino da stampare con i filtri correnti.</td></tr>`}
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

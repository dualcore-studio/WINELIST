"use client";

import { Fragment, useMemo } from "react";
import { Printer, X } from "lucide-react";
import { useWines } from "@/features/wines/repository";
import { buildCarta, type CartaRow, type CartaSection } from "@/features/print/carta";
import {
  SPECIAL_SELECTIONS,
  SPECIAL_SELECTIONS_HEADING,
  SPECIAL_SELECTIONS_SUBHEADING
} from "@/features/print/special-selections";

/**
 * Carta dei vini per il cliente: impaginazione ricalcata sul Word del ristorante
 * (US Letter, Monotype Corsiva / Lucida Handwriting, numero di pagina in basso).
 * I font sono quelli installati sul PC del ristorante; altrove si usa un corsivo di ripiego.
 */

const CSS = `
@page {
  size: letter;
  margin: 0.69in 0.44in 0.5in 0.44in;
  @bottom-center {
    content: counter(page);
    font-family: Calibri, Carlito, "Segoe UI", sans-serif;
    font-size: 11pt;
    color: #000;
  }
}
html, body { background: #fff !important; }
.carta-root {
  --corsiva: "Monotype Corsiva", "MonotypeCorsiva", "Apple Chancery", "URW Chancery L", cursive;
  --lucida: "Lucida Handwriting", "Lucida Calligraphy", "Apple Chancery", cursive;
  --calibri: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
  color: #000;
  background: #fff;
  min-height: 100dvh;
}
.carta-toolbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid #e5e5e5; background: #fafafa;
  font-family: system-ui, sans-serif; font-size: 14px; color: #333;
}
.carta-toolbar button {
  display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
  border-radius: 8px; border: 1px solid #d4d4d4; background: #fff; font-weight: 600; cursor: pointer;
}
.carta-toolbar .primary { background: #f2711c; border-color: #f2711c; color: #fff; }
.carta-sheet { width: 8.5in; margin: 24px auto; padding: 0.69in 0.44in 0.5in; background: #fff; box-shadow: 0 1px 12px rgba(0,0,0,.12); }
.carta-page-break { break-before: page; }
.carta-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: var(--corsiva); letter-spacing: 0.3pt; }
.carta-table td, .carta-table th { padding: 0.5pt 2pt; vertical-align: middle; font-weight: normal; }
.carta-table tr { break-inside: avoid; }
.carta-table .carta-title { font-family: var(--lucida); font-size: 18pt; text-align: center; padding: 4pt 0 6pt !important; }
.carta-table .carta-title.small { font-size: 16pt; }
.carta-table .carta-title.country-style { font-family: var(--calibri); font-style: italic; font-size: 20pt; }
.carta-table .carta-labels th { font-size: 12pt; }
.carta-labels .left { text-align: left; }
.carta-labels .right { text-align: right; }
.carta-table .carta-country { font-family: var(--calibri); font-style: italic; font-size: 22pt; text-align: center; padding-top: 4pt !important; }
.carta-table .carta-region { font-family: var(--calibri); font-weight: bold; font-style: italic; font-size: 15pt; text-align: center; padding-top: 6pt !important; }
.carta-table .carta-producer { font-family: var(--calibri); font-weight: bold; font-style: italic; font-size: 16pt; text-align: center; padding-top: 8pt !important; }
.carta-table .carta-subtitle { font-family: var(--calibri); font-weight: bold; font-style: italic; font-size: 15pt; text-align: center; }
.carta-item td { font-size: 18pt; line-height: 1.2; }
.carta-item .bin { white-space: nowrap; }
.carta-item .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.carta-item .size { text-align: center; white-space: nowrap; }
.carta-region-row, .carta-country-row, .carta-producer-row { break-after: avoid; }
.carta-table tr.carta-new-page { break-before: page; }
.carta-special { text-align: center; font-family: var(--corsiva); }
.carta-special h2 { font-size: 22pt; font-weight: normal; margin: 0; }
.carta-special .wine { margin-top: 10pt; break-inside: avoid; }
.carta-special .wine h3 { font-size: 18pt; font-weight: bold; margin: 0 0 4pt; }
.carta-special .wine p { font-size: 12pt; font-style: italic; margin: 0; line-height: 1.15; }
.carta-special .prices { display: flex; justify-content: center; gap: 1.2in; margin-top: 3pt; font-size: 12pt; font-style: italic; line-height: 1.15; }
.carta-special .prices span { display: flex; flex-direction: column; }
.carta-status { font-family: system-ui, sans-serif; padding: 48px; text-align: center; color: #555; }
@media print {
  .carta-toolbar { display: none; }
  .carta-sheet { width: auto; margin: 0; padding: 0; box-shadow: none; }
}
`;

/** Larghezze colonne dal Word (Bin ≈ 11%, prezzi ≈ 8% ciascuno). */
function colgroup(section: CartaSection) {
  const bin = section.showBin ? "11%" : "4%";
  switch (section.columns) {
    case "glass-bottle":
      return [bin, "auto", "8%", "9%"];
    case "size-bottle":
      return [bin, "auto", "10%", "10%"];
    case "glass":
    case "bottle":
    default:
      return [bin, "auto", "11%"];
  }
}

function labels(section: CartaSection): string[] {
  switch (section.columns) {
    case "glass-bottle":
      return ["Glass", "Bottle"];
    case "size-bottle":
      return ["", "Bottle"];
    case "glass":
      return ["Glass"];
    default:
      return ["Bottle"];
  }
}

function priceCells(section: CartaSection, row: Extract<CartaRow, { kind: "item" }>) {
  switch (section.columns) {
    case "glass-bottle":
      return [row.glass, row.bottle];
    case "size-bottle":
      return [row.size, row.bottle];
    case "glass":
      return [row.glass];
    default:
      return [row.bottle];
  }
}

function Row({
  section,
  row,
  colCount,
  newPage = false
}: {
  section: CartaSection;
  row: CartaRow;
  colCount: number;
  newPage?: boolean;
}) {
  if (row.kind === "item") {
    const cells = priceCells(section, row);
    return (
      <tr className="carta-item">
        <td className="bin">{section.showBin ? row.bin : ""}</td>
        <td>{row.text}</td>
        {cells.map((value, i) => (
          <td
            key={i}
            className={section.columns === "size-bottle" && i === 0 ? "size" : "num"}
          >
            {value}
          </td>
        ))}
      </tr>
    );
  }
  const cls = {
    country: "carta-country",
    region: "carta-region",
    producer: "carta-producer",
    subtitle: "carta-subtitle"
  }[row.kind];
  return (
    <tr className={`${cls}-row ${newPage ? "carta-new-page" : ""}`}>
      <td colSpan={colCount} className={cls}>
        {row.label}
      </td>
    </tr>
  );
}

function SectionTable({ section }: { section: CartaSection }) {
  const cols = colgroup(section);
  const priceLabels = labels(section);
  const isGlassPage = section.key === "GLASS" || section.key === "GLASS_SPUMANTE";
  const titleClass = [
    "carta-title",
    isGlassPage ? "small" : "",
    section.countryStyleTitle ? "country-style" : ""
  ].join(" ");
  // Nel Word queste sezioni continuano la pagina precedente senza ripetere "Bin No. / Bottle".
  const showLabels =
    section.key !== "GLASS_SPUMANTE" && section.key !== "WA_WHITE" && !section.countryStyleTitle;

  return (
    <table className={`carta-table ${section.breakBefore ? "carta-page-break" : ""}`}>
      <colgroup>
        {cols.map((w, i) => (
          <col key={i} style={w === "auto" ? undefined : { width: w }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th colSpan={cols.length} className={titleClass}>
            {section.title}
          </th>
        </tr>
        {showLabels ? (
          <tr className="carta-labels">
            <th className="left">{section.showBin ? "Bin No." : ""}</th>
            <th />
            {priceLabels.map((l, i) => (
              <th key={i} className="right">
                {l}
              </th>
            ))}
          </tr>
        ) : null}
      </thead>
      <tbody>
        {section.rows.map((row, i) => (
          <Row
            key={row.kind === "item" ? row.id : `${row.kind}-${i}`}
            section={section}
            row={row}
            colCount={cols.length}
            // Negli spumanti ogni nazione dopo la prima inizia su una nuova pagina, come nel Word.
            newPage={row.kind === "country" && i > 0}
          />
        ))}
      </tbody>
    </table>
  );
}

function renderLine(line: string) {
  const m = line.match(/^(Analysis|Taste|Aroma|Flavor|Color):\s*(.*)$/);
  if (m) {
    return (
      <>
        <b>{m[1]}:</b> {m[2]}
      </>
    );
  }
  return line;
}

function SpecialSelectionsPage() {
  return (
    <section className="carta-special carta-page-break">
      <h2>{SPECIAL_SELECTIONS_HEADING}</h2>
      <h2>{SPECIAL_SELECTIONS_SUBHEADING}</h2>
      {SPECIAL_SELECTIONS.map((wine) => (
        <div key={wine.title} className="wine">
          <h3>{wine.title}</h3>
          {wine.lines.map((line) => (
            <p key={line}>{renderLine(line)}</p>
          ))}
          <div className="prices">
            <span>
              <i>Glass</i>
              {wine.glass}
            </span>
            <span>
              <i>Bottle</i>
              {wine.bottle}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

type Scope = "wines" | "spirits";

const SCOPE_LABEL: Record<Scope, string> = {
  wines: "Carta dei vini",
  spirits: "Carta dei distillati"
};

/** Carta dei vini (lista vini) o carta dei distillati (pagina Distillati): ognuna stampa solo la sua sezione. */
export function CartaView({ scope }: { scope: Scope }) {
  const { wines, isLoading, error } = useWines(scope === "wines" ? "wines" : "grappeDistillati");

  const sections = useMemo(
    () => (scope === "wines" ? buildCarta(wines, []) : buildCarta([], wines)),
    [wines, scope]
  );

  return (
    <div className="carta-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="carta-toolbar">
        <span>
          <strong>{SCOPE_LABEL[scope]}</strong> · anteprima di stampa, formato Letter
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
        <p className="carta-status">Caricamento della carta…</p>
      ) : error ? (
        <p className="carta-status">{error}</p>
      ) : (
        <div className="carta-sheet">
          {sections.map((section) => (
            <Fragment key={section.key}>
              <SectionTable section={section} />
              {section.key === "HALF" ? <SpecialSelectionsPage /> : null}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

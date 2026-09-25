"use client";

import { useMemo } from "react";
import { PagedPreview, type FlowBlock, type FlowItem, type FlowTable } from "@/components/print/paged-preview";
import { useWines } from "@/features/wines/repository";
import { useI18n } from "@/lib/i18n/provider";
import { buildCarta, type CartaRow, type CartaSection } from "@/features/print/carta";
import {
  SPECIAL_SELECTIONS,
  SPECIAL_SELECTIONS_HEADING,
  SPECIAL_SELECTIONS_SUBHEADING
} from "@/features/print/special-selections";

/**
 * Carta dei vini per il cliente: impaginazione ricalcata sul Word del ristorante
 * (US Letter di serie, Monotype Corsiva / Lucida Handwriting, numero di pagina in basso).
 * I font sono quelli installati sul PC del ristorante; altrove si usa un corsivo di ripiego.
 */

const CSS = `
.carta-doc {
  --corsiva: "Monotype Corsiva", "MonotypeCorsiva", "Apple Chancery", "URW Chancery L", cursive;
  --lucida: "Lucida Handwriting", "Lucida Calligraphy", "Apple Chancery", cursive;
  --calibri: Calibri, Carlito, "Segoe UI", Arial, sans-serif;
  color: #000;
}
.carta-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: var(--corsiva); letter-spacing: 0.3pt; }
.carta-table td, .carta-table th { padding: 0.5pt 2pt; vertical-align: middle; font-weight: normal; }
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
.carta-special { text-align: center; font-family: var(--corsiva); }
.carta-special h2 { font-size: 22pt; font-weight: normal; margin: 0; }
.carta-special .wine { margin-top: 10pt; }
.carta-special .wine h3 { font-size: 18pt; font-weight: bold; margin: 0 0 4pt; }
.carta-special .wine p { font-size: 12pt; font-style: italic; margin: 0; line-height: 1.15; }
.carta-special .prices { display: flex; justify-content: center; gap: 1.2in; margin-top: 3pt; font-size: 12pt; font-style: italic; line-height: 1.15; }
.carta-special .prices span { display: flex; flex-direction: column; }
.carta-page-number { font-family: Calibri, Carlito, "Segoe UI", sans-serif; font-size: 11pt; color: #000; }
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

function Row({ section, row, colCount }: { section: CartaSection; row: CartaRow; colCount: number }) {
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
    <tr className={`${cls}-row`}>
      <td colSpan={colCount} className={cls}>
        {row.label}
      </td>
    </tr>
  );
}

/** Una sezione della carta come tabella impaginabile: l'intestazione si ripete sulle pagine seguenti. */
function sectionTable(section: CartaSection): FlowTable {
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

  return {
    kind: "table",
    key: section.key,
    className: "carta-table",
    breakBefore: section.breakBefore,
    colgroup: (
      <colgroup>
        {cols.map((w, i) => (
          <col key={i} style={w === "auto" ? undefined : { width: w }} />
        ))}
      </colgroup>
    ),
    head: (
      <>
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
      </>
    ),
    rows: section.rows.map((row, i) => ({
      key: row.kind === "item" ? row.id : `${row.kind}-${i}`,
      node: <Row section={section} row={row} colCount={cols.length} />,
      // Negli spumanti ogni nazione dopo la prima inizia su una nuova pagina, come nel Word.
      breakBefore: row.kind === "country" && i > 0,
      // Nazioni, regioni e produttori non restano soli in fondo alla pagina.
      keepWithNext: row.kind !== "item"
    }))
  };
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

/** Pagina "Special selections": titolo e schede dei vini, ognuna indivisibile. */
function specialSelectionBlocks(): FlowBlock[] {
  return [
    {
      kind: "block",
      key: "special-heading",
      breakBefore: true,
      keepWithNext: true,
      node: (
        <div className="carta-special">
          <h2>{SPECIAL_SELECTIONS_HEADING}</h2>
          <h2>{SPECIAL_SELECTIONS_SUBHEADING}</h2>
        </div>
      )
    },
    ...SPECIAL_SELECTIONS.map(
      (wine): FlowBlock => ({
        kind: "block",
        key: `special-${wine.title}`,
        node: (
          <div className="carta-special">
            <div className="wine">
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
          </div>
        )
      })
    )
  ];
}

/** Margini del Word del ristorante, in pollici. */
const CARTA_MARGINS = { top: 0.69, right: 0.44, bottom: 0.5, left: 0.44 };

type Scope = "wines" | "spirits";

/** Carta dei vini (lista vini) o carta dei distillati (pagina Distillati): ognuna stampa solo la sua sezione. */
export function CartaView({ scope }: { scope: Scope }) {
  const { t } = useI18n();
  const scopeLabel = scope === "wines" ? t.print.menu.cartaWines : t.print.menu.cartaSpirits;
  const { wines, isLoading, error } = useWines(scope === "wines" ? "wines" : "grappeDistillati");

  const items = useMemo(() => {
    const sections = scope === "wines" ? buildCarta(wines, []) : buildCarta([], wines);
    return sections.flatMap((section): FlowItem[] =>
      section.key === "HALF" ? [sectionTable(section), ...specialSelectionBlocks()] : [sectionTable(section)]
    );
  }, [wines, scope]);

  return (
    <PagedPreview
      title={scopeLabel}
      storageKey="print-settings:carta"
      defaultOrientation="portrait"
      documentMargins={CARTA_MARGINS}
      css={CSS}
      contentClassName="carta-doc"
      items={items}
      footer={(page) => <span className="carta-page-number">{page}</span>}
      loading={isLoading}
      loadingText={t.print.cartaLoading}
      error={error}
    />
  );
}

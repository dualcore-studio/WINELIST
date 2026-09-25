"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { clsx } from "clsx";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Maximize,
  MoveHorizontal,
  Printer,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  MARGIN_PRESETS,
  PAPERS,
  PX_PER_IN,
  SCALE_MAX,
  SCALE_MIN,
  defaultSettings,
  fromUnit,
  loadSettings,
  paperById,
  parsePageRange,
  resolveMargins,
  saveSettings,
  sheetSize,
  toUnit,
  type Margins,
  type Orientation,
  type PageSettings
} from "@/features/print/page-setup";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Anteprima di stampa a pagine: il documento è descritto come un flusso di blocchi e di tabelle
 * (righe), ogni elemento viene misurato alla larghezza utile del foglio e distribuito in pagine
 * di dimensione reale. La stampa usa le stesse pagine, quindi ciò che si vede è ciò che esce.
 */

export type FlowBlock = {
  kind: "block";
  key: string;
  node: ReactNode;
  /** Inizia sempre una nuova pagina. */
  breakBefore?: boolean;
  /** Non resta in fondo alla pagina da solo (titoli): va a capo insieme all'elemento seguente. */
  keepWithNext?: boolean;
};

export type FlowRow = {
  key: string;
  /** Un elemento <tr>. */
  node: ReactNode;
  breakBefore?: boolean;
  keepWithNext?: boolean;
};

export type FlowTable = {
  kind: "table";
  key: string;
  className?: string;
  colgroup: ReactNode;
  /** Contenuto del <thead>. */
  head?: ReactNode;
  /** Ripete l'intestazione su ogni pagina in cui la tabella continua (predefinito: sì). */
  repeatHead?: boolean;
  rows: FlowRow[];
  breakBefore?: boolean;
};

export type FlowItem = FlowBlock | FlowTable;

type Props = {
  /** Nome del documento nella barra laterale. */
  title: string;
  /** Chiave per ricordare le impostazioni nel browser. */
  storageKey: string;
  defaultOrientation: Orientation;
  /** Margini propri del documento (preset "Predefiniti"), in pollici. */
  documentMargins: Margins;
  /** CSS del documento (senza regole @page né interruzioni di pagina: le gestisce l'anteprima). */
  css: string;
  /** Classe del contenitore del documento (font, colori). */
  contentClassName: string;
  items: FlowItem[];
  /** Numero di pagina nel margine inferiore. */
  footer: (page: number, total: number) => ReactNode;
  footerAlign?: "center" | "right";
  loading?: boolean;
  loadingText?: string;
  error?: string | null;
};

type Measures = { items: FlowItem[]; width: number; blocks: number[]; heads: number[]; rows: number[][] };

type Piece = { item: number; rows: number[] };
type Page = Piece[];

/** Margine di sicurezza per gli arrotondamenti dei bordi delle tabelle. */
const FIT_TOLERANCE_PX = 2;

function paginate(items: FlowItem[], m: Measures, capacity: number): Page[] {
  type Unit = { item: number; row: number; h: number; breakBefore: boolean; keep: boolean };
  const units: Unit[] = [];
  items.forEach((it, i) => {
    if (it.kind === "block") {
      units.push({ item: i, row: -1, h: m.blocks[i], breakBefore: !!it.breakBefore, keep: !!it.keepWithNext });
    } else if (it.rows.length === 0) {
      units.push({ item: i, row: -1, h: m.heads[i], breakBefore: !!it.breakBefore, keep: false });
    } else {
      it.rows.forEach((r, j) =>
        units.push({
          item: i,
          row: j,
          h: m.rows[i][j],
          breakBefore: !!r.breakBefore || (j === 0 && !!it.breakBefore),
          keep: !!r.keepWithNext
        })
      );
    }
  });

  const headed = new Set<number>();
  const headCost = (item: number) => {
    const it = items[item] as FlowTable;
    return !headed.has(item) || it.repeatHead !== false ? m.heads[item] : 0;
  };
  const cost = (u: Unit, open: number) => (u.row < 0 || open === u.item ? u.h : u.h + headCost(u.item));

  const pages: Page[] = [[]];
  let used = 0;
  let openTable = -1;
  const current = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    used = 0;
    openTable = -1;
  };

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (current().length > 0) {
      if (u.breakBefore) {
        newPage();
      } else {
        // Un titolo va a capo insieme a ciò che introduce, se il gruppo sta in una pagina.
        let need = 0;
        let open = openTable;
        for (let j = i; j < units.length; j++) {
          const v = units[j];
          need += cost(v, open);
          open = v.row >= 0 ? v.item : -1;
          if (!v.keep || j + 1 >= units.length || units[j + 1].breakBefore) break;
        }
        if ((need <= capacity && used + need > capacity) || used + cost(u, openTable) > capacity) newPage();
      }
    }

    const page = current();
    if (u.row < 0) {
      page.push({ item: u.item, rows: [] });
      if (items[u.item].kind === "table") headed.add(u.item);
      used += u.h;
      openTable = -1;
    } else {
      if (openTable !== u.item) {
        used += headCost(u.item);
        headed.add(u.item);
        page.push({ item: u.item, rows: [] });
        openTable = u.item;
      }
      page[page.length - 1].rows.push(u.row);
      used += u.h;
    }
  }
  return pages;
}

function PieceView({ item, rows }: { item: FlowItem; rows: number[] }) {
  if (item.kind === "block") return <div className="pv-flow">{item.node}</div>;
  const firstChunk = rows.length === 0 || rows[0] === 0;
  const showHead = item.head && (firstChunk || item.repeatHead !== false);
  return (
    <div className="pv-flow">
      <table className={item.className}>
        {item.colgroup}
        {showHead ? <thead>{item.head}</thead> : null}
        <tbody>
          {rows.map((j) => (
            <Fragment key={item.rows[j].key}>{item.rows[j].node}</Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
/** "auto" = 100%, ridotto se il foglio non entra in larghezza. */
type ZoomMode = "auto" | "width" | "page" | number;
const CANVAS_PAD = 32;

const BASE_CSS = `
.pv-flow { display: flow-root; }
.pv-measure { position: absolute; left: -100000px; top: 0; visibility: hidden; pointer-events: none; }
.pv-page { position: relative; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08); overflow: hidden; scroll-margin-top: 16px; }
.pv-page.pv-skip { opacity: .4; }
.pv-content { position: absolute; overflow: hidden; }
.pv-scaler { transform-origin: 0 0; }
.pv-footer { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; }
`;

function printCss(settings: PageSettings, sheet: { width: number; height: number }) {
  const paper = paperById(settings.paper);
  return `
@page { size: ${paper.cssName} ${settings.orientation}; margin: 0; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .pv-chrome, .pv-measure, .pv-skip { display: none !important; }
  .pv-root, .pv-main, .pv-canvas { display: block !important; position: static !important; overflow: visible !important; height: auto !important; background: none !important; padding: 0 !important; }
  .pv-pages { zoom: 1 !important; display: block !important; padding: 0 !important; }
  .pv-page { box-shadow: none !important; margin: 0 !important; opacity: 1 !important; width: ${sheet.width}in !important; height: calc(${sheet.height}in - 1px) !important; break-after: page; }
  .pv-page.pv-last { break-after: auto; }
}`;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns
}: {
  label: string;
  value: T;
  /** span: colonne occupate dall'opzione (per le etichette lunghe). */
  options: { value: T; label: string; span?: number }[];
  onChange: (v: T) => void;
  columns: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-lg border border-line bg-canvas p-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={o.span ? { gridColumn: `span ${o.span}` } : undefined}
            className={clsx(
              "h-8 truncate rounded-md px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
              active ? "bg-accent text-white shadow-sm" : "text-neutral-600 hover:bg-white hover:text-text"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      {children}
      {hint}
    </div>
  );
}

const inputClass =
  "h-8 w-full rounded-md border border-line bg-white px-2.5 text-[13px] text-text outline-none transition-colors hover:border-neutral-300 focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent-ring";

/** Campo numerico che accetta la virgola decimale e applica il valore solo se valido. */
function NumberField({
  value,
  onCommit,
  min,
  max,
  step,
  ariaLabel,
  suffix
}: {
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    else setText(String(value));
  };
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.round((value + (e.key === "ArrowUp" ? step : -step)) * 100) / 100;
            onCommit(Math.min(max, Math.max(min, next)));
          }
        }}
        className={clsx(inputClass, suffix && "pr-9")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-canvas hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function PagedPreview({
  title,
  storageKey,
  defaultOrientation,
  documentMargins,
  css,
  contentClassName,
  items,
  footer,
  footerAlign = "center",
  loading = false,
  loadingText,
  error = null
}: Props) {
  const { t } = useI18n();
  const tp = t.print.preview;
  const fallback = useMemo(
    () => defaultSettings(defaultOrientation, documentMargins),
    [defaultOrientation, documentMargins]
  );
  const [settings, setSettings] = useState<PageSettings>(fallback);
  const settingsLoaded = useRef(false);

  // Le impostazioni salvate si leggono dopo il montaggio (il server non ha localStorage).
  useEffect(() => {
    setSettings(loadSettings(storageKey, fallback));
    settingsLoaded.current = true;
  }, [storageKey, fallback]);
  useEffect(() => {
    if (settingsLoaded.current) saveSettings(storageKey, settings);
  }, [storageKey, settings]);

  const update = useCallback(
    (patch: Partial<PageSettings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  const paper = paperById(settings.paper);
  const sheet = sheetSize(settings);
  const margins = resolveMargins(settings, documentMargins);
  const scale = settings.scale / 100;
  const contentW = Math.max(0.5, sheet.width - margins.left - margins.right);
  const contentH = Math.max(0.5, sheet.height - margins.top - margins.bottom);
  const measureWidth = Math.round((contentW * PX_PER_IN) / scale);
  const capacity = (contentH * PX_PER_IN) / scale - FIT_TOLERANCE_PX;

  // --- Misura e impaginazione ---
  const measureRef = useRef<HTMLDivElement>(null);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [measures, setMeasures] = useState<Measures | null>(null);

  useEffect(() => {
    if (!document.fonts) return;
    let alive = true;
    const bump = () => alive && setFontsVersion((v) => v + 1);
    void document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => {
      alive = false;
      document.fonts.removeEventListener("loadingdone", bump);
    };
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || loading || error) return;
    const blocks: number[] = [];
    const heads: number[] = [];
    const rows: number[][] = [];
    const nodes = root.querySelectorAll<HTMLElement>(":scope > [data-flow]");
    items.forEach((it, i) => {
      const el = nodes[i];
      if (!el) return;
      if (it.kind === "block") {
        blocks[i] = el.getBoundingClientRect().height;
      } else {
        heads[i] = el.querySelector("thead")?.getBoundingClientRect().height ?? 0;
        rows[i] = Array.from(el.querySelectorAll<HTMLElement>(":scope > table > tbody > tr")).map(
          (tr) => tr.getBoundingClientRect().height
        );
      }
    });
    setMeasures({ items, width: measureWidth, blocks, heads, rows });
  }, [items, measureWidth, fontsVersion, loading, error]);

  const pages = useMemo(() => {
    if (!measures || measures.items !== items || measures.width !== measureWidth) return null;
    return paginate(items, measures, capacity);
  }, [measures, items, measureWidth, capacity]);

  const total = pages?.length ?? 0;
  const range = useMemo(() => parsePageRange(settings.pageRange, total), [settings.pageRange, total]);
  const rangeInvalid = settings.pageRange.trim() !== "" && range === null;
  const printed = range ?? new Set<number>();
  const lastPrinted = Math.max(0, ...Array.from(printed));

  // --- Zoom e navigazione ---
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [zoomMode, setZoomMode] = useState<ZoomMode>("auto");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sheetPx = { width: sheet.width * PX_PER_IN, height: sheet.height * PX_PER_IN };
  const fitWidth = canvasSize.width ? (canvasSize.width - CANVAS_PAD * 2) / sheetPx.width : 1;
  const fitPage = canvasSize.height
    ? Math.min(fitWidth, (canvasSize.height - CANVAS_PAD * 2) / sheetPx.height)
    : fitWidth;
  const zoom = Math.max(
    0.1,
    zoomMode === "auto" ? Math.min(1, fitWidth) : zoomMode === "width" ? fitWidth : zoomMode === "page" ? fitPage : zoomMode
  );

  const stepZoom = (dir: 1 | -1) => {
    const next =
      dir > 0 ? ZOOM_STEPS.find((z) => z > zoom + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001);
    if (next) setZoomMode(next);
  };

  const goTo = useCallback(
    (page: number, smooth = true) => {
      if (!total) return;
      const p = Math.min(total, Math.max(1, page));
      pageRefs.current[p - 1]?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
      setCurrentPage(p);
    },
    [total]
  );

  // Pagina corrente = l'ultima il cui bordo superiore ha superato il 40% dell'area visibile.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = canvas.getBoundingClientRect();
        const line = box.top + box.height * 0.4;
        let p = 1;
        pageRefs.current.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top <= line) p = i + 1;
        });
        // In fondo all'area l'ultima pagina è quella corrente, anche se non arriva alla soglia.
        if (canvas.scrollTop + canvas.clientHeight >= canvas.scrollHeight - 2) {
          p = pageRefs.current.filter(Boolean).length || p;
        }
        setCurrentPage(p);
      });
    };
    canvas.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      canvas.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  // Dopo un cambio di zoom o di impaginazione si resta sulla stessa pagina.
  const currentRef = useRef(currentPage);
  currentRef.current = currentPage;
  useLayoutEffect(() => {
    if (!total) return;
    const p = Math.min(total, currentRef.current);
    pageRefs.current[p - 1]?.scrollIntoView({ block: "start" });
    setCurrentPage(p);
  }, [zoom, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "PageDown" || (e.key === "ArrowRight" && !e.metaKey)) goTo(currentRef.current + 1);
      else if (e.key === "PageUp" || (e.key === "ArrowLeft" && !e.metaKey)) goTo(currentRef.current - 1);
      else if (e.key === "Home") goTo(1);
      else if (e.key === "End") goTo(total);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, total]);

  const ready = !loading && !error && pages !== null;
  const canPrint = ready && !rangeInvalid && printed.size > 0;

  const marginLabels: Record<(typeof MARGIN_PRESETS)[number], string> = {
    default: tp.marginDefault,
    narrow: tp.marginNarrow,
    wide: tp.marginWide,
    none: tp.marginNone,
    custom: tp.marginCustom
  };
  const marginSides = [
    ["top", tp.marginTop],
    ["bottom", tp.marginBottom],
    ["left", tp.marginLeft],
    ["right", tp.marginRight]
  ] as const;
  const maxMargin = (side: keyof Margins) =>
    side === "top" || side === "bottom" ? sheet.height / 2 - 0.5 : sheet.width / 2 - 0.5;

  const pageContentStyle = {
    top: `${margins.top}in`,
    left: `${margins.left}in`,
    width: `${contentW}in`,
    height: `${contentH}in`
  };

  return (
    <div className="pv-root fixed inset-0 flex flex-col overflow-hidden bg-[#e9e7e4] font-sans text-text md:flex-row">
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + css + printCss(settings, sheet) }} />

      <div className="pv-main flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Barra superiore: navigazione tra le pagine e zoom. */}
        <div className="pv-chrome flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
          <div className="flex items-center gap-0.5" aria-label={tp.navigation} role="group">
            <IconButton label={tp.firstPage} onClick={() => goTo(1)} disabled={!ready || currentPage <= 1}>
              <ChevronFirst className="size-4" />
            </IconButton>
            <IconButton
              label={tp.prevPage}
              onClick={() => goTo(currentPage - 1)}
              disabled={!ready || currentPage <= 1}
            >
              <ChevronLeft className="size-4" />
            </IconButton>
            <div className="mx-1 flex items-center gap-1.5 text-[13px] text-neutral-600">
              <span>{tp.page}</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label={tp.goToPage}
                value={ready ? pageInput : ""}
                disabled={!ready}
                onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goTo(Number(pageInput) || 1);
                }}
                onBlur={() => setPageInput(String(currentPage))}
                onFocus={(e) => e.target.select()}
                className="h-8 w-12 rounded-md border border-line bg-white text-center text-[13px] font-semibold tabular-nums text-text outline-none focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent-ring"
              />
              <span className="tabular-nums">
                {tp.of} {ready ? total : "–"}
              </span>
            </div>
            <IconButton
              label={tp.nextPage}
              onClick={() => goTo(currentPage + 1)}
              disabled={!ready || currentPage >= total}
            >
              <ChevronRight className="size-4" />
            </IconButton>
            <IconButton label={tp.lastPage} onClick={() => goTo(total)} disabled={!ready || currentPage >= total}>
              <ChevronLast className="size-4" />
            </IconButton>
          </div>

          <div className="flex items-center gap-0.5" role="group" aria-label={tp.zoom}>
            <IconButton label={tp.zoomOut} onClick={() => stepZoom(-1)} disabled={zoom <= ZOOM_STEPS[0]}>
              <ZoomOut className="size-4" />
            </IconButton>
            <span className="w-12 text-center text-[13px] font-semibold tabular-nums text-neutral-700">
              {Math.round(zoom * 100)}%
            </span>
            <IconButton
              label={tp.zoomIn}
              onClick={() => stepZoom(1)}
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            >
              <ZoomIn className="size-4" />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <IconButton label={tp.fitWidth} onClick={() => setZoomMode("width")}>
              <MoveHorizontal className={clsx("size-4", zoomMode === "width" && "text-accent")} />
            </IconButton>
            <IconButton label={tp.fitPage} onClick={() => setZoomMode("page")}>
              <Maximize className={clsx("size-4", zoomMode === "page" && "text-accent")} />
            </IconButton>
          </div>
        </div>

        {/* Area delle pagine. */}
        <div ref={canvasRef} className="pv-canvas relative min-h-0 flex-1 overflow-auto">
          {loading ? (
            <p className="p-12 text-center text-sm text-neutral-600">{loadingText ?? t.common.loading}</p>
          ) : error ? (
            <p className="p-12 text-center text-sm text-red-700">{error}</p>
          ) : !pages ? (
            <p className="p-12 text-center text-sm text-neutral-600">{tp.paginating}</p>
          ) : (
            <div
              className="pv-pages flex w-max min-w-full flex-col items-center gap-6"
              style={{ zoom, padding: CANVAS_PAD / zoom }}
            >
              {pages.map((page, i) => {
                const n = i + 1;
                const skip = !printed.has(n);
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      pageRefs.current[i] = el;
                    }}
                    className={clsx("pv-page", skip && "pv-skip", n === lastPrinted && "pv-last")}
                    style={{ width: `${sheet.width}in`, height: `${sheet.height}in` }}
                    aria-label={tp.pageOf(n, total)}
                    title={skip ? tp.notPrinted : undefined}
                  >
                    <div className="pv-content" style={pageContentStyle}>
                      <div
                        className={clsx("pv-scaler", contentClassName)}
                        style={{ width: measureWidth, transform: scale === 1 ? undefined : `scale(${scale})` }}
                      >
                        {page.map((piece) => (
                          <PieceView
                            key={`${piece.item}-${piece.rows[0] ?? "h"}`}
                            item={items[piece.item]}
                            rows={piece.rows}
                          />
                        ))}
                      </div>
                    </div>
                    {settings.pageNumbers ? (
                      <div
                        className="pv-footer"
                        style={{
                          height: `${Math.max(margins.bottom, 0.4)}in`,
                          justifyContent: footerAlign === "right" ? "flex-end" : "center",
                          paddingLeft: `${margins.left}in`,
                          paddingRight: `${margins.right}in`
                        }}
                      >
                        {footer(n, total)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Copia invisibile del documento, alla larghezza utile, da cui si misurano i blocchi. */}
      {!loading && !error ? (
        <div ref={measureRef} className={clsx("pv-measure", contentClassName)} style={{ width: measureWidth }} aria-hidden>
          {items.map((item) =>
            item.kind === "block" ? (
              <div key={item.key} data-flow className="pv-flow">
                {item.node}
              </div>
            ) : (
              <div key={item.key} data-flow className="pv-flow">
                <table className={item.className}>
                  {item.colgroup}
                  {item.head ? <thead>{item.head}</thead> : null}
                  <tbody>
                    {item.rows.map((r) => (
                      <Fragment key={r.key}>{r.node}</Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      ) : null}

      {/* Pannello delle impostazioni di stampa. */}
      <aside className="pv-chrome flex max-h-[50dvh] w-full flex-none flex-col border-t border-line bg-white md:max-h-none md:w-80 md:border-l md:border-t-0">
        <div className="border-b border-line px-5 py-4">
          <h1 className="text-base font-semibold text-text">{title}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-600">
            {ready ? (
              <>
                {tp.pageCount(total)}
                {settings.pageRange.trim() && !rangeInvalid ? ` · ${tp.toPrint(printed.size)}` : ""}
              </>
            ) : (
              tp.paginating
            )}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Field label={tp.paper}>
            <Segmented
              label={tp.paper}
              value={settings.paper}
              columns={3}
              options={PAPERS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(paper) => update({ paper })}
            />
            <p className="text-xs text-muted">
              {toUnit(paper.width, paper.unit)} × {toUnit(paper.height, paper.unit)} {paper.unit}
            </p>
          </Field>

          <Field label={tp.orientation}>
            <Segmented
              label={tp.orientation}
              value={settings.orientation}
              columns={2}
              options={[
                { value: "portrait", label: tp.portrait },
                { value: "landscape", label: tp.landscape }
              ]}
              onChange={(orientation) => update({ orientation })}
            />
          </Field>

          <Field label={tp.margins}>
            <Segmented
              label={tp.margins}
              value={settings.marginPreset}
              columns={3}
              options={MARGIN_PRESETS.map((m) => ({ value: m, label: marginLabels[m], span: m === "custom" ? 2 : undefined }))}
              onChange={(marginPreset) =>
                // Si parte dai margini in uso, così "Personalizzati" si ritocca invece di ripartire da zero.
                update(marginPreset === "custom" ? { marginPreset, customMargins: margins } : { marginPreset })
              }
            />
            {settings.marginPreset === "custom" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {marginSides.map(([side, label]) => (
                  <label key={side} className="space-y-1">
                    <span className="block text-xs text-neutral-600">{label}</span>
                    <NumberField
                      ariaLabel={`${tp.margins} ${label}`}
                      value={toUnit(settings.customMargins[side], paper.unit)}
                      min={0}
                      max={toUnit(maxMargin(side), paper.unit)}
                      step={paper.unit === "mm" ? 1 : 0.05}
                      suffix={paper.unit}
                      onCommit={(v) =>
                        update({ customMargins: { ...settings.customMargins, [side]: fromUnit(v, paper.unit) } })
                      }
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </Field>

          <Field label={tp.scale}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={5}
                value={settings.scale}
                aria-label={tp.scale}
                onChange={(e) => update({ scale: Number(e.target.value) })}
                className="min-w-0 flex-1 accent-accent"
              />
              <div className="w-20">
                <NumberField
                  ariaLabel={tp.scale}
                  value={settings.scale}
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={5}
                  suffix="%"
                  onCommit={(scale) => update({ scale: Math.round(scale) })}
                />
              </div>
            </div>
          </Field>

          <Field
            label={tp.pages}
            hint={
              rangeInvalid ? (
                <p className="text-xs text-red-700">{tp.invalidRange}</p>
              ) : (
                <p className="text-xs text-muted">{tp.rangeHint}</p>
              )
            }
          >
            <input
              type="text"
              value={settings.pageRange}
              placeholder={tp.allPages}
              aria-label={tp.pages}
              aria-invalid={rangeInvalid}
              onChange={(e) => update({ pageRange: e.target.value })}
              className={clsx(inputClass, rangeInvalid && "border-red-300")}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-neutral-700">
            <input
              type="checkbox"
              checked={settings.pageNumbers}
              onChange={(e) => update({ pageNumbers: e.target.checked })}
              className="size-4"
            />
            {tp.pageNumbers}
          </label>

          <button
            type="button"
            onClick={() => setSettings(fallback)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-600 hover:text-text"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {tp.reset}
          </button>
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-sm font-semibold text-neutral-700 hover:bg-canvas"
          >
            <X className="size-4" aria-hidden /> {t.common.close}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!canPrint}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="size-4" aria-hidden /> {t.common.print}
          </button>
        </div>
      </aside>
    </div>
  );
}

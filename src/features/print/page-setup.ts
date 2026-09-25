/**
 * Impostazioni di pagina dell'anteprima di stampa: formato carta, orientamento, margini, scala,
 * numeri di pagina e intervallo di pagine. Le misure interne sono in pollici (1in = 96px CSS).
 */

export const PX_PER_IN = 96;
const MM_PER_IN = 25.4;

export type PaperId = "letter" | "legal" | "tabloid" | "a3" | "a4" | "a5";

type Paper = {
  id: PaperId;
  label: string;
  /** Lato corto × lato lungo, in pollici. */
  width: number;
  height: number;
  /** Nome della misura per `@page { size }`, così la finestra di stampa preseleziona il formato. */
  cssName: string;
  /** Unità mostrata per i margini: pollici per i formati americani, millimetri per quelli ISO. */
  unit: "in" | "mm";
};

const mm = (v: number) => v / MM_PER_IN;

export const PAPERS: readonly Paper[] = [
  { id: "letter", label: "Letter", width: 8.5, height: 11, cssName: "letter", unit: "in" },
  { id: "legal", label: "Legal", width: 8.5, height: 14, cssName: "legal", unit: "in" },
  { id: "tabloid", label: "Tabloid", width: 11, height: 17, cssName: "ledger", unit: "in" },
  { id: "a3", label: "A3", width: mm(297), height: mm(420), cssName: "A3", unit: "mm" },
  { id: "a4", label: "A4", width: mm(210), height: mm(297), cssName: "A4", unit: "mm" },
  { id: "a5", label: "A5", width: mm(148), height: mm(210), cssName: "A5", unit: "mm" }
];

export const DEFAULT_PAPER: PaperId = "letter";

export function paperById(id: PaperId): Paper {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}

export type Orientation = "portrait" | "landscape";

export type Margins = { top: number; right: number; bottom: number; left: number };

/** "default" = i margini propri del documento (quelli del Word per la carta). */
export type MarginPreset = "default" | "narrow" | "wide" | "none" | "custom";

export const MARGIN_PRESETS: readonly MarginPreset[] = ["default", "narrow", "wide", "none", "custom"];

const PRESET_MARGINS: Record<Exclude<MarginPreset, "default" | "custom">, Margins> = {
  narrow: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 },
  wide: { top: 1, right: 1, bottom: 1, left: 1 },
  none: { top: 0, right: 0, bottom: 0, left: 0 }
};

export type PageSettings = {
  paper: PaperId;
  orientation: Orientation;
  marginPreset: MarginPreset;
  /** Usati solo con marginPreset "custom". */
  customMargins: Margins;
  /** Scala del contenuto in percentuale (100 = dimensione reale). */
  scale: number;
  pageNumbers: boolean;
  /** Vuoto = tutte le pagine; altrimenti es. "1-3, 5". */
  pageRange: string;
};

export const SCALE_MIN = 25;
export const SCALE_MAX = 200;

export function defaultSettings(orientation: Orientation, margins: Margins): PageSettings {
  return {
    paper: DEFAULT_PAPER,
    orientation,
    marginPreset: "default",
    customMargins: margins,
    scale: 100,
    pageNumbers: true,
    pageRange: ""
  };
}

export function resolveMargins(settings: PageSettings, documentMargins: Margins): Margins {
  switch (settings.marginPreset) {
    case "default":
      return documentMargins;
    case "custom":
      return settings.customMargins;
    default:
      return PRESET_MARGINS[settings.marginPreset];
  }
}

/** Dimensioni del foglio orientato, in pollici. */
export function sheetSize(settings: PageSettings): { width: number; height: number } {
  const paper = paperById(settings.paper);
  return settings.orientation === "portrait"
    ? { width: paper.width, height: paper.height }
    : { width: paper.height, height: paper.width };
}

/** Converte pollici nell'unità del formato (arrotondato per la visualizzazione). */
export function toUnit(inches: number, unit: "in" | "mm"): number {
  return unit === "mm" ? Math.round(inches * MM_PER_IN * 10) / 10 : Math.round(inches * 100) / 100;
}

export function fromUnit(value: number, unit: "in" | "mm"): number {
  return unit === "mm" ? value / MM_PER_IN : value;
}

/**
 * Pagine da stampare (numeri da 1). Accetta "3", "1-4", "5-" e liste separate da virgola;
 * restituisce null se il testo non è valido. Vuoto = tutte.
 */
export function parsePageRange(input: string, total: number): Set<number> | null {
  const all = new Set(Array.from({ length: total }, (_, i) => i + 1));
  const text = input.trim();
  if (!text) return all;
  const pages = new Set<number>();
  for (const raw of text.split(/[,;]/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*(?:-\s*(\d*))?$/);
    if (!m) return null;
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : m[2] === "" ? total : Number(m[2]);
    if (from < 1 || to < from) return null;
    for (let p = from; p <= Math.min(to, total); p++) pages.add(p);
  }
  return pages.size ? pages : null;
}

function isMargins(v: unknown): v is Margins {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return ["top", "right", "bottom", "left"].every(
    (k) => typeof m[k] === "number" && Number.isFinite(m[k]) && (m[k] as number) >= 0
  );
}

/** Impostazioni salvate nel browser; i valori non validi tornano a quelli predefiniti. */
export function loadSettings(key: string, fallback: PageSettings): PageSettings {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as Partial<PageSettings>;
    return {
      paper: PAPERS.some((p) => p.id === v.paper) ? (v.paper as PaperId) : fallback.paper,
      orientation:
        v.orientation === "portrait" || v.orientation === "landscape" ? v.orientation : fallback.orientation,
      marginPreset: MARGIN_PRESETS.includes(v.marginPreset as MarginPreset)
        ? (v.marginPreset as MarginPreset)
        : fallback.marginPreset,
      customMargins: isMargins(v.customMargins) ? v.customMargins : fallback.customMargins,
      scale:
        typeof v.scale === "number" && v.scale >= SCALE_MIN && v.scale <= SCALE_MAX ? v.scale : fallback.scale,
      pageNumbers: typeof v.pageNumbers === "boolean" ? v.pageNumbers : fallback.pageNumbers,
      // L'intervallo vale per una sola stampa: non viene ricordato.
      pageRange: ""
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(key: string, settings: PageSettings): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ...settings, pageRange: "" }));
  } catch {
    // Archiviazione non disponibile (navigazione privata): le impostazioni valgono per la sessione.
  }
}

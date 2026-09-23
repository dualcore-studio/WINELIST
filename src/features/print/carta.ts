import { compareBins, formatVintage, type Wine } from "@/types/wine";

/**
 * Struttura della carta dei vini per il cliente, ricalcata sul documento Word del ristorante
 * ("WineList Jan2023"): stesse sezioni, stesso ordine, stessi titoli in inglese.
 *
 * La sezione di un vino si ricava dai dati che già esistono:
 * - prefisso del bin: GB = al calice, HB = mezza bottiglia, LF = large format;
 * - tipologia + nazione (+ stato per gli USA) per le altre sezioni vini;
 * - spiritType per i distillati.
 * L'ordine dentro la sezione segue displayOrder (posizione in carta), poi il bin.
 */

/** Colonne prezzo mostrate nella sezione. */
export type CartaColumns = "bottle" | "glass" | "glass-bottle" | "size-bottle";

export type CartaRow =
  | { kind: "country"; label: string }
  | { kind: "region"; label: string }
  | { kind: "producer"; label: string }
  | { kind: "subtitle"; label: string }
  | {
      kind: "item";
      id: string;
      bin: string;
      text: string;
      size: string;
      glass: string;
      bottle: string;
    };

export type CartaSection = {
  key: string;
  title: string;
  columns: CartaColumns;
  /** Mostra la colonna "Bin No.". */
  showBin: boolean;
  /** Nuova pagina prima della sezione (come le pagine del Word). */
  breakBefore: boolean;
  /** Titolo come intestazione di nazione (Calibri) invece che in Lucida Handwriting. */
  countryStyleTitle?: boolean;
  rows: CartaRow[];
};

// ---------------------------------------------------------------------------
// Classificazione

const SPIRIT_COLLECTION_KEYS = new Set([
  "GRAPPE",
  "COGNAC",
  "PORTS",
  "SCOTCH",
  "BOURBON",
  "AMARI",
  "TEQUILA"
]);

function normalizeCountry(country: string): string {
  const c = country.trim();
  if (c === "USA" || c === "United States") return "Stati Uniti";
  return c;
}

function usState(region: string): string {
  return region.split("(")[0].trim();
}

function binPrefix(bin: string): string {
  return bin.replace(/\s+/g, "").toUpperCase();
}

/** Chiave della sezione per un vino (collection "wines"). */
export function wineSectionKey(wine: Wine): string {
  const bin = binPrefix(wine.binNumber);
  const country = normalizeCountry(wine.country);
  if (bin.startsWith("GB")) return "GLASS";
  if (wine.type === "Bollicine" && !bin) return "GLASS_SPUMANTE";
  if (bin.startsWith("HB")) return "HALF";
  if (bin.startsWith("LF")) return "LARGE";
  if (wine.type === "Bollicine") return "SPARKLING";
  if (wine.type === "Rosato") return "ROSE";
  if (wine.type === "Dolce") {
    if (wine.pricePerGlass) {
      if (country === "Italia") return "DESSERT_GLASS_IT";
      if (country === "Canada") return "DESSERT_GLASS_CA";
      if (country === "Francia") return "DESSERT_GLASS_FR";
      return "DESSERT_GLASS_OTHER";
    }
    return "DESSERT_BOTTLE";
  }
  if (wine.type === "Fortificato") return "PORTS";
  const color = wine.type === "Bianco" ? "WHITE" : "RED";
  if (country === "Italia") return `IT_${color}`;
  if (country === "Stati Uniti") {
    const state = usState(wine.region);
    if (state === "California") return `CA_${color}`;
    if (state === "Washington") return `WA_${color}`;
    if (state === "Oregon") return `OR_${color}`;
    return `US_${color}`;
  }
  if (country === "Francia") return `FR_${color}`;
  if (country === "Spagna") return `ES_${color}`;
  if (country === "Australia") return `AU_${color}`;
  if (country === "Argentina") return `AR_${color}`;
  return `OTHER_${color}`;
}

/** Chiave della sezione per un distillato (collection "grappeDistillati"). */
export function spiritSectionKey(spirit: Wine): string {
  const t = (spirit.spiritType ?? "").toLowerCase();
  if (t.includes("porto") || t.includes("port")) return "PORTS";
  if (t.includes("grappa") || t.includes("distillat")) return "GRAPPE";
  if (/cognac|brandy|armagnac|calvados|liquore/.test(t)) return "COGNAC";
  if (t.includes("scotch") || t.includes("malt")) return "SCOTCH";
  if (t.includes("bourbon") || t.includes("rye") || t.includes("whisk")) return "BOURBON";
  if (t.includes("amar") || t.includes("digestiv")) return "AMARI";
  if (t.includes("tequila") || t.includes("mezcal")) return "TEQUILA";
  return "AMARI";
}

type SectionDef = {
  key: string;
  title: string;
  columns: CartaColumns;
  showBin: boolean;
  breakBefore: boolean;
  countryStyleTitle?: boolean;
  /** Intestazioni di raggruppamento dentro la sezione. */
  grouping?: "region" | "sparkling" | "glass" | "half" | "producer";
};

/** Ordine identico al Word. GLASS_SPUMANTE è stampata dentro la pagina dei calici. */
const SECTIONS: SectionDef[] = [
  { key: "GLASS", title: "WINE BY THE GLASS AND BY THE BOTTLE", columns: "glass-bottle", showBin: true, breakBefore: false, grouping: "glass" },
  { key: "GLASS_SPUMANTE", title: "DRY SPUMANTE BY THE GLASS", columns: "glass-bottle", showBin: true, breakBefore: false },
  { key: "HALF", title: "HALF BOTTLE", columns: "bottle", showBin: true, breakBefore: true, grouping: "half" },
  { key: "SPARKLING", title: "CHAMPAGNES & SPARKLING WINES", columns: "bottle", showBin: true, breakBefore: true, grouping: "sparkling" },
  { key: "IT_WHITE", title: "ITALIAN WHITE WINES", columns: "bottle", showBin: true, breakBefore: true, grouping: "region" },
  { key: "CA_WHITE", title: "CALIFORNIA WHITE WINES", columns: "bottle", showBin: true, breakBefore: true },
  { key: "WA_WHITE", title: "WASHINGTON STATE WHITE WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "OR_WHITE", title: "OREGON WHITE WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "US_WHITE", title: "AMERICAN WHITE WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "FR_WHITE", title: "FRENCH WHITE WINES", columns: "bottle", showBin: true, breakBefore: true, grouping: "region" },
  { key: "ES_WHITE", title: "SPAIN WHITE WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "AU_WHITE", title: "AUSTRALIA WHITE WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "AR_WHITE", title: "ARGENTINA WHITE", columns: "bottle", showBin: true, breakBefore: false },
  { key: "OTHER_WHITE", title: "WHITE WINES OF THE WORLD", columns: "bottle", showBin: true, breakBefore: false },
  { key: "ROSE", title: "ROSE’ WINES OF THE WORLD", columns: "bottle", showBin: true, breakBefore: true },
  { key: "IT_RED", title: "ITALIAN RED WINES", columns: "bottle", showBin: true, breakBefore: true, grouping: "region" },
  { key: "CA_RED", title: "CALIFORNIA RED WINES", columns: "bottle", showBin: true, breakBefore: true },
  { key: "WA_RED", title: "WASHINGTON STATE RED WINES", columns: "bottle", showBin: true, breakBefore: true },
  { key: "OR_RED", title: "OREGON RED WINES", columns: "bottle", showBin: true, breakBefore: true },
  { key: "US_RED", title: "AMERICAN RED WINES", columns: "bottle", showBin: true, breakBefore: false },
  { key: "ES_RED", title: "SPAIN RED WINES", columns: "bottle", showBin: true, breakBefore: true },
  { key: "FR_RED", title: "FRENCH RED WINES", columns: "bottle", showBin: true, breakBefore: false, grouping: "region" },
  { key: "AU_RED", title: "AUSTRALIA", columns: "bottle", showBin: true, breakBefore: false, countryStyleTitle: true },
  { key: "AR_RED", title: "ARGENTINA RED", columns: "bottle", showBin: true, breakBefore: false, countryStyleTitle: true },
  { key: "OTHER_RED", title: "RED WINES OF THE WORLD", columns: "bottle", showBin: true, breakBefore: false },
  { key: "GRAPPE", title: "GRAPPE E DISTILLATI", columns: "glass", showBin: false, breakBefore: true, grouping: "producer" },
  { key: "COGNAC", title: "COGNACS AND BRANDY", columns: "glass", showBin: false, breakBefore: true },
  { key: "PORTS", title: "PORTS BY THE BOTTLE", columns: "glass-bottle", showBin: false, breakBefore: true },
  { key: "DESSERT_BOTTLE", title: "DESSERT WINE BY THE BOTTLE", columns: "size-bottle", showBin: false, breakBefore: true },
  { key: "LARGE", title: "LARGE FORMAT", columns: "size-bottle", showBin: true, breakBefore: true },
  { key: "SCOTCH", title: "SINGLE MALT SCOTCHES", columns: "glass", showBin: false, breakBefore: true },
  { key: "BOURBON", title: "BOURBON and RYE WHISKEY", columns: "glass", showBin: false, breakBefore: true },
  { key: "AMARI", title: "AMARI & DIGESTIVI", columns: "glass", showBin: false, breakBefore: true },
  { key: "DESSERT_GLASS_IT", title: "ITALIAN DESSERT WINES", columns: "glass", showBin: false, breakBefore: false },
  { key: "DESSERT_GLASS_CA", title: "CANADIAN ICE WINES", columns: "glass", showBin: false, breakBefore: false },
  { key: "DESSERT_GLASS_FR", title: "FRENCH DESSERT WINES", columns: "glass", showBin: false, breakBefore: false },
  { key: "DESSERT_GLASS_OTHER", title: "DESSERT WINES", columns: "glass", showBin: false, breakBefore: false },
  { key: "TEQUILA", title: "TEQUILA", columns: "glass", showBin: false, breakBefore: true }
];

// ---------------------------------------------------------------------------
// Etichette

/** Nomi regione come nel Word (in inglese e maiuscolo). */
const REGION_LABELS: Record<string, string> = {
  "Trentino-Alto Adige": "TRENTINO-ALTO-ADIGE",
  "Friuli-Venezia Giulia": "FRIULI-VENEZIA-GIULIA",
  Borgogna: "BURGUNDY",
  Loira: "LOIRE VALLEY",
  "Valle del Rodano": "RHONE VALLEY",
  "Valle della Loira": "LOIRE VALLEY",
  Provenza: "PROVENCE",
  Champagne: "CHAMPAGNE"
};

const COUNTRY_LABELS: Record<string, string> = {
  Italia: "ITALY",
  Francia: "FRANCE",
  Spagna: "SPAIN",
  "Stati Uniti": "USA",
  Germania: "GERMANY",
  Portogallo: "PORTUGAL",
  Austria: "AUSTRIA"
};

/** "Bordeaux (Pauillac)" → { parent: "BORDEAUX", sub: "Pauillac" }. */
function regionHeading(region: string): { parent: string; sub: string } {
  const r = region.trim();
  const m = r.match(/^(.*?)\s*\((.+)\)\s*$/);
  const base = m ? m[1] : r;
  const sub = m ? m[2] : "";
  const parent = REGION_LABELS[base] ?? base.toUpperCase();
  return { parent, sub };
}

const PRODUCER_LABELS: Record<string, string> = {
  nonino: "GRAPPA NONINO",
  other: "OTHER GRAPPA",
  "": "OTHER GRAPPA"
};

function producerLabel(winery: string): string {
  const w = winery.trim();
  return PRODUCER_LABELS[w.toLowerCase()] ?? w.toUpperCase();
}

/** Sotto-gruppi Jacopo Poli come nel Word. */
function spiritSubgroup(spirit: Wine): string {
  const t = (spirit.spiritType ?? "").toLowerCase();
  if (t.includes("frutta")) return "Distillati di Frutta";
  if (t.includes("uva")) return "Distillati di Uva";
  return "Grappe";
}

/** Formato bottiglia indicato nel nome, es. "Masseto (1.5l)" o "(375ml)". */
const SIZE_IN_NAME = /\s*\((\d+(?:[.,]\d+)?\s*(?:l|ml)?)\)\s*$/i;

function splitSize(name: string): { name: string; size: string } {
  const m = name.match(SIZE_IN_NAME);
  if (!m) return { name, size: "" };
  return { name: name.slice(0, m.index).trim(), size: `(${m[1].replace(/\s+/g, "")})` };
}

/** Prezzi in formato USA senza valuta, come sul Word: 120, 15,000. */
export function formatCartaPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return "";
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Riga vino: "Nome, Cantina, Annata" (le parti vuote vengono saltate). */
function wineLine(wine: Wine, name: string): string {
  return [name, wine.winery.trim(), formatVintage(wine.vintage)].filter(Boolean).join(", ");
}

function itemRow(wine: Wine, isSpirit: boolean): CartaRow {
  const { name, size } = splitSize(wine.name.trim());
  return {
    kind: "item",
    id: wine.id,
    bin: wine.binNumber,
    text: isSpirit ? name : wineLine(wine, name),
    size,
    glass: formatCartaPrice(wine.pricePerGlass),
    bottle: formatCartaPrice(wine.price > 1 ? wine.price : undefined)
  };
}

// ---------------------------------------------------------------------------
// Costruzione

function isPrintable(wine: Wine): boolean {
  return wine.isAvailable && wine.quantity > 0;
}

/** Ordine di carta: displayOrder (0 = non ancora posizionato → in fondo), poi bin. */
function compareCarta(a: Wine, b: Wine): number {
  const oa = a.displayOrder > 0 ? a.displayOrder : Number.MAX_SAFE_INTEGER;
  const ob = b.displayOrder > 0 ? b.displayOrder : Number.MAX_SAFE_INTEGER;
  return oa - ob || compareBins(a.binNumber, b.binNumber) || a.name.localeCompare(b.name);
}

/**
 * Raggruppa mantenendo l'ordine di carta: i gruppi seguono la prima apparizione,
 * i vini dentro il gruppo il loro ordine.
 */
function groupBy<T>(items: T[], key: (item: T) => string): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return [...map.entries()];
}

function buildRows(def: SectionDef, items: Wine[], isSpirit: boolean): CartaRow[] {
  const rows: CartaRow[] = [];
  const pushItems = (list: Wine[]) => list.forEach((w) => rows.push(itemRow(w, isSpirit)));

  switch (def.grouping) {
    case "glass":
      for (const [label, list] of groupBy(items, (w) => (w.type === "Rosso" ? "REDS" : "WHITES"))) {
        rows.push({ kind: "region", label });
        pushItems(list);
      }
      break;
    case "half":
      for (const [label, list] of groupBy(items, (w) =>
        w.type === "Rosso" ? "RED" : w.type === "Bollicine" ? "CHAMPAGNE" : "WHITE"
      )) {
        rows.push({ kind: "region", label });
        pushItems(list);
      }
      break;
    case "sparkling":
      for (const [country, byCountry] of groupBy(items, (w) => normalizeCountry(w.country))) {
        rows.push({ kind: "country", label: COUNTRY_LABELS[country] ?? country.toUpperCase() });
        if (country === "Italia") {
          for (const [region, list] of groupBy(byCountry, (w) => regionHeading(w.region).parent)) {
            if (region) rows.push({ kind: "region", label: region });
            pushItems(list);
          }
        } else {
          pushItems(byCountry);
        }
      }
      break;
    case "region": {
      let lastParent = "";
      for (const [region, list] of groupBy(items, (w) => w.region.trim())) {
        const { parent, sub } = regionHeading(region);
        if (parent && parent !== lastParent) rows.push({ kind: "region", label: parent });
        if (sub) rows.push({ kind: "subtitle", label: sub });
        lastParent = parent;
        pushItems(list);
      }
      break;
    }
    case "producer":
      for (const [key, list] of groupBy(items, (w) =>
        w.winery.trim().toLowerCase() === "jacopo poli" ? `jacopo poli|${spiritSubgroup(w)}` : w.winery.trim().toLowerCase()
      )) {
        const [producer, sub] = key.split("|");
        rows.push({ kind: "producer", label: producerLabel(list[0]?.winery ?? producer) });
        if (sub) rows.push({ kind: "subtitle", label: sub });
        pushItems(list);
      }
      break;
    default:
      pushItems(items);
  }
  return rows;
}

/**
 * Costruisce le sezioni della carta. Si passano i vini (carta dei vini) oppure i distillati
 * (carta dei distillati): le sezioni vuote vengono omesse.
 */
export function buildCarta(wines: Wine[], spirits: Wine[]): CartaSection[] {
  const buckets = new Map<string, { items: Wine[]; isSpirit: boolean }>();
  const add = (key: string, wine: Wine, isSpirit: boolean) => {
    const bucket = buckets.get(key) ?? { items: [], isSpirit };
    bucket.items.push(wine);
    buckets.set(key, bucket);
  };
  wines.filter(isPrintable).forEach((w) => add(wineSectionKey(w), w, false));
  spirits.filter(isPrintable).forEach((s) => add(spiritSectionKey(s), s, true));

  const sections: CartaSection[] = [];
  for (const def of SECTIONS) {
    const bucket = buckets.get(def.key);
    if (!bucket || bucket.items.length === 0) continue;
    const items = [...bucket.items].sort(compareCarta);
    const isSpirit = bucket.isSpirit && SPIRIT_COLLECTION_KEYS.has(def.key);
    sections.push({
      key: def.key,
      title: def.title,
      columns: def.columns,
      showBin: def.showBin,
      breakBefore: def.breakBefore,
      countryStyleTitle: def.countryStyleTitle,
      rows: buildRows(def, items, isSpirit)
    });
  }
  return sections;
}

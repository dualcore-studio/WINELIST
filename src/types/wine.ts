export type WineType =
  | "Rosso"
  | "Bianco"
  | "Rosato"
  | "Bollicine"
  | "Dolce"
  | "Fortificato";

export type WineCategory =
  | "DOCG"
  | "DOC"
  | "IGT"
  | "DOP"
  | "IGP"
  | "VdT"
  | "AOC"
  | "AVA"
  | "Riserva";

export type Wine = {
  id: string;
  name: string;
  winery: string;
  type: WineType;
  /** Sigla (DOCG, DOC, …) o etichetta come «Riserva»; stringa vuota se assente in carta. */
  category: WineCategory | "";
  grape: string;
  region: string;
  country: string;
  /** Bin come in carta: numerico ("23") o con prefisso ("GB 1", "HB 2a", "LF 3", "R1"). Vuoto se assente. */
  binNumber: string;
  /** Annata: 0 = NV (non millesimato), null = nessuna annata indicata. */
  vintage: number | null;
  price: number;
  /** Prezzo al bicchiere (opzionale, usato principalmente per grappe/distillati). */
  pricePerGlass?: number;
  /** Tipologia libera (es. "Grappa", "Cognac", "Whisky"): usata solo dalla
   *  pagina Distillati. Sui vini resta vuota/undefined. */
  spiritType?: string;
  quantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Etichetta dell'annata: anno, "NV" o stringa vuota. */
export function formatVintage(vintage: number | null): string {
  if (vintage === null) return "";
  if (vintage === 0) return "NV";
  return String(vintage);
}

/** Confronto naturale dei bin ("2" < "10", "GB 2" < "GB 10"); i bin vuoti vanno in fondo. */
export function compareBins(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

/** Bin vuoto = non assegnato; nessun vincolo di unicità. Confronto senza maiuscole/spazi ("GB1" = "gb 1"). */
export function binKey(bin: string): string {
  return bin.replace(/\s+/g, "").toLowerCase();
}

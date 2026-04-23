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
  binNumber: number;
  vintage: number;
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

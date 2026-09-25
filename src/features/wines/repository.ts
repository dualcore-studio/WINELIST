"use client";

import { useMemo } from "react";
import { db, id, isInstantConfigured } from "@/lib/instant/client";
import { useI18n } from "@/lib/i18n/provider";
import { compareBins, type Wine, type WineCategory, type WineType } from "@/types/wine";

const WINE_TYPES: readonly WineType[] = [
  "Rosso",
  "Bianco",
  "Rosato",
  "Bollicine",
  "Dolce",
  "Fortificato"
] as const;

const WINE_CATEGORIES: readonly WineCategory[] = [
  "DOCG",
  "DOC",
  "IGT",
  "DOP",
  "IGP",
  "VdT",
  "AOC",
  "AVA",
  "Riserva"
] as const;

function normalizeWineType(raw: unknown): WineType {
  const t = String(raw ?? "");
  if (t === "Dessert") return "Dolce";
  if (t === "Grappa/Distillato") return "Fortificato";
  if ((WINE_TYPES as readonly string[]).includes(t)) return t as WineType;
  return "Rosso";
}

function normalizeWineCategory(raw: unknown): WineCategory | "" {
  const c = String(raw ?? "").trim();
  if (!c) return "";
  if (c === "VDT") return "VdT";
  if (c === "Champagne") return "AOC";
  if (c === "Metodo Classico") return "DOC";
  if ((WINE_CATEGORIES as readonly string[]).includes(c)) return c as WineCategory;
  return "IGT";
}

function normalizeCountry(raw: unknown): string {
  const c = String(raw ?? "Italia");
  if (c === "USA" || c === "United States") return "Stati Uniti";
  return c;
}

export type WineInput = Pick<
  Wine,
  | "name"
  | "winery"
  | "type"
  | "category"
  | "grape"
  | "region"
  | "country"
  | "binNumber"
  | "vintage"
  | "price"
  | "quantity"
  | "isAvailable"
> &
  Partial<
    Pick<
      Wine,
      | "isFeatured"
      | "displayOrder"
      | "createdAt"
      | "updatedAt"
      | "pricePerGlass"
      | "spiritType"
      | "minStock"
      | "targetStock"
      | "supplier"
      | "orderedAt"
      | "orderedQty"
    >
  >;

type UseWinesResult = {
  wines: Wine[];
  isLoading: boolean;
  error: string | null;
};

/** Record da InstantDB: i campi possono mancare, includiamo il tag collection. */
type InstantWineRecord = Partial<Wine> & {
  id?: string;
  collectionTag?: string;
};

/** Bin come testo: i numeri legacy diventano stringhe, 0/vuoto diventa "". */
function normalizeBinNumber(raw: unknown): string {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? String(Math.trunc(raw)) : "";
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

/** Numero intero ≥ 0 oppure null (campo vuoto o non valido). */
function normalizeCount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

/** 0 = NV; null/undefined = nessuna annata. */
function normalizeVintage(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeWine(record: InstantWineRecord): Wine | null {
  if (!record.id || !record.name) {
    return null;
  }

  const type = normalizeWineType(record.type);

  return {
    id: String(record.id),
    name: String(record.name),
    winery: String(record.winery ?? ""),
    type,
    category: normalizeWineCategory(record.category),
    grape: String(record.grape ?? ""),
    region: String(record.region ?? ""),
    country: normalizeCountry(record.country ?? "Italia"),
    binNumber: normalizeBinNumber(record.binNumber),
    vintage: normalizeVintage(record.vintage),
    price: Number(record.price ?? 0),
    pricePerGlass:
      record.pricePerGlass === undefined || record.pricePerGlass === null
        ? undefined
        : Number(record.pricePerGlass),
    spiritType:
      typeof record.spiritType === "string" && record.spiritType.trim() !== ""
        ? record.spiritType.trim()
        : undefined,
    quantity: Number(
      record.quantity ?? (record.isAvailable === false ? 0 : 1)
    ),
    isAvailable: Boolean(record.isAvailable ?? true),
    minStock: normalizeCount(record.minStock),
    targetStock: normalizeCount(record.targetStock),
    supplier: String(record.supplier ?? "").trim(),
    orderedAt: typeof record.orderedAt === "string" && record.orderedAt ? record.orderedAt : null,
    orderedQty: normalizeCount(record.orderedQty),
    isFeatured: Boolean(record.isFeatured ?? false),
    displayOrder: Number(record.displayOrder ?? 0),
    createdAt: String(record.createdAt ?? new Date().toISOString()),
    updatedAt: String(record.updatedAt ?? new Date().toISOString())
  };
}

/** Ordine della lista: bin naturale, poi ordine di carta, poi nome. */
function compareWines(a: Wine, b: Wine): number {
  return (
    compareBins(a.binNumber, b.binNumber) ||
    a.displayOrder - b.displayOrder ||
    a.name.localeCompare(b.name, "it")
  );
}

function baseWinePayload(input: WineInput) {
  return {
    ...input,
    grape: input.grape?.trim() ?? "",
    country: input.country?.trim() || "Italia",
    region: input.region?.trim() || "",
    binNumber: normalizeBinNumber(input.binNumber),
    category: input.category,
    isFeatured: input.isFeatured ?? false,
    displayOrder: input.displayOrder ?? 0,
    updatedAt: new Date().toISOString()
  };
}

/** Tag che distingue la sezione a cui un record appartiene (winelist vs grappe, ecc.).
 *  I record esistenti senza tag sono considerati appartenenti a DEFAULT_WINES_COLLECTION. */
export const DEFAULT_WINES_COLLECTION = "wines";

/** Collection dei distillati (stessa entità `wines`, tag storico). */
export const SPIRITS_COLLECTION = "grappeDistillati";

/** Restituisce la collection di appartenenza del record: i record legacy senza tag
 *  sono trattati come winelist. */
function resolveCollectionTag(record: InstantWineRecord): string {
  const tag = typeof record.collectionTag === "string" ? record.collectionTag.trim() : "";
  return tag || DEFAULT_WINES_COLLECTION;
}

export function useWines(collection: string = DEFAULT_WINES_COLLECTION): UseWinesResult {
  const { t } = useI18n();
  if (!isInstantConfigured || !db) {
    return {
      wines: [],
      isLoading: false,
      error:
        "InstantDB non configurato: imposta NEXT_PUBLIC_INSTANT_APP_ID in .env.local con un App ID valido."
    };
  }

  const query = db.useQuery({ wines: {} });
  const isLoading = query?.isLoading ?? true;
  const error = query?.error ?? null;
  const data = query?.data ?? null;

  const wines = useMemo(() => {
    const raw = (data?.wines ?? []) as InstantWineRecord[];
    return raw
      .filter((record) => resolveCollectionTag(record) === collection)
      .map(normalizeWine)
      .filter((wine): wine is Wine => Boolean(wine))
      .sort(compareWines);
  }, [data, collection]);

  return {
    wines,
    isLoading,
    error: error ? t.common.loadFailed : null
  };
}

export { useWines as getWines };

export async function createWine(
  input: WineInput,
  collection: string = DEFAULT_WINES_COLLECTION
): Promise<void> {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }

  const now = new Date().toISOString();
  const payload = {
    ...baseWinePayload(input),
    collectionTag: collection,
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };

  await db.transact([db.tx.wines[id()].update(payload)]);
}

export async function updateWine(
  wineId: string,
  input: Partial<WineInput>,
  collection: string = DEFAULT_WINES_COLLECTION
): Promise<void> {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }

  const payload: Partial<WineInput> & { updatedAt: string; collectionTag: string } = {
    ...input,
    collectionTag: collection,
    updatedAt: new Date().toISOString()
  };

  await db.transact([db.tx.wines[wineId].update(payload)]);
}

export async function deleteWine(wineId: string): Promise<void> {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }

  await db.transact(db.tx.wines[wineId].delete());
}

/** Stessi campi su più record in una volta (es. scorte impostate sui vini filtrati). */
export async function updateWines(wineIds: readonly string[], patch: Partial<WineInput>): Promise<void> {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }
  const updatedAt = new Date().toISOString();
  const instant = db;
  // A blocchi, per non mandare transazioni enormi con centinaia di vini.
  for (let i = 0; i < wineIds.length; i += 100) {
    await instant.transact(
      wineIds.slice(i, i + 100).map((wineId) => instant.tx.wines[wineId].update({ ...patch, updatedAt }))
    );
  }
}

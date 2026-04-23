"use client";

import { useMemo } from "react";
import { db, id, isInstantConfigured } from "@/lib/instant/client";
import type { Wine, WineCategory, WineType } from "@/types/wine";

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

function normalizeBinNumber(raw: unknown): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

function normalizeWine(record: InstantWineRecord): Wine | null {
  if (!record.id || !record.name || !record.winery || !record.region) {
    return null;
  }

  const type = normalizeWineType(record.type);

  return {
    id: String(record.id),
    name: String(record.name),
    winery: String(record.winery),
    type,
    category: normalizeWineCategory(record.category),
    grape: String(record.grape ?? ""),
    region: String(record.region),
    country: normalizeCountry(record.country ?? "Italia"),
    binNumber: normalizeBinNumber(record.binNumber),
    vintage: Number(record.vintage ?? new Date().getFullYear()),
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
    isFeatured: Boolean(record.isFeatured ?? false),
    displayOrder: Number(record.displayOrder ?? 0),
    createdAt: String(record.createdAt ?? new Date().toISOString()),
    updatedAt: String(record.updatedAt ?? new Date().toISOString())
  };
}

/** Un solo record per Bin assegnato (> 0): vince updatedAt più recente. Bin0: tutti conservati. */
function dedupeWinesByAssignedBin(wines: Wine[]): Wine[] {
  const withBin: Wine[] = [];
  const noBin: Wine[] = [];
  for (const w of wines) {
    if (w.binNumber > 0) withBin.push(w);
    else noBin.push(w);
  }
  const byBin = new Map<number, Wine[]>();
  for (const w of withBin) {
    const list = byBin.get(w.binNumber) ?? [];
    list.push(w);
    byBin.set(w.binNumber, list);
  }
  const unique: Wine[] = [];
  for (const [, group] of byBin) {
    if (group.length === 1) {
      unique.push(group[0]);
      continue;
    }
    let best = group[0];
    for (let i = 1; i < group.length; i++) {
      const a = best;
      const b = group[i];
      if (
        b.updatedAt > a.updatedAt ||
        (b.updatedAt === a.updatedAt && b.createdAt > a.createdAt) ||
        (b.updatedAt === a.updatedAt &&
          b.createdAt === a.createdAt &&
          b.id > a.id)
      ) {
        best = b;
      }
    }
    unique.push(best);
  }
  return [...unique, ...noBin].sort(
    (a, b) =>
      a.binNumber - b.binNumber ||
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

/** Restituisce la collection di appartenenza del record: i record legacy senza tag
 *  sono trattati come winelist. */
function resolveCollectionTag(record: InstantWineRecord): string {
  const tag = typeof record.collectionTag === "string" ? record.collectionTag.trim() : "";
  return tag || DEFAULT_WINES_COLLECTION;
}

export function useWines(collection: string = DEFAULT_WINES_COLLECTION): UseWinesResult {
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
    const list = raw
      .filter((record) => resolveCollectionTag(record) === collection)
      .map(normalizeWine)
      .filter((wine): wine is Wine => Boolean(wine))
      .sort(
        (a, b) =>
          a.binNumber - b.binNumber ||
          a.displayOrder - b.displayOrder ||
          a.name.localeCompare(b.name, "it")
      );
    return dedupeWinesByAssignedBin(list);
  }, [data, collection]);

  return {
    wines,
    isLoading,
    error: error ? "Impossibile caricare i dati da InstantDB." : null
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

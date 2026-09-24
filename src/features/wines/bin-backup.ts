"use client";

import { useMemo } from "react";
import { db, id, isInstantConfigured } from "@/lib/instant/client";
import { binKey, type Wine } from "@/types/wine";

/**
 * Backup dei bin number salvato prima di un reset, per poterli ripristinare.
 * Si tiene solo l'ultimo backup per sezione: un nuovo reset sostituisce il precedente.
 */
export type BinBackup = {
  id: string;
  collectionTag: string;
  createdAt: string;
  /** id vino → bin al momento del reset (solo i vini che avevano un bin). */
  bins: Record<string, string>;
};

type InstantBinBackupRecord = {
  id?: string;
  collectionTag?: string;
  createdAt?: string;
  /** Mappa id → bin serializzata in JSON. */
  bins?: string;
};

function parseBins(raw: unknown): Record<string, string> {
  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([wineId, bin]) => [wineId, String(bin ?? "").trim()])
        .filter(([, bin]) => bin !== "")
    );
  } catch {
    return {};
  }
}

function requireDb() {
  if (!isInstantConfigured || !db) {
    throw new Error("InstantDB non configurato. Aggiorna NEXT_PUBLIC_INSTANT_APP_ID.");
  }
  return db;
}

/** Backup della sezione, dal più recente. */
export function useBinBackups(collection: string): BinBackup[] {
  if (!isInstantConfigured || !db) return [];

  const query = db.useQuery({ binBackups: {} });
  const data = query?.data ?? null;

  return useMemo(() => {
    const raw = (data?.binBackups ?? []) as InstantBinBackupRecord[];
    return raw
      .filter((r) => r.id && r.collectionTag === collection)
      .map((r) => ({
        id: String(r.id),
        collectionTag: collection,
        createdAt: String(r.createdAt ?? ""),
        bins: parseBins(r.bins)
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, collection]);
}

/**
 * Svuota tutti i bin della sezione. Nella stessa transazione salva i bin attuali come
 * nuovo backup e cancella i backup precedenti: o riesce tutto o niente.
 */
export async function resetAllBins(
  wines: Wine[],
  collection: string,
  previousBackups: BinBackup[]
): Promise<void> {
  const instant = requireDb();
  const withBin = wines.filter((w) => w.binNumber);
  if (withBin.length === 0) return;

  const now = new Date().toISOString();
  const bins = Object.fromEntries(withBin.map((w) => [w.id, w.binNumber]));

  await instant.transact([
    ...previousBackups.map((b) => instant.tx.binBackups[b.id].delete()),
    instant.tx.binBackups[id()].update({
      collectionTag: collection,
      createdAt: now,
      bins: JSON.stringify(bins)
    }),
    ...withBin.map((w) => instant.tx.wines[w.id].update({ binNumber: "", updatedAt: now }))
  ]);
}

/**
 * Rimette i bin del backup ai vini che esistono ancora. I bin assegnati dopo il reset a vini
 * presenti nel backup vengono sovrascritti; quelli di altri vini restano, salvo che coincidano
 * con un bin ripristinato (vengono svuotati per non avere doppioni). Il backup viene poi rimosso.
 */
export async function restoreBins(backup: BinBackup, wines: Wine[]): Promise<void> {
  const instant = requireDb();
  const now = new Date().toISOString();
  const restored = wines.filter((w) => backup.bins[w.id] !== undefined);
  const restoredKeys = new Set(restored.map((w) => binKey(backup.bins[w.id])));
  const conflicting = wines.filter(
    (w) => backup.bins[w.id] === undefined && w.binNumber && restoredKeys.has(binKey(w.binNumber))
  );

  await instant.transact([
    ...restored.map((w) => instant.tx.wines[w.id].update({ binNumber: backup.bins[w.id], updatedAt: now })),
    ...conflicting.map((w) => instant.tx.wines[w.id].update({ binNumber: "", updatedAt: now })),
    instant.tx.binBackups[backup.id].delete()
  ]);
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import distillatiRows from "@/data/distillati.json";
import { createWine, updateWine } from "@/features/wines/repository";
import type { Wine } from "@/types/wine";
import type { WineInput } from "@/features/wines/repository";

/**
 * Upsert client-side dei distillati a partire da `src/data/distillati.json`.
 * Si attiva in dev con `?seedDistillati=1` sulla pagina /grappe-distillati.
 * Usa il normale SDK InstantDB (stesso flusso del form) e il tag collection
 * `grappeDistillati`, così i record restano isolati dalla winelist.
 */

const GRAPPE_COLLECTION = "grappeDistillati";
const STORAGE_KEY = "distillati-seed-v7";

/** Campi richiesti dallo schema condiviso ma non rilevanti per i distillati. */
const DEFAULTS = {
  type: "Fortificato" as const,
  category: "" as const,
  grape: "",
  region: "—",
  country: "Italia",
  binNumber: 0,
  quantity: 1,
  isAvailable: true,
  isFeatured: false,
  displayOrder: 0
};

type Row = {
  name: string;
  winery: string;
  spiritType: string;
  price: number;
  pricePerGlass: number;
};

function rowToInput(row: Row): WineInput {
  return {
    name: row.name.trim(),
    winery: row.winery.trim(),
    spiritType: row.spiritType.trim() || undefined,
    price: Number(row.price),
    pricePerGlass: Number(row.pricePerGlass),
    type: DEFAULTS.type,
    category: DEFAULTS.category,
    grape: DEFAULTS.grape,
    region: DEFAULTS.region,
    country: DEFAULTS.country,
    binNumber: DEFAULTS.binNumber,
    vintage: new Date().getFullYear(),
    quantity: DEFAULTS.quantity,
    isAvailable: DEFAULTS.isAvailable,
    isFeatured: DEFAULTS.isFeatured,
    displayOrder: DEFAULTS.displayOrder
  };
}

/** Chiave di matching per l'upsert: stesso nome + stesso produttore (case-insensitive). */
function matchKey(name: string, winery: string): string {
  return `${name.trim().toLowerCase()}::${winery.trim().toLowerCase()}`;
}

type Props = {
  enabled: boolean;
  wines: Wine[];
  isLoading: boolean;
};

export function DistillatiClientSeed({ enabled, wines, isLoading }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;
    if (isLoading) return;

    const st = sessionStorage.getItem(STORAGE_KEY);
    if (st === "done") {
      router.replace("/grappe-distillati", { scroll: false });
      return;
    }
    if (st === "run") return;

    sessionStorage.setItem(STORAGE_KEY, "run");
    setStatus("running");

    void (async () => {
      try {
        const existingByKey = new Map<string, Wine>();
        for (const w of wines) {
          existingByKey.set(matchKey(w.name, w.winery), w);
        }

        for (const row of distillatiRows as Row[]) {
          const input = rowToInput(row);
          const key = matchKey(input.name, input.winery);
          const existing = existingByKey.get(key);
          if (existing) {
            await updateWine(existing.id, input, GRAPPE_COLLECTION);
          } else {
            await createWine(input, GRAPPE_COLLECTION);
          }
        }
        sessionStorage.setItem(STORAGE_KEY, "done");
        setStatus("done");
        router.replace("/grappe-distillati", { scroll: false });
      } catch (err) {
        sessionStorage.removeItem(STORAGE_KEY);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Seed distillati non riuscito."
        );
      }
    })();
  }, [enabled, isLoading, wines, router]);

  if (!enabled || process.env.NODE_ENV !== "development") {
    return null;
  }

  if (status === "idle" && isLoading) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Import distillati: caricamento elenco…
      </p>
    );
  }

  if (status === "running") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Import distillati in corso…
      </p>
    );
  }

  if (status === "error" && errorMessage) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  return null;
}

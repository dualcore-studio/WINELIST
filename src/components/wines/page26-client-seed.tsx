"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import page26Rows from "@/data/page26-california-wines.json";
import { createWine, updateWine } from "@/features/wines/repository";
import type { Wine } from "@/types/wine";
import type { WineInput } from "@/features/wines/repository";
import type { WineCategory, WineType } from "@/types/wine";

const TYPE: WineType = "Rosso";
const DEFAULT_COUNTRY = "Stati Uniti";
const DEFAULT_REGION = "California";
const STORAGE_KEY = "page26-seed-v10";

const WINE_CATEGORY_KEYS = new Set<string>([
  "DOCG",
  "DOC",
  "IGT",
  "DOP",
  "IGP",
  "VdT",
  "AOC",
  "AVA",
  "Riserva"
]);

type Row = (typeof page26Rows)[number] & {
  country?: string;
  region?: string;
};

function rowCategory(row: Row): WineCategory | "" {
  const c = String(row.category ?? "").trim();
  if (!c) return "";
  if (WINE_CATEGORY_KEYS.has(c)) return c as WineCategory;
  return "";
}

function rowToInput(row: Row): WineInput {
  const country = row.country?.trim() || DEFAULT_COUNTRY;
  const region = row.region?.trim() || DEFAULT_REGION;
  return {
    name: row.name.trim(),
    winery: row.winery.trim(),
    type: TYPE,
    category: rowCategory(row),
    grape: row.grape.trim(),
    region,
    country,
    binNumber: row.binNumber,
    vintage: row.vintage,
    price: row.price,
    quantity: 1,
    isAvailable: true,
    isFeatured: false,
    displayOrder: 0
  };
}

type Props = {
  enabled: boolean;
  wines: Wine[];
  isLoading: boolean;
};

/**
 * In development: con `?seedPage26=1` esegue upsert client (stesso SDK del form).
 * Usa sessionStorage per evitare doppie esecuzioni in Strict Mode.
 */
export function Page26ClientSeed({ enabled, wines, isLoading }: Props) {
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
      router.replace("/wines", { scroll: false });
      return;
    }
    if (st === "run") return;

    sessionStorage.setItem(STORAGE_KEY, "run");
    setStatus("running");

    void (async () => {
      try {
        for (const row of page26Rows) {
          const input = rowToInput(row);
          const existing = wines.find((w) => w.binNumber === row.binNumber);
          if (existing) {
            await updateWine(existing.id, input);
          } else {
            await createWine(input);
          }
        }
        sessionStorage.setItem(STORAGE_KEY, "done");
        setStatus("done");
        router.replace("/wines", { scroll: false });
      } catch (err) {
        sessionStorage.removeItem(STORAGE_KEY);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Seed pagina 26 non riuscito."
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
        Import pagina 26: caricamento elenco…
      </p>
    );
  }

  if (status === "running") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Import catalogo in corso (bin 322–463)…
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

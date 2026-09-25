"use client";

import { useMemo } from "react";
import { isOrdered, needsReorder } from "@/features/stock/stock";
import { DEFAULT_WINES_COLLECTION, SPIRITS_COLLECTION, useWines } from "@/features/wines/repository";

/** Articoli (vini e distillati) da ordinare e non ancora ordinati: il numero sulla voce Dashboard. */
export function useReorderCount(): number {
  const { wines } = useWines(DEFAULT_WINES_COLLECTION);
  const { wines: spirits } = useWines(SPIRITS_COLLECTION);
  return useMemo(
    () => [...wines, ...spirits].filter((w) => needsReorder(w) && !isOrdered(w)).length,
    [wines, spirits]
  );
}

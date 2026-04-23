"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_EXTRA_CATEGORIES,
  WINELIST_CATEGORIES,
  type SidebarNavItem
} from "@/lib/sidebar-nav";

const STORAGE_KEY = "winelist-extra-nav-sections";

/** Label normalizzate delle voci fisse del menu: da escludere dalle sezioni extra
 *  per evitare duplicati (es. "Distillati" che è voce di prima classe). */
const FIXED_LABELS = new Set(
  WINELIST_CATEGORIES.map((c) => c.label.trim().toLowerCase())
);

/** Label/ID legacy da rimuovere dalle voci extra salvate in localStorage, per
 *  ripulire stati precedenti dopo rinomine (es. "Grappe e Distillati" → "Distillati"). */
const LEGACY_FIXED_LABELS = new Set(["grappe e distillati"]);
const LEGACY_FIXED_IDS = new Set(["grappe-distillati"]);

function stripFixedCategories(items: SidebarNavItem[]): SidebarNavItem[] {
  return items.filter((item) => {
    const label = item.label.trim().toLowerCase();
    if (FIXED_LABELS.has(label)) return false;
    if (LEGACY_FIXED_LABELS.has(label)) return false;
    if (LEGACY_FIXED_IDS.has(item.id)) return false;
    return true;
  });
}

type ExtraSectionsContextValue = {
  extraSections: SidebarNavItem[];
  addSection: (label: string) => void;
  removeSection: (id: string) => void;
  renameSection: (id: string, label: string) => void;
  resetToDefaults: () => void;
};

const ExtraSectionsContext = createContext<ExtraSectionsContextValue | null>(null);

function parseStored(raw: string | null): SidebarNavItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (row): row is SidebarNavItem =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as SidebarNavItem).id === "string" &&
        typeof (row as SidebarNavItem).label === "string" &&
        typeof (row as SidebarNavItem).icon === "string"
    );
  } catch {
    return [];
  }
}

/** Garantisce che le categorie di default abbiano `href` aggiornato anche per chi
 *  ha già i dati salvati in localStorage prima che l'href venisse aggiunto, oppure
 *  ha cancellato e ricreato la voce (id diverso, stesso nome). */
function mergeDefaultHrefs(items: SidebarNavItem[]): SidebarNavItem[] {
  const hrefById = new Map<string, string | undefined>();
  const hrefByLabel = new Map<string, string | undefined>();
  for (const c of DEFAULT_EXTRA_CATEGORIES) {
    hrefById.set(c.id, c.href);
    hrefByLabel.set(c.label.trim().toLowerCase(), c.href);
  }
  return items.map((item) => {
    if (item.href) return item;
    const defaultHref =
      hrefById.get(item.id) ?? hrefByLabel.get(item.label.trim().toLowerCase());
    return defaultHref ? { ...item, href: defaultHref } : item;
  });
}

export function ExtraSectionsProvider({ children }: { children: ReactNode }) {
  const [extraSections, setExtraSections] = useState<SidebarNavItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // Prima visita: seed delle categorie di default, gestibili da Impostazioni.
      setExtraSections(DEFAULT_EXTRA_CATEGORIES);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EXTRA_CATEGORIES));
      } catch {
        /* ignore quota / private mode */
      }
    } else {
      setExtraSections(
        stripFixedCategories(mergeDefaultHrefs(parseStored(raw)))
      );
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Evita di sovrascrivere lo storage con lo stato iniziale `[]` prima dell'hydration
    // (condizione di race con StrictMode in dev che creava entry senza href).
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extraSections));
    } catch {
      /* ignore quota / private mode */
    }
  }, [extraSections, hydrated]);

  const addSection = useCallback((label: string) => {
    const t = label.trim();
    if (!t) return;
    setExtraSections((prev) => [
      ...prev,
      { id: `section-${Date.now()}`, label: t, icon: "Wine" }
    ]);
  }, []);

  const removeSection = useCallback((id: string) => {
    setExtraSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSection = useCallback((id: string, label: string) => {
    const t = label.trim();
    if (!t) return;
    setExtraSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: t } : s))
    );
  }, []);

  const resetToDefaults = useCallback(() => {
    setExtraSections(DEFAULT_EXTRA_CATEGORIES);
  }, []);

  // Esposto sempre con gli href di default risolti: così la sidebar può
  // renderizzare i link cliccabili anche se in storage manca l'href.
  const exposedSections = useMemo(
    () => mergeDefaultHrefs(extraSections),
    [extraSections]
  );

  const value = useMemo(
    () => ({
      extraSections: exposedSections,
      addSection,
      removeSection,
      renameSection,
      resetToDefaults
    }),
    [exposedSections, addSection, removeSection, renameSection, resetToDefaults]
  );

  return (
    <ExtraSectionsContext.Provider value={value}>{children}</ExtraSectionsContext.Provider>
  );
}

export function useExtraSections() {
  const ctx = useContext(ExtraSectionsContext);
  if (!ctx) {
    throw new Error("useExtraSections deve essere usato dentro ExtraSectionsProvider");
  }
  return ctx;
}

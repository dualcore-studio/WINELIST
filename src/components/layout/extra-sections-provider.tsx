"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { db, id, isInstantConfigured } from "@/lib/instant/client";
import {
  type InstantNavRow,
  mapInstantRowToNavItem,
  mergeDefaultHrefs,
  NAV_EXTRA_STORAGE_KEY,
  parseStoredNav,
  REMOVED_LEGACY_NAV_EXTRA_ID,
  stripFixedCategories
} from "@/features/navigation/extra-nav-shared";
import {
  DEFAULT_EXTRA_CATEGORIES,
  type SidebarNavItem
} from "@/lib/sidebar-nav";

type ExtraSectionsContextValue = {
  extraSections: SidebarNavItem[];
  addSection: (label: string) => void;
  removeSection: (id: string) => void;
  renameSection: (id: string, label: string) => void;
  resetToDefaults: () => void;
};

const ExtraSectionsContext = createContext<ExtraSectionsContextValue | null>(null);

/* ─── Locale: solo se Instant non configurato (es. .env mancante) ─── */
function LocalExtraProvider({ children }: { children: ReactNode }) {
  const [extraSections, setExtraSections] = useState<SidebarNavItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(NAV_EXTRA_STORAGE_KEY);
    if (raw === null) {
      setExtraSections(DEFAULT_EXTRA_CATEGORIES);
      try {
        localStorage.setItem(
          NAV_EXTRA_STORAGE_KEY,
          JSON.stringify(DEFAULT_EXTRA_CATEGORIES)
        );
      } catch {
        /* ignore */
      }
    } else {
      setExtraSections(
        stripFixedCategories(mergeDefaultHrefs(parseStoredNav(raw))).filter(
          (s) => s.id !== REMOVED_LEGACY_NAV_EXTRA_ID
        )
      );
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        NAV_EXTRA_STORAGE_KEY,
        JSON.stringify(extraSections)
      );
    } catch {
      /* ignore */
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
    <ExtraSectionsContext.Provider value={value}>
      {children}
    </ExtraSectionsContext.Provider>
  );
}

/* ─── Cloud: stesso dato su Vercel, su tutti i browser ─── */
function InstantExtraProvider({ children }: { children: ReactNode }) {
  if (!db) {
    return <LocalExtraProvider>{children}</LocalExtraProvider>;
  }

  const query = db.useQuery({ navExtraSections: {} });
  const isLoading = query.isLoading;
  const data = query.data;
  const bootstrappingRef = useRef(false);

  const navRows: InstantNavRow[] = useMemo(() => {
    const raw = (data?.navExtraSections ?? []) as Array<{
      id?: string;
      label?: string;
      icon?: string;
      sortOrder?: number;
      updatedAt?: string;
    }>;
    const mapped: InstantNavRow[] = raw
      .map((r) => ({
        id: String(r.id ?? ""),
        label: String(r.label ?? ""),
        icon: String(r.icon ?? "Wine"),
        sortOrder: Number(r.sortOrder ?? 0),
        updatedAt: r.updatedAt
      }))
      .filter((r) => r.id && r.label);
    return mapped.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "it")
    );
  }, [data]);

  const extraSections = useMemo(
    () =>
      mergeDefaultHrefs(
        navRows
          .map((r) => mapInstantRowToNavItem(r))
          .filter((i): i is SidebarNavItem => Boolean(i))
      ),
    [navRows]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!navRows.some((r) => r.id === REMOVED_LEGACY_NAV_EXTRA_ID)) return;
    void db!.transact([db!.tx.navExtraSections[REMOVED_LEGACY_NAV_EXTRA_ID].delete()]).catch(
      (e) => console.error("Rimozione voce nav legacy (Cognac):", e)
    );
  }, [isLoading, navRows]);

  useEffect(() => {
    if (isLoading) return;
    if (navRows.length > 0) {
      try {
        localStorage.removeItem(NAV_EXTRA_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    if (bootstrappingRef.current) return;
    bootstrappingRef.current = true;

    void (async () => {
      try {
        let items = stripFixedCategories(
          mergeDefaultHrefs(
            parseStoredNav(localStorage.getItem(NAV_EXTRA_STORAGE_KEY))
          )
        ).filter((s) => s.id !== REMOVED_LEGACY_NAV_EXTRA_ID);
        if (items.length) {
          try {
            localStorage.removeItem(NAV_EXTRA_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        } else {
          items = DEFAULT_EXTRA_CATEGORIES;
        }
        const now = new Date().toISOString();
        const txs = items.map((item, i) =>
          db!.tx.navExtraSections[item.id].update({
            label: item.label,
            icon: item.icon,
            sortOrder: i,
            updatedAt: now
          })
        );
        if (txs.length) {
          await db!.transact(txs);
        }
      } catch (e) {
        console.error("Bootstrap sezioni nav (Instant):", e);
      } finally {
        bootstrappingRef.current = false;
      }
    })();
  }, [isLoading, navRows.length]);

  const addSection = useCallback(
    (label: string) => {
      const t = label.trim();
      if (!t) return;
      const maxO = Math.max(0, ...navRows.map((r) => r.sortOrder), -1);
      const newId = id();
      const now = new Date().toISOString();
      void db!.transact([
        db!.tx.navExtraSections[newId].update({
          label: t,
          icon: "Wine",
          sortOrder: maxO + 1,
          updatedAt: now
        })
      ]).catch((e) => console.error("addSection (Instant):", e));
    },
    [navRows]
  );

  const removeSection = useCallback((sectionId: string) => {
    void db!.transact([db!.tx.navExtraSections[sectionId].delete()]).catch((e) =>
      console.error("removeSection (Instant):", e)
    );
  }, []);

  const renameSection = useCallback(
    (sectionId: string, label: string) => {
      const t = label.trim();
      if (!t) return;
      const row = navRows.find((r) => r.id === sectionId);
      if (!row) return;
      const now = new Date().toISOString();
      void db!.transact([
        db!.tx.navExtraSections[sectionId].update({
          label: t,
          icon: row.icon,
          sortOrder: row.sortOrder,
          updatedAt: now
        })
      ]).catch((e) => console.error("renameSection (Instant):", e));
    },
    [navRows]
  );

  const resetToDefaults = useCallback(() => {
    const now = new Date().toISOString();
    const deletions = navRows.map((r) => db!.tx.navExtraSections[r.id].delete());
    const inserts = DEFAULT_EXTRA_CATEGORIES.map((item, i) =>
      db!.tx.navExtraSections[item.id].update({
        label: item.label,
        icon: item.icon,
        sortOrder: i,
        updatedAt: now
      })
    );
    void db!.transact([...deletions, ...inserts]).catch((e) =>
      console.error("resetToDefaults (Instant):", e)
    );
  }, [navRows]);

  const value = useMemo(
    () => ({
      extraSections,
      addSection,
      removeSection,
      renameSection,
      resetToDefaults
    }),
    [extraSections, addSection, removeSection, renameSection, resetToDefaults]
  );

  return (
    <ExtraSectionsContext.Provider value={value}>
      {children}
    </ExtraSectionsContext.Provider>
  );
}

export function ExtraSectionsProvider({ children }: { children: ReactNode }) {
  if (isInstantConfigured && db) {
    return <InstantExtraProvider>{children}</InstantExtraProvider>;
  }
  return <LocalExtraProvider>{children}</LocalExtraProvider>;
}

export function useExtraSections() {
  const ctx = useContext(ExtraSectionsContext);
  if (!ctx) {
    throw new Error("useExtraSections deve essere usato dentro ExtraSectionsProvider");
  }
  return ctx;
}

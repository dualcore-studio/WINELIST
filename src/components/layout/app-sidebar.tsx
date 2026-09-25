"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createLucideIcon,
  FlaskConical,
  GlassWater,
  History,
  LayoutDashboard,
  Settings,
  Users,
  Wine,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { useExtraSections } from "@/components/layout/extra-sections-provider";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { LogoutButton } from "@/components/layout/logout-button";
import { useI18n } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useReorderCount } from "@/features/stock/use-reorder-count";
import {
  ADMIN_NAV,
  ADMIN_ONLY_NAV,
  DEFAULT_EXTRA_CATEGORIES,
  MAIN_NAV,
  WINELIST_CATEGORIES,
  type SidebarIconName,
  type SidebarNavItem
} from "@/lib/sidebar-nav";

/** Bottiglia di vino (non presente in questa versione di lucide), stesso tratto delle altre icone. */
const WineBottle = createLucideIcon("wine-bottle", [
  [
    "path",
    {
      d: "M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a6 6 0 0 0 1.2 3.6l.6.8A6 6 0 0 1 17 13v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a6 6 0 0 1 1.2-3.6l.6-.8A6 6 0 0 0 10 5z",
      key: "body"
    }
  ],
  ["path", { d: "M17 13h-4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h4", key: "label" }]
]);

const ICON_MAP: Record<SidebarIconName, LucideIcon> = {
  LayoutDashboard,
  History,
  Wine,
  WineBottle,
  FlaskConical,
  GlassWater,
  Settings,
  Users
};

/** Etichette tradotte delle voci fisse; le categorie extra create dall'utente restano col loro nome. */
const NAV_LABEL_KEYS = {
  dashboard: "dashboard",
  movements: "movements",
  winelist: "wineList",
  "grappe-distillati": "spirits",
  settings: "settings",
  users: "users"
} as const;

function NavRow({
  item,
  active,
  collapsed,
  badge = 0,
  onNavigate
}: {
  item: SidebarNavItem;
  active: boolean;
  /** Numero di avvisi (es. articoli da ordinare); 0 = nessun badge. */
  badge?: number;
  /** Barra ridotta: solo icona, etichetta nel tooltip. */
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const Icon = ICON_MAP[item.icon];
  const labelKey = NAV_LABEL_KEYS[item.id as keyof typeof NAV_LABEL_KEYS];
  const label = labelKey ? t.nav[labelKey] : item.label;

  const base = clsx(
    "group flex h-9 w-full items-center rounded-lg text-[13.5px] font-medium transition-colors",
    collapsed ? "justify-center px-0" : "gap-3 px-3"
  );
  const state = item.href
    ? active
      ? "bg-white/[0.16] text-white"
      : "text-white/75 hover:bg-white/10 hover:text-white"
    : "cursor-not-allowed text-white/35";
  const badgeText = badge > 99 ? "99+" : String(badge);
  const icon = (
    <span className="relative shrink-0">
      <Icon
        className={clsx("size-[18px]", active ? "text-white" : "text-white/60 group-hover:text-white")}
        strokeWidth={1.75}
        aria-hidden
      />
      {badge > 0 && collapsed ? (
        <span className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-white px-1 text-center text-[10px] font-bold leading-4 text-accent">
          {badgeText}
        </span>
      ) : null}
    </span>
  );
  const badgePill =
    badge > 0 && !collapsed ? (
      <span className="ml-auto rounded-full bg-white px-1.5 text-[11px] font-bold leading-[18px] text-accent">{badgeText}</span>
    ) : null;

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={clsx(base, state)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? (badge > 0 ? `${label} (${badge})` : label) : undefined}
        title={collapsed ? label : undefined}
      >
        {icon}
        {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
        {badgePill}
      </Link>
    );
  }

  return (
    <span className={clsx(base, state)} title={collapsed ? `${label} · ${t.nav.comingSoon}` : t.nav.comingSoon}>
      {icon}
      {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
    </span>
  );
}

function useSidebarNavState() {
  const pathname = usePathname();
  const { extraSections } = useExtraSections();

  // Fallback difensivo: risolve un eventuale href mancante dalle categorie di
  // default (dati legacy in localStorage senza href, oppure voci riaggiunte
  // manualmente con id diverso ma stesso nome).
  const { defaultHrefById, defaultHrefByLabel } = useMemo(() => {
    const byId = new Map<string, string | undefined>();
    const byLabel = new Map<string, string | undefined>();
    for (const c of DEFAULT_EXTRA_CATEGORIES) {
      byId.set(c.id, c.href);
      byLabel.set(c.label.trim().toLowerCase(), c.href);
    }
    return { defaultHrefById: byId, defaultHrefByLabel: byLabel };
  }, []);

  const enrichedExtras = useMemo(
    () =>
      extraSections.map((item) => {
        if (item.href) return item;
        const fallback =
          defaultHrefById.get(item.id) ??
          defaultHrefByLabel.get(item.label.trim().toLowerCase());
        return fallback ? { ...item, href: fallback } : item;
      }),
    [extraSections, defaultHrefById, defaultHrefByLabel]
  );

  const primaryLinks = useMemo(
    () => [...MAIN_NAV, ...WINELIST_CATEGORIES, ...enrichedExtras],
    [enrichedExtras]
  );

  const isRouteActive = useCallback(
    (href?: string) => {
      if (!href) return false;
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  return { primaryLinks, isRouteActive };
}

/** Ritardi di apertura/chiusura al passaggio del mouse: evitano aperture accidentali attraversando la barra. */
const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 200;

/** Larghezze della barra (classi letterali per Tailwind): ridotta = solo icone, aperta = con etichette. */
const WIDTH_COLLAPSED = "w-[68px]";
const WIDTH_EXPANDED = "w-[176px]";

/**
 * Barra laterale a scomparsa automatica: ridotta mostra solo le icone, si allarga al passaggio
 * del mouse (o al focus da tastiera) sovrapponendosi al contenuto, senza spostare la pagina.
 */
export function AppSidebar() {
  const { primaryLinks, isRouteActive } = useSidebarNavState();
  const { user } = useCurrentUser();
  const { t } = useI18n();
  const reorderCount = useReorderCount();
  const [expanded, setExpanded] = useState(false);
  const collapsed = !expanded;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleExpanded = useCallback((next: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setExpanded(next), next ? HOVER_OPEN_DELAY_MS : HOVER_CLOSE_DELAY_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const adminLinks = useMemo(
    () => (user?.isAdmin ? [...ADMIN_NAV, ...ADMIN_ONLY_NAV] : ADMIN_NAV),
    [user]
  );

  return (
    // Lo spazio riservato alla barra cambia subito (la pagina si stringe e la tabella resta tutta visibile);
    // l'animazione è solo sulla barra, così la tabella non viene ricalcolata a ogni fotogramma.
    <div className={clsx("relative h-dvh shrink-0", collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED)}>
      <aside
        className={clsx(
          "absolute inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-accent transition-[width] duration-200 ease-out",
          collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
        )}
        aria-label={t.nav.mainNavigation}
        onMouseEnter={() => scheduleExpanded(true)}
        onMouseLeave={() => scheduleExpanded(false)}
        onFocus={() => scheduleExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleExpanded(false);
        }}
      >
        <Link
          href="/"
          className="flex h-[84px] shrink-0 items-center gap-3 pl-[14px] pr-3 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
          aria-label="Wine List Manager"
          title={collapsed ? "Wine List Manager" : undefined}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm">
            <Wine className="size-[22px]" strokeWidth={1.75} aria-hidden />
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1 whitespace-nowrap font-display text-[19px] font-bold leading-[1.05] tracking-tight text-white">
              Wine List
              <br />
              Manager
            </span>
          )}
        </Link>

        <nav className={clsx("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-2.5" : "px-3")}>
          <ul className="space-y-0.5">
            {primaryLinks.map((item) => (
              <li key={item.id}>
                <NavRow
                  item={item}
                  active={isRouteActive(item.href)}
                  collapsed={collapsed}
                  badge={item.id === "dashboard" ? reorderCount : 0}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className={clsx("space-y-0.5 border-t border-white/15 py-3", collapsed ? "px-2.5" : "px-3")}>
          <ul className="space-y-0.5">
            {adminLinks.map((item) => (
              <li key={item.id}>
                <NavRow item={item} active={isRouteActive(item.href)} collapsed={collapsed} />
              </li>
            ))}
          </ul>
          {user ? <LogoutButton variant="sidebar" iconOnly={collapsed} /> : null}
          {/* IT/EN sempre in colonna e nella stessa posizione: aprendo la barra non si sposta nulla
              (prima, passando in orizzontale, il blocco si accorciava e "Esci" finiva sotto il mouse). */}
          <div className="flex items-center gap-1.5 pt-2">
            <div className={clsx("flex w-12 shrink-0 justify-center", !collapsed && "-ml-0.5")}>
              <LanguageSwitch tone="dark" vertical />
            </div>
            {collapsed ? null : (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                {t.nav.language}
              </span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

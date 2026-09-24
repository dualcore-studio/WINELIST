"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createLucideIcon,
  FlaskConical,
  GlassWater,
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
  Wine,
  WineBottle,
  FlaskConical,
  GlassWater,
  Settings,
  Users
};

/** Etichette tradotte delle voci fisse; le categorie extra create dall'utente restano col loro nome. */
const NAV_LABEL_KEYS = {
  winelist: "wineList",
  "grappe-distillati": "spirits",
  settings: "settings",
  users: "users"
} as const;

function NavRow({
  item,
  active,
  collapsed,
  onNavigate
}: {
  item: SidebarNavItem;
  active: boolean;
  /** Barra ridotta: solo icona, etichetta nel tooltip. */
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const Icon = ICON_MAP[item.icon];
  const labelKey = NAV_LABEL_KEYS[item.id as keyof typeof NAV_LABEL_KEYS];
  const label = labelKey ? t.nav[labelKey] : item.label;

  const base = clsx(
    "group flex w-full items-center rounded-lg py-2 text-[13.5px] font-medium transition-colors",
    collapsed ? "justify-center px-0" : "gap-3 px-3"
  );
  const state = item.href
    ? active
      ? "bg-white/[0.16] text-white"
      : "text-white/75 hover:bg-white/10 hover:text-white"
    : "cursor-not-allowed text-white/35";
  const icon = (
    <Icon
      className={clsx("size-[18px] shrink-0", active ? "text-white" : "text-white/60 group-hover:text-white")}
      strokeWidth={1.75}
      aria-hidden
    />
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={clsx(base, state)}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
      >
        {icon}
        {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
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

/**
 * Barra laterale a scomparsa automatica: ridotta mostra solo le icone, si allarga al passaggio
 * del mouse (o al focus da tastiera) sovrapponendosi al contenuto, senza spostare la pagina.
 */
export function AppSidebar() {
  const { primaryLinks, isRouteActive } = useSidebarNavState();
  const { user } = useCurrentUser();
  const { t } = useI18n();
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
    <div className="relative h-dvh w-[68px] shrink-0">
      <aside
        className={clsx(
          "absolute inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-accent transition-[width,box-shadow] duration-200 ease-out",
          collapsed ? "w-[68px]" : "w-[216px] shadow-drawer"
        )}
        aria-label={t.nav.mainNavigation}
        onMouseEnter={() => scheduleExpanded(true)}
        onMouseLeave={() => scheduleExpanded(false)}
        onFocus={() => scheduleExpanded(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleExpanded(false);
        }}
      >
        <div className="flex h-[84px] shrink-0 items-center gap-2.5 pl-[18px] pr-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-accent"
            title={collapsed ? "Wine List Manager" : undefined}
          >
            <Wine className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1 whitespace-nowrap font-display text-[19px] font-bold leading-[1.05] tracking-tight text-white">
              Wine List Manager
            </span>
          )}
        </div>

        <nav className={clsx("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-2.5" : "px-3")}>
          <ul className="space-y-0.5">
            {primaryLinks.map((item) => (
              <li key={item.id}>
                <NavRow item={item} active={isRouteActive(item.href)} collapsed={collapsed} />
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
          {collapsed ? (
            <div className="flex justify-center pt-2">
              <LanguageSwitch tone="dark" vertical />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                {t.nav.language}
              </span>
              <LanguageSwitch tone="dark" />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

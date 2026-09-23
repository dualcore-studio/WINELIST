"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  GlassWater,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  Wine,
  type LucideIcon
} from "lucide-react";
import { useCallback, useMemo } from "react";
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

const ICON_MAP: Record<SidebarIconName, LucideIcon> = {
  LayoutDashboard,
  Wine,
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
      ? "bg-accent-soft text-accent"
      : "text-neutral-600 hover:bg-canvas hover:text-text"
    : "cursor-not-allowed text-neutral-300";
  const icon = (
    <Icon
      className={clsx("size-[18px] shrink-0", active ? "text-accent" : "text-neutral-400 group-hover:text-neutral-600")}
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

/** Barra laterale sinistra richiudibile: aperta mostra le etichette, chiusa solo le icone. */
export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { primaryLinks, isRouteActive } = useSidebarNavState();
  const { user } = useCurrentUser();
  const { t } = useI18n();

  const adminLinks = useMemo(
    () => (user?.isAdmin ? [...ADMIN_NAV, ...ADMIN_ONLY_NAV] : ADMIN_NAV),
    [user]
  );

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? t.nav.expandMenu : t.nav.collapseMenu;
  const toggleButton = (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-canvas hover:text-text"
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      title={toggleLabel}
    >
      <ToggleIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
    </button>
  );

  return (
    <aside
      className={clsx(
        "flex h-dvh shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[216px]"
      )}
      aria-label={t.nav.mainNavigation}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 pb-5 pt-6">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-accent text-white"
            title="Wine List Manager"
          >
            <Wine className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          {toggleButton}
        </div>
      ) : (
        <div className="flex items-start gap-2.5 pb-6 pl-5 pr-3 pt-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Wine className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 font-display text-[19px] font-bold leading-[1.05] tracking-tight text-text">
            Wine List Manager
          </span>
          {toggleButton}
        </div>
      )}

      <nav className={clsx("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-2.5" : "px-3")}>
        <ul className="space-y-0.5">
          {primaryLinks.map((item) => (
            <li key={item.id}>
              <NavRow item={item} active={isRouteActive(item.href)} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      <div className={clsx("space-y-0.5 border-t border-line py-3", collapsed ? "px-2.5" : "px-3")}>
        <ul className="space-y-0.5">
          {adminLinks.map((item) => (
            <li key={item.id}>
              <NavRow item={item} active={isRouteActive(item.href)} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        {user ? (
          <LogoutButton variant="sidebar" iconOnly={collapsed} />
        ) : null}
        {collapsed ? (
          <div className="flex justify-center pt-2">
            <LanguageSwitch tone="light" vertical />
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {t.nav.language}
            </span>
            <LanguageSwitch tone="light" />
          </div>
        )}
      </div>
    </aside>
  );
}

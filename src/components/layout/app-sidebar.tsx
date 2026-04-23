"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  GlassWater,
  LayoutDashboard,
  Settings,
  Wine,
  type LucideIcon
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { clsx } from "clsx";
import { useExtraSections } from "@/components/layout/extra-sections-provider";
import {
  ADMIN_NAV,
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
  Settings
};

function NavRow({
  item,
  active,
  onNavigate
}: {
  item: SidebarNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICON_MAP[item.icon];
  const settingsOnlyIcon = item.id === "settings";

  const base = clsx(
    "flex w-auto shrink-0 items-center rounded-lg py-2 font-semibold leading-tight transition-colors duration-200",
    settingsOnlyIcon
      ? "gap-0 px-2 sm:px-2.5"
      : "gap-1.5 whitespace-nowrap px-2 text-[13px] sm:gap-2 sm:px-2.5 sm:text-[14px] md:text-[15px]",
    settingsOnlyIcon && "text-[15px]"
  );
  const interactive = item.href
    ? clsx(
        active
          ? "border-l-2 border-wine-gold bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          : "border-l-2 border-transparent text-wine-mist/85 hover:bg-white/[0.05] hover:text-white"
      )
    : "cursor-not-allowed border-l-2 border-transparent text-wine-mist/40";

  if (item.href && settingsOnlyIcon) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={clsx(base, interactive)}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-4 shrink-0 opacity-95 sm:size-[1.05rem]" strokeWidth={1.75} aria-hidden />
      </Link>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={clsx(base, interactive)}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-4 shrink-0 opacity-95 sm:size-[1.05rem]" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 max-w-[5.5rem] truncate tracking-wide sm:max-w-[8rem] md:max-w-[12rem] md:overflow-visible lg:max-w-none">
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <span className={clsx(base, interactive)} title="Sezione in arrivo">
      <Icon className="size-4 shrink-0 sm:size-[1.05rem]" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 max-w-[5.5rem] truncate tracking-wide sm:max-w-[8rem] md:max-w-[12rem] md:overflow-visible lg:max-w-none">
        {item.label}
      </span>
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

export function AppSidebarTop() {
  const { primaryLinks, isRouteActive } = useSidebarNavState();

  return (
    <header
      className="sticky top-0 z-[115] w-full shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-wine-graphite to-wine-bordeauxMuted shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
      aria-label="Navigazione principale"
    >
      <div className="flex min-w-0 items-center gap-1.5 px-2 py-2 sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center border-r border-white/[0.1] pr-3 sm:pr-4"
          aria-label="Home"
        >
          <span className="whitespace-nowrap font-display text-xl font-bold tracking-wide text-wine-gold sm:text-2xl md:text-[1.75rem]">
            Wine List Manager
          </span>
        </Link>

        <nav className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <ul className="flex flex-nowrap items-center gap-0.5 py-0.5">
            {primaryLinks.map((item) => (
              <li key={item.id}>
                <NavRow item={item} active={isRouteActive(item.href)} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-white/[0.1] pl-2 sm:gap-1 sm:pl-3">
          <ul className="flex flex-nowrap items-center gap-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.id}>
                <NavRow item={item} active={isRouteActive(item.href)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}

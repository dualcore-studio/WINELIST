import {
  DEFAULT_EXTRA_CATEGORIES,
  WINELIST_CATEGORIES,
  type SidebarIconName,
  type SidebarNavItem
} from "@/lib/sidebar-nav";

export const NAV_EXTRA_STORAGE_KEY = "winelist-extra-nav-sections";

const FIXED_LABELS = new Set(
  WINELIST_CATEGORIES.map((c) => c.label.trim().toLowerCase())
);

const LEGACY_FIXED_LABELS = new Set(["grappe e distillati"]);
const LEGACY_FIXED_IDS = new Set(["grappe-distillati"]);

export const ICON_CHOICES: readonly SidebarIconName[] = [
  "LayoutDashboard",
  "Wine",
  "FlaskConical",
  "GlassWater",
  "Settings"
] as const;

export function isSidebarIconName(s: string): s is SidebarIconName {
  return (ICON_CHOICES as readonly string[]).includes(s);
}

export function stripFixedCategories(items: SidebarNavItem[]): SidebarNavItem[] {
  return items.filter((item) => {
    const label = item.label.trim().toLowerCase();
    if (FIXED_LABELS.has(label)) return false;
    if (LEGACY_FIXED_LABELS.has(label)) return false;
    if (LEGACY_FIXED_IDS.has(item.id)) return false;
    return true;
  });
}

export function parseStoredNav(raw: string | null): SidebarNavItem[] {
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

export function mergeDefaultHrefs(items: SidebarNavItem[]): SidebarNavItem[] {
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

export type InstantNavRow = {
  id: string;
  label: string;
  icon: string;
  sortOrder: number;
  updatedAt?: string;
};

export function mapInstantRowToNavItem(row: {
  id?: string;
  label?: unknown;
  icon?: unknown;
  sortOrder?: unknown;
}): SidebarNavItem | null {
  if (!row.id) return null;
  const label = String(row.label ?? "").trim();
  if (!label) return null;
  const rawIcon = String(row.icon ?? "Wine");
  const icon: SidebarIconName = isSidebarIconName(rawIcon) ? rawIcon : "Wine";
  return { id: String(row.id), label, icon };
}

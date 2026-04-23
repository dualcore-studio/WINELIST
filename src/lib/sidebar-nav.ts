/**
 * Configurazione navigazione sidebar: aggiungi voci qui per estendere il menu.
 * Le voci senza `href` sono mostrate come non ancora disponibili (stile disabilitato).
 */

export type SidebarIconName =
  | "LayoutDashboard"
  | "Wine"
  | "FlaskConical"
  | "GlassWater"
  | "Settings";

export type SidebarNavItem = {
  id: string;
  label: string;
  /** Se assente, la voce non è cliccabile (sezione in arrivo). */
  href?: string;
  icon: SidebarIconName;
};

/** Navigazione principale (in alto). */
export const MAIN_NAV: SidebarNavItem[] = [];

/** Voci principali (link a pagine dedicate, non rimovibili dall'utente). */
export const WINELIST_CATEGORIES: SidebarNavItem[] = [
  { id: "winelist", label: "Wine List", href: "/wines", icon: "Wine" },
  {
    id: "grappe-distillati",
    label: "Distillati",
    href: "/grappe-distillati",
    icon: "FlaskConical"
  }
];

/** Categorie extra inizialmente vuote; si aggiungono da Impostazioni. */
export const DEFAULT_EXTRA_CATEGORIES: SidebarNavItem[] = [];

/** Area amministrativa (in basso). */
export const ADMIN_NAV: SidebarNavItem[] = [
  {
    id: "settings",
    label: "Impostazioni",
    href: "/settings",
    icon: "Settings"
  }
];

"use client";

import { useCallback, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ExtraSectionsProvider } from "@/components/layout/extra-sections-provider";
import { SIDEBAR_COOKIE } from "@/lib/i18n/config";

export function AppShell({
  children,
  initialSidebarCollapsed = true
}: {
  children: ReactNode;
  /** Letto dal cookie nel layout: la barra si apre già nello stato scelto. */
  initialSidebarCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "closed" : "open"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  // Le pagine di stampa hanno un layout proprio (flusso normale, niente barra) per poter andare su più fogli.
  if (pathname?.startsWith("/stampa")) return <>{children}</>;

  return (
    <ExtraSectionsProvider>
      <div className="flex h-dvh min-h-0 min-w-0 overflow-hidden bg-canvas font-sans text-text">
        {isLoginPage ? null : <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </ExtraSectionsProvider>
  );
}

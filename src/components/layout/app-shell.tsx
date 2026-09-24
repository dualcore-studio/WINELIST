"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ExtraSectionsProvider } from "@/components/layout/extra-sections-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Le pagine di stampa hanno un layout proprio (flusso normale, niente barra) per poter andare su più fogli.
  if (pathname?.startsWith("/stampa")) return <>{children}</>;

  return (
    <ExtraSectionsProvider>
      <div className="flex h-dvh min-h-0 min-w-0 overflow-hidden bg-canvas font-sans text-text">
        {isLoginPage ? null : <AppSidebar />}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </ExtraSectionsProvider>
  );
}

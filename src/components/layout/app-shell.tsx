"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebarTop } from "@/components/layout/app-sidebar";
import { ExtraSectionsProvider } from "@/components/layout/extra-sections-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <ExtraSectionsProvider>
      <div className="bg-paper flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden font-sans text-text">
        {isLoginPage ? null : <AppSidebarTop />}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </ExtraSectionsProvider>
  );
}

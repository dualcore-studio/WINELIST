"use client";

import type { ReactNode } from "react";
import { AppSidebarTop } from "@/components/layout/app-sidebar";
import { ExtraSectionsProvider } from "@/components/layout/extra-sections-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ExtraSectionsProvider>
      <div className="bg-paper flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden font-sans text-text">
        <AppSidebarTop />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </ExtraSectionsProvider>
  );
}

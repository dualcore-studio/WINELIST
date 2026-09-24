"use client";

import Link from "next/link";
import { BinResetPanel } from "@/components/wines/bin-reset-panel";
import { useI18n } from "@/lib/i18n/provider";

export function SettingsView() {
  const { t: tr } = useI18n();

  return (
    <div className="h-full w-full max-w-3xl overflow-y-auto px-5 pb-10 pt-7 sm:px-8 md:pt-9 lg:px-10">
      <h1 className="font-display text-[34px] font-bold leading-none tracking-tight text-text">
        {tr.settings.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {tr.settings.description}
      </p>

      <BinResetPanel />

      <Link
        href="/wines"
        className="mt-8 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        {tr.common.backToWineList}
      </Link>
    </div>
  );
}

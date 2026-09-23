"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  iconOnly?: boolean;
  /** Stile della voce nella barra laterale. */
  variant?: "default" | "sidebar";
};

export function LogoutButton({ className, iconOnly = false, variant = "default" }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={cn(
        variant === "sidebar"
          ? cn(
              "group flex w-full items-center rounded-lg py-2 text-[13.5px] font-medium text-neutral-600 transition-colors hover:bg-canvas hover:text-text disabled:opacity-60",
              iconOnly ? "justify-center px-0" : "gap-3 px-3"
            )
          : "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60",
        className
      )}
      title={t.nav.logout}
      aria-label={t.nav.logout}
    >
      <LogOut
        className={variant === "sidebar" ? "size-[18px] text-neutral-400 group-hover:text-neutral-600" : "size-4"}
        strokeWidth={variant === "sidebar" ? 1.75 : 2}
        aria-hidden
      />
      {iconOnly ? null : t.nav.logout}
    </button>
  );
}

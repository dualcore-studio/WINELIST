"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  iconOnly?: boolean;
};

export function LogoutButton({ className, iconOnly = false }: Props) {
  const router = useRouter();
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
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60",
        className
      )}
      title="Esci"
      aria-label="Esci"
    >
      <LogOut className="size-4" aria-hidden />
      {iconOnly ? null : "Esci"}
    </button>
  );
}

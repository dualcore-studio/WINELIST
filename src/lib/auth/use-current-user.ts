"use client";

import { useEffect, useState } from "react";

export type CurrentUser = { id: string; username: string; isAdmin: boolean };

export function useCurrentUser(): { user: CurrentUser | null; isLoading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user: CurrentUser | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading };
}

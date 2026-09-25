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

let usernamePromise: Promise<string> | null = null;

/**
 * Nome dell'utente collegato, chiesto una sola volta e condiviso da tutti i componenti
 * (serve a firmare i movimenti di magazzino, anche da ogni riga di una tabella).
 */
export function useUsername(): string {
  const [username, setUsername] = useState("");
  useEffect(() => {
    usernamePromise ??= fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user: CurrentUser | null }) => data.user?.username ?? "")
      .catch(() => {
        usernamePromise = null;
        return "";
      });
    let cancelled = false;
    void usernamePromise.then((name) => {
      if (!cancelled) setUsername(name);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return username;
}

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  redirectTo: string;
};

export function LoginView({ redirectTo }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Accesso non riuscito. Riprova.");
        setIsSubmitting(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Accesso non riuscito. Riprova.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm rounded-xl2 border border-neutral-200 bg-white p-6 shadow-soft">
        <div className="mb-4">
          <h1 className="font-display text-xl font-semibold text-text">Wine List Manager</h1>
          <p className="mt-1 text-sm text-neutral-500">Accedi con le tue credenziali.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="login-username">
              Username
            </label>
            <Input
              id="login-username"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="login-password">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Accesso..." : "Accedi"}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { readApiError } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";

type Props = {
  redirectTo: string;
};

export function LoginView({ redirectTo }: Props) {
  const router = useRouter();
  const { t } = useI18n();
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
        setError(await readApiError(res, t));
        setIsSubmitting(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(t.login.failed);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_rgba(17,17,17,0.14)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold text-text">Wine List Manager</h1>
            <p className="mt-1 text-sm text-neutral-500">{t.login.subtitle}</p>
          </div>
          <LanguageSwitch tone="light" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="login-username">
              {t.login.username}
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
              {t.login.password}
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
            {isSubmitting ? t.login.submitting : t.login.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}

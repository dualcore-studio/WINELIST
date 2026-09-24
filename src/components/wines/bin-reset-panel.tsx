"use client";

import { useState } from "react";
import { Eraser, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllBins, restoreBins, useBinBackups } from "@/features/wines/bin-backup";
import { DEFAULT_WINES_COLLECTION, getWines } from "@/features/wines/repository";
import { formatDateTime } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";

type PendingAction = "reset" | "restore" | null;

/** Riquadro delle Impostazioni: svuota tutti i bin della wine list salvandone un backup, o ripristina l'ultimo backup. */
export function BinResetPanel() {
  const collection = DEFAULT_WINES_COLLECTION;
  const { t, lang } = useI18n();
  const { wines, isLoading } = getWines(collection);
  const backups = useBinBackups(collection);
  const latestBackup = backups[0] ?? null;
  const binCount = wines.filter((w) => w.binNumber).length;

  const [pending, setPending] = useState<PendingAction>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backupDate = latestBackup ? formatDateTime(new Date(latestBackup.createdAt), lang) : "";
  const backupCount = latestBackup ? Object.keys(latestBackup.bins).length : 0;

  function ask(action: Exclude<PendingAction, null>) {
    setError(null);
    setPending(action);
  }

  function cancel() {
    if (!isWorking) setPending(null);
  }

  async function confirm() {
    setError(null);
    setIsWorking(true);
    try {
      if (pending === "reset") await resetAllBins(wines, collection, backups);
      else if (pending === "restore" && latestBackup) await restoreBins(latestBackup, wines);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.operationFailed);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-base font-semibold text-text">{t.wines.bins.title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t.wines.bins.description}</p>

      <div className="mt-4 space-y-1 text-sm text-neutral-700">
        <p>{isLoading ? t.common.loading : t.wines.bins.assigned(binCount)}</p>
        <p>{latestBackup ? t.wines.bins.lastBackup(backupDate, backupCount) : t.wines.bins.noBackup}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="gap-2 !text-red-700 hover:!bg-red-50"
          onClick={() => ask("reset")}
          disabled={isLoading || binCount === 0}
        >
          <Eraser className="size-4" strokeWidth={2} aria-hidden />
          {t.wines.bins.reset}
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => ask("restore")} disabled={!latestBackup}>
          <History className="size-4" strokeWidth={2} aria-hidden />
          {t.wines.bins.restore}
        </Button>
      </div>

      {pending ? (
        <div
          className="fixed inset-0 z-[200] flex animate-fade-in items-center justify-center bg-black/25 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bin-action-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_rgba(17,17,17,0.14)]">
            <h4 id="bin-action-title" className="font-display text-2xl font-bold text-text">
              {pending === "reset" ? t.wines.bins.resetTitle : t.wines.bins.restoreTitle}
            </h4>
            <p className="mt-3 text-sm text-neutral-700">
              {pending === "reset" ? t.wines.bins.resetText(binCount) : t.wines.bins.restoreText(backupDate)}
            </p>
            {pending === "reset" && latestBackup ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t.wines.bins.resetReplacesBackup(backupDate)}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={cancel} disabled={isWorking}>
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                className={pending === "reset" ? "!bg-red-600 !text-white hover:!bg-red-700" : undefined}
                onClick={() => void confirm()}
                disabled={isWorking}
              >
                {pending === "reset"
                  ? isWorking
                    ? t.wines.bins.resetting
                    : t.wines.bins.resetConfirm
                  : isWorking
                    ? t.wines.bins.restoring
                    : t.wines.bins.restoreConfirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

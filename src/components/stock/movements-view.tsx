"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { MOVEMENT_REASONS, useMovements, type MovementReason } from "@/features/stock/movements";
import { DEFAULT_WINES_COLLECTION, SPIRITS_COLLECTION } from "@/features/wines/repository";
import { formatDateTime } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type Period = "" | "today" | "week" | "month";

/** Inizio del periodo scelto (mezzanotte di oggi, oppure 7/30 giorni fa). */
function periodStart(period: Period): number {
  if (!period) return 0;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  if (period === "today") return midnight.getTime();
  return midnight.getTime() - (period === "week" ? 6 : 29) * DAY_MS;
}

const REASON_TONE: Record<MovementReason, string> = {
  sale: "bg-neutral-100 text-neutral-700",
  load: "bg-emerald-50 text-emerald-700",
  delivery: "bg-sky-50 text-sky-700",
  breakage: "bg-red-50 text-red-700",
  internal: "bg-amber-50 text-amber-700",
  inventory: "bg-violet-50 text-violet-700"
};

/** Registro movimenti: ogni variazione di quantità, dal più recente, con filtri e totali. */
export function MovementsView() {
  const { t, lang } = useI18n();
  const tm = t.stock.movements;
  const { movements, isLoading, error } = useMovements();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("");
  const [period, setPeriod] = useState<Period>("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = periodStart(period);
    return movements.filter(
      (m) =>
        (!q || m.itemName.toLowerCase().includes(q)) &&
        (!section || m.collection === section) &&
        (!reason || m.reason === reason) &&
        (!from || new Date(m.createdAt).getTime() >= from)
    );
  }, [movements, search, section, reason, period]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, m) => (m.delta < 0 ? { ...acc, out: acc.out - m.delta } : { ...acc, in: acc.in + m.delta }),
        { in: 0, out: 0 }
      ),
    [filtered]
  );

  const shown = filtered.slice(0, limit);
  const hasFilters = Boolean(search || section || reason || period);
  const field =
    "h-9 w-56 rounded-full border border-line bg-white px-3.5 text-[13px] text-text outline-none transition-colors placeholder:text-neutral-500 hover:border-neutral-300 focus:border-accent/40 focus:ring-2 focus:ring-accent-ring";
  const th =
    "sticky top-0 z-10 whitespace-nowrap border-b border-accent bg-accent px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-white md:px-4";
  const td = "border-t border-line/70 px-3 py-2.5 align-top md:px-4";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5 pb-10 pt-7 sm:px-8 md:pt-9 lg:px-10">
        <section>
          <h1 className="font-display text-[34px] font-bold leading-none tracking-tight text-text">{tm.title}</h1>
          <p className="mt-2 text-sm text-muted">{tm.description}</p>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder={tm.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            className={field}
          />
          <FilterSelect
            value={section}
            onChange={setSection}
            placeholder={tm.section}
            options={[
              { value: DEFAULT_WINES_COLLECTION, label: t.stock.dashboard.scopeWines },
              { value: SPIRITS_COLLECTION, label: t.stock.dashboard.scopeSpirits }
            ]}
          />
          <FilterSelect
            value={reason}
            onChange={setReason}
            placeholder={tm.reasonLabel}
            options={MOVEMENT_REASONS.map((r) => ({ value: r, label: tm.reason[r] }))}
          />
          <FilterSelect
            value={period}
            onChange={(v) => setPeriod(v as Period)}
            placeholder={tm.allTime}
            options={[
              { value: "today", label: tm.periodToday },
              { value: "week", label: tm.periodWeek },
              { value: "month", label: tm.periodMonth }
            ]}
          />
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSection("");
                setReason("");
                setPeriod("");
              }}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-500 transition-colors hover:border-accent/40 hover:text-accent"
              aria-label={t.common.resetFilters}
              title={t.common.resetFilters}
            >
              <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          <div className="ml-auto flex gap-4 text-sm text-neutral-600">
            <span>
              {tm.totalsOut} <strong className="tabular-nums text-red-700">−{totals.out}</strong>
            </span>
            <span>
              {tm.totalsIn} <strong className="tabular-nums text-emerald-700">+{totals.in}</strong>
            </span>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t.common.loadFailed}</p>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
          {isLoading ? (
            <p className="p-7 text-center text-[15px] text-neutral-600">{t.common.loading}</p>
          ) : filtered.length === 0 ? (
            <p className="p-7 text-center text-[15px] text-neutral-600">{hasFilters ? tm.emptyFiltered : tm.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px] text-neutral-800 md:text-[14px]">
                <thead>
                  <tr>
                    <th className={clsx(th, "text-left")}>{tm.colDate}</th>
                    <th className={clsx(th, "text-left")}>{tm.colItem}</th>
                    <th className={clsx(th, "text-left")}>{tm.colReason}</th>
                    <th className={clsx(th, "text-right")}>{tm.colDelta}</th>
                    <th className={clsx(th, "text-right")}>{tm.colQty}</th>
                    <th className={clsx(th, "text-left")}>{tm.colUser}</th>
                    <th className={clsx(th, "text-left")}>{tm.colNote}</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:first-child>td]:border-t-0">
                  {shown.map((m) => (
                    <tr key={m.id} className="hover:bg-canvas/60">
                      <td className={clsx(td, "whitespace-nowrap tabular-nums text-neutral-600")}>
                        {m.createdAt ? formatDateTime(new Date(m.createdAt), lang) : "—"}
                      </td>
                      <td className={td}>
                        <div className="font-semibold text-text">{m.itemName}</div>
                        <div className="text-xs text-muted">
                          {m.collection === SPIRITS_COLLECTION ? t.stock.dashboard.kindSpirit : t.stock.dashboard.kindWine}
                        </div>
                      </td>
                      <td className={td}>
                        <span
                          className={clsx(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
                            REASON_TONE[m.reason]
                          )}
                        >
                          {tm.reason[m.reason]}
                        </span>
                      </td>
                      <td
                        className={clsx(
                          td,
                          "text-right font-semibold tabular-nums",
                          m.delta < 0 ? "text-red-700" : "text-emerald-700"
                        )}
                      >
                        {m.delta > 0 ? `+${m.delta}` : `−${Math.abs(m.delta)}`}
                      </td>
                      <td className={clsx(td, "whitespace-nowrap text-right tabular-nums text-neutral-600")}>
                        {m.qtyBefore} → <span className="font-semibold text-text">{m.qtyAfter}</span>
                      </td>
                      <td className={clsx(td, "whitespace-nowrap text-neutral-600")}>{m.username || "—"}</td>
                      <td className={clsx(td, "text-neutral-600")}>{m.note || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {filtered.length > 0 ? (
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <span>{tm.count(shown.length, filtered.length)}</span>
            {filtered.length > shown.length ? (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 font-semibold text-neutral-700 shadow-sm hover:bg-canvas"
              >
                {tm.showMore(Math.min(PAGE_SIZE, filtered.length - shown.length))}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

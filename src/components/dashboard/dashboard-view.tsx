"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { BellRing, Pencil, Printer, Truck, X } from "lucide-react";
import { GrappaFormModal } from "@/components/grappe/grappa-form-modal";
import { QuantityDialog } from "@/components/stock/quantity-dialog";
import { StockQuantity } from "@/components/stock/stock-quantity";
import { WineFormModal } from "@/components/wines/wine-form-modal";
import { recordMovement } from "@/features/stock/movements";
import { cancelOrder, markOrdered, receiveOrder } from "@/features/stock/orders";
import {
  compareUrgency,
  isOrdered,
  isTracked,
  needsReorder,
  stockQuantity,
  stockStatus,
  stockValue,
  suggestedOrder
} from "@/features/stock/stock";
import { useCurrency } from "@/features/settings/currency";
import {
  DEFAULT_WINES_COLLECTION,
  SPIRITS_COLLECTION,
  updateWine,
  useWines,
  type WineInput
} from "@/features/wines/repository";
import { useUsername } from "@/lib/auth/use-current-user";
import { formatDate, formatPrice } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import { formatVintage, type Wine } from "@/types/wine";

export type DashboardScope = "all" | "wines" | "spirits";
type Kind = "wine" | "spirit";
type Row = { item: Wine; kind: Kind };

/** Righe di vini e distillati insieme, secondo la sezione scelta. */
export function useStockRows(scope: DashboardScope) {
  const winesQuery = useWines(DEFAULT_WINES_COLLECTION);
  const spiritsQuery = useWines(SPIRITS_COLLECTION);
  const rows = useMemo<Row[]>(
    () => [
      ...(scope === "spirits" ? [] : winesQuery.wines.map((item) => ({ item, kind: "wine" as const }))),
      ...(scope === "wines" ? [] : spiritsQuery.wines.map((item) => ({ item, kind: "spirit" as const })))
    ],
    [scope, winesQuery.wines, spiritsQuery.wines]
  );
  return {
    rows,
    wines: winesQuery.wines,
    isLoading: winesQuery.isLoading || spiritsQuery.isLoading,
    error: winesQuery.error ?? spiritsQuery.error
  };
}

/** Articoli da ordinare (non ancora ordinati), dal più urgente. */
export function toOrderRows(rows: readonly Row[]): Row[] {
  return rows
    .filter(({ item }) => needsReorder(item) && !isOrdered(item))
    .sort((a, b) => compareUrgency(a.item, b.item));
}

function ItemCell({ row }: { row: Row }) {
  const { t } = useI18n();
  const { item, kind } = row;
  const producer = item.winery && item.winery.toLowerCase() !== "other" ? item.winery : "";
  // I distillati non hanno annata né bin: si mostra la tipologia.
  const details = (
    kind === "wine"
      ? [producer, formatVintage(item.vintage), item.binNumber ? `Bin ${item.binNumber}` : ""]
      : [producer, item.spiritType ?? ""]
  ).filter(Boolean);
  return (
    <div className="min-w-0">
      <div className="font-semibold text-text">{item.name}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
        <span
          className={clsx(
            "rounded px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide",
            kind === "wine" ? "bg-accent-soft text-accent" : "bg-neutral-100 text-neutral-600"
          )}
        >
          {kind === "wine" ? t.stock.dashboard.kindWine : t.stock.dashboard.kindSpirit}
        </span>
        {details.join(" · ")}
      </div>
    </div>
  );
}

function StatusBadge({ item }: { item: Wine }) {
  const { t } = useI18n();
  const status = stockStatus(item);
  if (status !== "out" && status !== "low") return null;
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "out" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
      )}
    >
      {t.stock.status[status]}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "alert" | "info";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</div>
      <div
        className={clsx(
          "mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums",
          tone === "alert" ? "text-red-700" : tone === "info" ? "text-sky-700" : "text-text"
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-muted">{hint}</div>
    </div>
  );
}

const th = "whitespace-nowrap border-b border-line bg-canvas px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-600 md:px-4";
const td = "border-t border-line/70 px-3 py-3 align-middle md:px-4";

function Card({ title, count, icon, children }: { title: string; count: number; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3 md:px-5">
        {icon}
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">
          {count}
        </span>
      </header>
      {children}
    </section>
  );
}

function ActionButton({
  onClick,
  children,
  variant = "secondary",
  title
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "icon";
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={clsx(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
        variant === "primary" && "bg-accent px-3 text-white hover:bg-accent-hover",
        variant === "secondary" && "border border-line bg-white px-3 text-neutral-700 hover:bg-canvas",
        variant === "icon" && "w-8 text-neutral-400 hover:bg-canvas hover:text-text"
      )}
    >
      {children}
    </button>
  );
}

type Dialog = { mode: "order" | "receive"; row: Row } | null;

const collectionOf = (kind: Kind) => (kind === "wine" ? DEFAULT_WINES_COLLECTION : SPIRITS_COLLECTION);

export function DashboardView() {
  const { t, lang } = useI18n();
  const td_ = t.stock.dashboard;
  const currency = useCurrency();
  const [scope, setScope] = useState<DashboardScope>("all");
  const { rows, wines, isLoading, error } = useStockRows(scope);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const username = useUsername();

  const stats = useMemo(() => {
    const items = rows.map((r) => r.item);
    const tracked = items.filter(isTracked);
    return {
      tracked: tracked.length,
      out: tracked.filter((w) => stockStatus(w) === "out").length,
      bottles: items.reduce((sum, w) => sum + stockQuantity(w), 0),
      labels: items.filter((w) => stockQuantity(w) > 0).length,
      value: stockValue(items)
    };
  }, [rows]);
  const toOrder = useMemo(() => toOrderRows(rows), [rows]);
  const incoming = useMemo(
    () => rows.filter(({ item }) => isOrdered(item)).sort((a, b) => (a.item.orderedAt ?? "").localeCompare(b.item.orderedAt ?? "")),
    [rows]
  );

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setActionError(null);
      try {
        await action();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t.common.operationFailed);
      }
    },
    [t]
  );

  const saveEdit = useCallback(
    async (input: WineInput) => {
      if (!editing) return;
      setIsSaving(true);
      try {
        const collection = collectionOf(editing.kind);
        await updateWine(editing.item.id, input, collection);
        await recordMovement(
          editing.item,
          collection,
          stockQuantity(editing.item),
          input.isAvailable ? input.quantity : 0,
          "inventory",
          username
        );
      } finally {
        setIsSaving(false);
      }
    },
    [editing, username]
  );

  const scopes: { value: DashboardScope; label: string }[] = [
    { value: "all", label: td_.scopeAll },
    { value: "wines", label: td_.scopeWines },
    { value: "spirits", label: td_.scopeSpirits }
  ];

  const dash = <span className="text-neutral-300">—</span>;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5 pb-10 pt-7 sm:px-8 md:pt-9 lg:px-10">
        <section className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[34px] font-bold leading-none tracking-tight text-text">{td_.title}</h1>
            <p className="mt-2 text-sm text-muted">{td_.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label={td_.title} className="inline-flex rounded-lg border border-line bg-white p-1">
              {scopes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={scope === s.value}
                  onClick={() => setScope(s.value)}
                  className={clsx(
                    "h-7 rounded-md px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                    scope === s.value ? "bg-accent text-white shadow-sm" : "text-neutral-600 hover:text-text"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.open(`/stampa/ordini?scope=${scope}`, "_blank")}
              disabled={isLoading || toOrder.length === 0}
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="size-4" strokeWidth={2} aria-hidden />
              {td_.printOrders}
            </button>
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {actionError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
        ) : null}

        {isLoading ? (
          <p className="rounded-xl border border-line bg-white p-7 text-center text-[15px] text-neutral-600 shadow-soft">
            {t.common.loading}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi
                label={td_.kpiToOrder}
                value={toOrder.length}
                hint={td_.kpiTracked(stats.tracked)}
                tone={toOrder.length ? "alert" : "default"}
              />
              <Kpi
                label={td_.kpiIncoming}
                value={incoming.length}
                hint={td_.kpiIncomingHint}
                tone={incoming.length ? "info" : "default"}
              />
              <Kpi label={td_.kpiOut} value={stats.out} hint={td_.kpiOutHint} tone={stats.out ? "alert" : "default"} />
              <Kpi label={td_.kpiBottles} value={stats.bottles.toLocaleString(lang === "en" ? "en-US" : "it-IT")} hint={td_.kpiBottlesHint(stats.labels)} />
              <Kpi label={td_.kpiValue} value={formatPrice(Math.round(stats.value), currency)} hint={td_.kpiValueHint} />
            </div>

            {stats.tracked === 0 && incoming.length === 0 ? (
              <section className="rounded-xl border border-dashed border-line bg-white p-8 text-center shadow-soft">
                <BellRing className="mx-auto size-8 text-accent" strokeWidth={1.75} aria-hidden />
                <h2 className="mt-3 text-base font-semibold text-text">{td_.noTrackingTitle}</h2>
                <p className="mx-auto mt-1.5 max-w-xl text-sm text-neutral-600">{td_.noTrackingText}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/settings#scorte" className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover">
                    {td_.goToSettings}
                  </Link>
                  <Link href="/wines" className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-canvas">
                    {td_.goToWines}
                  </Link>
                </div>
              </section>
            ) : (
              <>
                <Card
                  title={td_.toOrderTitle}
                  count={toOrder.length}
                  icon={<BellRing className="size-4 text-red-600" strokeWidth={2} aria-hidden />}
                >
                  {toOrder.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-neutral-600">{td_.toOrderEmpty}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-[13px] text-neutral-800 md:text-[14px]">
                        <thead>
                          <tr>
                            <th className={clsx(th, "text-left")}>{td_.colItem}</th>
                            <th className={clsx(th, "text-left")}>{td_.colSupplier}</th>
                            <th className={clsx(th, "text-right")}>{td_.colQty}</th>
                            <th className={clsx(th, "text-right")}>{td_.colMin}</th>
                            <th className={clsx(th, "text-right")}>{td_.colTarget}</th>
                            <th className={clsx(th, "text-right")}>{td_.colSuggested}</th>
                            <th className={clsx(th, "text-left")}>{td_.colStatus}</th>
                            <th className={th} />
                          </tr>
                        </thead>
                        <tbody className="[&_tr:first-child>td]:border-t-0">
                          {toOrder.map((row) => {
                            const suggested = suggestedOrder(row.item);
                            return (
                              <tr key={row.item.id} className="hover:bg-canvas/60">
                                <td className={td}>
                                  <ItemCell row={row} />
                                </td>
                                <td className={clsx(td, "text-neutral-600")}>{row.item.supplier || dash}</td>
                                <td className={clsx(td, "text-right")}>
                                  <StockQuantity item={row.item} />
                                </td>
                                <td className={clsx(td, "text-right tabular-nums")}>{row.item.minStock}</td>
                                <td className={clsx(td, "text-right tabular-nums")}>{row.item.targetStock ?? dash}</td>
                                <td className={clsx(td, "text-right font-semibold tabular-nums")}>{suggested ?? dash}</td>
                                <td className={td}>
                                  <StatusBadge item={row.item} />
                                </td>
                                <td className={clsx(td, "text-right")}>
                                  <div className="flex items-center justify-end gap-1">
                                    <ActionButton variant="primary" onClick={() => setDialog({ mode: "order", row })}>
                                      <Truck className="size-3.5" strokeWidth={2} aria-hidden />
                                      {td_.markOrdered}
                                    </ActionButton>
                                    <ActionButton variant="icon" title={t.common.editItem(row.item.name)} onClick={() => setEditing(row)}>
                                      <Pencil className="size-[15px]" aria-hidden />
                                    </ActionButton>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card
                  title={td_.incomingTitle}
                  count={incoming.length}
                  icon={<Truck className="size-4 text-sky-600" strokeWidth={2} aria-hidden />}
                >
                  {incoming.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-neutral-600">{td_.incomingEmpty}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-[13px] text-neutral-800 md:text-[14px]">
                        <thead>
                          <tr>
                            <th className={clsx(th, "text-left")}>{td_.colItem}</th>
                            <th className={clsx(th, "text-left")}>{td_.colSupplier}</th>
                            <th className={clsx(th, "text-right")}>{td_.colQty}</th>
                            <th className={clsx(th, "text-right")}>{td_.colOrdered}</th>
                            <th className={clsx(th, "text-left")}>{td_.colOrderedOn}</th>
                            <th className={th} />
                          </tr>
                        </thead>
                        <tbody className="[&_tr:first-child>td]:border-t-0">
                          {incoming.map((row) => (
                            <tr key={row.item.id} className="hover:bg-canvas/60">
                              <td className={td}>
                                <ItemCell row={row} />
                              </td>
                              <td className={clsx(td, "text-neutral-600")}>{row.item.supplier || dash}</td>
                              <td className={clsx(td, "text-right")}>
                                <StockQuantity item={row.item} />
                              </td>
                              <td className={clsx(td, "text-right font-semibold tabular-nums")}>{row.item.orderedQty ?? dash}</td>
                              <td className={clsx(td, "whitespace-nowrap text-neutral-600")}>
                                {row.item.orderedAt ? formatDate(new Date(row.item.orderedAt), lang) : dash}
                              </td>
                              <td className={clsx(td, "text-right")}>
                                <div className="flex items-center justify-end gap-1">
                                  <ActionButton variant="primary" onClick={() => setDialog({ mode: "receive", row })}>
                                    {td_.receive}
                                  </ActionButton>
                                  <ActionButton
                                    variant="icon"
                                    title={td_.cancelOrder}
                                    onClick={() => void run(() => cancelOrder(row.item))}
                                  >
                                    <X className="size-4" aria-hidden />
                                  </ActionButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {dialog?.mode === "order" ? (
        <QuantityDialog
          title={td_.orderDialogTitle}
          itemLabel={dialog.row.item.name}
          label={td_.orderQty}
          defaultValue={suggestedOrder(dialog.row.item)}
          confirmLabel={td_.orderConfirm}
          onConfirm={(qty) => markOrdered(dialog.row.item, qty)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.mode === "receive" ? (
        <QuantityDialog
          title={td_.receiveDialogTitle}
          itemLabel={dialog.row.item.name}
          label={td_.receiveQty}
          hint={td_.receiveHint(stockQuantity(dialog.row.item))}
          defaultValue={dialog.row.item.orderedQty}
          confirmLabel={td_.receiveConfirm}
          onConfirm={(qty) => receiveOrder(dialog.row.item, qty, collectionOf(dialog.row.kind), username)}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {editing?.kind === "wine" ? (
        <WineFormModal
          open
          mode="edit"
          wine={editing.item}
          wines={wines}
          isSaving={isSaving}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      ) : null}
      {editing?.kind === "spirit" ? (
        <GrappaFormModal
          open
          mode="edit"
          wine={editing.item}
          isSaving={isSaving}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      ) : null}
    </div>
  );
}

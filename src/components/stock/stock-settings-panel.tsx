"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Boxes } from "lucide-react";
import { BulkStockDialog } from "@/components/stock/bulk-stock-dialog";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { isTracked } from "@/features/stock/stock";
import { DEFAULT_WINES_COLLECTION, SPIRITS_COLLECTION, useWines } from "@/features/wines/repository";
import { countryLabel, wineTypeLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import type { Wine } from "@/types/wine";

type Section = "wines" | "spirits";

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

/**
 * Riquadro delle Impostazioni: scorta minima, ideale e fornitore su più articoli insieme.
 * La selezione è una sezione (vini o distillati) ristretta da qualche filtro facoltativo.
 */
export function StockSettingsPanel() {
  const { t, lang } = useI18n();
  const ts = t.stock.settings;
  const winesQuery = useWines(DEFAULT_WINES_COLLECTION);
  const spiritsQuery = useWines(SPIRITS_COLLECTION);
  const isLoading = winesQuery.isLoading || spiritsQuery.isLoading;

  const [section, setSection] = useState<Section>("wines");
  const [type, setType] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [spiritType, setSpiritType] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const all = useMemo(
    () => [...winesQuery.wines, ...spiritsQuery.wines],
    [winesQuery.wines, spiritsQuery.wines]
  );
  const trackedCount = all.filter(isTracked).length;

  const pool = section === "wines" ? winesQuery.wines : spiritsQuery.wines;
  const selected = useMemo<Wine[]>(
    () =>
      section === "wines"
        ? pool.filter(
            (w) =>
              (!type || w.type === type) && (!country || w.country === country) && (!region || w.region === region)
          )
        : pool.filter((w) => !spiritType || (w.spiritType ?? "") === spiritType),
    [pool, section, type, country, region, spiritType]
  );

  const types = useMemo(() => uniqueSorted(winesQuery.wines.map((w) => w.type)), [winesQuery.wines]);
  const countries = useMemo(() => uniqueSorted(winesQuery.wines.map((w) => w.country)), [winesQuery.wines]);
  const regions = useMemo(
    () => uniqueSorted(winesQuery.wines.filter((w) => !country || w.country === country).map((w) => w.region)),
    [winesQuery.wines, country]
  );
  const spiritTypes = useMemo(
    () => uniqueSorted(spiritsQuery.wines.map((w) => w.spiritType ?? "")),
    [spiritsQuery.wines]
  );

  return (
    // id: la dashboard vuota porta direttamente qui (/settings#scorte).
    <section id="scorte" className="mt-8 scroll-mt-6 rounded-xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-base font-semibold text-text">{ts.title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{ts.description}</p>

      <p className="mt-4 text-sm text-neutral-700">
        {isLoading
          ? t.common.loading
          : ts.tracked(<strong key="tracked">{trackedCount}</strong>, <strong key="total">{all.length}</strong>)}
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{ts.section}</div>
          <div role="radiogroup" aria-label={ts.section} className="inline-flex rounded-lg border border-line bg-canvas p-1">
            {(["wines", "spirits"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={section === s}
                onClick={() => setSection(s)}
                className={clsx(
                  "inline-flex h-8 items-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                  section === s ? "bg-accent text-white shadow-sm" : "text-neutral-600 hover:text-text"
                )}
              >
                {ts[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{ts.filters}</div>
          <div className="flex flex-wrap gap-2">
            {section === "wines" ? (
              <>
                <FilterSelect
                  value={type}
                  onChange={setType}
                  placeholder={t.wines.col.type}
                  options={types.map((v) => ({ value: v, label: wineTypeLabel(v, lang) }))}
                />
                <FilterSelect
                  value={country}
                  onChange={(next) => {
                    setCountry(next);
                    setRegion("");
                  }}
                  placeholder={t.wines.col.country}
                  options={countries.map((v) => ({ value: v, label: countryLabel(v, lang) }))}
                />
                <FilterSelect
                  value={region}
                  onChange={setRegion}
                  placeholder={t.wines.col.region}
                  options={regions.map((v) => ({ value: v, label: v }))}
                />
              </>
            ) : (
              <FilterSelect
                value={spiritType}
                onChange={setSpiritType}
                placeholder={t.spirits.col.type}
                options={spiritTypes.map((v) => ({ value: v, label: v }))}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          className="gap-2"
          onClick={() => setDialogOpen(true)}
          disabled={isLoading || selected.length === 0}
        >
          <Boxes className="size-4" strokeWidth={2} aria-hidden />
          {ts.open}
        </Button>
        <span className="text-sm text-neutral-600">{isLoading ? "" : ts.selected(selected.length)}</span>
      </div>

      {dialogOpen ? <BulkStockDialog items={selected} onClose={() => setDialogOpen(false)} /> : null}
    </section>
  );
}

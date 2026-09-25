import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { nextSort, type SortState } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type Props<K extends string> = {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSortChange: (sort: SortState<K>) => void;
  align?: "left" | "right" | "center";
  className?: string;
};

/**
 * Intestazione di colonna cliccabile: crescente → decrescente → ordine predefinito.
 * La freccia indica la colonna attiva; sulle altre compare al passaggio del mouse.
 * Nelle colonne allineate a destra la freccia sta a sinistra, così le etichette restano allineate.
 */
export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSortChange,
  align = "left",
  className
}: Props<K>) {
  const { t } = useI18n();
  const active = sort?.key === sortKey ? sort.dir : null;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      className={className}
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
    >
      <button
        type="button"
        onClick={() => onSortChange(nextSort(sort, sortKey))}
        title={t.common.sortBy(label)}
        className={cn(
          "group inline-flex w-full items-center gap-1 whitespace-nowrap uppercase tracking-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm",
          align === "right" && "flex-row-reverse",
          align === "center" && "justify-center"
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            "size-3 shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60"
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
    </th>
  );
}

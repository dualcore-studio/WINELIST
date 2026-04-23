"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectProps = {
  id?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Se true, il valore digitato viene accettato anche se non è nell'elenco. */
  allowCustom?: boolean;
  /** Etichetta mostrata in lista (e a tendina chiusa se diversa dal valore grezzo). */
  getOptionLabel?: (value: string) => string;
  className?: string;
  "aria-required"?: boolean;
  "aria-labelledby"?: string;
};

export function SearchableSelect({
  id: idProp,
  value,
  options,
  onChange,
  placeholder = "Cerca o seleziona…",
  disabled = false,
  allowCustom = false,
  getOptionLabel,
  className,
  "aria-required": ariaRequired,
  "aria-labelledby": ariaLabelledBy
}: SearchableSelectProps) {
  const autoId = useId();
  const baseId = idProp ?? autoId;
  const listId = `${baseId}-listbox`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreNextBlurRef = useRef(false);

  const optionLabel = useCallback(
    (v: string) => (getOptionLabel ? getOptionLabel(v) : v),
    [getOptionLabel]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter(
      (o) =>
        o.toLowerCase().includes(q) || optionLabel(o).toLowerCase().includes(q)
    );
  }, [options, search, optionLabel]);

  useEffect(() => {
    if (!open) setSearch(value);
  }, [value, open]);

  useEffect(() => {
    if (open) setHighlight(0);
  }, [open, search, options]);

  const pickOption = useCallback(
    (next: string) => {
      onChange(next);
      setSearch(next);
      setOpen(false);
    },
    [onChange]
  );

  const commitFromInput = useCallback(() => {
    const q = search.trim();
    if (allowCustom) {
      onChange(q);
      setSearch(q);
      setOpen(false);
      return;
    }
    const byExact = options.find(
      (o) =>
        o.toLowerCase() === q.toLowerCase() ||
        optionLabel(o).toLowerCase() === q.toLowerCase()
    );
    if (byExact) {
      pickOption(byExact);
      return;
    }
    if (filtered.length === 1) {
      pickOption(filtered[0]);
      return;
    }
    setSearch(value);
    setOpen(false);
  }, [allowCustom, filtered, onChange, optionLabel, options, pickOption, search, value]);

  const displayClosed = getOptionLabel ? optionLabel(value) : value ? optionLabel(value) : "";

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      setSearch(value);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setSearch(value);
      setOpen(false);
      return;
    }
    const maxH = Math.max(filtered.length - 1, 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, maxH));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hi = Math.min(highlight, maxH);
      const opt = filtered[hi];
      if (opt) pickOption(opt);
      else commitFromInput();
      return;
    }
    if (e.key === "Tab") {
      const hi = Math.min(highlight, maxH);
      const opt = filtered[hi];
      if (opt) {
        pickOption(opt);
      } else {
        commitFromInput();
      }
    }
  }

  const showList = open && !disabled && (filtered.length > 0 || (allowCustom && search.trim()));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          id={baseId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-required={ariaRequired}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          value={open ? search : displayClosed}
          placeholder={placeholder}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setSearch(value);
          }}
          onBlur={() => {
            if (ignoreNextBlurRef.current) {
              ignoreNextBlurRef.current = false;
              return;
            }
            window.setTimeout(() => {
              if (!containerRef.current?.contains(document.activeElement)) {
                commitFromInput();
              }
            }, 120);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-10 w-full rounded-lg border border-neutral-200 bg-white pr-9 pl-3 text-sm text-text outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200",
            disabled && "cursor-not-allowed opacity-60"
          )}
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt || "__empty__"}
              role="option"
              aria-selected={value === opt}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm text-text",
                i === highlight ? "bg-neutral-100" : "hover:bg-neutral-50"
              )}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                ignoreNextBlurRef.current = true;
              }}
              onClick={() => pickOption(opt)}
            >
              {optionLabel(opt)}
            </li>
          ))}
          {allowCustom && search.trim() && filtered.length === 0 ? (
            <li
              role="option"
              className="cursor-pointer px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              onMouseDown={(e) => {
                e.preventDefault();
                ignoreNextBlurRef.current = true;
              }}
              onClick={() => pickOption(search.trim())}
            >
              Usa &quot;{search.trim()}&quot;
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

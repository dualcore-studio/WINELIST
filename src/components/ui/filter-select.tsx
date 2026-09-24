"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterSelectOption[];
  /** Testo della voce vuota (= nessun filtro), mostrato anche a tendina chiusa. */
  placeholder: string;
  className?: string;
};

/** Tempo entro cui le lettere digitate si sommano nella ricerca rapida (come nelle select native). */
const TYPEAHEAD_RESET_MS = 700;

/**
 * Tendina dei filtri: sostituisce la <select> nativa, la cui lista aperta non si può arrotondare
 * (su Windows resta squadrata). Larga quanto l'opzione più lunga (max 11rem), come la nativa,
 * così scegliere un valore non sposta gli altri filtri. Tastiera: frecce, Invio, Esc, Home/Fine
 * e ricerca digitando le iniziali.
 */
export function FilterSelect({ value, onChange, options, placeholder, className }: Props) {
  const listId = useId();
  const allOptions: FilterSelectOption[] = [{ value: "", label: placeholder }, ...options];
  const selectedIndex = Math.max(
    0,
    allOptions.findIndex((o) => o.value === value)
  );
  const selectedLabel = allOptions[selectedIndex].label;

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(selectedIndex);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Se la lista uscirebbe dal bordo destro della finestra, la si allinea a destra del campo.
  useLayoutEffect(() => {
    if (!open || !rootRef.current || !listRef.current) return;
    const root = rootRef.current.getBoundingClientRect();
    setAlignRight(root.left + listRef.current.offsetWidth > window.innerWidth - 8);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function openList() {
    setHighlight(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(allOptions[index].value);
    setOpen(false);
  }

  function jumpByTyping(key: string) {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > TYPEAHEAD_RESET_MS ? key : t.text + key;
    t.at = now;
    const q = t.text.toLowerCase();
    const found = allOptions.findIndex((o, i) => i > 0 && o.label.toLowerCase().startsWith(q));
    if (found >= 0) {
      setHighlight(found);
      if (!open) onChange(allOptions[found].value);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = allOptions.length - 1;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) return openList();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setHighlight((h) => Math.min(last, Math.max(0, h + step)));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setHighlight(e.key === "Home" ? 0 : last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(highlight);
        else openList();
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) jumpByTyping(e.key);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative max-w-[11rem] flex-none", className)}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-9 w-full items-center rounded-full border bg-white pl-3.5 pr-9 text-left text-[13px] text-text outline-none transition-colors hover:border-neutral-300 focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent-ring",
          open ? "border-accent/40 ring-2 ring-accent-ring" : "border-line"
        )}
      >
        {/* Le etichette invisibili impilate danno al campo la larghezza dell'opzione più lunga. */}
        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
          {allOptions.map((o) => (
            <span
              key={o.value}
              aria-hidden
              className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap"
            >
              {o.label}
            </span>
          ))}
          <span className="col-start-1 row-start-1 truncate">{selectedLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500 transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        hidden={!open}
        className={cn(
          "absolute top-full z-50 mt-1.5 max-h-80 w-max min-w-full max-w-[18rem] overflow-y-auto rounded-[14px] border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(17,17,17,0.12)]",
          alignRight ? "right-0" : "left-0"
        )}
      >
        {allOptions.map((o, i) => {
          const selected = i === selectedIndex;
          return (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected}
              onMouseEnter={() => setHighlight(i)}
              // mousedown: evita che il pulsante perda il focus prima della scelta.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={cn(
                "cursor-pointer truncate rounded-[9px] px-3 py-[7px] text-[13px]",
                selected ? "bg-accent-soft font-semibold text-accent" : "text-text",
                i === highlight && !selected && "bg-canvas"
              )}
            >
              {o.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

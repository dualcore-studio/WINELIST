"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

type ThumbState = { visible: boolean; top: number; height: number; trackTop: number };

const TRACK_BOTTOM_GAP = 6;
const MIN_THUMB = 28;

/**
 * Area di scroll verticale per le tabelle: la scrollbar nativa è nascosta (occuperebbe
 * una colonna esterna alla tabella) e al suo posto una barra sottile è disegnata sopra
 * le righe, sotto l'intestazione sticky (`thead`).
 */
export function TableScrollArea({ children, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);
  const [thumb, setThumb] = useState<ThumbState>({ visible: false, top: 0, height: 0, trackTop: 0 });
  const [dragging, setDragging] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const headerHeight = el.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const trackTop = headerHeight + 4;
    const trackHeight = clientHeight - trackTop - TRACK_BOTTOM_GAP;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 1 || trackHeight <= MIN_THUMB) {
      setThumb((t) => (t.visible ? { ...t, visible: false } : t));
      return;
    }
    const height = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * trackHeight);
    const top = trackTop + (scrollTop / maxScroll) * (trackHeight - height);
    setThumb({ visible: true, top, height, trackTop });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [update]);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startScroll: el.scrollTop };
    setDragging(true);
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const trackHeight = el.clientHeight - thumb.trackTop - TRACK_BOTTOM_GAP;
    const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, trackHeight - thumb.height);
    el.scrollTop = drag.startScroll + (e.clientY - drag.startY) * ratio;
  };

  const onThumbPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div className={cn("group/scroll relative flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        onScroll={update}
        className="table-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch]"
      >
        {children}
      </div>
      {thumb.visible ? (
        <div
          aria-hidden
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          onPointerCancel={onThumbPointerUp}
          className="absolute right-1 z-40 flex w-3 cursor-default touch-none justify-center"
          style={{ top: thumb.top, height: thumb.height }}
        >
          <div
            className={cn(
              "h-full w-1.5 rounded-full bg-neutral-400/60 transition-[width,background-color] duration-150 group-hover/scroll:bg-neutral-500/70",
              dragging ? "w-2 bg-neutral-600/80" : "hover:w-2 hover:bg-neutral-600/80"
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

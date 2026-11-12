"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";

/** Scrollbar styling that matches the dashboard design. */
export const SCROLL_CSS = `
  .chart-scroll{
    scrollbar-width:thin;
    scrollbar-color:#cbd5e1 transparent;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
  }
  .chart-scroll::-webkit-scrollbar{
    width:8px;
    height:8px;
  }
  .chart-scroll::-webkit-scrollbar-track{
    background:transparent;
  }
  .chart-scroll::-webkit-scrollbar-thumb{
    background:#cbd5e1;
    border-radius:8px;
  }
  .chart-scroll::-webkit-scrollbar-thumb:hover{
    background:#94a3b8;
  }
  .chart-scroll:focus-visible{
    outline:2px solid #0ea5e9;
    outline-offset:2px;
    border-radius:8px;
  }
  /* Persistent mode: native bars are hidden (they auto-hide on macOS/iOS/Firefox overlay
     scrolling); scrolling itself still works, and custom always-visible bars are drawn instead. */
  .chart-scroll-persist{
    scrollbar-width:none;
    -ms-overflow-style:none;
  }
  .chart-scroll-persist::-webkit-scrollbar{
    display:none;
    width:0;
    height:0;
  }
`;

const STYLE_ELEMENT_ID = "chart-scroll-styles";

/** Injects the scrollbar CSS into <head> exactly once, no matter how many charts mount. */
function ensureScrollStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ELEMENT_ID;
  el.textContent = SCROLL_CSS;
  document.head.appendChild(el);
}

/**
 * Estimate the pixel width needed to show the longest label without clipping.
 * Used for Y-axis widths and X-axis slot widths so labels are never truncated.
 */
export function estimateLabelWidth(
  labels: string[],
  opts: {
    pxPerChar?: number;
    pad?: number;
    min?: number;
    max?: number;
  } = {},
): number {
  const {
    pxPerChar = 7.6,
    pad = 16,
    min = 0,
    max = 400,
  } = opts;

  const longest = labels.reduce(
    (m, l) => Math.max(m, String(l ?? "").length),
    0,
  );

  return Math.min(
    max,
    Math.max(min, Math.ceil(longest * pxPerChar) + pad),
  );
}

// ─── Always-visible custom scrollbar ──────────────────────────────────────────
const BAR_SIZE = 12;     // track thickness (px)
const MIN_THUMB = 36;    // smallest thumb length (px) so it stays draggable
const KEY_STEP = 40;     // px per arrow-key press

interface Metrics {
  top: number;
  left: number;
  sh: number; // scrollHeight
  ch: number; // clientHeight
  sw: number; // scrollWidth
  cw: number; // clientWidth
}

const EMPTY_METRICS: Metrics = { top: 0, left: 0, sh: 0, ch: 0, sw: 0, cw: 0 };

interface ScrollBarProps {
  orientation: "vertical" | "horizontal";
  metrics: Metrics;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  controlsId: string;
  label: string;
}

/**
 * A track + thumb that is always rendered and stays in sync with the viewport's real
 * scroll position. Supports thumb dragging, track clicks, wheel/trackpad over the track
 * and keyboard (arrows, PageUp/PageDown, Home/End).
 */
function ScrollBar({ orientation, metrics, viewportRef, controlsId, label }: ScrollBarProps) {
  const vertical = orientation === "vertical";
  const client  = vertical ? metrics.ch  : metrics.cw;
  const content = vertical ? metrics.sh  : metrics.sw;
  const pos     = vertical ? metrics.top : metrics.left;

  const range      = Math.max(0, content - client);
  const scrollable = range > 1 && client > 0;
  const thumbLen   = scrollable
    ? Math.min(client, Math.max(MIN_THUMB, Math.round((client * client) / content)))
    : client;
  const travel   = Math.max(0, client - thumbLen);
  const thumbPos = scrollable && travel > 0 ? Math.round((pos / range) * travel) : 0;

  const drag = useRef<{ start: number; startPos: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const current = () => {
    const el = viewportRef.current;
    if (!el) return 0;
    return vertical ? el.scrollTop : el.scrollLeft;
  };

  const scrollToPos = (value: number) => {
    const el = viewportRef.current;
    if (!el) return;
    if (vertical) el.scrollTop = value;
    else el.scrollLeft = value;
  };

  const scrollByAmount = (delta: number, smooth = false) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({
      [vertical ? "top" : "left"]: delta,
      behavior: smooth ? "smooth" : "auto",
    } as ScrollToOptions);
  };

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollable) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: vertical ? e.clientY : e.clientX, startPos: current() };
    setDragging(true);
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || travel <= 0) return;
    const delta = (vertical ? e.clientY : e.clientX) - drag.current.start;
    scrollToPos(drag.current.startPos + (delta / travel) * range);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  // Clicking the empty track pages toward the click, like a native scrollbar.
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollable || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = vertical ? e.clientY - rect.top : e.clientX - rect.left;
    scrollByAmount((offset < thumbPos ? -1 : 1) * client * 0.9, true);
  };

  const onTrackWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el || !scrollable) return;
    el.scrollBy({ top: e.deltaY, left: e.deltaX });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!scrollable) return;
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    const fwd  = vertical ? "ArrowDown" : "ArrowRight";
    switch (e.key) {
      case back:       scrollByAmount(-KEY_STEP); break;
      case fwd:        scrollByAmount(KEY_STEP); break;
      case "PageUp":   scrollByAmount(-client * 0.9, true); break;
      case "PageDown": scrollByAmount(client * 0.9, true); break;
      case "Home":     scrollToPos(0); break;
      case "End":      scrollToPos(range); break;
      default: return;
    }
    e.preventDefault();
  };

  return (
    <div
      role="scrollbar"
      aria-orientation={orientation}
      aria-controls={controlsId}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={scrollable ? Math.round((pos / range) * 100) : 0}
      aria-disabled={!scrollable}
      tabIndex={scrollable ? 0 : -1}
      onPointerDown={onTrackPointerDown}
      onWheel={onTrackWheel}
      onKeyDown={onKeyDown}
      className="relative select-none rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200
        outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      style={{
        gridColumn: vertical ? 2 : 1,
        gridRow:    vertical ? 1 : 2,
        width:      vertical ? BAR_SIZE : undefined,
        height:     vertical ? undefined : BAR_SIZE,
        touchAction: "none",
      }}
    >
      <div
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`absolute rounded-full transition-colors ${
          scrollable
            ? dragging
              ? "bg-slate-600 cursor-grabbing"
              : "bg-slate-400 hover:bg-slate-500 cursor-grab"
            : "bg-slate-200"
        }`}
        style={
          vertical
            ? { left: 1, right: 1, top: thumbPos, height: thumbLen }
            : { top: 1, bottom: 1, left: thumbPos, width: thumbLen }
        }
      />
    </div>
  );
}

interface ScrollableChartProps {
  /** Natural (inner) chart height in px, derived from the dataset. */
  innerHeight: number;

  /** Natural (inner) chart width in px, derived from the dataset (optional). */
  innerWidth?: number;

  /** Never let the inner chart get narrower than this (px). Below it, the viewport scrolls sideways. */
  minInnerWidth?: number;

  /** Viewport height cap (px). When the inner chart is taller, the viewport scrolls vertically. */
  maxHeight?: number;

  ariaLabel?: string;

  /**
   * When true, native scrollbars are hidden and a custom, always-visible scrollbar is drawn
   * inside the chart area. The vertical track is always shown; the horizontal track appears
   * only when the content is actually wider than the viewport. Default: false (unchanged).
   */
  persistentScrollbar?: boolean;

  /** A single Recharts chart element (e.g. <BarChart>). */
  children: React.ReactElement;
}

/**
 * Scrollable chart viewport. The scroll area is the chart viewport only (not the card or page).
 * The inner box has an explicit pixel height, so ResponsiveContainer never measures 0.
 *
 * `min-width: 0` / `max-width: 100%` on the viewport stop a wide inner chart from stretching
 * its CSS-grid parent, so scrolling stays inside the viewport and never widens the card or page.
 */
export default function ScrollableChart({
  innerHeight,
  innerWidth,
  minInnerWidth = 0,
  maxHeight,
  ariaLabel,
  persistentScrollbar = false,
  children,
}: ScrollableChartProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const viewportId = useId();

  const h = Math.max(1, Math.round(innerHeight));
  const w = Math.max(
    minInnerWidth,
    innerWidth ? Math.round(innerWidth) : 0,
  );

  useEffect(() => {
    ensureScrollStyles();
  }, []);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const next: Metrics = {
      top: el.scrollTop,
      left: el.scrollLeft,
      sh: el.scrollHeight,
      ch: el.clientHeight,
      sw: el.scrollWidth,
      cw: el.clientWidth,
    };
    setMetrics(prev =>
      prev.top === next.top && prev.left === next.left &&
      prev.sh === next.sh && prev.ch === next.ch &&
      prev.sw === next.sw && prev.cw === next.cw
        ? prev
        : next,
    );
  }, []);

  // Keep the custom thumbs in sync when the viewport or content is resized / data changes.
  useEffect(() => {
    if (!persistentScrollbar) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [persistentScrollbar, measure, h, w]);

  const viewport = (
    <div
      ref={viewportRef}
      id={viewportId}
      className={persistentScrollbar ? "chart-scroll chart-scroll-persist" : "chart-scroll"}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={persistentScrollbar ? measure : undefined}
      style={{
        gridColumn: persistentScrollbar ? 1 : undefined,
        gridRow: persistentScrollbar ? 1 : undefined,
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        maxHeight: maxHeight ? Math.round(maxHeight) : undefined,
        overflowX: "auto",
        overflowY: "auto",
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: "100%",
          minWidth: w > 0 ? w : undefined,
          height: h,
        }}
      >
        <ResponsiveContainer width="100%" height={h}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (!persistentScrollbar) return viewport;

  const canScrollX = metrics.sw - metrics.cw > 1;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `minmax(0, 1fr) ${BAR_SIZE}px`,
        columnGap: 6,
        rowGap: 6,
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      {viewport}
      <ScrollBar
        orientation="vertical"
        metrics={metrics}
        viewportRef={viewportRef}
        controlsId={viewportId}
        label={ariaLabel ? `${ariaLabel} — vertical scrollbar` : "Vertical scrollbar"}
      />
      {canScrollX && (
        <ScrollBar
          orientation="horizontal"
          metrics={metrics}
          viewportRef={viewportRef}
          controlsId={viewportId}
          label={ariaLabel ? `${ariaLabel} — horizontal scrollbar` : "Horizontal scrollbar"}
        />
      )}
    </div>
  );
}
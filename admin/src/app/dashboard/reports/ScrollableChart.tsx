// Community-Application\admin\src\app\dashboard\reports\ScrollableChart.tsx
"use client";

import React from "react";
import { ResponsiveContainer } from "recharts";

/** Subtle scrollbar styling that matches the dashboard design. */
export const SCROLL_CSS = `
  .chart-scroll{scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;}
  .chart-scroll::-webkit-scrollbar{width:8px;height:8px;}
  .chart-scroll::-webkit-scrollbar-track{background:transparent;}
  .chart-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;}
  .chart-scroll::-webkit-scrollbar-thumb:hover{background:#94a3b8;}
  .chart-scroll:focus-visible{outline:2px solid #0ea5e9;outline-offset:2px;border-radius:8px;}
`;

/**
 * Estimate the pixel width needed to show the longest label without clipping.
 * Used for Y-axis widths and X-axis slot widths so labels are never truncated.
 */
export function estimateLabelWidth(
  labels: string[],
  opts: { pxPerChar?: number; pad?: number; min?: number; max?: number } = {},
): number {
  const { pxPerChar = 7.6, pad = 16, min = 0, max = 400 } = opts;
  const longest = labels.reduce((m, l) => Math.max(m, String(l ?? "").length), 0);
  return Math.min(max, Math.max(min, Math.ceil(longest * pxPerChar) + pad));
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
  /** A single Recharts chart element (e.g. <BarChart>). */
  children: React.ReactElement;
}

/**
 * Scrollable chart viewport. The scroll area is the chart viewport only (not the card or page).
 * The inner box has an explicit pixel height, so ResponsiveContainer never measures 0.
 */
export default function ScrollableChart({
  innerHeight,
  innerWidth,
  minInnerWidth = 0,
  maxHeight,
  ariaLabel,
  children,
}: ScrollableChartProps) {
  const h = Math.max(1, Math.round(innerHeight));
  const w = Math.max(minInnerWidth, innerWidth ? Math.round(innerWidth) : 0);

  return (
    <>
      <style>{SCROLL_CSS}</style>
      <div
        className="chart-scroll"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        style={{
          width: "100%",
          maxHeight: maxHeight ? Math.round(maxHeight) : undefined,
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", minWidth: w > 0 ? w : undefined, height: h }}>
          <ResponsiveContainer width="100%" height={h}>
            {children}
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
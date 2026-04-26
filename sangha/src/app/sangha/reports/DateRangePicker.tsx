//Community-Application\sangha\src\app\sangha\reports\DateRangePicker.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, RotateCcw, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DateRange {
  from: Date | null;
  to:   Date | null;
  /** "last7" | "last30" | "last90" | "thisYear" | "allTime" | "custom" */
  preset: string;
}

// FIX #10: Was an IIFE that captured `new Date()` once at module-load time.
// After midnight the captured dates become stale for the lifetime of the app.
// Replaced with a factory function so callers always get a fresh "now".
export function getDefaultDateRange(): DateRange {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to, preset: "last30" };
}

// Convenience constant kept for backwards-compat with any import that already
// uses DEFAULT_DATE_RANGE as a static value (e.g. initial useState).
// Callers that need a fresh range should switch to getDefaultDateRange().
export const DEFAULT_DATE_RANGE: DateRange = getDefaultDateRange();

// ─── ISO helpers (date-only, local timezone) ──────────────────────────────────
export function toISO(d: Date | null): string | null {
  if (!d) return null;
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromInputVal(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toInputVal(d: Date | null): string {
  if (!d) return "";
  return toISO(d) ?? "";
}

function fmtDisplay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Presets ──────────────────────────────────────────────────────────────────
interface Preset {
  id:    string;
  label: string;
  get:   () => { from: Date; to: Date };
}

const PRESETS: Preset[] = [
  {
    id: "last7", label: "Last 7 days",
    get: () => {
      const to = new Date(), from = new Date();
      from.setDate(from.getDate() - 7);
      return { from, to };
    },
  },
  {
    id: "last30", label: "Last 30 days",
    get: () => {
      const to = new Date(), from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to };
    },
  },
  {
    id: "last90", label: "Last 90 days",
    get: () => {
      const to = new Date(), from = new Date();
      from.setDate(from.getDate() - 90);
      return { from, to };
    },
  },
  {
    id: "thisYear", label: "This year",
    get: () => {
      const to = new Date();
      return { from: new Date(to.getFullYear(), 0, 1), to };
    },
  },
  {
    id: "allTime", label: "All time",
    get: () => ({ from: new Date("2020-01-01"), to: new Date() }),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  value:     DateRange;
  onChange:  (r: DateRange) => void;
  /** If true, reset button returns to a fresh default range */
  showReset?: boolean;
}

export default function DateRangePicker({ value, onChange, showReset = true }: Props) {
  const [open, setOpen]               = useState(false);
  const [customFrom, setCustomFrom]   = useState(toInputVal(value.from));
  const [customTo,   setCustomTo]     = useState(toInputVal(value.to));
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync custom fields when value changes externally
  useEffect(() => {
    setCustomFrom(toInputVal(value.from));
    setCustomTo(toInputVal(value.to));
  }, [value]);

  const applyPreset = (preset: Preset) => {
    const { from, to } = preset.get();
    onChange({ from, to, preset: preset.id });
    setOpen(false);
  };

  const applyCustom = () => {
    const from = fromInputVal(customFrom);
    const to   = fromInputVal(customTo);
    if (from && to && from <= to) {
      onChange({ from, to, preset: "custom" });
      setOpen(false);
    }
  };

  // FIX #10: Reset now uses getDefaultDateRange() so it always resets to
  // today's date rather than the stale module-load timestamp.
  const reset = () => {
    onChange(getDefaultDateRange());
    setOpen(false);
  };

  // Label for trigger button
  const triggerLabel = (() => {
    if (value.preset === "allTime") return "All time";
    if (value.preset === "custom")  return `${fmtDisplay(value.from)} – ${fmtDisplay(value.to)}`;
    return PRESETS.find(p => p.id === value.preset)?.label ?? "Date range";
  })();

  const isDefault = value.preset === "last30";

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm
          ${open
            ? "border-sky-400 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          }`}
      >
        <Calendar className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── Reset badge (shown when non-default) ────────────── */}
      {showReset && !isDefault && (
        <button
          onClick={reset}
          title="Reset to last 30 days"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-sky-500 text-white rounded-full flex items-center justify-center hover:bg-sky-600 transition-colors shadow"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}

      {/* ── Dropdown ─────────────────────────────────────────── */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-72 overflow-hidden">
          {/* Presets */}
          <div className="p-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5">Quick ranges</p>
            <div className="space-y-0.5">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors
                    ${value.preset === preset.id
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <span>{preset.label}</span>
                  {value.preset === preset.id && <Check className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range */}
          <div className="p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1 px-0.5">From</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || toInputVal(new Date())}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1 px-0.5">To</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={toInputVal(new Date())}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none bg-white text-slate-700"
                />
              </div>
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              className="mt-2.5 w-full py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white rounded-xl
                transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply custom range
            </button>
          </div>

          {/* Reset footer */}
          {showReset && !isDefault && (
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to default (last 30 days)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
//Community-Application\admin\src\app\dashboard\reports\DateRangePicker.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";

export interface DateRange {
  from: Date | null;
  to:   Date | null;
  preset?: "last7" | "last30" | "last90" | "thisYear" | "allTime" | "custom";
}

export function toISO(d: Date | null): string | undefined {
  if (!d) return undefined;
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

function toInputVal(d: Date | null): string {
  return toISO(d) ?? "";
}

function fromInputVal(s: string): Date | null {
  if (!s) return null;
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtDisplay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const PRESETS: { label: string; key: NonNullable<DateRange["preset"]>; getRange: () => DateRange }[] = [
  { label: "Last 7 days",  key: "last7",    getRange: () => ({ from: addDays(new Date(), -6),  to: new Date(), preset: "last7"    }) },
  { label: "Last 30 days", key: "last30",   getRange: () => ({ from: addDays(new Date(), -29), to: new Date(), preset: "last30"   }) },
  { label: "Last 90 days", key: "last90",   getRange: () => ({ from: addDays(new Date(), -89), to: new Date(), preset: "last90"   }) },
  { label: "This year",    key: "thisYear", getRange: () => ({ from: startOfYear(),             to: new Date(), preset: "thisYear" }) },
  { label: "All time",     key: "allTime",  getRange: () => ({ from: null, to: null,             preset: "allTime"  }) },
];

interface Props {
  value:    DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open,       setOpen]       = useState(false);
  const [customFrom, setCustomFrom] = useState(toInputVal(value.from));
  const [customTo,   setCustomTo]   = useState(toInputVal(value.to));
  const [hovTrigger, setHovTrigger] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setCustomFrom(toInputVal(value.from));
    setCustomTo(toInputVal(value.to));
  }, [value]);

  const triggerLabel = (() => {
    if (value.preset === "allTime")  return "All time";
    if (value.preset === "last7")    return "Last 7 days";
    if (value.preset === "last30")   return "Last 30 days";
    if (value.preset === "last90")   return "Last 90 days";
    if (value.preset === "thisYear") return "This year";
    if (value.from && value.to)      return `${fmtDisplay(value.from)} – ${fmtDisplay(value.to)}`;
    return "Select range";
  })();

  const applyCustom = () => {
    const from = fromInputVal(customFrom);
    const to   = fromInputVal(customTo);
    if (from && to && from <= to) {
      onChange({ from, to, preset: "custom" });
      setOpen(false);
    }
  };

  const triggerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 12px",
    borderRadius: 12,
    border: open || hovTrigger ? "1px solid #7dd3fc" : "1px solid #e2e8f0",
    background: open || hovTrigger ? "#f0f9ff" : "#ffffff",
    color: open || hovTrigger ? "#0369a1" : "#475569",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    boxShadow: open || hovTrigger ? "0 0 0 3px rgba(125,211,252,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
    whiteSpace: "nowrap",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    zIndex: 9999,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    boxShadow: "0 8px 30px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
    width: 260,
    overflow: "hidden",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(p => !p)}
        onMouseEnter={() => setHovTrigger(true)}
        onMouseLeave={() => setHovTrigger(false)}
        style={triggerStyle}
      >
        <Calendar style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>{triggerLabel}</span>
        <ChevronDown style={{
          width: 13, height: 13, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.18s",
        }} />
      </button>

      {open && (
        <div style={dropdownStyle}>
          {/* Quick presets */}
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "4px 8px", margin: 0,
            }}>
              Quick ranges
            </p>
            {PRESETS.map(p => {
              const isActive = value.preset === p.key;
              return (
                <PresetButton
                  key={p.key}
                  label={p.label}
                  isActive={isActive}
                  onClick={() => { onChange(p.getRange()); setOpen(false); }}
                />
              );
            })}
          </div>

          {/* Custom range */}
          <div style={{ padding: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 8, marginTop: 0,
            }}>
              Custom range
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <DateInput label="From" value={customFrom} max={customTo || toInputVal(new Date())} onChange={setCustomFrom} />
              <DateInput label="To"   value={customTo}   min={customFrom} max={toInputVal(new Date())} onChange={setCustomTo} />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              style={{
                width: "100%",
                padding: "8px 0",
                fontSize: 12,
                fontWeight: 700,
                background: (!customFrom || !customTo || customFrom > customTo) ? "#e2e8f0" : "#0ea5e9",
                color: (!customFrom || !customTo || customFrom > customTo) ? "#94a3b8" : "#ffffff",
                border: "none",
                borderRadius: 10,
                cursor: (!customFrom || !customTo || customFrom > customTo) ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              Apply custom range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PresetButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "7px 10px",
        borderRadius: 10,
        border: "none",
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        background: isActive ? "#f0f9ff" : hov ? "#f8fafc" : "transparent",
        color: isActive ? "#0369a1" : hov ? "#0f172a" : "#475569",
        cursor: "pointer",
        transition: "all 0.12s",
        textAlign: "left",
      }}
    >
      <span>{label}</span>
      {isActive && <Check style={{ width: 13, height: 13, color: "#0ea5e9" }} />}
    </button>
  );
}

function DateInput({
  label, value, min, max, onChange,
}: {
  label: string; value: string; min?: string; max?: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          fontSize: 11,
          padding: "6px 8px",
          border: focused ? "1px solid #7dd3fc" : "1px solid #e2e8f0",
          borderRadius: 8,
          background: "#fff",
          color: "#334155",
          outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(125,211,252,0.2)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
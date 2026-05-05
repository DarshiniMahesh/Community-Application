"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet, Plus, Trash2, Filter, Download, ChevronDown,
  ChevronUp, Search, X, Loader2, AlertCircle, RefreshCw, Check,
  SlidersHorizontal, Eye, Calendar, Users, Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { DateRange, toISO } from "./DateRangePicker";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  sky:        "#0ea5e9",
  skyDark:    "#0284c7",
  skyLight:   "#f0f9ff",
  skyBorder:  "#bae6fd",
  emerald:    "#10b981",
  emeraldLt:  "#f0fdf4",
  emeraldDk:  "#059669",
  emeraldBd:  "#a7f3d0",
  violet:     "#8b5cf6",
  violetLt:   "#f5f3ff",
  violetDk:   "#7c3aed",
  violetBd:   "#ddd6fe",
  amber:      "#f59e0b",
  amberLt:    "#fffbeb",
  amberBd:    "#fde68a",
  rose:       "#ef4444",
  roseLt:     "#fef2f2",
  roseBd:     "#fca5a5",
  orange:     "#f97316",
  orangeLt:   "#fff7ed",
  orangeBd:   "#fed7aa",
  teal:       "#14b8a6",
  tealLt:     "#f0fdfa",
  tealBd:     "#99f6e4",
  indigo:     "#6366f1",
  indigoLt:   "#eef2ff",
  indigoBd:   "#c7d2fe",
  pink:       "#ec4899",
  slate50:    "#f8fafc",
  slate100:   "#f1f5f9",
  slate200:   "#e2e8f0",
  slate300:   "#cbd5e1",
  slate400:   "#94a3b8",
  slate500:   "#64748b",
  slate600:   "#475569",
  slate700:   "#334155",
  slate800:   "#1e293b",
  slate900:   "#0f172a",
  white:      "#ffffff",
  yellow50:   "#fefce8",
  yellowBd:   "#fde047",
};

// ─── Section Definitions ──────────────────────────────────────────────────────
type SectionMode = "user" | "sangha";

export const USER_SECTIONS: {
  id: string; label: string; icon: string; color: string; columns: string[];
}[] = [
  {
    id: "personal-details", label: "Personal Details", icon: "👤",
    color: C.sky,
    columns: [
      "Full Name", "Email", "Phone", "Status", "Gender", "Date of Birth", "Age",
      "Father's Name", "Mother's Name", "Surname in Use", "Surname as per Gotra",
      "Is Married", "Has Disability", "Primary Sangha", "Submitted At", "Reviewed At",
    ],
  },
  {
    id: "religious-details", label: "Religious Details", icon: "🕉️",
    color: C.rose,
    columns: [
      "Gotra", "Pravara", "Kuladevata", "Kuladevata Other",
      "Surname in Use", "Surname as per Gotra",
      "Priest Name", "Priest Location",
      "Upanama General", "Upanama Proper",
      "Demi Gods", "Demi God Other",
      "Ancestral Challenge", "Ancestral Challenge Notes",
    ],
  },
  {
    id: "family-information", label: "Family Information", icon: "👨‍👩‍👧‍👦",
    color: C.emerald,
    columns: [],
  },
  {
    id: "location-information", label: "Location Information", icon: "📍",
    color: C.teal,
    columns: ["Flat/House No", "Building", "Street", "Area", "City", "Taluk", "District", "State", "Pincode", "Country"],
  },
  {
    id: "education-profession", label: "Education & Profession", icon: "🎓",
    color: C.violet,
    columns: [
      "Member Name", "Relation", "Education Level", "Profession Type",
      "Currently Studying", "Currently Working", "Industry", "Languages Known",
    ],
  },
  {
    id: "economic-details", label: "Economic Details", icon: "💰",
    color: C.amber,
    columns: [
      "Self Income", "Family Income",
      "Owns House", "Renting", "Agricultural Land", "Has Car", "Has Two-Wheeler",
      "Fixed Deposits", "Mutual Funds/SIP", "Shares/Demat", "Other Investments",
    ],
  },
  {
    id: "insurance", label: "Insurance", icon: "🛡️",
    color: C.indigo,
    columns: ["Member Name", "Relation", "Health Coverage", "Life Coverage", "Term Coverage", "Konkani Card Coverage"],
  },
  {
    id: "documents", label: "Documents", icon: "📄",
    color: C.teal,
    columns: ["Member Name", "Relation", "Aadhaar", "PAN Card", "Voter ID", "Land Docs", "DL"],
  },
  {
    // Cross-membership: "Which sanghas is this user ALSO a member of?"
    id: "sangha-membership", label: "Sangha Memberships", icon: "🏛️",
    color: C.emerald,
    columns: [],
  },
];

export const SANGHA_SECTIONS: {
  id: string; label: string; icon: string; color: string; columns: string[];
}[] = [
  {
    id: "sangha-details", label: "Sangha Details", icon: "🏛️",
    color: C.violet,
    columns: [
      "Sangha Name", "Email", "Phone", "Status",
      "Description", "Sangha Phone", "Sangha Email",
      "Is Blocked", "Created At",
    ],
  },
  {
    id: "sangha-location", label: "Location", icon: "📍",
    color: C.teal,
    columns: [
      "Address Line 1", "Address Line 2", "Address Line 3",
      "City", "Village/Town", "Taluk", "District", "State", "Pincode",
    ],
  },
  {
    // Sangha's own roster — members added by sangha admin (sangha_members table)
    id: "sangha-members", label: "Sangha Members (Roster)", icon: "👥",
    color: C.emerald,
    columns: [
      "Member Name", "Gender", "Date of Birth", "Age",
      "Member Phone", "Member Email", "Role", "Member Type",
    ],
  },
  {
    // Users (registered profiles) who belong to this sangha as their PRIMARY sangha
    id: "sangha-user-table", label: "User Table", icon: "👤",
    color: C.sky,
    columns: [],
  },
];

const USER_BASE_COLS   = ["Full Name", "Email", "Phone", "Status"];
const SANGHA_BASE_COLS = ["Sangha Name", "Email", "Phone", "Status"];

const FAMILY_SECTION_ID            = "family-information";
const SANGHA_MEMBERSHIP_SECTION_ID = "sangha-membership";
const SANGHA_USER_TABLE_SECTION_ID = "sangha-user-table";

// ─── Family table columns ─────────────────────────────────────────────────────
const FAMILY_COLS = [
  "Owner", "Family Member Name", "Relation", "Date of Birth", "Gender", "Status", "Disability",
  "Health Coverage", "Life Coverage", "Term Coverage", "Konkani Card Coverage",
  "Currently Studying", "Currently Working", "Type of Profession", "Industry",
  "Education Level", "Languages Known",
  "Aadhaar", "PAN Card", "Voter ID", "Land Docs", "DL",
];
const FAMILY_CORE = ["Owner", "Family Member Name", "Relation"];

// ─── Sangha Membership table columns ─────────────────────────────────────────
// Cross-membership: which sanghas is this user ALSO a member of?
const SANGHA_MEMBERSHIP_COLS = [
  "User Full Name", "Gender", "Age", "Member In", "Type of Member",
];
const SANGHA_MEMBERSHIP_CORE = ["User Full Name", "Member In"];

// ─── Sangha User Table columns ────────────────────────────────────────────────
// Users whose PRIMARY sangha is this sangha (from profiles table)
const SANGHA_USER_TABLE_COLS = [
  "Full Name", "Email", "Phone", "Status",
  "Gender", "Date of Birth", "Age",
  "City", "District", "State",
  "Submitted At", "Reviewed At",
];
const SANGHA_USER_TABLE_CORE = ["Full Name", "Status"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TableRow { [key: string]: any; }
interface ColumnFilter { column: string; value: string; }
interface FamilyEntry { profileId: string; label: string; rows: TableRow[]; }
interface SanghaMembershipEntry { profileId: string; label: string; rows: TableRow[]; }
interface SanghaUserTableEntry { sanghaId: string; sanghaName: string; rows: TableRow[]; }

interface Props {
  dateRange: DateRange;
  initSections?: string[];
  initCategory?: string;
  onClearInit?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function downloadExcel(rows: TableRow[], filename: string) {
  const XLSX = await import("xlsx");
  const ws   = XLSX.utils.json_to_sheet(rows);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31).replace(/[/\\?*[\]:]/g, "_"));
  XLSX.writeFile(wb, `${filename.replace(/[^\w\s\-]/g, "_")}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

function getUniqueValues(rows: TableRow[], col: string): string[] {
  const vals = new Set<string>();
  rows.forEach(r => {
    const v = r[col];
    if (v !== undefined && v !== null && v !== "") vals.add(String(v));
  });
  return Array.from(vals).sort();
}

function buildMasterOrder(baseCols: string[], sections: typeof USER_SECTIONS): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  baseCols.forEach(c => { if (!seen.has(c)) { seen.add(c); order.push(c); } });
  sections.forEach(sec => {
    sec.columns.forEach(c => { if (!seen.has(c)) { seen.add(c); order.push(c); } });
  });
  return order;
}

function sortedCols(cols: string[], master: string[]): string[] {
  const indexed = cols.filter(c => master.includes(c));
  const rest    = cols.filter(c => !master.includes(c));
  indexed.sort((a, b) => master.indexOf(a) - master.indexOf(b));
  return [...indexed, ...rest];
}

function fmtDateRange(dateRange: DateRange): string | null {
  if (dateRange.preset === "allTime")  return "All time";
  if (dateRange.preset === "last7")    return "Last 7 days";
  if (dateRange.preset === "last30")   return "Last 30 days";
  if (dateRange.preset === "last90")   return "Last 90 days";
  if (dateRange.preset === "thisYear") return "This year";
  if (dateRange.from && dateRange.to) {
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(dateRange.from)} – ${fmt(dateRange.to)}`;
  }
  return null;
}

function statusColor(val: string): string {
  const s = val.toLowerCase();
  if (s === "approved")               return C.emerald;
  if (s === "rejected")               return C.rose;
  if (s === "submitted")              return C.amber;
  if (s === "draft")                  return C.slate400;
  if (s === "changes_requested")      return C.orange;
  if (s === "pending_approval")       return C.amber;
  return C.slate700;
}

// ─── Portal filter dropdown ───────────────────────────────────────────────────
interface FilterDropdownPortalProps {
  col: string; anchorRect: DOMRect; uniqueVals: string[];
  activeValue?: string; onSelect: (v: string) => void; onClear: () => void; onClose: () => void;
  accent?: string;
}

function FilterDropdownPortal({ col, anchorRect, uniqueVals, activeValue, onSelect, onClear, onClose, accent = C.sky }: FilterDropdownPortalProps) {
  const dropRef     = useRef<HTMLDivElement>(null);
  const spaceBelow  = window.innerHeight - anchorRect.bottom;
  const openAbove   = spaceBelow < 224 && anchorRect.top > 224;

  const style: React.CSSProperties = {
    position: "fixed",
    left:     Math.min(anchorRect.left, window.innerWidth - 210),
    width:    210,
    zIndex:   9999,
    background: C.white,
    border: `1px solid ${C.slate200}`,
    borderRadius: 14,
    boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    padding: 8,
    maxHeight: 220,
    overflowY: "auto",
    ...(openAbove ? { bottom: window.innerHeight - anchorRect.top + 4 } : { top: anchorRect.bottom + 4 }),
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h, true);
    return () => document.removeEventListener("mousedown", h, true);
  }, [onClose]);

  useEffect(() => {
    const h = () => onClose();
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [onClose]);

  return createPortal(
    <div ref={dropRef} style={style}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px 6px" }}>
        Filter: {col}
      </p>
      <FilterDropBtn label="— Clear filter" active={false} onClick={() => { onClear(); onClose(); }} accent={C.slate500} />
      {uniqueVals.slice(0, 50).map(val => (
        <FilterDropBtn key={val} label={val || "(empty)"} active={activeValue === val}
          onClick={() => { onSelect(val); onClose(); }} accent={accent} />
      ))}
      {uniqueVals.length === 0 && (
        <p style={{ fontSize: 11, color: C.slate300, padding: "4px 8px" }}>No values in data</p>
      )}
    </div>,
    document.body
  );
}

function FilterDropBtn({ label, active, onClick, accent }: { label: string; active: boolean; onClick: () => void; accent: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block", width: "100%", textAlign: "left",
        fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        background: active ? C.skyLight : hov ? C.slate100 : "transparent",
        color: active ? accent : hov ? C.slate900 : C.slate600,
        fontWeight: active ? 700 : 500,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Reusable inline-styled button ───────────────────────────────────────────
function Btn({
  onClick, disabled, children, variant = "default", small = false,
}: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode;
  variant?: "emerald" | "violet" | "sky" | "default" | "ghost" | "ghostEmerald"; small?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const map = {
    emerald:      { bg: hov ? C.emeraldDk : C.emerald, color: C.white, border: "none" },
    violet:       { bg: hov ? C.violetDk : C.violet,   color: C.white, border: "none" },
    sky:          { bg: hov ? C.skyDark : C.sky,        color: C.white, border: "none" },
    default:      { bg: hov ? C.slate100 : C.white,     color: C.slate600, border: `1px solid ${C.slate200}` },
    ghost:        { bg: hov ? C.violetLt : "transparent", color: C.violetDk, border: `1px solid ${hov ? C.violetBd : C.slate200}` },
    ghostEmerald: { bg: hov ? C.emeraldLt : "transparent", color: C.emeraldDk, border: `1px solid ${hov ? C.emeraldBd : C.slate200}` },
  };
  const s = map[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "6px 12px" : "8px 16px",
        fontSize: small ? 11 : 13, fontWeight: 600, borderRadius: 10,
        border: s.border, background: s.bg, color: s.color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
        boxShadow: (variant === "emerald" || variant === "violet" || variant === "sky") && !disabled
          ? "0 2px 8px rgba(0,0,0,0.14)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 36, height: 20, borderRadius: 999, position: "relative",
        cursor: "pointer", transition: "background 0.18s",
        background: on ? C.sky : C.slate300, flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 2,
        left: on ? 18 : 2,
        width: 16, height: 16,
        borderRadius: "50%", background: C.white,
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left 0.18s",
      }} />
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      border: `2px solid ${checked ? C.sky : C.slate300}`,
      background: checked ? C.sky : C.white,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s",
    }}>
      {checked && <Check style={{ width: 11, height: 11, color: C.white }} strokeWidth={3} />}
    </div>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: bg, border: `1px solid ${border}`,
      fontSize: 11, fontWeight: 600, color,
    }}>
      {children}
    </span>
  );
}

// ─── Shared table cell for column header ─────────────────────────────────────
function ThCell({
  col, isBase, activeFilter, onFilter, onDelete, filterAccent = C.sky,
}: {
  col: string; isBase: boolean; activeFilter?: string;
  onFilter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: () => void; filterAccent?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 5 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span>{col}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 2, opacity: hov ? 1 : 0, transition: "opacity 0.15s" }}>
        <button onClick={onFilter} style={{ padding: 2, border: "none", background: "none", cursor: "pointer", borderRadius: 4, color: activeFilter ? filterAccent : C.slate400, display: "flex" }}>
          <Filter style={{ width: 11, height: 11 }} />
        </button>
        {!isBase && (
          <button onClick={onDelete} style={{ padding: 2, border: "none", background: "none", cursor: "pointer", borderRadius: 4, color: C.slate400, display: "flex" }}>
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>
      {activeFilter && (
        <span style={{ fontSize: 10, fontWeight: 700, color: filterAccent, background: filterAccent + "18", padding: "1px 6px", borderRadius: 999, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeFilter}
        </span>
      )}
    </div>
  );
}

// ─── ColToggleBtn ─────────────────────────────────────────────────────────────
function ColToggleBtn({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginLeft: 6, flexShrink: 0, background: "none", border: "none", cursor: "pointer",
        color: visible ? (hov ? "#dc2626" : "#f87171") : (hov ? C.emeraldDk : "#34d399"),
        display: "flex", padding: 2,
      }}
    >
      {visible ? <Eye style={{ width: 12, height: 12 }} /> : <Plus style={{ width: 12, height: 12 }} />}
    </button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 20px", color: C.slate400 }}>
      {icon}
      <p style={{ fontSize: 13, fontWeight: 500, color: C.slate400, textAlign: "center" }}>{text}</p>
    </div>
  );
}

// ─── Shared table style tokens ─────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.slate500,
  padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  fontSize: 11, padding: "9px 12px", whiteSpace: "nowrap",
};

// ─── Reusable Sub-table (Family / Sangha Membership / Sangha User Table) ─────
interface SubTableProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  accentLight: string;
  accentBorder: string;
  accentDark: string;
  entries: { profileId: string; label: string; rows: TableRow[] }[];
  loading: boolean;
  error: string | null;
  allRows: TableRow[];
  filteredRows: TableRow[];
  visibleCols: string[];
  allCols: string[];
  coreCols: string[];
  colFilters: ColumnFilter[];
  searchValue: string;
  canLoadAll: boolean;
  loadAllLabel: string;
  onLoadAll: () => void;
  onSearchChange: (v: string) => void;
  onRemoveEntry: (label: string) => void;
  onClearAll: () => void;
  onOpenFilter: (col: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteCol: (col: string) => void;
  onToggleCol: (col: string) => void;
  onRemoveColFilter: (col: string) => void;
  onClearColFilters: () => void;
  onDownload: () => void;
  downloading: boolean;
  tableRef: React.RefObject<HTMLDivElement>;
  maxRows?: number;
  rowHoverColor: string;
}

function SubTable({
  title, icon, accentColor, accentLight, accentBorder, accentDark,
  entries, loading, error, allRows, filteredRows, visibleCols, allCols, coreCols,
  colFilters, searchValue,
  canLoadAll, loadAllLabel, onLoadAll,
  onSearchChange, onRemoveEntry, onClearAll,
  onOpenFilter, onDeleteCol, onToggleCol,
  onRemoveColFilter, onClearColFilters,
  onDownload, downloading, tableRef, maxRows = 1000, rowHoverColor,
}: SubTableProps) {
  const activeFilters = colFilters.filter(f => f.value);
  const [showColPanel, setShowColPanel] = useState(false);

  return (
    <div ref={tableRef} style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.slate200}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${C.slate100}`,
        background: `linear-gradient(135deg, ${accentLight} 0%, ${C.white} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accentLight, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.slate900 }}>{title}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {entries.map(e => (
                <span key={e.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: accentDark, background: accentLight, border: `1px solid ${accentBorder}`, padding: "2px 8px", borderRadius: 999 }}>
                  {e.label}
                  <button onClick={() => onRemoveEntry(e.label)} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, padding: 0, display: "flex" }}>
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
              {loading && <span style={{ fontSize: 10, color: accentColor, fontStyle: "italic" }}>Loading…</span>}
            </div>
          </div>
        </div>
        <button onClick={onClearAll} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: C.slate400, display: "flex" }}>
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.slate100}`, background: C.slate50, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        {canLoadAll && (
          <Btn onClick={onLoadAll} disabled={loading} variant="ghost" small>
            {loading
              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              : <Users style={{ width: 12, height: 12 }} />}
            {loadAllLabel}
          </Btn>
        )}

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.slate400 }} />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: "100%", paddingLeft: 30, paddingRight: searchValue ? 28 : 10,
              paddingTop: 6, paddingBottom: 6, fontSize: 12,
              border: `1px solid ${C.slate200}`, borderRadius: 10,
              outline: "none", background: C.white, color: C.slate700,
              boxSizing: "border-box",
            }}
          />
          {searchValue && (
            <button onClick={() => onSearchChange("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slate400, display: "flex", padding: 0 }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>

        {/* Column visibility toggle panel */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColPanel(p => !p)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", fontSize: 11, fontWeight: 600,
              borderRadius: 10, border: `1px solid ${C.slate200}`,
              background: showColPanel ? accentLight : C.white,
              color: showColPanel ? accentColor : C.slate600,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <SlidersHorizontal style={{ width: 11, height: 11 }} />
            Columns ({visibleCols.length}/{allCols.length})
          </button>
          {showColPanel && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
              background: C.white, border: `1px solid ${C.slate200}`, borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, minWidth: 200, maxHeight: 260, overflowY: "auto",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px 8px" }}>Toggle Columns</p>
              {allCols.map(col => {
                const isCore    = coreCols.includes(col);
                const isVisible = visibleCols.includes(col);
                return (
                  <div key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 7, cursor: isCore ? "default" : "pointer" }}
                    onClick={() => !isCore && onToggleCol(col)}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isVisible ? accentColor : C.slate300}`,
                      background: isVisible ? accentColor : C.white,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isVisible && <Check style={{ width: 9, height: 9, color: C.white }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 11, color: isCore ? C.slate400 : C.slate700, fontStyle: isCore ? "italic" : "normal" }}>{col}</span>
                    {isCore && <span style={{ marginLeft: "auto", fontSize: 9, color: C.slate300 }}>always</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active filters */}
        {activeFilters.map(f => (
          <Pill key={f.column} color={accentDark} bg={accentLight} border={accentBorder}>
            <SlidersHorizontal style={{ width: 10, height: 10 }} />
            <span style={{ maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.column}</span>:
            <strong>{f.value}</strong>
            <button onClick={() => onRemoveColFilter(f.column)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 2, fontWeight: 700 }}>×</button>
          </Pill>
        ))}
        {activeFilters.length > 0 && (
          <button onClick={onClearColFilters} style={{ fontSize: 11, color: C.slate500, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Clear filters
          </button>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, background: C.slate100, padding: "5px 10px", borderRadius: 8 }}>
          {filteredRows.length.toLocaleString()} rows
          {filteredRows.length !== allRows.length && ` of ${allRows.length.toLocaleString()}`}
        </span>

        <Btn onClick={onDownload} disabled={downloading || filteredRows.length === 0} variant="emerald">
          {downloading ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 13, height: 13 }} />}
          Download Excel
        </Btn>
      </div>

      {/* Table body */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
        {loading && allRows.length === 0 && (
          <EmptyState icon={<Loader2 style={{ width: 26, height: 26, color: accentColor, animation: "spin 1s linear infinite" }} />} text={`Loading ${title.toLowerCase()}…`} />
        )}
        {!loading && error && (
          <EmptyState icon={<AlertCircle style={{ width: 28, height: 28, opacity: 0.3 }} />} text={error} />
        )}
        {!loading && !error && allRows.length > 0 && filteredRows.length === 0 && (
          <EmptyState icon={<Search style={{ width: 28, height: 28, opacity: 0.2 }} />} text="No rows match your filters" />
        )}
        {!loading && !error && filteredRows.length > 0 && (
          <>
            <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: `${accentLight}cc`, borderBottom: `1px solid ${accentBorder}` }}>
                  <th style={{ ...thStyle, width: 36, color: C.slate400 }}>#</th>
                  {visibleCols.map(col => {
                    const af     = colFilters.find(f => f.column === col);
                    const isCore = coreCols.includes(col);
                    return (
                      <th key={col} style={thStyle}>
                        <ThCell col={col} isBase={isCore} activeFilter={af?.value}
                          onFilter={e => onOpenFilter(col, e)}
                          onDelete={() => onDeleteCol(col)}
                          filterAccent={accentColor} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, maxRows).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.slate100}`, transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = rowHoverColor}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.white}>
                    <td style={{ ...tdStyle, color: C.slate400, fontFamily: "monospace" }}>{idx + 1}</td>
                    {visibleCols.map(col => {
                      const val  = row[col];
                      const text = val !== undefined && val !== null ? String(val) : "—";
                      let color  = text === "—" ? C.slate300 : C.slate700;
                      let fw: any = 400;
                      if (col === "Status" && val) { color = statusColor(String(val)); fw = 600; }
                      if (col === "Gender") {
                        const g = String(val ?? "").toLowerCase();
                        if (g === "male") color = C.sky;
                        else if (g === "female") color = C.pink;
                      }
                      if (typeof val === "boolean") { color = val ? C.emerald : C.slate400; fw = val ? 600 : 400; }
                      return (
                        <td key={col} style={{ ...tdStyle, color, fontWeight: fw, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length > maxRows && (
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.slate100}`, background: C.amberLt, fontSize: 11, color: C.amber, textAlign: "center", fontWeight: 600 }}>
                Showing first {maxRows.toLocaleString()} rows · Download Excel for all {filteredRows.length.toLocaleString()} rows
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sangha User Table — grouped by sangha with header rows ──────────────────
interface SanghaUserTableProps {
  entries: SanghaUserTableEntry[];
  loading: boolean;
  error: string | null;
  allRows: TableRow[];
  filteredRows: TableRow[];
  visibleCols: string[];
  allCols: string[];
  coreCols: string[];
  colFilters: ColumnFilter[];
  searchValue: string;
  canLoadAll: boolean;
  loadAllLabel: string;
  onLoadAll: () => void;
  onSearchChange: (v: string) => void;
  onRemoveEntry: (sanghaId: string) => void;
  onClearAll: () => void;
  onOpenFilter: (col: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteCol: (col: string) => void;
  onToggleCol: (col: string) => void;
  onRemoveColFilter: (col: string) => void;
  onClearColFilters: () => void;
  onDownload: () => void;
  downloading: boolean;
  tableRef: React.RefObject<HTMLDivElement>;
  maxRows?: number;
}

function SanghaUserTable({
  entries, loading, error, allRows, filteredRows, visibleCols, allCols, coreCols,
  colFilters, searchValue,
  canLoadAll, loadAllLabel, onLoadAll,
  onSearchChange, onRemoveEntry, onClearAll,
  onOpenFilter, onDeleteCol, onToggleCol,
  onRemoveColFilter, onClearColFilters,
  onDownload, downloading, tableRef, maxRows = 1000,
}: SanghaUserTableProps) {
  const activeFilters = colFilters.filter(f => f.value);
  const [showColPanel, setShowColPanel] = useState(false);
  const accentColor  = C.sky;
  const accentLight  = C.skyLight;
  const accentBorder = C.skyBorder;
  const accentDark   = C.skyDark;

  // Group filtered rows by sangha
  const groupedRows = useMemo(() => {
    const groups: { sanghaId: string; sanghaName: string; rows: TableRow[] }[] = [];
    const seenMap = new Map<string, number>();
    filteredRows.forEach(row => {
      const sid   = String(row._sangha_id ?? row["Sangha Name"] ?? "");
      const sname = String(row._sangha_name ?? row["Sangha Name"] ?? "—");
      if (!seenMap.has(sid)) {
        seenMap.set(sid, groups.length);
        groups.push({ sanghaId: sid, sanghaName: sname, rows: [] });
      }
      groups[seenMap.get(sid)!].rows.push(row);
    });
    return groups;
  }, [filteredRows]);

  return (
    <div ref={tableRef} style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.slate200}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${C.slate100}`,
        background: `linear-gradient(135deg, ${accentLight} 0%, ${C.white} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accentLight, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users style={{ width: 18, height: 18, color: accentColor }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.slate900 }}>User Table (by Sangha)</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {entries.map(e => (
                <span key={e.sanghaId} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: accentDark, background: accentLight, border: `1px solid ${accentBorder}`, padding: "2px 8px", borderRadius: 999 }}>
                  {e.sanghaName}
                  <button onClick={() => onRemoveEntry(e.sanghaId)} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, padding: 0, display: "flex" }}>
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
              {loading && <span style={{ fontSize: 10, color: accentColor, fontStyle: "italic" }}>Loading…</span>}
            </div>
          </div>
        </div>
        <button onClick={onClearAll} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: C.slate400, display: "flex" }}>
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.slate100}`, background: C.slate50, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        {canLoadAll && (
          <Btn onClick={onLoadAll} disabled={loading} variant="ghost" small>
            {loading
              ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
              : <Building2 style={{ width: 12, height: 12 }} />}
            {loadAllLabel}
          </Btn>
        )}

        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.slate400 }} />
          <input
            type="text"
            placeholder="Search users…"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: "100%", paddingLeft: 30, paddingRight: searchValue ? 28 : 10,
              paddingTop: 6, paddingBottom: 6, fontSize: 12,
              border: `1px solid ${C.slate200}`, borderRadius: 10,
              outline: "none", background: C.white, color: C.slate700,
              boxSizing: "border-box",
            }}
          />
          {searchValue && (
            <button onClick={() => onSearchChange("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slate400, display: "flex", padding: 0 }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>

        {/* Column visibility toggle panel */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColPanel(p => !p)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", fontSize: 11, fontWeight: 600,
              borderRadius: 10, border: `1px solid ${C.slate200}`,
              background: showColPanel ? accentLight : C.white,
              color: showColPanel ? accentColor : C.slate600,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <SlidersHorizontal style={{ width: 11, height: 11 }} />
            Columns ({visibleCols.length}/{allCols.length})
          </button>
          {showColPanel && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
              background: C.white, border: `1px solid ${C.slate200}`, borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, minWidth: 200, maxHeight: 260, overflowY: "auto",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px 8px" }}>Toggle Columns</p>
              {allCols.map(col => {
                const isCore    = coreCols.includes(col);
                const isVisible = visibleCols.includes(col);
                return (
                  <div key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 7, cursor: isCore ? "default" : "pointer" }}
                    onClick={() => !isCore && onToggleCol(col)}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isVisible ? accentColor : C.slate300}`,
                      background: isVisible ? accentColor : C.white,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isVisible && <Check style={{ width: 9, height: 9, color: C.white }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 11, color: isCore ? C.slate400 : C.slate700, fontStyle: isCore ? "italic" : "normal" }}>{col}</span>
                    {isCore && <span style={{ marginLeft: "auto", fontSize: 9, color: C.slate300 }}>always</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active filters */}
        {activeFilters.map(f => (
          <Pill key={f.column} color={accentDark} bg={accentLight} border={accentBorder}>
            <SlidersHorizontal style={{ width: 10, height: 10 }} />
            <span style={{ maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.column}</span>:
            <strong>{f.value}</strong>
            <button onClick={() => onRemoveColFilter(f.column)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 2, fontWeight: 700 }}>×</button>
          </Pill>
        ))}
        {activeFilters.length > 0 && (
          <button onClick={onClearColFilters} style={{ fontSize: 11, color: C.slate500, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Clear filters
          </button>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, background: C.slate100, padding: "5px 10px", borderRadius: 8 }}>
          {filteredRows.length.toLocaleString()} users
        </span>

        <Btn onClick={onDownload} disabled={downloading || filteredRows.length === 0} variant="emerald">
          {downloading ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 13, height: 13 }} />}
          Download Excel
        </Btn>
      </div>

      {/* Table body */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
        {loading && allRows.length === 0 && (
          <EmptyState icon={<Loader2 style={{ width: 26, height: 26, color: accentColor, animation: "spin 1s linear infinite" }} />} text="Loading user table…" />
        )}
        {!loading && error && (
          <EmptyState icon={<AlertCircle style={{ width: 28, height: 28, opacity: 0.3 }} />} text={error} />
        )}
        {!loading && !error && allRows.length > 0 && filteredRows.length === 0 && (
          <EmptyState icon={<Search style={{ width: 28, height: 28, opacity: 0.2 }} />} text="No rows match your filters" />
        )}
        {!loading && !error && filteredRows.length > 0 && (
          <>
            <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: `${accentLight}cc`, borderBottom: `1px solid ${accentBorder}` }}>
                  <th style={{ ...thStyle, width: 36, color: C.slate400 }}>#</th>
                  {visibleCols.map(col => {
                    const af     = colFilters.find(f => f.column === col);
                    const isCore = coreCols.includes(col);
                    return (
                      <th key={col} style={thStyle}>
                        <ThCell col={col} isBase={isCore} activeFilter={af?.value}
                          onFilter={e => onOpenFilter(col, e)}
                          onDelete={() => onDeleteCol(col)}
                          filterAccent={accentColor} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(group => (
                  <>
                    {/* Sangha header row — spans all columns */}
                    <tr key={`header-${group.sanghaId}`} style={{ background: `${accentLight}`, borderTop: `2px solid ${accentBorder}`, borderBottom: `1px solid ${accentBorder}` }}>
                      <td
                        colSpan={visibleCols.length + 1}
                        style={{
                          padding: "8px 16px",
                          fontSize: 12,
                          fontWeight: 800,
                          color: accentDark,
                          letterSpacing: "0.01em",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Building2 style={{ width: 14, height: 14, color: accentColor }} />
                          {group.sanghaName}
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10, fontWeight: 600,
                            color: accentColor,
                            background: C.white,
                            border: `1px solid ${accentBorder}`,
                            padding: "1px 8px", borderRadius: 999,
                          }}>
                            {group.rows.length} user{group.rows.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {/* User rows for this sangha */}
                    {group.rows.map((row, idx) => (
                      <tr
                        key={`${group.sanghaId}-${idx}`}
                        style={{ borderBottom: `1px solid ${C.slate100}`, transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.skyLight}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.white}
                      >
                        <td style={{ ...tdStyle, color: C.slate400, fontFamily: "monospace" }}>{idx + 1}</td>
                        {visibleCols.map(col => {
                          const val  = row[col];
                          const text = val !== undefined && val !== null ? String(val) : "—";
                          let color  = text === "—" ? C.slate300 : C.slate700;
                          let fw: any = 400;
                          if (col === "Status" && val) { color = statusColor(String(val)); fw = 600; }
                          if (col === "Gender") {
                            const g = String(val ?? "").toLowerCase();
                            if (g === "male") color = C.sky;
                            else if (g === "female") color = C.pink;
                          }
                          if (typeof val === "boolean") { color = val ? C.emerald : C.slate400; fw = val ? 600 : 400; }
                          return (
                            <td key={col} style={{ ...tdStyle, color, fontWeight: fw, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
            {filteredRows.length > maxRows && (
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.slate100}`, background: C.amberLt, fontSize: 11, color: C.amber, textAlign: "center", fontWeight: 600 }}>
                Showing first {maxRows.toLocaleString()} rows · Download Excel for all {filteredRows.length.toLocaleString()} rows
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomReport({ dateRange, initSections = [], initCategory, onClearInit }: Props) {
  const [mode, setMode] = useState<SectionMode>("user");

  const sections    = mode === "user" ? USER_SECTIONS   : SANGHA_SECTIONS;
  const baseCols    = mode === "user" ? USER_BASE_COLS  : SANGHA_BASE_COLS;
  const masterOrder = useMemo(() => buildMasterOrder(baseCols, sections), [mode]); // eslint-disable-line

  // ── Main table state ────────────────────────────────────────────────────
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [visibleColumns,   setVisibleColumns]   = useState<string[]>(baseCols);
  const [columnFilters,    setColumnFilters]     = useState<ColumnFilter[]>([]);
  const [rows,             setRows]             = useState<TableRow[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [downloading,      setDownloading]      = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [sidebarSearch,    setSidebarSearch]    = useState("");
  const [includeAll,       setIncludeAll]       = useState(false);
  const [sectionOpen,      setSectionOpen]      = useState<Record<string, boolean>>({});
  const [openFilter,       setOpenFilter]       = useState<{ col: string; rect: DOMRect } | null>(null);

  // ── Family state ────────────────────────────────────────────────────────
  const [familyEntries,    setFamilyEntries]    = useState<FamilyEntry[]>([]);
  const [familyLoading,    setFamilyLoading]    = useState(false);
  const [familyError,      setFamilyError]      = useState<string | null>(null);
  const [familySearch,     setFamilySearch]     = useState("");
  const [openFamFilter,    setOpenFamFilter]    = useState<{ col: string; rect: DOMRect } | null>(null);
  const [famColFilters,    setFamColFilters]    = useState<ColumnFilter[]>([]);
  const [famDownloading,   setFamDownloading]   = useState(false);
  const [famVisibleCols,   setFamVisibleCols]   = useState<string[]>(FAMILY_COLS);
  const familySectionRef = useRef<HTMLDivElement>(null);

  // ── Sangha Membership state (cross-membership) ──────────────────────────
  const [membershipEntries,    setMembershipEntries]    = useState<SanghaMembershipEntry[]>([]);
  const [membershipLoading,    setMembershipLoading]    = useState(false);
  const [membershipError,      setMembershipError]      = useState<string | null>(null);
  const [membershipSearch,     setMembershipSearch]     = useState("");
  const [openMembershipFilter, setOpenMembershipFilter] = useState<{ col: string; rect: DOMRect } | null>(null);
  const [membershipColFilters, setMembershipColFilters] = useState<ColumnFilter[]>([]);
  const [membershipDownloading,setMembershipDownloading]= useState(false);
  const [membershipVisibleCols,setMembershipVisibleCols]= useState<string[]>(SANGHA_MEMBERSHIP_COLS);
  const membershipSectionRef = useRef<HTMLDivElement>(null);

  // ── Sangha User Table state ─────────────────────────────────────────────
  const [sanghaUserEntries,    setSanghaUserEntries]    = useState<SanghaUserTableEntry[]>([]);
  const [sanghaUserLoading,    setSanghaUserLoading]    = useState(false);
  const [sanghaUserError,      setSanghaUserError]      = useState<string | null>(null);
  const [sanghaUserSearch,     setSanghaUserSearch]     = useState("");
  const [openSanghaUserFilter, setOpenSanghaUserFilter] = useState<{ col: string; rect: DOMRect } | null>(null);
  const [sanghaUserColFilters, setSanghaUserColFilters] = useState<ColumnFilter[]>([]);
  const [sanghaUserDownloading,setSanghaUserDownloading]= useState(false);
  const [sanghaUserVisibleCols,setSanghaUserVisibleCols]= useState<string[]>(SANGHA_USER_TABLE_COLS);
  const sanghaUserTableRef = useRef<HTMLDivElement>(null);

  // ── Apply initSections on mount or when they change ────────────────────
  const initApplied = useRef(false);
  const skipModeReset = useRef(false);

  useEffect(() => {
    if (!initSections || initSections.length === 0) return;

    const targetMode: SectionMode = initCategory === "sangha" ? "sangha" : "user";
    const availableSections = targetMode === "user" ? USER_SECTIONS : SANGHA_SECTIONS;
    const targetBaseCols    = targetMode === "user" ? USER_BASE_COLS : SANGHA_BASE_COLS;
    const targetMasterOrder = buildMasterOrder(targetBaseCols, availableSections);

    const validIds = initSections.filter(id => availableSections.some(s => s.id === id));

    const desired = new Set<string>(targetBaseCols);
    validIds.forEach(sid => {
      if (sid === FAMILY_SECTION_ID || sid === SANGHA_MEMBERSHIP_SECTION_ID || sid === SANGHA_USER_TABLE_SECTION_ID) return;
      availableSections.find(s => s.id === sid)?.columns.forEach(c => desired.add(c));
    });
    const derivedColumns = sortedCols(Array.from(desired), targetMasterOrder);

    skipModeReset.current = true;
    setMode(targetMode);
    setColumnFilters([]);
    setRows([]);
    setSearchQuery("");
    setSectionOpen({});
    setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]);
    setMembershipEntries([]); setMembershipSearch(""); setMembershipColFilters([]);
    setSanghaUserEntries([]); setSanghaUserSearch(""); setSanghaUserColFilters([]);
    setError(null);

    if (validIds.length > 0) {
      setSelectedSections(validIds);
      const openState: Record<string, boolean> = {};
      validIds.forEach(id => { openState[id] = true; });
      setSectionOpen(openState);
    }

    setVisibleColumns(derivedColumns);
    initApplied.current = true;
    onClearInit?.();
  }, [initSections, initCategory]); // eslint-disable-line

  // ── Reset on mode change ────────────────────────────────────────────────
  useEffect(() => {
    if (skipModeReset.current) { skipModeReset.current = false; return; }
    setSelectedSections([]);
    setVisibleColumns(mode === "user" ? USER_BASE_COLS : SANGHA_BASE_COLS);
    setColumnFilters([]); setRows([]); setSearchQuery(""); setSectionOpen({});
    setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]);
    setMembershipEntries([]); setMembershipSearch(""); setMembershipColFilters([]);
    setSanghaUserEntries([]); setSanghaUserSearch(""); setSanghaUserColFilters([]);
    setError(null);
  }, [mode]); // eslint-disable-line

  // ── Sync columns when sections change ───────────────────────────────────
  useEffect(() => {
    const desired = new Set<string>(baseCols);
    selectedSections.forEach(sid => {
      if (sid === FAMILY_SECTION_ID || sid === SANGHA_MEMBERSHIP_SECTION_ID || sid === SANGHA_USER_TABLE_SECTION_ID) return;
      sections.find(s => s.id === sid)?.columns.forEach(c => desired.add(c));
    });
    setVisibleColumns(prev => {
      const kept  = prev.filter(c => desired.has(c));
      const added = Array.from(desired).filter(c => !new Set(kept).has(c));
      return sortedCols([...kept, ...added], masterOrder);
    });
    setColumnFilters(prev => prev.filter(f => desired.has(f.column)));
  }, [selectedSections]); // eslint-disable-line

  // ── Auto-fetch family when section selected and rows available ──────────
  const prevFamilySelected = useRef(false);
  useEffect(() => {
    const isSelected = selectedSections.includes(FAMILY_SECTION_ID);
    if (isSelected && !prevFamilySelected.current && rows.length > 0) {
      const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[];
      if (ids.length > 0) triggerFamilyFetch(ids, `All Visible (${ids.length})`);
    }
    if (!isSelected && prevFamilySelected.current) {
      setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]);
    }
    prevFamilySelected.current = isSelected;
  }, [selectedSections]); // eslint-disable-line

  // ── Auto-fetch membership when section selected and rows available ───────
  const prevMembershipSelected = useRef(false);
  useEffect(() => {
    const isSelected = selectedSections.includes(SANGHA_MEMBERSHIP_SECTION_ID);
    if (isSelected && !prevMembershipSelected.current && rows.length > 0) {
      const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[];
      if (ids.length > 0) triggerMembershipFetch(ids, `All Visible (${ids.length})`);
    }
    if (!isSelected && prevMembershipSelected.current) {
      setMembershipEntries([]); setMembershipSearch(""); setMembershipColFilters([]);
    }
    prevMembershipSelected.current = isSelected;
  }, [selectedSections]); // eslint-disable-line

  // ── Auto-fetch sangha user table when section selected ───────────────────
  const prevSanghaUserSelected = useRef(false);
  useEffect(() => {
    const isSelected = mode === "sangha" && selectedSections.includes(SANGHA_USER_TABLE_SECTION_ID);
    if (isSelected && !prevSanghaUserSelected.current && rows.length > 0) {
      const sanghaIds = [...new Set(
        filteredRowsRef.current.map(r => r._sangha_id).filter(Boolean) as string[]
      )];
      if (sanghaIds.length > 0) triggerSanghaUserFetch(sanghaIds);
    }
    if (!isSelected && prevSanghaUserSelected.current) {
      setSanghaUserEntries([]); setSanghaUserSearch(""); setSanghaUserColFilters([]);
    }
    prevSanghaUserSelected.current = isSelected;
  }, [selectedSections, mode]); // eslint-disable-line

  // ── Fetch main data ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (selectedSections.length === 0) { setRows([]); return; }
    setLoading(true); setError(null);
    try {
      const exportSections = selectedSections.filter(
        s => s !== FAMILY_SECTION_ID && s !== SANGHA_MEMBERSHIP_SECTION_ID && s !== SANGHA_USER_TABLE_SECTION_ID
      );
      const endpoint = mode === "user" ? "/admin/reports/custom/users" : "/admin/reports/custom/sanghas";
      const result = await api.post(endpoint, {
        sections: exportSections.length > 0 ? exportSections : (mode === "user" ? ["personal-details"] : ["sangha-details"]),
        includeAll, includeAllStatuses: includeAll,
        dateFrom: toISO(dateRange.from), dateTo: toISO(dateRange.to),
      });
      setRows(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load report data."); setRows([]);
    } finally { setLoading(false); }
  }, [selectedSections, includeAll, dateRange, mode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-trigger sub-tables after rows load
  const prevRowsLength = useRef(0);
  useEffect(() => {
    if (rows.length > 0 && prevRowsLength.current === 0) {
      if (selectedSections.includes(FAMILY_SECTION_ID) && familyEntries.length === 0) {
        const ids = rows.map(r => r._profile_id).filter(Boolean) as string[];
        if (ids.length > 0) triggerFamilyFetch(ids, `All Visible (${ids.length})`);
      }
      if (selectedSections.includes(SANGHA_MEMBERSHIP_SECTION_ID) && membershipEntries.length === 0) {
        const ids = rows.map(r => r._profile_id).filter(Boolean) as string[];
        if (ids.length > 0) triggerMembershipFetch(ids, `All Visible (${ids.length})`);
      }
      if (mode === "sangha" && selectedSections.includes(SANGHA_USER_TABLE_SECTION_ID) && sanghaUserEntries.length === 0) {
        const sanghaIds = [...new Set(rows.map(r => r._sangha_id).filter(Boolean) as string[])];
        if (sanghaIds.length > 0) triggerSanghaUserFetch(sanghaIds);
      }
    }
    prevRowsLength.current = rows.length;
  }, [rows]); // eslint-disable-line

  // ── Filtered main rows ──────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let r = rows;
    columnFilters.forEach(({ column, value }) => {
      if (!value) return;
      r = r.filter(row => String(row[column] ?? "").toLowerCase() === value.toLowerCase());
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(row => visibleColumns.some(c => String(row[c] ?? "").toLowerCase().includes(q)));
    }
    return r;
  }, [rows, columnFilters, searchQuery, visibleColumns]);

  const filteredRowsRef = useRef(filteredRows);
  useEffect(() => { filteredRowsRef.current = filteredRows; }, [filteredRows]);

  // ── Sangha-aware row numbers ────────────────────────────────────────────
  const rowDisplayNumbers = useMemo(() => {
    if (mode !== "sangha") return filteredRows.map((_, i) => i + 1);
    const sanghaIndexMap = new Map<string, number>();
    let counter = 0;
    return filteredRows.map(row => {
      const key = String(row["Sangha Name"] ?? row["_sangha_id"] ?? "");
      if (!sanghaIndexMap.has(key)) sanghaIndexMap.set(key, ++counter);
      return sanghaIndexMap.get(key)!;
    });
  }, [filteredRows, mode]);

  const isFirstInGroup = useMemo(() => {
    if (mode !== "sangha") return filteredRows.map(() => true);
    const seen = new Set<string>();
    return filteredRows.map(row => {
      const key = String(row["Sangha Name"] ?? row["_sangha_id"] ?? "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredRows, mode]);

  // ── Family fetch ────────────────────────────────────────────────────────
  const triggerFamilyFetch = useCallback(async (profileIds: string[], label: string) => {
    if (!profileIds.length) return;
    setFamilyLoading(true); setFamilyError(null);
    try {
      const result = await api.post("/admin/reports/custom/family-members", { profileIds });
      const newRows = Array.isArray(result) ? result : [];
      setFamilyEntries(prev => {
        const idx = prev.findIndex(e => e.label === label);
        if (idx >= 0) { const u = [...prev]; u[idx] = { profileId: profileIds[0], label, rows: newRows }; return u; }
        return [...prev, { profileId: profileIds[0], label, rows: newRows }];
      });
      setTimeout(() => familySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch { setFamilyError("Failed to load family data."); }
    finally { setFamilyLoading(false); }
  }, []);

  // ── Sangha Membership fetch (cross-membership) ──────────────────────────
  const triggerMembershipFetch = useCallback(async (profileIds: string[], label: string) => {
    if (!profileIds.length) return;
    setMembershipLoading(true); setMembershipError(null);
    try {
      const result = await api.post("/admin/reports/custom/sangha-memberships", { profileIds });
      const newRows = Array.isArray(result) ? result : [];
      setMembershipEntries(prev => {
        const idx = prev.findIndex(e => e.label === label);
        if (idx >= 0) { const u = [...prev]; u[idx] = { profileId: profileIds[0], label, rows: newRows }; return u; }
        return [...prev, { profileId: profileIds[0], label, rows: newRows }];
      });
      setTimeout(() => membershipSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch { setMembershipError("Failed to load sangha membership data."); }
    finally { setMembershipLoading(false); }
  }, []);

  // ── Sangha User Table fetch ─────────────────────────────────────────────
  const triggerSanghaUserFetch = useCallback(async (sanghaIds: string[]) => {
    if (!sanghaIds.length) return;
    setSanghaUserLoading(true); setSanghaUserError(null);
    try {
      const result = await api.post("/admin/reports/custom/sangha-users", { sanghaIds });
      const newRows = Array.isArray(result) ? result : [];
      // Group by sangha
      const groupMap = new Map<string, { sanghaId: string; sanghaName: string; rows: TableRow[] }>();
      newRows.forEach(row => {
        const sid   = String(row._sangha_id ?? "");
        const sname = String(row._sangha_name ?? row["Sangha Name"] ?? "—");
        if (!groupMap.has(sid)) groupMap.set(sid, { sanghaId: sid, sanghaName: sname, rows: [] });
        groupMap.get(sid)!.rows.push(row);
      });
      setSanghaUserEntries(Array.from(groupMap.values()));
      setTimeout(() => sanghaUserTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch { setSanghaUserError("Failed to load sangha user data."); }
    finally { setSanghaUserLoading(false); }
  }, []);

  // ── Combined sub-table rows ─────────────────────────────────────────────
  const allFamilyRows     = useMemo(() => familyEntries.flatMap(e => e.rows),      [familyEntries]);
  const allMembershipRows = useMemo(() => membershipEntries.flatMap(e => e.rows),  [membershipEntries]);
  const allSanghaUserRows = useMemo(() => sanghaUserEntries.flatMap(e => e.rows),  [sanghaUserEntries]);

  const filteredFamilyRows = useMemo(() => {
    let r = allFamilyRows;
    famColFilters.forEach(({ column, value }) => {
      if (!value) return;
      r = r.filter(row => String(row[column] ?? "").toLowerCase() === value.toLowerCase());
    });
    if (familySearch.trim()) {
      const q = familySearch.toLowerCase();
      r = r.filter(row => famVisibleCols.some(c => String(row[c] ?? "").toLowerCase().includes(q)));
    }
    return r;
  }, [allFamilyRows, famColFilters, familySearch, famVisibleCols]);

  const filteredMembershipRows = useMemo(() => {
    let r = allMembershipRows;
    membershipColFilters.forEach(({ column, value }) => {
      if (!value) return;
      r = r.filter(row => String(row[column] ?? "").toLowerCase() === value.toLowerCase());
    });
    if (membershipSearch.trim()) {
      const q = membershipSearch.toLowerCase();
      r = r.filter(row => membershipVisibleCols.some(c => String(row[c] ?? "").toLowerCase().includes(q)));
    }
    return r;
  }, [allMembershipRows, membershipColFilters, membershipSearch, membershipVisibleCols]);

  const filteredSanghaUserRows = useMemo(() => {
    let r = allSanghaUserRows;
    sanghaUserColFilters.forEach(({ column, value }) => {
      if (!value) return;
      r = r.filter(row => String(row[column] ?? "").toLowerCase() === value.toLowerCase());
    });
    if (sanghaUserSearch.trim()) {
      const q = sanghaUserSearch.toLowerCase();
      r = r.filter(row => sanghaUserVisibleCols.some(c => String(row[c] ?? "").toLowerCase().includes(q)));
    }
    return r;
  }, [allSanghaUserRows, sanghaUserColFilters, sanghaUserSearch, sanghaUserVisibleCols]);

  // ── Sidebar search ──────────────────────────────────────────────────────
  const sidebarFiltered = useMemo(() => {
    if (!sidebarSearch.trim()) return sections;
    const q = sidebarSearch.toLowerCase();
    return sections
      .filter(s => s.label.toLowerCase().includes(q) || s.columns.some(c => c.toLowerCase().includes(q)))
      .map(s => ({ ...s, matchedColumns: s.columns.filter(c => c.toLowerCase().includes(q)) }));
  }, [sidebarSearch, sections]);

  // ── Column actions ──────────────────────────────────────────────────────
  const toggleSection    = (id: string) => setSelectedSections(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const deleteColumn     = (col: string) => { if (baseCols.includes(col)) return; setVisibleColumns(p => p.filter(c => c !== col)); };
  const addColumn        = (col: string) => setVisibleColumns(p => sortedCols([...p, col], masterOrder));
  const addFilter        = (col: string, val: string) => setColumnFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeFilter     = (col: string) => setColumnFilters(p => p.filter(f => f.column !== col));

  const addFamFilter     = (col: string, val: string) => setFamColFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeFamFilter  = (col: string) => setFamColFilters(p => p.filter(f => f.column !== col));
  const deleteFamCol     = (col: string) => { if (FAMILY_CORE.includes(col)) return; setFamVisibleCols(p => p.filter(c => c !== col)); setFamColFilters(p => p.filter(f => f.column !== col)); };
  const toggleFamCol     = (col: string) => { if (FAMILY_CORE.includes(col)) return; setFamVisibleCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col]); };

  const addMembershipFilter    = (col: string, val: string) => setMembershipColFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeMembershipFilter = (col: string) => setMembershipColFilters(p => p.filter(f => f.column !== col));
  const deleteMembershipCol    = (col: string) => { if (SANGHA_MEMBERSHIP_CORE.includes(col)) return; setMembershipVisibleCols(p => p.filter(c => c !== col)); setMembershipColFilters(p => p.filter(f => f.column !== col)); };
  const toggleMembershipCol    = (col: string) => { if (SANGHA_MEMBERSHIP_CORE.includes(col)) return; setMembershipVisibleCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col]); };

  const addSanghaUserFilter    = (col: string, val: string) => setSanghaUserColFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeSanghaUserFilter = (col: string) => setSanghaUserColFilters(p => p.filter(f => f.column !== col));
  const deleteSanghaUserCol    = (col: string) => { if (SANGHA_USER_TABLE_CORE.includes(col)) return; setSanghaUserVisibleCols(p => p.filter(c => c !== col)); setSanghaUserColFilters(p => p.filter(f => f.column !== col)); };
  const toggleSanghaUserCol    = (col: string) => { if (SANGHA_USER_TABLE_CORE.includes(col)) return; setSanghaUserVisibleCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col]); };

  // ── Filter open handlers ────────────────────────────────────────────────
  const handleOpenFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFamFilter(null); setOpenMembershipFilter(null); setOpenSanghaUserFilter(null);
    if (openFilter?.col === col) { setOpenFilter(null); return; }
    setOpenFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };
  const handleOpenFamFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFilter(null); setOpenMembershipFilter(null); setOpenSanghaUserFilter(null);
    if (openFamFilter?.col === col) { setOpenFamFilter(null); return; }
    setOpenFamFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };
  const handleOpenMembershipFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFilter(null); setOpenFamFilter(null); setOpenSanghaUserFilter(null);
    if (openMembershipFilter?.col === col) { setOpenMembershipFilter(null); return; }
    setOpenMembershipFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };
  const handleOpenSanghaUserFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFilter(null); setOpenFamFilter(null); setOpenMembershipFilter(null);
    if (openSanghaUserFilter?.col === col) { setOpenSanghaUserFilter(null); return; }
    setOpenSanghaUserFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };

  // ── Downloads ───────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const data = filteredRows.map(r => { const o: TableRow = {}; visibleColumns.forEach(c => { o[c] = r[c] ?? ""; }); return o; });
      await downloadExcel(data, `Admin-${mode}-report`);
    } finally { setDownloading(false); }
  };
  const handleFamDownload = async () => {
    setFamDownloading(true);
    try {
      const data = filteredFamilyRows.map(r => { const o: TableRow = {}; famVisibleCols.forEach(c => { o[c] = r[c] ?? ""; }); return o; });
      await downloadExcel(data, "Admin-family-members");
    } finally { setFamDownloading(false); }
  };
  const handleMembershipDownload = async () => {
    setMembershipDownloading(true);
    try {
      const data = filteredMembershipRows.map(r => { const o: TableRow = {}; membershipVisibleCols.forEach(c => { o[c] = r[c] ?? ""; }); return o; });
      await downloadExcel(data, "Admin-sangha-memberships");
    } finally { setMembershipDownloading(false); }
  };
  const handleSanghaUserDownload = async () => {
    setSanghaUserDownloading(true);
    try {
      const data = filteredSanghaUserRows.map(r => {
        const o: TableRow = { "Sangha Name": r._sangha_name ?? r["Sangha Name"] ?? "" };
        sanghaUserVisibleCols.forEach(c => { o[c] = r[c] ?? ""; });
        return o;
      });
      await downloadExcel(data, "Admin-sangha-users");
    } finally { setSanghaUserDownloading(false); }
  };

  // ── Derived flags ───────────────────────────────────────────────────────
  const activeFilters           = columnFilters.filter(f => f.value);
  const isFamilySelected        = mode === "user" && selectedSections.includes(FAMILY_SECTION_ID);
  const isMembershipSelected    = mode === "user" && selectedSections.includes(SANGHA_MEMBERSHIP_SECTION_ID);
  const isSanghaUserSelected    = mode === "sangha" && selectedSections.includes(SANGHA_USER_TABLE_SECTION_ID);
  const showFamilyTable         = isFamilySelected && (familyEntries.length > 0 || familyLoading || !!familyError);
  const showMembershipTable     = isMembershipSelected && (membershipEntries.length > 0 || membershipLoading || !!membershipError);
  const showSanghaUserTable     = isSanghaUserSelected && (sanghaUserEntries.length > 0 || sanghaUserLoading || !!sanghaUserError);
  const dateLabel               = fmtDateRange(dateRange);

  const sanghaBaseCols = new Set([
    "Sangha Name", "Email", "Phone", "Status",
    "Description", "Sangha Phone", "Sangha Email", "Is Blocked", "Created At",
    "Address Line 1", "Address Line 2", "Address Line 3",
    "City", "Village/Town", "Taluk", "District", "State", "Pincode",
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Mode switcher ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.slate600 }}>Report on:</p>
        <div style={{ display: "flex", gap: 3, padding: 4, background: C.slate100, borderRadius: 12 }}>
          {([
            { id: "user",   label: "Users",   Icon: Users,     accent: C.sky,    accentLt: C.skyLight },
            { id: "sangha", label: "Sanghas", Icon: Building2, accent: C.violet, accentLt: C.violetLt },
          ] as const).map(({ id, label, Icon, accent, accentLt }) => {
            const active = mode === id;
            const [hov, setHov] = useState(false);
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 9, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s",
                  background: active ? C.white : hov ? "rgba(255,255,255,0.5)" : "transparent",
                  color: active ? accent : C.slate500,
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {label}
              </button>
            );
          })}
        </div>

        {selectedSections.length > 0 && initApplied.current && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", borderRadius: 10,
            background: C.skyLight, border: `1px solid ${C.skyBorder}`,
            fontSize: 11, fontWeight: 600, color: C.skyDark,
          }}>
            <Check style={{ width: 12, height: 12 }} />
            {selectedSections.length} section{selectedSections.length > 1 ? "s" : ""} pre-selected from dashboard
          </div>
        )}
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, minHeight: "80vh" }}>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside style={{
          width: 280, flexShrink: 0,
          borderRight: `1px solid ${C.slate200}`,
          background: C.white,
          borderRadius: "16px 0 0 16px",
          overflowY: "auto", maxHeight: "85vh",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.slate100}` }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.slate900, letterSpacing: "-0.01em" }}>Report Builder</p>
            <p style={{ fontSize: 11, color: C.slate400, marginTop: 2, fontWeight: 500 }}>
              {mode === "user" ? "User data sections" : "Sangha data sections"}
            </p>
          </div>

          {/* Sidebar search */}
          <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.slate100}` }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.slate400 }} />
              <input
                type="text"
                placeholder="Search sections & fields…"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 30, paddingRight: sidebarSearch ? 28 : 10,
                  paddingTop: 6, paddingBottom: 6, fontSize: 11,
                  border: `1px solid ${C.slate200}`, borderRadius: 10,
                  outline: "none", background: C.white, color: C.slate700,
                  boxSizing: "border-box",
                }}
              />
              {sidebarSearch && (
                <button onClick={() => setSidebarSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slate400, padding: 0, display: "flex" }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Include all toggle */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.slate100}`, background: C.slate50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle on={includeAll} onToggle={() => setIncludeAll(p => !p)} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.slate700 }}>All Statuses</p>
                <p style={{ fontSize: 10, color: C.slate400 }}>Include draft, pending, rejected</p>
              </div>
            </div>
          </div>

          {/* Section list */}
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {sidebarFiltered.length === 0 && (
              <p style={{ fontSize: 11, color: C.slate400, textAlign: "center", padding: "24px 0" }}>No sections match</p>
            )}
            {sidebarFiltered.map(sec => {
              const isSelected  = selectedSections.includes(sec.id);
              const isOpen      = sectionOpen[sec.id] ?? false;
              const effectOpen  = sidebarSearch ? true : isOpen;
              const colsToShow  = sidebarSearch ? ((sec as any).matchedColumns ?? sec.columns) : sec.columns;

              const isFamSec         = sec.id === FAMILY_SECTION_ID;
              const isMembSec        = sec.id === SANGHA_MEMBERSHIP_SECTION_ID;
              const isSanghaUserSec  = sec.id === SANGHA_USER_TABLE_SECTION_ID;
              const isSanghaMemRoster= sec.id === "sangha-members";
              const isSubTable       = isFamSec || isMembSec || isSanghaUserSec;

              const subColor   = isSanghaUserSec ? C.sky     : C.emerald;
              const subColorLt = isSanghaUserSec ? C.skyLight : C.emeraldLt;
              const subColorBd = isSanghaUserSec ? C.skyBorder : C.emeraldBd;
              const subColorDk = isSanghaUserSec ? C.skyDark  : C.emeraldDk;

              const badgeLabel = isSanghaUserSec
                ? "User Table"
                : isMembSec
                  ? "Cross-Membership Table"
                  : isFamSec
                    ? "Family Table"
                    : null;

              const hintText = isSanghaUserSec
                ? "Loads a grouped table of all registered users (profiles) whose primary sangha is each selected sangha. Each sangha gets a header row followed by its users."
                : isMembSec
                  ? "Shows every sangha this user is also a member of (beyond their primary sangha). A user submits to ONE primary sangha for approval but can be a member of many sanghas."
                  : isFamSec
                    ? "Loads family members for all visible users in a separate table below."
                    : null;

              const rosterHint = isSanghaMemRoster
                ? "Shows the registered members (staff/roster) of each sangha — people added directly by the sangha admin via the sangha portal."
                : null;

              return (
                <div key={sec.id} style={{
                  borderRadius: 12,
                  border: `1px solid ${isSelected ? C.skyBorder : C.slate100}`,
                  background: isSelected ? C.skyLight : C.white,
                  overflow: "hidden", transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
                    <button onClick={() => toggleSection(sec.id)} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <Checkbox checked={isSelected} />
                      <span style={{ fontSize: 14 }}>{sec.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? C.skyDark : C.slate700 }}>{sec.label}</span>
                    </button>
                    {isSubTable && badgeLabel ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: subColorDk, background: subColorLt, border: `1px solid ${subColorBd}`, padding: "2px 8px", borderRadius: 999 }}>
                        {badgeLabel}
                      </span>
                    ) : !sidebarSearch && (
                      <button
                        onClick={() => { if (!isSelected) toggleSection(sec.id); setSectionOpen(p => ({ ...p, [sec.id]: !p[sec.id] })); }}
                        style={{ padding: 4, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: C.slate400, display: "flex" }}
                      >
                        {isOpen ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                      </button>
                    )}
                  </div>

                  {/* Sub-table hint block */}
                  {isSubTable && isSelected && hintText && (
                    <div style={{ padding: "0 12px 10px" }}>
                      <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: subColorLt, border: `1px solid ${subColorBd}` }}>
                        {isSanghaUserSec
                          ? <Building2 style={{ width: 13, height: 13, color: subColor, flexShrink: 0, marginTop: 1 }} />
                          : <Users style={{ width: 13, height: 13, color: subColor, flexShrink: 0, marginTop: 1 }} />
                        }
                        <p style={{ fontSize: 10, color: subColorDk, lineHeight: 1.5 }}>{hintText}</p>
                      </div>
                    </div>
                  )}

                  {/* Sangha-members roster inline hint */}
                  {isSanghaMemRoster && isSelected && rosterHint && (
                    <div style={{ padding: "0 12px 10px" }}>
                      <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.emeraldLt, border: `1px solid ${C.emeraldBd}` }}>
                        <Users style={{ width: 13, height: 13, color: C.emerald, flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 10, color: C.emeraldDk, lineHeight: 1.5 }}>{rosterHint}</p>
                      </div>
                    </div>
                  )}

                  {!isSubTable && effectOpen && (
                    <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
                      {colsToShow.map((col: string) => {
                        const isVisible = visibleColumns.includes(col);
                        const isBase    = baseCols.includes(col);
                        const matched   = sidebarSearch && col.toLowerCase().includes(sidebarSearch.toLowerCase());
                        return (
                          <div key={col} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "4px 8px", borderRadius: 7,
                            border: `1px solid ${matched ? C.yellowBd : C.slate100}`,
                            background: matched ? C.yellow50 : C.white,
                          }}>
                            <span style={{ fontSize: 11, color: C.slate600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col}</span>
                            {isBase ? (
                              <span style={{ fontSize: 10, color: C.slate300, fontStyle: "italic", marginLeft: 6 }}>always</span>
                            ) : (
                              <ColToggleBtn visible={isVisible} onClick={() => isVisible ? deleteColumn(col) : addColumn(col)} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Mode context footer ──────────────────────────────────────── */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.slate100}`, background: C.slate50 }}>
            {mode === "user" ? (
              <div style={{ fontSize: 10, color: C.slate400, lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, color: C.slate500, marginBottom: 4 }}>User Report mode</p>
                <p>• Each row = one registered user</p>
                <p>• <strong>Primary Sangha</strong> = the sangha they submitted to for approval</p>
                <p>• <strong>Sangha Memberships</strong> = other sanghas they are also a member of</p>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: C.slate400, lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, color: C.slate500, marginBottom: 4 }}>Sangha Report mode</p>
                <p>• Each row = one sangha (or one member per sangha if Roster selected)</p>
                <p>• <strong>Sangha Members (Roster)</strong> = staff/members added via sangha portal</p>
                <p>• <strong>User Table</strong> = registered users whose primary sangha is this sangha</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: C.white,
          borderRadius: "0 16px 16px 0",
          border: `1px solid ${C.slate200}`,
          borderLeft: "none",
          overflow: "hidden", maxHeight: "85vh",
        }}>
          {/* Toolbar */}
          <div style={{
            padding: "14px 20px", borderBottom: `1px solid ${C.slate100}`,
            background: C.slate50,
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
          }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.slate400 }} />
              <input
                type="text"
                placeholder="Search table…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 32, paddingRight: searchQuery ? 28 : 10,
                  paddingTop: 7, paddingBottom: 7, fontSize: 12,
                  border: `1px solid ${C.slate200}`, borderRadius: 10,
                  outline: "none", background: C.white, color: C.slate700,
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slate400, display: "flex", padding: 0 }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>

            {dateLabel && (
              <Pill color={C.indigo} bg={C.indigoLt} border={C.indigoBd}>
                <Calendar style={{ width: 10, height: 10 }} />
                {dateLabel}
              </Pill>
            )}

            {activeFilters.map(f => (
              <Pill key={f.column} color={C.skyDark} bg={C.skyLight} border={C.skyBorder}>
                <SlidersHorizontal style={{ width: 10, height: 10 }} />
                <span style={{ maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.column}</span>:
                <strong>{f.value}</strong>
                <button onClick={() => removeFilter(f.column)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 2, fontWeight: 700 }}>×</button>
              </Pill>
            ))}

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, background: C.slate100, padding: "5px 10px", borderRadius: 8 }}>
              {filteredRows.length.toLocaleString()} rows
              {filteredRows.length !== rows.length && ` of ${rows.length.toLocaleString()}`}
            </span>

            <Btn onClick={handleDownload} disabled={downloading || filteredRows.length === 0} variant="emerald">
              {downloading ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 13, height: 13 }} />}
              Download Excel
            </Btn>
          </div>

          {/* States */}
          {selectedSections.length === 0 && (
            <EmptyState icon={<FileSpreadsheet style={{ width: 44, height: 44, opacity: 0.2 }} />} text="Select sections from the sidebar to build your report" />
          )}
          {selectedSections.length > 0 && loading && (
            <EmptyState icon={<Loader2 style={{ width: 28, height: 28, color: C.sky, animation: "spin 1s linear infinite" }} />} text="Loading data…" />
          )}
          {selectedSections.length > 0 && !loading && error && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <AlertCircle style={{ width: 32, height: 32, color: C.slate300 }} />
              <p style={{ fontSize: 13, color: C.slate500 }}>{error}</p>
              <Btn onClick={fetchData} variant="default"><RefreshCw style={{ width: 12, height: 12 }} /> Retry</Btn>
            </div>
          )}

          {/* Table */}
          {selectedSections.length > 0 && !loading && !error && (
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              {filteredRows.length === 0 ? (
                <EmptyState icon={<Search style={{ width: 32, height: 32, opacity: 0.2 }} />} text="No matching records found" />
              ) : (
                <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ background: C.slate50, borderBottom: `1px solid ${C.slate200}` }}>
                      <th style={{ ...thStyle, width: 36, color: C.slate400 }}>#</th>
                      {visibleColumns.map(col => {
                        const af     = columnFilters.find(f => f.column === col);
                        const isBase = baseCols.includes(col);
                        return (
                          <th key={col} style={thStyle}>
                            <ThCell col={col} isBase={isBase} activeFilter={af?.value}
                              onFilter={e => handleOpenFilter(col, e)}
                              onDelete={() => deleteColumn(col)} />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 500).map((row, idx) => {
                      const isFirst       = isFirstInGroup[idx];
                      const sanghaNum     = rowDisplayNumbers[idx];
                      const isLastInGroup = idx === filteredRows.length - 1 || rowDisplayNumbers[idx + 1] !== sanghaNum;

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: isLastInGroup ? `2px solid ${C.slate200}` : `1px solid ${C.slate100}`,
                            transition: "background 0.1s",
                            background: isFirst ? C.white : C.slate50,
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.skyLight}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isFirst ? C.white : C.slate50}
                        >
                          <td style={{
                            ...tdStyle, color: C.slate400, fontFamily: "monospace",
                            fontWeight: isFirst ? 700 : 400,
                            opacity: isFirst ? 1 : 0,
                            borderLeft: isFirst ? `3px solid ${C.violet}` : `3px solid transparent`,
                          }}>
                            {sanghaNum}
                          </td>
                          {visibleColumns.map(col => {
                            const val  = row[col];
                            let text   = val !== undefined && val !== null ? String(val) : "—";
                            let color  = C.slate700;
                            let fw: any = 400;

                            if (col === "Status" && val) { color = statusColor(String(val)); fw = 600; }
                            if (col === "Gender") {
                              const g = String(val ?? "").toLowerCase();
                              if (g === "male") color = C.sky;
                              else if (g === "female") color = C.pink;
                            }
                            if (typeof val === "boolean") { text = val ? "✓ Yes" : "No"; color = val ? C.emerald : C.slate400; fw = val ? 600 : 400; }
                            if (!val && val !== false && val !== 0) color = C.slate300;

                            const isDimmed = mode === "sangha" && !isFirst && sanghaBaseCols.has(col);

                            return (
                              <td key={col} style={{
                                ...tdStyle, color: isDimmed ? C.slate300 : color,
                                fontWeight: fw, maxWidth: 200,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {isDimmed ? "" : text}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {filteredRows.length > 500 && (
                <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.slate100}`, background: C.amberLt, fontSize: 11, color: C.amber, textAlign: "center", fontWeight: 600 }}>
                  Showing first 500 rows · Download Excel for all {filteredRows.length.toLocaleString()} rows
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Family Members Table ────────────────────────────────────────────── */}
      {showFamilyTable && (
        <SubTable
          tableRef={familySectionRef}
          title="Family Members"
          icon={<Users style={{ width: 18, height: 18, color: C.violet }} />}
          accentColor={C.violet}
          accentLight={C.violetLt}
          accentBorder={C.violetBd}
          accentDark={C.violetDk}
          entries={familyEntries}
          loading={familyLoading}
          error={familyError}
          allRows={allFamilyRows}
          filteredRows={filteredFamilyRows}
          visibleCols={famVisibleCols}
          allCols={FAMILY_COLS}
          coreCols={FAMILY_CORE}
          colFilters={famColFilters}
          searchValue={familySearch}
          canLoadAll={true}
          loadAllLabel={`Reload All Visible (${filteredRows.length})`}
          onLoadAll={() => {
            const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[];
            if (ids.length) triggerFamilyFetch(ids, `All Visible (${ids.length})`);
          }}
          onSearchChange={setFamilySearch}
          onRemoveEntry={label => setFamilyEntries(p => p.filter(e => e.label !== label))}
          onClearAll={() => { setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]); }}
          onOpenFilter={handleOpenFamFilter}
          onDeleteCol={deleteFamCol}
          onToggleCol={toggleFamCol}
          onRemoveColFilter={removeFamFilter}
          onClearColFilters={() => setFamColFilters([])}
          onDownload={handleFamDownload}
          downloading={famDownloading}
          maxRows={1000}
          rowHoverColor={`${C.violetLt}88`}
        />
      )}

      {/* ── Sangha Memberships Table (Cross-membership) ─────────────────────── */}
      {showMembershipTable && (
        <SubTable
          tableRef={membershipSectionRef}
          title="Sangha Memberships (Cross-membership)"
          icon={<Building2 style={{ width: 18, height: 18, color: C.emerald }} />}
          accentColor={C.emerald}
          accentLight={C.emeraldLt}
          accentBorder={C.emeraldBd}
          accentDark={C.emeraldDk}
          entries={membershipEntries}
          loading={membershipLoading}
          error={membershipError}
          allRows={allMembershipRows}
          filteredRows={filteredMembershipRows}
          visibleCols={membershipVisibleCols}
          allCols={SANGHA_MEMBERSHIP_COLS}
          coreCols={SANGHA_MEMBERSHIP_CORE}
          colFilters={membershipColFilters}
          searchValue={membershipSearch}
          canLoadAll={true}
          loadAllLabel={`Reload All Visible (${filteredRows.length})`}
          onLoadAll={() => {
            const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[];
            if (ids.length) triggerMembershipFetch(ids, `All Visible (${ids.length})`);
          }}
          onSearchChange={setMembershipSearch}
          onRemoveEntry={label => setMembershipEntries(p => p.filter(e => e.label !== label))}
          onClearAll={() => { setMembershipEntries([]); setMembershipSearch(""); setMembershipColFilters([]); }}
          onOpenFilter={handleOpenMembershipFilter}
          onDeleteCol={deleteMembershipCol}
          onToggleCol={toggleMembershipCol}
          onRemoveColFilter={removeMembershipFilter}
          onClearColFilters={() => setMembershipColFilters([])}
          onDownload={handleMembershipDownload}
          downloading={membershipDownloading}
          maxRows={1000}
          rowHoverColor={`${C.emeraldLt}88`}
        />
      )}

      {/* ── Sangha User Table ───────────────────────────────────────────────── */}
      {showSanghaUserTable && (
        <SanghaUserTable
          tableRef={sanghaUserTableRef}
          entries={sanghaUserEntries}
          loading={sanghaUserLoading}
          error={sanghaUserError}
          allRows={allSanghaUserRows}
          filteredRows={filteredSanghaUserRows}
          visibleCols={sanghaUserVisibleCols}
          allCols={SANGHA_USER_TABLE_COLS}
          coreCols={SANGHA_USER_TABLE_CORE}
          colFilters={sanghaUserColFilters}
          searchValue={sanghaUserSearch}
          canLoadAll={true}
          loadAllLabel={`Reload All Sanghas (${rows.length})`}
          onLoadAll={() => {
            const sanghaIds = [...new Set(
              filteredRowsRef.current.map(r => r._sangha_id).filter(Boolean) as string[]
            )];
            if (sanghaIds.length) triggerSanghaUserFetch(sanghaIds);
          }}
          onSearchChange={setSanghaUserSearch}
          onRemoveEntry={sid => setSanghaUserEntries(p => p.filter(e => e.sanghaId !== sid))}
          onClearAll={() => { setSanghaUserEntries([]); setSanghaUserSearch(""); setSanghaUserColFilters([]); }}
          onOpenFilter={handleOpenSanghaUserFilter}
          onDeleteCol={deleteSanghaUserCol}
          onToggleCol={toggleSanghaUserCol}
          onRemoveColFilter={removeSanghaUserFilter}
          onClearColFilters={() => setSanghaUserColFilters([])}
          onDownload={handleSanghaUserDownload}
          downloading={sanghaUserDownloading}
          maxRows={1000}
        />
      )}

      {/* ── Portal filter dropdowns ─────────────────────────────────────────── */}
      {openFilter && (
        <FilterDropdownPortal
          col={openFilter.col} anchorRect={openFilter.rect}
          uniqueVals={getUniqueValues(rows, openFilter.col)}
          activeValue={columnFilters.find(f => f.column === openFilter.col)?.value}
          onSelect={v => addFilter(openFilter.col, v)}
          onClear={() => removeFilter(openFilter.col)}
          onClose={() => setOpenFilter(null)}
          accent={C.sky}
        />
      )}
      {openFamFilter && (
        <FilterDropdownPortal
          col={openFamFilter.col} anchorRect={openFamFilter.rect}
          uniqueVals={getUniqueValues(allFamilyRows, openFamFilter.col)}
          activeValue={famColFilters.find(f => f.column === openFamFilter.col)?.value}
          onSelect={v => addFamFilter(openFamFilter.col, v)}
          onClear={() => removeFamFilter(openFamFilter.col)}
          onClose={() => setOpenFamFilter(null)}
          accent={C.violet}
        />
      )}
      {openMembershipFilter && (
        <FilterDropdownPortal
          col={openMembershipFilter.col} anchorRect={openMembershipFilter.rect}
          uniqueVals={getUniqueValues(allMembershipRows, openMembershipFilter.col)}
          activeValue={membershipColFilters.find(f => f.column === openMembershipFilter.col)?.value}
          onSelect={v => addMembershipFilter(openMembershipFilter.col, v)}
          onClear={() => removeMembershipFilter(openMembershipFilter.col)}
          onClose={() => setOpenMembershipFilter(null)}
          accent={C.emerald}
        />
      )}
      {openSanghaUserFilter && (
        <FilterDropdownPortal
          col={openSanghaUserFilter.col} anchorRect={openSanghaUserFilter.rect}
          uniqueVals={getUniqueValues(allSanghaUserRows, openSanghaUserFilter.col)}
          activeValue={sanghaUserColFilters.find(f => f.column === openSanghaUserFilter.col)?.value}
          onSelect={v => addSanghaUserFilter(openSanghaUserFilter.col, v)}
          onClear={() => removeSanghaUserFilter(openSanghaUserFilter.col)}
          onClose={() => setOpenSanghaUserFilter(null)}
          accent={C.sky}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
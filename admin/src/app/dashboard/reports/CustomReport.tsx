// Community-Application\admin\src\app\dashboard\reports\CustomReport.tsx
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

// ─── Palette (matches Generaldashboard.tsx) ───────────────────────────────────
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
      "Is Married", "Has Disability", "Submitted At", "Reviewed At",
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
    id: "sangha-membership", label: "Sangha Membership", icon: "🏛️",
    color: C.emerald,
    columns: ["Sangha Name", "Role in Sangha", "Tenure", "Membership Status"],
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
    id: "sangha-members", label: "Sangha Members (Internal)", icon: "👥",
    color: C.emerald,
    columns: [
      "Member Name", "Gender", "Date of Birth", "Phone", "Email",
      "Role", "Member Type",
    ],
  },
];

const USER_BASE_COLS   = ["Full Name", "Email", "Phone", "Status"];
const SANGHA_BASE_COLS = ["Sangha Name", "Email", "Phone", "Status"];
const FAMILY_SECTION_ID = "family-information";

const FAMILY_COLS = [
  "Owner", "Family Member Name", "Relation", "Date of Birth", "Gender", "Status", "Disability",
];
const FAMILY_CORE = ["Owner", "Family Member Name", "Relation"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TableRow { [key: string]: any; }
interface ColumnFilter { column: string; value: string; }
interface FamilyEntry { profileId: string; label: string; rows: TableRow[]; }
interface Props { dateRange: DateRange; }

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

// ─── Status cell color ────────────────────────────────────────────────────────
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
}

function FilterDropdownPortal({ col, anchorRect, uniqueVals, activeValue, onSelect, onClear, onClose }: FilterDropdownPortalProps) {
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
          onClick={() => { onSelect(val); onClose(); }} accent={C.sky} />
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
  variant?: "emerald" | "violet" | "sky" | "default" | "ghost"; small?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const map = {
    emerald: { bg: hov ? C.emeraldDk : C.emerald, color: C.white, border: "none" },
    violet:  { bg: hov ? C.violetDk : C.violet,   color: C.white, border: "none" },
    sky:     { bg: hov ? C.skyDark : C.sky,        color: C.white, border: "none" },
    default: { bg: hov ? C.slate100 : C.white,     color: C.slate600, border: `1px solid ${C.slate200}` },
    ghost:   { bg: hov ? C.violetLt : "transparent", color: C.violetDk, border: `1px solid ${hov ? C.violetBd : C.slate200}` },
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

// ─── Section icon badge ───────────────────────────────────────────────────────
function SectionBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomReport({ dateRange }: Props) {
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
  const [familyEntries,  setFamilyEntries]  = useState<FamilyEntry[]>([]);
  const [familyLoading,  setFamilyLoading]  = useState(false);
  const [familyError,    setFamilyError]    = useState<string | null>(null);
  const [familySearch,   setFamilySearch]   = useState("");
  const [openFamFilter,  setOpenFamFilter]  = useState<{ col: string; rect: DOMRect } | null>(null);
  const [famColFilters,  setFamColFilters]  = useState<ColumnFilter[]>([]);
  const [famDownloading, setFamDownloading] = useState(false);
  const [famVisibleCols, setFamVisibleCols] = useState<string[]>(FAMILY_COLS);
  const familySectionRef = useRef<HTMLDivElement>(null);

  // ── Reset on mode change ────────────────────────────────────────────────
  useEffect(() => {
    setSelectedSections([]);
    setVisibleColumns(mode === "user" ? USER_BASE_COLS : SANGHA_BASE_COLS);
    setColumnFilters([]); setRows([]); setSearchQuery(""); setSectionOpen({});
    setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]); setError(null);
  }, [mode]); // eslint-disable-line

  // ── Sync columns when sections change ───────────────────────────────────
  useEffect(() => {
    const desired = new Set<string>(baseCols);
    selectedSections.forEach(sid => {
      if (sid === FAMILY_SECTION_ID) return;
      sections.find(s => s.id === sid)?.columns.forEach(c => desired.add(c));
    });
    setVisibleColumns(prev => {
      const kept = prev.filter(c => desired.has(c));
      const added = Array.from(desired).filter(c => !new Set(kept).has(c));
      return sortedCols([...kept, ...added], masterOrder);
    });
    setColumnFilters(prev => prev.filter(f => desired.has(f.column)));
  }, [selectedSections]); // eslint-disable-line

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (selectedSections.length === 0) { setRows([]); return; }
    setLoading(true); setError(null);
    try {
      const exportSections = selectedSections.filter(s => s !== FAMILY_SECTION_ID);
      const endpoint = mode === "user" ? "/api/admin/reports/custom/users" : "/api/admin/reports/custom/sanghas";
      const result = await api.post(endpoint, {
        sections: exportSections.length > 0 ? exportSections : ["personal-details"],
        includeAll, includeAllStatuses: includeAll,
        dateFrom: toISO(dateRange.from), dateTo: toISO(dateRange.to),
      });
      setRows(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load report data."); setRows([]);
    } finally { setLoading(false); }
  }, [selectedSections, includeAll, dateRange, mode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered rows ───────────────────────────────────────────────────────
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

  // ── Family fetch ────────────────────────────────────────────────────────
  const triggerFamilyFetch = useCallback(async (profileIds: string[], label: string) => {
    if (!profileIds.length) return;
    setFamilyLoading(true); setFamilyError(null);
    try {
      const result = await api.post("/api/admin/reports/custom/family-members", { profileIds });
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

  const allFamilyRows = useMemo(() => familyEntries.flatMap(e => e.rows), [familyEntries]);

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

  // ── Sidebar search ──────────────────────────────────────────────────────
  const sidebarFiltered = useMemo(() => {
    if (!sidebarSearch.trim()) return sections;
    const q = sidebarSearch.toLowerCase();
    return sections
      .filter(s => s.label.toLowerCase().includes(q) || s.columns.some(c => c.toLowerCase().includes(q)))
      .map(s => ({ ...s, matchedColumns: s.columns.filter(c => c.toLowerCase().includes(q)) }));
  }, [sidebarSearch, sections]);

  // ── Column actions ──────────────────────────────────────────────────────
  const toggleSection  = (id: string) => setSelectedSections(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const deleteColumn   = (col: string) => { if (baseCols.includes(col)) return; setVisibleColumns(p => p.filter(c => c !== col)); };
  const addColumn      = (col: string) => setVisibleColumns(p => sortedCols([...p, col], masterOrder));
  const addFilter      = (col: string, val: string) => setColumnFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeFilter   = (col: string) => setColumnFilters(p => p.filter(f => f.column !== col));
  const addFamFilter   = (col: string, val: string) => setFamColFilters(p => { const e = p.find(f => f.column === col); return e ? p.map(f => f.column === col ? { ...f, value: val } : f) : [...p, { column: col, value: val }]; });
  const removeFamFilter = (col: string) => setFamColFilters(p => p.filter(f => f.column !== col));
  const deleteFamCol   = (col: string) => { if (FAMILY_CORE.includes(col)) return; setFamVisibleCols(p => p.filter(c => c !== col)); setFamColFilters(p => p.filter(f => f.column !== col)); };

  const handleOpenFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFamFilter(null);
    if (openFilter?.col === col) { setOpenFilter(null); return; }
    setOpenFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };
  const handleOpenFamFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); setOpenFilter(null);
    if (openFamFilter?.col === col) { setOpenFamFilter(null); return; }
    setOpenFamFilter({ col, rect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
  };

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

  const activeFilters    = columnFilters.filter(f => f.value);
  const activeFamFilters = famColFilters.filter(f => f.value);
  const isFamilySelected = mode === "user" && selectedSections.includes(FAMILY_SECTION_ID);
  const showFamilyTable  = isFamilySelected && (familyEntries.length > 0 || familyLoading || !!familyError);
  const dateLabel        = fmtDateRange(dateRange);

  // ── Shared card style ───────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: C.white, borderRadius: 16,
    border: `1px solid ${C.slate200}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Mode switcher ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.slate600 }}>Report on:</p>
        <div style={{
          display: "flex", gap: 3, padding: 4,
          background: C.slate100, borderRadius: 12,
        }}>
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
          {/* Header */}
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
              const isSelected = selectedSections.includes(sec.id);
              const isOpen     = sectionOpen[sec.id] ?? false;
              const effectOpen = sidebarSearch ? true : isOpen;
              const colsToShow = sidebarSearch ? ((sec as any).matchedColumns ?? sec.columns) : sec.columns;
              const isFamSec   = sec.id === FAMILY_SECTION_ID;

              return (
                <div key={sec.id} style={{
                  borderRadius: 12,
                  border: `1px solid ${isSelected ? C.skyBorder : C.slate100}`,
                  background: isSelected ? C.skyLight : C.white,
                  overflow: "hidden", transition: "all 0.15s",
                }}>
                  {/* Section header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
                    <button onClick={() => toggleSection(sec.id)} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <Checkbox checked={isSelected} />
                      <span style={{ fontSize: 14 }}>{sec.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? C.skyDark : C.slate700 }}>{sec.label}</span>
                    </button>
                    {isFamSec ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.emerald, background: C.emeraldLt, border: `1px solid ${C.emeraldBd}`, padding: "2px 8px", borderRadius: 999 }}>
                        Family Table
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

                  {/* Family hint */}
                  {isFamSec && isSelected && (
                    <div style={{ padding: "0 12px 10px" }}>
                      <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.emeraldLt, border: `1px solid ${C.emeraldBd}` }}>
                        <Users style={{ width: 13, height: 13, color: C.emerald, flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 10, color: C.emeraldDk, lineHeight: 1.5 }}>
                          Loads family members in a separate table below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Column list */}
                  {!isFamSec && effectOpen && (
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
            {/* Search */}
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

            {/* Date badge */}
            {dateLabel && (
              <Pill color={C.indigo} bg={C.indigoLt} border={C.indigoBd}>
                <Calendar style={{ width: 10, height: 10 }} />
                {dateLabel}
              </Pill>
            )}

            {/* Active filters */}
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
                      {isFamilySelected && (
                        <th style={thStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Users style={{ width: 12, height: 12, color: C.violet }} />
                            <span>Family</span>
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 500).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${C.slate100}`, transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.slate50}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.white}>
                        <td style={{ ...tdStyle, color: C.slate400, fontFamily: "monospace" }}>{idx + 1}</td>
                        {visibleColumns.map(col => {
                          const val = row[col];
                          let text  = val !== undefined && val !== null ? String(val) : "—";
                          let color = C.slate700;
                          let fw: any = 400;
                          if (col === "Status" && val) { color = statusColor(String(val)); fw = 600; }
                          if (col === "Gender") {
                            const g = String(val ?? "").toLowerCase();
                            if (g === "male")   color = C.sky;
                            else if (g === "female") color = C.pink;
                          }
                          if (typeof val === "boolean") { text = val ? "✓ Yes" : "No"; color = val ? C.emerald : C.slate400; fw = val ? 600 : 400; }
                          if (!val && val !== false && val !== 0) color = C.slate300;
                          return (
                            <td key={col} style={{ ...tdStyle, color, fontWeight: fw, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {text}
                            </td>
                          );
                        })}
                        {isFamilySelected && (
                          <td style={tdStyle}>
                            <FamilyViewBtn
                              hasId={!!row._profile_id}
                              loading={familyLoading}
                              onClick={() => { const pid = row._profile_id; const name = String(row[baseCols[0]] || `Row ${idx + 1}`); if (pid) triggerFamilyFetch([String(pid)], name); }}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
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
        <div ref={familySectionRef} style={{ ...card, overflow: "hidden" }}>
          {/* Family header */}
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${C.slate100}`,
            background: `linear-gradient(135deg, ${C.violetLt} 0%, ${C.white} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violetLt, border: `1px solid ${C.violetBd}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users style={{ width: 18, height: 18, color: C.violet }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.slate900 }}>Family Members</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {familyEntries.map(e => (
                    <span key={e.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: C.violetDk, background: C.violetLt, border: `1px solid ${C.violetBd}`, padding: "2px 8px", borderRadius: 999 }}>
                      {e.label}
                      <button onClick={() => setFamilyEntries(p => p.filter(f => f.label !== e.label))} style={{ background: "none", border: "none", cursor: "pointer", color: C.violet, padding: 0, display: "flex" }}>
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </span>
                  ))}
                  {familyLoading && <span style={{ fontSize: 10, color: C.violet, fontStyle: "italic" }}>Loading…</span>}
                </div>
              </div>
            </div>
            <button onClick={() => { setFamilyEntries([]); setFamilySearch(""); setFamColFilters([]); }} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: C.slate400, display: "flex" }}>
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Family toolbar */}
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.slate100}`, background: C.slate50, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <Btn
              onClick={() => { const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[]; if (ids.length) triggerFamilyFetch(ids, `All Visible (${ids.length})`); }}
              disabled={familyLoading || filteredRows.length === 0}
              variant="ghost" small
            >
              {familyLoading ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Users style={{ width: 12, height: 12 }} />}
              Load All Visible ({filteredRows.length})
            </Btn>

            <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.slate400 }} />
              <input
                type="text"
                placeholder="Search family members…"
                value={familySearch}
                onChange={e => setFamilySearch(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 30, paddingRight: 10,
                  paddingTop: 6, paddingBottom: 6, fontSize: 12,
                  border: `1px solid ${C.slate200}`, borderRadius: 10,
                  outline: "none", background: C.white, color: C.slate700,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {activeFamFilters.map(f => (
              <Pill key={f.column} color={C.violetDk} bg={C.violetLt} border={C.violetBd}>
                <span style={{ maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.column}</span>:
                <strong>{f.value}</strong>
                <button onClick={() => removeFamFilter(f.column)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 2, fontWeight: 700 }}>×</button>
              </Pill>
            ))}

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, background: C.slate100, padding: "5px 10px", borderRadius: 8 }}>
              {filteredFamilyRows.length.toLocaleString()} members
            </span>

            <Btn onClick={handleFamDownload} disabled={famDownloading || filteredFamilyRows.length === 0} variant="emerald">
              {famDownloading ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 13, height: 13 }} />}
              Download Excel
            </Btn>
          </div>

          {/* Family table body */}
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh" }}>
            {familyLoading && allFamilyRows.length === 0 && (
              <EmptyState icon={<Loader2 style={{ width: 26, height: 26, color: C.violet, animation: "spin 1s linear infinite" }} />} text="Loading family members…" />
            )}
            {!familyLoading && familyError && (
              <EmptyState icon={<AlertCircle style={{ width: 28, height: 28, opacity: 0.3 }} />} text={familyError} />
            )}
            {!familyLoading && !familyError && filteredFamilyRows.length > 0 && (
              <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: `${C.violetLt}cc`, borderBottom: `1px solid ${C.violetBd}` }}>
                    <th style={{ ...thStyle, width: 36, color: C.slate400 }}>#</th>
                    {famVisibleCols.map(col => {
                      const af     = famColFilters.find(f => f.column === col);
                      const isCore = FAMILY_CORE.includes(col);
                      return (
                        <th key={col} style={thStyle}>
                          <ThCell col={col} isBase={isCore} activeFilter={af?.value}
                            onFilter={e => handleOpenFamFilter(col, e)}
                            onDelete={() => deleteFamCol(col)}
                            filterAccent={C.violet} />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredFamilyRows.slice(0, 1000).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.slate100}`, transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${C.violetLt}44`}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.white}>
                      <td style={{ ...tdStyle, color: C.slate400, fontFamily: "monospace" }}>{idx + 1}</td>
                      {famVisibleCols.map(col => {
                        const val = row[col];
                        const text = val !== undefined && val !== null ? String(val) : "—";
                        return (
                          <td key={col} style={{ ...tdStyle, color: text === "—" ? C.slate300 : C.slate700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!familyLoading && !familyError && allFamilyRows.length > 0 && filteredFamilyRows.length === 0 && (
              <EmptyState icon={<Search style={{ width: 28, height: 28, opacity: 0.2 }} />} text="No members match your filters" />
            )}
          </div>
        </div>
      )}

      {/* Portal filter dropdowns */}
      {openFilter && (
        <FilterDropdownPortal
          col={openFilter.col} anchorRect={openFilter.rect}
          uniqueVals={getUniqueValues(rows, openFilter.col)}
          activeValue={columnFilters.find(f => f.column === openFilter.col)?.value}
          onSelect={v => addFilter(openFilter.col, v)}
          onClear={() => removeFilter(openFilter.col)}
          onClose={() => setOpenFilter(null)}
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
        />
      )}

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Shared table style tokens ─────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#64748b",
  padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  fontSize: 11, padding: "9px 12px", whiteSpace: "nowrap",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 20px", color: "#94a3b8" }}>
      {icon}
      <p style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", textAlign: "center" }}>{text}</p>
    </div>
  );
}

function ColToggleBtn({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginLeft: 6, flexShrink: 0, background: "none", border: "none", cursor: "pointer",
        color: visible ? (hov ? "#dc2626" : "#f87171") : (hov ? "#059669" : "#34d399"),
        display: "flex", padding: 2,
      }}
    >
      {visible ? <Eye style={{ width: 12, height: 12 }} /> : <Plus style={{ width: 12, height: 12 }} />}
    </button>
  );
}

function ThCell({
  col, isBase, activeFilter, onFilter, onDelete, filterAccent = "#0ea5e9",
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
        <button onClick={onFilter} style={{ padding: 2, border: "none", background: "none", cursor: "pointer", borderRadius: 4, color: activeFilter ? filterAccent : "#94a3b8", display: "flex" }}>
          <Filter style={{ width: 11, height: 11 }} />
        </button>
        {!isBase && (
          <button onClick={onDelete} style={{ padding: 2, border: "none", background: "none", cursor: "pointer", borderRadius: 4, color: "#94a3b8", display: "flex" }}>
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

function FamilyViewBtn({ hasId, loading, onClick }: { hasId: boolean; loading: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={!hasId || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
        border: `1px solid ${hasId ? (hov ? "#c4b5fd" : "#ddd6fe") : "#e2e8f0"}`,
        background: hasId ? (hov ? "#f5f3ff" : "#faf5ff") : "#f8fafc",
        color: hasId ? (hov ? "#7c3aed" : "#8b5cf6") : "#cbd5e1",
        cursor: hasId && !loading ? "pointer" : "not-allowed",
        transition: "all 0.15s",
      }}
    >
      <Users style={{ width: 11, height: 11 }} />
      View
    </button>
  );
}
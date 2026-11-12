//Community-Application\sangha\src\app\sangha\reports\CustomReport.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet, Plus, Trash2, Filter, Download, ChevronDown,
  ChevronUp, Search, X, Loader2, AlertCircle, RefreshCw, Check,
  SlidersHorizontal, Eye, Calendar, Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { calculateIndiaAge, formatIndiaDate, indiaDateInputValue } from "@/lib/dateTime";
import type { DateRange } from "./DateRangePicker";
import { toISO } from "./DateRangePicker";

// ─── Section Definitions ──────────────────────────────────────────────────────
export const SECTIONS: {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  columns: string[];
}[] = [
  {
    id: "personal-details",
    label: "Personal Details",
    icon: "👤",
    color: "#0ea5e9",
    bg: "bg-sky-50",
    columns: [
      "Full Name",
      "Email",
      "Phone",
      "Status",
      "Gender",
      "Date of Birth",
      "Age",
      "Marital Status",
    ],
  },
  {
    id: "economic-details",
    label: "Economic Details",
    icon: "💰",
    color: "#f59e0b",
    bg: "bg-amber-50",
    columns: [
      "Self Income (Individual)",
      "Family Income (Annual)",
      "Owns House",
      "Has Agricultural Land",
      "Has 4-Wheeler",
      "Has 2-Wheeler",
      "Renting",
      "Aadhaar",
      "PAN Card",
      "Voter ID",
      "Land Docs",
      "DL",
      "Invests in Fixed Deposits",
      "Invests in Mutual Funds / SIP",
      "Invests in Shares / Demat",
      "Other Investments",
    ],
  },
  {
    id: "insurance-coverage",
    label: "Insurance Coverage",
    icon: "🛡️",
    color: "#6366f1",
    bg: "bg-indigo-50",
    columns: [
      "Health Coverage",
      "Life Coverage",
      "Term Coverage",
      "Konkani Card Coverage",
      "Insured Family Members",
    ],
  },
  {
    id: "education-profession",
    label: "Education & Profession",
    icon: "🎓",
    color: "#8b5cf6",
    bg: "bg-violet-50",
    columns: [
      "Member Name",
      "Education Level",
      "Profession",
      "Currently Studying",
      "Currently Working",
      "Languages Known",
    ],
  },
  {
    id: "family-information",
    label: "Family Information",
    icon: "👨‍👩‍👧‍👦",
    color: "#10b981",
    bg: "bg-emerald-50",
    // No columns rendered in main table — triggers family data fetch instead
    columns: [],
  },
  {
    id: "location-information",
    label: "Location Information",
    icon: "📍",
    color: "#14b8a6",
    bg: "bg-teal-50",
    columns: ["City", "District", "State", "Pincode"],
  },
  {
    id: "religious-details",
    label: "Religious Details",
    icon: "🕉️",
    color: "#f43f5e",
    bg: "bg-rose-50",
    columns: [
      "Gotra",
      "Pravara",
      "Kuladevata",
      "Surname in Use",
      "Surname as per Gotra",
      "Priest Name",
      "Priest Location",
      "Upanama General",
      "Upanama Proper",
      "Demi Gods",
      "Ancestral Challenge",
      "Ancestral Challenge Notes",
      "Common Relative Names",
    ],
  },
];

const BASE_COLUMNS = ["Full Name", "Email", "Phone", "Status"];

// Columns that must never appear in the main table
const EXCLUDED_MAIN_COLUMNS = new Set(["Relation", "Submitted At", "Reviewed At"]);

// Section id constants
const FAMILY_SECTION_ID   = "family-information";
const PERSONAL_SECTION_ID = "personal-details";

// ─── Registration status (backend raw value → display label) ──────────────────
// Only these statuses are supported in reports. Any other value is ignored.
const STATUS_LABELS: Record<string, string> = {
  approved:          "Approved",
  submitted:         "Pending",
  under_review:      "Pending",
  rejected:          "Rejected",
  changes_requested: "Changes Requested",
};

type StatusFilter = "approved" | "pending" | "rejected" | "changes_requested" | "all";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "approved",          label: "Approved" },
  { value: "pending",           label: "Pending" },
  { value: "rejected",          label: "Rejected" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "all",               label: "All Statuses" },
];

// Maps the dashboard "category" (initCategory) to a status filter.
// Non-status categories (e.g. "demographics") keep the default approved-only view.
function statusFromCategory(cat?: string): StatusFilter {
  const c = (cat ?? "").toLowerCase().trim();
  if (c === "all") return "all";
  if (c === "pending" || c === "submitted" || c === "under_review") return "pending";
  if (c === "changes" || c === "changes_requested") return "changes_requested";
  if (c === "rejected") return "rejected";
  return "approved";
}

// ─── Marital status (DB value → display label) ────────────────────────────────
const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single_never_married", label: "Single (Never Married)" },
  { value: "married",              label: "Married" },
  { value: "single_divorced",      label: "Single & Divorced" },
  { value: "single_widowed",       label: "Single & Widowed" },
];
const MARITAL_LABELS: Record<string, string> = Object.fromEntries(
  MARITAL_OPTIONS.map(o => [o.value, o.label])
);

// ─── Age filter ───────────────────────────────────────────────────────────────
type AgePreset = "none" | "18-24" | "25-44" | "45-64" | "custom";
interface AgeRange { min: number | null; max: number | null; }

const AGE_PRESETS: { value: AgePreset; label: string }[] = [
  { value: "none",   label: "All ages" },
  { value: "18-24",  label: "18–24" },
  { value: "25-44",  label: "25–44" },
  { value: "45-64",  label: "45–64" },
  { value: "custom", label: "Custom Range" },
];

function presetToRange(p: AgePreset): AgeRange | null {
  if (p === "18-24") return { min: 18, max: 24 };
  if (p === "25-44") return { min: 25, max: 44 };
  if (p === "45-64") return { min: 45, max: 64 };
  return null;
}

function buildMasterOrder(): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  BASE_COLUMNS.forEach(c => { if (!seen.has(c)) { seen.add(c); order.push(c); } });
  SECTIONS.forEach(sec => {
    sec.columns.forEach(c => {
      if (!seen.has(c) && !BASE_COLUMNS.includes(c) && !EXCLUDED_MAIN_COLUMNS.has(c)) {
        seen.add(c);
        order.push(c);
      }
    });
  });
  return order;
}
const MASTER_COL_ORDER = buildMasterOrder();

// ─── Family Members Table Columns ─────────────────────────────────────────────
const ALL_FAMILY_COLUMNS = [
  "Owner (Registered User)",
  "Family Member Name",
  "Relation",
  "Family Type",
  "Date of Birth",
  "Gender",
  "Status",
  "Disability",
  "Health Coverage",
  "Life Coverage",
  "Term Coverage",
  "Konkani Card Coverage",
  "Degree Name",
  "Type of Degree",
  "University",
  "Start Date",
  "End Date",
  "Certificate",
  "Currently Studying",
  "Currently Working",
  "Type of Profession",
  "Industry / Field",
  "Languages Known",
  "Aadhaar",
  "PAN Card",
  "Voter ID",
  "Land Docs",
  "DL",
];

// Columns that cannot be deleted from the family table
const FAMILY_CORE_COLUMNS = ["Owner (Registered User)", "Family Member Name", "Relation"];

interface TableRow { [key: string]: any; }
interface ColumnFilter { column: string; value: string; }

interface Props {
  initSections:   string[];
  initCategory?:  string;
  onClearInit:    () => void;
  dateRange?:     DateRange;
}

// ─── Portal-based Filter Dropdown ────────────────────────────────────────────
interface FilterDropdownPortalProps {
  col:          string;
  anchorRect:   DOMRect;
  uniqueVals:   string[];
  activeValue?: string;
  onSelect:     (val: string) => void;
  onClear:      () => void;
  onClose:      () => void;
}

function FilterDropdownPortal({
  col, anchorRect, uniqueVals, activeValue, onSelect, onClear, onClose,
}: FilterDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const DROPDOWN_HEIGHT = 220;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openAbove  = spaceBelow < DROPDOWN_HEIGHT + 8 && anchorRect.top > DROPDOWN_HEIGHT;

  const style: React.CSSProperties = {
    position: "fixed",
    left:     Math.min(anchorRect.left, window.innerWidth - 200),
    width:    200,
    zIndex:   9999,
    ...(openAbove
      ? { bottom: window.innerHeight - anchorRect.top + 4 }
      : { top: anchorRect.bottom + 4 }),
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [onClose]);

  return createPortal(
    <div
      ref={dropdownRef}
      style={style}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl p-2 max-h-52 overflow-y-auto"
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
        Filter by {col}
      </p>
      <button
        onClick={() => { onClear(); onClose(); }}
        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-500 font-medium mb-1"
      >
        — Clear filter
      </button>
      {uniqueVals.length === 0 && (
        <p className="text-xs text-slate-300 px-2 py-1">No values in data</p>
      )}
      {uniqueVals.slice(0, 50).map(val => (
        <button
          key={val}
          onClick={() => { onSelect(val); onClose(); }}
          className={`w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-colors truncate ${
            activeValue === val ? "bg-sky-50 text-sky-700 font-semibold" : "text-slate-600"
          }`}
        >
          {val || "(empty)"}
        </button>
      ))}
      {uniqueVals.length > 50 && (
        <p className="text-xs text-slate-400 px-2 py-1">
          +{uniqueVals.length - 50} more — use table search to narrow down
        </p>
      )}
    </div>,
    document.body
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function downloadExcel(rows: any[], filename: string): Promise<void> {
  const XLSX = await import("xlsx");
  const ws   = XLSX.utils.json_to_sheet(rows);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31).replace(/[/\\?*[\]:]/g, "_"));
  XLSX.writeFile(wb, `${filename.replace(/[^\w\s\-]/g, "_")}-${indiaDateInputValue()}.xlsx`);
}

function getUniqueValues(rows: TableRow[], col: string): string[] {
  const vals = new Set<string>();
  rows.forEach(r => {
    const v = r[col];
    if (v !== undefined && v !== null && v !== "") vals.add(String(v));
  });
  return Array.from(vals).sort();
}

function sortedCols(cols: string[]): string[] {
  const indexed = cols.filter(c => MASTER_COL_ORDER.includes(c));
  const rest    = cols.filter(c => !MASTER_COL_ORDER.includes(c));
  indexed.sort((a, b) => MASTER_COL_ORDER.indexOf(a) - MASTER_COL_ORDER.indexOf(b));
  return [...indexed, ...rest];
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return formatIndiaDate(d);
}

// ─── Calculate age from DOB string ────────────────────────────────────────────
function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const age = calculateIndiaAge(dob);
  if (age == null) return "—";
  if (age < 0 || age > 150) return "—";
  return String(age);
}

// ─── Format income values for display ─────────────────────────────────────────
function formatIncome(val: any): string {
  if (!val || val === "null" || val === "undefined") return "—";
  const str = String(val).trim().toLowerCase();
  
  // Handle patterns like "2_3l" → "2-3 Lakh"
  const match = str.match(/^(\d+)_(\d+)l$/);
  if (match) {
    return `${match[1]}-${match[2]} Lakh`;
  }
  
  // Handle patterns like "5l" → "5 Lakh"
  const singleMatch = str.match(/^(\d+)l$/);
  if (singleMatch) {
    return `${singleMatch[1]} Lakh`;
  }
  
  // Handle patterns like "1_2cr" → "1-2 Crore"
  const croreMatch = str.match(/^(\d+)_(\d+)cr$/);
  if (croreMatch) {
    return `${croreMatch[1]}-${croreMatch[2]} Crore`;
  }
  
  // Handle patterns like "5cr" → "5 Crore"
  const singleCroreMatch = str.match(/^(\d+)cr$/);
  if (singleCroreMatch) {
    return `${singleCroreMatch[1]} Crore`;
  }
  
  // Return original if no pattern matches
  return String(val);
}

// ─── Normalize a value for Excel export ───────────────────────────────────────
function normalizeForExcel(val: any, colName?: string): string {
  // Format income columns for Excel
  if (colName && (colName === "Self Income (Individual)" || colName === "Family Income (Annual)")) {
    return formatIncome(val);
  }
  
  if (val === true  || val === "true"  || val === "True")  return "Yes";
  if (val === false || val === "false" || val === "False") return "No";
  if (val === null || val === undefined || val === "")     return "Not Selected";
  return String(val);
}

// ─── Normalize main-table rows coming from the API ────────────────────────────
// • Keeps only supported registration statuses and shows a friendly status label
//   (raw value preserved in _status)
// • Maps the marital_status DB value to its display label
function normalizeRows(data: any[]): TableRow[] {
  const out: TableRow[] = [];
  for (const r of data) {
    const rawStatus = String(r?.Status ?? "").toLowerCase().trim();
    if (!STATUS_LABELS[rawStatus]) continue;
    const rawMarital = String(r?.["Marital Status"] ?? "").toLowerCase().trim();
    out.push({
      ...r,
      _status:          rawStatus,
      Status:           STATUS_LABELS[rawStatus],
      "Marital Status": rawMarital ? (MARITAL_LABELS[rawMarital] ?? r["Marital Status"]) : null,
    });
  }
  return out;
}

// ─── Family cell renderer helper ──────────────────────────────────────────────
function getFamilyCellDisplay(col: string, val: any): { text: string; cls: string } {
  let text = val !== undefined && val !== null ? String(val) : "—";
  let cls  = "text-slate-700";

  if (col === "Status") {
    const s = text.toLowerCase();
    if      (s === "active")      { cls = "text-emerald-700 font-semibold"; }
    else if (s === "passed_away") { text = "Passed Away"; cls = "text-slate-400 font-medium"; }
    else if (s === "unknown")     { cls = "text-amber-600 font-medium"; }
  }
  if (col === "Gender") {
    const g = text.toLowerCase();
    if      (g === "male")   cls = "text-sky-600 font-medium";
    else if (g === "female") cls = "text-pink-600 font-medium";
    else if (val)            cls = "text-slate-500";
  }
  if (col === "Disability") {
    const d = text.toLowerCase();
    if      (d === "yes") cls = "text-rose-600 font-semibold";
    else if (d === "no")  { cls = "text-emerald-600"; }
  }
  if (["Aadhaar", "PAN Card", "Voter ID", "Land Docs", "DL"].includes(col)) {
    const v = text.toLowerCase();
    if      (v === "yes")     cls = "text-emerald-600 font-medium";
    else if (v === "no")      cls = "text-rose-500";
    else if (v === "unknown") cls = "text-slate-400";
  }
  if (col === "Currently Studying" || col === "Currently Working") {
    const v = text.toLowerCase();
    if (v === "true" || v === "yes") { text = "Yes"; cls = "text-emerald-600 font-medium"; }
    else if (v === "false" || v === "no") { text = "No"; cls = "text-slate-400"; }
  }
  if (!val && val !== 0) { text = "—"; cls = "text-slate-300"; }

  return { text, cls };
}

// ─── Family table entry type ───────────────────────────────────────────────────
interface FamilyEntry {
  profileId: string;
  label: string;
  rows: TableRow[];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CustomReport({ initSections, initCategory, onClearInit, dateRange }: Props) {
  // ── Main table state ──────────────────────────────────────────────────────
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns]     = useState<string[]>(BASE_COLUMNS);
  const [columnFilters, setColumnFilters]       = useState<ColumnFilter[]>([]);
  const [rows, setRows]                         = useState<TableRow[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [downloading, setDownloading]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [sidebarSearch, setSidebarSearch]       = useState("");
  const [statusFilter, setStatusFilter]         = useState<StatusFilter>("approved");
  const [sectionOpen, setSectionOpen]           = useState<Record<string, boolean>>({});
  const [openFilter, setOpenFilter]             = useState<{ col: string; rect: DOMRect } | null>(null);

  // ── Personal-details filters (marital status + age) ───────────────────────
  const [maritalFilter, setMaritalFilter]       = useState<string>("");
  const [agePreset, setAgePreset]               = useState<AgePreset>("none");
  const [customAgeMin, setCustomAgeMin]         = useState<string>("");
  const [customAgeMax, setCustomAgeMax]         = useState<string>("");
  const [appliedCustomAge, setAppliedCustomAge] = useState<AgeRange | null>(null);
  const [ageError, setAgeError]                 = useState<string | null>(null);

  // ── Family members state ──────────────────────────────────────────────────
  const [familyEntries, setFamilyEntries]             = useState<FamilyEntry[]>([]);
  const [familyLoading, setFamilyLoading]             = useState(false);
  const [familyError, setFamilyError]                 = useState<string | null>(null);
  const [familySearch, setFamilySearch]               = useState("");
  const [familyColFilters, setFamilyColFilters]       = useState<ColumnFilter[]>([]);
  const [openFamilyFilter, setOpenFamilyFilter]       = useState<{ col: string; rect: DOMRect } | null>(null);
  const [familyDownloading, setFamilyDownloading]     = useState(false);
  const [familyVisibleCols, setFamilyVisibleCols]     = useState<string[]>(ALL_FAMILY_COLUMNS);
  const familySectionRef                              = useRef<HTMLDivElement>(null);

  // ── Applied (effective) personal filters ──────────────────────────────────
  // These only apply while the Personal Details section is selected.
  const personalSelected = selectedSections.includes(PERSONAL_SECTION_ID);
  const appliedAge: AgeRange | null =
    agePreset === "custom" ? appliedCustomAge : presetToRange(agePreset);
  const effMarital = personalSelected ? maritalFilter : "";
  const effAgeMin  = personalSelected && appliedAge ? appliedAge.min : null;
  const effAgeMax  = personalSelected && appliedAge ? appliedAge.max : null;

  // ── Apply init sections + init status (from General Dashboard) ───────────
  useEffect(() => {
    if (initSections.length > 0) {
      setSelectedSections(initSections);
      // Status requested from the dashboard (e.g. "rejected") is honoured explicitly;
      // it never silently falls back to approved.
      setStatusFilter(statusFromCategory(initCategory));
      setColumnFilters([]);
      setSearchQuery("");
      setMaritalFilter("");
      setAgePreset("none");
      setCustomAgeMin("");
      setCustomAgeMax("");
      setAppliedCustomAge(null);
      setAgeError(null);
      const openMap: Record<string, boolean> = {};
      initSections.forEach(s => { openMap[s] = true; });
      setSectionOpen(openMap);
      onClearInit();
    }
  }, [initSections, initCategory]); // eslint-disable-line

  // ── Sync visible columns when sections change ─────────────────────────────
  // "Relation" and any EXCLUDED_MAIN_COLUMNS are never added to the main table
  useEffect(() => {
    const desired = new Set<string>(BASE_COLUMNS);
    selectedSections.forEach(secId => {
      if (secId === FAMILY_SECTION_ID) return;
      const sec = SECTIONS.find(s => s.id === secId);
      if (sec) {
        sec.columns.forEach(c => {
          if (!EXCLUDED_MAIN_COLUMNS.has(c)) desired.add(c);
        });
      }
    });
    setVisibleColumns(prev => {
      const kept    = prev.filter(c => desired.has(c) && !EXCLUDED_MAIN_COLUMNS.has(c));
      const keptSet = new Set(kept);
      const added   = Array.from(desired).filter(c => !keptSet.has(c) && !EXCLUDED_MAIN_COLUMNS.has(c));
      return sortedCols([...kept, ...added]);
    });
    setColumnFilters(prev => prev.filter(f => desired.has(f.column)));
  }, [selectedSections]);

  // ── Fetch main data ───────────────────────────────────────────────────────
  const fetchSeq = useRef(0);
  const familySelectedRef = useRef(false);
  familySelectedRef.current = selectedSections.includes(FAMILY_SECTION_ID);
  const pendingFamilyAutoFetch = useRef(false);

  const fetchData = useCallback(async () => {
    if (selectedSections.length === 0) { setRows([]); return; }
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    const dateParams = dateRange
      ? { dateFrom: toISO(dateRange.from), dateTo: toISO(dateRange.to) }
      : {};
    const exportSections = selectedSections.filter(s => s !== FAMILY_SECTION_ID);
    try {
      const result = await api.post("/sangha/reports/export/full", {
        sections: exportSections.length > 0 ? exportSections : selectedSections,
        status: statusFilter,
        includeAllStatuses: statusFilter === "all",
        ...(effMarital ? { maritalStatus: effMarital } : {}),
        ...(effAgeMin !== null ? { ageMin: effAgeMin } : {}),
        ...(effAgeMax !== null ? { ageMax: effAgeMax } : {}),
        ...dateParams,
      });
      if (seq !== fetchSeq.current) return; // a newer request superseded this one
      setRows(normalizeRows(Array.isArray(result) ? result : []));
      if (familySelectedRef.current) pendingFamilyAutoFetch.current = true;
    } catch {
      if (seq !== fetchSeq.current) return;
      setError("Failed to load data. Please try again.");
      setRows([]);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [selectedSections, statusFilter, effMarital, effAgeMin, effAgeMax, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered main rows ────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows;
    columnFilters.forEach(({ column, value }) => {
      if (!value) return;
      result = result.filter(row =>
        String(row[column] ?? "").toLowerCase() === value.toLowerCase()
      );
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        visibleColumns.some(col => String(row[col] ?? "").toLowerCase().includes(q))
      );
    }
    return result;
  }, [rows, columnFilters, searchQuery, visibleColumns]);

  const filteredRowsRef = useRef(filteredRows);
  useEffect(() => { filteredRowsRef.current = filteredRows; }, [filteredRows]);

  // ── Sidebar section search ────────────────────────────────────────────────
  const sidebarFiltered = useMemo(() => {
    if (!sidebarSearch.trim()) return SECTIONS;
    const q = sidebarSearch.toLowerCase();
    return SECTIONS.filter(sec =>
      sec.label.toLowerCase().includes(q) ||
      sec.columns.some(c => c.toLowerCase().includes(q))
    ).map(sec => ({
      ...sec,
      matchedColumns: sec.columns.filter(c => c.toLowerCase().includes(q)),
    }));
  }, [sidebarSearch]);

  // ── Combined family rows ──────────────────────────────────────────────────
  const allFamilyRows = useMemo(() => {
    return familyEntries.flatMap(e => e.rows);
  }, [familyEntries]);

  // ── Filtered family rows ──────────────────────────────────────────────────
  const filteredFamilyRows = useMemo(() => {
    let result = allFamilyRows;
    familyColFilters.forEach(({ column, value }) => {
      if (!value) return;
      result = result.filter(row =>
        String(row[column] ?? "").toLowerCase() === value.toLowerCase()
      );
    });
    if (familySearch.trim()) {
      const q = familySearch.toLowerCase();
      result = result.filter(row =>
        familyVisibleCols.some(col => String(row[col] ?? "").toLowerCase().includes(q))
      );
    }
    return result;
  }, [allFamilyRows, familyColFilters, familySearch, familyVisibleCols]);

  // ── Fetch family data ─────────────────────────────────────────────────────
  const triggerFamilyFetch = useCallback(async (profileIds: string[], label: string) => {
    if (!profileIds.length) return;
    setFamilyLoading(true);
    setFamilyError(null);
    try {
      const result = await api.post("/sangha/reports/family-members", { profileIds });
      const newRows = Array.isArray(result) ? result : [];
      setFamilyEntries(prev => {
        const exists = prev.findIndex(e => e.label === label);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = { profileId: profileIds[0], label, rows: newRows };
          return updated;
        }
        return [...prev, { profileId: profileIds[0], label, rows: newRows }];
      });
      setTimeout(() => {
        familySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch {
      setFamilyError("Failed to load family data. Please try again.");
    } finally {
      setFamilyLoading(false);
    }
  }, []);

  // ── Auto-fetch family when section is selected ────────────────────────────
  const prevFamilySelected = useRef(false);
  useEffect(() => {
    const isSelected = selectedSections.includes(FAMILY_SECTION_ID);
    if (!isSelected) {
      if (prevFamilySelected.current) {
        setFamilyEntries([]);
        setFamilySearch("");
        setFamilyColFilters([]);
      }
      prevFamilySelected.current = false;
      pendingFamilyAutoFetch.current = false;
      return;
    }
    if (rows.length === 0) {
      pendingFamilyAutoFetch.current = true;
      return;
    }
    if (loading) return;

    const ids = filteredRowsRef.current.map(r => r._profile_id).filter(Boolean) as string[];
    if (ids.length === 0) return;

    const justEnabledFamily = !prevFamilySelected.current;
    const dataArrivedAfterWait = pendingFamilyAutoFetch.current;
    if (justEnabledFamily || dataArrivedAfterWait) {
      pendingFamilyAutoFetch.current = false;
      prevFamilySelected.current = true;
      triggerFamilyFetch(ids, `All Visible Users (${ids.length})`);
    } else {
      prevFamilySelected.current = true;
    }
  }, [selectedSections, rows, loading, triggerFamilyFetch]);

  // ── Remove a family entry block ───────────────────────────────────────────
  const removeFamilyEntry = (label: string) => {
    setFamilyEntries(prev => prev.filter(e => e.label !== label));
  };

  // ── Helper: profile IDs from visible main-table rows ─────────────────────
  const getVisibleProfileIds = (): string[] =>
    filteredRows.map(r => r._profile_id).filter(Boolean) as string[];

  // ── Main table actions ────────────────────────────────────────────────────
  const toggleSection = (secId: string) => {
    setSelectedSections(prev =>
      prev.includes(secId) ? prev.filter(s => s !== secId) : [...prev, secId]
    );
  };

  const deleteColumn = (col: string) => {
    if (BASE_COLUMNS.includes(col)) return;
    setVisibleColumns(prev => prev.filter(c => c !== col));
  };

  const addColumn = (col: string) => {
    // Never allow excluded columns into the main table
    if (EXCLUDED_MAIN_COLUMNS.has(col)) return;
    setVisibleColumns(prev => sortedCols([...prev, col]));
  };

  const addColumnFilter = (col: string, val: string) => {
    setColumnFilters(prev => {
      const existing = prev.find(f => f.column === col);
      if (existing) return prev.map(f => f.column === col ? { ...f, value: val } : f);
      return [...prev, { column: col, value: val }];
    });
  };

  const removeColumnFilter = (col: string) => {
    setColumnFilters(prev => prev.filter(f => f.column !== col));
  };

  // ── Age filter actions ────────────────────────────────────────────────────
  const handleAgePresetChange = (p: AgePreset) => {
    setAgePreset(p);
    setAgeError(null);
    if (p !== "custom") {
      setCustomAgeMin("");
      setCustomAgeMax("");
      setAppliedCustomAge(null);
    }
  };

  const applyCustomAge = () => {
    const minStr = customAgeMin.trim();
    const maxStr = customAgeMax.trim();
    if (!minStr && !maxStr) {
      setAgeError("Enter a minimum and/or maximum age.");
      return;
    }
    const parse = (s: string): number | null | undefined => {
      if (!s) return null;
      if (!/^\d+$/.test(s)) return undefined;
      const v = Number(s);
      return v >= 0 && v <= 150 ? v : undefined;
    };
    const min = parse(minStr);
    const max = parse(maxStr);
    if (min === undefined || max === undefined) {
      setAgeError("Ages must be whole numbers between 0 and 150.");
      return;
    }
    if (min !== null && max !== null && min > max) {
      setAgeError("Minimum age cannot be greater than maximum age.");
      return;
    }
    setAgeError(null);
    setAppliedCustomAge({ min, max });
  };

  const clearCustomAge = () => {
    setCustomAgeMin("");
    setCustomAgeMax("");
    setAppliedCustomAge(null);
    setAgeError(null);
  };

  const ageChipLabel = useMemo(() => {
    if (!personalSelected || !appliedAge) return null;
    const { min, max } = appliedAge;
    if (min !== null && max !== null) return `Age ${min}–${max}`;
    if (min !== null) return `Age ${min}+`;
    if (max !== null) return `Age ≤ ${max}`;
    return null;
  }, [personalSelected, appliedAge]);

  // ── Excel download — booleans → Yes/No, nulls → Not Selected, income formatted ───
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const exportData = filteredRows.map(row => {
        const obj: TableRow = {};
        visibleColumns.forEach(col => {
          if (col === "Age") {
            const age = calcAge(row["Date of Birth"]);
            obj[col] = age === "—" ? "Not Selected" : age;
          } else {
            obj[col] = normalizeForExcel(row[col], col);
          }
        });
        return obj;
      });
      await downloadExcel(exportData, `Custom-Report-${selectedSections.join("-")}`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Family table actions ──────────────────────────────────────────────────
  const handleFamilyDownload = async () => {
    setFamilyDownloading(true);
    try {
      const exportData = filteredFamilyRows.map(row => {
        const obj: TableRow = {};
        familyVisibleCols.forEach(col => {
          obj[col] = normalizeForExcel(row[col], col);
        });
        return obj;
      });
      await downloadExcel(exportData, `Family-Members-Export`);
    } finally {
      setFamilyDownloading(false);
    }
  };

  const addFamilyColFilter = (col: string, val: string) => {
    setFamilyColFilters(prev => {
      const existing = prev.find(f => f.column === col);
      if (existing) return prev.map(f => f.column === col ? { ...f, value: val } : f);
      return [...prev, { column: col, value: val }];
    });
  };

  const removeFamilyColFilter = (col: string) => {
    setFamilyColFilters(prev => prev.filter(f => f.column !== col));
  };

  const deleteFamilyColumn = (col: string) => {
    if (FAMILY_CORE_COLUMNS.includes(col)) return;
    setFamilyVisibleCols(prev => prev.filter(c => c !== col));
    setFamilyColFilters(prev => prev.filter(f => f.column !== col));
  };

  // ── Filter dropdowns ──────────────────────────────────────────────────────
  const handleOpenFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenFamilyFilter(null);
    if (openFilter?.col === col) { setOpenFilter(null); return; }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setOpenFilter({ col, rect });
  };

  const handleOpenFamilyFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenFilter(null);
    if (openFamilyFilter?.col === col) { setOpenFamilyFilter(null); return; }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setOpenFamilyFilter({ col, rect });
  };

  const activeFilters       = columnFilters.filter(f => f.value);
  const activeFamilyFilters = familyColFilters.filter(f => f.value);
  // Marital Status header filter always offers the four fixed, user-friendly values
  const getFilterVals       = (col: string) =>
    col === "Marital Status" ? MARITAL_OPTIONS.map(o => o.label) : getUniqueValues(rows, col);
  const getFamilyFilterVals = (col: string) => getUniqueValues(allFamilyRows, col);
  const isFamilySectionSelected = selectedSections.includes(FAMILY_SECTION_ID);
  const showFamilyTable         = familyEntries.length > 0 || familyLoading || !!familyError;
  const statusFilterLabel       =
    STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label ?? "";
  const maritalChipLabel        = effMarital ? (MARITAL_LABELS[effMarital] ?? effMarital) : null;

  // ── Date range label ──────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    if (!dateRange) return null;
    if (dateRange.preset === "allTime")  return "All time";
    if (dateRange.preset === "last7")    return "Last 7 days";
    if (dateRange.preset === "last30")   return "Last 30 days";
    if (dateRange.preset === "last90")   return "Last 90 days";
    if (dateRange.preset === "thisYear") return "This year";
    if (dateRange.from && dateRange.to)  return `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`;
    return null;
  }, [dateRange]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MAIN TABLE SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-0 min-h-[80vh]">

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside
          className="w-72 shrink-0 border-r border-slate-200 bg-white rounded-l-2xl overflow-y-auto"
          style={{ maxHeight: "85vh" }}
        >
          <div className="p-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">Report Builder</p>
            <p className="text-xs text-slate-500 mt-0.5">Select sections to include</p>
          </div>

          {/* Sidebar search */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sections & fields…"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl
                  focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none bg-white"
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {sidebarSearch && (
              <p className="text-xs text-slate-400 mt-1 px-1">
                {sidebarFiltered.length} section{sidebarFiltered.length !== 1 ? "s" : ""} match
              </p>
            )}
          </div>

          {/* Registration status: All-statuses toggle + explicit status selector */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setStatusFilter(prev => prev === "all" ? "approved" : "all")}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                  statusFilter === "all" ? "bg-sky-500" : "bg-slate-300"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  statusFilter === "all" ? "left-4" : "left-0.5"
                }`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">All Statuses</p>
                <p className="text-xs text-slate-400">Include pending, changes requested, rejected</p>
              </div>
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Registration Status</p>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                  focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none"
              >
                {STATUS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {sidebarFiltered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No sections match your search.</p>
            )}
            {sidebarFiltered.map(sec => {
              const isSelected    = selectedSections.includes(sec.id);
              const isOpen        = sectionOpen[sec.id] ?? false;
              const effectiveOpen = sidebarSearch ? true : isOpen;
              const colsToShow    = sidebarSearch
                ? ((sec as any).matchedColumns ?? sec.columns)
                : sec.columns;
              const isFamilySec   = sec.id === FAMILY_SECTION_ID;
              const isPersonalSec = sec.id === PERSONAL_SECTION_ID;

              return (
                <div
                  key={sec.id}
                  className={`rounded-xl border transition-all ${
                    isSelected ? "border-sky-200 bg-sky-50" : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button onClick={() => toggleSection(sec.id)} className="flex items-center gap-2 flex-1 text-left">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-sky-500 bg-sky-500" : "border-slate-300"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-base">{sec.icon}</span>
                      <span className={`text-xs font-semibold ${isSelected ? "text-sky-700" : "text-slate-700"}`}>
                        {sec.label}
                      </span>
                    </button>
                    {isFamilySec ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                        Family Table
                      </span>
                    ) : (
                      !sidebarSearch && (
                        <button
                          onClick={() => {
                            if (!isSelected) toggleSection(sec.id);
                            setSectionOpen(prev => ({ ...prev, [sec.id]: !prev[sec.id] }));
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                          title={isOpen ? "Collapse" : "Expand columns"}
                        >
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )
                    )}
                  </div>

                  {isFamilySec && isSelected && (
                    <div className="px-3 pb-2.5">
                      <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <Users className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          Loads family members for all visible rows in a separate table below. Click individual row buttons to load specific users.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Personal Details filters: marital status + age */}
                  {isPersonalSec && isSelected && (
                    <div className="px-3 pb-2.5 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Marital Status</p>
                        <select
                          value={maritalFilter}
                          onChange={e => setMaritalFilter(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                            focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none"
                        >
                          <option value="">All</option>
                          {MARITAL_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Age</p>
                        <select
                          value={agePreset}
                          onChange={e => handleAgePresetChange(e.target.value as AgePreset)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                            focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none"
                        >
                          {AGE_PRESETS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        {agePreset === "custom" && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={150}
                                placeholder="Min"
                                value={customAgeMin}
                                onChange={e => setCustomAgeMin(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                                  focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none"
                              />
                              <span className="text-xs text-slate-400">–</span>
                              <input
                                type="number"
                                min={0}
                                max={150}
                                placeholder="Max"
                                value={customAgeMax}
                                onChange={e => setCustomAgeMax(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white
                                  focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={applyCustomAge}
                                className="flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-sky-500
                                  hover:bg-sky-600 text-white transition-colors"
                              >
                                Apply
                              </button>
                              <button
                                onClick={clearCustomAge}
                                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500
                                  hover:bg-slate-50 transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                            {ageError && (
                              <p className="text-xs text-rose-600">{ageError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isFamilySec && effectiveOpen && (
                    <div className="px-3 pb-2.5 space-y-1">
                      {colsToShow.map((col: string) => {
                        const isVisible = visibleColumns.includes(col);
                        const isBase    = BASE_COLUMNS.includes(col);
                        // Never show add/remove toggle for excluded columns
                        const isExcluded = EXCLUDED_MAIN_COLUMNS.has(col);
                        return (
                          <div
                            key={col}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs ${
                              sidebarSearch && col.toLowerCase().includes(sidebarSearch.toLowerCase())
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-white border-slate-100"
                            }`}
                          >
                            <span className="text-slate-600 truncate flex-1">{col}</span>
                            {isBase ? (
                              <span className="ml-2 text-xs text-slate-300 italic">always</span>
                            ) : isExcluded ? (
                              <span className="ml-2 text-xs text-slate-300 italic">family only</span>
                            ) : (
                              <button
                                onClick={() => isVisible ? deleteColumn(col) : addColumn(col)}
                                title={isVisible ? "Remove column" : "Add column"}
                                className={`ml-2 shrink-0 transition-colors ${
                                  isVisible
                                    ? "text-rose-400 hover:text-rose-600"
                                    : "text-emerald-400 hover:text-emerald-600"
                                }`}
                              >
                                {isVisible ? <Eye className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {sidebarSearch && colsToShow.length === 0 && (
                        <p className="text-xs text-slate-400 px-2 py-1">No matching fields</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col bg-white rounded-r-2xl border border-l-0 border-slate-200 overflow-hidden"
          style={{ maxHeight: "85vh" }}
        >
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search table…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl
                  focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedSections.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                Status: <strong>{statusFilterLabel}</strong>
              </span>
            )}

            {maritalChipLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium">
                <SlidersHorizontal className="w-3 h-3" />
                {maritalChipLabel}
                <button onClick={() => setMaritalFilter("")} className="hover:text-sky-900 ml-0.5">×</button>
              </span>
            )}

            {ageChipLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium">
                <SlidersHorizontal className="w-3 h-3" />
                {ageChipLabel}
                <button onClick={() => handleAgePresetChange("none")} className="hover:text-sky-900 ml-0.5">×</button>
              </span>
            )}

            {dateRangeLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
                <Calendar className="w-3 h-3" />
                {dateRangeLabel}
              </span>
            )}

            {activeFilters.map(f => (
              <span
                key={f.column}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="max-w-[80px] truncate">{f.column}</span>: <strong>{f.value}</strong>
                <button onClick={() => removeColumnFilter(f.column)} className="hover:text-sky-900 ml-0.5">×</button>
              </span>
            ))}

            <div className="flex-1" />

            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium">
              {filteredRows.length.toLocaleString()} rows
              {filteredRows.length !== rows.length && ` of ${rows.length.toLocaleString()}`}
            </span>

            <button
              onClick={handleDownload}
              disabled={downloading || filteredRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm
                font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Excel
            </button>
          </div>

          {/* Empty / Loading / Error states */}
          {selectedSections.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 py-20">
              <FileSpreadsheet className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">Select sections from the sidebar to build your report</p>
              <p className="text-xs">Tip: Use the search bar to find specific fields quickly</p>
            </div>
          )}
          {selectedSections.length > 0 && loading && (
            <div className="flex-1 flex items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Loading data…</p>
            </div>
          )}
          {selectedSections.length > 0 && !loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <AlertCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Main Table */}
          {selectedSections.length > 0 && !loading && !error && (
            <div className="flex-1 overflow-auto">
              {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
                  <Search className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No matching records found</p>
                  {(columnFilters.length > 0 || searchQuery) && (
                    <button
                      onClick={() => { setColumnFilters([]); setSearchQuery(""); }}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-xs font-semibold text-slate-500 px-4 py-3 text-left w-10">#</th>
                      {visibleColumns.map(col => {
                        const activeFilter = columnFilters.find(f => f.column === col);
                        const isBase       = BASE_COLUMNS.includes(col);
                        return (
                          <th
                            key={col}
                            className="text-xs font-semibold text-slate-600 px-3 py-3 text-left whitespace-nowrap group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{col}</span>
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  {col !== "Status" && (
    <button
      onClick={e => handleOpenFilter(col, e)}
      className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${
        activeFilter ? "text-sky-600" : "text-slate-400"
      }`}
      title="Filter column"
    >
      <Filter className="w-3 h-3" />
    </button>
  )}
                                {!isBase && (
                                  <button
                                    onClick={() => deleteColumn(col)}
                                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Remove column"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {activeFilter && (
                                <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium max-w-[70px] truncate">
                                  {activeFilter.value}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.slice(0, 500).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        {visibleColumns.map(col => {
                          const val = row[col];
                          let displayVal: any = val;
                          let cellClass = "text-slate-700";

                          // Format income columns
                          if (col === "Self Income (Individual)" || col === "Family Income (Annual)") {
                            displayVal = formatIncome(val);
                            cellClass = "text-slate-700 font-medium";
                          } else if (col === "Age") {
                            displayVal = calcAge(row["Date of Birth"]);
                            cellClass  = "text-slate-700 font-mono";
                          } else if (col === "Status") {
                            // val is already the friendly label (Approved / Pending / Rejected / Changes Requested)
                            const s = String(val ?? "").toLowerCase();
                            if (s === "approved")                cellClass = "text-emerald-700 font-semibold";
                            else if (s === "rejected")           cellClass = "text-rose-600 font-semibold";
                            else if (s === "pending")            cellClass = "text-amber-600 font-semibold";
                            else if (s === "changes requested")  cellClass = "text-orange-600 font-semibold";
                          } else if (col === "Gender") {
                            const g = String(val ?? "").toLowerCase();
                            if (g === "male")        cellClass = "text-sky-600 font-medium";
                            else if (g === "female") cellClass = "text-pink-600 font-medium";
                            else if (val)            cellClass = "text-slate-500";
                          } else if (["Aadhaar", "PAN Card", "Voter ID", "Land Docs", "DL"].includes(col)) {
                            const v = String(val ?? "").toLowerCase();
                            if (v === "yes")          cellClass = "text-emerald-600 font-medium";
                            else if (v === "no")      cellClass = "text-rose-500";
                            else if (v === "unknown") cellClass = "text-slate-400";
                          } else if (typeof val === "boolean") {
                            displayVal = val ? "Yes" : "No";
                            cellClass  = val ? "text-emerald-600 font-medium" : "text-slate-400";
                          }

                          return (
                            <td
                              key={col}
                              className={`px-3 py-2.5 text-xs whitespace-nowrap max-w-[200px] truncate ${cellClass}`}
                            >
                              {col === "Age" || col === "Self Income (Individual)" || col === "Family Income (Annual)"
                                ? displayVal
                                : (displayVal !== undefined && displayVal !== null ? String(displayVal) : "—")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredRows.length > 500 && (
                <div className="px-4 py-3 border-t border-slate-100 bg-amber-50 text-xs text-amber-700 text-center">
                  Showing first 500 rows. Download Excel to get all {filteredRows.length.toLocaleString()} rows.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FAMILY MEMBERS TABLE SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      {showFamilyTable && (
        <div
          ref={familySectionRef}
          className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        >
          {/* Section header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Family Members</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {familyEntries.length > 0 && (
                    <>
                      Showing data for{" "}
                      {familyEntries.map((e, i) => (
                        <span key={e.label}>
                          {i > 0 && ", "}
                          <span className="font-semibold text-violet-700 inline-flex items-center gap-1">
                            {e.label}
                            <button
                              onClick={() => removeFamilyEntry(e.label)}
                              className="text-violet-400 hover:text-violet-700 transition-colors"
                              title={`Remove ${e.label}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        </span>
                      ))}
                    </>
                  )}
                  {familyLoading && <span className="text-violet-500 ml-1">Loading…</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFamilyEntries([]);
                setFamilySearch("");
                setFamilyColFilters([]);
                setFamilyError(null);
              }}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Close family table"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Family toolbar */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3">
            {isFamilySectionSelected && rows.length > 0 && (
              <button
                onClick={() => {
                  const ids = getVisibleProfileIds();
                  if (ids.length > 0) {
                    triggerFamilyFetch(ids, `All Visible Users (${ids.length})`);
                  }
                }}
                disabled={familyLoading || filteredRows.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700
                  text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-violet-200"
              >
                {familyLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Users className="w-3.5 h-3.5" />}
                Load All Visible ({filteredRows.length})
              </button>
            )}

            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search family members…"
                value={familySearch}
                onChange={e => setFamilySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl
                  focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none bg-white"
              />
              {familySearch && (
                <button
                  onClick={() => setFamilySearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeFamilyFilters.map(f => (
              <span
                key={f.column}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100
                  border border-violet-200 text-violet-700 text-xs font-medium"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="max-w-[80px] truncate">{f.column}</span>: <strong>{f.value}</strong>
                <button
                  onClick={() => removeFamilyColFilter(f.column)}
                  className="hover:text-violet-900 ml-0.5"
                >×</button>
              </span>
            ))}

            {activeFamilyFilters.length > 0 && (
              <button
                onClick={() => setFamilyColFilters([])}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear filters
              </button>
            )}

            <div className="flex-1" />

            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg font-medium">
              {filteredFamilyRows.length.toLocaleString()} members
              {filteredFamilyRows.length !== allFamilyRows.length &&
                ` of ${allFamilyRows.length.toLocaleString()}`}
            </span>

            <button
              onClick={handleFamilyDownload}
              disabled={familyDownloading || filteredFamilyRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white
                text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {familyDownloading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Download Excel
            </button>
          </div>

          {/* Family table body */}
          <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
            {familyLoading && allFamilyRows.length === 0 && (
              <div className="flex items-center justify-center gap-3 text-slate-400 py-16">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                <p className="text-sm">Loading family members…</p>
              </div>
            )}

            {!familyLoading && familyError && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
                <AlertCircle className="w-8 h-8 opacity-40" />
                <p className="text-sm">{familyError}</p>
                <button
                  onClick={() => setFamilyError(null)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50"
                >
                  <X className="w-4 h-4" /> Dismiss
                </button>
              </div>
            )}

            {!familyLoading && !familyError && filteredFamilyRows.length === 0 && allFamilyRows.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">No family members found</p>
              </div>
            )}

            {!familyLoading && !familyError && allFamilyRows.length > 0 && filteredFamilyRows.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
                <Search className="w-8 h-8 opacity-30" />
                <p className="text-sm">No members match your filters</p>
                {(familyColFilters.length > 0 || familySearch) && (
                  <button
                    onClick={() => { setFamilyColFilters([]); setFamilySearch(""); }}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!familyLoading && !familyError && filteredFamilyRows.length > 0 && (
              <>
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-violet-50/60 border-b border-violet-100">
                      <th className="text-xs font-semibold text-slate-500 px-4 py-3 text-left w-10">#</th>
                      {familyVisibleCols.map(col => {
                        const activeFilter = familyColFilters.find(f => f.column === col);
                        const isCore       = FAMILY_CORE_COLUMNS.includes(col);
                        return (
                          <th
                            key={col}
                            className="text-xs font-semibold text-slate-600 px-3 py-3 text-left whitespace-nowrap group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{col}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={e => handleOpenFamilyFilter(col, e)}
                                  className={`p-0.5 rounded hover:bg-violet-200 transition-colors ${
                                    activeFilter ? "text-violet-600" : "text-slate-400"
                                  }`}
                                  title="Filter column"
                                >
                                  <Filter className="w-3 h-3" />
                                </button>
                                {!isCore && (
                                  <button
                                    onClick={() => deleteFamilyColumn(col)}
                                    className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Remove column"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {activeFilter && (
                                <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium max-w-[70px] truncate">
                                  {activeFilter.value}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFamilyRows.slice(0, 1000).map((row, idx) => (
                      <tr key={idx} className="hover:bg-violet-50/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        {familyVisibleCols.map(col => {
                          const val = row[col];
                          const { text, cls } = getFamilyCellDisplay(col, val);
                          return (
                            <td
                              key={col}
                              className={`px-3 py-2.5 text-xs whitespace-nowrap max-w-[200px] truncate ${cls}`}
                              title={text !== "—" ? text : undefined}
                            >
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredFamilyRows.length > 1000 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-amber-50 text-xs text-amber-700 text-center">
                    Showing first 1000 members. Download Excel to get all{" "}
                    {filteredFamilyRows.length.toLocaleString()} members.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Portal filter dropdown for main table ─────────────────────── */}
      {openFilter && (
        <FilterDropdownPortal
          col={openFilter.col}
          anchorRect={openFilter.rect}
          uniqueVals={getFilterVals(openFilter.col)}
          activeValue={columnFilters.find(f => f.column === openFilter.col)?.value}
          onSelect={val => addColumnFilter(openFilter.col, val)}
          onClear={() => removeColumnFilter(openFilter.col)}
          onClose={() => setOpenFilter(null)}
        />
      )}

      {/* ── Portal filter dropdown for family table ───────────────────── */}
      {openFamilyFilter && (
        <FilterDropdownPortal
          col={openFamilyFilter.col}
          anchorRect={openFamilyFilter.rect}
          uniqueVals={getFamilyFilterVals(openFamilyFilter.col)}
          activeValue={familyColFilters.find(f => f.column === openFamilyFilter.col)?.value}
          onSelect={val => addFamilyColFilter(openFamilyFilter.col, val)}
          onClear={() => removeFamilyColFilter(openFamilyFilter.col)}
          onClose={() => setOpenFamilyFilter(null)}
        />
      )}
    </>
  );
}
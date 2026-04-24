"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet, Plus, Trash2, Filter, Download, ChevronDown,
  ChevronUp, Search, X, Loader2, AlertCircle, RefreshCw, Check,
  SlidersHorizontal, Eye,
} from "lucide-react";
import { api } from "@/lib/api";

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
      "Submitted At",
      "Reviewed At",
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
    id: "education-profession",
    label: "Education & Profession",
    icon: "🎓",
    color: "#8b5cf6",
    bg: "bg-violet-50",
    columns: [
      "Member Name",
      "Relation",
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
    columns: [
      "Family Member Name",
      "Family Member Relation",
      "Family Type",
      "Health Coverage",
      "Life Coverage",
      "Term Coverage",
      "Konkani Card Coverage",
    ],
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

function buildMasterOrder(): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  BASE_COLUMNS.forEach(c => { if (!seen.has(c)) { seen.add(c); order.push(c); } });
  SECTIONS.forEach(sec => {
    sec.columns.forEach(c => {
      if (!seen.has(c) && !BASE_COLUMNS.includes(c)) { seen.add(c); order.push(c); }
    });
  });
  return order;
}
const MASTER_COL_ORDER = buildMasterOrder();

const CATEGORY_SECTION_MAP: Record<string, string> = {
  gender:        "personal-details",
  age_group:     "personal-details",
  marital:       "personal-details",
  document:      "personal-details",
  income:        "economic-details",
  asset:         "economic-details",
  education:     "education-profession",
  occupation:    "education-profession",
  family_type:   "family-information",
  insurance:     "family-information",
  city:          "location-information",
  geographic:    "location-information",
  demographics:  "personal-details",
  economic:      "economic-details",
  gotra:         "religious-details",
  kuladevata:    "religious-details",
  pravara:       "religious-details",
  surname:       "religious-details",
  all:           "personal-details",
};

interface TableRow { [key: string]: any; }
interface ColumnFilter { column: string; value: string; }

interface Props {
  initSections: string[];
  initCategory?: string;
  onClearInit: () => void;
}

// ─── Portal-based Filter Dropdown ────────────────────────────────────────────
interface FilterDropdownPortalProps {
  col: string;
  anchorRect: DOMRect;
  uniqueVals: string[];
  activeValue?: string;
  onSelect: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterDropdownPortal({
  col,
  anchorRect,
  uniqueVals,
  activeValue,
  onSelect,
  onClear,
  onClose,
}: FilterDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position: try to open below the anchor; if too close to bottom, open above
  const DROPDOWN_HEIGHT = 220;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openAbove  = spaceBelow < DROPDOWN_HEIGHT + 8 && anchorRect.top > DROPDOWN_HEIGHT;

  const style: React.CSSProperties = {
    position:  "fixed",
    left:      Math.min(anchorRect.left, window.innerWidth - 200),
    width:     200,
    zIndex:    9999,
    ...(openAbove
      ? { bottom: window.innerHeight - anchorRect.top + 4 }
      : { top: anchorRect.bottom + 4 }),
  };

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so we fire before anything else
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Close on scroll (table scroll repositions the anchor)
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
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
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

function sortedCols(cols: string[]): string[] {
  const indexed = cols.filter(c => MASTER_COL_ORDER.includes(c));
  const rest    = cols.filter(c => !MASTER_COL_ORDER.includes(c));
  indexed.sort((a, b) => MASTER_COL_ORDER.indexOf(a) - MASTER_COL_ORDER.indexOf(b));
  return [...indexed, ...rest];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CustomReport({ initSections, initCategory, onClearInit }: Props) {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns]     = useState<string[]>(BASE_COLUMNS);
  const [columnFilters, setColumnFilters]       = useState<ColumnFilter[]>([]);
  const [rows, setRows]                         = useState<TableRow[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [downloading, setDownloading]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [sidebarSearch, setSidebarSearch]       = useState("");
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [sectionOpen, setSectionOpen]           = useState<Record<string, boolean>>({});

  // ── Filter dropdown state ─────────────────────────────────
  // Stores which column's filter is open AND the DOMRect of the trigger button
  const [openFilter, setOpenFilter] = useState<{ col: string; rect: DOMRect } | null>(null);

  // ── Apply init sections ───────────────────────────────────
  useEffect(() => {
    if (initSections.length > 0) {
      setSelectedSections(initSections);
      const openMap: Record<string, boolean> = {};
      initSections.forEach(s => { openMap[s] = true; });
      setSectionOpen(openMap);
      onClearInit();
    }
  }, [initSections]); // eslint-disable-line

  // ── Sync visible columns when sections change ─────────────
  useEffect(() => {
    const desired = new Set<string>(BASE_COLUMNS);
    selectedSections.forEach(secId => {
      const sec = SECTIONS.find(s => s.id === secId);
      if (sec) sec.columns.forEach(c => desired.add(c));
    });
    setVisibleColumns(prev => {
      const kept    = prev.filter(c => desired.has(c));
      const keptSet = new Set(kept);
      const added   = Array.from(desired).filter(c => !keptSet.has(c));
      return sortedCols([...kept, ...added]);
    });
    setColumnFilters(prev => prev.filter(f => desired.has(f.column)));
  }, [selectedSections]);

  // ── Fetch data ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (selectedSections.length === 0) { setRows([]); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await api.post("/sangha/reports/export/full", {
        sections: selectedSections,
        includeAllStatuses,
      }).catch(async () => {
        return await api.post("/sangha/reports/export", {
          category: "status",
          filter: includeAllStatuses ? "" : "approved",
        });
      });
      setRows(Array.isArray(result) ? result : []);
    } catch (e) {
      setError("Failed to load data. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSections, includeAllStatuses]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered rows ─────────────────────────────────────────
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

  // ── Sidebar section search ────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const exportData = filteredRows.map(row => {
        const obj: TableRow = {};
        visibleColumns.forEach(col => { obj[col] = row[col] ?? ""; });
        return obj;
      });
      await downloadExcel(exportData, `Custom-Report-${selectedSections.join("-")}`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Open filter: capture button's DOMRect at click time ──
  const handleOpenFilter = (col: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openFilter?.col === col) {
      setOpenFilter(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setOpenFilter({ col, rect });
  };

  const activeFilters = columnFilters.filter(f => f.value);
  const getFilterVals = (col: string) => getUniqueValues(rows, col);

  return (
    <div className="flex gap-0 min-h-[80vh]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
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

        {/* All statuses toggle */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setIncludeAllStatuses(p => !p)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                includeAllStatuses ? "bg-sky-500" : "bg-slate-300"
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                includeAllStatuses ? "left-4" : "left-0.5"
              }`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">All Statuses</p>
              <p className="text-xs text-slate-400">Include rejected, pending, drafts</p>
            </div>
          </label>
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
                  {!sidebarSearch && (
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
                  )}
                </div>

                {effectiveOpen && (
                  <div className="px-3 pb-2.5 space-y-1">
                    {colsToShow.map((col: string) => {
                      const isVisible = visibleColumns.includes(col);
                      const isBase    = BASE_COLUMNS.includes(col);
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

      {/* ── Main Content ──────────────────────────────────────── */}
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none bg-white"
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
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold
              rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Excel
          </button>
        </div>

        {/* Empty / Loading / Error States */}
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
              <RefreshCw className="w-4 h-4" />Retry
            </button>
          </div>
        )}

        {/* Table */}
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
                              {/* Filter button — uses portal */}
                              <button
                                onClick={e => handleOpenFilter(col, e)}
                                className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${
                                  activeFilter ? "text-sky-600" : "text-slate-400"
                                }`}
                                title="Filter column"
                              >
                                <Filter className="w-3 h-3" />
                              </button>

                              {/* Delete column */}
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

                        if (col === "Status") {
                          const s = String(val ?? "").toLowerCase();
                          if (s === "approved")               cellClass = "text-emerald-700 font-semibold";
                          else if (s === "rejected")          cellClass = "text-rose-600 font-semibold";
                          else if (s === "submitted")         cellClass = "text-amber-600 font-semibold";
                          else if (s === "draft")             cellClass = "text-slate-500";
                          else if (s === "changes_requested") cellClass = "text-orange-600 font-semibold";
                        }
                        if (col === "Gender") {
                          const g = String(val ?? "").toLowerCase();
                          if (g === "male")        cellClass = "text-sky-600 font-medium";
                          else if (g === "female") cellClass = "text-pink-600 font-medium";
                          else if (val)            cellClass = "text-slate-500";
                        }
                        if (["Aadhaar", "PAN Card", "Voter ID", "Land Docs", "DL"].includes(col)) {
                          const v = String(val ?? "").toLowerCase();
                          if (v === "yes")         cellClass = "text-emerald-600 font-medium";
                          else if (v === "no")     cellClass = "text-rose-500";
                          else if (v === "unknown") cellClass = "text-slate-400";
                        }
                        if (typeof val === "boolean") {
                          displayVal = val ? "✓ Yes" : "No";
                          cellClass  = val ? "text-emerald-600 font-medium" : "text-slate-400";
                        }

                        return (
                          <td
                            key={col}
                            className={`px-3 py-2.5 text-xs whitespace-nowrap max-w-[200px] truncate ${cellClass}`}
                          >
                            {displayVal !== undefined && displayVal !== null ? String(displayVal) : "—"}
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

      {/* ── Portal filter dropdown (rendered outside all overflow contexts) ── */}
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
    </div>
  );
}
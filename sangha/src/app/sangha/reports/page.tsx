"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react"; // ADDED useMemo
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Users, CheckCircle2, Clock,
  AlertCircle, FileEdit, Download, RefreshCw, XCircle,
  LayoutDashboard, BarChart2, ChevronRight, Sparkles,
  GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, Landmark, Activity, FileSpreadsheet, Loader2,Filter,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Counts {
  approved: string; rejected: string; pending: string;
  changes_requested: string; draft: string; total: string;
}
interface Trends {
  approved_last30: string; approved_prev30: string;
  submitted_last30: string; submitted_prev30: string;
  total_last30: string; total_prev30: string;
}
interface DailyReg { date: string; registrations: string; approvals: string; }
interface EnhancedReport {
  counts: Counts; trends: Trends; dailyRegistrations: DailyReg[];
}

interface AdvancedReport {
  totalApproved: number;
  totalPopulation:number;
  demographics: {
    gender: { male: number; female: number; other: number };
    ageGroups: { label: string; count: number }[];
    familyType: { nuclear: number; joint: number };
    maritalStatus: { label: string; count: number }[];
  };
  education: {
    degrees: { label: string; count: number }[];
    studying: { yes: number; no: number };
    working: { yes: number; no: number };
    professions: { label: string; count: number }[];
  };
  economic: {
    incomeSlabs: { label: string; count: number }[];
    assets: { label: string; owned: number; total: number }[];
    employment: { label: string; count: number }[];
  };
  insurance: { label: string; covered: number; notCovered: number }[];
  documents: { label: string; yes: number; no: number; unknown: number }[];
  geographic: { city: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(s: string | undefined | null): number {
  return parseInt(s ?? "0", 10) || 0;
}
function calcPct(value: string | number, total: number): number {
  const v = typeof value === "string" ? n(value) : value;
  if (total === 0) return 0;
  return Math.round((v / total) * 100);
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (current === 0 && previous === 0)
    return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" />No change</span>;
  if (previous === 0)
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" />New activity</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" />+{pct}% vs last month</span>;
  if (pct < 0) return <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium"><TrendingDown className="w-3 h-3" />{pct}% vs last month</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" />Unchanged</span>;
}

// ─── Excel export util ────────────────────────────────────────────────────────

async function downloadExcel(
  rows: any[],
  filename: string,
  sheetName: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31).replace(/[/\\?*[\]:]/g, "_"));
  XLSX.writeFile(wb, `${filename.replace(/[^\w\s\-]/g, "_")}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />;
}
function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="lg:col-span-2 h-72" />
        <Skeleton className="lg:col-span-3 h-72" />
      </div>
    </div>
  );
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wider">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold ml-1 text-slate-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const PieTooltipContent = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500 mt-1">{value.toLocaleString()} · <span className="text-sky-600 font-bold">{pct}%</span></p>
      <p className="text-xs text-slate-400 mt-1">Double-click to export</p>
    </div>
  );
};

const BarTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold text-slate-800">{p.value}</span>
        </p>
      ))}
      <p className="text-xs text-slate-400 mt-1">Double-click to export</p>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: any; title: string; subtitle: string; color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl bg-slate-100">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Chart Card (with top-right Excel download button) ───────────────────────

function ChartCard({
  title, subtitle, children, className = "", onDownload, downloading,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  className?: string; onDownload?: () => void; downloading?: boolean;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-0.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={downloading}
            title="Download Excel (all data in this chart)"
            className="ml-3 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200
              hover:border-emerald-400 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
          >
            {downloading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ─── GENERAL DASHBOARD ────────────────────────────────────────────────────────

function GeneralDashboard({
  data, onRefresh, onExport, exportLoading,
}: {
  data: EnhancedReport;
  onRefresh: () => void;
  onExport: (cat: string, filter: string, label: string) => Promise<void>;
  exportLoading: boolean;
}) {
  const { counts, trends, dailyRegistrations } = data;
  const total = n(counts.total);
  const clickRef = useRef<Record<string, number>>({});

  const handleDoubleClick = (key: string, label: string, fn: () => void) => {
    const now = Date.now();
    const last = clickRef.current[key] || 0;
    if (now - last < 400) {
      if (window.confirm(`Download Excel for "${label}"?`)) fn();
      clickRef.current[key] = 0;
    } else {
      clickRef.current[key] = now;
    }
  };

  const pieData = [
    { name: "Approved",  value: n(counts.approved),          color: "#10b981" },
    { name: "Pending",   value: n(counts.pending),            color: "#f59e0b" },
    { name: "Changes",   value: n(counts.changes_requested),  color: "#f97316" },
    { name: "Rejected",  value: n(counts.rejected),           color: "#ef4444" },
    { name: "Draft",     value: n(counts.draft),              color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const chartData = dailyRegistrations.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    Registrations: n(d.registrations),
    Approvals: n(d.approvals),
  }));

  const kpiCards = [
    { label: "Approved",      value: n(counts.approved),                              icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", cat: "status", filter: "approved"         },
    { label: "Pending Review",value: n(counts.pending),                               icon: Clock,        color: "#f59e0b", bg: "bg-amber-50",   cat: "status", filter: "submitted"        },
    { label: "Action Needed", value: n(counts.pending) + n(counts.changes_requested), icon: AlertCircle,  color: "#f97316", bg: "bg-orange-50",  cat: "status", filter: "changes_requested"},
    { label: "Draft Profiles",value: n(counts.draft),                                 icon: FileEdit,     color: "#64748b", bg: "bg-slate-100",  cat: "status", filter: "draft"            },
  ];

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh}
          className="gap-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />Refresh
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => onExport("status", "approved", "All-Approved-Members")}
          disabled={exportLoading}
          className="gap-2 border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 bg-white shadow-sm">
          {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Export All Excel
        </Button>
      </div>

      {/* Hero KPI */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0ea5e910_0%,_transparent_60%)]" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-sky-100" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-sky-50" />
        <div className="relative px-7 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sky-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Total Families Registered</p>
              <p className="text-7xl font-black tabular-nums leading-none text-slate-900 tracking-tight">
                {total.toLocaleString()}
              </p>
              <div className="mt-3">
                <TrendBadge current={n(trends.total_last30)} previous={n(trends.total_prev30)} />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center min-w-[100px] shadow-sm">
                <p className="text-3xl font-bold text-slate-900">{n(trends.total_last30)}</p>
                <p className="text-sky-600 text-xs mt-1 font-medium">Last 30 days</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-center min-w-[100px]">
                <p className="text-3xl font-bold text-slate-500">{n(trends.total_prev30)}</p>
                <p className="text-slate-500 text-xs mt-1">Prev 30 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => {
          const pct = calcPct(card.value, total);
          return (
            <div key={card.label}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all hover:shadow-md group cursor-pointer"
              onClick={() => handleDoubleClick(card.label, card.label, () => onExport(card.cat, card.filter, card.label))}
              title="Double-click to download Excel"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-xl ${card.bg}`}>
                  <card.icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{pct}%</span>
              </div>
              <p className="text-3xl font-black tabular-nums" style={{ color: card.color }}>
                {card.value.toLocaleString()}
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{card.label}</p>
              <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: card.color }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">Double-click to export</p>
            </div>
          );
        })}
      </div>

     

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <ChartCard
          title="Status Distribution"
          subtitle="Proportion of each registration stage"
          className="lg:col-span-2"
          onDownload={() => onExport("status", "approved", "Status-Distribution")}
          downloading={exportLoading}
        >
          {pieData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-sm">No registrations yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={264}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="46%"
                  innerRadius={72} outerRadius={104}
                  paddingAngle={3} dataKey="value"
                  strokeWidth={2} stroke="#ffffff"
                  onClick={(d: any) =>
                    handleDoubleClick(`pie-${d.name}`, d.name, () => onExport("status", d.name.toLowerCase(), `Status-${d.name}`))}
                  style={{ cursor: "pointer" }}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<PieTooltipContent total={total} active={undefined} payload={undefined} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Registration Trend — Last 30 Days"
          subtitle="New registrations vs approvals by date"
          className="lg:col-span-3"
          onDownload={() => onExport("status", "approved", "Registration-Trend")}
          downloading={exportLoading}
        >
          {chartData.length === 0 ? (
            <div className="h-[264px] flex flex-col items-center justify-center gap-2 text-slate-400">
              <Activity className="w-8 h-8 opacity-30" />
              <p className="text-sm">No activity in the last 30 days</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={264}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRegs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<AreaTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Area type="monotone" dataKey="Registrations" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gradRegs)" dot={false} activeDot={{ r: 5, fill: "#0ea5e9" }} />
                <Area type="monotone" dataKey="Approvals" stroke="#10b981" strokeWidth={2.5} fill="url(#gradApps)" dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Approval Rate",  value: `${calcPct(counts.approved, total)}%`, sub: "of submitted profiles", color: "#10b981" },
          { label: "Action Needed",  value: (n(counts.pending) + n(counts.changes_requested)).toLocaleString(), sub: "pending + changes", color: "#f97316" },
          { label: "Incomplete",     value: n(counts.draft).toLocaleString(), sub: "drafts not submitted", color: "#64748b" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{s.label}</p>
            <p className="text-3xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}



// ─── ADVANCED DASHBOARD ───────────────────────────────────────────────────────

function AdvancedDashboard({
  data, onExport, exportLoading, loading,
}: {
  data: AdvancedReport | null;
  onExport: (cat: string, filter: string, label: string) => Promise<void>;
  exportLoading: boolean;
  loading: boolean;
}) {
  const clickRef = useRef<Record<string, number>>({});
  // City filter state
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  
const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  // ─── FIX START: Move useMemo hooks BEFORE conditional returns ───
  // City filter — filtered geographic data for chart
  // We must handle 'data' being null here safely because this runs before the data check.
  const filteredGeo = useMemo(() =>
    selectedCities.length === 0
      ? (data?.geographic ?? [])
      : (data?.geographic?.filter(g => selectedCities.includes(g.city)) ?? []),
    [data, selectedCities]
  );

  // City population summary when filter is active
  const cityPopulationTotal = useMemo(() =>
    filteredGeo.reduce((s, c) => s + c.count, 0),
    [filteredGeo]
  );
  // ─── FIX END ───

  const handleDoubleClick = (key: string, label: string, fn: () => void) => {
    const now = Date.now();
    const last = clickRef.current[key] || 0;
    if (now - last < 400) {
      if (window.confirm(`Download Excel for "${label}"?`)) fn();
      clickRef.current[key] = 0;
    } else {
      clickRef.current[key] = now;
    }
  };

  // These checks are now safe because the hooks above are always called.
  if (loading) return <LoadingState />;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
      <AlertCircle className="w-10 h-10 opacity-40" />
      <p className="text-sm">Advanced analytics unavailable. Check API connection.</p>
    </div>
  );

  const { demographics: dem, education: edu, economic: eco } = data;
  const total = data.totalApproved;

  const COLORS = {
    blue: "#0ea5e9", teal: "#14b8a6", amber: "#f59e0b",
    rose: "#f43f5e", purple: "#8b5cf6", orange: "#f97316",
    slate: "#64748b", green: "#22c55e",
  };

  const insuranceCompare = data.insurance.map(ins => ({
    name: ins.label,
    Covered:       ins.covered,
    "Not Covered": ins.notCovered,
  }));

  const docCompare = data.documents.map(d => ({
    name: d.label, Yes: d.yes, No: d.no, Unknown: d.unknown,
  }));

  const assetBarData = eco.assets.map(a => ({
    name: a.label,
    "Owned %": a.total > 0 ? Math.round((a.owned / a.total) * 100) : 0,
  }));

  // Gender pie — include "other" only if > 0
  const genderTotal = dem.gender.male + dem.gender.female + dem.gender.other;
  const genderData = [
    { name: "Male",   value: dem.gender.male,   color: "#0ea5e9" },
    { name: "Female", value: dem.gender.female, color: "#ec4899" },
    { name: "Other",  value: dem.gender.other,  color: "#94a3b8" },
  ].filter(x => x.value > 0);

  return (
    <div className="space-y-10">
      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3">
        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
        <p className="text-sm text-slate-600">
          Real-time analytics from your Sangha's approved registered profiles.
          <span className="text-sky-700 font-medium ml-1">Double-click any chart or click Excel to export.</span>
        </p>
      </div>

      {/* ── 1. Demographics ──────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Users} title="Population & Demographics" subtitle="Community composition and structure" color={COLORS.blue} />

        {/* ── Total Population Hero Card ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative">
              <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-2">Total Population</p>
              <p className="text-5xl font-black tabular-nums leading-none">
                {(data.totalPopulation || 0).toLocaleString()}
              </p>
              <p className="text-sky-200 text-xs mt-2">Registered heads + all family members</p>
              <div className="flex items-center gap-4 mt-4">
                <div>
                  <p className="text-xl font-bold">{total.toLocaleString()}</p>
                  <p className="text-sky-200 text-xs">Families</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-xl font-bold">{Math.max(0, (data.totalPopulation || 0) - total).toLocaleString()}</p>
                  <p className="text-sky-200 text-xs">Family members</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-xl font-bold">
                    {total > 0 ? ((data.totalPopulation || 0) / total).toFixed(1) : "—"}
                  </p>
                  <p className="text-sky-200 text-xs">Avg per family</p>
                </div>
              </div>
            </div>
          </div>

          {/* Family type card inline with population */}
          {(() => {
            const ft = dem.familyType;
            const ftTotal = ft.nuclear + ft.joint || 1;
            const ftData = [
              { name: "Nuclear", value: ft.nuclear, color: "#10b981" },
              { name: "Joint",   value: ft.joint,   color: "#8b5cf6" },
            ].filter(x => x.value > 0);
            return (
              <ChartCard title="Family Type" subtitle="Nuclear vs Joint families"
                onDownload={() => onExport("family_type", "", "Family-Type")} downloading={exportLoading}>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={ftData} cx="50%" cy="50%" innerRadius={35} outerRadius={48}
                      paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#ffffff"
                      onClick={(d: any) => handleDoubleClick(`ft-${d.name}`, `Family: ${d.name}`, () => onExport("family_type", d.name.toLowerCase(), `FamilyType-${d.name}`))}
                      style={{ cursor: "pointer" }}>
                      {ftData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltipContent total={ftTotal} active={undefined} payload={undefined} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-2">
                  {ftData.map(d => (
                    <div key={d.name} className="flex-1 rounded-xl p-3 text-center bg-slate-50">
                      <p className="text-xs font-medium" style={{ color: d.color }}>{d.name}</p>
                      <p className="text-xl font-black" style={{ color: d.color }}>
                        {Math.round(d.value / ftTotal * 100)}%
                      </p>
                      <p className="text-xs text-slate-500">{d.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gender */}
          <ChartCard title="Gender Distribution" subtitle="Across all members including family"
            onDownload={() => onExport("gender", "", "Population-Gender")} downloading={exportLoading}>
            {genderData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No gender data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#ffffff"
                      onClick={(d: any) => handleDoubleClick(`g-${d.name}`, `Gender: ${d.name}`, () => onExport("gender", d.name.toLowerCase(), `Gender-${d.name}`))}
                      style={{ cursor: "pointer" }}>
                      {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltipContent total={genderTotal} active={undefined} payload={undefined} />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-2 mt-1">
                  {genderData.map(d => (
                    <div key={d.name} className="flex-1 rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">{d.name}</p>
                      <p className="text-lg font-black" style={{ color: d.color }}>{d.value.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{genderTotal > 0 ? Math.round(d.value / genderTotal * 100) : 0}%</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          {/* Age groups */}
          <ChartCard title="Age Group Distribution"
            onDownload={() => onExport("age_group", "", "Age-Groups")} downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dem.ageGroups} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Members"
                  onClick={(d: any) => handleDoubleClick(`age-${d.label}`, `Age: ${d.label}`, () => onExport("age_group", d.label, `Age-${d.label}`))}
                  style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Marital status */}
        {dem.maritalStatus.length > 0 && (
          <ChartCard title="Marital Status" subtitle="Breakdown across all registered heads" className="mt-5"
            onDownload={() => onExport("marital", "", "Marital-Status")} downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dem.maritalStatus} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Members"
                  onClick={(d: any) => handleDoubleClick(`ms-${d.label}`, `Marital: ${d.label}`, () => onExport("marital", d.label, `Marital-${d.label}`))}
                  style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── 2. Education & Occupation ────────────────────────────── */}
      <section>
        <SectionHeader icon={GraduationCap} title="Education & Occupation" subtitle="Educational attainment and profession distribution" color={COLORS.purple} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Highest Degree Level" subtitle="Educational attainment breakdown"
            onDownload={() => onExport("education", "", "Education-Levels")} downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={edu.degrees} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Members"
                  onClick={(d: any) => handleDoubleClick(`edu-${d.label}`, `Degree: ${d.label}`, () => onExport("education", d.label, `Education-${d.label}`))}
                  style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Profession Breakdown" subtitle="Employment type distribution"
            onDownload={() => onExport("occupation", "", "Professions")} downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={edu.professions} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Members"
                  onClick={(d: any) => handleDoubleClick(`occ-${d.label}`, `Occupation: ${d.label}`, () => onExport("occupation", d.label, `Occupation-${d.label}`))}
                  style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-2 gap-5 mt-5">
          {[
            { label: "Currently Studying", yes: edu.studying.yes, no: edu.studying.no, yesColor: "#0ea5e9", cat: "education" },
            { label: "Currently Working",  yes: edu.working.yes,  no: edu.working.no,  yesColor: "#10b981", cat: "occupation" },
          ].map((s: { label: string; yes: number; no: number; yesColor: string; cat: string }) => {
            const t = s.yes + s.no || 1;
            return (
              <ChartCard key={s.label} title={s.label} subtitle="Yes vs No breakdown"
                onDownload={() => onExport(s.cat, "", `${s.label.replace(/\s/g, "-")}`)} downloading={exportLoading}>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={s.yesColor} strokeWidth="3"
                        strokeDasharray={`${(s.yes / t) * 100} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-lg font-black" style={{ color: s.yesColor }}>{Math.round(s.yes / t * 100)}%</p>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    {[
                      { name: "Yes", val: s.yes, color: s.yesColor },
                      { name: "No",  val: s.no,  color: "#94a3b8" },
                    ].map(row => (
                      <div key={row.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-500">{row.name}</span>
                          <span className="text-xs font-bold" style={{ color: row.color }}>{row.val.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-2 rounded-full" style={{ width: `${row.val / t * 100}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            );
          })}
        </div>
      </section>

      {/* ── 3. Geographic ────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={MapPin} title="Geographic Distribution" subtitle="Where your families are located" color={COLORS.teal} />

        {/* City filter + summary */}
       <div className="flex items-center gap-3 flex-wrap">
  <div className="relative" ref={filterRef}>
    <button
      onClick={() => setFilterOpen(prev => !prev)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white
        hover:border-teal-400 hover:bg-teal-50 text-slate-600 hover:text-teal-700
        text-sm font-medium transition-all shadow-sm"
    >
      <Filter className="w-4 h-4" />
      Filter Cities
      {selectedCities.length > 0 && (
        <span className="bg-teal-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center">
          {selectedCities.length}
        </span>
      )}
    </button>

    {filterOpen && (
      <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl
        shadow-xl w-64 max-h-72 overflow-y-auto p-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Select Cities
        </p>
        {data.geographic.map(g => (
          <label
            key={g.city}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50
              cursor-pointer text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selectedCities.includes(g.city)}
              onChange={() =>
                setSelectedCities(prev =>
                  prev.includes(g.city)
                    ? prev.filter(c => c !== g.city)
                    : [...prev, g.city]
                )
              }
              className="accent-teal-500 rounded"
            />
            <span className="flex-1 truncate">{g.city}</span>
            <span className="text-xs text-slate-400 shrink-0">{g.count}</span>
          </label>
        ))}
        {data.geographic.length === 0 && (
          <p className="text-xs text-slate-400 px-2 py-4 text-center">No cities available</p>
        )}
      </div>
    )}
  </div>

  {selectedCities.length > 0 && (
    <button onClick={() => setSelectedCities([])} className="text-xs text-rose-500 hover:underline">
      Clear
    </button>
  )}
</div>
</section>

      {/* ── 4. Family Income ──────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Wallet} title="Family Annual Income" subtitle="Household income distribution — family_income field" color={COLORS.amber} />
        {eco.incomeSlabs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No income data available. Ensure profiles have completed the Economic Details section.
          </div>
        ) : (
          <ChartCard
            title="Family Income Distribution"
            subtitle="Annual household income brackets — Excel exports individual + family income"
            onDownload={() => onExport("income", "", "Family-Income-Distribution")}
            downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eco.incomeSlabs} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Families"
                  onClick={(d: any) => handleDoubleClick(`inc-${d.label}`, `Income: ${d.label}`, () => onExport("income", d.label, `Income-${d.label}`))}
                  style={{ cursor: "pointer" }}>
                  {eco.incomeSlabs.map((_, i) => (
                    <Cell key={i} fill={`hsl(${42 + i * 5}, 90%, ${55 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2 text-center">
              💡 Excel export includes both individual (self) income and family income columns
            </p>
          </ChartCard>
        )}
      </section>

      {/* ── 5. Assets / Economical ───────────────────────────────── */}
      <section>
        <SectionHeader icon={Home} title="Assets & Ownership" subtitle="Own Land, Own House, Vehicles, Renting status" color={COLORS.orange} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {eco.assets.map((asset: { label: string; owned: number; total: number }) => {
            const pct = asset.total > 0 ? Math.round((asset.owned / asset.total) * 100) : 0;
            return (
              <div key={asset.label}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-orange-300 transition-all"
                onClick={() => handleDoubleClick(`asset-${asset.label}`, `Asset: ${asset.label}`, () => onExport("asset", asset.label, `Asset-${asset.label}`))}
                title="Double-click to export">
                <p className="text-xs text-slate-500 font-medium mb-3">{asset.label}</p>
                <div className="relative w-16 h-16 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f97316" strokeWidth="3.5"
                      strokeDasharray={`${pct} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm font-black text-slate-900">{pct}%</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-800 mt-2">{asset.owned.toLocaleString()}</p>
                <p className="text-xs text-slate-400">of {asset.total.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Double-click to export</p>
              </div>
            );
          })}
        </div>

        <ChartCard title="Asset Ownership Comparison" subtitle="Ownership % across all asset types" className="mt-5"
          onDownload={() => onExport("asset", "", "All-Assets")} downloading={exportLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assetBarData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip content={<BarTooltipContent />} />
              <Bar dataKey="Owned %" fill="#f97316" radius={[6, 6, 0, 0]}
                onClick={(d: any) => handleDoubleClick(`abar-${d.name}`, `Asset: ${d.name}`, () => onExport("asset", d.name, `Asset-${d.name}`))}
                style={{ cursor: "pointer" }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {eco.employment && eco.employment.some(e => e.count > 0) && (
          <ChartCard title="Employment Sector Breakdown" subtitle="Govt, PSU, Private, Self-Employed, Entrepreneurs" className="mt-5"
            onDownload={() => onExport("occupation", "", "Employment-Sectors")} downloading={exportLoading}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eco.employment} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Members"
                  onClick={(d: any) => handleDoubleClick(`emp-${d.label}`, d.label, () => onExport("occupation", d.label, `Employment-${d.label}`))}
                  style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── 6. Insurance ─────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Shield} title="Insurance Coverage" subtitle="Term, Life, Health, Konkani Card — includes all family members" color={COLORS.teal} />
        {data.insurance.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {data.insurance.map((ins: { label: string; covered: number; notCovered: number }) => {
                const t = (ins.covered + ins.notCovered) || 1;
                const pct = Math.round(ins.covered / t * 100);
                return (
                  <ChartCard key={ins.label} title={`${ins.label} Insurance`}
                    onDownload={() => onExport("insurance", ins.label, `Insurance-${ins.label}`)} downloading={exportLoading}>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={[
                          { name: "Covered",     value: ins.covered    },
                          { name: "Not Covered", value: ins.notCovered },
                        ]} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#ffffff"
                          onClick={(_d: any, i: number) =>
                            handleDoubleClick(`ins-${ins.label}-${i}`, `${ins.label} - ${i === 0 ? "Covered" : "Not Covered"}`,
                              () => onExport("insurance", ins.label, `Insurance-${ins.label}`))}
                          style={{ cursor: "pointer" }}>
                          <Cell fill="#10b981" />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                        <Tooltip content={<PieTooltipContent total={t} active={undefined} payload={undefined} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-center text-2xl font-black text-slate-900 -mt-2">{pct}%</p>
                    <p className="text-center text-xs text-slate-500">coverage rate</p>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-emerald-600 font-medium">✓ {ins.covered.toLocaleString()} covered</span>
                      <span className="text-slate-400">{ins.notCovered.toLocaleString()} not</span>
                    </div>
                  </ChartCard>
                );
              })}
            </div>

            
          </>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No insurance data available. Ensure profiles have completed Section 6 (Insurance).
          </div>
        )}
      </section>

      {/* ── 7. Documentation Status ──────────────────────────────── */}
      <section>
        <SectionHeader icon={FileText} title="Documentation Status" subtitle="Aadhaar, PAN, Voter ID, Land Records, Driving Licence" color={COLORS.rose} />
        {data.documents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {data.documents.map((doc: { label: string; yes: number; no: number; unknown: number }) => {
                const t = (doc.yes + doc.no + doc.unknown) || 1;
                const pct = Math.round(doc.yes / t * 100);
                return (
                  <div key={doc.label}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-rose-300 transition-all"
                    onClick={() => handleDoubleClick(`doc-${doc.label}`, `Document: ${doc.label}`, () => onExport("document", doc.label, `Document-${doc.label}`))}
                    title="Double-click to export">
                    <p className="text-xs text-slate-500 font-medium mb-2">{doc.label}</p>
                    <p className="text-3xl font-black text-slate-900">{pct}%</p>
                    <p className="text-xs text-slate-400 mb-3">verified</p>
                    <div className="space-y-1.5">
                      {[
                        { label: "Yes",     val: doc.yes,     color: "#22c55e" },
                        { label: "No",      val: doc.no,      color: "#ef4444" },
                        { label: "Unknown", val: doc.unknown, color: "#94a3b8" },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: row.color }}>{row.label}</span>
                          <span className="text-xs font-bold" style={{ color: row.color }}>{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <ChartCard title="Document Verification Comparison" subtitle="Yes / No / Unknown across all documents" className="mt-5"
              onDownload={() => onExport("document", "", "Documents-All")} downloading={exportLoading}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={docCompare} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltipContent />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  <Bar dataKey="Yes"     fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a"
                    onClick={(d: any) => handleDoubleClick(`docb-${d.name}`, `${d.name} Yes`, () => onExport("document", d.name, `Document-${d.name}`))}
                    style={{ cursor: "pointer" }} />
                  <Bar dataKey="No"      fill="#ef4444" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="Unknown" fill="#cbd5e1" radius={[0, 0, 4, 4]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No document data available. Ensure profiles have completed Section 6 (Documents).
          </div>
        )}
      </section>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab]         = useState<"general" | "advanced">("general");
  const [data, setData]                   = useState<EnhancedReport | null>(null);
  const [advancedData, setAdvancedData]   = useState<AdvancedReport | null>(null);
  const [loading, setLoading]             = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [error, setError]                 = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Fetch general report ──────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const result = await api.get("/sangha/reports/enhanced");
      setData(result);
    } catch {
      setError(true); setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch advanced report ─────────────────────────────────
  const fetchAdvancedData = useCallback(async () => {
    setAdvancedLoading(true);
    try {
      const result = await api.get("/sangha/reports/advanced");
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab]); // eslint-disable-line

  // ── Excel export ──────────────────────────────────────────
  const handleExport = useCallback(async (category: string, filter: string, label: string) => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const rows = await api.post("/sangha/reports/export", { category, filter });
      if (!rows?.length) {
        alert("No data found for this selection.");
        return;
      }
      await downloadExcel(rows, label, label.slice(0, 31));
    } catch (e) {
      console.error("Export error", e);
      alert("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  }, [exportLoading]);

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm">Could not load report data.</p>
        <Button variant="outline" size="sm" onClick={fetchData}
          className="gap-2 border-slate-200 text-slate-600 hover:border-sky-500 hover:text-sky-600 bg-white">
          <RefreshCw className="w-4 h-4" />Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          </div>
          <p className="text-slate-500 text-sm ml-7">
            Deep insights into your Sangha's registration pipeline and community demographics
          </p>
        </div>

        {/* Export loading indicator */}
        {exportLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 w-fit">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing Excel download…
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
          {[
            { id: "general"  as const, label: "General Dashboard",   icon: LayoutDashboard },
            { id: "advanced" as const, label: "Advanced Analytics",   icon: BarChart2       },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-0.5" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "general" ? (
          <GeneralDashboard
            data={data}
            onRefresh={fetchData}
            onExport={handleExport}
            exportLoading={exportLoading}
          />
        ) : (
          <AdvancedDashboard
            data={advancedData}
            onExport={handleExport}
            exportLoading={exportLoading}
            loading={advancedLoading}
          />
        )}
      </div>
    </div>
  );
}
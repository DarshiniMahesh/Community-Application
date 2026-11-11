// Community-Application\sangha\src\app\sangha\reports\GeneralDashboard.tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Users, CheckCircle2, Clock,
  AlertCircle, RefreshCw, FileSpreadsheet, Loader2,
  ArrowRight, MapPin, GraduationCap, Wallet, Shield, Activity,
  UserCheck, UserX, BookOpen, BarChart2,
} from "lucide-react";
import { EnhancedReport } from "./page";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function n(s: string | number | undefined | null): number {
  const v = typeof s === "number" ? s : parseInt(s ?? "0", 10);
  return Number.isFinite(v) ? v : 0;
}
export function calcPct(value: string | number, total: number): number {
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
  if (pct > 0) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" />+{pct}% vs prev period</span>;
  if (pct < 0) return <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium"><TrendingDown className="w-3 h-3" />{pct}% vs prev period</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" />Unchanged</span>;
}

const PieTooltipContent = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500 mt-1">{value.toLocaleString()} · <span className="text-sky-600 font-bold">{pct}%</span></p>
    </div>
  );
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />;
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  icon: Icon, color, bg, title, value, pct,
  onArrow, arrowLabel,
  onExcel, excelLoading,
  children,
}: {
  icon: any; color: string; bg: string; title: string; value?: number; pct?: number;
  onArrow?: () => void; arrowLabel?: string;
  onExcel?: () => void; excelLoading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl ${bg}`}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          {onExcel && (
            <button
              onClick={onExcel}
              disabled={excelLoading}
              title="Go to Custom Report"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-40"
            >
              {excelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          {onArrow && (
            <button
              onClick={onArrow}
              title={arrowLabel || "View detailed analytics"}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Details</span>
            </button>
          )}
        </div>
      </div>
      <div>
        <div>
          
  <p className="text-sm font-semibold text-slate-700 mt-1">{title}</p></div>
        
        {pct !== undefined && (
          <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Status KPI Card (with Details + Excel) ────────────────────────────────────
function StatusKpiCard({
  icon: Icon, color, bg, label, value, pct, total,
  onDetails, onExport,
}: {
  icon: any; color: string; bg: string; label: string;
  value: number; pct: number; total: number;
  onDetails: () => void; onExport: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${bg}`}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{pct}%</span>
      </div>

      <p className="text-3xl font-black tabular-nums" style={{ color }}>
        {value.toLocaleString()}
      </p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{label}</p>

      <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onDetails}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border border-slate-200
            text-slate-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all font-medium"
        >
          <BarChart2 className="w-3 h-3" />
          Details
        </button>
        <button
          onClick={onExport}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border border-slate-200
            text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-medium"
        >
          <FileSpreadsheet className="w-3 h-3" />
          Excel
        </button>
      </div>
    </div>
  );
}

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface Props {
  data: EnhancedReport | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onGoToAdvanced: (section?: string) => void;
  /**
   * sections  → Custom Report sections to open
   * category  → status to pre-filter by: "approved" | "pending" | "changes_requested" | "rejected" | "all"
   *             (any other value, e.g. an analytics section name, keeps the default approved-only view)
   */
  onGoToCustomReport: (sections: string[], category?: string) => void;
}

export default function GeneralDashboard({
  data, loading, error, onRefresh, onGoToAdvanced, onGoToCustomReport,
}: Props) {

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 text-sm">Could not load report data.</p>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />Retry
        </Button>
      </div>
    );
  }

  const { counts, trends } = data;

  // Supported report statuses only: approved, pending, changes requested, rejected.
  // Total is the sum of these four so every figure on the dashboard is consistent.
  const approvedCount = n(counts.approved);
  const pendingCount  = n(counts.pending);
  const changesCount  = n(counts.changes_requested);
  const rejectedCount = n(counts.rejected);
  const total = approvedCount + pendingCount + changesCount + rejectedCount;

  const pieData = [
    { name: "Approved",  value: approvedCount, color: "#10b981" },
    { name: "Pending",   value: pendingCount,  color: "#f59e0b" },
    { name: "Changes",   value: changesCount,  color: "#f97316" },
    { name: "Rejected",  value: rejectedCount, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const statusKpiCards = [
    {
      icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50",
      label: "Approved",        value: approvedCount, status: "approved",
    },
    {
      icon: Clock, color: "#f59e0b", bg: "bg-amber-50",
      label: "Pending Review",  value: pendingCount,  status: "pending",
    },
    {
      icon: UserCheck, color: "#f97316", bg: "bg-orange-50",
      label: "Changes Needed",  value: changesCount,  status: "changes_requested",
    },
    {
      icon: UserX, color: "#ef4444", bg: "bg-red-50",
      label: "Rejected",        value: rejectedCount, status: "rejected",
    },
  ];

 // Update analyticsCards to use real counts from sectionCounts
const sc = data.sectionCounts ?? {};

const analyticsCards = [
  {
    icon: Users, color: "#0ea5e9", bg: "bg-sky-50",
    title: "Personal Information", value: sc.personalDetails ?? approvedCount,
    section: "demographics",
    excelSections: ["personal-details"],
  },
  {
    icon: MapPin, color: "#14b8a6", bg: "bg-teal-50",
    title: "Location Distribution", value: sc.locationInformation ?? 0,
    section: "geographic",
    excelSections: ["location-information"],
  },
  {
    icon: GraduationCap, color: "#8b5cf6", bg: "bg-violet-50",
    title: "Education & Profession", value: sc.educationProfession ?? 0,
    section: "education",
    excelSections: ["education-profession"],
  },
  {
    icon: Wallet, color: "#f59e0b", bg: "bg-amber-50",
    title: "Economic Details", value: sc.economicDetails ?? 0,
    section: "economic",
    excelSections: ["economic-details"],
  },
  {
    icon: Shield, color: "#10b981", bg: "bg-emerald-50",
    title: "Insurance Coverage", value: sc.insuranceCoverage ?? 0,
    section: "insurance",
    excelSections: ["insurance-coverage"],
  },
  {
    icon: Activity, color: "#f43f5e", bg: "bg-rose-50",
    title: "Documentation Status", value: sc.documentationStatus ?? 0,
    section: "documents",
    excelSections: ["personal-details"],
  },
  {
    icon: BookOpen, color: "#a855f7", bg: "bg-purple-50",
    title: "Religious Details", value: sc.religiousDetails ?? 0,
    section: "religious",
    excelSections: ["religious-details"],
  },
];

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh}
          className="gap-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />Refresh
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => onGoToCustomReport(
            ["personal-details","economic-details","education-profession","family-information","location-information","religious-details"],
            "all"
          )}
          className="gap-2 border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 bg-white shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export All (Custom Report)
        </Button>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0ea5e910_0%,_transparent_60%)]" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-sky-100" />
        <div className="relative px-7 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sky-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Total users Registered</p>
              <p className="text-7xl font-black tabular-nums leading-none text-slate-900 tracking-tight">
                {total.toLocaleString()}
              </p>
              <div className="mt-3">
                <TrendBadge current={n(trends.total_last30)} previous={n(trends.total_prev30)} />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center min-w-[100px] shadow-sm">
                <p className="text-3xl font-bold text-slate-900">{n(trends.total_last30)}</p>
                <p className="text-sky-600 text-xs mt-1 font-medium">In period</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-center min-w-[100px]">
                <p className="text-3xl font-bold text-slate-500">{n(trends.total_prev30)}</p>
                <p className="text-slate-500 text-xs mt-1">Prev period</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status KPI Cards — with Details + Excel buttons ── */}
      {/* Excel passes the card's status ("approved" | "pending" | "changes_requested" | "rejected")
          so the Custom Report opens pre-filtered to exactly that status. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusKpiCards.map(card => {
          const pct = calcPct(card.value, total);
          return (
            <StatusKpiCard
              key={card.label}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
              label={card.label}
              value={card.value}
              pct={pct}
              total={total}
              onDetails={() => onGoToAdvanced("status")}
              onExport={() => onGoToCustomReport(["personal-details"], card.status)}
            />
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Pie — with Export button */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Status Distribution</p>
              <p className="text-xs text-slate-500">Registration pipeline breakdown</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Export button on pie */}
              <button
                onClick={() => onGoToCustomReport(["personal-details"], "all")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                  hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                title="Export to Custom Report"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => onGoToAdvanced("status")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                  hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Details</span>
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="46%" innerRadius={60} outerRadius={88}
                paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#ffffff">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<PieTooltipContent total={total} active={undefined} payload={undefined} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

     

      {/* Analytics Section Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-base font-bold text-slate-900">Community Analytics Overview</p>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            Click arrows for detailed views
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsCards.map(card => (
            <SectionCard
              key={card.title}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
              title={card.title}
              
              
              onArrow={() => onGoToAdvanced(card.section)}
              arrowLabel={`View ${card.title}`}
              onExcel={() => onGoToCustomReport(card.excelSections, card.section)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
// Community-Application\sangha\src\app\sangha\reports\GeneralDashboard.tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Users, CheckCircle2, Clock,
  AlertCircle, FileEdit, RefreshCw, FileSpreadsheet, Loader2,
  ArrowRight, MapPin, GraduationCap, Wallet, Shield, Activity,
  UserCheck, UserX, BookOpen,
} from "lucide-react";
import { EnhancedReport } from "./page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function n(s: string | undefined | null): number {
  return parseInt(s ?? "0", 10) || 0;
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
  if (pct > 0) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" />+{pct}% vs last month</span>;
  if (pct < 0) return <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium"><TrendingDown className="w-3 h-3" />{pct}% vs last month</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" />Unchanged</span>;
}

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
    </div>
  );
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />;
}

// ─── Section Card with Navigate Arrow ─────────────────────────────────────────

function SectionCard({
  icon: Icon, color, bg, title, value, pct,
  onArrow, arrowLabel,
  onExcel, excelLoading,
  children,
}: {
  icon: any; color: string; bg: string; title: string; value: number; pct?: number;
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
        <p className="text-3xl font-black tabular-nums" style={{ color }}>{value.toLocaleString()}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{title}</p>
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

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
  data: EnhancedReport | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onGoToAdvanced: (section?: string) => void;
  onGoToCustomReport: (sections: string[], category?: string) => void;
}

export default function GeneralDashboard({ data, loading, error, onRefresh, onGoToAdvanced, onGoToCustomReport }: Props) {

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

  const { counts, trends, dailyRegistrations } = data;
  const total = n(counts.total);

  const pieData = [
    { name: "Approved",  value: n(counts.approved),         color: "#10b981" },
    { name: "Pending",   value: n(counts.pending),           color: "#f59e0b" },
    { name: "Changes",   value: n(counts.changes_requested), color: "#f97316" },
    { name: "Rejected",  value: n(counts.rejected),          color: "#ef4444" },
    { name: "Draft",     value: n(counts.draft),             color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const chartData = dailyRegistrations.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    Registrations: n(d.registrations),
    Approvals: n(d.approvals),
    Rejections: n((d as any).rejections ?? "0"),
  }));

  const analyticsCards = [
    {
      icon: Users, color: "#0ea5e9", bg: "bg-sky-50",
      title: "Demographics", value: total,
      section: "demographics", label: "View Demographics",
      excelSections: ["personal-details"],
    },
    {
      icon: MapPin, color: "#14b8a6", bg: "bg-teal-50",
      title: "Location Distribution", value: n(counts.approved),
      section: "geographic", label: "View Location Analytics",
      excelSections: ["location-information"],
    },
    {
      icon: GraduationCap, color: "#8b5cf6", bg: "bg-violet-50",
      title: "Education & Profession", value: n(counts.approved),
      section: "education", label: "View Education Analytics",
      excelSections: ["education-profession"],
    },
    {
      icon: Wallet, color: "#f59e0b", bg: "bg-amber-50",
      title: "Economic Details", value: n(counts.approved),
      section: "economic", label: "View Economic Analytics",
      excelSections: ["economic-details"],
    },
    {
      icon: Shield, color: "#10b981", bg: "bg-emerald-50",
      title: "Insurance Coverage", value: n(counts.approved),
      section: "insurance", label: "View Insurance Analytics",
      excelSections: ["family-information"],
    },
    {
      icon: Activity, color: "#f43f5e", bg: "bg-rose-50",
      title: "Documentation Status", value: n(counts.approved),
      section: "documents", label: "View Document Analytics",
      excelSections: ["personal-details"],
    },
    // ── NEW: Religious Details card ──────────────────────────────────────────
    {
      icon: BookOpen, color: "#a855f7", bg: "bg-purple-50",
      title: "Religious Details", value: n(counts.approved),
      section: "religious", label: "View Religious Analytics",
      excelSections: ["religious-details"],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />Refresh
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => onGoToCustomReport(
            ["personal-details", "economic-details", "education-profession", "family-information", "location-information", "religious-details"],
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
              <p className="text-sky-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Total Families Registered</p>
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

      {/* Status KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", label: "Approved", value: n(counts.approved), section: "demographics" as const },
          { icon: Clock, color: "#f59e0b", bg: "bg-amber-50", label: "Pending Review", value: n(counts.pending), section: "demographics" as const },
          { icon: UserCheck, color: "#f97316", bg: "bg-orange-50", label: "Changes Needed", value: n(counts.changes_requested), section: "demographics" as const },
          { icon: UserX, color: "#ef4444", bg: "bg-red-50", label: "Rejected", value: n(counts.rejected), section: "demographics" as const },
        ].map(card => {
          const pct = calcPct(card.value, total);
          return (
            <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all hover:shadow-md">
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
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: card.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Pie */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Status Distribution</p>
              <p className="text-xs text-slate-500">Registration pipeline breakdown</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("demographics")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
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

        {/* Area Chart — includes Rejections */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Registration Trend — Last 30 Days</p>
              <p className="text-xs text-slate-500">Registrations, approvals & rejections</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("demographics")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
          </div>
          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No activity in the last 30 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
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
                  <linearGradient id="gradRej" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<AreaTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Area type="monotone" dataKey="Registrations" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gradRegs)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Approvals" stroke="#10b981" strokeWidth={2.5} fill="url(#gradApps)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Rejections" stroke="#ef4444" strokeWidth={2} fill="url(#gradRej)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Approval Rate", value: `${calcPct(counts.approved, total)}%`, sub: "of total profiles", color: "#10b981" },
          { label: "Rejection Rate", value: `${calcPct(counts.rejected, total)}%`, sub: "of submitted profiles", color: "#ef4444" },
          { label: "Incomplete Drafts", value: n(counts.draft).toLocaleString(), sub: "not yet submitted", color: "#64748b" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{s.label}</p>
            <p className="text-3xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Analytics Section Cards — each with arrow to advanced + export to custom report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-base font-bold text-slate-900">Community Analytics Overview</p>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Click arrows for detailed views</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsCards.map(card => (
            <SectionCard
              key={card.title}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
              title={card.title}
              value={card.value}
              pct={calcPct(card.value, total)}
              onArrow={() => onGoToAdvanced(card.section)}
              arrowLabel={card.label}
              onExcel={() => onGoToCustomReport(card.excelSections, card.section)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
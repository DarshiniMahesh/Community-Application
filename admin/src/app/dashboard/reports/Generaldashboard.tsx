// Community-Application\admin\src\app\dashboard\reports\GeneralDashboard.tsx
"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Users, CheckCircle2, Clock,
  AlertCircle, FileEdit, RefreshCw, FileSpreadsheet, Loader2,
  ArrowRight, Shield, Building2, UserCheck, UserX, Activity,
} from "lucide-react";
import { OverviewData, DateRegData } from "./page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(s: string | number | undefined | null): number {
  return parseInt(String(s ?? "0"), 10) || 0;
}
function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />
  );
}

// ─── Tooltip components ───────────────────────────────────────────────────────

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
  const p = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500 mt-1">
        {value.toLocaleString()} ·{" "}
        <span className="text-orange-600 font-bold">{p}%</span>
      </p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold text-slate-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── TrendBadge ───────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (current === 0 && previous === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="w-3 h-3" />No change
      </span>
    );
  if (previous === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <TrendingUp className="w-3 h-3" />New activity
      </span>
    );
  const diff = Math.round(((current - previous) / previous) * 100);
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <TrendingUp className="w-3 h-3" />+{diff}% vs prev period
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
        <TrendingDown className="w-3 h-3" />{diff}% vs prev period
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Minus className="w-3 h-3" />Unchanged
    </span>
  );
}

// ─── SectionCard (analytics overview cards) ───────────────────────────────────

function SectionCard({
  icon: Icon, color, bg, title, value, pctVal,
  onArrow, arrowLabel, onExcel,
}: {
  icon: any; color: string; bg: string; title: string; value: number; pctVal?: number;
  onArrow?: () => void; arrowLabel?: string; onExcel?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:border-orange-200 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl ${bg}`}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          {onExcel && (
            <button
              onClick={onExcel}
              title="Export to Custom Report"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          {onArrow && (
            <button
              onClick={onArrow}
              title={arrowLabel || "View detailed analytics"}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400
                hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Details</span>
            </button>
          )}
        </div>
      </div>
      <div>
        <p className="text-3xl font-black tabular-nums" style={{ color }}>
          {value.toLocaleString()}
        </p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{title}</p>
        {pctVal !== undefined && (
          <div className="mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${pctVal}%`, backgroundColor: color }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  overview: OverviewData | null;
  dateReg: DateRegData | null;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onGoToAdvanced: (section?: string) => void;
  onGoToCustomReport: (sections: string[], category?: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeneralDashboard({
  overview, dateReg, loading, error, onRefresh,
  onGoToAdvanced, onGoToCustomReport,
}: Props) {
  if (loading && !overview) {
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

  if (error || !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 text-sm">Could not load report data.</p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />Retry
        </button>
      </div>
    );
  }

  const u = overview.users;
  const s = overview.sangha;
  const br = overview.by_reviewer;
  const gs = overview.gender_status;

  const totalUsers = u.registered;

  // ── Pie: user status distribution ────────────────────────
  const statusPieData = [
    { name: "Approved",  value: u.approved,          color: "#10b981" },
    { name: "Rejected",  value: u.rejected,           color: "#ef4444" },
    { name: "Changes",   value: u.changes_requested,  color: "#f97316" },
  ].filter((d) => d.value > 0);

  // ── Area chart: registration trend ───────────────────────
  const userRegs = dateReg?.user_registrations ?? [];
  const sanghaRegs = dateReg?.sangha_registrations ?? [];

  // Merge by date
  const dateMap: Record<string, { Users: number; Sanghas: number }> = {};
  userRegs.forEach((r) => {
    const label = new Date(r.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    if (!dateMap[label]) dateMap[label] = { Users: 0, Sanghas: 0 };
    dateMap[label].Users = n(r.count);
  });
  sanghaRegs.forEach((r) => {
    const label = new Date(r.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    if (!dateMap[label]) dateMap[label] = { Users: 0, Sanghas: 0 };
    dateMap[label].Sanghas = n(r.count);
  });
  const chartData = Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals }));

  // ── Bar chart: reviewer breakdown ─────────────────────────
  const reviewerData = [
    { name: "Admin Approved",  count: br.admin_approved,  fill: "#10b981" },
    { name: "Sangha Approved", count: br.sangha_approved, fill: "#0ea5e9" },
    { name: "Admin Rejected",  count: br.admin_rejected,  fill: "#ef4444" },
    { name: "Sangha Rejected", count: br.sangha_rejected, fill: "#f97316" },
  ];

  // ── Gender × status bar chart data ───────────────────────
  const genderData = ["male", "female", "other"].map((g) => ({
    name: g.charAt(0).toUpperCase() + g.slice(1),
    Approved: n(gs.find((r) => r.gender === g && r.status === "approved")?.count),
    Rejected: n(gs.find((r) => r.gender === g && r.status === "rejected")?.count),
    Changes:  n(gs.find((r) => r.gender === g && r.status === "changes_requested")?.count),
  }));

  // ── Analytics overview cards ──────────────────────────────
  const analyticsCards = [
    {
      icon: Users, color: "#f97316", bg: "bg-orange-50",
      title: "Population & Demographics", value: totalUsers,
      section: "population", excelSections: ["personal"],
    },
    {
      icon: Activity, color: "#8b5cf6", bg: "bg-violet-50",
      title: "Age Group Analysis", value: u.approved,
      section: "age", excelSections: ["personal"],
    },
    {
      icon: Building2, color: "#14b8a6", bg: "bg-teal-50",
      title: "Geo Distribution", value: u.approved,
      section: "geo", excelSections: ["personal"],
    },
    {
      icon: FileEdit, color: "#f59e0b", bg: "bg-amber-50",
      title: "Education & Profession", value: u.approved,
      section: "education", excelSections: ["education"],
    },
    {
      icon: Shield, color: "#10b981", bg: "bg-emerald-50",
      title: "Insurance Coverage", value: u.approved,
      section: "insurance", excelSections: ["insurance"],
    },
    {
      icon: FileSpreadsheet, color: "#f43f5e", bg: "bg-rose-50",
      title: "Document Status", value: u.approved,
      section: "documents", excelSections: ["documents"],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-orange-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />Refresh
        </button>
        <button
          onClick={() =>
            onGoToCustomReport(["personal", "economic", "education", "family", "documents", "insurance"], "all")
          }
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 bg-white rounded-xl text-sm font-medium shadow-sm transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export All (Custom Report)
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#f9731610_0%,_transparent_60%)]" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-orange-100" />
        <div className="relative px-7 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-orange-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">
                Total Users Registered (This Period)
              </p>
              <p className="text-7xl font-black tabular-nums leading-none text-slate-900 tracking-tight">
                {totalUsers.toLocaleString()}
              </p>
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <span className="text-sm text-slate-500">
                  <span className="font-bold text-emerald-600">{u.approved}</span> approved ·{" "}
                  <span className="font-bold text-rose-600">{u.rejected}</span> rejected ·{" "}
                  <span className="font-bold text-orange-500">{u.changes_requested}</span> changes req.
                </span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-center min-w-[100px] shadow-sm">
                <p className="text-3xl font-bold text-violet-600">{s.registered}</p>
                <p className="text-violet-500 text-xs mt-1 font-medium">Sanghas Registered</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-center min-w-[100px]">
                <p className="text-3xl font-bold text-amber-500">{s.pending}</p>
                <p className="text-slate-500 text-xs mt-1">Sangha Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Status KPI Cards */}
      <div>
        <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">User Application Status</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", label: "Approved",          value: u.approved         },
            { icon: Clock,        color: "#f59e0b", bg: "bg-amber-50",   label: "Changes Requested", value: u.changes_requested },
            { icon: UserX,        color: "#ef4444", bg: "bg-red-50",     label: "Rejected",          value: u.rejected         },
            { icon: UserCheck,    color: "#f97316", bg: "bg-orange-50",  label: "Registered (Period)",value: u.registered       },
          ].map((card) => {
            const p = pct(card.value, totalUsers || 1);
            return (
              <div
                key={card.label}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-200 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-xl ${card.bg}`}>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    {p}%
                  </span>
                </div>
                <p className="text-3xl font-black tabular-nums" style={{ color: card.color }}>
                  {card.value.toLocaleString()}
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{card.label}</p>
                <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${p}%`, backgroundColor: card.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sangha KPI Cards */}
      <div>
        <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Sangha Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Registered",  value: s.registered, color: "#7c3aed" },
            { label: "Approved",    value: s.approved,   color: "#10b981" },
            { label: "Rejected",    value: s.rejected,   color: "#ef4444" },
            { label: "Pending",     value: s.pending,    color: "#f59e0b" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm"
            >
              <p className="text-3xl font-black" style={{ color: card.color }}>
                {card.value.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Status Pie */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">User Status Distribution</p>
              <p className="text-xs text-slate-500">Approval pipeline breakdown</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("gender-status")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%" cy="46%"
                innerRadius={60} outerRadius={88}
                paddingAngle={3} dataKey="value"
                strokeWidth={2} stroke="#ffffff"
              >
                {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<PieTooltipContent total={totalUsers} active={undefined} payload={undefined} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Registration Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Registration Trend</p>
              <p className="text-xs text-slate-500">Users &amp; Sanghas over selected period</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("population")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
          </div>
          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No activity in selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSanghas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<AreaTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Area type="monotone" dataKey="Users" stroke="#f97316" strokeWidth={2.5} fill="url(#gradUsers)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Sanghas" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gradSanghas)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Reviewer Breakdown + Gender × Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Reviewer breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Decisions by Reviewer</p>
              <p className="text-xs text-slate-500">Admin vs Sangha reviewer breakdown</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("gender-status")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reviewerData} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Count">
                {reviewerData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender × Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Gender × Application Status</p>
              <p className="text-xs text-slate-500">Approval & rejection breakdown by gender</p>
            </div>
            <button
              onClick={() => onGoToAdvanced("gender-status")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-slate-200 text-slate-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />Details
            </button>
          </div>
          {gs.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No gender data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={genderData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="Rejected" fill="#ef4444" stackId="a" />
                <Bar dataKey="Changes"  fill="#f97316" radius={[0, 0, 4, 4]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Approval Rate",
            value: `${pct(u.approved, totalUsers || 1)}%`,
            sub: "of registered users",
            color: "#10b981",
          },
          {
            label: "Rejection Rate",
            value: `${pct(u.rejected, totalUsers || 1)}%`,
            sub: "of registered users",
            color: "#ef4444",
          },
          {
            label: "Sangha Approval Rate",
            value: `${pct(s.approved, s.registered || 1)}%`,
            sub: "of registered sanghas",
            color: "#7c3aed",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{stat.label}</p>
            <p className="text-3xl font-black mt-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
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
          {analyticsCards.map((card) => (
            <SectionCard
              key={card.title}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
              title={card.title}
              value={card.value}
              pctVal={pct(card.value, totalUsers || 1)}
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
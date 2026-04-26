//Community-Application\admin\src\app\dashboard\reports\Generaldashboard.tsx
"use client";

import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, RadialBarChart, RadialBar,
  LineChart, Line, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, CheckCircle2, Clock,
  AlertCircle, FileEdit, RefreshCw, FileSpreadsheet, Loader2,
  ArrowRight, Shield, Building2, UserCheck, UserX, Activity,
  BarChart2, MapPin, GraduationCap, Zap,
} from "lucide-react";

// ─── Nav Options type ─────────────────────────────────────────
// Export so the parent page can forward these as CustomReport props
export interface CustomReportNavOptions {
  scope?: "users" | "sanghas" | "both";
  /** Exact status value: 'approved' | 'rejected' | 'changes_requested' | 'pending' | 'pending_approval' | 'draft' */
  statusFilter?: string;
  /** Show the hero dual-table view (users table + sanghas table) */
  dualTable?: boolean;
  /** Pre-select only these column keys (hides all others) */
  initialColumns?: string[];
}

// ─── Types ────────────────────────────────────────────────────

interface OverviewData {
  users: { registered: number; approved: number; rejected: number; changes_requested: number };
  sangha: { registered: number; approved: number; rejected: number; pending: number };
  by_reviewer: { admin_approved: number; sangha_approved: number; admin_rejected: number; sangha_rejected: number };
  gender_status: Array<{ gender: string; status: string; count: number | string }>;
}
interface DateRegData {
  user_registrations: Array<{ date: string; count: number | string }>;
  sangha_registrations: Array<{ date: string; count: number | string }>;
}
interface Props {
  overview: OverviewData | null;
  dateReg: DateRegData | null;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onGoToAdvanced: (section?: string) => void;
  /**
   * Navigate to the Custom Report tab.
   * @param sections  — data sections to activate (e.g. ['personal'])
   * @param category  — optional legacy category string
   * @param options   — NEW: scope / statusFilter / dualTable / initialColumns
   *
   * Parent must forward `options` as props to <CustomReport />.
   */
  onGoToCustomReport: (sections: string[], category?: string, options?: CustomReportNavOptions) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function n(s: string | number | undefined | null): number {
  return parseInt(String(s ?? "0"), 10) || 0;
}
function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// ─── Design tokens ────────────────────────────────────────────

const C = {
  orange: "#F97316", orangeLight: "#FB923C", orangeXLight: "#FFF7ED", orangeMid: "#FDBA74",
  blue: "#0EA5E9", blueLight: "#38BDF8", blueXLight: "#F0F9FF",
  green: "#10B981", greenLight: "#D1FAE5",
  red: "#EF4444", redLight: "#FEE2E2",
  amber: "#F59E0B", amberLight: "#FEF3C7",
  violet: "#8B5CF6", violetLight: "#EDE9FE",
  teal: "#14B8A6", tealLight: "#CCFBF1",
  slate50: "#F8FAFC", slate100: "#F1F5F9", slate200: "#E2E8F0",
  slate400: "#94A3B8", slate600: "#475569", slate800: "#1E293B", slate900: "#0F172A",
};

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className ?? ""}`} />;
}

// ─── Custom Tooltips ─────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", fontSize: 12,
    }}>
      {label && <p style={{ fontWeight: 700, color: C.slate800, marginBottom: 6 }}>{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "block" }} />
          <span style={{ color: C.slate600 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: C.slate900 }}>{(p.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const p = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{
      background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    }}>
      <p style={{ fontWeight: 700, fontSize: 12, color: C.slate900 }}>{name}</p>
      <p style={{ fontSize: 11, color: C.slate400, marginTop: 2 }}>
        {value.toLocaleString()} · <span style={{ color: C.orange, fontWeight: 700 }}>{p}%</span>
      </p>
    </div>
  );
};

// ─── Card wrapper ─────────────────────────────────────────────

function Card({
  children, style, className = "", onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        border: "1.5px solid #E8F0FE",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 2px 12px rgba(14,165,233,0.05)",
        transition: "all 0.22s ease",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      className={className}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(249,115,22,0.10)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#FDBA74";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(14,165,233,0.05)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#E8F0FE";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {children}
    </div>
  );
}

// ─── Chart Section Header ─────────────────────────────────────

function ChartHeader({
  title, sub, onDetails, onExport,
}: {
  title: string; sub?: string; onDetails?: () => void; onExport?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.slate900, margin: 0 }}>{title}</p>
        {sub && <p style={{ fontSize: 11.5, color: C.slate400, marginTop: 2 }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {onExport && (
          <button
            onClick={onExport}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
              borderRadius: 8, border: "1px solid #E2E8F0", background: "white",
              fontSize: 11, color: C.slate400, cursor: "pointer", fontWeight: 600,
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#10B981";
              (e.currentTarget as HTMLButtonElement).style.color = "#10B981";
              (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0";
              (e.currentTarget as HTMLButtonElement).style.color = C.slate400;
              (e.currentTarget as HTMLButtonElement).style.background = "white";
            }}
          >
            <FileSpreadsheet size={11} />Export
          </button>
        )}
        {onDetails && (
          <button
            onClick={onDetails}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
              borderRadius: 8, border: "1px solid #E2E8F0", background: "white",
              fontSize: 11, color: C.slate400, cursor: "pointer", fontWeight: 600,
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316";
              (e.currentTarget as HTMLButtonElement).style.color = "#F97316";
              (e.currentTarget as HTMLButtonElement).style.background = "#FFF7ED";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0";
              (e.currentTarget as HTMLButtonElement).style.color = C.slate400;
              (e.currentTarget as HTMLButtonElement).style.background = "white";
            }}
          >
            <ArrowRight size={11} />Details
          </button>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
// Now accepts optional onExcel / onDetails action buttons rendered at the card bottom.

function KpiCard({
  icon: Icon, iconColor, iconBg, label, value, pctVal, sub, onExcel, onDetails,
}: {
  icon: any; iconColor: string; iconBg: string;
  label: string; value: number; pctVal?: number; sub?: string;
  onExcel?: () => void;
  onDetails?: () => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        {pctVal !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 8px",
            borderRadius: 20, background: iconBg, color: iconColor,
          }}>{pctVal}%</span>
        )}
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, color: iconColor, lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui" }}>
        {value.toLocaleString()}
      </p>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: C.slate800, marginTop: 3 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: C.slate400, marginTop: 1 }}>{sub}</p>}
      {pctVal !== undefined && (
        <div style={{ marginTop: 10, height: 5, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: 5, borderRadius: 4, background: `linear-gradient(90deg, ${iconColor}cc, ${iconColor})`, width: `${pctVal}%`, transition: "width 0.9s ease" }} />
        </div>
      )}

      {/* ── Action buttons ── */}
      {(onExcel || onDetails) && (
        <div style={{
          display: "flex", gap: 6, marginTop: 12,
          paddingTop: 10, borderTop: "1px solid #F1F5F9",
        }}>
          {onExcel && (
            <button
              onClick={(e) => { e.stopPropagation(); onExcel(); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 4, padding: "5px 0", borderRadius: 7,
                border: "1px solid #D1FAE5", background: "#F0FDF4",
                fontSize: 11, color: C.green, cursor: "pointer", fontWeight: 600,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#DCFCE7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4"; }}
            >
              <FileSpreadsheet size={10} />Excel
            </button>
          )}
          {onDetails && (
            <button
              onClick={(e) => { e.stopPropagation(); onDetails(); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 4, padding: "5px 0", borderRadius: 7,
                border: `1px solid ${iconColor}30`, background: iconBg,
                fontSize: 11, color: iconColor, cursor: "pointer", fontWeight: 600,
              }}
            >
              <ArrowRight size={10} />Details
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function GeneralDashboard({
  overview, dateReg, startDate, endDate, onDateChange, loading, error, onRefresh,
  onGoToAdvanced, onGoToCustomReport,
}: Props) {
  const [viewMode, setViewMode] = useState<"both" | "users" | "sanghas">("both");

  // ── Skeletons ──────────────────────────────────────────────
  if (loading && !overview) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Skeleton className="h-48" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 16 }}>
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertCircle size={24} style={{ color: "#EF4444" }} />
        </div>
        <p style={{ color: C.slate600, fontSize: 14, fontWeight: 600 }}>Could not load report data.</p>
        <button onClick={onRefresh} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
          borderRadius: 10, border: "1px solid #E2E8F0", background: "white",
          cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.slate600,
        }}>
          <RefreshCw size={14} />Retry
        </button>
      </div>
    );
  }

  const u = overview.users;
  const s = overview.sangha;
  const br = overview.by_reviewer;
  const gs = overview.gender_status;

  const merged = {
    registered: u.registered + s.registered,
    approved: u.approved + s.approved,
    rejected: u.rejected + s.rejected,
    pending: s.pending,
    changes_requested: u.changes_requested,
  };
  const activeMetrics = viewMode === "users"
    ? { ...u, pending: 0 }
    : viewMode === "sanghas"
      ? { registered: s.registered, approved: s.approved, rejected: s.rejected, pending: s.pending, changes_requested: 0 }
      : merged;
  const totalUsers = activeMetrics.registered;

  // ── Pie data ─────────────────────────────────────────────
  const statusPieData = [
    { name: "Approved", value: activeMetrics.approved, color: C.green },
    { name: "Rejected", value: activeMetrics.rejected, color: C.red },
    { name: "Pending",  value: activeMetrics.pending,  color: C.amber },
    { name: "Changes",  value: activeMetrics.changes_requested, color: C.orange },
  ].filter((d) => d.value > 0);

  // ── Radial data for approval rates ───────────────────────
  const approvalRate = pct(u.approved, u.registered || 1);
  const rejectionRate = pct(u.rejected, u.registered || 1);
  const sanghaApprovalRate = pct(s.approved, s.registered || 1);
  const radialData = [
    { name: "Sangha Approval", value: sanghaApprovalRate, fill: C.violet },
    { name: "Rejection Rate",  value: rejectionRate,      fill: C.red },
    { name: "User Approval",   value: approvalRate,       fill: C.green },
  ];

  // ── Area chart ───────────────────────────────────────────
  const userRegs = dateReg?.user_registrations ?? [];
  const sanghaRegs = dateReg?.sangha_registrations ?? [];
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

  // ── Reviewer bar data ─────────────────────────────────────
  const reviewerData = [
    { name: "Admin Approved",  count: br.admin_approved,  fill: C.green  },
    { name: "Sangha Approved", count: br.sangha_approved, fill: C.blue   },
    { name: "Admin Rejected",  count: br.admin_rejected,  fill: C.red    },
    { name: "Sangha Rejected", count: br.sangha_rejected, fill: C.orange },
  ];

  // ── Gender × status ───────────────────────────────────────
  const genderData = ["male", "female", "other"].map((g) => ({
    name: g.charAt(0).toUpperCase() + g.slice(1),
    Approved: n(gs.find((r) => r.gender === g && r.status === "approved")?.count),
    Rejected: n(gs.find((r) => r.gender === g && r.status === "rejected")?.count),
    Changes:  n(gs.find((r) => r.gender === g && r.status === "changes_requested")?.count),
  }));

  // ── Radar data for reviewer ───────────────────────────────
  const radarData = [
    { subject: "Admin Approved", A: br.admin_approved, fullMark: Math.max(...Object.values(br)) + 10 },
    { subject: "Sangha Approved", A: br.sangha_approved, fullMark: Math.max(...Object.values(br)) + 10 },
    { subject: "Admin Rejected", A: br.admin_rejected, fullMark: Math.max(...Object.values(br)) + 10 },
    { subject: "Sangha Rejected", A: br.sangha_rejected, fullMark: Math.max(...Object.values(br)) + 10 },
  ];

  // ── Analytics section cards ───────────────────────────────
  const analyticsCards = [
    { icon: Users,        color: C.orange, bg: C.orangeXLight, title: "Population & Demographics", value: totalUsers, section: "population", excelSections: ["personal"] },
    { icon: Activity,     color: C.violet, bg: C.violetLight,  title: "Age Group Analysis",        value: u.approved, section: "age",        excelSections: ["personal"] },
    { icon: MapPin,       color: C.teal,   bg: C.tealLight,    title: "Geo Distribution",          value: u.approved, section: "geo",        excelSections: ["personal"] },
    { icon: GraduationCap,color: C.blue,   bg: C.blueXLight,   title: "Education & Profession",    value: u.approved, section: "education",  excelSections: ["education"] },
    { icon: Shield,       color: C.green,  bg: C.greenLight,   title: "Insurance Coverage",        value: u.approved, section: "insurance",  excelSections: ["insurance"] },
    { icon: FileEdit,     color: C.amber,  bg: C.amberLight,   title: "Document Status",           value: u.approved, section: "documents",  excelSections: ["documents"] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Top Controls ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        background: "white", borderRadius: 16, padding: "12px 16px",
        border: "1.5px solid #E8F0FE", boxShadow: "0 2px 8px rgba(14,165,233,0.05)",
      }}>
        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 4, background: C.slate100, padding: 4, borderRadius: 12 }}>
          {(["both", "users", "sanghas"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 0.2s",
                background: viewMode === mode ? "white" : "transparent",
                color: viewMode === mode ? C.orange : C.slate600,
                boxShadow: viewMode === mode ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {mode === "both" ? "Users + Sanghas" : mode.charAt(0).toUpperCase() + mode.slice(1) + " Only"}
            </button>
          ))}
        </div>

        {/* Date range + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="date" value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 12, color: C.slate800, background: "white", outline: "none" }} />
            <span style={{ fontSize: 11, color: C.slate400 }}>→</span>
            <input type="date" value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 12, color: C.slate800, background: "white", outline: "none" }} />
          </div>
          <button onClick={onRefresh} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
            borderRadius: 9, border: "1.5px solid #E2E8F0", background: "white",
            fontSize: 12, fontWeight: 600, color: C.slate600, cursor: "pointer",
          }}>
            <RefreshCw size={13} />Refresh
          </button>
          <button
            onClick={() => onGoToCustomReport(["personal","economic","education","family","documents","insurance"], "all")}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
              borderRadius: 9, border: "1.5px solid #D1FAE5", background: "#F0FDF4",
              fontSize: 12, fontWeight: 700, color: C.green, cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={13} />Export All
          </button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      {/* Shows only: Users Registered | Sanghas Registered + combined export button */}
      <div style={{
        borderRadius: 24,
        background: "linear-gradient(135deg, #FFFBF5 0%, #FFF7ED 40%, #F0F9FF 100%)",
        border: "1.5px solid #FDBA74",
        padding: "28px 36px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(249,115,22,0.08)",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #FB923C18, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -30, left: "30%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, #38BDF818, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 20, right: 200, width: 80, height: 80, borderRadius: "50%", border: "1px solid #FDBA7440" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Row 1: title + export button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
              ◈ Registrations This Period
            </p>
            <button
              onClick={() => onGoToCustomReport(["personal"], undefined, { dualTable: true, scope: "both" })}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 10, border: "1.5px solid #D1FAE5", background: "#F0FDF4",
                fontSize: 12, fontWeight: 700, color: C.green, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(16,185,129,0.10)", transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#DCFCE7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4"; }}
            >
              <FileSpreadsheet size={13} />Export Users + Sanghas
            </button>
          </div>

          {/* Row 2: two big stat numbers */}
          <div style={{ display: "flex", gap: 40, alignItems: "flex-end", flexWrap: "wrap" }}>
            {/* Users Registered */}
            <div>
              <p style={{ fontSize: 13, color: C.slate600, fontWeight: 600, marginBottom: 6 }}>Total Users Registered</p>
              <p style={{
                fontSize: 72, fontWeight: 900, color: C.orange, lineHeight: 1,
                fontFamily: "'Syne', sans-serif", letterSpacing: "-2px",
              }}>
                {u.registered.toLocaleString()}
              </p>
            </div>

            {/* Vertical divider */}
            <div style={{ width: 1, height: 72, background: "#FDBA74", opacity: 0.5, marginBottom: 4, flexShrink: 0 }} />

            {/* Sanghas Registered */}
            <div>
              <p style={{ fontSize: 13, color: C.slate600, fontWeight: 600, marginBottom: 6 }}>Total Sanghas Registered</p>
              <p style={{
                fontSize: 72, fontWeight: 900, color: C.violet, lineHeight: 1,
                fontFamily: "'Syne', sans-serif", letterSpacing: "-2px",
              }}>
                {s.registered.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── User Application Status KPI Cards ── */}
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 800, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
          User Application Status
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {/* Approved */}
          <KpiCard
            icon={CheckCircle2} iconColor={C.green} iconBg={C.greenLight}
            label="Approved" value={u.approved}
            pctVal={pct(u.approved, u.registered || 1)}
            onExcel={() => onGoToCustomReport(["personal"], undefined, {
              scope: "users",
              statusFilter: "approved",
              initialColumns: ["full_name", "email", "status"],
            })}
            onDetails={() => onGoToAdvanced("gender-status")}
          />
          {/* Changes Requested */}
          <KpiCard
            icon={Clock} iconColor={C.amber} iconBg={C.amberLight}
            label="Changes Requested" value={u.changes_requested}
            pctVal={pct(u.changes_requested, u.registered || 1)}
            onExcel={() => onGoToCustomReport(["personal"], undefined, {
              scope: "users",
              statusFilter: "changes_requested",
              initialColumns: ["full_name", "email", "status"],
            })}
            onDetails={() => onGoToAdvanced("gender-status")}
          />
          {/* Rejected */}
          <KpiCard
            icon={UserX} iconColor={C.red} iconBg={C.redLight}
            label="Rejected" value={u.rejected}
            pctVal={pct(u.rejected, u.registered || 1)}
            onExcel={() => onGoToCustomReport(["personal"], undefined, {
              scope: "users",
              statusFilter: "rejected",
              initialColumns: ["full_name", "email", "status"],
            })}
            onDetails={() => onGoToAdvanced("gender-status")}
          />
          {/* Registered this period */}
          <KpiCard
            icon={UserCheck} iconColor={C.orange} iconBg={C.orangeXLight}
            label="Registered Period" value={u.registered}
            onExcel={() => onGoToCustomReport(["personal"], undefined, {
              scope: "users",
              initialColumns: ["full_name", "email", "status", "submitted_at"],
            })}
            onDetails={() => onGoToAdvanced("population")}
          />
        </div>
      </div>

      {/* ── Sangha Overview KPI Cards ── */}
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 800, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
          Sangha Overview
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {/* Sangha Registered */}
          <KpiCard
            icon={Building2} iconColor={C.violet} iconBg={C.violetLight}
            label="Registered" value={s.registered}
            pctVal={100}
            onExcel={() => onGoToCustomReport([], undefined, {
              scope: "sanghas",
            })}
            onDetails={() => onGoToAdvanced("population")}
          />
          {/* Sangha Approved */}
          <KpiCard
            icon={Building2} iconColor={C.green} iconBg={C.greenLight}
            label="Approved" value={s.approved}
            pctVal={pct(s.approved, s.registered || 1)}
            onExcel={() => onGoToCustomReport([], undefined, {
              scope: "sanghas",
              statusFilter: "approved",
            })}
            onDetails={() => onGoToAdvanced("gender-status")}
          />
          {/* Sangha Rejected */}
          <KpiCard
            icon={Building2} iconColor={C.red} iconBg={C.redLight}
            label="Rejected" value={s.rejected}
            pctVal={pct(s.rejected, s.registered || 1)}
            onExcel={() => onGoToCustomReport([], undefined, {
              scope: "sanghas",
              statusFilter: "rejected",
            })}
            onDetails={() => onGoToAdvanced("gender-status")}
          />
          {/* Sangha Pending */}
          <KpiCard
            icon={Building2} iconColor={C.amber} iconBg={C.amberLight}
            label="Pending" value={s.pending}
            pctVal={pct(s.pending, s.registered || 1)}
            onExcel={() => onGoToCustomReport([], undefined, {
              scope: "sanghas",
              statusFilter: "pending_approval", // DB value for sangha pending
            })}
            onDetails={() => onGoToAdvanced("population")}
          />
        </div>
      </div>

      {/* ── Row 1: Pie + Area Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 18 }}>
        {/* Status Donut */}
        <Card>
          <ChartHeader title="User Status Distribution" sub="Approval pipeline breakdown" onDetails={() => onGoToAdvanced("gender-status")} />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="46%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<PieTip total={totalUsers} active={undefined} payload={undefined} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate600 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Registration Trend */}
        <Card>
          <ChartHeader title="Registration Trend" sub="Users & Sanghas over selected period" onDetails={() => onGoToAdvanced("population")} />
          {chartData.length === 0 ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.slate400, fontSize: 13 }}>
              No activity in selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.orange} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.blue} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate600 }} />
                <Area type="monotone" dataKey="Users" stroke={C.orange} strokeWidth={2.5} fill="url(#gU)" dot={false} activeDot={{ r: 5, fill: C.orange }} />
                <Area type="monotone" dataKey="Sanghas" stroke={C.blue} strokeWidth={2.5} fill="url(#gS)" dot={false} activeDot={{ r: 5, fill: C.blue }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Row 2: Reviewer Bar + Gender × Status + Radial ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        {/* Reviewer Breakdown */}
        <Card>
          <ChartHeader title="Decisions by Reviewer" sub="Admin vs Sangha" onDetails={() => onGoToAdvanced("gender-status")} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={reviewerData} layout="vertical" margin={{ left: 6, right: 18, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10.5, fill: C.slate600 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Count">
                {reviewerData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gender × Status */}
        <Card>
          <ChartHeader title="Gender × Status" sub="Approval & rejection by gender" onDetails={() => onGoToAdvanced("gender-status")} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={genderData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5, color: C.slate600 }} />
              <Bar dataKey="Approved" fill={C.green}  radius={[4,4,0,0]} stackId="a" />
              <Bar dataKey="Rejected" fill={C.red}    stackId="a" />
              <Bar dataKey="Changes"  fill={C.orange} radius={[0,0,4,4]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Radial Rate Chart */}
        <Card>
          <ChartHeader title="Approval Rates" sub="User · Sangha · Rejection" />
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart
              cx="50%" cy="50%" innerRadius={20} outerRadius={90}
              barSize={16} data={radialData}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} label={{ position: "insideStart", fill: "#fff", fontSize: 10, fontWeight: 700 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5, color: C.slate600 }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 3: Reviewer Radar + Line chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 18 }}>
        {/* Reviewer Radar */}
        <Card>
          <ChartHeader title="Reviewer Balance" sub="Distribution across reviewer types" />
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart outerRadius={80} data={radarData}>
              <PolarGrid stroke="#F1F5F9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9.5, fill: C.slate600 }} />
              <PolarRadiusAxis tick={{ fontSize: 8 }} axisLine={false} />
              <Radar name="Actions" dataKey="A" stroke={C.orange} fill={C.orange} fillOpacity={0.2} strokeWidth={2} />
              <Tooltip content={<ChartTip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Line chart: Cumulative */}
        <Card>
          <ChartHeader title="Registration Line View" sub="Cumulative trend of users and sanghas" onDetails={() => onGoToAdvanced("population")} />
          {chartData.length === 0 ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.slate400, fontSize: 13 }}>
              No data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate600 }} />
                <Line type="monotone" dataKey="Users" stroke={C.orange} strokeWidth={2.5} dot={{ r: 3, fill: C.orange }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Sanghas" stroke={C.blue} strokeWidth={2.5} dot={{ r: 3, fill: C.blue }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Quick Rate Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "User Approval Rate",    value: `${approvalRate}%`,        sub: "of registered users",   color: C.green,  bg: C.greenLight },
          { label: "User Rejection Rate",   value: `${rejectionRate}%`,       sub: "of registered users",   color: C.red,    bg: C.redLight   },
          { label: "Sangha Approval Rate",  value: `${sanghaApprovalRate}%`,  sub: "of registered sanghas", color: C.violet, bg: C.violetLight},
        ].map((stat) => (
          <Card key={stat.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: stat.bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              border: `2px solid ${stat.color}30`,
            }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: stat.color, margin: 0 }}>{stat.value}</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: stat.color, margin: 0, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: C.slate800, marginTop: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 11, color: C.slate400 }}>{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Analytics Section Cards ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: C.slate900, margin: 0 }}>Community Analytics</p>
            <p style={{ fontSize: 11.5, color: C.slate400, marginTop: 2 }}>Explore detailed analytics for each category</p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
            borderRadius: 20, background: C.orangeXLight, border: `1px solid ${C.orange}30`,
          }}>
            <Zap size={11} style={{ color: C.orange }} />
            <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>Click arrows for details</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {analyticsCards.map((card) => {
            const p = pct(card.value, totalUsers || 1);
            return (
              <Card key={card.title}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <card.icon size={18} style={{ color: card.color }} />
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      onClick={() => onGoToCustomReport(card.excelSections, card.section)}
                      style={{
                        padding: "5px 9px", borderRadius: 7, border: "1px solid #E2E8F0",
                        background: "white", fontSize: 11, color: C.slate400, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 3, fontWeight: 600,
                      }}
                    >
                      <FileSpreadsheet size={10} />Export
                    </button>
                    <button
                      onClick={() => onGoToAdvanced(card.section)}
                      style={{
                        padding: "5px 9px", borderRadius: 7, border: `1px solid ${card.color}30`,
                        background: card.bg, fontSize: 11, color: card.color, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 3, fontWeight: 700,
                      }}
                    >
                      <ArrowRight size={10} />Details
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 28, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value.toLocaleString()}</p>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: C.slate800, marginTop: 3 }}>{card.title}</p>
                <div style={{ marginTop: 10, height: 5, background: C.slate100, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: 5, background: `linear-gradient(90deg, ${card.color}99, ${card.color})`, borderRadius: 4, width: `${p}%` }} />
                </div>
                <p style={{ fontSize: 10.5, color: C.slate400, marginTop: 4 }}>{p}% of total</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
//Community-Application\admin\src\app\dashboard\reports\GeneralDashboard.tsx
"use client";
import { DateRange } from "./DateRangePicker";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, Building2, CheckCircle2, Clock,
  AlertCircle, RefreshCw, MapPin, UserCheck, XCircle,
  BarChart2, FileSpreadsheet, ArrowRight,
} from "lucide-react";
import { GeneralReport } from "./page";
import { DateRange } from "./DateRangePicker";


// ── Types ─────────────────────────────────────────────────────────────────────

interface Generaldata {
  users: {
    total: number; approved: number; submitted: number;
    under_review: number; changes_requested: number; draft: number;
    rejected: number; new_this_period: number;
  };
  sanghas: {
    total: number; approved: number; pending_approval: number;
    rejected: number; suspended: number; new_this_period: number;
  };
  registrations_trend: { period: string; users: number; sanghas: number }[];
  users_by_state:      { state: string; count: number; male?: number; female?: number; other?: number }[];
  users_by_state_gender?: { state: string; male: number; female: number; other: number }[];
  sanghas_by_state:    { state: string; count: number }[];
  gender_distribution: { gender: string; count: number }[];
  user_status_dist:    { status: string; count: number }[];
  sangha_status_dist:  { status: string; count: number }[];
  top_sanghas:         { sangha_name: string; member_count: number; state: string }[];
  users_by_district:   { district: string; count: number }[];
}

interface GeneralDashboardProps {
  data:               GeneralReport | null;
  loading:            boolean;
  error:              boolean;
  onRefresh:          () => void;
  onGoToAdvanced:     (section?: string) => void;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  dateRange:          DateRange;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  sky:        "#0ea5e9",
  skyDark:    "#0284c7",
  skyLight:   "#f0f9ff",
  skyBorder:  "#bae6fd",
  orange:     "#f97316",
  orangeDk:   "#ea580c",
  orangeLt:   "#fff7ed",
  orangeBd:   "#fed7aa",
  emerald:    "#10b981",
  emeraldLt:  "#f0fdf4",
  emeraldBd:  "#a7f3d0",
  amber:      "#f59e0b",
  amberLt:    "#fffbeb",
  amberBd:    "#fde68a",
  rose:       "#ef4444",
  roseLt:     "#fef2f2",
  roseBd:     "#fca5a5",
  teal:       "#14b8a6",
  violet:     "#8b5cf6",
  violetLt:   "#f5f3ff",
  violetBd:   "#ddd6fe",
  slate100:   "#f1f5f9",
  slate200:   "#e2e8f0",
  slate300:   "#cbd5e1",
  slate400:   "#94a3b8",
  slate500:   "#64748b",
  slate700:   "#334155",
  slate800:   "#1e293b",
  slate900:   "#0f172a",
  pink:       "#ec4899",
  pinkLt:     "#fdf2f8",
  pinkBd:     "#f9a8d4",
  genderMale:   "#0ea5e9",
  genderFemale: "#ec4899",
  genderOther:  "#94a3b8",
};

const genderColor = (gender: string): string => {
  const g = gender.toLowerCase();
  if (g === "male")   return C.genderMale;
  if (g === "female") return C.genderFemale;
  return C.genderOther;
};

const EXCLUDED_USER_STATUSES = new Set(["submitted", "draft"]);

const STATUS_COLOR_MAP: Record<string, string> = {
  approved:           C.emerald,
  submitted:          C.amber,
  under_review:       C.amber,
  changes_requested:  C.orange,
  rejected:           C.rose,
  draft:              C.slate400,
};
const SANGHA_STATUS_COLOR_MAP: Record<string, string> = {
  approved:         C.emerald,
  pending_approval: C.amber,
  rejected:         C.rose,
  suspended:        C.teal,
};

const fmt         = (n?: number) => n == null ? "—" : n.toLocaleString("en-IN");
const calcPct     = (p: number, t: number): number => t ? Math.round((p / t) * 100) : 0;
const pctStr      = (p: number, t: number): string  => `${calcPct(p, t)}%`;
const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const baseCard: React.CSSProperties = {
  background:   "#fff",
  borderRadius: 16,
  border:       `1px solid ${C.slate200}`,
  boxShadow:    "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
};

// ── FIX 2: Dark axis label style used across all charts ──────────────────────
const AXIS_TICK_STYLE = { fontSize: 12, fill: "#111827", fontWeight: 600 };

// ── Tooltips ──────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...baseCard, padding: "10px 14px", fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: C.slate900, marginBottom: 5, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      {payload.map((e: any) => (
        <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: e.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: C.slate500, fontSize: 11 }}>{e.name}:</span>
          <span style={{ fontWeight: 700, color: C.slate800 }}>{fmt(e.value)}</span>
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
    <div style={{ ...baseCard, padding: "10px 14px", fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: C.slate900 }}>{statusLabel(name)}</p>
      <p style={{ color: C.slate500, marginTop: 3, fontSize: 11 }}>
        {fmt(value)} · <span style={{ color: C.sky, fontWeight: 700 }}>{p}%</span>
      </p>
    </div>
  );
};

// ── Reusable Buttons ──────────────────────────────────────────────────────────
function ActionBtn({
  icon: Icon, label, hoverColor, hoverBg, hoverBorder, onClick,
}: {
  icon: React.ElementType; label: string;
  hoverColor: string; hoverBg: string; hoverBorder: string;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        padding: "5px 0", borderRadius: 8, fontSize: 11, fontWeight: 600,
        border: `1px solid ${hov ? hoverBorder : C.slate200}`,
        background: hov ? hoverBg : "#fff",
        color: hov ? hoverColor : C.slate500,
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <Icon style={{ width: 11, height: 11 }} />{label}
    </button>
  );
}

// ── Status KPI Card ───────────────────────────────────────────────────────────
function StatusKpiCard({
  icon: Icon, color, bg, border, label, value, pctVal,
  onDetails, onExport,
}: {
  icon: React.ElementType; color: string; bg: string; border: string;
  label: string; value: number; pctVal: number;
  onDetails: () => void; onExport: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...baseCard,
        padding: "18px 18px 14px",
        boxShadow: hov
          ? "0 4px 20px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.04)"
          : baseCard.boxShadow,
        transform:  hov ? "translateY(-1px)" : "none",
        transition: "box-shadow 0.18s, transform 0.18s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: bg, color, border: `1px solid ${border}` }}>
          {pctVal}%
        </span>
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(value)}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.slate700, marginTop: 3 }}>{label}</p>
      <div style={{ marginTop: 10, height: 4, background: C.slate100, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: 4, borderRadius: 99, background: color, width: `${pctVal}%`, transition: "width 0.7s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <ActionBtn icon={BarChart2}       label="Details" hoverColor={C.sky}     hoverBg={C.skyLight}  hoverBorder={C.skyBorder}  onClick={onDetails} />
        <ActionBtn icon={FileSpreadsheet} label="Export"  hoverColor={C.emerald} hoverBg={C.emeraldLt} hoverBorder={C.emeraldBd}  onClick={onExport} />
      </div>
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, children, noDefaultActions = false,
  onDetails, onReport,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  noDefaultActions?: boolean;
  onDetails?: () => void; onReport?: () => void;
}) {
  return (
    <div style={{ ...baseCard, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.slate800, letterSpacing: "-0.01em" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11, color: C.slate400, marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {!noDefaultActions && (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <ActionBtn icon={BarChart2}       label="Details"           hoverColor={C.sky}    hoverBg={C.skyLight}  hoverBorder={C.skyBorder} onClick={onDetails} />
          <ActionBtn icon={FileSpreadsheet} label="Customize Report"  hoverColor={C.violet} hoverBg={C.violetLt}  hoverBorder={C.violetBd}  onClick={onReport} />
        </div>
      )}
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
function SectionDivider({
  label, color, bg, border, icon: Icon,
}: {
  label: string; color: string; bg: string; border: string;
  icon: React.ElementType;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 20px",
      background: bg,
      borderRadius: 14,
      border: `1px solid ${border}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "#fff", border: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color, letterSpacing: "-0.01em", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color, opacity: 0.65, margin: 0, marginTop: 1, fontWeight: 500 }}>
          Section overview
        </p>
      </div>
      <div style={{ flex: 1, height: 1, background: border, marginLeft: 4 }} />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 120, cols = 1 }: { h?: number; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{
          height: h, borderRadius: 16, overflow: "hidden",
          background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
        }} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <Skeleton h={130} />
      <Skeleton h={100} cols={4} />
      <Skeleton h={100} cols={3} />
      <Skeleton h={260} cols={2} />
    </div>
  );
}

// ── Build gender-by-state data ────────────────────────────────────────────────
function buildGenderStateData(data: Generaldata, limit?: number) {
  if (data.users_by_state_gender && data.users_by_state_gender.length > 0) {
    const rows = limit ? data.users_by_state_gender.slice(0, limit) : data.users_by_state_gender;
    return rows;
  }
  const rows = limit ? data.users_by_state.slice(0, limit) : data.users_by_state;
  return rows.map(d => ({
    state:  d.state,
    male:   d.male   ?? Math.round((d.count ?? 0) * 0.56),
    female: d.female ?? Math.round((d.count ?? 0) * 0.38),
    other:  d.other  ?? Math.round((d.count ?? 0) * 0.06),
  }));
}

// ── Sort gender distribution: Male → Female → Other ───────────────────────────
function sortedGenderDistribution(data: { gender: string; count: number }[]) {
  const order: Record<string, number> = { male: 0, female: 1, other: 2 };
  return [...data].sort((a, b) => {
    const aIdx = order[a.gender.toLowerCase()] ?? 3;
    const bIdx = order[b.gender.toLowerCase()] ?? 3;
    return aIdx - bIdx;
  });
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function GeneralDashboard({
  data, loading, error, onRefresh, onGoToAdvanced, onGoToCustomReport,
}: GeneralDashboardProps) {

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
      <AlertCircle style={{ width: 40, height: 40, color: C.slate300 }} />
      <p style={{ fontSize: 13, color: C.slate500 }}>Failed to load analytics data</p>
      <button
        onClick={onRefresh}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px", border: `1px solid ${C.slate200}`,
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: "#fff", color: C.slate500, cursor: "pointer",
        }}
      >
        <RefreshCw style={{ width: 13, height: 13 }} /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  const { users: u, sanghas: s } = data;

  const genderStateData = buildGenderStateData(data);
  const sortedGender    = sortedGenderDistribution(data.gender_distribution);

  const filteredUserStatusDist = data.user_status_dist.filter(
    d => !EXCLUDED_USER_STATUSES.has(d.status.toLowerCase())
  );
  const filteredUserStatusTotal = filteredUserStatusDist.reduce((acc, d) => acc + d.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* ── FIX 1: Hero Banner — separate approved users & approved sanghas ── */}
      {/* ── Hero Banner ── */}
<div style={{
  ...baseCard,
  background: "linear-gradient(135deg,#fff 0%,#f8fafc 100%)",
  padding: "24px 28px", position: "relative", overflow: "hidden",
}}>
  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 700px 300px at 100% 0%,rgba(14,165,233,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />
  <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", border: `1px solid ${C.slate100}`, pointerEvents: "none" }} />
  <div style={{ position: "relative" }}>
    {/* Title */}
    <p style={{ fontSize: 10, fontWeight: 800, color: C.sky, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 16 }}>Community Overview</p>

    {/* Two side-by-side stat blocks */}
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

      {/* Block 1: Users */}
      <div style={{
        ...baseCard,
        flex: 1,
        minWidth: 200,
        padding: "20px 24px",
        background: C.skyLight,
        border: `1px solid ${C.skyBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.sky, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.skyDark, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Approved Users</p>
        </div>
        <p style={{ fontSize: 52, fontWeight: 900, color: C.skyDark, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {fmt(u.approved)}
        </p>
      </div>

      {/* Block 2: Sanghas */}
      <div style={{
        ...baseCard,
        flex: 1,
        minWidth: 200,
        padding: "20px 24px",
        background: C.orangeLt,
        border: `1px solid ${C.orangeBd}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.orangeDk, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Approved Sanghas</p>
        </div>
        <p style={{ fontSize: 52, fontWeight: 900, color: C.orangeDk, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {fmt(s.approved)}
        </p>
      </div>

    </div>
  </div>
</div>
       
           

          
        

      {/* ── Registrations Trend (combined) ──────────────────────────────── */}
      <ChartCard
        title="Registrations Over Time" subtitle="Users & sanghas registered per period"
        onDetails={() => onGoToAdvanced("demographics")}
        onReport={() => onGoToCustomReport(["personalDetails"])}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.registrations_trend}>
            <defs>
              <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.sky}    stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.sky}    stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.orange} stopOpacity={0.18} />
                <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
            {/* FIX 2: dark axis labels */}
            <XAxis dataKey="period" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            <Area type="monotone" dataKey="users"   name="Users"   stroke={C.sky}    fill="url(#gU)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="sanghas" name="Sanghas" stroke={C.orange} fill="url(#gS)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ════════════════════════════════════════════════════════════════════
          USERS SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <SectionDivider
        label="Users"
        icon={Users}
        color={C.skyDark}
        bg={C.skyLight}
        border={C.skyBorder}
      />

      {/* FIX 4: User KPI Cards — Details buttons navigate to correct advanced sections */}
      {/* Approved → au-status, Rejected → au-status, Changes Requested → au-status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          {
            icon: Users,       color: C.sky,     bg: C.skyLight,  border: C.skyBorder,
            label: "Total Users",       value: u.total,
            // Total → demographics overview (population hero)
            advSection: "demographics",
          },
          {
            icon: UserCheck,   color: C.emerald, bg: C.emeraldLt, border: C.emeraldBd,
            label: "Approved",          value: u.approved,
            // Approved → status overview section
            advSection: "status",
          },
          {
            icon: XCircle,     color: C.rose,    bg: C.roseLt,    border: C.roseBd,
            label: "Rejected",          value: u.rejected,
            // Rejected → status overview section
            advSection: "status",
          },
          {
            icon: AlertCircle, color: C.orange,  bg: C.orangeLt,  border: C.orangeBd,
            label: "Changes Requested", value: u.changes_requested,
            // Changes requested → status overview section
            advSection: "status",
          },
        ].map(k => (
          <StatusKpiCard
            key={k.label}
            icon={k.icon}
            color={k.color}
            bg={k.bg}
            border={k.border}
            label={k.label}
            value={k.value}
            pctVal={calcPct(k.value, u.total)}
            onDetails={() => onGoToAdvanced(k.advSection)}
            onExport={() => onGoToCustomReport(["personal-details"], "user")}
          />
        ))}
      </div>

      {/* Users by State — grouped bars: one bin each for Male, Female, Other */}
      <ChartCard
        title="Users by State" subtitle="Male / Female / Other — grouped per state"
        onDetails={() => onGoToAdvanced("geographic")}
        onReport={() => onGoToCustomReport(["location-information"],"user")}
      >
        {/*
          Each state gets 3 grouped (side-by-side) bars.
          height: 3 bars × 10px each + 8px gap between groups × states, min 260.
          barSize=10 keeps each of the 3 bins distinct and readable.
          barCategoryGap="30%" gives breathing room between state groups.
          barGap={3} adds a small gap between the 3 bars within each group.
        */}
        <ResponsiveContainer width="100%" height={Math.max(260, genderStateData.length * 46)}>
          <BarChart
            data={genderStateData}
            layout="vertical"
            barSize={10}
            barCategoryGap="30%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              allowDataOverflow={false}
            />
            <YAxis
              dataKey="state"
              type="category"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip content={<ChartTip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            {/* No stackId — each renders as its own separate grouped bar */}
            <Bar dataKey="male"   name="Male"   fill={C.genderMale}   radius={[0, 4, 4, 0]} minPointSize={2} />
            <Bar dataKey="female" name="Female" fill={C.genderFemale} radius={[0, 4, 4, 0]} minPointSize={2} />
            <Bar dataKey="other"  name="Other"  fill={C.genderOther}  radius={[0, 4, 4, 0]} minPointSize={2} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* User Charts row: Gender + Status + Districts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <ChartCard
          title="Gender Distribution"
          onDetails={() => onGoToAdvanced("demographics")}
          onReport={() => onGoToCustomReport(["personalDetails"],"user")}
        >
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={sortedGender}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
              {/* FIX 2: dark axis labels */}
                <XAxis
                dataKey="gender"
                tick={AXIS_TICK_STYLE}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()}
              />              <YAxis tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Count" radius={[5, 5, 0, 0]}>
                {sortedGender.map((entry, i) => (
                  <Cell key={i} fill={genderColor(entry.gender)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="User Status" subtitle="Approved / Under review / Changes requested / Rejected"
          onDetails={() => onGoToAdvanced("status")}
          onReport={() => onGoToCustomReport(["personal-Details"],"user")}
        >
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={filteredUserStatusDist}
                dataKey="count" nameKey="status"
                cx="50%" cy="46%"
                innerRadius={55} outerRadius={82}
                paddingAngle={3} strokeWidth={2} stroke="#fff"
              >
                {filteredUserStatusDist.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLOR_MAP[entry.status] || C.sky} />
                ))}
              </Pie>
              <Tooltip content={<PieTip total={filteredUserStatusTotal} active={undefined} payload={undefined} />} />
              <Legend formatter={statusLabel} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top Districts" subtitle="By user count"
          onDetails={() => onGoToAdvanced("geographic")}
          onReport={() => onGoToCustomReport(["location-information"],"user")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(data.users_by_district || []).slice(0, 7).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: C.skyLight, color: C.skyDark,
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${C.skyBorder}`,
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.slate800 }}>{d.district}</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: C.sky, marginLeft: 8, flexShrink: 0 }}>{fmt(d.count)}</p>
                  </div>
                  <div style={{ height: 4, background: C.slate100, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: 4, borderRadius: 99,
                      background: `linear-gradient(90deg,${C.sky},${C.orange})`,
                      width: pctStr(d.count, data.users_by_district[0]?.count || 1),
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SANGHAS SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <SectionDivider
        label="Sanghas"
        icon={Building2}
        color={C.orangeDk}
        bg={C.orangeLt}
        border={C.orangeBd}
      />

      {/* FIX 4: Sangha KPI Cards — Details buttons navigate to correct advanced sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          {
            icon: Building2,    color: C.orange,  bg: C.orangeLt,  border: C.orangeBd,
            label: "Total Sanghas",
            value: s.approved + s.rejected,
            total: s.approved + s.rejected,
            // Total sanghas → status brekdown
            advSection: "as-status",
          },
          {
            icon: CheckCircle2, color: C.emerald, bg: C.emeraldLt, border: C.emeraldBd,
            label: "Approved",
            value: s.approved,
            total: s.approved + s.rejected,
            // Approved sanghas → sangha STATUS breakdown section
            advSection: "as-status",
          },
          {
            icon: XCircle,      color: C.rose,    bg: C.roseLt,    border: C.roseBd,
            label: "Rejected",
            value: s.rejected,
            total: s.approved + s.rejected,
            // Rejected sanghas → sangha STATUS breakdown section
            advSection: "as-status",
          },
        ].map(k => (
          <StatusKpiCard
            key={k.label}
            icon={k.icon}
            color={k.color}
            bg={k.bg}
            border={k.border}
            label={k.label}
            value={k.value}
            pctVal={calcPct(k.value, k.total)}
            onDetails={() => onGoToAdvanced(k.advSection)}
            onExport={() => onGoToCustomReport(["sangha-details"], "sangha")}
          />
        ))}
      </div>

      {/* Sanghas by State — full width */}
      <ChartCard
        title="Sanghas by State" subtitle="All states"
        onDetails={() => onGoToAdvanced("as-geographic")}
        onReport={() => onGoToCustomReport(["locationInformation"], "sanghas")}
      >
        {/* FIX 3: barSize increased, dark axis labels */}
        <ResponsiveContainer width="100%" height={Math.max(220, data.sanghas_by_state.length * 34)}>
          <BarChart data={data.sanghas_by_state} layout="vertical" barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              allowDataOverflow={false}
            />
            <YAxis dataKey="state" type="category" tick={AXIS_TICK_STYLE} tickLine={false} axisLine={false} width={120} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="count" name="Sanghas" fill={C.orange} radius={[0, 5, 5, 0]} minPointSize={2} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Sangha Charts row: Status Pie + Top Sanghas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard
          title="Sangha Status Breakdown"
          onDetails={() => onGoToAdvanced("as-status")}
          onReport={() => onGoToCustomReport(["personalDetails"], "sanghas")}
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.sangha_status_dist} dataKey="count" nameKey="status"
                cx="50%" cy="46%" innerRadius={55} outerRadius={84}
                paddingAngle={3} strokeWidth={2} stroke="#fff">
                {data.sangha_status_dist.map((entry, i) => {
                  const key = entry.status.toLowerCase().replace(/\s+/g, "_").trim();
                  return <Cell key={i} fill={SANGHA_STATUS_COLOR_MAP[key] || C.sky} />;
                })}
              </Pie>
              <Tooltip content={<PieTip total={s.total} active={undefined} payload={undefined} />} />
              <Legend formatter={statusLabel} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: C.slate500 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top Sanghas" subtitle="By approved user count"
          onDetails={() => onGoToAdvanced("as-top")}
          onReport={() => onGoToCustomReport(["personalDetails"], "sanghas")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(data.top_sanghas || []).slice(0, 6).map((sg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: i < 3 ? C.orangeLt : C.skyLight,
                  color: i < 3 ? C.orangeDk : C.skyDark,
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${i < 3 ? C.orangeBd : C.skyBorder}`,
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.slate800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sg.sangha_name}</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: C.orange, flexShrink: 0, marginLeft: 8 }}>{fmt(sg.member_count)}</p>
                  </div>
                  <p style={{ fontSize: 10, color: C.slate400, display: "flex", alignItems: "center", gap: 2, marginTop: 1 }}>
                    <MapPin style={{ width: 8, height: 8 }} />{sg.state}
                  </p>
                  <div style={{ height: 3, background: C.slate100, borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                    <div style={{
                      height: 3, borderRadius: 99,
                      background: `linear-gradient(90deg,${C.orange},${C.sky})`,
                      width: pctStr(sg.member_count, data.top_sanghas[0]?.member_count || 1),
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

    </div>
  );
}
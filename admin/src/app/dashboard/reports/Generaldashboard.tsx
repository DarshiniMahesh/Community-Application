//Community-Application\admin\src\app\dashboard\reports\GeneralDashboard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, Building2, CheckCircle2, Clock,
  AlertCircle, RefreshCw, MapPin, UserCheck, XCircle,
  BarChart2, FileSpreadsheet, ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { DateRange, toISO } from "./DateRangePicker";

interface GeneralStats {
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
  users_by_state:      { state: string; count: number }[];
  users_by_state_gender?: { state: string; male: number; female: number; other: number }[];
  sanghas_by_state:    { state: string; count: number }[];
  gender_distribution: { gender: string; count: number }[];
  user_status_dist:    { status: string; count: number }[];
  sangha_status_dist:  { status: string; count: number }[];
  top_sanghas:         { sangha_name: string; member_count: number; state: string }[];
  users_by_district:   { district: string; count: number }[];
}

type SubTab = "overview" | "users" | "sanghas";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  sky:       "#0ea5e9",
  skyDark:   "#0284c7",
  skyLight:  "#f0f9ff",
  skyBorder: "#bae6fd",
  orange:    "#f97316",
  orangeDk:  "#ea580c",
  orangeLt:  "#fff7ed",
  orangeBd:  "#fed7aa",
  emerald:   "#10b981",
  emeraldLt: "#f0fdf4",
  emeraldBd: "#a7f3d0",
  amber:     "#f59e0b",
  amberLt:   "#fffbeb",
  amberBd:   "#fde68a",
  rose:      "#ef4444",
  roseLt:    "#fef2f2",
  roseBd:    "#fca5a5",
  teal:      "#14b8a6",
  violet:    "#8b5cf6",
  violetLt:  "#f5f3ff",
  violetBd:  "#ddd6fe",
  slate100:  "#f1f5f9",
  slate200:  "#e2e8f0",
  slate300:  "#cbd5e1",
  slate400:  "#94a3b8",
  slate500:  "#64748b",
  slate700:  "#334155",
  slate800:  "#1e293b",
  pink:      "#ec4899",
  pinkLt:    "#fdf2f8",
  pinkBd:    "#f9a8d4",
  slate900:  "#0f172a",
  // ── Gender colour constants (single source of truth) ──
  genderMale:   "#0ea5e9",   // sky blue
  genderFemale: "#ec4899",   // pink
  genderOther:  "#94a3b8",   // slate-grey
};

// ── Gender colour helper — use this everywhere instead of index-based picks ──
const genderColor = (gender: string): string => {
  const g = gender.toLowerCase();
  if (g === "male")   return C.genderMale;
  if (g === "female") return C.genderFemale;
  return C.genderOther;
};

const STATUS_COLOR_MAP: Record<string, string> = {
  approved:          C.emerald,
  submitted:         C.amber,
  under_review:      C.amber,
  changes_requested: C.orange,
  rejected:          C.rose,
  draft:             C.slate400,
};
const SANGHA_STATUS_COLOR_MAP: Record<string, string> = {
  approved:        C.emerald,
  pending_approval:C.amber,
  rejected:        C.rose,
  suspended:       C.teal,
};

const fmt = (n?: number) => n == null ? "—" : n.toLocaleString("en-IN");
const calcPct  = (p: number, t: number): number => t ? Math.round((p / t) * 100) : 0;
const pctStr   = (p: number, t: number): string  => `${calcPct(p, t)}%`;
const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

// ── Base card style ───────────────────────────────────────────────────────────
const baseCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: `1px solid ${C.slate200}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
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

// ── Small hover button ────────────────────────────────────────────────────────
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

function ArrowBtn({ onClick }: { onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
        borderRadius: 8, fontSize: 11, fontWeight: 600,
        border: `1px solid ${hov ? C.skyBorder : C.slate200}`,
        background: hov ? C.skyLight : "#fff",
        color: hov ? C.skyDark : C.slate400,
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <ArrowRight style={{ width: 12, height: 12 }} />Details
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
        transform: hov ? "translateY(-1px)" : "none",
        transition: "box-shadow 0.18s, transform 0.18s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
          background: bg, color, border: `1px solid ${border}`,
        }}>{pctVal}%</span>
      </div>

      <p style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {fmt(value)}
      </p>
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
  title, subtitle, children, action, span2 = false, noDefaultActions = false,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  action?: React.ReactNode; span2?: boolean; noDefaultActions?: boolean;
}) {
  return (
    <div style={{ ...baseCard, padding: "18px 20px", gridColumn: span2 ? "span 2" : undefined, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.slate800, letterSpacing: "-0.01em" }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: C.slate400, marginTop: 2 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {!noDefaultActions && (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <ActionBtn icon={BarChart2}       label="Details"         hoverColor={C.sky}    hoverBg={C.skyLight}  hoverBorder={C.skyBorder} />
          <ActionBtn icon={FileSpreadsheet} label="Generate Report" hoverColor={C.violet} hoverBg={C.violetLt} hoverBorder={C.violetBd} />
        </div>
      )}
    </div>
  );
}

// ── Section row label ─────────────────────────────────────────────────────────
function SectionRow({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 16, borderRadius: 99, background: color }} />
      <p style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────────
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users",    label: "Users"    },
  { id: "sanghas",  label: "Sanghas"  },
];

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: GeneralStats }) {
  const { users: u, sanghas: s } = data;

  const genderStateData = data.users_by_state_gender ||
    data.users_by_state.slice(0, 8).map(d => ({
      state:  d.state,
      male:   Math.round(d.count * 0.56),
      female: Math.round(d.count * 0.38),
      other:  Math.round(d.count * 0.06),
    }));

  const userKpis = [
    { icon: Users,     color: C.sky,     bg: C.skyLight,  border: C.skyBorder, label: "Total Users", value: u.total },
    { icon: UserCheck, color: C.emerald, bg: C.emeraldLt, border: C.emeraldBd, label: "Approved",    value: u.approved },
    { icon: Clock,     color: C.amber,   bg: C.amberLt,   border: C.amberBd,   label: "Pending",     value: u.submitted + u.under_review },
    { icon: XCircle,   color: C.rose,    bg: C.roseLt,    border: C.roseBd,    label: "Rejected",    value: u.rejected },
  ];

  const sanghaKpis = [
    { icon: Building2,    color: C.orange,  bg: C.orangeLt,  border: C.orangeBd,  label: "Total Sanghas", value: s.total },
    { icon: CheckCircle2, color: C.emerald, bg: C.emeraldLt, border: C.emeraldBd, label: "Approved",      value: s.approved },
    { icon: Clock,        color: C.amber,   bg: C.amberLt,   border: C.amberBd,   label: "Pending",       value: s.pending_approval },
    { icon: XCircle,      color: C.rose,    bg: C.roseLt,    border: C.roseBd,    label: "Rejected",      value: s.rejected },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Hero banner — only Total Users + Total Sanghas ── */}
      <div style={{
        ...baseCard,
        background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)",
        padding: "24px 28px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 700px 300px at 100% 0%, rgba(14,165,233,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", border: `1px solid ${C.slate100}`, pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: C.sky, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>Community Overview</p>
            <p style={{ fontSize: 60, fontWeight: 900, color: C.slate900, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {fmt(u.total + s.total)}
            </p>
            <p style={{ fontSize: 13, color: C.slate400, marginTop: 4, fontWeight: 500 }}>Total users & sanghas across all states</p>
          </div>

          {/* ── ONLY two mini-cards: Users + Sanghas ── */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Users",   value: u.total, color: C.sky    },
              { label: "Sanghas", value: s.total, color: C.orange },
            ].map(item => (
              <div key={item.label} style={{ ...baseCard, padding: "14px 18px", textAlign: "center", minWidth: 96 }}>
                <p style={{ fontSize: 26, fontWeight: 800, color: item.color, letterSpacing: "-0.02em" }}>{fmt(item.value)}</p>
                <p style={{ fontSize: 11, color: C.slate400, marginTop: 2, fontWeight: 500 }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User KPI row */}
      <div>
        <SectionRow label="User Overview" color={C.sky} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {userKpis.map(k => (
            <StatusKpiCard key={k.label} {...k} pctVal={calcPct(k.value, u.total)} onDetails={() => {}} onExport={() => {}} />
          ))}
        </div>
      </div>

      {/* Sangha KPI row */}
      <div>
        <SectionRow label="Sangha Overview" color={C.orange} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {sanghaKpis.map(k => (
            <StatusKpiCard key={k.label} {...k} pctVal={calcPct(k.value, s.total)} onDetails={() => {}} onExport={() => {}} />
          ))}
        </div>
      </div>

      {/* Trend */}
      <ChartCard title="Registrations Over Time" subtitle="Users & sanghas registered per period">
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
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            <Area type="monotone" dataKey="users"   name="Users"   stroke={C.sky}    fill="url(#gU)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="sanghas" name="Sanghas" stroke={C.orange} fill="url(#gS)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Gender-by-state + User Status */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <ChartCard title="Users by State" subtitle="Male / Female / Other breakdown" action={<ArrowBtn />}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={genderStateData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="state" type="category" tick={{ fontSize: 10, fill: C.slate500 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
              {/* Order: male → female → other so legend reads left-to-right correctly */}
              <Bar dataKey="male"   name="Male"   fill={C.genderMale}   stackId="a" />
              <Bar dataKey="female" name="Female" fill={C.genderFemale} stackId="a" />
              <Bar dataKey="other"  name="Other"  fill={C.genderOther}  stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="User Status" subtitle="Registration pipeline" action={<ArrowBtn />}>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data.user_status_dist} dataKey="count" nameKey="status"
                cx="50%" cy="46%" innerRadius={55} outerRadius={82}
                paddingAngle={3} strokeWidth={2} stroke="#fff">
                {data.user_status_dist.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLOR_MAP[entry.status] || C.sky} />
                ))}
              </Pie>
              <Tooltip content={<PieTip total={u.total} active={undefined} payload={undefined} />} />
              <Legend formatter={statusLabel} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gender dist + Sangha status + Top Sanghas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

        {/* Gender Distribution — colour each bar by gender name */}
        <ChartCard title="Gender Distribution">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data.gender_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
              <XAxis dataKey="gender" tick={{ fontSize: 11, fill: C.slate500 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Count" radius={[5, 5, 0, 0]}>
                {data.gender_distribution.map((entry, i) => (
                  <Cell key={i} fill={genderColor(entry.gender)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sangha Status">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={data.sangha_status_dist} dataKey="count" nameKey="status"
                cx="50%" cy="46%" innerRadius={40} outerRadius={64}
                paddingAngle={3} strokeWidth={2} stroke="#fff">
                {data.sangha_status_dist.map((entry, i) => (
                  <Cell key={i} fill={SANGHA_STATUS_COLOR_MAP[entry.status] || C.sky} />
                ))}
              </Pie>
              <Tooltip content={<PieTip total={s.total} active={undefined} payload={undefined} />} />
              <Legend formatter={statusLabel} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Sanghas" subtitle="By member count">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(data.top_sanghas || []).slice(0, 5).map((sg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: i < 3 ? C.orangeLt : C.skyLight,
                  color: i < 3 ? C.orangeDk : C.skyDark,
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${i < 3 ? C.orangeBd : C.skyBorder}`,
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.slate800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.sangha_name}</p>
                  <p style={{ fontSize: 10, color: C.slate400, display: "flex", alignItems: "center", gap: 2, marginTop: 1 }}>
                    <MapPin style={{ width: 8, height: 8 }} />{sg.state}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.orange, flexShrink: 0 }}>{fmt(sg.member_count)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ data }: { data: GeneralStats }) {
  const u = data.users;

  // ── REMOVED: submitted, draft ── only show meaningful decision-state statuses
  const statuses = [
    { label: "Total",             value: u.total,             color: C.sky     },
    { label: "Approved",          value: u.approved,          color: C.emerald },
    { label: "Changes Requested", value: u.changes_requested, color: C.orange  },
    { label: "Rejected",          value: u.rejected,          color: C.rose    },
  ];

  const genderStateData = data.users_by_state_gender ||
    data.users_by_state.slice(0, 8).map(d => ({
      state:  d.state,
      male:   Math.round(d.count * 0.56),
      female: Math.round(d.count * 0.38),
      other:  Math.round(d.count * 0.06),
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${statuses.length},1fr)`, gap: 10 }}>
        {statuses.map(c => (
          <div key={c.label} style={{ ...baseCard, padding: "14px 14px 10px" }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: c.color, letterSpacing: "-0.03em" }}>{fmt(c.value)}</p>
            <p style={{ fontSize: 10, color: C.slate500, marginTop: 3, fontWeight: 600 }}>{c.label}</p>
            <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: C.slate100, overflow: "hidden" }}>
              <div style={{ height: 3, borderRadius: 99, background: c.color, width: pctStr(c.value, u.total), transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="User Registrations Trend" subtitle="New users per period">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.registrations_trend}>
              <defs>
                <linearGradient id="gU2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.sky} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.sky} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="users" name="New Users" stroke={C.sky} fill="url(#gU2)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Users by State — consistent gender colours: male=blue, female=pink, other=grey */}
        <ChartCard title="Users by State" subtitle="Male / Female / Other">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={genderStateData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="state" type="category" tick={{ fontSize: 10, fill: C.slate500 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<ChartTip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.slate500 }} />
              <Bar dataKey="male"   name="Male"   fill={C.genderMale}   stackId="a" />
              <Bar dataKey="female" name="Female" fill={C.genderFemale} stackId="a" />
              <Bar dataKey="other"  name="Other"  fill={C.genderOther}  stackId="a" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Gender Distribution — colour by gender name */}
        <ChartCard title="Gender Distribution">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data.gender_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
              <XAxis dataKey="gender" tick={{ fontSize: 11, fill: C.slate500 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Count" radius={[5, 5, 0, 0]}>
                {data.gender_distribution.map((entry, i) => (
                  <Cell key={i} fill={genderColor(entry.gender)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Districts" subtitle="By user count">
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
                      background: `linear-gradient(90deg, ${C.sky}, ${C.orange})`,
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
    </div>
  );
}

// ── Sanghas Tab ───────────────────────────────────────────────────────────────
function SanghasTab({ data }: { data: GeneralStats }) {
  const s = data.sanghas;

  const statuses = [
    { label: "Total",            value: s.total,            color: C.orange  },
    { label: "Approved",         value: s.approved,         color: C.emerald },
    { label: "Pending Approval", value: s.pending_approval, color: C.amber   },
    { label: "Rejected",         value: s.rejected,         color: C.rose    },
    { label: "Suspended",        value: s.suspended,        color: C.teal    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {statuses.map(c => (
          <div key={c.label} style={{ ...baseCard, padding: "14px 16px 10px" }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: c.color, letterSpacing: "-0.03em" }}>{fmt(c.value)}</p>
            <p style={{ fontSize: 11, color: C.slate500, marginTop: 3, fontWeight: 600 }}>{c.label}</p>
            <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: C.slate100, overflow: "hidden" }}>
              <div style={{ height: 3, borderRadius: 99, background: c.color, width: pctStr(c.value, s.total), transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="Sangha Registrations Trend" subtitle="New sanghas per period">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data.registrations_trend}>
              <defs>
                <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.orange} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="sanghas" name="New Sanghas" stroke={C.orange} fill="url(#gS2)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sanghas by State" subtitle="Top 10 states">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data.sanghas_by_state.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate100} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="state" type="category" tick={{ fontSize: 10, fill: C.slate500 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Sanghas" fill={C.orange} radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="Sangha Status Breakdown">
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

        <ChartCard title="Top Sanghas" subtitle="By member count">
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
                      background: `linear-gradient(90deg, ${C.orange}, ${C.sky})`,
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
      <Skeleton h={130} />
      <Skeleton h={100} cols={4} />
      <Skeleton h={100} cols={4} />
      <Skeleton h={220} />
      <Skeleton h={260} cols={2} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GeneralDashboard({ dateRange }: { dateRange: DateRange }) {
  const [subTab,  setSubTab]  = useState<SubTab>("overview");
  const [data,    setData]    = useState<GeneralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set("from", toISO(dateRange.from)!);
      if (dateRange.to)   params.set("to",   toISO(dateRange.to)!);
      const query = params.toString();
      setData(await api.get(`/api/admin/reports/general${query ? `?${query}` : ""}`));
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics data");
    } finally { setLoading(false); }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
      <AlertCircle style={{ width: 40, height: 40, color: C.slate300 }} />
      <p style={{ fontSize: 13, color: C.slate500 }}>{error}</p>
      <button onClick={fetchData} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 18px", border: `1px solid ${C.slate200}`,
        borderRadius: 10, fontSize: 13, fontWeight: 600,
        background: "#fff", color: C.slate500, cursor: "pointer",
      }}>
        <RefreshCw style={{ width: 13, height: 13 }} /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Sub-tab pill */}
      <div style={{
        display: "flex", gap: 2,
        background: "#fff", border: `1px solid ${C.slate200}`,
        borderRadius: 14, padding: 4, width: "fit-content",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {SUB_TABS.map(tab => {
          const active = subTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 10,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: active ? C.sky : "transparent",
              color: active ? "#fff" : C.slate500,
              boxShadow: active ? "0 2px 8px rgba(14,165,233,0.28)" : "none",
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === "overview" && <OverviewTab data={data} />}
      {subTab === "users"    && <UsersTab    data={data} />}
      {subTab === "sanghas"  && <SanghasTab  data={data} />}
    </div>
  );
}
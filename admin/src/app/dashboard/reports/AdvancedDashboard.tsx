//Community-Application\admin\src\app\dashboard\reports\AdvancedDashboard.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
  AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis,
  LineChart, Line,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, Activity, Sparkles, FileSpreadsheet, Loader2, ChevronRight,
} from "lucide-react";

// ─── API ──────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${typeof window !== "undefined" ? (sessionStorage.getItem("admin_token") ?? "") : ""}`,
});

type Row = { [key: string]: string | number | boolean | null };

const SECTION_IDS = [
  "gender-status","population","age","education","geo","religious","income","economic","insurance","documents",
] as const;
type SectionId = typeof SECTION_IDS[number];

// ─── Design tokens ─────────────────────────────────────────────

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", orangeMid: "#FDBA74",
  blue: "#0EA5E9", blueLight: "#F0F9FF",
  green: "#10B981", greenLight: "#D1FAE5",
  red: "#EF4444", redLight: "#FEE2E2",
  amber: "#F59E0B", amberLight: "#FEF3C7",
  violet: "#8B5CF6", violetLight: "#EDE9FE",
  teal: "#14B8A6", tealLight: "#CCFBF1",
  pink: "#EC4899", pinkLight: "#FCE7F3",
  slate100: "#F1F5F9", slate200: "#E2E8F0",
  slate400: "#94A3B8", slate600: "#475569", slate800: "#1E293B", slate900: "#0F172A",
};

const NAV: { id: SectionId; label: string; icon: any; color: string; bg: string }[] = [
  { id: "gender-status", label: "Gender × Status",   icon: Activity,     color: C.amber,  bg: C.amberLight  },
  { id: "population",    label: "Population",         icon: Users,        color: C.orange, bg: C.orangeLight },
  { id: "age",           label: "Age Groups",         icon: Activity,     color: C.violet, bg: C.violetLight },
  { id: "education",     label: "Education",          icon: GraduationCap,color: C.blue,   bg: C.blueLight   },
  { id: "geo",           label: "Geo Location",       icon: MapPin,       color: C.teal,   bg: C.tealLight   },
  { id: "religious",     label: "Religious Details",  icon: Sparkles,     color: C.orange, bg: C.orangeLight },
  { id: "income",        label: "Earnings",           icon: Wallet,       color: C.green,  bg: C.greenLight  },
  { id: "economic",      label: "Economic",           icon: Home,         color: C.amber,  bg: C.amberLight  },
  { id: "insurance",     label: "Insurance",          icon: Shield,       color: C.blue,   bg: C.blueLight   },
  { id: "documents",     label: "Documents",          icon: FileText,     color: C.violet, bg: C.violetLight },
];

const ENDPOINT: Record<SectionId, string> = {
  "gender-status": "/admin/reports/advanced/gender-status-detail",
  population:      "/admin/reports/advanced/population",
  age:             "/admin/reports/advanced/age-groups",
  education:       "/admin/reports/advanced/education",
  geo:             "/admin/reports/advanced/geo",
  religious:       "/admin/reports/advanced/religious",
  income:          "/admin/reports/advanced/income",
  economic:        "/admin/reports/advanced/economic",
  insurance:       "/admin/reports/advanced/insurance",
  documents:       "/admin/reports/advanced/documents",
};

const EXPORT_CATEGORY: Partial<Record<SectionId, string>> = {
  "gender-status": "gender_status", population: "population", age: "personal",
  education: "education", geo: "geo", religious: "religious",
  income: "economic", economic: "economic", insurance: "insurance", documents: "documents",
};

const BAR_COLORS = [C.orange, C.blue, C.green, C.violet, C.amber, C.red, C.teal, C.pink];

// ─── Shared Tooltip ────────────────────────────────────────────

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
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color ?? p.fill, display: "block" }} />
          <span style={{ color: C.slate600 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: C.slate900 }}>{(p.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload, total = 100 }: any) => {
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
        {value} · <span style={{ color: C.orange, fontWeight: 700 }}>{p}%</span>
      </p>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "white", border: "1.5px solid #E8F0FE", borderRadius: 20,
      padding: 20, boxShadow: "0 2px 12px rgba(14,165,233,0.05)",
      transition: "box-shadow 0.2s, border-color 0.2s", ...style,
    }}>
      {children}
    </div>
  );
}

function ChartHeader({
  title, sub, onExport,
}: { title: string; sub?: string; onExport?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.slate900, margin: 0 }}>{title}</p>
        {sub && <p style={{ fontSize: 11.5, color: C.slate400, marginTop: 2 }}>{sub}</p>}
      </div>
      {onExport && (
        <button
          onClick={onExport}
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
            borderRadius: 8, border: "1px solid #E2E8F0", background: "white",
            fontSize: 11, color: C.slate400, cursor: "pointer", fontWeight: 600,
          }}
        >
          <FileSpreadsheet size={11} />Export
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, bg }: { label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <Card style={{ textAlign: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 900, color, margin: 0 }}>{typeof value === "number" ? value > 999 ? `${Math.round(value / 100) / 10}k` : value : value}</p>
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value?.toLocaleString?.() ?? value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.slate700 as any, marginTop: 3 }}>{label}</p>
      <p style={{ fontSize: 10.5, color: C.slate400, marginTop: 1 }}>{sub}</p>
    </Card>
  );
}

function LoadBlock() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: C.slate400 }}>
      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Loading data…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyBlock({ msg = "No data available." }: { msg?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.slate400, fontSize: 13, border: "2px dashed #E2E8F0", borderRadius: 16 }}>
      {msg}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 800, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.12em", margin: "24px 0 12px" }}>
      {children}
    </p>
  );
}

function RingChart({ label, yes, no, color }: { label: string; yes: number; no: number; color: string }) {
  const t = yes + no || 1;
  const p = Math.round((yes / t) * 100);
  return (
    <Card>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.slate800, marginBottom: 12 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: 72, height: 72, transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.5"
              strokeDasharray={`${p} 100`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 900, color, margin: 0 }}>{p}%</p>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {[{ name: "Yes", val: yes, c: color }, { name: "No", val: no, c: "#CBD5E1" }].map((r) => (
            <div key={r.name} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: C.slate600, fontWeight: 600 }}>{r.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: r.c }}>{r.val.toLocaleString()}</span>
              </div>
              <div style={{ height: 5, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: 5, borderRadius: 4, background: r.c, width: `${(r.val / t) * 100}%`, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Props & Component ─────────────────────────────────────────

interface Props {
  initialSection?: string;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  onSectionRendered?: () => void;
}

export default function AdvancedDashboard({ initialSection, onGoToCustomReport, onSectionRendered }: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>(
    (initialSection as SectionId) ?? "population"
  );
  const [data, setData] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (initialSection && SECTION_IDS.includes(initialSection as SectionId)) {
      setActiveSection(initialSection as SectionId);
    }
  }, [initialSection]);

  const loadSection = useCallback(async (section: SectionId) => {
    if (loaded[section] || loading[section]) return;
    setLoading((l) => ({ ...l, [section]: true }));
    try {
      const res = await fetch(`${API_BASE}${ENDPOINT[section]}`, { headers: getHeaders() });
      if (res.ok && mounted.current) {
        const json = await res.json();
        setData((d) => ({ ...d, [section]: json }));
        setLoaded((l) => ({ ...l, [section]: true }));
      }
    } catch (e) { console.error(e); }
    finally { if (mounted.current) setLoading((l) => ({ ...l, [section]: false })); }
  }, [loaded, loading]);

  useEffect(() => { loadSection(activeSection); }, [activeSection]); // eslint-disable-line

  const d = data[activeSection];
  const isLoading = loading[activeSection] && !loaded[activeSection];
  const nav = NAV.find((n) => n.id === activeSection)!;

  // ── Section Renderers ──────────────────────────────────────

  const renderGenderStatus = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const rows: Row[] = d.gender_status_breakdown ?? [];
    const revRows: Row[] = d.gender_status_by_reviewer ?? [];
    const genders = [...new Set(rows.map((r) => r.gender as string))].filter(Boolean);

    const getCount = (g: string, st: string) =>
      parseInt(rows.find((r) => r.gender === g && r.status === st)?.count as string ?? "0");
    const getRevCount = (g: string, st: string, role: string) =>
      parseInt(revRows.find((r) => r.gender === g && r.status === st && r.reviewer_role === role)?.count as string ?? "0");

    const barData = genders.map((g) => ({
      name: g.charAt(0).toUpperCase() + g.slice(1),
      Approved: getCount(g, "approved"),
      Rejected: getCount(g, "rejected"),
      Changes:  getCount(g, "changes_requested"),
    }));

    const pieTotal = barData.reduce((s, r) => s + r.Approved + r.Rejected + r.Changes, 0);
    const pieData = [
      { name: "Approved", value: barData.reduce((s, r) => s + r.Approved, 0), color: C.green },
      { name: "Rejected", value: barData.reduce((s, r) => s + r.Rejected, 0), color: C.red   },
      { name: "Changes",  value: barData.reduce((s, r) => s + r.Changes, 0),  color: C.amber },
    ].filter((d) => d.value > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Approval & Rejection by Gender" onExport={() => onGoToCustomReport(["personal"], "gender_status")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate400 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5 }} />
                <Bar dataKey="Approved" fill={C.green} radius={[4,4,0,0]} stackId="a" />
                <Bar dataKey="Rejected" fill={C.red}   stackId="a" />
                <Bar dataKey="Changes"  fill={C.amber} radius={[0,0,4,4]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Status Split" sub="All genders combined" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="46%" innerRadius={55} outerRadius={82} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<PieTip total={pieTotal} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <SectionLabel>By Reviewer Role × Gender</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {["admin","sangha"].map((role) => {
            const roleData = genders.map((g) => ({
              name: g.charAt(0).toUpperCase() + g.slice(1),
              Approved: getRevCount(g, "approved", role),
              Rejected: getRevCount(g, "rejected", role),
            }));
            return (
              <Card key={role}>
                <ChartHeader title={role === "admin" ? "🛠 Admin Reviewer" : "🏛 Sangha Reviewer"} />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={roleData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.slate400 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5 }} />
                    <Bar dataKey="Approved" fill={C.green} radius={[4,4,0,0]} />
                    <Bar dataKey="Rejected" fill={C.red}   radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPopulation = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const gd: Row[] = d.gender_distribution ?? [];
    const fmg: Row[] = d.family_member_gender ?? [];
    const ms: Row[] = d.marriage_status ?? [];
    const ds: Row[] = d.disability_status ?? [];
    const marriedCount   = parseInt(ms.find((r) => String(r.is_married) === "true")?.count as string ?? "0");
    const unmarriedCount = parseInt(ms.find((r) => String(r.is_married) === "false")?.count as string ?? "0");
    const disabledCount  = parseInt(ds.find((r) => String(r.has_disability) !== "no" && r.has_disability)?.count as string ?? "0");

    const genderChartData = gd.map((r) => ({
      name: String(r.gender ?? "Unknown"),
      count: parseInt(r.count as string),
      fill: r.gender === "male" ? C.blue : r.gender === "female" ? C.pink : "#94A3B8",
    }));
    const memberGenderData = fmg.map((r) => ({
      name: String(r.gender ?? "Unknown"),
      count: parseInt(r.count as string),
      fill: r.gender === "male" ? C.blue : r.gender === "female" ? C.pink : "#94A3B8",
    }));
    const marriageAreaData = [
      { name: "Married", value: marriedCount, fill: C.green },
      { name: "Single",  value: unmarriedCount, fill: C.orange },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Total Families"   value={d.total_families ?? 0}   sub="Approved profiles" color={C.orange} bg={C.orangeLight} />
          <StatCard label="Total Population" value={d.total_population ?? 0} sub="Family members"    color={C.blue}   bg={C.blueLight}  />
          <StatCard label="Married"          value={marriedCount}            sub="Households"        color={C.green}  bg={C.greenLight} />
          <StatCard label="With Disability"  value={disabledCount}           sub="Reported"          color={C.amber}  bg={C.amberLight} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Head-of-Household Gender" onExport={() => onGoToCustomReport(["personal"], "population")} />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={genderChartData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Count" radius={[8,8,0,0]}>
                  {genderChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Family Members by Gender" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberGenderData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Members" radius={[8,8,0,0]}>
                  {memberGenderData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Marital Status" />
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={marriageAreaData} cx="50%" cy="46%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                  {marriageAreaData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList dataKey="name" position="outside" style={{ fontSize: 10, fontWeight: 700 }} />
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <RingChart label="Married" yes={marriedCount} no={unmarriedCount} color={C.green} />
          <RingChart label="Single / Unmarried" yes={unmarriedCount} no={marriedCount} color={C.orange} />
        </div>
      </div>
    );
  };

  const renderAge = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const profileAges: Row[] = d.profile_age_groups ?? [];
    const memberAges: Row[]  = d.member_age_groups_by_gender ?? [];
    const AGE_GROUPS = ["Under 18","18 – 30","31 – 45","46 – 60","Above 60"];
    const AGE_COLORS = [C.violet, C.blue, C.orange, C.green, C.red];

    const headData = AGE_GROUPS.map((ag, i) => ({
      name: ag,
      count: parseInt(profileAges.find((r) => r.age_group === ag)?.count as string ?? "0"),
      fill: AGE_COLORS[i],
    }));
    const radialData = headData.map((d) => ({ name: d.name, value: d.count, fill: d.fill }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Head-of-Household Age Distribution" onExport={() => onGoToCustomReport(["personal"], "age")} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={headData} margin={{ left: -20, right: 5, top: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Members" radius={[8,8,0,0]}>
                  {headData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Age Radial View" />
            <ResponsiveContainer width="100%" height={240}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={12} outerRadius={100} barSize={12} data={radialData}>
                <PolarAngleAxis type="number" domain={[0, Math.max(...headData.map(d => d.count)) + 5]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={6} label={{ position: "insideStart", fill: "#fff", fontSize: 9, fontWeight: 700 }} />
                <Tooltip formatter={(v: any) => v} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <SectionLabel>Family Members Age × Gender</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {["male","female"].map((g) => {
            const gData = AGE_GROUPS.map((ag, i) => ({
              name: ag,
              count: parseInt(memberAges.find((r) => r.age_group === ag && r.gender === g)?.count as string ?? "0"),
              fill: AGE_COLORS[i],
            }));
            return (
              <Card key={g}>
                <ChartHeader title={g === "male" ? "♂ Male Members" : "♀ Female Members"} />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Members" radius={[6,6,0,0]}>
                      {gData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEducation = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const eduLevels: Row[]  = d.education_levels   ?? [];
    const profTypes: Row[]  = d.profession_types    ?? [];
    const industries: Row[] = d.industries          ?? [];
    const workSt: Row[]     = d.work_status         ?? [];
    const studySt: Row[]    = d.study_status        ?? [];

    const workingCount    = parseInt(workSt.find((r) => String(r.is_currently_working) === "true")?.count as string ?? "0");
    const notWorkingCount = parseInt(workSt.find((r) => String(r.is_currently_working) === "false")?.count as string ?? "0");
    const studyingCount   = parseInt(studySt.find((r) => String(r.is_currently_studying) === "true")?.count as string ?? "0");
    const notStudyingCount= parseInt(studySt.find((r) => String(r.is_currently_studying) === "false")?.count as string ?? "0");

    const eduData = eduLevels.slice(0,10).map((r) => ({ name: String(r.highest_education ?? "Unknown").slice(0, 22), count: parseInt(r.count as string) }));
    const profData = profTypes.slice(0,8).map((r) => ({ name: String(r.profession_type ?? "Unknown").replace(/_/g," ").slice(0,22), count: parseInt(r.count as string) }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Currently Working"  value={workingCount}     sub="Members" color={C.green}  bg={C.greenLight} />
          <StatCard label="Not Working"        value={notWorkingCount}  sub="Members" color={C.red}    bg={C.redLight}   />
          <StatCard label="Currently Studying" value={studyingCount}    sub="Members" color={C.blue}   bg={C.blueLight}  />
          <StatCard label="Not Studying"       value={notStudyingCount} sub="Members" color={C.slate400} bg={C.slate100}  />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Highest Education Level" onExport={() => onGoToCustomReport(["education"], "education")} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={eduData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10.5, fill: C.slate600 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Members" radius={[0,8,8,0]}>
                  {eduData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Profession Type" onExport={() => onGoToCustomReport(["education"], "education")} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={profData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.slate400 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10.5, fill: C.slate600 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Members" radius={[0,8,8,0]}>
                  {profData.map((_, i) => <Cell key={i} fill={BAR_COLORS[(i+2) % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <RingChart label="Currently Working" yes={workingCount} no={notWorkingCount} color={C.green} />
          <RingChart label="Currently Studying" yes={studyingCount} no={notStudyingCount} color={C.blue} />
        </div>
        {industries.length > 0 && (
          <Card>
            <ChartHeader title="Top Industries" onExport={() => onGoToCustomReport(["education"], "education")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={industries.slice(0,8).map((r) => ({ name: String(r.industry ?? "—").slice(0,18), count: parseInt(r.count as string) }))} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" fill={C.blue} radius={[6,6,0,0]} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    );
  };

  const renderGeo = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const byState: Row[]    = d.by_state    ?? [];
    const byDistrict: Row[] = d.by_district ?? [];
    const byCity: Row[]     = d.by_city     ?? [];
    const GEO_COLORS = [C.teal,"#0EA5E9","#2DD4BF","#5EEAD4","#0891B2","#06B6D4","#22D3EE","#67E8F9"];

    const stateData = byState.map((r, i) => ({ name: String(r.state ?? "—").slice(0,14), count: parseInt(r.count as string) }));
    const districtData = byDistrict.slice(0,8).map((r) => ({
      name: `${String(r.district ?? "—").slice(0,12)}, ${String(r.state ?? "").slice(0,2)}`,
      count: parseInt(r.count as string),
    }));
    const cityData = byCity.slice(0,8).map((r) => ({ city: String(r.city ?? "—").slice(0,14), count: parseInt(r.count as string) }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="State-wise Distribution" onExport={() => onGoToCustomReport(["personal"], "geo")} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stateData} margin={{ top: 15, right: 20, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.slate400 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" radius={[8,8,0,0]} maxBarSize={60} name="Families">
                  {byState.map((_, i) => <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#0D9488" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Top Districts" onExport={() => onGoToCustomReport(["personal"], "geo")} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={districtData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10.5, fill: C.slate600 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" fill={C.blue} radius={[0,8,8,0]} name="Families" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {cityData.length > 0 && (
          <Card>
            <ChartHeader title="Top Cities" onExport={() => onGoToCustomReport(["personal"], "geo")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityData} margin={{ top: 15, right: 20, left: -16, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="city" tick={{ fontSize: 11, fill: C.slate600 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: C.slate400 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "#F0FDF4" }} />
                <Bar dataKey="count" radius={[10,10,0,0]} maxBarSize={72} name="Families">
                  {byCity.slice(0,8).map((_, i) => <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10.5, fontWeight: 700, fill: "#0D9488" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    );
  };

  const renderIncome = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const selfInc: Row[]  = d.self_income_distribution   ?? [];
    const famInc: Row[]   = d.family_income_distribution ?? [];
    const byGender: Row[] = d.self_income_by_gender      ?? [];
    const INCOME_COLORS = [C.red, C.amber, C.orange, C.blue, C.green];

    const selfData = selfInc.map((r) => ({ name: String(r.income_range ?? "—").replace(/_/g," "), count: parseInt(r.count as string) }));
    const famData  = famInc.map((r)  => ({ name: String(r.income_range ?? "—").replace(/_/g," "), count: parseInt(r.count as string) }));
    const genderIncome = selfInc.map((r) => {
      const range = r.income_range as string;
      return {
        name: range.replace(/_/g," "),
        Male:   parseInt(byGender.find((bg) => bg.gender==="male"   && bg.income_range===range)?.count as string ?? "0"),
        Female: parseInt(byGender.find((bg) => bg.gender==="female" && bg.income_range===range)?.count as string ?? "0"),
      };
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Individual (Self) Income" onExport={() => onGoToCustomReport(["economic"], "income")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={selfData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Members" radius={[6,6,0,0]}>
                  {selfData.map((_, i) => <Cell key={i} fill={INCOME_COLORS[i%INCOME_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Family Income Distribution" onExport={() => onGoToCustomReport(["economic"], "income")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={famData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="count" name="Families" radius={[6,6,0,0]}>
                  {famData.map((_, i) => <Cell key={i} fill={INCOME_COLORS[i%INCOME_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {genderIncome.length > 0 && (
          <Card>
            <ChartHeader title="Individual Income by Gender (Male vs Female)" onExport={() => onGoToCustomReport(["economic"], "income")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={genderIncome} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5 }} />
                <Bar dataKey="Male"   fill={C.blue} radius={[4,4,0,0]} />
                <Bar dataKey="Female" fill={C.pink} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    );
  };

  const renderEconomic = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const assets = d.assets ?? {};
    const invst  = d.investments ?? {};
    const total = parseInt(assets.total ?? "0") || 1;

    const assetData = [
      { name: "Own House",    value: parseInt(assets.own_house ?? "0"),         fill: C.orange },
      { name: "Agri Land",    value: parseInt(assets.agricultural_land ?? "0"), fill: C.green  },
      { name: "2-Wheeler",    value: parseInt(assets.two_wheeler ?? "0"),       fill: C.blue   },
      { name: "4-Wheeler",    value: parseInt(assets.four_wheeler ?? "0"),      fill: C.violet },
      { name: "Rented House", value: parseInt(assets.rented_house ?? "0"),      fill: C.amber  },
    ];
    const investData = [
      { name: "Fixed Deposits", value: parseInt(invst.fixed_deposits   ?? "0"), fill: C.green  },
      { name: "Mutual Funds",   value: parseInt(invst.mutual_funds_sip ?? "0"), fill: C.blue   },
      { name: "Shares/Demat",   value: parseInt(invst.shares_demat     ?? "0"), fill: C.violet },
      { name: "Other Inv.",     value: parseInt(invst.other_investments ?? "0"), fill: C.amber  },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {assetData.map((asset) => {
            const p = Math.round((asset.value / total) * 100);
            return (
              <Card key={asset.name} style={{ textAlign: "center", padding: "16px 12px", cursor: "pointer" }}
                onClick={() => onGoToCustomReport(["economic"], "economic")}>
                <p style={{ fontSize: 11, color: C.slate600, fontWeight: 600, marginBottom: 10 }}>{asset.name}</p>
                <div style={{ position: "relative", width: 60, height: 60, margin: "0 auto" }}>
                  <svg viewBox="0 0 36 36" style={{ width: 60, height: 60, transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={asset.fill} strokeWidth="3.5"
                      strokeDasharray={`${p} 100`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 900, color: asset.fill, margin: 0 }}>{p}%</p>
                  </div>
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.slate900, marginTop: 8 }}>{asset.value.toLocaleString()}</p>
              </Card>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Asset Ownership" onExport={() => onGoToCustomReport(["economic"], "economic")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assetData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Count" radius={[8,8,0,0]}>
                  {assetData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 9, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Investment Breakdown" onExport={() => onGoToCustomReport(["economic"], "economic")} />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={investData} cx="50%" cy="46%" innerRadius={55} outerRadius={82} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                  {investData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  };

  const renderReligious = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const gotra: Row[]     = d.gotra_gender     ?? [];
    const kuladevata: Row[] = d.kuladevata_gender ?? [];
    const pravara: Row[]   = d.pravara_gender   ?? [];

    const buildRows = (rows: Row[], key: string) => {
      const names = [...new Set(rows.map((r) => String(r[key] ?? "—")))].slice(0,10);
      return names.map((name) => ({
        name: name.length > 14 ? `${name.slice(0,14)}…` : name,
        Male:   parseInt(rows.find((r) => String(r[key])===name && String(r.gender).toLowerCase()==="male")?.count as string ?? "0"),
        Female: parseInt(rows.find((r) => String(r[key])===name && String(r.gender).toLowerCase()==="female")?.count as string ?? "0"),
      }));
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {[
          { title: "Gotra Distribution", data: buildRows(gotra, "gotra") },
          { title: "Kuladevata Distribution", data: buildRows(kuladevata, "kuladevata") },
          { title: "Pravara Distribution", data: buildRows(pravara, "pravara") },
        ].map((block) => (
          <Card key={block.title}>
            <ChartHeader title={block.title} sub="Gender split" onExport={() => onGoToCustomReport(["personal","religious"], "religious")} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={block.data} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5 }} />
                <Bar dataKey="Male"   fill={C.blue} radius={[4,4,0,0]} />
                <Bar dataKey="Female" fill={C.pink} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>
    );
  };

  const renderInsurance = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const s   = d.insurance_summary ?? {};
    const bg: Row[] = d.insurance_by_gender ?? [];
    const total = parseInt(s.total_records ?? "0") || 1;

    const insData = [
      { name: "Health",       value: parseInt(s.has_health       ?? "0"), fill: C.green  },
      { name: "Life",         value: parseInt(s.has_life         ?? "0"), fill: C.blue   },
      { name: "Term",         value: parseInt(s.has_term         ?? "0"), fill: C.violet },
      { name: "Konkani Card", value: parseInt(s.has_konkani_card ?? "0"), fill: C.amber  },
      { name: "No Insurance", value: parseInt(s.no_insurance     ?? "0"), fill: C.red    },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {insData.map((ins) => {
            const p = Math.round((ins.value / total) * 100);
            return (
              <Card key={ins.name} style={{ textAlign: "center", padding: "16px 12px" }}>
                <p style={{ fontSize: 11, color: C.slate600, fontWeight: 600, marginBottom: 6 }}>{ins.name}</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: ins.fill }}>{ins.value.toLocaleString()}</p>
                <p style={{ fontSize: 10, color: C.slate400 }}>{p}% of records</p>
              </Card>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Users possessing insurances " onExport={() => onGoToCustomReport(["insurance"], "insurance")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Members" radius={[8,8,0,0]}>
                  {insData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 9, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Type Split" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={insData.filter(d=>d.value>0)} cx="50%" cy="46%" outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                  {insData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {bg.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {["male","female"].map((g) => {
              const row = bg.find((r) => r.gender === g);
              if (!row) return null;
              const gData = [
                { name: "Health", value: parseInt(row.has_health as string ?? "0"), fill: C.green  },
                { name: "Life",   value: parseInt(row.has_life   as string ?? "0"), fill: C.blue   },
                { name: "Term",   value: parseInt(row.has_term   as string ?? "0"), fill: C.violet },
              ];
              return (
                <Card key={g}>
                  <ChartHeader title={g === "male" ? "♂ Male Insurance" : "♀ Female Insurance"} />
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="value" name="Members" radius={[6,6,0,0]}>
                        {gData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDocuments = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;
    const s   = d.document_summary ?? {};
    const bg: Row[] = d.documents_by_gender ?? [];
    const total = parseInt(s.total_records ?? "0") || 1;

    const docData = [
      { name: "Aadhaar",      value: parseInt(s.has_aadhaar  ?? "0"), fill: C.green  },
      { name: "PAN Card",     value: parseInt(s.has_pan      ?? "0"), fill: C.blue   },
      { name: "Voter ID",     value: parseInt(s.has_voter_id ?? "0"), fill: C.violet },
      { name: "Land Docs",    value: parseInt(s.has_land_doc ?? "0"), fill: C.amber  },
      { name: "Driver's Lic", value: parseInt(s.has_dl       ?? "0"), fill: C.orange },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {docData.map((doc) => {
            const p = Math.round((doc.value / total) * 100);
            return (
              <Card key={doc.name} style={{ textAlign: "center", padding: "16px 12px", cursor: "pointer" }}
                onClick={() => onGoToCustomReport(["documents"], "documents")}>
                <p style={{ fontSize: 11, color: C.slate600, fontWeight: 600, marginBottom: 4 }}>{doc.name}</p>
                <p style={{ fontSize: 30, fontWeight: 900, color: doc.fill }}>{p}%</p>
                <p style={{ fontSize: 10, color: C.slate400, marginBottom: 6 }}>verified</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓ {doc.value}</span>
                  <span style={{ color: C.slate400 }}>{total - doc.value} no</span>
                </div>
              </Card>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
          <Card>
            <ChartHeader title="Documentation Coverage" onExport={() => onGoToCustomReport(["documents"], "documents")} />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={docData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="value" name="Members" radius={[8,8,0,0]}>
                  {docData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 9, fontWeight: 700, fill: C.slate600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <ChartHeader title="Document Types" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={docData.filter(d=>d.value>0)} cx="50%" cy="46%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                  {docData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
        {bg.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {["male","female"].map((g) => {
              const row = bg.find((r) => r.gender === g);
              if (!row) return null;
              const gData = [
                { name: "Aadhaar",  value: parseInt(row.has_aadhaar  as string ?? "0"), fill: C.green  },
                { name: "PAN",      value: parseInt(row.has_pan      as string ?? "0"), fill: C.blue   },
                { name: "Voter ID", value: parseInt(row.has_voter_id as string ?? "0"), fill: C.violet },
              ];
              return (
                <Card key={g}>
                  <ChartHeader title={g === "male" ? "♂ Male Documents" : "♀ Female Documents"} />
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                        {gData.map((dd, i) => <Cell key={i} fill={dd.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const RENDERERS: Record<SectionId, () => React.ReactNode> = {
    "gender-status": renderGenderStatus,
    population:      renderPopulation,
    age:             renderAge,
    education:       renderEducation,
    geo:             renderGeo,
    religious:       renderReligious,
    income:          renderIncome,
    economic:        renderEconomic,
    insurance:       renderInsurance,
    documents:       renderDocuments,
  };

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 600 }}>
      {/* ── Left Nav ── */}
      <aside style={{
        width: 200, flexShrink: 0,
        background: "white",
        border: "1.5px solid #E8F0FE",
        borderRadius: "20px 0 0 20px",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(14,165,233,0.05)",
      }}>
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid #F1F5F9",
          background: "linear-gradient(135deg, #FFF7ED, #F0F9FF)",
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, color: C.slate400, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
            Analytics Sections
          </p>
        </div>
        {NAV.map((n) => {
          const isActive = activeSection === n.id;
          return (
            <div
              key={n.id}
              onClick={() => { setActiveSection(n.id); loadSection(n.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "10px 14px", cursor: "pointer",
                borderLeft: `3px solid ${isActive ? n.color : "transparent"}`,
                background: isActive ? n.bg : "transparent",
                transition: "all 0.2s",
                borderBottom: "1px solid #F8FAFC",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#F8FAFC"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: isActive ? n.bg : C.slate100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <n.icon size={13} style={{ color: isActive ? n.color : C.slate400 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? n.color : C.slate600, flex: 1 }}>
                {n.label}
              </span>
              {loading[n.id] && <Loader2 size={11} style={{ color: n.color, animation: "spin 1s linear infinite" }} />}
              {isActive && <ChevronRight size={11} style={{ color: n.color }} />}
            </div>
          );
        })}
      </aside>

      {/* ── Main Content ── */}
      <div style={{
        flex: 1,
        background: "white",
        border: "1.5px solid #E8F0FE",
        borderLeft: "none",
        borderRadius: "0 20px 20px 0",
        padding: "24px 24px",
        overflowY: "auto",
        boxShadow: "0 2px 12px rgba(14,165,233,0.05)",
      }}>
        {/* Section header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
          paddingBottom: 18, borderBottom: "1px solid #F1F5F9",
        }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: nav.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <nav.icon size={20} style={{ color: nav.color }} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: C.slate900, margin: 0 }}>{nav.label}</h2>
            <p style={{ fontSize: 11.5, color: C.slate400, marginTop: 2 }}>Based on approved profiles</p>
          </div>
          {EXPORT_CATEGORY[activeSection] && (
            <button
              onClick={() => onGoToCustomReport([EXPORT_CATEGORY[activeSection] ?? "personal"], EXPORT_CATEGORY[activeSection])}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10,
                border: "1.5px solid #D1FAE5", background: "#F0FDF4",
                fontSize: 12, fontWeight: 700, color: C.green, cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={13} />Export Section
            </button>
          )}
        </div>

        {/* Tip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 12,
          background: "linear-gradient(135deg, #FFF7ED, #F0F9FF)",
          border: "1px solid #FDBA74",
          marginBottom: 20,
        }}>
          <Sparkles size={14} style={{ color: C.orange, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: C.slate600, margin: 0 }}>
            Analytics based on approved profiles.{" "}
            <span style={{ color: C.orange, fontWeight: 700 }}>Click Export to open in Custom Report for filtered downloads.</span>
          </p>
        </div>

        {/* Content */}
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          {RENDERERS[activeSection]?.()}
        </div>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}
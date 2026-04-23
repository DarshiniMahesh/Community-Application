// Community-Application\admin\src\app\dashboard\reports\AdvancedDashboard.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, Activity, AlertCircle, Sparkles, FileSpreadsheet,
  Filter, Loader2, ChevronRight,
} from "lucide-react";

// ─── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : ""
  }`,
});

// ─── Types ────────────────────────────────────────────────────────────────────

// NOTE: boolean added to fix ts(2367) - PostgreSQL booleans arrive as JS booleans via node-postgres
type Row = { [key: string]: string | number | boolean | null };

const SECTION_IDS = [
  "gender-status", "population", "age", "education",
  "geo", "income", "economic", "insurance", "documents",
] as const;
type SectionId = typeof SECTION_IDS[number];

const NAV: { id: SectionId; label: string; icon: any }[] = [
  { id: "gender-status", label: "Gender × Status",  icon: Activity    },
  { id: "population",    label: "Population",        icon: Users       },
  { id: "age",           label: "Age Groups",        icon: Activity    },
  { id: "education",     label: "Education",         icon: GraduationCap },
  { id: "geo",           label: "Geo Location",      icon: MapPin      },
  { id: "income",        label: "Earnings",          icon: Wallet      },
  { id: "economic",      label: "Economic",          icon: Home        },
  { id: "insurance",     label: "Insurance",         icon: Shield      },
  { id: "documents",     label: "Documents",         icon: FileText    },
];

const ENDPOINT: Record<SectionId, string> = {
  "gender-status": "/admin/reports/advanced/gender-status-detail",
  population:      "/admin/reports/advanced/population",
  age:             "/admin/reports/advanced/age-groups",
  education:       "/admin/reports/advanced/education",
  geo:             "/admin/reports/advanced/geo",
  income:          "/admin/reports/advanced/income",
  economic:        "/admin/reports/advanced/economic",
  insurance:       "/admin/reports/advanced/insurance",
  documents:       "/admin/reports/advanced/documents",
};

const ACCENT: Record<SectionId, string> = {
  "gender-status": "#d97706",
  population:      "#f97316",
  age:             "#7c3aed",
  education:       "#2563eb",
  geo:             "#14b8a6",
  income:          "#10b981",
  economic:        "#f97316",
  insurance:       "#2563eb",
  documents:       "#7c3aed",
};

const EXPORT_CATEGORY: Partial<Record<SectionId, string>> = {
  "gender-status": "gender_status",
  population:      "population",
  age:             "personal",
  education:       "education",
  geo:             "geo",
  income:          "economic",
  economic:        "economic",
  insurance:       "insurance",
  documents:       "documents",
};

// ─── Shared chart helpers ─────────────────────────────────────────────────────

const BAR_COLORS = ["#f97316","#2563eb","#10b981","#7c3aed","#d97706","#ef4444","#14b8a6","#ec4899"];

const BarTip = ({ active, payload, label }: any) => {
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

const PieTip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const p = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500 mt-1">
        {value} · <span className="text-orange-600 font-bold">{p}%</span>
      </p>
    </div>
  );
};

// ─── Layout sub-components ────────────────────────────────────────────────────

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-5">
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-slate-700 mt-1">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ChartCard({
  title, subtitle, children, onExport,
}: {
  title: string; subtitle?: string; children: React.ReactNode; onExport?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="ml-3 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-all text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function LoadBlock() {
  return (
    <div className="flex items-center justify-center gap-3 text-slate-400 py-16">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function EmptyBlock({ msg = "No data available." }: { msg?: string }) {
  return (
    <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
      {msg}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialSection?: string;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  onSectionRendered?: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdvancedDashboard({ initialSection, onGoToCustomReport, onSectionRendered }: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>(
    (initialSection as SectionId) ?? "population"
  );
  const [data, setData]     = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Sync initialSection prop (deep link from General dashboard)
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
    } catch (e) {
      console.error(e);
    } finally {
      if (mounted.current) setLoading((l) => ({ ...l, [section]: false }));
    }
  }, [loaded, loading]);

  useEffect(() => {
    loadSection(activeSection);
  }, [activeSection]); // eslint-disable-line

  const d = data[activeSection];
  const isLoading = loading[activeSection] && !loaded[activeSection];

  // ── Section Renderers ──────────────────────────────────────────────────────

  // 1. Gender × Status
  const renderGenderStatus = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const rows: Row[] = d.gender_status_breakdown ?? [];
    const revRows: Row[] = d.gender_status_by_reviewer ?? [];
    const genders = [...new Set(rows.map((r) => r.gender as string))].filter(Boolean);
    const statuses = ["approved", "rejected", "changes_requested"];
    const STATUS_COLOR: Record<string, string> = {
      approved: "#10b981", rejected: "#ef4444", changes_requested: "#d97706",
    };
    const GENDER_COLOR: Record<string, string> = {
      male: "#2563eb", female: "#ec4899", other: "#7c3aed",
    };

    const getCount = (g: string, st: string) =>
      parseInt(rows.find((r) => r.gender === g && r.status === st)?.count as string ?? "0");

    const getRevCount = (g: string, st: string, role: string) =>
      parseInt(revRows.find((r) => r.gender === g && r.status === st && r.reviewer_role === role)?.count as string ?? "0");

    const barData = genders.map((g) => ({
      name: g.charAt(0).toUpperCase() + g.slice(1),
      Approved:  getCount(g, "approved"),
      Rejected:  getCount(g, "rejected"),
      Changes:   getCount(g, "changes_requested"),
    }));

    return (
      <>
        <ChartCard title="Approval & Rejection by Gender"
          onExport={() => onGoToCustomReport(["personal"], "gender_status")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<BarTip />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
              <Bar dataKey="Approved" fill="#10b981" radius={[4,4,0,0]} stackId="a" />
              <Bar dataKey="Rejected" fill="#ef4444" stackId="a" />
              <Bar dataKey="Changes"  fill="#d97706" radius={[0,0,4,4]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <SubTitle>By Reviewer Role × Gender</SubTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
          {["admin", "sangha"].map((role) => {
            const roleData = genders.map((g) => ({
              name: g.charAt(0).toUpperCase() + g.slice(1),
              Approved: getRevCount(g, "approved", role),
              Rejected: getRevCount(g, "rejected", role),
            }));
            return (
              <ChartCard
                key={role}
                title={role === "admin" ? "🛠 Admin Reviewer" : "🏛 Sangha Reviewer"}
              >
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={roleData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<BarTip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Approved" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="Rejected" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            );
          })}
        </div>
      </>
    );
  };

  // 2. Population
  const renderPopulation = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const gd: Row[] = d.gender_distribution ?? [];
    const fmg: Row[] = d.family_member_gender ?? [];
    const ms: Row[] = d.marriage_status ?? [];
    const ds: Row[] = d.disability_status ?? [];

    // Fix ts(2367): compare using String() since Row values can be boolean from postgres
    const marriedCount   = parseInt(ms.find((r) => String(r.is_married) === "true")?.count as string ?? "0");
    const unmarriedCount = parseInt(ms.find((r) => String(r.is_married) === "false")?.count as string ?? "0");
    const disabledCount  = parseInt(ds.find((r) => String(r.has_disability) !== "no" && r.has_disability)?.count as string ?? "0");

    const genderChartData = gd.map((r) => ({
      name: String(r.gender ?? "Unknown"),
      count: parseInt(r.count as string),
      fill: r.gender === "male" ? "#2563eb" : r.gender === "female" ? "#ec4899" : "#94a3b8",
    }));

    const memberGenderData = fmg.map((r) => ({
      name: String(r.gender ?? "Unknown"),
      count: parseInt(r.count as string),
      fill: r.gender === "male" ? "#2563eb" : r.gender === "female" ? "#ec4899" : "#94a3b8",
    }));

    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Families"   value={d.total_families ?? 0}   sub="Approved profiles"   color="#f97316" />
          <StatCard label="Total Population" value={d.total_population ?? 0} sub="Family members"      color="#2563eb" />
          <StatCard label="Married"          value={marriedCount}             sub="Households"          color="#10b981" />
          <StatCard label="With Disability"  value={disabledCount}            sub="Reported"            color="#d97706" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Head-of-Household Gender"
            onExport={() => onGoToCustomReport(["personal"], "population")}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={genderChartData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Count" radius={[6,6,0,0]}>
                  {genderChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Family Members by Gender"
            onExport={() => onGoToCustomReport(["personal"], "population")}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={memberGenderData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Members" radius={[6,6,0,0]}>
                  {memberGenderData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          {[
            { name: "Married",   val: marriedCount,   color: "#10b981" },
            { name: "Unmarried", val: unmarriedCount, color: "#f97316" },
          ].map((item) => {
            const total = marriedCount + unmarriedCount || 1;
            const p = Math.round((item.val / total) * 100);
            return (
              <div key={item.name} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
                <p className="text-xs text-slate-500 font-medium mb-3">Marital: {item.name}</p>
                <div className="relative w-20 h-20 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={item.color} strokeWidth="3.5"
                      strokeDasharray={`${p} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm font-black" style={{ color: item.color }}>{p}%</p>
                  </div>
                </div>
                <p className="text-lg font-bold mt-2" style={{ color: item.color }}>{item.val.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // 3. Age Groups
  const renderAge = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const profileAges: Row[] = d.profile_age_groups ?? [];
    const memberAges: Row[]  = d.member_age_groups_by_gender ?? [];
    const AGE_GROUPS = ["Under 18", "18 – 30", "31 – 45", "46 – 60", "Above 60"];
    const AGE_COLORS = ["#7c3aed","#2563eb","#f97316","#10b981","#ef4444"];

    const headData = AGE_GROUPS.map((ag, i) => ({
      name: ag,
      count: parseInt(profileAges.find((r) => r.age_group === ag)?.count as string ?? "0"),
      fill: AGE_COLORS[i],
    }));

    return (
      <>
        <ChartCard title="Head-of-Household Age Distribution"
          onExport={() => onGoToCustomReport(["personal"], "age")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={headData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="count" name="Members" radius={[6,6,0,0]}>
                {headData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <SubTitle>Family Members Age × Gender</SubTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
          {["male", "female"].map((g) => {
            const gData = AGE_GROUPS.map((ag, i) => ({
              name: ag,
              count: parseInt(memberAges.find((r) => r.age_group === ag && r.gender === g)?.count as string ?? "0"),
              fill: AGE_COLORS[i],
            }));
            return (
              <ChartCard key={g}
                title={g === "male" ? "♂ Male Members" : "♀ Female Members"}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<BarTip />} />
                    <Bar dataKey="count" name="Members" radius={[4,4,0,0]}>
                      {gData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            );
          })}
        </div>
      </>
    );
  };

  // 4. Education
  const renderEducation = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const eduLevels: Row[]  = d.education_levels   ?? [];
    const profTypes: Row[]  = d.profession_types    ?? [];
    const selfEmp: Row[]    = d.self_employed_types ?? [];
    const industries: Row[] = d.industries          ?? [];
    const workSt: Row[]     = d.work_status         ?? [];
    const studySt: Row[]    = d.study_status        ?? [];

    // Fix ts(2367): use String() comparison for booleans from postgres
    const workingCount    = parseInt(workSt.find((r) => String(r.is_currently_working) === "true")?.count as string ?? "0");
    const notWorkingCount = parseInt(workSt.find((r) => String(r.is_currently_working) === "false")?.count as string ?? "0");
    const studyingCount   = parseInt(studySt.find((r) => String(r.is_currently_studying) === "true")?.count as string ?? "0");
    const notStudyingCount= parseInt(studySt.find((r) => String(r.is_currently_studying) === "false")?.count as string ?? "0");

    const eduData = eduLevels.slice(0, 10).map((r, i) => ({
      name: String(r.highest_education ?? "Unknown").slice(0, 20),
      count: parseInt(r.count as string),
    }));

    const profData = profTypes.slice(0, 8).map((r) => ({
      name: String(r.profession_type ?? "Unknown").replace(/_/g, " ").slice(0, 20),
      count: parseInt(r.count as string),
    }));

    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Currently Working"  value={workingCount}     sub="Members" color="#10b981" />
          <StatCard label="Not Working"        value={notWorkingCount}  sub="Members" color="#ef4444" />
          <StatCard label="Currently Studying" value={studyingCount}    sub="Members" color="#2563eb" />
          <StatCard label="Not Studying"       value={notStudyingCount} sub="Members" color="#94a3b8" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Highest Education Level"
            onExport={() => onGoToCustomReport(["education"], "education")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={eduData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Members" radius={[0,6,6,0]}>
                  {eduData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Profession Type"
            onExport={() => onGoToCustomReport(["education"], "education")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={profData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Members" radius={[0,6,6,0]}>
                  {profData.map((_, i) => <Cell key={i} fill={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Working / Studying ring charts */}
        <div className="grid grid-cols-2 gap-5 mt-5">
          {[
            { label: "Currently Working",  yes: workingCount,  no: notWorkingCount,  color: "#10b981" },
            { label: "Currently Studying", yes: studyingCount, no: notStudyingCount, color: "#2563eb" },
          ].map((s) => {
            const t = s.yes + s.no || 1;
            const p = Math.round((s.yes / t) * 100);
            return (
              <ChartCard key={s.label} title={s.label} subtitle="Yes vs No">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={s.color} strokeWidth="3"
                        strokeDasharray={`${p} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm font-black" style={{ color: s.color }}>{p}%</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {[{ name: "Yes", val: s.yes, c: s.color }, { name: "No", val: s.no, c: "#94a3b8" }].map((r) => (
                      <div key={r.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-500">{r.name}</span>
                          <span className="text-xs font-bold" style={{ color: r.c }}>{r.val.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{ width: `${(r.val / t) * 100}%`, backgroundColor: r.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            );
          })}
        </div>

        {/* Industries */}
        {industries.length > 0 && (
          <div className="mt-5">
            <ChartCard title="Top Industries"
              onExport={() => onGoToCustomReport(["education"], "education")}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={industries.slice(0, 8).map((r) => ({
                    name: String(r.industry ?? "—").slice(0, 20),
                    count: parseInt(r.count as string),
                  }))}
                  margin={{ left: -20, right: 5, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4,4,0,0]} name="Members" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </>
    );
  };

  // 5. Geo
  const renderGeo = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const byState: Row[]    = d.by_state    ?? [];
    const byDistrict: Row[] = d.by_district ?? [];
    const byCity: Row[]     = d.by_city     ?? [];
    const byPincode: Row[]  = d.by_pincode  ?? [];

    const GEO_COLORS = ["#14b8a6","#0ea5e9","#2dd4bf","#5eead4","#0891b2","#06b6d4","#22d3ee","#67e8f9"];

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="State-wise Distribution"
            onExport={() => onGoToCustomReport(["personal"], "geo")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byState.map((r, i) => ({ name: String(r.state ?? "—").slice(0, 14), count: parseInt(r.count as string) }))}
                margin={{ top: 15, right: 20, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" radius={[6,6,0,0]} maxBarSize={60} name="Families">
                  {byState.map((_, i) => <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#0d9488" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Districts"
            onExport={() => onGoToCustomReport(["personal"], "geo")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={byDistrict.slice(0, 8).map((r) => ({
                  name: `${String(r.district ?? "—").slice(0, 12)}, ${String(r.state ?? "").slice(0, 2)}`,
                  count: parseInt(r.count as string),
                }))}
                margin={{ left: 8, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0,6,6,0]} name="Families" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {byCity.length > 0 && (
          <div className="mt-5">
            <ChartCard title="Top Cities"
              onExport={() => onGoToCustomReport(["personal"], "geo")}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={byCity.slice(0, 8).map((r, i) => ({
                    city: String(r.city ?? "—").slice(0, 14),
                    count: parseInt(r.count as string),
                  }))}
                  margin={{ top: 15, right: 20, left: -16, bottom: 4 }} barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="city" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTip />} cursor={{ fill: "#f0fdfa" }} />
                  <Bar dataKey="count" radius={[8,8,0,0]} maxBarSize={72} name="Families">
                    {byCity.slice(0, 8).map((_, i) => <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />)}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0d9488" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </>
    );
  };

  // 6. Income
  const renderIncome = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const selfInc: Row[]   = d.self_income_distribution   ?? [];
    const famInc: Row[]    = d.family_income_distribution ?? [];
    const byGender: Row[]  = d.self_income_by_gender      ?? [];

    const INCOME_COLORS = ["#ef4444","#d97706","#f97316","#2563eb","#10b981"];

    const selfData = selfInc.map((r, i) => ({
      name: String(r.income_range ?? "—").replace(/_/g, " "),
      count: parseInt(r.count as string),
    }));
    const famData = famInc.map((r, i) => ({
      name: String(r.income_range ?? "—").replace(/_/g, " "),
      count: parseInt(r.count as string),
    }));

    const genderIncomeData = selfInc.map((r) => {
      const range = r.income_range as string;
      return {
        name: range.replace(/_/g, " "),
        Male:   parseInt(byGender.find((bg) => bg.gender === "male" && bg.income_range === range)?.count as string ?? "0"),
        Female: parseInt(byGender.find((bg) => bg.gender === "female" && bg.income_range === range)?.count as string ?? "0"),
      };
    });

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Individual (Self) Income Distribution"
            onExport={() => onGoToCustomReport(["economic"], "income")}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={selfData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Members" radius={[6,6,0,0]}>
                  {selfData.map((_, i) => <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Family Income Distribution"
            onExport={() => onGoToCustomReport(["economic"], "income")}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={famData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="count" name="Families" radius={[6,6,0,0]}>
                  {famData.map((_, i) => <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {genderIncomeData.length > 0 && (
          <div className="mt-5">
            <ChartCard title="Individual Income by Gender (Male vs Female)"
              onExport={() => onGoToCustomReport(["economic"], "income")}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={genderIncomeData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Male"   fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="Female" fill="#ec4899" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </>
    );
  };

  // 7. Economic
  const renderEconomic = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const assets = d.assets ?? {};
    const invst  = d.investments ?? {};
    const prof: Row[] = d.profession_breakdown ?? [];

    const assetData = [
      { name: "Own House",     value: parseInt(assets.own_house ?? "0"),         fill: "#f97316" },
      { name: "Agri Land",     value: parseInt(assets.agricultural_land ?? "0"), fill: "#10b981" },
      { name: "2-Wheeler",     value: parseInt(assets.two_wheeler ?? "0"),       fill: "#2563eb" },
      { name: "4-Wheeler",     value: parseInt(assets.four_wheeler ?? "0"),      fill: "#7c3aed" },
      { name: "Rented House",  value: parseInt(assets.rented_house ?? "0"),      fill: "#d97706" },
    ];

    const investData = [
      { name: "Fixed Deposits",  value: parseInt(invst.fixed_deposits   ?? "0"), fill: "#10b981" },
      { name: "Mutual Funds",    value: parseInt(invst.mutual_funds_sip ?? "0"), fill: "#2563eb" },
      { name: "Shares/Demat",   value: parseInt(invst.shares_demat     ?? "0"), fill: "#7c3aed" },
      { name: "Other Inv.",      value: parseInt(invst.other_investments ?? "0"), fill: "#d97706" },
    ];

    const total = parseInt(assets.total ?? "0") || 1;
    const assetPctData = assetData.map((a) => ({
      ...a,
      pct: Math.round((a.value / total) * 100),
    }));

    return (
      <>
        {/* Asset ring cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          {assetPctData.map((asset) => (
            <div
              key={asset.name}
              onClick={() => onGoToCustomReport(["economic"], "economic")}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-orange-300 transition-all cursor-pointer"
            >
              <p className="text-xs text-slate-500 font-medium mb-3">{asset.name}</p>
              <div className="relative w-16 h-16 mx-auto">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={asset.fill} strokeWidth="3.5"
                    strokeDasharray={`${asset.pct} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-black text-slate-900">{asset.pct}%</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-2">{asset.value.toLocaleString()}</p>
              <p className="text-xs text-slate-400">of {total.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Asset Ownership"
            onExport={() => onGoToCustomReport(["economic"], "economic")}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assetData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                  {assetData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment Ownership"
            onExport={() => onGoToCustomReport(["economic"], "economic")}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={investData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                  {investData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </>
    );
  };

  // 8. Insurance
  const renderInsurance = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const s   = d.insurance_summary    ?? {};
    const bg: Row[] = d.insurance_by_gender ?? [];
    const total = parseInt(s.total_records ?? "0") || 1;
    const pct = (n: string | number) => Math.round((parseInt(String(n ?? "0")) / total) * 100);

    const insData = [
      { name: "Health",       value: parseInt(s.has_health       ?? "0"), fill: "#10b981" },
      { name: "Life",         value: parseInt(s.has_life         ?? "0"), fill: "#2563eb" },
      { name: "Term",         value: parseInt(s.has_term         ?? "0"), fill: "#7c3aed" },
      { name: "Konkani Card", value: parseInt(s.has_konkani_card ?? "0"), fill: "#d97706" },
      { name: "No Insurance", value: parseInt(s.no_insurance     ?? "0"), fill: "#ef4444" },
    ];

    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {insData.map((ins) => (
            <div key={ins.name} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">{ins.name}</p>
              <p className="text-3xl font-black" style={{ color: ins.fill }}>{ins.value.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{pct(ins.value)}% of records</p>
            </div>
          ))}
        </div>

        <ChartCard title="Insurance Coverage Overview"
          onExport={() => onGoToCustomReport(["insurance"], "insurance")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={insData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="value" name="Members" radius={[6,6,0,0]}>
                {insData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {bg.length > 0 && (
          <div className="mt-5">
            <SubTitle>Insurance by Gender</SubTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
              {["male", "female"].map((g) => {
                const row = bg.find((r) => r.gender === g);
                if (!row) return null;
                const gData = [
                  { name: "Health", value: parseInt(row.has_health as string ?? "0"), fill: "#10b981" },
                  { name: "Life",   value: parseInt(row.has_life   as string ?? "0"), fill: "#2563eb" },
                  { name: "Term",   value: parseInt(row.has_term   as string ?? "0"), fill: "#7c3aed" },
                ];
                return (
                  <ChartCard key={g} title={g === "male" ? "♂ Male" : "♀ Female"}>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<BarTip />} />
                        <Bar dataKey="value" name="Members" radius={[4,4,0,0]}>
                          {gData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  // 9. Documents
  const renderDocuments = () => {
    if (isLoading) return <LoadBlock />;
    if (!d) return <EmptyBlock />;

    const s   = d.document_summary    ?? {};
    const bg: Row[] = d.documents_by_gender ?? [];
    const total = parseInt(s.total_records ?? "0") || 1;
    const pct = (n: string | number) => Math.round((parseInt(String(n ?? "0")) / total) * 100);

    const docData = [
      { name: "Aadhaar",    value: parseInt(s.has_aadhaar  ?? "0"), fill: "#10b981" },
      { name: "PAN Card",   value: parseInt(s.has_pan      ?? "0"), fill: "#2563eb" },
      { name: "Voter ID",   value: parseInt(s.has_voter_id ?? "0"), fill: "#7c3aed" },
      { name: "Land Docs",  value: parseInt(s.has_land_doc ?? "0"), fill: "#d97706" },
      { name: "Driver's Lic",value: parseInt(s.has_dl      ?? "0"), fill: "#f97316" },
    ];

    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {docData.map((doc) => (
            <div
              key={doc.name}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-orange-300 transition-all"
              onClick={() => onGoToCustomReport(["documents"], "documents")}
            >
              <p className="text-xs text-slate-500 font-medium mb-2">{doc.name}</p>
              <p className="text-3xl font-black text-slate-900">{pct(doc.value)}%</p>
              <p className="text-xs text-slate-400 mb-1">verified</p>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-emerald-600 font-medium">✓ {doc.value}</span>
                <span className="text-slate-400">{total - doc.value} no</span>
              </div>
            </div>
          ))}
        </div>

        <ChartCard title="Documentation Coverage"
          onExport={() => onGoToCustomReport(["documents"], "documents")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={docData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<BarTip />} />
              <Bar dataKey="value" name="Members" radius={[6,6,0,0]}>
                {docData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {bg.length > 0 && (
          <div className="mt-5">
            <SubTitle>Documents by Gender</SubTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
              {["male", "female"].map((g) => {
                const row = bg.find((r) => r.gender === g);
                if (!row) return null;
                const gData = [
                  { name: "Aadhaar",  value: parseInt(row.has_aadhaar  as string ?? "0"), fill: "#10b981" },
                  { name: "PAN",      value: parseInt(row.has_pan      as string ?? "0"), fill: "#2563eb" },
                  { name: "Voter ID", value: parseInt(row.has_voter_id as string ?? "0"), fill: "#7c3aed" },
                ];
                return (
                  <ChartCard key={g} title={g === "male" ? "♂ Male" : "♀ Female"}>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={gData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<BarTip />} />
                        <Bar dataKey="value" name="Count" radius={[4,4,0,0]}>
                          {gData.map((dd, i) => <Cell key={i} fill={dd.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  const RENDERERS: Record<SectionId, () => React.ReactNode> = {
    "gender-status": renderGenderStatus,
    population:      renderPopulation,
    age:             renderAge,
    education:       renderEducation,
    geo:             renderGeo,
    income:          renderIncome,
    economic:        renderEconomic,
    insurance:       renderInsurance,
    documents:       renderDocuments,
  };

  const nav = NAV.find((n) => n.id === activeSection)!;

  return (
    <div className="flex gap-0 min-h-[600px]">
      {/* ── Left Nav ── */}
      <aside className="w-52 shrink-0 bg-white border border-slate-200 rounded-l-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advanced Analytics</p>
        </div>
        {NAV.map((n) => {
          const active = activeSection === n.id;
          return (
            <div
              key={n.id}
              onClick={() => { setActiveSection(n.id); loadSection(n.id); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-all border-l-2 ${
                active
                  ? "bg-orange-50 text-orange-600 font-bold border-orange-500"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
              }`}
            >
              <n.icon className="w-4 h-4 shrink-0" />
              <span className="text-xs">{n.label}</span>
              {loading[n.id] && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </div>
          );
        })}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 bg-white border border-l-0 border-slate-200 rounded-r-2xl p-6 overflow-auto">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-slate-50">
            <nav.icon className="w-5 h-5" style={{ color: ACCENT[activeSection] }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{nav.label}</h2>
            <p className="text-xs text-slate-500">Based on approved profiles</p>
          </div>
          {EXPORT_CATEGORY[activeSection] && (
            <button
              onClick={() =>
                onGoToCustomReport(
                  [EXPORT_CATEGORY[activeSection] ?? "personal"],
                  EXPORT_CATEGORY[activeSection]
                )
              }
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-all text-xs font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Section
            </button>
          )}
        </div>

        {/* Tip */}
        <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 mb-6">
          <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs text-slate-600">
            Analytics based on approved registered profiles.{" "}
            <span className="text-orange-600 font-medium">Click Export to open in Custom Report for filtered downloads.</span>
          </p>
        </div>

        {/* Section Content */}
        {RENDERERS[activeSection]?.()}
      </div>
    </div>
  );
}
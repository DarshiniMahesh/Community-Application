// Community-Application\sangha\src\app\sangha\reports\AdvancedDashboard.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, AlertCircle, Sparkles, FileSpreadsheet,
  Filter, BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AdvancedReport } from "./page";

// ─── Gender Color Constants ────────────────────────────────────────────────────
export const GENDER_COLORS = {
  male:   "#0ea5e9",
  female: "#ec4899",
  other:  "#94a3b8",
};

const RELIGIOUS_COLORS = ["#a855f7", "#c084fc", "#d8b4fe", "#7c3aed", "#6d28d9", "#581c87", "#e879f9", "#f0abfc"];
const GEO_BAR_COLORS   = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0891b2", "#06b6d4", "#22d3ee"];

// ─── Degree display order ─────────────────────────────────────────────────────
const DEGREE_ORDER = [
  'High School',
  'Pre-University',
  'Diploma & Associate Degree',
  "Undergraduate / Bachelor's",
  "Postgraduate / Master's",
  'Doctorate',
  'Specialised Professional Degree',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className ?? ""}`} />;
}

function LoadingState() {
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
    </div>
  );
};

function SectionHeader({ icon: Icon, title, subtitle, color, id }: {
  icon: any; title: string; subtitle: string; color: string; id: string;
}) {
  return (
    <div id={id} className="flex items-center gap-3 mb-5 scroll-mt-6">
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

function ChartCard({
  title, subtitle, children, className = "", onExport,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  className?: string; onExport?: () => void;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-0.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            title="Open in Custom Report"
            className="ml-3 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200
              hover:border-emerald-400 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700
              transition-all text-xs font-medium"
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

// ─── Reusable Gender Stacked Bar (horizontal) ─────────────────────────────────
function GenderStackedBar({
  data, height = 220,
}: {
  data: { label: string; male: number; female: number; other?: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20, right: 5, top: 5, bottom: 5 }} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<BarTooltipContent />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GENDER_COLORS.male}   stackId="g" radius={[4, 4, 0, 0]} />
        <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} stackId="g" />
        {data.some(d => (d.other ?? 0) > 0) && (
          <Bar dataKey="other" name="Other" fill={GENDER_COLORS.other} stackId="g" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Reusable Gender Stacked Bar (vertical — long labels) ────────────────────
function GenderStackedBarVertical({
  data, height = 260,
}: {
  data: { label: string; male: number; female: number; other?: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={185} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarTooltipContent />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GENDER_COLORS.male}   stackId="g" />
        <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} stackId="g" radius={[0, 4, 4, 0]} />
        {data.some(d => (d.other ?? 0) > 0) && (
          <Bar dataKey="other" name="Other" fill={GENDER_COLORS.other} stackId="g" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface Props {
  data: AdvancedReport | null;
  loading: boolean;
  initialSection?: string;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  onSectionRendered?: () => void;
}

export default function AdvancedDashboard({
  data, loading, initialSection, onGoToCustomReport, onSectionRendered,
}: Props) {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [filterOpen, setFilterOpen]         = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSection && data) {
      const el = document.getElementById(`adv-${initialSection}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          onSectionRendered?.();
        }, 200);
      }
    }
  }, [initialSection, data]); // eslint-disable-line

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredGeo = useMemo(() => {
    if (!data?.geographic) return [];
    const sorted = [...data.geographic].sort((a, b) => b.count - a.count);
    if (selectedCities.length === 0) return sorted.slice(0, 8);
    return sorted.filter(g => selectedCities.includes(g.city));
  }, [data, selectedCities]);

  if (loading) return <LoadingState />;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="text-sm">Advanced analytics unavailable. Check API connection.</p>
      </div>
    );
  }

  const { demographics: dem, education: edu, economic: eco } = data;
  const total = data.totalApproved;

  // ── Gender pie ─────────────────────────────────────────
  const genderTotal = dem.gender.male + dem.gender.female + dem.gender.other;
  const genderData  = [
    { name: "Male",   value: dem.gender.male,   color: GENDER_COLORS.male   },
    { name: "Female", value: dem.gender.female, color: GENDER_COLORS.female },
    { name: "Other",  value: dem.gender.other,  color: GENDER_COLORS.other  },
  ].filter(x => x.value > 0);

  // ── Family type ────────────────────────────────────────
  const ftTotal = (dem.familyType.nuclear + dem.familyType.joint) || 1;
  const ftData  = [
    { name: "Nuclear", value: dem.familyType.nuclear, color: "#10b981" },
    { name: "Joint",   value: dem.familyType.joint,   color: "#8b5cf6" },
  ].filter(x => x.value > 0);

  // ── Age × Gender ──────────────────────────────────────
  const ageGenderData = (dem.ageGroupsGender || []).map((a: any) => ({
    label:  a.label,
    male:   a.male   || 0,
    female: a.female || 0,
    other:  a.other  || 0,
  }));
  const ageBarData = ageGenderData.length > 0 ? ageGenderData
    : dem.ageGroups.map((a: any) => ({ label: a.label, male: a.count, female: 0, other: 0 }));

  // ── Marital × Gender ───────────────────────────────────
  const maritalGenderData = (dem.maritalStatusGender || []).map((m: any) => ({
    label:  m.label,
    male:   m.male   || 0,
    female: m.female || 0,
    other:  m.other  || 0,
  }));
  const maritalFallback = dem.maritalStatus.map((m: any) => ({
    label: m.label, male: m.count, female: 0, other: 0,
  }));
  const maritalBarData = maritalGenderData.length > 0 ? maritalGenderData : maritalFallback;

  // ── Education degrees — already normalized & ordered from backend ──
  const degreesBarData = (edu.degreesGender || []).map((d: any) => ({
    label:  d.label,
    male:   d.male   || 0,
    female: d.female || 0,
    other:  d.other  || 0,
  }));

  // ── Profession × Gender ────────────────────────────────
  const professionGenderData = (edu.professionsGender || []).map((p: any) => ({
    label:  p.label,
    male:   p.male   || 0,
    female: p.female || 0,
    other:  p.other  || 0,
  }));
  const professionFallback = (edu.professions || []).map((p: any) => ({
    label: p.label, male: p.count, female: 0, other: 0,
  }));
  const professionBarData = professionGenderData.length > 0 ? professionGenderData : professionFallback;

  // ── Studying & Working ─────────────────────────────────
  const studyingBarData = [
    {
      label: "Studying — Yes",
      male:   edu.studying.maleYes   || 0,
      female: edu.studying.femaleYes || 0,
      other:  edu.studying.otherYes  || 0,
    },
    {
      label: "Studying — No",
      male:   edu.studying.maleNo   || 0,
      female: edu.studying.femaleNo || 0,
      other:  edu.studying.otherNo  || 0,
    },
  ];
  const workingBarData = [
    {
      label: "Working — Yes",
      male:   edu.working.maleYes   || 0,
      female: edu.working.femaleYes || 0,
      other:  edu.working.otherYes  || 0,
    },
    {
      label: "Working — No",
      male:   edu.working.maleNo   || 0,
      female: edu.working.femaleNo || 0,
      other:  edu.working.otherNo  || 0,
    },
  ];

  // ── Assets ─────────────────────────────────────────────
  const assetBarData = eco.assets.map(a => ({
    name: a.label,
    "Owned %": a.total > 0 ? Math.round((a.owned / a.total) * 100) : 0,
  }));
  const assetsGenderData = (eco.assetsGender || []).map((a: any) => ({
    label: a.label, male: a.male || 0, female: a.female || 0, other: a.other || 0,
  }));

  // ── Employment × Gender ────────────────────────────────
  const employmentGenderData = (eco.employmentGender || []).map((e: any) => ({
    label: e.label, male: e.male || 0, female: e.female || 0, other: e.other || 0,
  }));
  const employmentFallback = (eco.employment || []).map((e: any) => ({
    label: e.label, male: e.count, female: 0, other: 0,
  }));
  const employmentBarData = employmentGenderData.length > 0 ? employmentGenderData : employmentFallback;

  // ── Geographic ─────────────────────────────────────────
  const geoGenderData = (data.geographicGender || [])
    .filter((g: any) => selectedCities.length === 0 ? true : selectedCities.includes(g.city))
    .sort((a: any, b: any) => (b.male + b.female) - (a.male + a.female))
    .slice(0, selectedCities.length > 0 ? undefined : 8)
    .map((g: any) => ({ label: g.city, male: g.male || 0, female: g.female || 0, other: g.other || 0 }));

  // ── Documents ──────────────────────────────────────────
  const docCompare = data.documents.map(d => ({
    name: d.label, Yes: d.yes, No: d.no, Unknown: d.unknown,
  }));

  // ── Religious ──────────────────────────────────────────
  const religious   = data.religious || {};
  const gotraData   = (religious.gotras      || []).slice(0, 10);
  const kuldevData  = (religious.kuladevatas || []).slice(0, 10);
  const surnameData = (religious.surnames    || []).slice(0, 10);
  const pravaraData = (religious.pravaras    || []).slice(0, 10);

  return (
    <div className="space-y-10">

      {/* Tip Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3">
        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
        <p className="text-sm text-slate-600">
          Real-time analytics from approved registered profiles.
          <span className="text-sky-700 font-medium ml-1">
            Click Export to open in Custom Report for filtered downloads.
          </span>
        </p>
      </div>

      {/* ══ 1. DEMOGRAPHICS ══════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-demographics" icon={Users}
          title="Population & Demographics"
          subtitle="Community composition, gender, age, family type"
          color="#0ea5e9" />

        {/* Population Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-5">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-2">Total Population</p>
          <p className="text-5xl font-black">{(data.totalPopulation || 0).toLocaleString()}</p>
          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-xl font-bold">{total.toLocaleString()}</p>
              <p className="text-sky-200 text-xs">Families</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xl font-bold">
                {Math.max(0, (data.totalPopulation || 0) - total).toLocaleString()}
              </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Gender Pie */}
          <ChartCard
            title="Gender Distribution"
            subtitle="Male (blue) · Female (pink) · Other (grey)"
            onExport={() => onGoToCustomReport(["personal-details"], "gender")}
          >
            {genderData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No gender data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                      paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#ffffff">
                      {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={
                      <PieTooltipContent total={genderTotal} active={undefined} payload={undefined} />
                    } />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-2 mt-1">
                  {genderData.map(d => (
                    <div key={d.name} className="flex-1 rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">{d.name}</p>
                      <p className="text-lg font-black" style={{ color: d.color }}>{d.value.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">
                        {genderTotal > 0 ? Math.round(d.value / genderTotal * 100) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          {/* Family Type */}
          <ChartCard
            title="Family Type"
            subtitle="Nuclear vs Joint families"
            onExport={() => onGoToCustomReport(["family-information"], "family_type")}
          >
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={ftData} cx="50%" cy="50%" innerRadius={35} outerRadius={48}
                  paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#ffffff">
                  {ftData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={
                  <PieTooltipContent total={ftTotal} active={undefined} payload={undefined} />
                } />
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
        </div>

        {/* Age Groups */}
        <ChartCard
          title="Age Group Distribution"
          subtitle="Male (blue) · Female (pink) — across all registered members"
          onExport={() => onGoToCustomReport(["personal-details"], "age_group")}
        >
          <GenderStackedBar data={ageBarData} height={200} />
        </ChartCard>

        {/* Marital Status */}
        {maritalBarData.length > 0 && (
          <ChartCard
            title="Marital Status"
            subtitle="Male (blue) · Female (pink) — registered heads breakdown"
            className="mt-5"
            onExport={() => onGoToCustomReport(["personal-details"], "marital")}
          >
            <GenderStackedBar data={maritalBarData} height={160} />
          </ChartCard>
        )}
      </section>

      {/* ══ 2. EDUCATION & OCCUPATION ════════════════════════ */}
      <section>
        <SectionHeader id="adv-education" icon={GraduationCap}
          title="Education & Occupation"
          subtitle="Degrees, professions, study/work status"
          color="#8b5cf6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Education degrees — standard categories */}
          <ChartCard
            title="Highest Degree Level"
            subtitle="Male (blue) · Female (pink) — educational attainment"
            onExport={() => onGoToCustomReport(["education-profession"], "education")}
          >
            {degreesBarData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No education data</div>
            ) : (
              <GenderStackedBarVertical
                data={degreesBarData}
                height={Math.max(260, degreesBarData.length * 36)}
              />
            )}
          </ChartCard>

          {/* Profession breakdown */}
          <ChartCard
            title="Profession Breakdown"
            subtitle="Male (blue) · Female (pink) — employment type"
            onExport={() => onGoToCustomReport(["education-profession"], "occupation")}
          >
            <GenderStackedBarVertical
              data={professionBarData}
              height={Math.max(220, professionBarData.length * 32)}
            />
          </ChartCard>
        </div>

        {/* Studying & Working */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <ChartCard
            title="Currently Studying"
            subtitle="Male (blue) · Female (pink)"
            onExport={() => onGoToCustomReport(["education-profession"], "education")}
          >
            <GenderStackedBar data={studyingBarData} height={150} />
          </ChartCard>
          <ChartCard
            title="Currently Working"
            subtitle="Male (blue) · Female (pink)"
            onExport={() => onGoToCustomReport(["education-profession"], "occupation")}
          >
            <GenderStackedBar data={workingBarData} height={150} />
          </ChartCard>
        </div>
      </section>

      {/* ══ 3. GEOGRAPHIC ════════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-geographic" icon={MapPin}
          title="Geographic Distribution"
          subtitle="Cities, pincodes, districts — where families are located"
          color="#14b8a6" />

        {/* City Filter */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(p => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white
                hover:border-teal-400 hover:bg-teal-50 text-slate-600 text-sm font-medium transition-all shadow-sm"
            >
              <Filter className="w-4 h-4" />
              Filter Cities
              {selectedCities.length > 0 && (
                <span className="bg-teal-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                  {selectedCities.length}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 max-h-72 overflow-y-auto p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Select Cities
                </p>
                {data.geographic.map(g => (
                  <label key={g.city}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                    <input type="checkbox"
                      checked={selectedCities.includes(g.city)}
                      onChange={() => setSelectedCities(prev =>
                        prev.includes(g.city)
                          ? prev.filter(c => c !== g.city)
                          : [...prev, g.city]
                      )}
                      className="accent-teal-500 rounded"
                    />
                    <span className="flex-1 truncate capitalize">{g.city}</span>
                    <span className="text-xs text-slate-400 shrink-0 bg-slate-100 rounded-full px-2 py-0.5">
                      {g.count}
                    </span>
                  </label>
                ))}
                {selectedCities.length > 0 && (
                  <button
                    onClick={() => setSelectedCities([])}
                    className="mt-2 w-full text-xs text-rose-500 hover:text-rose-700 font-medium py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedCities.map(city => (
            <span key={city}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
              <span className="capitalize">{city}</span>
              <button onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}>×</button>
            </span>
          ))}
        </div>

        <ChartCard
          title={selectedCities.length === 0
            ? "Top Cities by Family Count"
            : `${selectedCities.length} Cities Selected`}
          subtitle="Male (blue) · Female (pink) — geographic spread of registered families"
          onExport={() => onGoToCustomReport(["location-information"], "city")}
        >
          {geoGenderData.length > 0 ? (
            <GenderStackedBar data={geoGenderData} height={260} />
          ) : filteredGeo.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No data for selected cities
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={filteredGeo} margin={{ top: 20, right: 24, left: -16, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="city" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + "…" : v} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<BarTooltipContent />} cursor={{ fill: "#f0fdfa" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72} name="Families">
                  {filteredGeo.map((_e, idx) => (
                    <Cell key={idx} fill={GEO_BAR_COLORS[idx % GEO_BAR_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: "#0d9488" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ══ 4. ECONOMIC ══════════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-economic" icon={Wallet}
          title="Family Annual Income"
          subtitle="Household income distribution"
          color="#f59e0b" />

        {eco.incomeSlabs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No income data available.
          </div>
        ) : (
          <ChartCard
            title="Family Income Distribution"
            subtitle="Annual household income brackets"
            onExport={() => onGoToCustomReport(["economic-details"], "income")}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eco.incomeSlabs} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" name="Families" radius={[6, 6, 0, 0]}>
                  {eco.incomeSlabs.map((_, i) => (
                    <Cell key={i} fill={`hsl(${42 + i * 5}, 90%, ${55 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ══ 5. ASSETS ════════════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-assets" icon={Home}
          title="Assets & Ownership"
          subtitle="Own Land, House, Vehicles, Renting"
          color="#f97316" />

        {/* Asset circle cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {eco.assets.map(asset => {
            const pct = asset.total > 0 ? Math.round((asset.owned / asset.total) * 100) : 0;
            return (
              <div key={asset.label}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-orange-300 transition-all cursor-pointer"
                onClick={() => onGoToCustomReport(["economic-details"], "asset")}
              >
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
              </div>
            );
          })}
        </div>

        {/* Asset ownership × gender */}
        <ChartCard
          title="Asset Ownership by Gender"
          subtitle="Male (blue) · Female (pink) — ownership across asset types"
          className="mt-5"
          onExport={() => onGoToCustomReport(["economic-details"], "asset")}
        >
          {assetsGenderData.length > 0 ? (
            <GenderStackedBar data={assetsGenderData} height={200} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assetBarData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="Owned %" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Employment sector */}
        {employmentBarData.length > 0 && (
          <ChartCard
            title="Employment Sector Breakdown"
            subtitle="Male (blue) · Female (pink) — Govt, Private, Self-Employed, Entrepreneurs"
            className="mt-5"
            onExport={() => onGoToCustomReport(["education-profession"], "occupation")}
          >
            <GenderStackedBar data={employmentBarData} height={200} />
          </ChartCard>
        )}
      </section>

      {/* ══ 6. INSURANCE ═════════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-insurance" icon={Shield}
          title="Insurance Coverage"
          subtitle="Term, Life, Health, Konkani Card"
          color="#14b8a6" />

        {data.insurance.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.insurance.map(ins => {
              const total = (ins.yes || 0) + (ins.no || 0) + (ins.unknown || 0);
              const yesPct = total > 0 ? Math.round((ins.yes || 0) / total * 100) : 0;
              const noPct  = total > 0 ? Math.round((ins.no  || 0) / total * 100) : 0;

              // Pie: yes=green, no=red, unknown=grey
              const pieData = [
                { name: "Yes",     value: ins.yes     || 0, color: "#10b981" },
                { name: "No",      value: ins.no      || 0, color: "#ef4444" },
                { name: "Unknown", value: ins.unknown || 0, color: "#cbd5e1" },
              ].filter(d => d.value > 0);

              return (
                <ChartCard key={ins.label} title={`${ins.label} Insurance`}
                  onExport={() => onGoToCustomReport(["family-information"], "insurance")}
                >
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie
                        data={pieData.length > 0 ? pieData : [{ name: "No Data", value: 1, color: "#f1f5f9" }]}
                        cx="50%" cy="50%" innerRadius={30} outerRadius={46}
                        paddingAngle={pieData.length > 1 ? 3 : 0}
                        dataKey="value" strokeWidth={2} stroke="#ffffff"
                      >
                        {(pieData.length > 0 ? pieData : [{ color: "#f1f5f9" }]).map((d: any, i: number) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip content={
                        <PieTooltipContent total={total} active={undefined} payload={undefined} />
                      } />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Yes / No / Unknown count rows */}
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-slate-600 font-medium">Yes</span>
                      </span>
                      <span className="font-bold text-emerald-600">{(ins.yes || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        <span className="text-slate-600 font-medium">No</span>
                      </span>
                      <span className="font-bold text-red-500">{(ins.no || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                        <span className="text-slate-600 font-medium">Unknown</span>
                      </span>
                      <span className="font-bold text-slate-400">{(ins.unknown || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-center text-xl font-black text-slate-900 mt-2">{yesPct}%</p>
                  <p className="text-center text-xs text-slate-400">have coverage</p>
                </ChartCard>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No insurance data available.
          </div>
        )}
      </section>

      {/* ══ 7. DOCUMENTS ═════════════════════════════════════ */}
      <section>
        <SectionHeader id="adv-documents" icon={FileText}
          title="Documentation Status"
          subtitle="Aadhaar, PAN, Voter ID, Land Records, DL"
          color="#f43f5e" />

        {data.documents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {data.documents.map(doc => {
                const t   = (doc.yes + doc.no + doc.unknown) || 1;
                const pct = Math.round(doc.yes / t * 100);
                return (
                  <div key={doc.label}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-rose-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500 font-medium flex-1 text-center">{doc.label}</p>
                      <button
                        title={`Export ${doc.label} verified members`}
                        onClick={() => onGoToCustomReport(["personal-details"], "document")}
                        className="shrink-0 p-1 rounded-lg border border-slate-100 text-slate-300 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{pct}%</p>
                    <p className="text-xs text-slate-400 mb-3">verified</p>
                    <div className="space-y-1">
                      {[
                        { label: "Yes", val: doc.yes,     color: "#22c55e" },
                        { label: "No",  val: doc.no,      color: "#ef4444" },
                        { label: "?",   val: doc.unknown, color: "#94a3b8" },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-xs" style={{ color: row.color }}>{row.label}</span>
                          <span className="text-xs font-bold" style={{ color: row.color }}>{row.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <ChartCard
              title="Document Verification Comparison"
              subtitle="Yes / No / Unknown across all documents"
              className="mt-5"
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={docCompare} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltipContent />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  <Bar dataKey="Yes"     fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="No"      fill="#ef4444"                       stackId="a" />
                  <Bar dataKey="Unknown" fill="#cbd5e1" radius={[0, 0, 4, 4]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No document data available.
          </div>
        )}
      </section>

      {/* ══ 8. RELIGIOUS DETAILS ═════════════════════════════ */}
      <section>
        <SectionHeader id="adv-religious" icon={BookOpen}
          title="Religious Details"
          subtitle="Gotra, Kuladevata, Surnames, Pravara, Upanama, Ancestral Details"
          color="#a855f7" />

        {!gotraData.length && !kuldevData.length && !surnameData.length ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No religious data available.
          </div>
        ) : (
          <>
            {religious.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  { label: "Unique Gotras",          value: religious.summary.uniqueGotras       || 0, color: "#a855f7" },
                  { label: "Unique Kuladevatas",     value: religious.summary.uniqueKuladevatas  || 0, color: "#7c3aed" },
                  { label: "Ancestral Challenges",   value: religious.summary.ancestralChallenges || 0, color: "#f43f5e" },
                  { label: "Unique Surnames in Use", value: religious.summary.uniqueSurnames      || 0, color: "#0ea5e9" },
                ].map(s => (
                  <div key={s.label}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
                    <p className="text-3xl font-black" style={{ color: s.color }}>
                      {s.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {gotraData.length > 0 && (
                <ChartCard title="Top Gotras" subtitle="Most common gotras in the community"
                  onExport={() => onGoToCustomReport(["religious-details"], "gotra")}
                >
                  <ResponsiveContainer width="100%" height={Math.max(220, gotraData.length * 28)}>
                    <BarChart layout="vertical" data={gotraData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarTooltipContent />} />
                      <Bar dataKey="count" name="Families" radius={[0, 6, 6, 0]}>
                        {gotraData.map((_: any, i: number) => (
                          <Cell key={i} fill={RELIGIOUS_COLORS[i % RELIGIOUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {kuldevData.length > 0 && (
                <ChartCard title="Kuladevata Distribution" subtitle="Family deity distribution"
                  onExport={() => onGoToCustomReport(["religious-details"], "kuladevata")}
                >
                  <ResponsiveContainer width="100%" height={Math.max(220, kuldevData.length * 28)}>
                    <BarChart layout="vertical" data={kuldevData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarTooltipContent />} />
                      <Bar dataKey="count" name="Families" radius={[0, 6, 6, 0]}>
                        {kuldevData.map((_: any, i: number) => (
                          <Cell key={i} fill={RELIGIOUS_COLORS[(i + 3) % RELIGIOUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {surnameData.length > 0 && (
                <ChartCard title="Surnames in Use" subtitle="Most common surnames across the community"
                  onExport={() => onGoToCustomReport(["religious-details"], "surname")}
                >
                  <ResponsiveContainer width="100%" height={Math.max(220, surnameData.length * 28)}>
                    <BarChart layout="vertical" data={surnameData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarTooltipContent />} />
                      <Bar dataKey="count" name="Families" radius={[0, 6, 6, 0]}>
                        {surnameData.map((_: any, i: number) => (
                          <Cell key={i} fill={RELIGIOUS_COLORS[(i + 1) % RELIGIOUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {pravaraData.length > 0 && (
                <ChartCard title="Pravara Distribution" subtitle="Pravara lineages in the community"
                  onExport={() => onGoToCustomReport(["religious-details"], "pravara")}
                >
                  <ResponsiveContainer width="100%" height={Math.max(220, pravaraData.length * 28)}>
                    <BarChart layout="vertical" data={pravaraData} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarTooltipContent />} />
                      <Bar dataKey="count" name="Families" radius={[0, 6, 6, 0]}>
                        {pravaraData.map((_: any, i: number) => (
                          <Cell key={i} fill={RELIGIOUS_COLORS[(i + 5) % RELIGIOUS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {religious.ancestralStats && (
              <ChartCard
                title="Ancestral & Spiritual Details"
                subtitle="Families with ancestral challenges & known common relative names"
                className="mt-5"
                onExport={() => onGoToCustomReport(["religious-details"], "ancestral")}
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "With Ancestral Challenge",     value: religious.ancestralStats.withChallenge       || 0, color: "#f43f5e" },
                    { label: "Without Ancestral Challenge",  value: religious.ancestralStats.withoutChallenge    || 0, color: "#10b981" },
                    { label: "With Priest Info",             value: religious.ancestralStats.withPriest          || 0, color: "#a855f7" },
                    { label: "With Common Relative Names",   value: religious.ancestralStats.withCommonRelatives || 0, color: "#0ea5e9" },
                    { label: "With Upanama",                 value: religious.ancestralStats.withUpanama         || 0, color: "#f59e0b" },
                    { label: "With Demi Gods",               value: religious.ancestralStats.withDemiGods        || 0, color: "#6366f1" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
                      <p className="text-2xl font-black" style={{ color: s.color }}>
                        {s.value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </>
        )}
      </section>
    </div>
  );
}
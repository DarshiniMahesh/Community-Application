// Community-Application\sangha\src\app\sangha\reports\AdvancedDashboard.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, AlertCircle, Sparkles, FileSpreadsheet,
  Filter, BookOpen, CheckCircle, ChevronRight,
} from "lucide-react";
import { AdvancedReport } from "./page";
import type { DateRange } from "./DateRangePicker";

// ─── Gender Color Constants ────────────────────────────────────────────────────
export const GENDER_COLORS = {
  male:   "#0ea5e9",
  female: "#ec4899",
  other:  "#94a3b8",
};

const RELIGIOUS_COLORS = ["#a855f7", "#c084fc", "#d8b4fe", "#7c3aed", "#6d28d9", "#581c87", "#e879f9", "#f0abfc"];
const DEMI_GOD_COLORS  = ["#f59e0b", "#fbbf24", "#fcd34d", "#f97316", "#fb923c", "#fdba74", "#d97706", "#b45309"];
const GEO_BAR_COLORS   = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0891b2", "#06b6d4", "#22d3ee"];

// All 7 standard degree levels — always shown in this order
const DEGREE_ORDER = [
  'High School',
  'Pre-University',
  'Diploma & Associate Degree',
  "Undergraduate / Bachelor's",
  "Postgraduate / Master's",
  'Doctorate',
  'Specialised Professional Degree',
];

const INS_COVERAGE_COLORS = {
  yes:     "#10b981",
  no:      "#ef4444",
  unknown: "#cbd5e1",
};

// ─── Sidebar nav sections ─────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "adv-status",      label: "Status Overview",         icon: CheckCircle,   color: "#6366f1" },
  { id: "adv-demographics",label: "Demographics",            icon: Users,         color: "#0ea5e9" },
  { id: "adv-education",   label: "Education & Occupation",  icon: GraduationCap, color: "#8b5cf6" },
  { id: "adv-geographic",  label: "Geographic",              icon: MapPin,        color: "#14b8a6" },
  { id: "adv-economic",    label: "Income",                  icon: Wallet,        color: "#f59e0b" },
  { id: "adv-assets",      label: "Assets & Ownership",      icon: Home,          color: "#f97316" },
  { id: "adv-insurance",   label: "Insurance",               icon: Shield,        color: "#14b8a6" },
  { id: "adv-documents",   label: "Documentation",           icon: FileText,      color: "#f43f5e" },
  { id: "adv-religious",   label: "Religious Details",       icon: BookOpen,      color: "#a855f7" },
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
  const hasOther = data.some(d => (d.other ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20, right: 5, top: 5, bottom: 5 }} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<BarTooltipContent />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GENDER_COLORS.male}   stackId="g" radius={[0, 0, 4, 4]} />
        <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} stackId="g" radius={hasOther ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
        {hasOther && (
          <Bar dataKey="other" name="Other" fill={GENDER_COLORS.other} stackId="g" radius={[4, 4, 0, 0]} />
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
  const hasOther = data.some(d => (d.other ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={185} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarTooltipContent />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GENDER_COLORS.male}   stackId="g" radius={[0, 0, 0, 0]} />
        <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} stackId="g" radius={hasOther ? [0, 0, 0, 0] : [0, 4, 4, 0]} />
        {hasOther && (
          <Bar dataKey="other" name="Other" fill={GENDER_COLORS.other} stackId="g" radius={[0, 4, 4, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Simple horizontal bar chart ──────────────────────────────────────────────
function SimpleBarChart({
  data, colorPalette, height = 220, valueKey = "count",
}: {
  data: { label: string; count: number }[];
  colorPalette: string[];
  height?: number;
  valueKey?: string;
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
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 30, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarTooltipContent />} />
        <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
          {data.map((_: any, i: number) => <Cell key={i} fill={colorPalette[i % colorPalette.length]} />)}
          <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Insurance Gender Coverage Card ───────────────────────────────────────────
function InsuranceGenderCard({
  ins, onExport,
}: {
  ins: {
    label: string;
    maleYes: number; femaleYes: number; otherYes: number;
    maleNo: number;  femaleNo: number;  otherNo: number;
    maleUnknown: number; femaleUnknown: number; otherUnknown: number;
    yes: number; no: number; unknown: number;
  };
  onExport?: () => void;
}) {
  const totalAll = ins.yes + ins.no + ins.unknown;
  const yesPct   = totalAll > 0 ? Math.round((ins.yes / totalAll) * 100) : 0;

  const barData = [
    { label: "Male",   yes: ins.maleYes,   no: ins.maleNo   },
    { label: "Female", yes: ins.femaleYes, no: ins.femaleNo },
    ...(ins.otherYes + ins.otherNo > 0
      ? [{ label: "Other", yes: ins.otherYes, no: ins.otherNo }]
      : []),
  ];

  const pieData = [
    { name: "Yes",     value: ins.yes,     color: INS_COVERAGE_COLORS.yes     },
    { name: "No",      value: ins.no,      color: INS_COVERAGE_COLORS.no      },
    { name: "Unknown", value: ins.unknown, color: INS_COVERAGE_COLORS.unknown },
  ].filter(d => d.value > 0);

  return (
    <ChartCard title={`${ins.label} Insurance`} subtitle="Coverage by gender" onExport={onExport}>
      <ResponsiveContainer width="100%" height={100}>
        <PieChart>
          <Pie
            data={pieData.length > 0 ? pieData : [{ name: "No Data", value: 1, color: "#f1f5f9" }]}
            cx="50%" cy="50%" innerRadius={28} outerRadius={44}
            paddingAngle={pieData.length > 1 ? 3 : 0}
            dataKey="value" strokeWidth={2} stroke="#ffffff"
          >
            {(pieData.length > 0 ? pieData : [{ color: "#f1f5f9" }]).map((d: any, i: number) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={(props) => <PieTooltipContent {...props} total={totalAll} />} />
        </PieChart>
      </ResponsiveContainer>

      <p className="text-center text-2xl font-black text-slate-900 mt-1">{yesPct}%</p>
      <p className="text-center text-xs text-slate-400 mb-3">have coverage</p>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Coverage by Gender</p>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={barData} margin={{ left: -24, right: 4, top: 4, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<BarTooltipContent />} />
            <Bar dataKey="yes" name="Yes" fill={INS_COVERAGE_COLORS.yes} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="no"  name="No"  fill={INS_COVERAGE_COLORS.no}  radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 mt-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Yes — {ins.yes.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 font-bold">{yesPct}%</span>
          </div>
          <div className="flex gap-3 text-xs text-slate-500">
            <span><span className="font-medium" style={{ color: GENDER_COLORS.male }}>M</span> {ins.maleYes.toLocaleString()}</span>
            <span><span className="font-medium" style={{ color: GENDER_COLORS.female }}>F</span> {ins.femaleYes.toLocaleString()}</span>
            {ins.otherYes > 0 && <span><span className="font-medium" style={{ color: GENDER_COLORS.other }}>O</span> {ins.otherYes.toLocaleString()}</span>}
          </div>
        </div>

        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              No — {ins.no.toLocaleString()}
            </span>
            <span className="text-xs text-red-500 font-bold">
              {totalAll > 0 ? Math.round((ins.no / totalAll) * 100) : 0}%
            </span>
          </div>
          <div className="flex gap-3 text-xs text-slate-500">
            <span><span className="font-medium" style={{ color: GENDER_COLORS.male }}>M</span> {ins.maleNo.toLocaleString()}</span>
            <span><span className="font-medium" style={{ color: GENDER_COLORS.female }}>F</span> {ins.femaleNo.toLocaleString()}</span>
            {ins.otherNo > 0 && <span><span className="font-medium" style={{ color: GENDER_COLORS.other }}>O</span> {ins.otherNo.toLocaleString()}</span>}
          </div>
        </div>

        {ins.unknown > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              <span className="text-slate-500 font-medium">Unknown</span>
            </span>
            <span className="font-bold text-slate-400">{ins.unknown.toLocaleString()}</span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

// ─── Status colors ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  approved:           "#10b981",
  rejected:           "#ef4444",
  submitted:          "#f59e0b",
  under_review:       "#f59e0b",
  changes_requested:  "#f97316",
  draft:              "#94a3b8",
};

const STATUS_LABELS: Record<string, string> = {
  approved:          "Approved",
  rejected:          "Rejected",
  submitted:         "Submitted",
  under_review:      "Under Review",
  changes_requested: "Changes Requested",
  draft:             "Draft",
};

// ─── PROPS ────────────────────────────────────────────────────────────────────
interface Props {
  data:           AdvancedReport | null;
  loading:        boolean;
  initialSection?: string;
  dateRange?:     DateRange;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  onSectionRendered?: () => void;
}

export default function AdvancedDashboard({
  data, loading, initialSection, dateRange, onGoToCustomReport, onSectionRendered,
}: Props) {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [activeNav, setActiveNav]           = useState("adv-status");
  const filterRef  = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
  }, [initialSection, data, onSectionRendered]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveNav(visible[0].target.id);
      },
      { threshold: 0.2, rootMargin: "-80px 0px -60% 0px" }
    );
    NAV_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveNav(id);
  };

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

  // ── Status ─────────────────────────────────────────────────
  const statusBreakdown: Array<{ status: string; count: number }> = data.statusBreakdown || [];
  const statusTotal = statusBreakdown.reduce((acc, s) => acc + (s.count || 0), 0);
  const statusGenderBreakdown: Array<{ status: string; male: number; female: number; other: number }> = data.statusGenderBreakdown || [];
  const statusGenderBarData = statusGenderBreakdown.map(s => ({
    label:  STATUS_LABELS[s.status] ?? s.status,
    male:   s.male   || 0,
    female: s.female || 0,
    other:  s.other  || 0,
  }));

  // ── Gender pie ─────────────────────────────────────────────
  const genderTotal = dem.gender.male + dem.gender.female + dem.gender.other;
  const genderData  = [
    { name: "Male",   value: dem.gender.male,   color: GENDER_COLORS.male   },
    { name: "Female", value: dem.gender.female, color: GENDER_COLORS.female },
    { name: "Other",  value: dem.gender.other,  color: GENDER_COLORS.other  },
  ].filter(x => x.value > 0);

  // ── Family type ────────────────────────────────────────────
  const ftTotal = (dem.familyType.nuclear + dem.familyType.joint) || 1;
  const ftData  = [
    { name: "Nuclear", value: dem.familyType.nuclear, color: "#10b981" },
    { name: "Joint",   value: dem.familyType.joint,   color: "#8b5cf6" },
  ].filter(x => x.value > 0);

  // ── Age × Gender ──────────────────────────────────────────
  const ageGenderData = (dem.ageGroupsGender || []).map((a: any) => ({
    label: a.label, male: a.male || 0, female: a.female || 0, other: a.other || 0,
  }));
  const ageBarData = ageGenderData.length > 0 ? ageGenderData
    : dem.ageGroups.map((a: any) => ({ label: a.label, male: a.count, female: 0, other: 0 }));

  // ── Marital × Gender ───────────────────────────────────────
  const maritalGenderData = (dem.maritalStatusGender || []).map((m: any) => ({
    label: m.label, male: m.male || 0, female: m.female || 0, other: m.other || 0,
  }));
  const maritalFallback = dem.maritalStatus.map((m: any) => ({
    label: m.label, male: m.count, female: 0, other: 0,
  }));
  const maritalBarData = maritalGenderData.length > 0 ? maritalGenderData : maritalFallback;

  // ── Degrees — all 7 standard levels always shown ───────────
  const rawDegreesGender = (edu.degreesGender || []).map((d: any) => ({
    label: d.label, male: d.male || 0, female: d.female || 0, other: d.other || 0,
  }));
  const degreeMapFromData = new Map(rawDegreesGender.map((d: any) => [d.label, d]));

  // Always include all 7 degrees (even those with 0 counts)
  const degreesBarData: { label: string; male: number; female: number; other?: number }[] = DEGREE_ORDER.map(label => {
    const existing = degreeMapFromData.get(label);
    return existing ?? { label, male: 0, female: 0, other: 0 };
  });

  // ── Profession × Gender ────────────────────────────────────
  const professionGenderData = (edu.professionsGender || []).map((p: any) => ({
    label: p.label, male: p.male || 0, female: p.female || 0, other: p.other || 0,
  }));
  const professionFallback = (edu.professions || []).map((p: any) => ({
    label: p.label, male: p.count, female: 0, other: 0,
  }));
  const professionBarData = professionGenderData.length > 0 ? professionGenderData : professionFallback;

  // ── Studying & Working ─────────────────────────────────────
  const studyingBarData = [
    { label: "Studying — Yes", male: edu.studying.maleYes || 0, female: edu.studying.femaleYes || 0, other: edu.studying.otherYes || 0 },
    { label: "Studying — No",  male: edu.studying.maleNo  || 0, female: edu.studying.femaleNo  || 0, other: edu.studying.otherNo  || 0 },
  ];
  const workingBarData = [
    { label: "Working — Yes", male: edu.working.maleYes || 0, female: edu.working.femaleYes || 0, other: edu.working.otherYes || 0 },
    { label: "Working — No",  male: edu.working.maleNo  || 0, female: edu.working.femaleNo  || 0, other: edu.working.otherNo  || 0 },
  ];

  // ── Assets ─────────────────────────────────────────────────
  const assetBarData = eco.assets.map(a => ({
    name: a.label,
    "Owned %": a.total > 0 ? Math.round((a.owned / a.total) * 100) : 0,
  }));
  const assetsGenderData = (eco.assetsGender || []).map((a: any) => ({
    label: a.label, male: a.male || 0, female: a.female || 0, other: a.other || 0,
  }));

  // ── Employment × Gender ────────────────────────────────────
  const employmentGenderData = (eco.employmentGender || []).map((e: any) => ({
    label: e.label, male: e.male || 0, female: e.female || 0, other: e.other || 0,
  }));
  const employmentFallback = (eco.employment || []).map((e: any) => ({
    label: e.label, male: e.count, female: 0, other: 0,
  }));
  const employmentBarData = employmentGenderData.length > 0 ? employmentGenderData : employmentFallback;

  // ── Geographic ─────────────────────────────────────────────
  const geoGenderData = (data.geographicGender || [])
    .filter((g: any) => selectedCities.length === 0 ? true : selectedCities.includes(g.city))
    .sort((a: any, b: any) => (b.male + b.female) - (a.male + a.female))
    .slice(0, selectedCities.length > 0 ? undefined : 8)
    .map((g: any) => ({ label: g.city, male: g.male || 0, female: g.female || 0, other: g.other || 0 }));

  // ── Documents ──────────────────────────────────────────────
  const docCompare = data.documents.map(d => ({
    name: d.label, Yes: d.yes, No: d.no, Unknown: d.unknown,
  }));

  // ── Religious ──────────────────────────────────────────────
  const religious      = data.religious || {};
  const gotraData      = (religious.gotras         || []).slice(0, 10);
  const kuldevData     = (religious.kuladevatas    || []).slice(0, 10);
  const surnameData    = (religious.surnames       || []).slice(0, 10);
  const pravaraData    = (religious.pravaras       || []).slice(0, 10);
  const upanamaGenData = (religious.upanamaGenerals || []).slice(0, 20);
  const upanaPropData  = (religious.upanamaPropers  || []).slice(0, 20);
  const demiGodData    = (religious.demiGods        || []).slice(0, 25);

  return (
    <div className="flex gap-0">
      {/* ── Sidebar Navigation ───────────────────────────────── */}
      <aside className="hidden xl:flex w-52 shrink-0 flex-col gap-0.5 sticky top-4 self-start pr-4 pt-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Sections</p>
        {NAV_SECTIONS.map(sec => {
          const Icon    = sec.icon;
          const isActive = activeNav === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all text-xs font-medium
                ${isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? sec.color : undefined }} />
              <span className="truncate">{sec.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-slate-400" />}
            </button>
          );
        })}
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 min-w-0 space-y-10">

        {/* Tip Banner */}
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <p className="text-sm text-slate-600">
            {dateRange?.preset === "allTime"
              ? "Showing all-time analytics from approved registered profiles."
              : dateRange
                ? `Analytics filtered by selected date range · approved profiles only.`
                : "Real-time analytics from approved registered profiles."}
            <span className="text-sky-700 font-medium ml-1">
              Click Export to open in Custom Report for filtered downloads.
            </span>
          </p>
        </div>

        {/* ══ 0. STATUS OVERVIEW ═══════════════════════════════ */}
        <section>
          <SectionHeader id="adv-status" icon={CheckCircle}
            title="Status Overview"
            subtitle="Registration status breakdown — approved, pending, rejected, changes requested"
            color="#6366f1" />

          {statusBreakdown.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {statusBreakdown.map((s) => {
                  const pct = statusTotal > 0 ? Math.round((s.count / statusTotal) * 100) : 0;
                  const color = STATUS_COLORS[s.status] ?? "#94a3b8";
                  const label = STATUS_LABELS[s.status] ?? s.status;
                  const genderDataForStatus = statusGenderBreakdown.find(sg => sg.status === s.status);
                  return (
                    <div key={s.status} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "18", color }}>{pct}%</span>
                      </div>
                      <p className="text-2xl font-black text-slate-900">{s.count.toLocaleString()}</p>
                      {genderDataForStatus && (genderDataForStatus.male > 0 || genderDataForStatus.female > 0) && (
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                          <span><span className="font-medium" style={{ color: GENDER_COLORS.male }}>M</span> {(genderDataForStatus.male || 0).toLocaleString()}</span>
                          <span><span className="font-medium" style={{ color: GENDER_COLORS.female }}>F</span> {(genderDataForStatus.female || 0).toLocaleString()}</span>
                          {(genderDataForStatus.other || 0) > 0 && <span><span className="font-medium" style={{ color: GENDER_COLORS.other }}>O</span> {genderDataForStatus.other.toLocaleString()}</span>}
                        </div>
                      )}
                      <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {statusGenderBarData.length > 0 && (
                <ChartCard title="Status by Gender" subtitle="Male (blue) · Female (pink) — registration status breakdown"
                  onExport={() => onGoToCustomReport(["personal-details"], "demographics")}>
                  <GenderStackedBar data={statusGenderBarData} height={200} />
                </ChartCard>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-semibold mb-1" style={{ color: "#10b981" }}>Approved</p>
                <p className="text-3xl font-black text-slate-900">{data.totalApproved.toLocaleString()}</p>
              </div>
            </div>
          )}
        </section>

        {/* ══ 1. DEMOGRAPHICS ══════════════════════════════════ */}
        <section>
          <SectionHeader id="adv-demographics" icon={Users}
            title="Population & Demographics"
            subtitle="Community composition, gender, age, family type"
            color="#0ea5e9" />

          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-5">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-2">Total Population</p>
            <p className="text-5xl font-black">{(data.totalPopulation || 0).toLocaleString()}</p>
            <div className="flex items-center gap-6 mt-4">
              <div><p className="text-xl font-bold">{total.toLocaleString()}</p><p className="text-sky-200 text-xs">Families</p></div>
              <div className="w-px h-8 bg-white/20" />
              <div><p className="text-xl font-bold">{Math.max(0, (data.totalPopulation || 0) - total).toLocaleString()}</p><p className="text-sky-200 text-xs">Family members</p></div>
              <div className="w-px h-8 bg-white/20" />
              <div><p className="text-xl font-bold">{total > 0 ? ((data.totalPopulation || 0) / total).toFixed(1) : "—"}</p><p className="text-sky-200 text-xs">Avg per family</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <ChartCard title="Gender Distribution" subtitle="Male (blue) · Female (pink) · Other (grey)"
              onExport={() => onGoToCustomReport(["personal-details"], "gender")}>
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
                      <Tooltip content={(props) => <PieTooltipContent {...props} total={genderTotal} />} />
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

            <ChartCard title="Family Type" subtitle="Nuclear vs Joint families"
              onExport={() => onGoToCustomReport(["family-information"], "family_type")}>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={ftData} cx="50%" cy="50%" innerRadius={35} outerRadius={48}
                    paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#ffffff">
                    {ftData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={(props) => <PieTooltipContent {...props} total={ftTotal} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2">
                {ftData.map(d => (
                  <div key={d.name} className="flex-1 rounded-xl p-3 text-center bg-slate-50">
                    <p className="text-xs font-medium" style={{ color: d.color }}>{d.name}</p>
                    <p className="text-xl font-black" style={{ color: d.color }}>{Math.round(d.value / ftTotal * 100)}%</p>
                    <p className="text-xs text-slate-500">{d.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Age Group Distribution" subtitle="Male (blue) · Female (pink) — across all registered members"
            onExport={() => onGoToCustomReport(["personal-details"], "age_group")}>
            <GenderStackedBar data={ageBarData} height={200} />
          </ChartCard>

          {maritalBarData.length > 0 && (
            <ChartCard title="Marital Status" subtitle="Male (blue) · Female (pink) — registered heads breakdown"
              className="mt-5" onExport={() => onGoToCustomReport(["personal-details"], "marital")}>
              <GenderStackedBar data={maritalBarData} height={160} />
            </ChartCard>
          )}
        </section>

        {/* ══ 2. EDUCATION & OCCUPATION ════════════════════════ */}
        <section>
          <SectionHeader id="adv-education" icon={GraduationCap}
            title="Education & Occupation"
            subtitle="All 7 degree levels, professions, study/work status"
            color="#8b5cf6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Highest Degree Level" subtitle="All 7 levels — Male (blue) · Female (pink)"
              onExport={() => onGoToCustomReport(["education-profession"], "education")}>
              {/* Always show all 7 degree levels */}
              <GenderStackedBarVertical
                data={degreesBarData}
                height={Math.max(280, DEGREE_ORDER.length * 38)}
              />
            </ChartCard>

            <ChartCard title="Profession Breakdown" subtitle="Male (blue) · Female (pink) — employment type"
              onExport={() => onGoToCustomReport(["education-profession"], "occupation")}>
              <GenderStackedBarVertical
                data={professionBarData}
                height={Math.max(220, professionBarData.length * 32)}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <ChartCard title="Currently Studying" subtitle="Male (blue) · Female (pink)"
              onExport={() => onGoToCustomReport(["education-profession"], "education")}>
              <GenderStackedBar data={studyingBarData} height={150} />
            </ChartCard>
            <ChartCard title="Currently Working" subtitle="Male (blue) · Female (pink)"
              onExport={() => onGoToCustomReport(["education-profession"], "occupation")}>
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

          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative" ref={filterRef}>
              <button onClick={() => setFilterOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 text-slate-600 text-sm font-medium transition-all shadow-sm">
                <Filter className="w-4 h-4" />
                Filter Cities
                {selectedCities.length > 0 && <span className="bg-teal-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{selectedCities.length}</span>}
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 max-h-72 overflow-y-auto p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Select Cities</p>
                  {data.geographic.map(g => (
                    <label key={g.city} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
                      <input type="checkbox" checked={selectedCities.includes(g.city)}
                        onChange={() => setSelectedCities(prev =>
                          prev.includes(g.city) ? prev.filter(c => c !== g.city) : [...prev, g.city]
                        )}
                        className="accent-teal-500 rounded" />
                      <span className="flex-1 truncate capitalize">{g.city}</span>
                      <span className="text-xs text-slate-400 shrink-0 bg-slate-100 rounded-full px-2 py-0.5">{g.count}</span>
                    </label>
                  ))}
                  {selectedCities.length > 0 && (
                    <button onClick={() => setSelectedCities([])}
                      className="mt-2 w-full text-xs text-rose-500 hover:text-rose-700 font-medium py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                      Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>
            {selectedCities.map(city => (
              <span key={city} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                <span className="capitalize">{city}</span>
                <button onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}>×</button>
              </span>
            ))}
          </div>

          <ChartCard
            title={selectedCities.length === 0 ? "Top Cities by Family Count" : `${selectedCities.length} Cities Selected`}
            subtitle="Male (blue) · Female (pink) — geographic spread of registered families"
            onExport={() => onGoToCustomReport(["location-information"], "city")}>
            {geoGenderData.length > 0 ? (
              <GenderStackedBar data={geoGenderData} height={260} />
            ) : filteredGeo.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data for selected cities</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filteredGeo} margin={{ top: 20, right: 24, left: -16, bottom: 4 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="city" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + "…" : v} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTooltipContent />} cursor={{ fill: "#f0fdfa" }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72} name="Families">
                    {filteredGeo.map((_e, idx) => <Cell key={idx} fill={GEO_BAR_COLORS[idx % GEO_BAR_COLORS.length]} />)}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0d9488" }} />
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
            <ChartCard title="Family Income Distribution" subtitle="Annual household income brackets"
              onExport={() => onGoToCustomReport(["economic-details"], "income")}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={eco.incomeSlabs} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltipContent />} />
                  <Bar dataKey="count" name="Families" radius={[6, 6, 0, 0]}>
                    {eco.incomeSlabs.map((_, i) => <Cell key={i} fill={`hsl(${42 + i * 5}, 90%, ${55 - i * 2}%)`} />)}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {eco.assets.map(asset => {
              const pct = asset.total > 0 ? Math.round((asset.owned / asset.total) * 100) : 0;
              return (
                <div key={asset.label}
                  className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:border-orange-300 transition-all cursor-pointer"
                  onClick={() => onGoToCustomReport(["economic-details"], "asset")}>
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

          <ChartCard title="Asset Ownership by Gender" subtitle="Male (blue) · Female (pink) · Other (grey)"
            className="mt-5" onExport={() => onGoToCustomReport(["economic-details"], "asset")}>
            {assetsGenderData.length > 0 ? (
              <>
                <GenderStackedBar data={assetsGenderData} height={200} />
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ownership Count by Gender</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-100">
                          <th className="pb-2 font-medium">Asset</th>
                          <th className="pb-2 font-medium text-right" style={{ color: GENDER_COLORS.male }}>Male</th>
                          <th className="pb-2 font-medium text-right" style={{ color: GENDER_COLORS.female }}>Female</th>
                          {assetsGenderData.some(a => (a.other || 0) > 0) && <th className="pb-2 font-medium text-right" style={{ color: GENDER_COLORS.other }}>Other</th>}
                          <th className="pb-2 font-medium text-right text-slate-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetsGenderData.map(a => (
                          <tr key={a.label} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-1.5 font-medium text-slate-700">{a.label}</td>
                            <td className="py-1.5 text-right font-bold" style={{ color: GENDER_COLORS.male }}>{a.male.toLocaleString()}</td>
                            <td className="py-1.5 text-right font-bold" style={{ color: GENDER_COLORS.female }}>{a.female.toLocaleString()}</td>
                            {assetsGenderData.some(x => (x.other || 0) > 0) && <td className="py-1.5 text-right font-bold" style={{ color: GENDER_COLORS.other }}>{(a.other || 0).toLocaleString()}</td>}
                            <td className="py-1.5 text-right text-slate-500">{(a.male + a.female + (a.other || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
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

          {employmentBarData.length > 0 && (
            <ChartCard title="Employment Sector Breakdown" subtitle="Male (blue) · Female (pink) — Govt, Private, Self-Employed, Entrepreneurs"
              className="mt-5" onExport={() => onGoToCustomReport(["education-profession"], "occupation")}>
              <GenderStackedBar data={employmentBarData} height={200} />
            </ChartCard>
          )}
        </section>

        {/* ══ 6. INSURANCE ═════════════════════════════════════ */}
        <section>
          <SectionHeader id="adv-insurance" icon={Shield}
            title="Insurance Coverage"
            subtitle="Term, Life, Health, Konkani Card — coverage by gender"
            color="#14b8a6" />

          {data.insurance.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {data.insurance.map(ins => {
                  const insTotal = (ins.yes || 0) + (ins.no || 0) + (ins.unknown || 0);
                  const yesPct   = insTotal > 0 ? Math.round((ins.yes || 0) / insTotal * 100) : 0;
                  return (
                    <div key={ins.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-500 font-medium mb-1">{ins.label}</p>
                      <p className="text-3xl font-black text-slate-900">{yesPct}%</p>
                      <p className="text-xs text-slate-400 mb-2">covered</p>
                      <div className="flex justify-center gap-3 text-xs">
                        <span className="font-bold" style={{ color: GENDER_COLORS.male }}>M {((ins as any).maleYes || 0).toLocaleString()}</span>
                        <span className="font-bold" style={{ color: GENDER_COLORS.female }}>F {((ins as any).femaleYes || 0).toLocaleString()}</span>
                        {((ins as any).otherYes || 0) > 0 && <span className="font-bold" style={{ color: GENDER_COLORS.other }}>O {((ins as any).otherYes || 0).toLocaleString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {data.insurance.map(ins => (
                  <InsuranceGenderCard key={ins.label}
                    ins={{
                      label: ins.label,
                      maleYes: (ins as any).maleYes || 0, femaleYes: (ins as any).femaleYes || 0, otherYes: (ins as any).otherYes || 0,
                      maleNo: (ins as any).maleNo || 0, femaleNo: (ins as any).femaleNo || 0, otherNo: (ins as any).otherNo || 0,
                      maleUnknown: (ins as any).maleUnknown || 0, femaleUnknown: (ins as any).femaleUnknown || 0, otherUnknown: (ins as any).otherUnknown || 0,
                      yes: ins.yes || 0, no: ins.no || 0, unknown: ins.unknown || 0,
                    }}
                    onExport={() => onGoToCustomReport(["family-information"], "insurance")}
                  />
                ))}
              </div>
              <ChartCard title="Insurance Coverage Overview" subtitle="Male (blue) · Female (pink) — Yes coverage across all types"
                className="mt-5" onExport={() => onGoToCustomReport(["family-information"], "insurance")}>
                <GenderStackedBar
                  data={data.insurance.map(ins => ({
                    label: ins.label,
                    male: (ins as any).maleYes || 0,
                    female: (ins as any).femaleYes || 0,
                    other: (ins as any).otherYes || 0,
                  }))}
                  height={180}
                />
              </ChartCard>
            </>
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
                        <button title={`Export ${doc.label} verified members`}
                          onClick={() => onGoToCustomReport(["personal-details"], "document")}
                          className="shrink-0 p-1 rounded-lg border border-slate-100 text-slate-300 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
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
              <ChartCard title="Document Verification Comparison" subtitle="Yes / No / Unknown across all documents" className="mt-5">
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
            subtitle="Gotra, Kuladevata, Surnames, Pravara, Upanama (General & Proper), Demi Gods, Ancestral Details"
            color="#a855f7" />

          {!gotraData.length && !kuldevData.length && !surnameData.length && !upanamaGenData.length && !demiGodData.length ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
              No religious data available.
            </div>
          ) : (
            <>
              {/* ── Summary KPIs ── */}
              {religious.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: "Unique Gotras",          value: religious.summary.uniqueGotras       || 0, color: "#a855f7" },
                    { label: "Unique Kuladevatas",     value: religious.summary.uniqueKuladevatas  || 0, color: "#7c3aed" },
                    { label: "Ancestral Challenges",   value: religious.summary.ancestralChallenges || 0, color: "#f43f5e" },
                    { label: "Unique Surnames in Use", value: religious.summary.uniqueSurnames      || 0, color: "#0ea5e9" },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
                      <p className="text-3xl font-black" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Row 1: Gotra + Kuladevata ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {gotraData.length > 0 && (
                  <ChartCard title="Top Gotras" subtitle="Most common gotras in the community"
                    onExport={() => onGoToCustomReport(["religious-details"], "gotra")}>
                    <SimpleBarChart data={gotraData} colorPalette={RELIGIOUS_COLORS}
                      height={Math.max(220, gotraData.length * 30)} />
                  </ChartCard>
                )}
                {kuldevData.length > 0 && (
                  <ChartCard title="Kuladevata Distribution" subtitle="Family deity distribution"
                    onExport={() => onGoToCustomReport(["religious-details"], "kuladevata")}>
                    <SimpleBarChart data={kuldevData} colorPalette={RELIGIOUS_COLORS.slice(3)}
                      height={Math.max(220, kuldevData.length * 30)} />
                  </ChartCard>
                )}
              </div>

              {/* ── Row 2: Surname + Pravara ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                
                
                {pravaraData.length > 0 && (
                  <ChartCard title="Pravara Distribution" subtitle="Pravara lineages in the community"
                    onExport={() => onGoToCustomReport(["religious-details"], "pravara")}>
                    <SimpleBarChart data={pravaraData} colorPalette={RELIGIOUS_COLORS.slice(5)}
                      height={Math.max(220, pravaraData.length * 30)} />
                  </ChartCard>
                )}
              </div>

              {/* ── Row 3: Upanama General + Upanama Proper ── */}
              {(upanamaGenData.length > 0 || upanaPropData.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                  {upanamaGenData.length > 0 && (
                    <ChartCard title="Upanama (General)" subtitle="General upanama / title distribution"
                      onExport={() => onGoToCustomReport(["religious-details"], "ancestral")}>
                      <SimpleBarChart data={upanamaGenData} colorPalette={["#6366f1","#818cf8","#a5b4fc","#4f46e5","#7c3aed","#8b5cf6"]}
                        height={Math.max(220, upanamaGenData.length * 28)} />
                    </ChartCard>
                  )}
                  {upanaPropData.length > 0 && (
                    <ChartCard title="Upanama (Proper)" subtitle="Proper upanama / clan name distribution"
                      onExport={() => onGoToCustomReport(["religious-details"], "ancestral")}>
                      <SimpleBarChart data={upanaPropData} colorPalette={["#0891b2","#06b6d4","#22d3ee","#0e7490","#155e75","#164e63"]}
                        height={Math.max(220, upanaPropData.length * 28)} />
                    </ChartCard>
                  )}
                </div>
              )}

              {/* ── Demi God distribution ── */}
              {demiGodData.length > 0 && (
                <ChartCard title="Demi God (Daiva) Distribution" subtitle="Family ancestral demi gods / daivas worshipped"
                  className="mt-5" onExport={() => onGoToCustomReport(["religious-details"], "ancestral")}>
                  <SimpleBarChart data={demiGodData} colorPalette={DEMI_GOD_COLORS}
                    height={Math.max(260, demiGodData.length * 32)} />
                </ChartCard>
              )}

              {/* ── Ancestral stats ── */}
              {religious.ancestralStats && (
                <ChartCard title="Ancestral & Spiritual Details"
                  subtitle="Families with ancestral challenges, priest info, upanama, demi gods & common relative names"
                  className="mt-5"
                  onExport={() => onGoToCustomReport(["religious-details"], "ancestral")}>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: "With Ancestral Challenge",    value: religious.ancestralStats.withChallenge       || 0, color: "#f43f5e" },
                      { label: "Without Ancestral Challenge", value: religious.ancestralStats.withoutChallenge    || 0, color: "#10b981" },
                      { label: "With Priest Info",            value: religious.ancestralStats.withPriest          || 0, color: "#a855f7" },
                      { label: "With Common Relative Names",  value: religious.ancestralStats.withCommonRelatives || 0, color: "#0ea5e9" },
                      { label: "With Upanama",                value: religious.ancestralStats.withUpanama         || 0, color: "#f59e0b" },
                      { label: "With Demi Gods",              value: religious.ancestralStats.withDemiGods        || 0, color: "#6366f1" },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  {/* Ancestral Challenge pie */}
                  {(religious.ancestralStats.withChallenge || 0) + (religious.ancestralStats.withoutChallenge || 0) > 0 && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ancestral Challenge Breakdown</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "With Challenge",    value: religious.ancestralStats.withChallenge    || 0, color: "#f43f5e" },
                                { name: "Without Challenge", value: religious.ancestralStats.withoutChallenge || 0, color: "#10b981" },
                              ].filter(d => d.value > 0)}
                              cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                              paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#ffffff">
                              {[
                                { color: "#f43f5e" },
                                { color: "#10b981" },
                              ].map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip content={(props) => <PieTooltipContent {...props}
                              total={(religious.ancestralStats?.withChallenge || 0) + (religious.ancestralStats?.withoutChallenge || 0)} />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col justify-center gap-3">
                          {[
                            { label: "With Priest Info",   value: religious.ancestralStats.withPriest    || 0, color: "#a855f7", icon: "🛕" },
                            { label: "With Upanama",       value: religious.ancestralStats.withUpanama   || 0, color: "#f59e0b", icon: "📿" },
                            { label: "With Demi Gods",     value: religious.ancestralStats.withDemiGods  || 0, color: "#6366f1", icon: "🔱" },
                          ].map(s => (
                            <div key={s.label} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                              <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <span>{s.icon}</span>{s.label}
                              </span>
                              <span className="text-sm font-black" style={{ color: s.color }}>{s.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </ChartCard>
              )}
            </>
          )}
        </section>

      </div>{/* end main content */}
    </div>
  );
}
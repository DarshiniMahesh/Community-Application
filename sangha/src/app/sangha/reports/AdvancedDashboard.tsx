// Community-Application\sangha\src\app\sangha\reports\AdvancedDashboard.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, Activity, AlertCircle, Sparkles, FileSpreadsheet,
  Filter, Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AdvancedReport } from "./page";

// ─── Gender Color Constants ────────────────────────────────────────────────────
export const GENDER_COLORS = {
  male:   "#0ea5e9",  // blue
  female: "#ec4899",  // pink
  other:  "#94a3b8",  // grey
};

// Marital status colors
const MARITAL_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#94a3b8"];

// Education colors
const EDU_COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#7c3aed", "#6d28d9"];

// Profession colors
const PROF_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#d97706", "#b45309"];

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

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
  data: AdvancedReport | null;
  loading: boolean;
  initialSection?: string;
  onGoToCustomReport: (sections: string[], category?: string) => void;
  onSectionRendered?: () => void;
}

const GEO_BAR_COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#0891b2", "#06b6d4", "#22d3ee"];

export default function AdvancedDashboard({ data, loading, initialSection, onGoToCustomReport, onSectionRendered }: Props) {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Scroll to section when navigated from General tab
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
  }, [initialSection, data]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
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

  const genderTotal = dem.gender.male + dem.gender.female + dem.gender.other;
  const genderData = [
    { name: "Male",   value: dem.gender.male,   color: GENDER_COLORS.male },
    { name: "Female", value: dem.gender.female, color: GENDER_COLORS.female },
    { name: "Other",  value: dem.gender.other,  color: GENDER_COLORS.other },
  ].filter(x => x.value > 0);

  const ftTotal = dem.familyType.nuclear + dem.familyType.joint || 1;
  const ftData = [
    { name: "Nuclear", value: dem.familyType.nuclear, color: "#10b981" },
    { name: "Joint",   value: dem.familyType.joint,   color: "#8b5cf6" },
  ].filter(x => x.value > 0);

  const maritalData = dem.maritalStatus.map((m, i) => ({
    ...m,
    color: MARITAL_COLORS[i % MARITAL_COLORS.length],
  }));

  const assetBarData = eco.assets.map(a => ({
    name: a.label,
    "Owned %": a.total > 0 ? Math.round((a.owned / a.total) * 100) : 0,
  }));

  const docCompare = data.documents.map(d => ({
    name: d.label, Yes: d.yes, No: d.no, Unknown: d.unknown,
  }));

  return (
    <div className="space-y-10">
      {/* Tip Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3">
        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
        <p className="text-sm text-slate-600">
          Real-time analytics from approved registered profiles.
          <span className="text-sky-700 font-medium ml-1">Click Export to open in Custom Report for filtered downloads.</span>
        </p>
      </div>

      {/* ── 1. Demographics ──────────────────────────── */}
      <section>
        <SectionHeader id="adv-demographics" icon={Users} title="Population & Demographics"
          subtitle="Community composition, gender, age, family type" color="#0ea5e9" />

        {/* Population Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-5">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-2">Total Population</p>
          <p className="text-5xl font-black">{(data.totalPopulation || 0).toLocaleString()}</p>
          <div className="flex items-center gap-6 mt-4">
            <div><p className="text-xl font-bold">{total.toLocaleString()}</p><p className="text-sky-200 text-xs">Families</p></div>
            <div className="w-px h-8 bg-white/20" />
            <div><p className="text-xl font-bold">{Math.max(0, (data.totalPopulation || 0) - total).toLocaleString()}</p><p className="text-sky-200 text-xs">Family members</p></div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xl font-bold">{total > 0 ? ((data.totalPopulation || 0) / total).toFixed(1) : "—"}</p>
              <p className="text-sky-200 text-xs">Avg per family</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Gender — blue/pink/grey */}
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
                    <Tooltip content={<PieTooltipContent total={genderTotal} active={undefined} payload={undefined} />} />
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

          {/* Family Type */}
          <ChartCard title="Family Type" subtitle="Nuclear vs Joint families"
            onExport={() => onGoToCustomReport(["family-information"], "family_type")}>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={ftData} cx="50%" cy="50%" innerRadius={35} outerRadius={48}
                  paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#ffffff">
                  {ftData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<PieTooltipContent total={ftTotal} active={undefined} payload={undefined} />} />
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

        {/* Age Groups */}
        <ChartCard title="Age Group Distribution" subtitle="Distribution across all registered members"
          onExport={() => onGoToCustomReport(["personal-details"], "age_group")}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dem.ageGroups} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltipContent />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Members">
                {dem.ageGroups.map((_, i) => (
                  <Cell key={i} fill={["#bfdbfe", "#7dd3fc", "#38bdf8", "#0ea5e9"][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Marital Status */}
        {maritalData.length > 0 && (
          <ChartCard title="Marital Status" subtitle="Registered heads breakdown" className="mt-5"
            onExport={() => onGoToCustomReport(["personal-details"], "marital")}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={maritalData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Members">
                  {maritalData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── 2. Education & Occupation ────────────────── */}
      <section>
        <SectionHeader id="adv-education" icon={GraduationCap} title="Education & Occupation"
          subtitle="Degrees, professions, study/work status" color="#8b5cf6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Education degrees — purple palette */}
          <ChartCard title="Highest Degree Level" subtitle="Educational attainment (purple palette)"
            onExport={() => onGoToCustomReport(["education-profession"], "education")}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={edu.degrees} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" name="Members" radius={[0, 6, 6, 0]}>
                  {edu.degrees.map((_, i) => <Cell key={i} fill={EDU_COLORS[i % EDU_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Profession — amber palette */}
          <ChartCard title="Profession Breakdown" subtitle="Employment type distribution (amber palette)"
            onExport={() => onGoToCustomReport(["education-profession"], "occupation")}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={edu.professions} margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" name="Members" radius={[0, 6, 6, 0]}>
                  {edu.professions.map((_, i) => <Cell key={i} fill={PROF_COLORS[i % PROF_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Currently Studying & Working — gender colored rings */}
        <div className="grid grid-cols-2 gap-5 mt-5">
          {[
            { label: "Currently Studying", yes: edu.studying.yes, no: edu.studying.no, yesColor: GENDER_COLORS.male, cat: "education" },
            { label: "Currently Working",  yes: edu.working.yes,  no: edu.working.no,  yesColor: "#10b981", cat: "occupation" },
          ].map((s) => {
            const t = s.yes + s.no || 1;
            return (
              <ChartCard key={s.label} title={s.label} subtitle="Yes vs No"
                onExport={() => onGoToCustomReport(["education-profession"], s.cat)}>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={s.yesColor} strokeWidth="3"
                        strokeDasharray={`${(s.yes / t) * 100} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-base font-black" style={{ color: s.yesColor }}>{Math.round(s.yes / t * 100)}%</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {[
                      { name: "Yes", val: s.yes, color: s.yesColor },
                      { name: "No",  val: s.no,  color: "#94a3b8"  },
                    ].map(row => (
                      <div key={row.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-500">{row.name}</span>
                          <span className="text-xs font-bold" style={{ color: row.color }}>{row.val.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{ width: `${row.val / t * 100}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            );
          })}
        </div>
      </section>

      {/* ── 3. Geographic ────────────────────────────── */}
      <section>
        <SectionHeader id="adv-geographic" icon={MapPin} title="Geographic Distribution"
          subtitle="Cities, pincodes, districts — where families are located" color="#14b8a6" />

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
                <span className="bg-teal-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold min-w-[20px] text-center">
                  {selectedCities.length}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 max-h-72 overflow-y-auto p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Select Cities</p>
                {data.geographic.map(g => (
                  <label key={g.city}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700">
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
            <span key={city}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
              <span className="capitalize">{city}</span>
              <button onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))} className="hover:text-teal-900">×</button>
            </span>
          ))}
        </div>

        <ChartCard
          title={selectedCities.length === 0 ? "Top Cities by Family Count" : `${filteredGeo.length} Cities Selected`}
          subtitle="Geographic spread of registered families"
          onExport={() => onGoToCustomReport(["location-information"], "city")}
        >
          {filteredGeo.length === 0 ? (
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
                  {filteredGeo.map((_e, idx) => (
                    <Cell key={idx} fill={GEO_BAR_COLORS[idx % GEO_BAR_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0d9488" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ── 4. Economic ──────────────────────────────── */}
      <section>
        <SectionHeader id="adv-economic" icon={Wallet} title="Family Annual Income"
          subtitle="Household income distribution" color="#f59e0b" />

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
                  {eco.incomeSlabs.map((_, i) => (
                    <Cell key={i} fill={`hsl(${42 + i * 5}, 90%, ${55 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── 5. Assets ─────────────────────────────────── */}
      <section>
        <SectionHeader id="adv-assets" icon={Home} title="Assets & Ownership"
          subtitle="Own Land, House, Vehicles, Renting" color="#f97316" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {eco.assets.map((asset) => {
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

        {/* Asset Comparison Bar */}
        <ChartCard title="Asset Ownership Comparison" subtitle="Ownership % across all asset types" className="mt-5"
          onExport={() => onGoToCustomReport(["economic-details"], "asset")}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assetBarData} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip content={<BarTooltipContent />} />
              <Bar dataKey="Owned %" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Employment Sectors */}
        {eco.employment && eco.employment.some(e => e.count > 0) && (
          <ChartCard title="Employment Sector Breakdown" subtitle="Govt, Private, Self-Employed, Entrepreneurs" className="mt-5"
            onExport={() => onGoToCustomReport(["education-profession"], "occupation")}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eco.employment} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTooltipContent />} />
                <Bar dataKey="count" name="Members" radius={[6, 6, 0, 0]}>
                  {eco.employment.map((_, i) => (
                    <Cell key={i} fill={PROF_COLORS[i % PROF_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </section>

      {/* ── 6. Insurance ─────────────────────────────── */}
      <section>
        <SectionHeader id="adv-insurance" icon={Shield} title="Insurance Coverage"
          subtitle="Term, Life, Health, Konkani Card" color="#14b8a6" />

        {data.insurance.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.insurance.map((ins) => {
              const t = (ins.covered + ins.notCovered) || 1;
              const pct = Math.round(ins.covered / t * 100);
              const coveredColor = "#10b981";
              const uncoveredColor = "#f1f5f9";
              return (
                <ChartCard key={ins.label} title={`${ins.label} Insurance`}
                  onExport={() => onGoToCustomReport(["family-information"], "insurance")}>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie data={[
                        { name: "Covered", value: ins.covered },
                        { name: "Not Covered", value: ins.notCovered },
                      ]} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#ffffff">
                        <Cell fill={coveredColor} />
                        <Cell fill={uncoveredColor} />
                      </Pie>
                      <Tooltip content={<PieTooltipContent total={t} active={undefined} payload={undefined} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-center text-2xl font-black text-slate-900 -mt-2">{pct}%</p>
                  <p className="text-center text-xs text-slate-500">coverage</p>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-emerald-600 font-medium">✓ {ins.covered.toLocaleString()}</span>
                    <span className="text-slate-400">{ins.notCovered.toLocaleString()} not</span>
                  </div>
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

      {/* ── 7. Documents ──────────────────────────────── */}
      <section>
        <SectionHeader id="adv-documents" icon={FileText} title="Documentation Status"
          subtitle="Aadhaar, PAN, Voter ID, Land Records, DL" color="#f43f5e" />

        {data.documents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {data.documents.map((doc) => {
                const t = (doc.yes + doc.no + doc.unknown) || 1;
                const pct = Math.round(doc.yes / t * 100);
                return (
                  <div key={doc.label}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm cursor-pointer hover:border-rose-300 transition-all"
                    onClick={() => onGoToCustomReport(["personal-details"], "document")}>
                    <p className="text-xs text-slate-500 font-medium mb-2">{doc.label}</p>
                    <p className="text-3xl font-black text-slate-900">{pct}%</p>
                    <p className="text-xs text-slate-400 mb-3">verified</p>
                    <div className="space-y-1">
                      {[
                        { label: "Yes", val: doc.yes, color: "#22c55e" },
                        { label: "No", val: doc.no, color: "#ef4444" },
                        { label: "?", val: doc.unknown, color: "#94a3b8" },
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

            <ChartCard title="Document Verification Comparison" subtitle="Yes / No / Unknown across all documents" className="mt-5"
              onExport={() => onGoToCustomReport(["personal-details"], "document")}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={docCompare} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltipContent />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  <Bar dataKey="Yes" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="No" fill="#ef4444" stackId="a" />
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
    </div>
  );
}
//Community-Application\sangha\src\app\sangha\reports\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, BarChart2, FileSpreadsheet, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./GeneralDashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";
import DateRangePicker, { DEFAULT_DATE_RANGE, DateRange, toISO } from "./DateRangePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Counts {
  approved: string; rejected: string; pending: string;
  changes_requested: string; draft: string; total: string;
}
export interface Trends {
  approved_last30: string; approved_prev30: string;
  submitted_last30: string; submitted_prev30: string;
  total_last30: string; total_prev30: string;
}
export interface DailyReg { date: string; registrations: string; approvals: string; rejections: string; }
export interface EnhancedReport {
  counts: Counts; trends: Trends; dailyRegistrations: DailyReg[];
}

export interface AdvancedReport {
  totalApproved: number;
  totalPopulation: number;
  statusBreakdown?: { status: string; count: number }[];
  statusGenderBreakdown?: { status: string; male: number; female: number; other: number }[];
  demographics: {
    gender: { male: number; female: number; other: number };
    ageGroups: { label: string; count: number }[];
    ageGroupsGender?: { label: string; male: number; female: number; other: number }[];
    familyType: { nuclear: number; joint: number };
    maritalStatus: { label: string; count: number }[];
    maritalStatusGender?: { label: string; male: number; female: number; other: number }[];
  };
  education: {
    degrees: { label: string; count: number }[];
    degreesGender?: { label: string; male: number; female: number; other: number }[];
    studying: { yes: number; no: number; maleYes?: number; femaleYes?: number; otherYes?: number; maleNo?: number; femaleNo?: number; otherNo?: number };
    working: { yes: number; no: number; maleYes?: number; femaleYes?: number; otherYes?: number; maleNo?: number; femaleNo?: number; otherNo?: number };
    professions: { label: string; count: number }[];
    professionsGender?: { label: string; male: number; female: number; other: number }[];
  };
  economic: {
    incomeSlabs: { label: string; count: number }[];
    assets: { label: string; owned: number; total: number }[];
    assetsGender?: { label: string; male: number; female: number; other: number }[];
    employment: { label: string; count: number }[];
    employmentGender?: { label: string; male: number; female: number; other: number }[];
  };
  insurance: { label: string; covered?: number; notCovered?: number; yes?: number; no?: number; unknown?: number }[];
  documents: { label: string; yes: number; no: number; unknown: number }[];
  geographic: { city: string; count: number; pincode?: string; state?: string }[];
  geographicGender?: { city: string; male: number; female: number; other: number }[];
  religious?: {
    gotras?: { label: string; count: number }[];
    kuladevatas?: { label: string; count: number }[];
    surnames?: { label: string; count: number }[];
    pravaras?: { label: string; count: number }[];
    summary?: {
      uniqueGotras?: number;
      uniqueKuladevatas?: number;
      ancestralChallenges?: number;
      uniqueSurnames?: number;
    };
    ancestralStats?: {
      withChallenge?: number;
      withoutChallenge?: number;
      withPriest?: number;
      withCommonRelatives?: number;
      withUpanama?: number;
      withDemiGods?: number;
    };
  };
}

export type TabId = "general" | "advanced" | "custom";

export interface NavigateToAdvancedOptions {
  section?: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [advancedSection, setAdvancedSection] = useState<string | undefined>();
  const [data, setData] = useState<EnhancedReport | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fix #1: shared date range state for Advanced tab
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  // Custom report: pre-selected sections from chart clicks
  const [customInitSections, setCustomInitSections] = useState<string[]>([]);
  const [customInitCategory, setCustomInitCategory] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const result = await api.get("/sangha/reports/enhanced");
      setData(result);
    } catch {
      setError(true); setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fix #1 + #6: fetchAdvancedData now accepts an optional range override and
  // properly captures dateRange — no stale-closure suppression needed.
  const fetchAdvancedData = useCallback(async (range?: DateRange) => {
    setAdvancedLoading(true);
    try {
      const r = range ?? dateRange;
      const params =
        r.preset === "allTime"
          ? ""
          : `?dateFrom=${toISO(r.from)}&dateTo=${toISO(r.to)}`;
      const result = await api.get(`/sangha/reports/advanced${params}`);
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fix #6: proper deps — no eslint-disable needed
  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab, advancedData, advancedLoading, fetchAdvancedData]);

  // Fix #1: re-fetch when date range changes while on advanced tab
  useEffect(() => {
    if (activeTab === "advanced") {
      fetchAdvancedData(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Fix #12: clear custom-report init state when navigating away from "custom" tab
  useEffect(() => {
    if (activeTab !== "custom") {
      setCustomInitSections([]);
      setCustomInitCategory(undefined);
    }
  }, [activeTab]);

  // Navigate to advanced tab with optional section scroll
  const goToAdvanced = useCallback((section?: string) => {
    setAdvancedSection(section);
    setActiveTab("advanced");
    if (!advancedData && !advancedLoading) fetchAdvancedData();
  }, [advancedData, advancedLoading, fetchAdvancedData]);

  // Navigate to custom report tab with pre-selected data
  const goToCustomReport = useCallback((sections: string[], category?: string) => {
    setCustomInitSections(sections);
    setCustomInitCategory(category);
    setActiveTab("custom");
  }, []);

  // Fix #13: memoize so onSectionRendered reference is stable across renders
  const handleSectionRendered = useCallback(() => {
    setAdvancedSection(undefined);
  }, []);

  const tabs = [
    { id: "general"  as TabId, label: "General Dashboard",  icon: LayoutDashboard },
    { id: "advanced" as TabId, label: "Advanced Analytics", icon: BarChart2 },
    { id: "custom"   as TabId, label: "Custom Report",      icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          </div>
          <p className="text-slate-500 text-sm ml-7">
            Deep insights into your Sangha's registration pipeline and community demographics
          </p>
        </div>

        {/* Tab Bar + Date Picker (shown only on Advanced tab) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-sky-500 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-0.5" />}
              </button>
            ))}
          </div>

          {/* Fix #1: Date range picker shown for Advanced tab */}
          {activeTab === "advanced" && (
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                // reset cached data so the effect above triggers a fresh fetch
                setAdvancedData(null);
              }}
              showReset
            />
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <GeneralDashboard
            data={data}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            onGoToAdvanced={goToAdvanced}
            onGoToCustomReport={goToCustomReport}
          />
        )}
        {activeTab === "advanced" && (
          // Fix #1: dateRange now passed; Fix #13: stable callback reference
          <AdvancedDashboard
            data={advancedData}
            loading={advancedLoading}
            initialSection={advancedSection}
            dateRange={dateRange}
            onGoToCustomReport={goToCustomReport}
            onSectionRendered={handleSectionRendered}
          />
        )}
        {activeTab === "custom" && (
          <CustomReport
            initSections={customInitSections}
            initCategory={customInitCategory}
            onClearInit={() => { setCustomInitSections([]); setCustomInitCategory(undefined); }}
            dateRange={dateRange}
          />
        )}
      </div>
    </div>
  );
}
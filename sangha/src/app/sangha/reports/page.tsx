//Community-Application\sangha\src\app\sangha\reports\page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LayoutDashboard, BarChart2, FileSpreadsheet, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./GeneralDashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";
import DateRangePicker, { getDefaultDateRange, DateRange, toISO } from "./DateRangePicker";

// Supported report statuses only (approved, pending, changes requested, rejected).
// Draft is intentionally not part of the Reports module.
export interface Counts {
  approved: string; rejected: string; pending: string;
  changes_requested: string; total: string;
}
export interface Trends {
  approved_last30: string; approved_prev30: string;
  submitted_last30: string; submitted_prev30: string;
  total_last30: string; total_prev30: string;
}

// One bucket of the registration trend. `date` is YYYY-MM-DD and is the day,
// the Monday of the week, or the first of the month, depending on the
// response's registrationGranularity.
export interface DailyReg {
  date: string;
  registrations: string;
  approvals: string;
  rejections: string;
}

export type RegistrationGranularity = "day" | "week" | "month";

export interface EnhancedReport {
  counts: Counts;
  trends: Trends;
  dailyRegistrations: DailyReg[];
  registrationGranularity?: RegistrationGranularity;
  sectionCounts: {
    personalDetails: number;
    locationInformation: number;
    educationProfession: number;
    economicDetails: number;
    insuranceCoverage: number;
    documentationStatus: number;
    religiousDetails: number;
  };
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
    /**
     * Exactly four marital-status categories (Single (Never Married), Married, Single & Divorced,
     * Single & Widowed), always in that order and zero-filled. `other` is the gender "other" count.
     * Source: approved profiles with personal_details.
     */
    maritalDetailedBars?: { key?: string; label: string; male: number; female: number; other?: number }[];
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
    upanamaGenerals?: { label: string; count: number }[];
    upanamaPropers?: { label: string; count: number }[];
    demiGods?: { label: string; count: number }[];
  };
}

export type TabId = "general" | "advanced" | "custom";

export interface NavigateToAdvancedOptions {
  section?: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab]       = useState<TabId>("general");
  const [advancedSection, setAdvancedSection] = useState<string | undefined>();
  const [data, setData]                 = useState<EnhancedReport | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedReport | null>(null);
  const [loading, setLoading]           = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [error, setError]               = useState(false);
  // Lazy initializer: always starts from today's India date, not a module-load timestamp.
  const [dateRange, setDateRange]       = useState<DateRange>(() => getDefaultDateRange());
  const [customInitSections, setCustomInitSections] = useState<string[]>([]);
  const [customInitCategory, setCustomInitCategory] = useState<string | undefined>();

  // Guards against an older (slower) response overwriting a newer one.
  const generalRequestId = useRef(0);

  const fetchData = useCallback(async (range?: DateRange) => {
    const requestId = ++generalRequestId.current;
    setLoading(true); setError(false);
    try {
      const r    = range ?? dateRange;
      const from = toISO(r.from);
      const to   = toISO(r.to);
      // All Time sends no bounds so the backend does not restrict the period.
      const params = (r.preset === "allTime" || !from || !to)
        ? ""
        : `?dateFrom=${from}&dateTo=${to}`;
      const result = await api.get(`/sangha/reports/enhanced${params}`);
      if (requestId !== generalRequestId.current) return; // a newer request superseded this one
      setData(result as EnhancedReport);
    } catch {
      if (requestId !== generalRequestId.current) return;
      setError(true); setData(null);
    } finally {
      if (requestId === generalRequestId.current) setLoading(false);
    }
  }, [dateRange]);

  const fetchAdvancedData = useCallback(async (range?: DateRange) => {
    setAdvancedLoading(true);
    try {
      const r    = range ?? dateRange;
      const from = toISO(r.from);
      const to   = toISO(r.to);
      const params = (r.preset === "allTime" || !from || !to)
        ? ""
        : `?dateFrom=${from}&dateTo=${to}`;
      const result = await api.get(`/sangha/reports/advanced${params}`);
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, [dateRange]);

  // Initial load, and re-fetch of the general dashboard whenever the date range
  // changes (fetchData's identity changes with dateRange).
  useEffect(() => { fetchData(); }, [fetchData]);

  // Load advanced data when switching to that tab (if not already loaded)
  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab, advancedData, advancedLoading, fetchAdvancedData]);

  // Re-fetch advanced data when the date range changes while that tab is active.
  // (The general dashboard is already re-fetched by the effect above.)
  useEffect(() => {
    if (activeTab === "advanced") {
      fetchAdvancedData(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Clear custom-report init state when navigating away from "custom" tab
  useEffect(() => {
    if (activeTab !== "custom") {
      setCustomInitSections([]);
      setCustomInitCategory(undefined);
    }
  }, [activeTab]);

  const goToAdvanced = useCallback((section?: string) => {
    setAdvancedSection(section);
    setActiveTab("advanced");
    if (!advancedData && !advancedLoading) fetchAdvancedData();
  }, [advancedData, advancedLoading, fetchAdvancedData]);

  // sections → Custom Report sections to open
  // category → requested registration status ("approved" | "pending" | "changes_requested" | "rejected" | "all")
  //            passed through to CustomReport as initCategory
  const goToCustomReport = useCallback((sections: string[], category?: string) => {
    setCustomInitSections(sections);
    setCustomInitCategory(category);
    setActiveTab("custom");
  }, []);

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
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-sky-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          </div>
          <p className="text-slate-500 text-sm ml-7">
            Deep insights into your Sangha's registration pipeline and community demographics
          </p>
        </div>

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

          {(activeTab === "general" || activeTab === "advanced") && (
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setAdvancedData(null);
              }}
              showReset
            />
          )}
        </div>

        {activeTab === "general" && (
          <GeneralDashboard
            data={data}
            loading={loading}
            error={error}
            onRefresh={() => fetchData()}
            onGoToAdvanced={goToAdvanced}
            onGoToCustomReport={goToCustomReport}
          />
        )}
        {activeTab === "advanced" && (
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
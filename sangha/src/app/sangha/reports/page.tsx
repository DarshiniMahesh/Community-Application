// Community-Application\sangha\src\app\sangha\reports\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, BarChart2, FileSpreadsheet, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./GeneralDashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";

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
  demographics: {
    gender: { male: number; female: number; other: number };
    ageGroups: { label: string; count: number }[];
    familyType: { nuclear: number; joint: number };
    maritalStatus: { label: string; count: number }[];
  };
  education: {
    degrees: { label: string; count: number }[];
    studying: { yes: number; no: number };
    working: { yes: number; no: number };
    professions: { label: string; count: number }[];
  };
  economic: {
    incomeSlabs: { label: string; count: number }[];
    assets: { label: string; owned: number; total: number }[];
    employment: { label: string; count: number }[];
  };
  insurance: { label: string; covered: number; notCovered: number }[];
  documents: { label: string; yes: number; no: number; unknown: number }[];
  geographic: { city: string; count: number; pincode?: string; state?: string }[];
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

  const fetchAdvancedData = useCallback(async () => {
    setAdvancedLoading(true);
    try {
      const result = await api.get("/sangha/reports/advanced");
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab]); // eslint-disable-line

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

        {/* Tab Bar */}
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
          <AdvancedDashboard
            data={advancedData}
            loading={advancedLoading}
            initialSection={advancedSection}
            onGoToCustomReport={goToCustomReport}
            onSectionRendered={() => setAdvancedSection(undefined)}
          />
        )}
        {activeTab === "custom" && (
          <CustomReport
            initSections={customInitSections}
            initCategory={customInitCategory}
            onClearInit={() => { setCustomInitSections([]); setCustomInitCategory(undefined); }}
          />
        )}
      </div>
    </div>
  );
}
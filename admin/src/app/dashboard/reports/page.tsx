// Community-Application\admin\src\app\dashboard\reports\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, BarChart2, FileSpreadsheet, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./GeneralDashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";
import DateRangePicker, { DateRange, toISO } from "./DateRangePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneralReport {
  users: {
    total: number; approved: number; submitted: number;
    under_review: number; changes_requested: number;
    draft: number; rejected: number; new_this_period: number;
  };
  sanghas: {
    total: number; approved: number; pending_approval: number;
    rejected: number; suspended: number; new_this_period: number;
  };
  registrations_trend:  { period: string; users: number; sanghas: number }[];
  users_by_state:       { state: string; count: number }[];
  users_by_state_gender?: { state: string; male: number; female: number; other: number }[];
  sanghas_by_state:     { state: string; count: number }[];
  gender_distribution:  { gender: string; count: number }[];
  user_status_dist:     { status: string; count: number }[];
  sangha_status_dist:   { status: string; count: number }[];
  top_sanghas:          { sangha_name: string; member_count: number; state: string }[];
  users_by_district:    { district: string; count: number }[];
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
    studying: {
      yes: number; no: number;
      maleYes?: number; femaleYes?: number; otherYes?: number;
      maleNo?: number;  femaleNo?: number;  otherNo?: number;
    };
    working: {
      yes: number; no: number;
      maleYes?: number; femaleYes?: number; otherYes?: number;
      maleNo?: number;  femaleNo?: number;  otherNo?: number;
    };
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
  insurance: {
    label: string; covered?: number; notCovered?: number;
    yes?: number; no?: number; unknown?: number;
  }[];
  documents: { label: string; yes: number; no: number; unknown: number }[];
  geographic: { city: string; count: number; pincode?: string; state?: string }[];
  geographicGender?: { city: string; male: number; female: number; other: number }[];
  religious?: {
    gotras?: { label: string; count: number }[];
    kuladevatas?: { label: string; count: number }[];
    surnames?: { label: string; count: number }[];
    pravaras?: { label: string; count: number }[];
    summary?: {
      uniqueGotras?: number; uniqueKuladevatas?: number;
      ancestralChallenges?: number; uniqueSurnames?: number;
    };
    ancestralStats?: {
      withChallenge?: number; withoutChallenge?: number; withPriest?: number;
      withCommonRelatives?: number; withUpanama?: number; withDemiGods?: number;
    };
  };
}

export type TabId = "general" | "advanced" | "custom";

// ─── Default date range ───────────────────────────────────────────────────────

const DEFAULT_DATE_RANGE: DateRange = { from: null, to: null, preset: "allTime" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [activeTab,          setActiveTab]          = useState<TabId>("general");
  const [advancedSection,    setAdvancedSection]    = useState<string | undefined>();
  const [generalData,        setGeneralData]        = useState<GeneralReport | null>(null);
  const [advancedData,       setAdvancedData]       = useState<AdvancedReport | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [advancedLoading,    setAdvancedLoading]    = useState(false);
  const [error,              setError]              = useState(false);
  const [dateRange,          setDateRange]          = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [customInitSections, setCustomInitSections] = useState<string[]>([]);
  const [customInitCategory, setCustomInitCategory] = useState<string | undefined>();
  const [hoveredTab,         setHoveredTab]         = useState<TabId | null>(null);

  // ── Fetch general data ───────────────────────────────────────────────────
  const fetchData = useCallback(async (range?: DateRange) => {
    setLoading(true); setError(false);
    try {
      const r    = range ?? dateRange;
      const from = toISO(r.from);
      const to   = toISO(r.to);
      const params = (r.preset === "allTime" || !from || !to)
        ? ""
        : `?dateFrom=${from}&dateTo=${to}`;
      const result = await api.get(`/admin/reports/general${params}`);
      setGeneralData(result);
    } catch {
      setError(true); setGeneralData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch advanced data ──────────────────────────────────────────────────
  const fetchAdvancedData = useCallback(async (range?: DateRange) => {
    setAdvancedLoading(true);
    try {
      const r    = range ?? dateRange;
      const from = toISO(r.from);
      const to   = toISO(r.to);
      const params = (r.preset === "allTime" || !from || !to)
        ? ""
        : `?dateFrom=${from}&dateTo=${to}`;
      const result = await api.get(`/admin/reports/advanced${params}`);
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, [dateRange]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Load advanced data when switching to that tab ────────────────────────
  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab, advancedData, advancedLoading, fetchAdvancedData]);

  // ── Re-fetch on date range change ────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "general")  fetchData(dateRange);
    if (activeTab === "advanced") fetchAdvancedData(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goToAdvanced = useCallback((section?: string) => {
    setAdvancedSection(section);
    setActiveTab("advanced");
    if (!advancedData && !advancedLoading) fetchAdvancedData();
  }, [advancedData, advancedLoading, fetchAdvancedData]);

  const goToCustomReport = useCallback((sections: string[], category?: string) => {
    setCustomInitSections(sections);
    setCustomInitCategory(category);
    setActiveTab("custom");
  }, []);

  const handleSectionRendered = useCallback(() => {
    setAdvancedSection(undefined);
  }, []);

  // ── Tabs config ──────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general",  label: "General Dashboard",  icon: LayoutDashboard },
    { id: "advanced", label: "Advanced Analytics", icon: BarChart2       },
    { id: "custom",   label: "Custom Report",      icon: FileSpreadsheet },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <BarChart2 style={{ width: "20px", height: "20px", color: "#0284c7" }} />
            <h1 style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.025em",
              margin: 0,
            }}>
              Analytics &amp; Reports
            </h1>
          </div>
          <p style={{
            color: "#64748b",
            fontSize: "14px",
            margin: "0 0 0 28px",
          }}>
            Deep insights into your community's registration pipeline and demographics
          </p>
        </div>

        {/* ── Tab bar + date picker ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{
            display: "flex",
            gap: "4px",
            padding: "4px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}>
            {tabs.map(tab => {
              const isActive  = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id && !isActive;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    backgroundColor: isActive ? "#0ea5e9" : isHovered ? "#f8fafc" : "transparent",
                    color: isActive ? "#ffffff" : isHovered ? "#1e293b" : "#64748b",
                    boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <tab.icon style={{ width: "16px", height: "16px" }} />
                  {tab.label}
                  {isActive && <ChevronRight style={{ width: "12px", height: "12px", marginLeft: "2px" }} />}
                </button>
              );
            })}
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

        {/* ── Tab content ──────────────────────────────────────────────── */}
        {activeTab === "general" && (
          <GeneralDashboard
            data={generalData}
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
            dateRange={dateRange}
            onGoToCustomReport={goToCustomReport}
            onSectionRendered={handleSectionRendered}
          />
        )}
        {activeTab === "custom" && (
          <CustomReport
            initSections={customInitSections}
            initCategory={customInitCategory}
            onClearInit={() => {
              setCustomInitSections([]);
              setCustomInitCategory(undefined);
            }}
            dateRange={dateRange}
          />
        )}

      </div>
    </div>
  );
}
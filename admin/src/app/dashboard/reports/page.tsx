//Community-Application\admin\src\app\dashboard\reports\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, BarChart2, FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./Generaldashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";
import DateRangePicker, { DateRange, toISO } from "./DateRangePicker";

// ── Types ─────────────────────────────────────────────────────────────────────
export type TabId = "general" | "advanced" | "custom";

// ── Colour tokens (matches Generaldashboard palette) ──────────────────────────
const C = {
  sky:      "#0ea5e9",
  skyLight: "#f0f9ff",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate800: "#1e293b",
  slate900: "#0f172a",
  white:    "#ffffff",
};

// ── Default date range ────────────────────────────────────────────────────────
const DEFAULT_DATE_RANGE: DateRange = { from: null, to: null, preset: "allTime" };

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: "general",  label: "General Dashboard",  Icon: LayoutDashboard },
  { id: "advanced", label: "Advanced Analytics", Icon: BarChart2        },
  { id: "custom",   label: "Custom Report",      Icon: FileSpreadsheet  },
];

// ── Hoverable tab button ──────────────────────────────────────────────────────
function TabBtn({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { Icon } = tab;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 20px",
        borderRadius: 10,
        border: "none",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.18s",
        background: active
          ? C.sky
          : hov
          ? C.slate100
          : "transparent",
        color: active ? C.white : hov ? C.slate800 : C.slate500,
        boxShadow: active ? "0 2px 10px rgba(14,165,233,0.30)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
      {tab.label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [activeTab,       setActiveTab]       = useState<TabId>("general");
  const [advancedSection, setAdvancedSection] = useState<string | undefined>();
  const [advancedData,    setAdvancedData]    = useState<any | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [dateRange,       setDateRange]       = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [customInitSections, setCustomInitSections] = useState<string[]>([]);
  const [customInitCategory, setCustomInitCategory] = useState<string | undefined>();

  // ── Fetch advanced data ────────────────────────────────────────────────────
  const fetchAdvancedData = useCallback(async (range?: DateRange) => {
    setAdvancedLoading(true);
    try {
      const r      = range ?? dateRange;
      const from   = toISO(r.from);
      const to     = toISO(r.to);
      const params =
        r.preset === "allTime" || !from || !to ? "" : `?from=${from}&to=${to}`;
      const result = await api.get(`/api/admin/reports/advanced${params}`);
      setAdvancedData(result);
    } catch {
      setAdvancedData(null);
    } finally {
      setAdvancedLoading(false);
    }
  }, [dateRange]);

  // ── Load advanced data when switching to that tab ──────────────────────────
  useEffect(() => {
    if (activeTab === "advanced" && !advancedData && !advancedLoading) {
      fetchAdvancedData();
    }
  }, [activeTab, advancedData, advancedLoading, fetchAdvancedData]);

  // ── Re-fetch advanced data on date-range change ────────────────────────────
  useEffect(() => {
    if (activeTab === "advanced") {
      fetchAdvancedData(dateRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // ── Clear custom-report init state when navigating away ───────────────────
  useEffect(() => {
    if (activeTab !== "custom") {
      setCustomInitSections([]);
      setCustomInitCategory(undefined);
    }
  }, [activeTab]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goToAdvanced = useCallback(
    (section?: string) => {
      setAdvancedSection(section);
      setActiveTab("advanced");
      if (!advancedData && !advancedLoading) fetchAdvancedData();
    },
    [advancedData, advancedLoading, fetchAdvancedData],
  );

  const goToCustomReport = useCallback((sections: string[], category?: string) => {
    setCustomInitSections(sections);
    setCustomInitCategory(category);
    setActiveTab("custom");
  }, []);

  const handleSectionRendered = useCallback(() => {
    setAdvancedSection(undefined);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.slate100,
        fontFamily:
          "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <BarChart2
              style={{ width: 20, height: 20, color: C.sky, flexShrink: 0 }}
            />
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: C.slate900,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              Analytics &amp; Reports
            </h1>
          </div>
          <p
            style={{
              fontSize: 13,
              color: C.slate500,
              margin: 0,
              paddingLeft: 28,
              fontWeight: 500,
            }}
          >
            Deep insights into users and sanghas across all states
          </p>
        </div>

        {/* ── Tab bar + date picker ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Tab pill */}
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: 4,
              background: C.white,
              border: `1px solid ${C.slate200}`,
              borderRadius: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {TABS.map((tab) => (
              <TabBtn
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          {/* Date picker — only on general + advanced tabs */}
          {(activeTab === "general" || activeTab === "advanced") && (
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                if (activeTab === "advanced") setAdvancedData(null);
              }}
            />
          )}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}

        {/* General Dashboard — has its own overview / users / sanghas sub-tabs */}
        {activeTab === "general" && (
          <GeneralDashboard dateRange={dateRange} />
        )}

        {/* Advanced Analytics */}
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

        {/* Custom Report */}
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
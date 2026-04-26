//Community-Application\admin\src\app\dashboard\reports\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard, BarChart2, FileSpreadsheet, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import GeneralDashboard from "./GeneralDashboard";
import AdvancedDashboard from "./AdvancedDashboard";
import CustomReport from "./CustomReport";

export interface OverviewData {
  date_range: { start_date: string; end_date: string };
  sangha: {
    registered: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  users: {
    registered: number;
    approved: number;
    rejected: number;
    changes_requested: number;
  };
  by_reviewer: {
    admin_approved: number;
    sangha_approved: number;
    admin_rejected: number;
    sangha_rejected: number;
  };
  gender_status: Array<{ gender: string; status: string; count: number | string }>;
}

export interface DateRegData {
  date_range: { start_date: string; end_date: string };
  user_registrations: Array<{ date: string; count: number | string }>;
  sangha_registrations: Array<{ date: string; count: number | string }>;
}

type TabId = "general" | "advanced" | "custom";

const tabs = [
  {
    id: "general" as TabId,
    label: "General Dashboard",
    icon: LayoutDashboard,
    desc: "Overview & KPIs",
    color: "#F97316",
    bg: "from-orange-500 to-amber-400",
  },
  {
    id: "advanced" as TabId,
    label: "Advanced Analytics",
    icon: BarChart2,
    desc: "Deep insights",
    color: "#0EA5E9",
    bg: "from-sky-500 to-cyan-400",
  },
  {
    id: "custom" as TabId,
    label: "Custom Report",
    icon: FileSpreadsheet,
    desc: "Export & filter",
    color: "#8B5CF6",
    bg: "from-violet-500 to-purple-400",
  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dateReg, setDateReg] = useState<DateRegData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [advancedSection, setAdvancedSection] = useState<string | undefined>();
  const [customCategory, setCustomCategory] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [overviewJson, dateRegJson] = await Promise.all([
        api.get(`/admin/reports/general/overview?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/admin/reports/general/date-registration?start_date=${startDate}&end_date=${endDate}`),
      ]);
      setOverview(overviewJson);
      setDateReg(dateRegJson);
    } catch {
      setOverview(null);
      setDateReg(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    const start = past.toISOString().split("T")[0];
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchData();
  }, [fetchData, startDate, endDate]);

  const goToAdvanced = useCallback((section?: string) => {
    setAdvancedSection(section);
    setActiveTab("advanced");
  }, []);

  const goToCustomReport = useCallback((_sections: string[], category?: string) => {
    setCustomCategory(category);
    setActiveTab("custom");
  }, []);

  const activeTabData = tabs.find((t) => t.id === activeTab)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800&display=swap');

        .reports-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #F0F6FF;
          min-height: 100vh;
        }

        .page-header-bg {
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF7F0 40%, #F0F9FF 100%);
          border-bottom: 1px solid #E8F0FE;
          position: relative;
          overflow: hidden;
        }
        .page-header-bg::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, #FED7AA22 0%, transparent 70%);
        }
        .page-header-bg::after {
          content: '';
          position: absolute;
          bottom: -40px; left: 20%;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle, #BAE6FD22 0%, transparent 70%);
        }

        .tab-pill {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1.5px solid transparent;
          background: transparent;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .tab-pill:hover:not(.active) {
          background: white;
          border-color: #E2E8F0;
          transform: translateY(-1px);
        }
        .tab-pill.active {
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }
        .tab-pill .tab-icon-wrap {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .tab-indicator {
          position: absolute;
          bottom: -2px; left: 50%; transform: translateX(-50%);
          height: 3px; width: 36px;
          border-radius: 2px 2px 0 0;
          opacity: 0;
          transition: opacity 0.25s;
        }
        .tab-pill.active .tab-indicator { opacity: 1; }

        .content-fade-in {
          animation: fadeSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .breadcrumb-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
          background: rgba(255,255,255,0.8);
          border: 1px solid #E2E8F0;
          color: #64748B;
        }
      `}</style>

      <div className="reports-root">
        {/* ── Page Header ── */}
        <div className="page-header-bg px-6 py-6">
          <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span className="breadcrumb-chip">
                <BarChart2 size={10} />
                Admin
              </span>
              <ChevronRight size={12} style={{ color: "#CBD5E1" }} />
              <span className="breadcrumb-chip" style={{ borderColor: activeTabData.color + "44", color: activeTabData.color }}>
                Analytics & Reports
              </span>
            </div>

            {/* Title Row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 28, fontWeight: 800, color: "#0F172A",
                  letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2,
                }}>
                  Analytics &amp;{" "}
                  <span style={{ background: "linear-gradient(90deg, #F97316, #FB923C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Reports
                  </span>
                </h1>
                <p style={{ color: "#64748B", fontSize: 13.5, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                  <Sparkles size={13} style={{ color: "#F97316" }} />
                  Deep insights into users and sanghas across the full admin dataset
                </p>
              </div>

              {/* Live badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 20,
                background: "white",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "block", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Live Data</span>
              </div>
            </div>

            {/* ── Tab Bar ── */}
            <div style={{
              display: "flex", gap: 4, marginTop: 20,
              padding: 4,
              background: "#F1F5F9",
              borderRadius: 18,
              width: "fit-content",
              border: "1px solid #E2E8F0",
            }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-pill ${isActive ? "active" : ""}`}
                    style={{ outline: "none" }}
                  >
                    <div
                      className="tab-icon-wrap"
                      style={{
                        background: isActive ? `linear-gradient(135deg, ${tab.color}22, ${tab.color}11)` : "transparent",
                      }}
                    >
                      <tab.icon
                        size={16}
                        style={{ color: isActive ? tab.color : "#94A3B8", transition: "color 0.25s" }}
                      />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#0F172A" : "#64748B", lineHeight: 1.2 }}>
                        {tab.label}
                      </div>
                      <div style={{ fontSize: 10.5, color: isActive ? tab.color : "#94A3B8", fontWeight: 500, lineHeight: 1 }}>
                        {tab.desc}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${tab.color}, ${tab.color}99)`,
                        marginLeft: 2,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>
          <div className="content-fade-in" key={activeTab}>
            {activeTab === "general" && (
              <GeneralDashboard
                overview={overview}
                dateReg={dateReg}
                startDate={startDate}
                endDate={endDate}
                onDateChange={(nextStart, nextEnd) => {
                  setStartDate(nextStart);
                  setEndDate(nextEnd);
                }}
                loading={loading}
                error={error}
                onRefresh={fetchData}
                onGoToAdvanced={goToAdvanced}
                onGoToCustomReport={goToCustomReport}
              />
            )}
            {activeTab === "advanced" && (
              <AdvancedDashboard
                initialSection={advancedSection}
                onGoToCustomReport={goToCustomReport}
                onSectionRendered={() => setAdvancedSection(undefined)}
              />
            )}
            {activeTab === "custom" && <CustomReport initialCategory={customCategory} />}
          </div>
        </div>
      </div>
    </>
  );
}
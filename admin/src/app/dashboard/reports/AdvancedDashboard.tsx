"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AdminAdvancedDashboard.tsx  — PURE CSS, no Tailwind
//
// Owns its own data fetching. No props needed from page.tsx.
//
// API routes (backend adminreport.js):
//   GET /api/admin/reports/advanced  → getAdminAdvancedReportsuser
//   GET /api/admin/reports/sanghas   → getAdminSanghaReports
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  AreaChart, Area,
} from "recharts";
import {
  Users, GraduationCap, MapPin, Wallet, Shield, FileText,
  Home, AlertCircle, Sparkles, Filter, BookOpen, CheckCircle,
  ChevronRight, Building2, TrendingUp, Globe, Star,
  BarChart3, Clock, UserCheck, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Inline styles ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f4f6f9;
    --surface:   #ffffff;
    --border:    #e2e8f0;
    --border2:   #edf2f7;
    --text-1:    #111827;
    --text-2:    #374151;
    --text-3:    #6b7280;
    --text-4:    #9ca3af;
    --accent:    #4f46e5;
    --accent-lt: #eef2ff;
    --accent-md: #c7d2fe;
    --sky:       #0284c7;
    --sky-lt:    #e0f2fe;
    --teal:      #0d9488;
    --teal-lt:   #ccfbf1;
    --amber:     #d97706;
    --amber-lt:  #fef3c7;
    --rose:      #e11d48;
    --rose-lt:   #ffe4e6;
    --emerald:   #059669;
    --emerald-lt:#d1fae5;
    --violet:    #7c3aed;
    --violet-lt: #ede9fe;
    --orange:    #ea580c;
    --orange-lt: #fff7ed;
    --radius-sm: 8px;
    --radius:    12px;
    --radius-lg: 18px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --shadow:    0 4px 12px rgba(0,0,0,.08);
    --shadow-lg: 0 8px 24px rgba(0,0,0,.1);
    --font:      'DM Sans', sans-serif;
    --mono:      'DM Mono', monospace;
    --transition: 180ms ease;
  }

  body { font-family: var(--font); background: var(--bg); color: var(--text-1); }

  .adv-root { min-height: 100vh; background: var(--bg); }

  .adv-topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 14px 28px;
    position: sticky; top: 0; z-index: 30;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }

  .adv-topbar-title { font-size: 17px; font-weight: 800; color: var(--text-1); letter-spacing: -.4px; }
  .adv-topbar-sub   { font-size: 11px; color: var(--text-4); margin-top: 2px; }

  .adv-tab-group {
    display: flex; align-items: center; gap: 4px;
    background: var(--bg); border-radius: var(--radius); padding: 4px;
    border: 1px solid var(--border);
  }
  .adv-tab-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 18px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; background: transparent; color: var(--text-3);
    transition: all var(--transition);
  }
  .adv-tab-btn.active {
    background: var(--surface); color: var(--text-1);
    box-shadow: var(--shadow-sm);
  }
  .adv-tab-btn:hover:not(.active) { color: var(--text-2); }

  .adv-refresh-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: var(--radius-sm);
    font-size: 12px; font-weight: 600; cursor: pointer;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-3); transition: all var(--transition);
  }
  .adv-refresh-btn:hover { border-color: var(--accent-md); color: var(--accent); background: var(--accent-lt); }

  .adv-error-bar {
    display: flex; align-items: center; gap: 10px;
    border: 1px solid #fecaca; background: #fff5f5;
    border-radius: var(--radius); padding: 12px 18px;
    font-size: 13px; color: #b91c1c; margin: 16px 28px 0;
  }
  .adv-error-retry {
    margin-left: auto; font-size: 11px; font-weight: 600;
    color: #dc2626; text-decoration: underline; cursor: pointer; border: none; background: none;
  }

  .adv-body { max-width: 1600px; margin: 0 auto; padding: 28px; }

  .adv-flex { display: flex; gap: 0; }

  .adv-sidebar {
    display: none;
    width: 200px; flex-shrink: 0;
    flex-direction: column; gap: 2px;
    position: sticky; top: 76px; align-self: flex-start;
    padding-right: 20px;
  }
  @media (min-width: 1280px) { .adv-sidebar { display: flex; } }

  .adv-sidebar-label {
    font-size: 9px; font-weight: 700; color: var(--text-4);
    text-transform: uppercase; letter-spacing: .12em;
    margin-bottom: 8px; padding-left: 8px;
  }

  .adv-nav-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 10px; border-radius: var(--radius-sm);
    font-size: 11.5px; font-weight: 500; cursor: pointer;
    border: none; background: transparent; color: var(--text-3);
    text-align: left; transition: all var(--transition); width: 100%;
  }
  .adv-nav-btn:hover:not(.active) { background: var(--bg); color: var(--text-2); }
  .adv-nav-btn.active { background: var(--bg); color: var(--text-1); font-weight: 600; }
  .adv-nav-btn .nav-icon { flex-shrink: 0; width: 14px; height: 14px; }
  .adv-nav-btn .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adv-nav-btn .nav-arrow { margin-left: auto; flex-shrink: 0; width: 12px; height: 12px; color: var(--text-4); }

  .adv-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 40px; }

  .adv-section { scroll-margin-top: 90px; }

  .adv-banner {
    display: flex; align-items: center; gap: 10px;
    border-radius: var(--radius); padding: 12px 18px;
    font-size: 13px; color: var(--text-2);
  }
  .adv-banner.indigo { border: 1px solid var(--accent-md); background: var(--accent-lt); }
  .adv-banner.violet { border: 1px solid #c4b5fd; background: var(--violet-lt); }

  .adv-sec-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .adv-sec-icon { padding: 8px; border-radius: var(--radius-sm); background: var(--bg); display: flex; align-items: center; justify-content: center; }
  .adv-sec-title { font-size: 15px; font-weight: 800; color: var(--text-1); letter-spacing: -.3px; }
  .adv-sec-sub   { font-size: 11px; color: var(--text-4); margin-top: 2px; }

  .adv-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px;
    box-shadow: var(--shadow-sm);
  }
  .adv-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
  .adv-card-title { font-size: 13px; font-weight: 700; color: var(--text-1); }
  .adv-card-sub   { font-size: 11px; color: var(--text-4); margin-top: 2px; }
  .adv-card-badge {
    padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700;
    background: var(--accent-lt); color: var(--accent); border: 1px solid var(--accent-md);
    white-space: nowrap; flex-shrink: 0;
  }

  .kpi-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 18px;
    box-shadow: var(--shadow-sm);
  }
  .kpi-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .kpi-label { font-size: 11px; font-weight: 500; color: var(--text-4); }
  .kpi-value { font-size: 26px; font-weight: 900; color: var(--text-1); letter-spacing: -1px; font-family: var(--mono); }
  .kpi-sub   { font-size: 10px; color: var(--text-4); margin-top: 4px; }

  .hero-banner {
    border-radius: var(--radius-lg); padding: 24px;
    color: #fff; position: relative; overflow: hidden;
    box-shadow: var(--shadow-lg); margin-bottom: 20px;
  }
  .hero-banner::before {
    content: ''; position: absolute;
    width: 140px; height: 140px; border-radius: 50%;
    background: rgba(255,255,255,.08);
    top: -28px; right: -28px;
  }
  .hero-banner .hero-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; opacity: .7; margin-bottom: 6px; }
  .hero-banner .hero-num     { font-size: 52px; font-weight: 900; letter-spacing: -2px; font-family: var(--mono); line-height: 1; }
  .hero-banner .hero-row     { display: flex; align-items: center; gap: 24px; margin-top: 16px; flex-wrap: wrap; }
  .hero-banner .hero-stat-v  { font-size: 22px; font-weight: 800; font-family: var(--mono); }
  .hero-banner .hero-stat-l  { font-size: 10px; opacity: .65; margin-top: 2px; }
  .hero-banner .hero-divider { width: 1px; height: 36px; background: rgba(255,255,255,.2); }
  .hero-sky    { background: linear-gradient(135deg, #0ea5e9, #1d4ed8); }
  .hero-violet { background: linear-gradient(135deg, #7c3aed, #4338ca); }

  .grid-2  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
  .grid-4  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; }
  @media (max-width: 900px)  { .grid-2, .grid-4, .grid-2-1 { grid-template-columns: 1fr; } }
  @media (max-width: 1100px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }

  .asset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
  @media (max-width: 900px)  { .asset-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 1100px) { .asset-grid { grid-template-columns: repeat(3, 1fr); } }

  .asset-tile {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px; text-align: center;
    box-shadow: var(--shadow-sm);
  }
  .asset-tile-label { font-size: 11px; color: var(--text-3); font-weight: 500; margin-bottom: 12px; }
  .asset-ring { position: relative; width: 64px; height: 64px; margin: 0 auto; }
  .asset-ring svg { width: 64px; height: 64px; transform: rotate(-90deg); }
  .asset-ring-pct {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 900; color: var(--text-1); font-family: var(--mono);
  }
  .asset-tile-count  { font-size: 14px; font-weight: 800; color: var(--text-1); margin-top: 8px; font-family: var(--mono); }
  .asset-tile-total  { font-size: 10px; color: var(--text-4); margin-top: 2px; }

  .doc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
  @media (max-width: 900px)  { .doc-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 1100px) { .doc-grid { grid-template-columns: repeat(3, 1fr); } }

  .doc-tile {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px; text-align: center;
    box-shadow: var(--shadow-sm);
  }
  .doc-tile-label { font-size: 11px; color: var(--text-3); font-weight: 500; margin-bottom: 8px; }
  .doc-tile-pct   { font-size: 28px; font-weight: 900; color: var(--text-1); font-family: var(--mono); }
  .doc-tile-rows  { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
  .doc-tile-row   { display: flex; justify-content: space-between; font-size: 10px; font-weight: 600; }

  .gender-pills { display: flex; gap: 8px; margin-top: 6px; }
  .gender-pill { flex: 1; padding: 10px 8px; border-radius: var(--radius-sm); text-align: center; background: var(--bg); }
  .gender-pill-name  { font-size: 10px; color: var(--text-3); font-weight: 500; }
  .gender-pill-value { font-size: 18px; font-weight: 900; font-family: var(--mono); margin-top: 2px; }
  .gender-pill-pct   { font-size: 10px; color: var(--text-4); margin-top: 1px; }

  .ftype-pills { display: flex; gap: 10px; margin-top: 10px; }
  .ftype-pill { flex: 1; padding: 12px 8px; border-radius: var(--radius-sm); text-align: center; background: var(--bg); }
  .ftype-name  { font-size: 11px; font-weight: 600; }
  .ftype-pct   { font-size: 22px; font-weight: 900; font-family: var(--mono); margin-top: 3px; }
  .ftype-count { font-size: 10px; color: var(--text-4); margin-top: 2px; }

  .status-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
  .status-pill  {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg);
  }
  .status-pill-left { display: flex; align-items: center; gap: 7px; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .status-name  { font-size: 11px; color: var(--text-2); }
  .status-count { font-size: 11px; font-weight: 800; color: var(--text-1); font-family: var(--mono); }

  .geo-filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .geo-filter-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--surface);
    font-size: 12px; font-weight: 600; color: var(--text-2);
    cursor: pointer; transition: all var(--transition);
  }
  .geo-filter-btn:hover { border-color: var(--teal); background: var(--teal-lt); color: var(--teal); }
  .geo-filter-badge { background: var(--teal); color: #fff; font-size: 10px; font-weight: 700; border-radius: 20px; padding: 1px 7px; }
  .geo-dropdown {
    position: absolute; left: 0; top: calc(100% + 6px); z-index: 50;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
    width: 240px; max-height: 260px; overflow-y: auto; padding: 10px;
  }
  .geo-dropdown-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 8px; border-radius: var(--radius-sm);
    font-size: 12px; color: var(--text-2); cursor: pointer;
  }
  .geo-dropdown-item:hover { background: var(--bg); }
  .geo-dropdown-item input { accent-color: var(--teal); }
  .geo-dropdown-item-count { margin-left: auto; font-size: 10px; color: var(--text-4); background: var(--bg); border-radius: 20px; padding: 1px 7px; }
  .geo-clear { width: 100%; margin-top: 8px; padding: 7px; font-size: 11px; font-weight: 600; color: var(--rose); background: none; border: none; cursor: pointer; border-radius: var(--radius-sm); transition: background var(--transition); }
  .geo-clear:hover { background: var(--rose-lt); }
  .geo-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; border: 1px solid var(--teal-lt); background: var(--teal-lt); color: var(--teal); font-size: 11px; font-weight: 600; }
  .geo-chip-x { background: none; border: none; cursor: pointer; color: var(--teal); font-size: 13px; line-height: 1; }
  .geo-filter-wrap { position: relative; }

  .skeleton {
    border-radius: var(--radius-lg);
    background: linear-gradient(90deg, #e2e8f0 25%, #edf2f7 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .top-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .top-table thead tr { border-bottom: 1px solid var(--border2); }
  .top-table th { padding: 8px 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: var(--text-4); text-transform: uppercase; letter-spacing: .06em; }
  .top-table th.right { text-align: right; }
  .top-table th.center { text-align: center; }
  .top-table tbody tr { border-bottom: 1px solid var(--border2); transition: background var(--transition); }
  .top-table tbody tr:last-child { border-bottom: none; }
  .top-table tbody tr:hover { background: var(--bg); }
  .top-table td { padding: 9px 8px; vertical-align: middle; }
  .top-table td.right  { text-align: right; }
  .top-table td.center { text-align: center; }
  .top-table td.rank   { color: var(--text-4); font-weight: 700; font-family: var(--mono); font-size: 11px; }
  .top-table td.name   { font-weight: 700; color: var(--text-1); }
  .top-table td.loc    { color: var(--text-3); }
  .top-table td.total  { font-weight: 800; color: var(--text-1); font-family: var(--mono); }
  .top-table td.approved { font-weight: 800; font-family: var(--mono); color: #059669; }
  .status-chip { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }

  .no-data {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 48px 24px; color: var(--text-4); font-size: 13px;
    border: 1.5px dashed var(--border); border-radius: var(--radius-lg); background: var(--surface);
  }

  .insurance-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
  @media (max-width: 900px) { .insurance-grid { grid-template-columns: 1fr; } }

  .mt-4  { margin-top: 16px; }
  .mt-5  { margin-top: 20px; }

  .geo-dropdown::-webkit-scrollbar { width: 4px; }
  .geo-dropdown::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUserReport {
  totalApproved: number;
  totalPopulation: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  statusGenderBreakdown: Array<{ status: string; male: number; female: number; other: number }>;
  demographics: {
    gender: { male: number; female: number; other: number };
    ageGroups: Array<{ label: string; count: number }>;
    ageGroupsGender?: Array<{ label: string; male: number; female: number; other: number }>;
    familyType: { nuclear: number; joint: number };
    maritalStatus: Array<{ label: string; count: number }>;
    maritalStatusGender?: Array<{ label: string; male: number; female: number; other: number }>;
  };
  education: {
    degrees: Array<{ label: string; count: number }>;
    degreesGender?: Array<{ label: string; male: number; female: number; other: number }>;
    professions: Array<{ label: string; count: number }>;
    professionsGender?: Array<{ label: string; male: number; female: number; other: number }>;
    studying: { yes: number; no: number; maleYes?: number; femaleYes?: number; otherYes?: number; maleNo?: number; femaleNo?: number; otherNo?: number };
    working:  { yes: number; no: number; maleYes?: number; femaleYes?: number; otherYes?: number; maleNo?: number; femaleNo?: number; otherNo?: number };
    employmentGender?: Array<{ label: string; male: number; female: number; other: number }>;
    employment?: Array<{ label: string; count: number }>;
  };
  economic: {
    incomeSlabs: Array<{ label: string; count: number }>;
    assets: Array<{ label: string; owned: number; total: number }>;
    assetsGender?: Array<{ label: string; male: number; female: number; other: number }>;
    employmentGender?: Array<{ label: string; male: number; female: number; other: number }>;
    employment?: Array<{ label: string; count: number }>;
  };
  insurance: Array<{
    label: string; yes: number; no: number; unknown: number;
    maleYes?: number; femaleYes?: number; otherYes?: number;
    maleNo?: number; femaleNo?: number; otherNo?: number;
    maleUnknown?: number; femaleUnknown?: number; otherUnknown?: number;
  }>;
  documents: Array<{ label: string; yes: number; no: number; unknown: number }>;
  geographic: Array<{ city: string; count: number }>;
  geographicGender?: Array<{ city: string; male: number; female: number; other: number }>;
  religious?: {
    gotras?: Array<{ label: string; count: number }>;
    kuladevatas?: Array<{ label: string; count: number }>;
    pravaras?: Array<{ label: string; count: number }>;
    upanamaGenerals?: Array<{ label: string; count: number }>;
    upanamaPropers?: Array<{ label: string; count: number }>;
    demiGods?: Array<{ label: string; count: number }>;
    ancestralStats?: { withChallenge: number; withoutChallenge: number };
  };
}

export interface AdminSanghaReport {
  totalSanghas: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  stateDistribution: Array<{ state: string; count: number }>;
  districtDistribution: Array<{ district: string; count: number }>;
  sanghasByMemberCount: Array<{ sangha_name: string; member_count: number; approved_count: number; state: string }>;
  registrationTrend: Array<{ month: string; count: number }>;
  approvalTimeline: Array<{ date: string; approved: number; rejected: number; pending: number }>;
  topSanghas: Array<{ sangha_name: string; total_users: number; approved: number; state: string; district: string; status: string }>;
  completionRates: Array<{ sangha_name: string; avg_completion: number }>;
  profileStatusAcrossSanghas: { approved: number; rejected: number; submitted: number; draft: number; changes_requested: number };
  membershipGrowth: Array<{ month: string; new_sanghas: number; cumulative: number }>;
  sanghaContactStats: { withEmail: number; withPhone: number; withBoth: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GC = { male: "#0ea5e9", female: "#ec4899", other: "#94a3b8" };

const SANGHA_STATUS_COLORS: Record<string, string> = {
  approved: "#10b981", pending_approval: "#f59e0b", rejected: "#ef4444", draft: "#94a3b8",
};
const SANGHA_STATUS_LABELS: Record<string, string> = {
  approved: "Approved", pending_approval: "Pending", rejected: "Rejected", draft: "Draft",
};
const PROFILE_STATUS_COLORS: Record<string, string> = {
  approved: "#10b981", rejected: "#ef4444", submitted: "#f59e0b",
  changes_requested: "#f97316", draft: "#94a3b8",
};

const GEO_PALETTE   = ["#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#0891b2","#06b6d4","#22d3ee"];
const RELIG_PALETTE = ["#a855f7","#c084fc","#d8b4fe","#7c3aed","#6d28d9","#e879f9","#f0abfc","#581c87"];
const DEMI_PALETTE  = ["#f59e0b","#fbbf24","#fcd34d","#f97316","#fb923c","#fdba74","#d97706","#b45309"];
const STATE_PALETTE = ["#6366f1","#818cf8","#a5b4fc","#4f46e5","#7c3aed","#8b5cf6","#c4b5fd","#ddd6fe"];

const DEGREE_ORDER = [
  'High School','Pre-University','Diploma & Associate Degree',
  "Undergraduate / Bachelor's","Postgraduate / Master's",
  'Doctorate','Specialised Professional Degree',
];

const USER_NAV = [
  { id: "au-status",       label: "Status Overview",        icon: CheckCircle,   color: "#6366f1" },
  { id: "au-demographics", label: "Demographics",           icon: Users,         color: "#0ea5e9" },
  { id: "au-education",    label: "Education & Occupation", icon: GraduationCap, color: "#8b5cf6" },
  { id: "au-geographic",   label: "Geographic",             icon: MapPin,        color: "#14b8a6" },
  { id: "au-economic",     label: "Income",                 icon: Wallet,        color: "#f59e0b" },
  { id: "au-assets",       label: "Assets & Ownership",     icon: Home,          color: "#f97316" },
  { id: "au-insurance",    label: "Insurance",              icon: Shield,        color: "#14b8a6" },
  { id: "au-documents",    label: "Documentation",          icon: FileText,      color: "#f43f5e" },
  { id: "au-religious",    label: "Religious Details",      icon: BookOpen,      color: "#a855f7" },
];

const SANGHA_NAV = [
  { id: "as-overview",   label: "Sangha Overview",   icon: Building2,  color: "#6366f1" },
  { id: "as-status",     label: "Status Breakdown",  icon: CheckCircle,color: "#10b981" },
  { id: "as-geographic", label: "Geographic Spread", icon: Globe,      color: "#14b8a6" },
  { id: "as-members",    label: "Member Counts",     icon: Users,      color: "#0ea5e9" },
  { id: "as-profiles",   label: "Profile Analytics", icon: BarChart3,  color: "#8b5cf6" },
  { id: "as-growth",     label: "Growth Trends",     icon: TrendingUp, color: "#f59e0b" },
  { id: "as-top",        label: "Top Sanghas",       icon: Star,       color: "#f97316" },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: 120, ...style }} />;
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="grid-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} style={{ height: 110 }} />)}
      </div>
      <Skeleton style={{ height: 280 }} />
      <div className="grid-2">
        <Skeleton style={{ height: 220 }} />
        <Skeleton style={{ height: 220 }} />
      </div>
    </div>
  );
}

type TipProps = { active?: boolean; payload?: any[]; label?: string; total?: number };

const PieTip = ({ active, payload, total }: TipProps) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total && total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <p style={{ fontWeight: 700, color: "#111827" }}>{name}</p>
      <p style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
        {value.toLocaleString()} · <span style={{ color: "#4f46e5", fontWeight: 700 }}>{pct}%</span>
      </p>
    </div>
  );
};

const BarTip = ({ active, payload, label }: TipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
      <p style={{ fontWeight: 700, color: "#111827", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 11, color: p.fill || p.color, marginTop: 2 }}>
          {p.name}: <span style={{ fontWeight: 700, color: "#111827" }}>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

function Card({ title, subtitle, children, className = "", badge, style }: {
  title: string; subtitle?: string; children: React.ReactNode;
  className?: string; badge?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`adv-card ${className}`} style={style}>
      <div className="adv-card-head">
        <div>
          <div className="adv-card-title">{title}</div>
          {subtitle && <div className="adv-card-sub">{subtitle}</div>}
        </div>
        {badge && <span className="adv-card-badge">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color = "#6366f1", icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: any;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon style={{ width: 16, height: 16, color }} />}
      </div>
      <div className="kpi-value">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function GenderBar({ data, height = 220 }: { data: { label: string; male: number; female: number; other?: number }[]; height?: number }) {
  if (!data?.length) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>;
  const hasOther = data.some(d => (d.other ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<BarTip />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GC.male}   stackId="g" radius={[0,0,4,4]} />
        <Bar dataKey="female" name="Female" fill={GC.female} stackId="g" radius={hasOther ? [0,0,0,0] : [4,4,0,0]} />
        {hasOther && <Bar dataKey="other" name="Other" fill={GC.other} stackId="g" radius={[4,4,0,0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function GenderBarV({ data, height = 260 }: { data: { label: string; male: number; female: number; other?: number }[]; height?: number }) {
  if (!data?.length) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>;
  const hasOther = data.some(d => (d.other ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={185} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarTip />} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        <Bar dataKey="male"   name="Male"   fill={GC.male}   stackId="g" />
        <Bar dataKey="female" name="Female" fill={GC.female} stackId="g" radius={hasOther ? [0,0,0,0] : [0,4,4,0]} />
        {hasOther && <Bar dataKey="other" name="Other" fill={GC.other} stackId="g" radius={[0,4,4,0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimpleBar({ data, palette, height = 220 }: { data: { label: string; count: number }[]; palette: string[]; height?: number }) {
  if (!data?.length) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ left: 8, right: 30, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <Tooltip content={<BarTip />} />
        <Bar dataKey="count" name="Count" radius={[0,6,6,0]}>
          {data.map((_: any, i: number) => <Cell key={i} fill={palette[i % palette.length]} />)}
          <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── UserTab (unchanged render logic) ────────────────────────────────────────
function UserTab({ data, loading }: { data: AdminUserReport | null; loading: boolean }) {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("au-status");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveNav(visible[0].target.id);
      },
      { threshold: 0.2, rootMargin: "-80px 0px -60% 0px" }
    );
    USER_NAV.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [data]);

  const filteredGeo = useMemo(() => {
    if (!data?.geographic) return [];
    const sorted = [...data.geographic].sort((a, b) => b.count - a.count);
    if (selectedCities.length === 0) return sorted.slice(0, 8);
    return sorted.filter(g => selectedCities.includes(g.city));
  }, [data, selectedCities]);

  if (loading) return <LoadingState />;
  if (!data) return (
    <div className="no-data">
      <AlertCircle style={{ width: 36, height: 36, opacity: .4 }} />
      <span>User analytics unavailable.</span>
    </div>
  );

  const { demographics: dem, education: edu, economic: eco } = data;
  const total = data.totalApproved;

  const STATUS_LABELS: Record<string, string> = {
    approved: "Approved", rejected: "Rejected", submitted: "Submitted",
    under_review: "Under Review", changes_requested: "Changes Req.", draft: "Draft",
  };
  const statusGenderBarData = (data.statusGenderBreakdown || []).map(s => ({
    label: STATUS_LABELS[s.status] ?? s.status,
    male: s.male || 0, female: s.female || 0, other: s.other || 0,
  }));

  const genderTotal = dem.gender.male + dem.gender.female + dem.gender.other;
  const genderData = [
    { name: "Male",   value: dem.gender.male,   color: GC.male   },
    { name: "Female", value: dem.gender.female, color: GC.female },
    { name: "Other",  value: dem.gender.other,  color: GC.other  },
  ].filter(x => x.value > 0);

  const ftTotal = (dem.familyType.nuclear + dem.familyType.joint) || 1;
  const ftData  = [
    { name: "Nuclear", value: dem.familyType.nuclear, color: "#10b981" },
    { name: "Joint",   value: dem.familyType.joint,   color: "#8b5cf6" },
  ].filter(x => x.value > 0);

  const ageGenderData = (dem.ageGroupsGender || []).map((a: any) => ({ label: a.label, male: a.male || 0, female: a.female || 0, other: a.other || 0 }));
  const ageBarData = ageGenderData.length > 0 ? ageGenderData : dem.ageGroups.map((a: any) => ({ label: a.label, male: a.count, female: 0, other: 0 }));

  const maritalGenderData = (dem.maritalStatusGender || []).map((m: any) => ({ label: m.label, male: m.male || 0, female: m.female || 0, other: m.other || 0 }));
  const maritalBarData = maritalGenderData.length > 0 ? maritalGenderData : dem.maritalStatus.map((m: any) => ({ label: m.label, male: m.count, female: 0, other: 0 }));

  const rawDegreesGender = (edu.degreesGender || []).map((d: any) => ({ label: d.label, male: d.male || 0, female: d.female || 0, other: d.other || 0 }));
  const degreeMap = new Map(rawDegreesGender.map((d: any) => [d.label, d]));
  const degreesBarData = DEGREE_ORDER.map(label => degreeMap.get(label) ?? { label, male: 0, female: 0, other: 0 });

  const professionGenderData = (edu.professionsGender || []).map((p: any) => ({ label: p.label, male: p.male || 0, female: p.female || 0, other: p.other || 0 }));
  const professionBarData = professionGenderData.length > 0 ? professionGenderData : (edu.professions || []).map((p: any) => ({ label: p.label, male: p.count, female: 0, other: 0 }));

  const studyingBarData = [
    { label: "Studying — Yes", male: edu.studying.maleYes || 0, female: edu.studying.femaleYes || 0, other: edu.studying.otherYes || 0 },
    { label: "Studying — No",  male: edu.studying.maleNo  || 0, female: edu.studying.femaleNo  || 0, other: edu.studying.otherNo  || 0 },
  ];
  const workingBarData = [
    { label: "Working — Yes", male: edu.working.maleYes || 0, female: edu.working.femaleYes || 0, other: edu.working.otherYes || 0 },
    { label: "Working — No",  male: edu.working.maleNo  || 0, female: edu.working.femaleNo  || 0, other: edu.working.otherNo  || 0 },
  ];

  const assetsGenderData = (eco.assetsGender || []).map((a: any) => ({ label: a.label, male: a.male || 0, female: a.female || 0, other: a.other || 0 }));
  const employmentGenderData = (eco.employmentGender || []).map((e: any) => ({ label: e.label, male: e.male || 0, female: e.female || 0, other: e.other || 0 }));
  const employmentBarData = employmentGenderData.length > 0 ? employmentGenderData : (eco.employment || []).map((e: any) => ({ label: e.label, male: e.count, female: 0, other: 0 }));

  const geoGenderData = (data.geographicGender || [])
    .filter((g: any) => selectedCities.length === 0 || selectedCities.includes(g.city))
    .sort((a: any, b: any) => (b.male + b.female) - (a.male + a.female))
    .slice(0, selectedCities.length > 0 ? undefined : 8)
    .map((g: any) => ({ label: g.city, male: g.male || 0, female: g.female || 0, other: g.other || 0 }));

  const docCompare = data.documents.map(d => ({ name: d.label, Yes: d.yes, No: d.no, Unknown: d.unknown }));

  const religious      = data.religious || {};
  const gotraData      = (religious.gotras          || []).slice(0, 10);
  const kuldevData     = (religious.kuladevatas     || []).slice(0, 10);
  const pravaraData    = (religious.pravaras        || []).slice(0, 10);
  const upanamaGenData = (religious.upanamaGenerals || []).slice(0, 20);
  const upanaPropData  = (religious.upanamaPropers  || []).slice(0, 20);
  const demiGodData    = (religious.demiGods        || []).slice(0, 25);

  return (
    <div className="adv-flex">
      <aside className="adv-sidebar">
        <p className="adv-sidebar-label">Sections</p>
        {USER_NAV.map(sec => {
          const Icon = sec.icon;
          const isActive = activeNav === sec.id;
          return (
            <button key={sec.id} className={`adv-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => { document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveNav(sec.id); }}>
              <Icon className="nav-icon" style={{ color: isActive ? sec.color : undefined }} />
              <span className="nav-label">{sec.label}</span>
              {isActive && <ChevronRight className="nav-arrow" />}
            </button>
          );
        })}
      </aside>

      <div className="adv-content">
        <div className="adv-banner indigo">
          <Sparkles style={{ width: 16, height: 16, color: "#4f46e5", flexShrink: 0 }} />
          <span>Platform-wide user analytics — <strong style={{ color: "#4f46e5" }}>all approved profiles across every sangha.</strong></span>
        </div>

        <section className="adv-section" id="au-status">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><CheckCircle style={{ width: 18, height: 18, color: "#6366f1" }} /></div>
            <div><div className="adv-sec-title">Status Overview</div><div className="adv-sec-sub">Registration status breakdown across the platform</div></div>
          </div>
          {statusGenderBarData.length > 0 ? (
            <Card title="Status by Gender" subtitle="Male (blue) · Female (pink)">
              <GenderBar data={statusGenderBarData} height={200} />
            </Card>
          ) : (
            <div className="adv-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#111827", fontFamily: "var(--mono)" }}>{data.totalApproved.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Approved profiles</div>
            </div>
          )}
        </section>

        <section className="adv-section" id="au-demographics">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Users style={{ width: 18, height: 18, color: "#0ea5e9" }} /></div>
            <div><div className="adv-sec-title">Population & Demographics</div><div className="adv-sec-sub">All-platform gender, age, family type</div></div>
          </div>
          <div className="hero-banner hero-sky">
            <div className="hero-eyebrow">Total Platform Population</div>
            <div className="hero-num">{(data.totalPopulation || 0).toLocaleString()}</div>
            <div className="hero-row">
              <div className="hero-stat">
                <div className="hero-stat-v">{total.toLocaleString()}</div>
                <div className="hero-stat-l">Registered Users</div>
              </div>
              <div className="hero-divider" />
              <div className="hero-stat">
                <div className="hero-stat-v">{Math.max(0, (data.totalPopulation || 0) - total).toLocaleString()}</div>
                <div className="hero-stat-l">Family Members</div>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <Card title="Gender Distribution" subtitle="Male · Female · Other">
              {genderData.length === 0 ? (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No gender data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                        {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={(props) => <PieTip {...props} total={genderTotal} />} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="gender-pills">
                    {genderData.map(d => (
                      <div key={d.name} className="gender-pill">
                        <div className="gender-pill-name">{d.name}</div>
                        <div className="gender-pill-value" style={{ color: d.color }}>{d.value.toLocaleString()}</div>
                        <div className="gender-pill-pct">{genderTotal > 0 ? Math.round(d.value / genderTotal * 100) : 0}%</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
            <Card title="Family Type" subtitle="Nuclear vs Joint families">
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={ftData} cx="50%" cy="50%" innerRadius={35} outerRadius={48} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                    {ftData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={(props) => <PieTip {...props} total={ftTotal} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ftype-pills">
                {ftData.map(d => (
                  <div key={d.name} className="ftype-pill">
                    <div className="ftype-name" style={{ color: d.color }}>{d.name}</div>
                    <div className="ftype-pct" style={{ color: d.color }}>{Math.round(d.value / ftTotal * 100)}%</div>
                    <div className="ftype-count">{d.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card title="Age Group Distribution" subtitle="Male · Female · Other" style={{ marginTop: 18 }}>
            <GenderBar data={ageBarData} height={200} />
          </Card>
          {maritalBarData.length > 0 && (
            <Card title="Marital Status" subtitle="Male · Female" style={{ marginTop: 18 }}>
              <GenderBar data={maritalBarData} height={160} />
            </Card>
          )}
        </section>

        <section className="adv-section" id="au-education">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><GraduationCap style={{ width: 18, height: 18, color: "#8b5cf6" }} /></div>
            <div><div className="adv-sec-title">Education & Occupation</div><div className="adv-sec-sub">All 7 degree levels, professions, study/work status</div></div>
          </div>
          <div className="grid-2">
            <Card title="Highest Degree Level" subtitle="All 7 levels — Male · Female">
              <GenderBarV data={degreesBarData} height={Math.max(280, DEGREE_ORDER.length * 38)} />
            </Card>
            <Card title="Profession Breakdown" subtitle="Male · Female">
              <GenderBarV data={professionBarData} height={Math.max(220, professionBarData.length * 32)} />
            </Card>
          </div>
          <div className="grid-2 mt-5">
            <Card title="Currently Studying" subtitle="Male · Female">
              <GenderBar data={studyingBarData} height={150} />
            </Card>
            <Card title="Currently Working" subtitle="Male · Female">
              <GenderBar data={workingBarData} height={150} />
            </Card>
          </div>
        </section>

        <section className="adv-section" id="au-geographic">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><MapPin style={{ width: 18, height: 18, color: "#14b8a6" }} /></div>
            <div><div className="adv-sec-title">Geographic Distribution</div><div className="adv-sec-sub">Cities, pincodes, districts</div></div>
          </div>
          <div className="geo-filter-bar">
            <div className="geo-filter-wrap" ref={filterRef}>
              <button className="geo-filter-btn" onClick={() => setFilterOpen(p => !p)}>
                <Filter style={{ width: 14, height: 14 }} />
                Filter Cities
                {selectedCities.length > 0 && <span className="geo-filter-badge">{selectedCities.length}</span>}
              </button>
              {filterOpen && (
                <div className="geo-dropdown">
                  {data.geographic.map(g => (
                    <label key={g.city} className="geo-dropdown-item">
                      <input type="checkbox" checked={selectedCities.includes(g.city)}
                        onChange={() => setSelectedCities(prev => prev.includes(g.city) ? prev.filter(c => c !== g.city) : [...prev, g.city])} />
                      <span style={{ flex: 1, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.city}</span>
                      <span className="geo-dropdown-item-count">{g.count}</span>
                    </label>
                  ))}
                  {selectedCities.length > 0 && (
                    <button className="geo-clear" onClick={() => setSelectedCities([])}>Clear selection</button>
                  )}
                </div>
              )}
            </div>
            {selectedCities.map(city => (
              <span key={city} className="geo-chip">
                <span style={{ textTransform: "capitalize" }}>{city}</span>
                <button className="geo-chip-x" onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}>×</button>
              </span>
            ))}
          </div>
          <Card title={selectedCities.length === 0 ? "Top Cities by Family Count" : `${selectedCities.length} Cities Selected`} subtitle="Male · Female — geographic spread">
            {geoGenderData.length > 0 ? (
              <GenderBar data={geoGenderData} height={260} />
            ) : filteredGeo.length === 0 ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filteredGeo} margin={{ top: 20, right: 24, left: -16, bottom: 4 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="city" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => typeof v === "string" ? (v.length > 12 ? v.slice(0, 11) + "…" : v) : v} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="count" radius={[8,8,0,0]} maxBarSize={72} name="Families">
                    {filteredGeo.map((_e, idx) => <Cell key={idx} fill={GEO_PALETTE[idx % GEO_PALETTE.length]} />)}
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0d9488" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>

        <section className="adv-section" id="au-economic">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Wallet style={{ width: 18, height: 18, color: "#f59e0b" }} /></div>
            <div><div className="adv-sec-title">Family Annual Income</div><div className="adv-sec-sub">Household income distribution</div></div>
          </div>
          {eco.incomeSlabs.length === 0 ? (
            <div className="no-data"><span>No income data</span></div>
          ) : (
            <Card title="Family Income Distribution" subtitle="Annual household income brackets">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={eco.incomeSlabs} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="count" name="Families" radius={[6,6,0,0]}>
                    {eco.incomeSlabs.map((_, i) => <Cell key={i} fill={`hsl(${42 + i * 5}, 90%, ${55 - i * 2}%)`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </section>

        <section className="adv-section" id="au-assets">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Home style={{ width: 18, height: 18, color: "#f97316" }} /></div>
            <div><div className="adv-sec-title">Assets & Ownership</div><div className="adv-sec-sub">Land, House, Vehicles, Renting</div></div>
          </div>
          <div className="asset-grid">
            {eco.assets.map(asset => {
              const pct = asset.total > 0 ? Math.round((asset.owned / asset.total) * 100) : 0;
              const circ = 2 * Math.PI * 15.9;
              return (
                <div key={asset.label} className="asset-tile">
                  <div className="asset-tile-label">{asset.label}</div>
                  <div className="asset-ring">
                    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f97316" strokeWidth="3.5"
                        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" />
                    </svg>
                    <div className="asset-ring-pct">{pct}%</div>
                  </div>
                  <div className="asset-tile-count">{asset.owned.toLocaleString()}</div>
                  <div className="asset-tile-total">of {asset.total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          <Card title="Asset Ownership by Gender" style={{ marginTop: 18 }}>
            {assetsGenderData.length > 0 ? (
              <GenderBar data={assetsGenderData} height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={eco.assets.map(a => ({ name: a.label, "Owned %": a.total > 0 ? Math.round(a.owned / a.total * 100) : 0 }))} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" domain={[0,100]} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="Owned %" fill="#f97316" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          {employmentBarData.length > 0 && (
            <Card title="Employment Sector Breakdown" subtitle="Male · Female — Govt, Private, Self-Employed" style={{ marginTop: 18 }}>
              <GenderBar data={employmentBarData} height={200} />
            </Card>
          )}
        </section>

        <section className="adv-section" id="au-insurance">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Shield style={{ width: 18, height: 18, color: "#14b8a6" }} /></div>
            <div><div className="adv-sec-title">Insurance Coverage</div><div className="adv-sec-sub">Term, Life, Health, Konkani Card — by gender</div></div>
          </div>
          {data.insurance.length > 0 ? (
            <div className="insurance-grid">
              {data.insurance.map(ins => {
                const chartData = [
                  { status: "Yes",     Male: (ins as any).maleYes     || 0, Female: (ins as any).femaleYes     || 0, Other: (ins as any).otherYes     || 0 },
                  { status: "No",      Male: (ins as any).maleNo      || 0, Female: (ins as any).femaleNo      || 0, Other: (ins as any).otherNo      || 0 },
                  { status: "Unknown", Male: (ins as any).maleUnknown || 0, Female: (ins as any).femaleUnknown || 0, Other: (ins as any).otherUnknown || 0 },
                ];
                return (
                  <Card key={ins.label} title={ins.label} subtitle="Male · Female · Other — by coverage status">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 4 }} barCategoryGap="30%" barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="Male"   fill={GC.male}   radius={[4,4,0,0]} maxBarSize={28} />
                        <Bar dataKey="Female" fill={GC.female} radius={[4,4,0,0]} maxBarSize={28} />
                        <Bar dataKey="Other"  fill={GC.other}  radius={[4,4,0,0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="no-data"><span>No insurance data</span></div>
          )}
        </section>

        <section className="adv-section" id="au-documents">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><FileText style={{ width: 18, height: 18, color: "#f43f5e" }} /></div>
            <div><div className="adv-sec-title">Documentation Status</div><div className="adv-sec-sub">Aadhaar, PAN, Voter ID, Land Records, DL</div></div>
          </div>
          {data.documents.length > 0 ? (
            <>
              <div className="doc-grid">
                {data.documents.map(doc => {
                  const t = (doc.yes + doc.no + doc.unknown) || 1;
                  const pct = Math.round(doc.yes / t * 100);
                  return (
                    <div key={doc.label} className="doc-tile">
                      <div className="doc-tile-label">{doc.label}</div>
                      <div className="doc-tile-pct">{pct}%</div>
                      <div className="doc-tile-rows">
                        <div className="doc-tile-row"><span style={{ color: "#22c55e" }}>Yes</span><span style={{ color: "#22c55e" }}>{doc.yes}</span></div>
                        <div className="doc-tile-row"><span style={{ color: "#ef4444" }}>No</span><span style={{ color: "#ef4444" }}>{doc.no}</span></div>
                        <div className="doc-tile-row"><span style={{ color: "#94a3b8" }}>?</span><span style={{ color: "#94a3b8" }}>{doc.unknown}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Card title="Document Verification Comparison" subtitle="Yes / No / Unknown" style={{ marginTop: 18 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={docCompare} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                    <Bar dataKey="Yes"     fill="#22c55e" radius={[4,4,0,0]} stackId="a" />
                    <Bar dataKey="No"      fill="#ef4444"                    stackId="a" />
                    <Bar dataKey="Unknown" fill="#cbd5e1" radius={[0,0,4,4]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          ) : (
            <div className="no-data"><span>No document data</span></div>
          )}
        </section>

        <section className="adv-section" id="au-religious">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><BookOpen style={{ width: 18, height: 18, color: "#a855f7" }} /></div>
            <div><div className="adv-sec-title">Religious Details</div><div className="adv-sec-sub">Gotra, Kuladevata, Pravara, Upanama, Demi Gods</div></div>
          </div>
          {!gotraData.length && !kuldevData.length && !upanamaGenData.length && !demiGodData.length ? (
            <div className="no-data"><span>No religious data</span></div>
          ) : (
            <>
              <div className="grid-2">
                {gotraData.length > 0 && (
                  <Card title="Gotras" subtitle="Most common gotras">
                    <SimpleBar data={gotraData} palette={RELIG_PALETTE} height={Math.max(220, gotraData.length * 30)} />
                  </Card>
                )}
                {kuldevData.length > 0 && (
                  <Card title="Kuladevata Distribution" subtitle="Family deity distribution">
                    <SimpleBar data={kuldevData} palette={RELIG_PALETTE.slice(3)} height={Math.max(220, kuldevData.length * 30)} />
                  </Card>
                )}
              </div>
              {pravaraData.length > 0 && (
                <Card title="Pravara Distribution" subtitle="Pravara lineages" style={{ marginTop: 18 }}>
                  <SimpleBar data={pravaraData} palette={RELIG_PALETTE.slice(5)} height={Math.max(220, pravaraData.length * 30)} />
                </Card>
              )}
              {(upanamaGenData.length > 0 || upanaPropData.length > 0) && (
                <div className="grid-2 mt-5">
                  {upanamaGenData.length > 0 && (
                    <Card title="Upanama (General)" subtitle="General upanama distribution">
                      <SimpleBar data={upanamaGenData} palette={["#6366f1","#818cf8","#a5b4fc","#4f46e5","#7c3aed","#8b5cf6"]} height={Math.max(220, upanamaGenData.length * 28)} />
                    </Card>
                  )}
                  {upanaPropData.length > 0 && (
                    <Card title="Upanama (Proper)" subtitle="Proper clan name distribution">
                      <SimpleBar data={upanaPropData} palette={["#0891b2","#06b6d4","#22d3ee","#0e7490","#155e75","#164e63"]} height={Math.max(220, upanaPropData.length * 28)} />
                    </Card>
                  )}
                </div>
              )}
              {demiGodData.length > 0 && (
                <Card title="Demi God (Daiva) Distribution" subtitle="Family ancestral demi gods worshipped" style={{ marginTop: 18 }}>
                  <SimpleBar data={demiGodData} palette={DEMI_PALETTE} height={Math.max(260, demiGodData.length * 32)} />
                </Card>
              )}
              {religious.ancestralStats && ((religious.ancestralStats.withChallenge || 0) + (religious.ancestralStats.withoutChallenge || 0) > 0) && (
                <Card title="Ancestral Challenge Breakdown" subtitle="Families with / without ancestral challenges" style={{ marginTop: 18 }}>
                  <div className="grid-2">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={[
                          { name: "With Challenge",    value: religious.ancestralStats!.withChallenge    || 0, color: "#f43f5e" },
                          { name: "Without Challenge", value: religious.ancestralStats!.withoutChallenge || 0, color: "#10b981" },
                        ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="#fff">
                          {[{ color: "#f43f5e" }, { color: "#10b981" }].map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={(props) => <PieTip {...props} total={(religious.ancestralStats?.withChallenge || 0) + (religious.ancestralStats?.withoutChallenge || 0)} />} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
                      {[
                        { label: "With Challenge",    val: religious.ancestralStats!.withChallenge,    bg: "var(--rose-lt)",    color: "#e11d48" },
                        { label: "Without Challenge", val: religious.ancestralStats!.withoutChallenge, bg: "var(--emerald-lt)", color: "#059669" },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-sm)", background: row.bg }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: row.color }}>{row.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: row.color, fontFamily: "var(--mono)" }}>{(row.val || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── SanghaTab (unchanged render logic) ──────────────────────────────────────
function SanghaTab({ data, loading }: { data: AdminSanghaReport | null; loading: boolean }) {
  const [activeNav, setActiveNav] = useState("as-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveNav(visible[0].target.id);
      },
      { threshold: 0.2, rootMargin: "-80px 0px -60% 0px" }
    );
    SANGHA_NAV.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [data]);

  if (loading) return <LoadingState />;
  if (!data) return (
    <div className="no-data">
      <AlertCircle style={{ width: 36, height: 36, opacity: .4 }} />
      <span>Sangha analytics unavailable.</span>
    </div>
  );

  const statusTotal     = data.statusBreakdown.reduce((s, r) => s + r.count, 0) || 1;
  const approvedSanghas = data.statusBreakdown.find(s => s.status === 'approved')?.count || 0;
  const pendingSanghas  = data.statusBreakdown.find(s => s.status === 'pending_approval')?.count || 0;

  const profileStatusTotal = Object.values(data.profileStatusAcrossSanghas || {}).reduce((a, b) => a + b, 0) || 1;
  const profilePieData = Object.entries(data.profileStatusAcrossSanghas || {}).map(([k, v]) => ({
    name: ({ approved: "Approved", rejected: "Rejected", submitted: "Submitted", draft: "Draft", changes_requested: "Changes Req." }[k] ?? k),
    value: v as number,
    color: PROFILE_STATUS_COLORS[k] ?? "#94a3b8",
  })).filter(d => d.value > 0);

  const contactPieData = [
    { name: "Email & Phone", value: data.sanghaContactStats?.withBoth    || 0, color: "#6366f1" },
    { name: "Email Only",    value: (data.sanghaContactStats?.withEmail   || 0) - (data.sanghaContactStats?.withBoth || 0), color: "#0ea5e9" },
    { name: "Phone Only",    value: (data.sanghaContactStats?.withPhone   || 0) - (data.sanghaContactStats?.withBoth || 0), color: "#10b981" },
  ].filter(d => d.value > 0);
  const contactTotal = contactPieData.reduce((a, d) => a + d.value, 0) || 1;

  return (
    <div className="adv-flex">
      <aside className="adv-sidebar">
        <p className="adv-sidebar-label">Sections</p>
        {SANGHA_NAV.map(sec => {
          const Icon = sec.icon;
          const isActive = activeNav === sec.id;
          return (
            <button key={sec.id} className={`adv-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => { document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveNav(sec.id); }}>
              <Icon className="nav-icon" style={{ color: isActive ? sec.color : undefined }} />
              <span className="nav-label">{sec.label}</span>
              {isActive && <ChevronRight className="nav-arrow" />}
            </button>
          );
        })}
      </aside>

      <div className="adv-content">
        <div className="adv-banner violet">
          <Building2 style={{ width: 16, height: 16, color: "#7c3aed", flexShrink: 0 }} />
          <span>Platform sangha analytics — <strong style={{ color: "#7c3aed" }}>all registered sanghas and their performance metrics.</strong></span>
        </div>

        <section className="adv-section" id="as-overview">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Building2 style={{ width: 18, height: 18, color: "#6366f1" }} /></div>
            <div><div className="adv-sec-title">Sangha Overview</div><div className="adv-sec-sub">Platform-wide counts and key metrics</div></div>
          </div>
          <div className="hero-banner hero-violet">
            <div className="hero-eyebrow">Total Sanghas on Platform</div>
            <div className="hero-num">{data.totalSanghas.toLocaleString()}</div>
            <div className="hero-row">
              <div className="hero-stat">
                <div className="hero-stat-v">{approvedSanghas.toLocaleString()}</div>
                <div className="hero-stat-l">Approved</div>
              </div>
              <div className="hero-divider" />
              <div className="hero-stat">
                <div className="hero-stat-v">{pendingSanghas.toLocaleString()}</div>
                <div className="hero-stat-l">Pending</div>
              </div>
              <div className="hero-divider" />
              <div className="hero-stat">
                <div className="hero-stat-v">{approvedSanghas > 0 ? Math.round(approvedSanghas / data.totalSanghas * 100) : 0}%</div>
                <div className="hero-stat-l">Approval Rate</div>
              </div>
            </div>
          </div>
          <div className="grid-4">
            <KpiCard label="Total Sanghas"    value={data.totalSanghas}                    icon={Building2} color="#6366f1" sub="registered on platform" />
            <KpiCard label="Approved"          value={approvedSanghas}                      icon={UserCheck} color="#10b981" sub="active sanghas" />
            <KpiCard label="Pending Approval"  value={pendingSanghas}                       icon={Clock}     color="#f59e0b" sub="awaiting review" />
            <KpiCard label="States Covered"    value={data.stateDistribution?.length || 0}  icon={Globe}     color="#0ea5e9" sub="unique states" />
          </div>
        </section>

        <section className="adv-section" id="as-status">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><CheckCircle style={{ width: 18, height: 18, color: "#10b981" }} /></div>
            <div><div className="adv-sec-title">Status Breakdown</div><div className="adv-sec-sub">Distribution of sangha approval statuses</div></div>
          </div>
          <div className="grid-2">
            <Card title="Sangha Status Distribution" subtitle="Approval pipeline">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.statusBreakdown.map(s => ({ name: SANGHA_STATUS_LABELS[s.status] ?? s.status, value: s.count }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                    {data.statusBreakdown.map((s, i) => <Cell key={i} fill={SANGHA_STATUS_COLORS[s.status] ?? "#94a3b8"} />)}
                  </Pie>
                  <Tooltip content={(props) => <PieTip {...props} total={statusTotal} />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="status-pills">
                {data.statusBreakdown.map(s => (
                  <div key={s.status} className="status-pill">
                    <div className="status-pill-left">
                      <span className="status-dot" style={{ background: SANGHA_STATUS_COLORS[s.status] ?? "#94a3b8" }} />
                      <span className="status-name">{SANGHA_STATUS_LABELS[s.status] ?? s.status}</span>
                    </div>
                    <span className="status-count">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Contact Information Coverage" subtitle="Sanghas with email / phone / both">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contactPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                    {contactPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={(props) => <PieTip {...props} total={contactTotal} />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ftype-pills" style={{ marginTop: 14 }}>
                {contactPieData.map(d => (
                  <div key={d.name} className="ftype-pill" style={{ fontSize: 10 }}>
                    <div className="ftype-name" style={{ color: d.color, fontSize: 10 }}>{d.name}</div>
                    <div className="ftype-pct" style={{ color: d.color, fontSize: 18 }}>{d.value}</div>
                    <div className="ftype-count">{Math.round(d.value / contactTotal * 100)}%</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="adv-section" id="as-geographic">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Globe style={{ width: 18, height: 18, color: "#14b8a6" }} /></div>
            <div><div className="adv-sec-title">Geographic Spread</div><div className="adv-sec-sub">State and district distribution of sanghas</div></div>
          </div>
          <div className="grid-2">
            <Card title="Sanghas by State" subtitle="Top states" badge={`${data.stateDistribution?.length || 0} states`}>
              <SimpleBar data={(data.stateDistribution || []).slice(0, 12).map(r => ({ label: r.state || "Unknown", count: r.count }))} palette={STATE_PALETTE} height={Math.max(220, Math.min((data.stateDistribution?.length || 0), 12) * 34)} />
            </Card>
            <Card title="Sanghas by District" subtitle="Top districts" badge={`${data.districtDistribution?.length || 0} districts`}>
              <SimpleBar data={(data.districtDistribution || []).slice(0, 12).map(r => ({ label: r.district || "Unknown", count: r.count }))} palette={GEO_PALETTE} height={Math.max(220, Math.min((data.districtDistribution?.length || 0), 12) * 34)} />
            </Card>
          </div>
        </section>

        <section className="adv-section" id="as-members">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><Users style={{ width: 18, height: 18, color: "#0ea5e9" }} /></div>
            <div><div className="adv-sec-title">Member Counts per Sangha</div><div className="adv-sec-sub">Registered vs approved members per sangha</div></div>
          </div>
          <Card title="Top Sanghas by Member Count" subtitle="Total registered & approved profiles">
            <ResponsiveContainer width="100%" height={Math.max(260, Math.min((data.sanghasByMemberCount || []).length, 15) * 36)}>
              <BarChart data={(data.sanghasByMemberCount || []).slice(0, 15).map(s => ({ label: s.sangha_name.length > 20 ? s.sangha_name.slice(0, 18) + "…" : s.sangha_name, "Total": s.member_count, "Approved": s.approved_count }))} layout="vertical" margin={{ left: 8, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="label" type="category" width={155} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<BarTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Bar dataKey="Total"    fill="#bfdbfe" stackId="s" />
                <Bar dataKey="Approved" fill="#0ea5e9" stackId="s" radius={[0,4,4,0]}>
                  <LabelList dataKey="Approved" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#0369a1" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="adv-section" id="as-profiles">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><BarChart3 style={{ width: 18, height: 18, color: "#8b5cf6" }} /></div>
            <div><div className="adv-sec-title">Profile Analytics Across Sanghas</div><div className="adv-sec-sub">Approval rate, completion, status distribution platform-wide</div></div>
          </div>
          <div className="grid-2">
            <Card title="Profile Status Platform-Wide" subtitle="All profiles across all sanghas">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={profilePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                    {profilePieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={(props) => <PieTip {...props} total={profileStatusTotal} />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="status-pills" style={{ marginTop: 14 }}>
                {profilePieData.map(d => (
                  <div key={d.name} className="status-pill">
                    <div className="status-pill-left">
                      <span className="status-dot" style={{ background: d.color }} />
                      <span className="status-name">{d.name}</span>
                    </div>
                    <span className="status-count">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
            {(data.completionRates || []).length > 0 && (
              <Card title="Average Profile Completion" subtitle="By sangha — top 10">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(data.completionRates || []).slice(0, 10).map(s => ({ label: s.sangha_name.length > 18 ? s.sangha_name.slice(0, 16) + "…" : s.sangha_name, "Completion %": Math.round(s.avg_completion) }))} layout="vertical" margin={{ left: 8, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTip />} />
                    <Bar dataKey="Completion %" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {(data.completionRates || []).slice(0, 10).map((_: any, i: number) => <Cell key={i} fill={`hsl(${260 + i * 8}, 70%, ${55 + i * 2}%)`} />)}
                      <LabelList dataKey="Completion %" position="right" style={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }} formatter={(v: unknown) => `${Number(v)}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </section>

        <section className="adv-section" id="as-growth">
          <div className="adv-sec-header">
            <div className="adv-sec-icon"><TrendingUp style={{ width: 18, height: 18, color: "#f59e0b" }} /></div>
            <div><div className="adv-sec-title">Growth Trends</div><div className="adv-sec-sub">Sangha registrations over time</div></div>
          </div>
          <div className="grid-2">
            {(data.registrationTrend || []).length > 0 && (
              <Card title="Monthly Sangha Registrations" subtitle="New sanghas registered per month">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.registrationTrend} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<BarTip />} />
                    <Area type="monotone" dataKey="count" name="New Sanghas" stroke="#6366f1" strokeWidth={2} fill="url(#colorReg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
            {(data.membershipGrowth || []).length > 0 && (
              <Card title="Cumulative Sangha Growth" subtitle="Total sanghas on platform over time">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.membershipGrowth} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<BarTip />} />
                    <Area type="monotone" dataKey="cumulative"  name="Total Sanghas" stroke="#10b981" strokeWidth={2} fill="url(#colorCum)" />
                    <Area type="monotone" dataKey="new_sanghas" name="New"           stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        </section>

        {(data.topSanghas || []).length > 0 && (
          <section className="adv-section" id="as-top">
            <div className="adv-sec-header">
              <div className="adv-sec-icon"><Star style={{ width: 18, height: 18, color: "#f97316" }} /></div>
              <div><div className="adv-sec-title">Top Sanghas</div><div className="adv-sec-sub">Sanghas by total registered users</div></div>
            </div>
            <Card title="Sangha Leaderboard" subtitle="By total registered profiles" badge={`Top ${Math.min((data.topSanghas || []).length, 20)}`}>
              <div style={{ overflowX: "auto" }}>
                <table className="top-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>#</th>
                      <th>Sangha Name</th><th>State</th><th>District</th>
                      <th className="right">Total</th>
                      <th className="right" style={{ color: "#059669" }}>Approved</th>
                      <th className="center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topSanghas || []).slice(0, 20).map((s, i) => (
                      <tr key={i}>
                        <td className="rank">{i + 1}</td>
                        <td className="name">{s.sangha_name}</td>
                        <td className="loc">{s.state || "—"}</td>
                        <td className="loc">{s.district || "—"}</td>
                        <td className="right total">{s.total_users.toLocaleString()}</td>
                        <td className="right approved">{s.approved.toLocaleString()}</td>
                        <td className="center">
                          <span className="status-chip" style={{ background: (SANGHA_STATUS_COLORS[s.status] ?? "#94a3b8") + "20", color: SANGHA_STATUS_COLORS[s.status] ?? "#94a3b8" }}>
                            {SANGHA_STATUS_LABELS[s.status] ?? s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT — owns all fetching, no props needed
// ═══════════════════════════════════════════════════════════
export default function AdminAdvancedDashboard() {
  const [activeTab,    setActiveTab]    = useState<"users" | "sanghas">("users");
  const [userReport,   setUserReport]   = useState<AdminUserReport | null>(null);
  const [sanghaReport, setSanghaReport] = useState<AdminSanghaReport | null>(null);
  const [userLoading,  setUserLoading]  = useState(false);
  const [sanghaLoading,setSanghaLoading]= useState(false);
  const [userError,    setUserError]    = useState<string | null>(null);
  const [sanghaError,  setSanghaError]  = useState<string | null>(null);

  // ── Stable fetch functions — no external dependencies ────────────────────
  // useRef to hold the latest setter refs so useCallback has no deps
  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const data = await api.get('/api/admin/reports/advanced');
      setUserReport(data);
    } catch (e: any) {
      setUserError(e.message ?? "Failed to load user report");
    } finally {
      setUserLoading(false);
    }
  }, []); // ← empty deps: function identity is stable forever

  const loadSanghas = useCallback(async () => {
    setSanghaLoading(true);
    setSanghaError(null);
    try {
      const data = await api.get('/api/admin/reports/sanghas');
      setSanghaReport(data);
    } catch (e: any) {
      setSanghaError(e.message ?? "Failed to load sangha report");
    } finally {
      setSanghaLoading(false);
    }
  }, []); // ← empty deps: function identity is stable forever

  // ── Load users once on mount ──────────────────────────────────────────────
  useEffect(() => {
    loadUsers();
  }, [loadUsers]); // loadUsers is stable — this runs exactly once

  // ── Load sanghas only when sangha tab is first opened ────────────────────
  // Use a ref to track whether we've already kicked off the sangha load,
  // so we never trigger it more than once regardless of render cycles.
  const sanghaLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab === "sanghas" && !sanghaLoadedRef.current) {
      sanghaLoadedRef.current = true;
      loadSanghas();
    }
  }, [activeTab, loadSanghas]); // loadSanghas is stable — safe in deps

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="adv-root">
        {/* Top bar */}
        <div className="adv-topbar">
          <div>
            <div className="adv-topbar-title">Advanced Analytics</div>
            <div className="adv-topbar-sub">Platform-wide insights — users &amp; sanghas</div>
          </div>

          <div className="adv-tab-group">
            {([
              { id: "users",   label: "Users",   Icon: Users     },
              { id: "sanghas", label: "Sanghas", Icon: Building2 },
            ] as const).map(tab => (
              <button key={tab.id} className={`adv-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}>
                <tab.Icon style={{ width: 15, height: 15 }} />
                {tab.label}
              </button>
            ))}
          </div>

          <button className="adv-refresh-btn"
            onClick={() => {
              if (activeTab === "users") {
                loadUsers();
              } else {
                // Allow manual re-fetch on refresh even after first load
                loadSanghas();
              }
            }}>
            <RefreshCw style={{ width: 13, height: 13 }} />
            Refresh
          </button>
        </div>

        {/* Error banners */}
        {activeTab === "users" && userError && (
          <div className="adv-error-bar">
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {userError}
            <button className="adv-error-retry" onClick={loadUsers}>Retry</button>
          </div>
        )}
        {activeTab === "sanghas" && sanghaError && (
          <div className="adv-error-bar">
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {sanghaError}
            <button className="adv-error-retry" onClick={loadSanghas}>Retry</button>
          </div>
        )}

        {/* Tab content */}
        <div className="adv-body">
          {activeTab === "users"   && <UserTab   data={userReport}   loading={userLoading}   />}
          {activeTab === "sanghas" && <SanghaTab data={sanghaReport} loading={sanghaLoading} />}
        </div>
      </div>
    </>
  );
}
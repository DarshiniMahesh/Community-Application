//Community-Application\admin\src\app\dashboard\adminscholarship\page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Search, Filter, ChevronDown, ChevronRight, ChevronLeft,
  Users, BookOpen, MapPin, Tag, Building2, CheckCircle2,
  XCircle, Clock, Eye, X, Loader2, GraduationCap,
  IndianRupee, Calendar, AlertCircle, FileText,
  Banknote, ListChecks, Minus, User, Award, ClipboardList,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface SanghaInfo { id: string; name: string; state: string; district: string; logo: string | null; }
interface ScholarshipStats { totalApplicants: number; approved: number; rejected: number; pending: number; }
interface Scholarship {
  id: string; title: string; description: string; category: string; categoryColor: string;
  amount: number; seats: number | null; deadline: string; applicationStart: string | null;
  disbursementDate: string | null; state: string; district: string; status: string;
  createdAt: string; eligibility: string[]; eligibilityCount: number;
  sangha: SanghaInfo; stats: ScholarshipStats;
}
interface ScholarshipTier { id: string; label: string; amount: number; condition: string | null; sortOrder: number; }
interface ScholarshipDetailExtra {
  tiers: ScholarshipTier[]; categoryColor: string; applicationStart: string | null;
  disbursementDate: string | null; seatsFilled: number; eligibilityCount: number;
}
interface Applicant {
  applicationId: string;
  status: string;
  appliedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  approvalNotes: string | null;
  familyMemberId: string | null;
  familyMemberName: string | null;
  familyMemberRelation: string | null;
  profileId: string;
  user: {
    id: string; fullName: string; email: string; phone: string;
    state: string; district: string; profilePhoto: string | null;
    caste: string | null; annualIncome: number | null; educationLevel: string | null; age: number | null;
  };
}
interface Sangha {
  id: string; name: string; state: string; district: string; logo: string | null;
  totalScholarships: number; activeScholarships: number;
}
interface Pagination { total: number; page: number; limit: number; totalPages: number; }
interface CategoryMeta { name: string; color: string; }

// Full detail types
interface ApplicantDetail {
  applicantType: "self" | "family_member";
  data: SelfDetail | FamilyMemberDetail;
}
interface SelfDetail {
  personal: {
    firstName: string; middleName: string; lastName: string; fullName: string;
    gender: string; dateOfBirth: string; maritalStatus: string; fathersName: string;
    mothersName: string; mothersMaidenName: string; wifeName: string; wifeMaidenName: string;
    husbandsName: string; surnameInUse: string; surnameAsPerGotra: string;
    hasDisability: string; photoUrl: string | null;
  };
  contact: { email: string; phone: string; };
  religious: {
    gotra: string; pravara: string; kuladevata: string; surnameInUse: string;
    surnameAsPerGotra: string; priestName: string; priestLocation: string;
    upanamaGeneral: string; upanamaProper: string; demiGods: string[];
    demiGodOther: string; ancestralChallenge: string; ancestralChallengeNotes: string;
  } | null;
  addresses: AddressItem[];
  education: EducationDetail | null;
  economic: EconomicDetail | null;
  insurance: InsuranceDetail | null;
  documents: DocumentDetail | null;
  sanghas: { sangha_name: string; role: string; tenure: string; status: string; }[];
}
interface FamilyMemberDetail {
  name: string; relation: string; age: number | null; dob: string | null;
  gender: string; disability: string; status: string; photoUrl: string | null;
  education: EducationDetail | null;
  insurance: InsuranceDetail | null;
  documents: DocumentDetail | null;
}
interface AddressItem {
  type: string; flatNo: string; building: string; street: string; landmark: string;
  area: string; city: string; taluk: string; district: string; state: string;
  pincode: string; country: string;
}
interface EducationDetail {
  highestEducation: string; briefProfile: string; professionType: string;
  professionOther: string; selfEmployedType: string; selfEmployedOther: string;
  industry: string; isCurrentlyStudying: boolean; isCurrentlyWorking: boolean;
  degrees: { degree_name: string; degree_type: string; university: string; start_date: string; end_date: string; certificate: string; }[];
  languages: { language: string; language_other?: string; }[];
}
interface EconomicDetail {
  selfIncome: string; familyIncome: string;
  facilities: { rentedHouse: boolean; ownHouse: boolean; agriculturalLand: boolean; twoWheeler: boolean; car: boolean; };
  investments: { fixedDeposits: boolean; mutualFunds: boolean; sharesDemat: boolean; others: boolean; };
}
interface InsuranceDetail {
  healthCoverage: string[]; lifeCoverage: string[]; termCoverage: string[]; konkaniCardCoverage: string[];
}
interface DocumentDetail {
  aadhaarCoverage: string; panCoverage: string; voterIdCoverage: string;
  landDocCoverage: string; dlCoverage: string;
}

// Scholarship history (applied / benefitted tabs)
interface ScholarshipHistoryRecord {
  applicationId: string;
  status: string;
  appliedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  approvalNotes: string | null;
  scholarship: {
    id: string;
    title: string;
    amount: number | null;
    disbursementDate: string | null;
    deadline: string | null;
    status: string;
  };
  sangha: {
    id: string; name: string; state: string; district: string; logo: string | null;
  };
}
interface ScholarshipHistoryMeta {
  type: "applied" | "benefitted";
  year: number | null;
  availableYears: number[];
  currentYear: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`;
const STATUS_TABS = ["all", "approved", "rejected", "pending"] as const;
const DETAIL_TABS = [
  { key: "info", label: "Info", icon: User },
  { key: "applied", label: "Applied Scholarships", icon: ClipboardList },
  { key: "benefitted", label: "Benefitted Scholarships", icon: Award },
] as const;
type DetailTabKey = (typeof DETAIL_TABS)[number]["key"];

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes aFadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes aFadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes aShimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes aSpin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes aDrawerIn  { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
  @keyframes aOverlayIn { from{opacity:0} to{opacity:1} }
  @keyframes aModalIn   { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes aPulse     { 0%,100%{opacity:1} 50%{opacity:0.45} }
  .a-fade-up  { animation:aFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .a-card     { transition:transform 0.22s ease,box-shadow 0.22s ease,border-color 0.18s ease; }
  .a-card:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.05); }
  .a-spin     { animation:aSpin 1s linear infinite; }
  .a-shimmer  { background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:400px 100%;animation:aShimmer 1.4s infinite; }
  .a-pulse    { animation:aPulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
  .a-btn      { transition:all 0.18s ease;position:relative;overflow:hidden; }
  .a-btn::after { content:'';position:absolute;inset:0;background:rgba(255,255,255,0);transition:background 0.15s; }
  .a-btn:hover:not(:disabled)::after { background:rgba(255,255,255,0.12); }
  .a-btn:active:not(:disabled) { transform:scale(0.97); }
  input,textarea,select,button { font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { width:6px;height:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(100,116,139,0.25);border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(100,116,139,0.4); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  white: "#ffffff", orange50: "#fff7ed", orange100: "#ffedd5", orange200: "#fed7aa",
  orange400: "#fb923c", orange500: "#f97316", orange600: "#ea580c", orange700: "#c2410c",
  brick: "#c2410c", gray50: "#f9fafb", gray100: "#f3f4f6", gray200: "#e5e7eb",
  gray400: "#9ca3af", gray500: "#6b7280", gray600: "#4b5563", gray700: "#374151",
  gray800: "#1f2937", green50: "#f0fdf4", green100: "#dcfce7", green500: "#22c55e",
  green600: "#16a34a", green700: "#15803d", red50: "#fef2f2", red100: "#fee2e2",
  red400: "#f87171", red500: "#ef4444", red600: "#dc2626", yellow50: "#fefce8",
  yellow100: "#fef9c3", yellow500: "#eab308", yellow700: "#a16207",
  blue50: "#eff6ff", blue100: "#dbeafe", blue600: "#2563eb", blue700: "#1d4ed8",
  purple50: "#faf5ff", purple100: "#f3e8ff", purple600: "#9333ea", purple700: "#7e22ce",
  black: "#000000",
};

function statusCfg(status: string) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    approved:  { label: "Approved",  bg: C.green100,  color: C.green700,  border: "#bbf7d0" },
    rejected:  { label: "Rejected",  bg: C.red100,    color: C.red600,    border: "#fecaca" },
    pending:   { label: "Pending",   bg: C.yellow100, color: C.yellow700, border: "#fef08a" },
    submitted: { label: "Submitted", bg: C.blue100,   color: C.blue700,   border: "#bfdbfe" },
    active:    { label: "Active",    bg: C.green50,   color: C.green700,  border: "#bbf7d0" },
    closed:    { label: "Closed",    bg: C.red50,     color: C.red600,    border: "#fecaca" },
    draft:     { label: "Draft",     bg: C.gray100,   color: C.gray500,   border: C.gray200 },
  };
  return map[status] ?? { label: status, bg: C.gray100, color: C.gray500, border: C.gray200 };
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return width;
}

interface HoverBtnProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  baseStyle: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
  disabledStyle?: React.CSSProperties;
}
function HoverBtn({ baseStyle, hoverStyle = {}, disabledStyle = {}, disabled, children, onMouseEnter, onMouseLeave, ...rest }: HoverBtnProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button {...rest} disabled={disabled}
      style={{ ...baseStyle, ...(hovered && !disabled ? hoverStyle : {}), ...(disabled ? disabledStyle : {}) }}
      onMouseEnter={e => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={e => { setHovered(false); onMouseLeave?.(e); }}
    >{children}</button>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const { label, bg, color, border } = statusCfg(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 9999,
      fontSize: 11, fontWeight: 600,
      border: `1px solid ${border}`, backgroundColor: bg, color,
    }}>{label}</span>
  );
};

function PageBtn({ num, current, onClick }: { num: number; current: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const active = num === current;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, fontSize: 14, fontWeight: 500, borderRadius: 8,
        border: "none", cursor: "pointer",
        backgroundColor: active ? C.orange500 : hovered ? C.orange50 : "transparent",
        color: active ? C.white : hovered ? C.orange600 : C.gray600,
        boxShadow: active ? "0 1px 3px rgba(249,115,22,0.3)" : "none",
      }}
    >{num}</button>
  );
}

function CollapsedSanghaBtn({ sangha, active, onClick }: { sangha: Sangha; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button title={sangha.name} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", justifyContent: "center",
        padding: 8, borderRadius: 12, border: "none", cursor: "pointer",
        backgroundColor: active ? C.orange500 : hovered ? C.orange50 : "transparent",
        transition: "background-color 0.15s",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, backgroundColor: C.orange100,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {sangha.logo
          ? <img src={sangha.logo} alt={sangha.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Building2 size={14} style={{ color: C.orange500 }} />}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: format address object to string
// ─────────────────────────────────────────────────────────────────────────────
function formatAddressObj(a: AddressItem): string {
  return [a.flatNo, a.building, a.street, a.landmark, a.area, a.city, a.taluk, a.district, a.state, a.pincode, a.country]
    .filter(Boolean).join(", ");
}

function formatDate(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAddrType(t: string): string {
  if (t === "current") return "Current Address";
  if (t === "hometown") return "Hometown Address";
  if (t.startsWith("old_")) return `Previous Address ${t.replace("old_", "")}`;
  return t;
}

function formatProfession(p: string): string {
  const map: Record<string, string> = {
    self_employed: "Self Employed or Business",
    stem: "Science, Technology, Engineering & Mathematics",
    healthcare: "Healthcare & Medicine",
    business: "Business & Management",
    law: "Law & Governance",
    education: "Education & Research",
    arts_media: "Arts, Media & Communication",
    trades: "Trades & Vocational Professions",
    agriculture: "Agriculture & Others",
  };
  return map[p] || p;
}

function formatMarital(s: string): string {
  const map: Record<string, string> = {
    single_never_married: "Single (Never Married)", married: "Married",
    single_divorced: "Single / Divorced", single_widowed: "Single / Widowed",
  };
  return map[s] || s;
}

function formatMemberStatus(s: string): string {
  if (s === "active") return "Active";
  if (s === "passed_away") return "Passed Away";
  if (s === "unknown") return "Unknown";
  return s;
}

// scalar doc coverage helper
function covScalar(val: unknown): boolean | null {
  if (val === "yes") return true;
  if (val === "no") return false;
  if (Array.isArray(val)) return val.length > 0;
  return null;
}

// array insurance coverage helper
function covArray(val: unknown): boolean | null {
  if (!Array.isArray(val)) return null;
  return val.length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL FIELD components
// ─────────────────────────────────────────────────────────────────────────────
function DField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.gray800 }}>{value}</span>
    </div>
  );
}

function YesNoBadgeEl({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
        border: "1px dashed #d1d5db", color: C.gray400, fontStyle: "italic",
      }}>
        <Minus size={10} /> Not Set
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600,
      border: `1px solid ${value ? "#bbf7d0" : "#fecaca"}`,
      backgroundColor: value ? C.green50 : C.red50,
      color: value ? C.green700 : C.red600,
    }}>
      {value ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {value ? "Yes" : "No"}
    </span>
  );
}

function CovRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
      <span style={{ fontSize: 12, color: C.gray600 }}>{label}</span>
      <YesNoBadgeEl value={value} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: C.gray400,
      textTransform: "uppercase", letterSpacing: "0.1em",
      padding: "0 0 8px", borderBottom: `1px solid ${C.gray100}`,
      marginBottom: 14,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT INFO TAB — the original full-profile detail rendering
// ─────────────────────────────────────────────────────────────────────────────
function ApplicantInfoTab({
  detail, loading, error,
}: {
  detail: ApplicantDetail | null; loading: boolean; error: string | null;
}) {
  const isSelf = detail?.applicantType === "self";
  const selfData = isSelf ? (detail?.data as SelfDetail) : null;
  const fmData = !isSelf ? (detail?.data as FamilyMemberDetail) : null;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12 }}>
        <Loader2 size={28} className="a-spin" style={{ color: C.orange500 }} />
        <span style={{ fontSize: 14, color: C.gray500 }}>Loading applicant details…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12, color: C.red600 }}>
        <AlertCircle size={28} />
        <span style={{ fontSize: 14 }}>{error}</span>
      </div>
    );
  }
  if (!detail) return null;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── FAMILY MEMBER VIEW ── */}
      {!isSelf && fmData && (
        <>
          {/* Basic Info */}
          <div>
            <SectionTitle>Basic Information</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <DField label="Name" value={fmData.name} />
              <DField label="Relation" value={fmData.relation} />
              <DField label="Gender" value={fmData.gender ? fmData.gender.charAt(0).toUpperCase() + fmData.gender.slice(1) : null} />
              <DField label="Date of Birth" value={formatDate(fmData.dob)} />
              {!fmData.dob && fmData.age != null && <DField label="Age" value={`${fmData.age} years`} />}
              <DField label="Status" value={fmData.status ? formatMemberStatus(fmData.status) : null} />
              <DField label="Disability" value={fmData.disability === "yes" ? "Yes" : fmData.disability === "no" ? "No" : null} />
            </div>
          </div>

          {/* Education */}
          {fmData.education && (
            <div>
              <SectionTitle>Education & Profession</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 14 }}>
                <DField label="Highest Education" value={fmData.education.highestEducation} />
                <DField label="Profession" value={fmData.education.professionType ? formatProfession(fmData.education.professionType) : null} />
                <DField label="Industry" value={fmData.education.industry} />
                <DField label="Currently Studying" value={fmData.education.isCurrentlyStudying ? "Yes" : "No"} />
                <DField label="Currently Working" value={fmData.education.isCurrentlyWorking ? "Yes" : "No"} />
                {fmData.education.briefProfile && <DField label="Brief Profile" value={fmData.education.briefProfile} />}
              </div>

              {fmData.education.degrees.filter(d => d.degree_type).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Degrees</span>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {fmData.education.degrees.filter(d => d.degree_type).map((d, i) => (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray100}`, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{d.degree_type}</span>
                        {d.degree_name && <span style={{ color: C.gray500, marginLeft: 8 }}>{d.degree_name}</span>}
                        {d.university && <span style={{ color: C.gray500, marginLeft: 8 }}>· {d.university}</span>}
                        {d.start_date && d.end_date && (
                          <span style={{ color: C.gray400, fontSize: 11, marginLeft: 8 }}>{formatDate(d.start_date)} – {formatDate(d.end_date)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fmData.education.languages.length > 0 && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Languages</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {fmData.education.languages.map((l, i) => (
                      <span key={i} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: C.orange50, color: C.orange700, border: `1px solid ${C.orange200}` }}>
                        {l.language === "Other" ? l.language_other : l.language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Insurance */}
          {fmData.insurance && (
            <div>
              <SectionTitle>Insurance</SectionTitle>
              <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <CovRow label="Health Insurance" value={covArray(fmData.insurance.healthCoverage)} />
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Life Insurance" value={covArray(fmData.insurance.lifeCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Term Insurance" value={covArray(fmData.insurance.termCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Konkani Card" value={covArray(fmData.insurance.konkaniCardCoverage)} /></div>
              </div>
            </div>
          )}

          {/* Documents */}
          {fmData.documents && (
            <div>
              <SectionTitle>Documents</SectionTitle>
              <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <CovRow label="Aadhaar Card" value={covScalar(fmData.documents.aadhaarCoverage)} />
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="PAN Card" value={covScalar(fmData.documents.panCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Voter ID" value={covScalar(fmData.documents.voterIdCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Land Documents" value={covScalar(fmData.documents.landDocCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Driving License" value={covScalar(fmData.documents.dlCoverage)} /></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SELF VIEW ── */}
      {isSelf && selfData && (
        <>
          {/* Personal */}
          <div>
            <SectionTitle>Personal Details</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <DField label="Full Name" value={selfData.personal.fullName} />
              <DField label="Gender" value={selfData.personal.gender ? selfData.personal.gender.charAt(0).toUpperCase() + selfData.personal.gender.slice(1) : null} />
              <DField label="Date of Birth" value={formatDate(selfData.personal.dateOfBirth)} />
              <DField label="Marital Status" value={selfData.personal.maritalStatus ? formatMarital(selfData.personal.maritalStatus) : null} />
              <DField label="Father's Name" value={selfData.personal.fathersName} />
              <DField label="Mother's Name" value={selfData.personal.mothersName} />
              <DField label="Mother's Maiden Name" value={selfData.personal.mothersMaidenName} />
              {selfData.personal.wifeName && <DField label="Wife's Name" value={selfData.personal.wifeName} />}
              {selfData.personal.wifeMaidenName && <DField label="Wife's Maiden Name" value={selfData.personal.wifeMaidenName} />}
              {selfData.personal.husbandsName && <DField label="Husband's Name" value={selfData.personal.husbandsName} />}
              <DField label="Surname in Use" value={selfData.personal.surnameInUse} />
              <DField label="Surname as per Gotra" value={selfData.personal.surnameAsPerGotra} />
              <DField label="Disability" value={
                selfData.personal.hasDisability === "yes" || selfData.personal.hasDisability === "true" ? "Yes" : "No"
              } />
            </div>
          </div>

          {/* Contact */}
          <div>
            <SectionTitle>Contact</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              <DField label="Email" value={selfData.contact.email} />
              <DField label="Phone" value={selfData.contact.phone} />
            </div>
          </div>

          {/* Religious */}
          {selfData.religious && (
            <div>
              <SectionTitle>Religious Details</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 12 }}>
                <DField label="Gotra" value={selfData.religious.gotra} />
                <DField label="Pravara" value={selfData.religious.pravara} />
                <DField label="Kuladevata" value={selfData.religious.kuladevata} />
                <DField label="Surname in Use" value={selfData.religious.surnameInUse} />
                <DField label="Surname as per Gotra" value={selfData.religious.surnameAsPerGotra} />
                <DField label="Family Priest" value={selfData.religious.priestName} />
                <DField label="Priest Location" value={selfData.religious.priestLocation} />
                <DField label="Upanama (General)" value={selfData.religious.upanamaGeneral} />
                <DField label="Upanama (Proper)" value={selfData.religious.upanamaProper} />
                <DField label="Ancestral Challenge"
                  value={selfData.religious.ancestralChallenge === "yes" ? "Yes" : selfData.religious.ancestralChallenge === "no" ? "No" : null}
                />
                {selfData.religious.ancestralChallenge === "yes" && (
                  <DField label="Ancestral Notes" value={selfData.religious.ancestralChallengeNotes} />
                )}
              </div>
              {selfData.religious.demiGods.filter(d => d !== "Other").length > 0 && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Demi Gods</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {[
                      ...selfData.religious.demiGods.filter(d => d !== "Other"),
                      ...(selfData.religious.demiGodOther
                        ? selfData.religious.demiGodOther.split(",").map(s => s.trim()).filter(Boolean)
                        : []),
                    ].map((g, i) => (
                      <span key={i} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: C.purple50, color: C.purple700, border: `1px solid ${C.purple100}` }}>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          {selfData.addresses.length > 0 && (
            <div>
              <SectionTitle>Addresses</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selfData.addresses.map((a, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray100}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.orange600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {formatAddrType(a.type)}
                    </div>
                    <div style={{ fontSize: 13, color: C.gray700, lineHeight: 1.5 }}>{formatAddressObj(a)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {selfData.education && (
            <div>
              <SectionTitle>Education & Profession</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 14 }}>
                <DField label="Highest Education" value={selfData.education.highestEducation} />
                <DField label="Profession" value={selfData.education.professionType ? formatProfession(selfData.education.professionType) : null} />
                <DField label="Industry" value={selfData.education.industry} />
                <DField label="Currently Studying" value={selfData.education.isCurrentlyStudying ? "Yes" : "No"} />
                <DField label="Currently Working" value={selfData.education.isCurrentlyWorking ? "Yes" : "No"} />
                {selfData.education.briefProfile && <DField label="Brief Profile" value={selfData.education.briefProfile} />}
              </div>

              {selfData.education.degrees.filter(d => d.degree_type).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Degrees</span>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {selfData.education.degrees.filter(d => d.degree_type).map((d, i) => (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: C.white, border: `1px solid ${C.gray100}`, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{d.degree_type}</span>
                        {d.degree_name && <span style={{ color: C.gray500, marginLeft: 8 }}>{d.degree_name}</span>}
                        {d.university && <span style={{ color: C.gray500, marginLeft: 8 }}>· {d.university}</span>}
                        {d.start_date && d.end_date && (
                          <span style={{ color: C.gray400, fontSize: 11, marginLeft: 8 }}>{formatDate(d.start_date)} – {formatDate(d.end_date)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selfData.education.languages.length > 0 && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em" }}>Languages</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {selfData.education.languages.map((l, i) => (
                      <span key={i} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: C.orange50, color: C.orange700, border: `1px solid ${C.orange200}` }}>
                        {l.language === "Other" ? l.language_other : l.language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Economic */}
          {selfData.economic && (
            <div>
              <SectionTitle>Economic Details</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray100}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Self Income</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{selfData.economic.selfIncome || "—"}</div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray100}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Family Income</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{selfData.economic.familyIncome || "—"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Facilities</span>
                  <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                    <CovRow label="Rented House" value={selfData.economic.facilities.rentedHouse ?? null} />
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Own House" value={selfData.economic.facilities.ownHouse ?? null} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Agricultural Land" value={selfData.economic.facilities.agriculturalLand ?? null} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Two Wheeler" value={selfData.economic.facilities.twoWheeler ?? null} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Car" value={selfData.economic.facilities.car ?? null} /></div>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Investments</span>
                  <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                    <CovRow label="Fixed Deposits" value={selfData.economic.investments.fixedDeposits ?? null} />
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Mutual Funds / SIP" value={selfData.economic.investments.mutualFunds ?? null} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Shares / Demat" value={selfData.economic.investments.sharesDemat ?? null} /></div>
                    <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Others" value={selfData.economic.investments.others ?? null} /></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insurance */}
          {selfData.insurance && (
            <div>
              <SectionTitle>Insurance</SectionTitle>
              <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <CovRow label="Health Insurance" value={covArray(selfData.insurance.healthCoverage)} />
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Life Insurance" value={covArray(selfData.insurance.lifeCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Term Insurance" value={covArray(selfData.insurance.termCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Konkani Card" value={covArray(selfData.insurance.konkaniCardCoverage)} /></div>
              </div>
            </div>
          )}

          {/* Documents */}
          {selfData.documents && (
            <div>
              <SectionTitle>Documents</SectionTitle>
              <div style={{ borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <CovRow label="Aadhaar Card" value={covScalar(selfData.documents.aadhaarCoverage)} />
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="PAN Card" value={covScalar(selfData.documents.panCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Voter ID" value={covScalar(selfData.documents.voterIdCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Land Documents" value={covScalar(selfData.documents.landDocCoverage)} /></div>
                <div style={{ borderTop: `1px solid ${C.gray100}` }}><CovRow label="Driving License" value={covScalar(selfData.documents.dlCoverage)} /></div>
              </div>
            </div>
          )}

          {/* Sangha memberships */}
          {selfData.sanghas.length > 0 && (
            <div>
              <SectionTitle>Sangha Memberships</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selfData.sanghas.map((sg, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: C.white, border: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{sg.sangha_name}</div>
                      {sg.role && <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{sg.role}{sg.tenure ? ` · ${sg.tenure}` : ""}</div>}
                    </div>
                    <StatusBadge status={sg.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOLARSHIP HISTORY TAB — shared by "Applied" and "Benefitted" tabs.
// Fetches /admin/applications/:applicationId/scholarship-history
// "applied"     -> all statuses, filterable by year, defaults to current year
// "benefitted"  -> approved only, defaults to showing all years
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipHistoryTab({
  applicationId, type,
}: {
  applicationId: string; type: "applied" | "benefitted";
}) {
  const currentYear = new Date().getFullYear();
  const [records, setRecords] = useState<ScholarshipHistoryRecord[]>([]);
  const [meta, setMeta] = useState<ScholarshipHistoryMeta | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | "all">(
    type === "applied" ? currentYear : "all"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const load = useCallback(async (yearParam: number | "all") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(
        `${API_BASE}/admin/applications/${applicationId}/scholarship-history`,
        { params: { type, year: yearParam }, headers: getAuthHeaders() }
      );
      if (data.success) {
        setRecords(data.data);
        setMeta(data.meta);
      } else {
        setError("Failed to load scholarship history.");
      }
    } catch {
      setError("Failed to load scholarship history. Please try again.");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [applicationId, type]);

  // Initial load: applied tab defaults to current year, benefitted defaults to all years
  useEffect(() => {
    load(type === "applied" ? currentYear : "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, type]);

  const handleYearChange = (val: string) => {
    const next: number | "all" = val === "all" ? "all" : Number(val);
    setSelectedYear(next);
    load(next);
  };

  // Build the year options list: years that actually have data, plus the
  // current year (so the selector always offers it even with zero records yet).
  const yearOptions = (() => {
    const years = new Set<number>(meta?.availableYears || []);
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  })();

  const accentColor = type === "applied" ? C.orange500 : C.green600;

  return (
    <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Year filter row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: C.gray500 }}>
          {type === "applied"
            ? "Showing scholarships this applicant has applied to."
            : "Showing scholarships this applicant has been approved for."}
        </div>
        <div style={{ position: "relative" }}>
          <Calendar size={12} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
          <select
            value={String(selectedYear)}
            onChange={e => handleYearChange(e.target.value)}
            style={{
              WebkitAppearance: "none", appearance: "none",
              paddingLeft: 30, paddingRight: 28, paddingTop: 7, paddingBottom: 7,
              fontSize: 12, fontWeight: 600, border: `1px solid ${C.gray200}`, borderRadius: 10,
              outline: "none", backgroundColor: C.gray50, color: C.gray700, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <option value="all">All Years</option>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}{y === currentYear ? " (Current)" : ""}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, gap: 10, color: accentColor }}>
          <Loader2 size={22} className="a-spin" />
          <span style={{ fontSize: 14 }}>Loading…</span>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, gap: 10, color: C.red600 }}>
          <AlertCircle size={26} />
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      ) : initialized && records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, color: C.gray400 }}>
          {type === "applied" ? <ClipboardList size={36} style={{ marginBottom: 8, opacity: 0.3 }} /> : <Award size={36} style={{ marginBottom: 8, opacity: 0.3 }} />}
          <p style={{ fontSize: 13, margin: 0 }}>
            {type === "applied"
              ? `No applications found${selectedYear !== "all" ? ` for ${selectedYear}` : ""}.`
              : "No approved scholarships found yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {records.map(rec => (
            <div key={rec.applicationId} style={{
              padding: "14px 16px", borderRadius: 14, background: C.white,
              border: `1px solid ${C.gray100}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    backgroundColor: `${accentColor}18`, display: "flex", alignItems: "center",
                    justifyContent: "center", overflow: "hidden", marginTop: 1,
                  }}>
                    {rec.sangha.logo
                      ? <img src={rec.sangha.logo} alt={rec.sangha.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Building2 size={15} style={{ color: accentColor }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.gray800, fontFamily: "'Lora', serif", lineHeight: 1.3 }}>
                      {rec.scholarship.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.brick, fontWeight: 600, marginTop: 2 }}>{rec.sangha.name}</div>
                  </div>
                </div>
                <StatusBadge status={rec.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <Calendar size={10} /> Applied On
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700 }}>{formatDate(rec.appliedAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <IndianRupee size={10} /> Amount
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                    {rec.scholarship.amount != null ? `₹${Number(rec.scholarship.amount).toLocaleString("en-IN")}` : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <Banknote size={10} /> Disbursement
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700 }}>{formatDate(rec.scholarship.disbursementDate)}</div>
                </div>
              </div>

              {rec.rejectionReason && (
                <p style={{ fontSize: 11, color: C.red600, margin: "10px 0 0", fontStyle: "italic" }}>Reason: {rec.rejectionReason}</p>
              )}
              {rec.approvalNotes && (
                <p style={{ fontSize: 11, color: C.green700, margin: "10px 0 0", fontStyle: "italic" }}>Notes: {rec.approvalNotes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT DETAIL MODAL — tabbed: Info / Applied Scholarships / Benefitted Scholarships
// ─────────────────────────────────────────────────────────────────────────────
function ApplicantDetailModal({
  applicationId, applicantName, isFamilyMember, onClose,
}: {
  applicationId: string;
  applicantName: string;
  isFamilyMember: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTabKey>("info");
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(
          `${API_BASE}/admin/applications/${applicationId}/applicant-details`,
          { headers: getAuthHeaders() }
        );
        if (data.success) setDetail(data);
        else setError("Failed to load details.");
      } catch {
        setError("Failed to load applicant details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicationId]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", animation: "aOverlayIn 0.2s ease" }}
        onClick={onClose}
      />
      <div style={{
        position: "relative", backgroundColor: C.white,
        borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.32)",
        width: "100%", maxWidth: 760, maxHeight: "92vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "aModalIn 0.28s cubic-bezier(0.16,1,0.3,1) both",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", padding: "20px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#fed7aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
                {isFamilyMember ? "Family Member Applicant" : "User Applicant"}
              </p>
              <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "'Lora', serif" }}>
                {applicantName}
              </h2>
            </div>
            <button onClick={onClose} style={{ color: "#fed7aa", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
              <X size={22} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {DETAIL_TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
                    borderRadius: 10, border: "none", cursor: "pointer",
                    background: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.14)",
                    color: active ? C.orange600 : "#fed7aa",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fafafa" }}>
          {activeTab === "info" && (
            <ApplicantInfoTab detail={detail} loading={loading} error={error} />
          )}
          {activeTab === "applied" && (
            <ScholarshipHistoryTab applicationId={applicationId} type="applied" />
          )}
          {activeTab === "benefitted" && (
            <ScholarshipHistoryTab applicationId={applicationId} type="benefitted" />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.gray100}`, background: C.white, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 22px", fontSize: 13, fontWeight: 600, borderRadius: 10,
            border: `1px solid ${C.gray200}`, background: C.white, color: C.gray700, cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOLARSHIP DETAIL DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipDetailDrawer({
  scholarship, detail, detailLoading, onClose, onViewApplicants,
}: {
  scholarship: Scholarship; detail: ScholarshipDetailExtra | null;
  detailLoading: boolean; onClose: () => void; onViewApplicants: () => void;
}) {
  const accentColor = detail?.categoryColor || scholarship.categoryColor || C.orange500;
  const seatsFilled = detail?.seatsFilled ?? scholarship.stats.approved;
  const totalSeats = scholarship.seats;
  const eligibilityCount = detail?.eligibilityCount ?? scholarship.eligibilityCount ?? scholarship.eligibility.length;
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
  const isExpired = scholarship.deadline ? new Date(scholarship.deadline) < new Date() : false;
  const seatsProgress = totalSeats && totalSeats > 0 ? Math.min(100, Math.round((seatsFilled / totalSeats) * 100)) : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,8,20,0.65)", zIndex: 900, backdropFilter: "blur(6px)", animation: "aOverlayIn 0.22s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px, 100vw)",
        background: "#FFFFFF", zIndex: 901, display: "flex", flexDirection: "column",
        boxShadow: "-20px 0 80px rgba(0,0,0,0.18), -1px 0 0 rgba(0,0,0,0.06)",
        animation: "aDrawerIn 0.3s cubic-bezier(0.16,1,0.3,1) both", fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ background: `linear-gradient(160deg, ${accentColor}20, ${accentColor}06)`, borderBottom: `1px solid ${accentColor}30`, flexShrink: 0, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `${accentColor}0e`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px 0" }}>
            <button onClick={onClose} style={{ width: 34, height: 34, border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 10, background: "rgba(255,255,255,0.95)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 16, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ padding: "8px 28px 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {scholarship.category && (
                <span style={{ padding: "4px 11px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>{scholarship.category}</span>
              )}
              <StatusBadge status={scholarship.status} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px", lineHeight: 1.25, fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}>{scholarship.title}</h2>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={13} style={{ color: accentColor, flexShrink: 0 }} />
              <span>Offered by <strong style={{ color: C.orange600 }}>{scholarship.sangha.name}</strong></span>
              {(scholarship.sangha.district || scholarship.sangha.state) && (
                <span style={{ color: "#999" }}>· {[scholarship.sangha.district, scholarship.sangha.state].filter(Boolean).join(", ")}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 38, fontWeight: 800, fontFamily: "'Lora', serif", color: accentColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {scholarship.amount ? `₹${Number(scholarship.amount).toLocaleString("en-IN")}` : "—"}
              </span>
              <div>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>base award</div>
                {!detailLoading && detail?.tiers && detail.tiers.length > 0 && (
                  <div style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>+{detail.tiers.length} tier{detail.tiers.length > 1 ? "s" : ""} available</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#fafafa" }}>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
            {scholarship.description && <p style={{ fontSize: 14, color: "#4a4a5a", lineHeight: 1.75, margin: 0 }}>{scholarship.description}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { icon: <ListChecks size={18} style={{ color: accentColor, margin: "0 auto 4px" }} />, val: detailLoading ? "—" : eligibilityCount, label: "Criteria", col: accentColor },
                { icon: <Users size={18} style={{ color: C.green600, margin: "0 auto 4px" }} />, val: detailLoading ? "—" : `${seatsFilled}${totalSeats ? `/${totalSeats}` : ""}`, label: "Seats Filled", col: C.green600 },
                { icon: <Banknote size={18} style={{ color: C.orange600, margin: "0 auto 4px" }} />, val: detailLoading ? "—" : (formatDate(detail?.disbursementDate || scholarship.disbursementDate) ?? "—"), label: "Disbursement", col: C.orange600 },
              ].map(({ icon, val, label, col }) => (
                <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid #ebebf0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" }}>
                  {icon}
                  <div style={{ fontSize: typeof val === "string" && val.length > 6 ? 11 : 20, fontWeight: 800, fontFamily: "'Lora', serif", color: col, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {seatsProgress !== null && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginBottom: 6 }}>
                  <span>Seats filled</span><span style={{ fontWeight: 700, color: accentColor }}>{seatsProgress}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "#ebebf0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${seatsProgress}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>
            )}

            {!detailLoading && detail?.tiers && detail.tiers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Award Tiers</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {detail.tiers.map(tier => (
                    <div key={tier.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "#fff", border: "1px solid #ebebf0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{tier.label}</div>
                        {tier.condition && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{tier.condition}</div>}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Lora', serif", color: accentColor }}>₹{Number(tier.amount).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scholarship.eligibility.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Eligibility Criteria</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {scholarship.eligibility.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid #ebebf0", fontSize: 13, color: "#333", lineHeight: 1.5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${accentColor}18`, border: `1px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 9, color: accentColor }}>✓</div>
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Application Statistics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  { label: "Total", count: scholarship.stats.totalApplicants, bg: C.gray50, col: C.gray700, border: C.gray200, icon: <Users size={16} /> },
                  { label: "Approved", count: scholarship.stats.approved, bg: C.green50, col: C.green700, border: "#bbf7d0", icon: <CheckCircle2 size={16} /> },
                  { label: "Pending", count: scholarship.stats.pending, bg: C.yellow50, col: C.yellow700, border: "#fef08a", icon: <Clock size={16} /> },
                  { label: "Rejected", count: scholarship.stats.rejected, bg: C.red50, col: C.red600, border: "#fecaca", icon: <XCircle size={16} /> },
                ].map(({ label, count, bg, col, border, icon }) => (
                  <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ color: col }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Lora', serif", color: col, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 11, color: col, opacity: 0.75, fontWeight: 600 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid #ebebf0", background: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{scholarship.stats.totalApplicants} total application{scholarship.stats.totalApplicants !== 1 ? "s" : ""}</div>
          <button onClick={() => { onClose(); onViewApplicants(); }} className="a-btn" style={{ padding: "10px 24px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 12, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 3px 14px rgba(249,115,22,0.4)" }}>
            <Users size={15} /> View Applications
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANTS MODAL
// Eye button per row → opens ApplicantDetailModal
// No more expandable detail panel
// ─────────────────────────────────────────────────────────────────────────────
function ApplicantsModal({ scholarship, onClose }: { scholarship: Scholarship; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("all");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [detailApp, setDetailApp] = useState<Applicant | null>(null);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_BASE}/admin/scholarships/${scholarship.id}/applicants`,
        { params: { status: activeTab, page, limit: 15 }, headers: getAuthHeaders() }
      );
      if (data.success) { setApplicants(data.data); setPagination(data.pagination); }
    } catch { /* silently handled */ }
    finally { setLoading(false); }
  }, [scholarship.id, activeTab, page]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);
  useEffect(() => { setPage(1); }, [activeTab]);

  // Determine display name for the eye button detail modal
  const getApplicantDisplayName = (app: Applicant): string => {
    if (app.familyMemberId && app.familyMemberName) {
      return `${app.familyMemberName} (${app.familyMemberRelation})`;
    }
    return app.user.fullName;
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", animation: "aOverlayIn 0.2s ease" }} onClick={onClose} />

        <div style={{
          position: "relative", backgroundColor: C.white, borderRadius: 20,
          boxShadow: "0 25px 60px rgba(0,0,0,0.28)", width: "100%", maxWidth: 896, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "aModalIn 0.28s cubic-bezier(0.16,1,0.3,1) both", fontFamily: "'DM Sans', sans-serif",
        }}>
          {/* Modal header */}
          <div style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#fed7aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{scholarship.sangha.name}</p>
                <h2 style={{ color: C.white, fontSize: 20, fontWeight: 700, lineHeight: 1.25, margin: 0, fontFamily: "'Lora', serif" }}>{scholarship.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span style={{ color: "#fed7aa", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={13} />{scholarship.stats.totalApplicants} total applicants
                  </span>
                  <StatusBadge status={scholarship.status} />
                </div>
              </div>
              <button onClick={onClose} style={{ color: "#fed7aa", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {[
                { icon: <CheckCircle2 size={13} style={{ color: "#86efac" }} />, count: scholarship.stats.approved, label: "Approved" },
                { icon: <XCircle size={13} style={{ color: "#fca5a5" }} />, count: scholarship.stats.rejected, label: "Rejected" },
                { icon: <Clock size={13} style={{ color: "#fde047" }} />, count: scholarship.stats.pending, label: "Pending" },
              ].map(({ icon, count, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 8, padding: "5px 12px" }}>
                  {icon}
                  <span style={{ color: C.white, fontSize: 13, fontWeight: 700 }}>{count}</span>
                  <span style={{ color: "#fed7aa", fontSize: 11 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: `1px solid ${C.gray100}`, paddingLeft: 24, paddingRight: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: -1 }}>
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "11px 16px", fontSize: 13, fontWeight: 500, textTransform: "capitalize",
                  borderTop: "none", borderLeft: "none", borderRight: "none",
                  borderBottom: activeTab === tab ? `2px solid ${C.orange500}` : "2px solid transparent",
                  color: activeTab === tab ? C.orange600 : C.gray500, background: "none", cursor: "pointer",
                }}>{tab}</button>
              ))}
            </div>
          </div>

          {/* Applicant list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 192, gap: 10, color: C.orange500 }}>
                <Loader2 size={22} className="a-spin" />
                <span style={{ fontSize: 14 }}>Loading applicants…</span>
              </div>
            ) : applicants.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 192, color: C.gray400 }}>
                <Users size={38} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ fontSize: 14, margin: 0 }}>No applicants found for this filter.</p>
              </div>
            ) : (
              <div>
                {applicants.map((app, idx) => {
                  const isFM = !!app.familyMemberId;
                  const displayName = isFM && app.familyMemberName
                    ? app.familyMemberName
                    : app.user.fullName;
                  const subLabel = isFM && app.familyMemberRelation
                    ? `${app.familyMemberRelation} of ${app.user.fullName}`
                    : null;
                  const initials = displayName?.charAt(0).toUpperCase() ?? "?";

                  return (
                    <div key={app.applicationId}
                      style={{ padding: "14px 24px", borderTop: idx === 0 ? "none" : `1px solid ${C.gray50}`, display: "flex", alignItems: "center", gap: 14 }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        backgroundColor: isFM ? C.blue100 : C.orange100,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, overflow: "hidden",
                      }}>
                        {app.user.profilePhoto && !isFM ? (
                          <img src={app.user.profilePhoto} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: isFM ? C.blue600 : C.orange600, fontWeight: 700, fontSize: 14 }}>{initials}</span>
                        )}
                      </div>

                      {/* Name + details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: C.gray800, fontSize: 14, fontFamily: "'Lora', serif" }}>{displayName}</span>
                          {isFM && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 9999, background: C.blue100, color: C.blue700, border: `1px solid #bfdbfe` }}>
                              Family Member
                            </span>
                          )}
                          <StatusBadge status={app.status} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 14, rowGap: 3, marginTop: 3 }}>
                          {subLabel && <span style={{ fontSize: 12, color: C.blue600 }}>{subLabel}</span>}
                          {!subLabel && <span style={{ fontSize: 12, color: C.gray500 }}>{app.user.email}</span>}
                          <span style={{ fontSize: 12, color: C.gray500 }}>{app.user.phone}</span>
                          {(app.user.district || app.user.state) && (
                            <span style={{ fontSize: 12, color: C.gray500, display: "flex", alignItems: "center", gap: 2 }}>
                              <MapPin size={11} />{[app.user.district, app.user.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: C.gray400, margin: "2px 0 0 0" }}>
                          Applied {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {app.rejectionReason && (
                          <p style={{ fontSize: 11, color: C.red600, margin: "3px 0 0", fontStyle: "italic" }}>Reason: {app.rejectionReason}</p>
                        )}
                        {app.approvalNotes && (
                          <p style={{ fontSize: 11, color: C.green700, margin: "3px 0 0", fontStyle: "italic" }}>Notes: {app.approvalNotes}</p>
                        )}
                      </div>

                      {/* Eye button — opens detail modal */}
                      <EyeBtn onClick={() => setDetailApp(app)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div style={{ borderTop: `1px solid ${C.gray100}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: C.gray500, margin: 0 }}>
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: 6, borderRadius: 8, border: `1px solid ${C.gray200}`, color: C.gray500, background: C.white, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center" }}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 12, color: C.gray600 }}>{page} / {pagination.totalPages}</span>
                <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: 6, borderRadius: 8, border: `1px solid ${C.gray200}`, color: C.gray500, background: C.white, cursor: page === pagination.totalPages ? "not-allowed" : "pointer", opacity: page === pagination.totalPages ? 0.4 : 1, display: "flex", alignItems: "center" }}><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Applicant Detail Modal — rendered on top */}
      {detailApp && (
        <ApplicantDetailModal
          applicationId={detailApp.applicationId}
          applicantName={getApplicantDisplayName(detailApp)}
          isFamilyMember={!!detailApp.familyMemberId}
          onClose={() => setDetailApp(null)}
        />
      )}
    </>
  );
}

// Small reusable eye button with hover state
function EyeBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title="View full details"
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 34, height: 34, borderRadius: 9, border: "none", flexShrink: 0,
        background: hov ? `${C.orange500}18` : C.gray50,
        color: hov ? C.orange600 : C.gray400,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
        boxShadow: hov ? `0 0 0 2px ${C.orange200}` : "none",
      }}
    >
      <Eye size={16} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHOLARSHIP CARD
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipCard({ scholarship, onViewApplicants, onViewDetails }: {
  scholarship: Scholarship; onViewApplicants: (s: Scholarship) => void; onViewDetails: (s: Scholarship) => void;
}) {
  const [cardHovered, setCardHovered] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);
  const catColor = scholarship.categoryColor || C.orange500;
  const deadline = scholarship.deadline ? new Date(scholarship.deadline) : null;
  const isExpired = deadline ? deadline < new Date() : false;
  const totalSeats = scholarship.seats;
  const seatsFilled = scholarship.stats.approved;
  const seatsProgress = totalSeats && totalSeats > 0 ? Math.min(100, Math.round((seatsFilled / totalSeats) * 100)) : null;
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const FieldRow = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, lineHeight: 1.5 }}>
      {icon && <span style={{ flexShrink: 0, display: "flex", alignItems: "center", marginTop: 1 }}>{icon}</span>}
      <span style={{ color: "#1a1a2e", fontWeight: 600, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: catColor, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  return (
    <div className="a-card" style={{ backgroundColor: C.white, borderRadius: 18, border: cardHovered ? `1.5px solid ${catColor}55` : `1px solid ${C.gray100}`, boxShadow: cardHovered ? `0 4px 20px ${catColor}22` : "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", position: "relative" }}
      onMouseEnter={() => setCardHovered(true)} onMouseLeave={() => setCardHovered(false)}
    >
      <div style={{ height: 4, background: `linear-gradient(90deg, ${catColor}cc, ${catColor})` }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, backgroundColor: `${catColor}18`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {scholarship.sangha.logo
              ? <img src={scholarship.sangha.logo} alt={scholarship.sangha.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <Building2 size={15} style={{ color: catColor }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.brick, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scholarship.sangha.name}</p>
          </div>
          <StatusBadge status={scholarship.status} />
          <button title="View applicants" onClick={e => { e.stopPropagation(); onViewApplicants(scholarship); }}
            onMouseEnter={() => setEyeHovered(true)} onMouseLeave={() => setEyeHovered(false)}
            style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: eyeHovered ? `${catColor}22` : C.gray50, color: eyeHovered ? catColor : C.gray400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
            <Eye size={15} />
          </button>
        </div>

        <h3 style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 15, lineHeight: 1.35, margin: "0 0 12px", fontFamily: "'Lora', serif", letterSpacing: "-0.01em" }}>{scholarship.title}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <FieldRow label="Category" value={scholarship.category || "—"} icon={<Tag size={11} style={{ color: catColor }} />} />
          <FieldRow label="Location" value={[scholarship.district, scholarship.state].filter(Boolean).join(", ") || "—"} icon={<MapPin size={11} style={{ color: catColor }} />} />
          <FieldRow label="Base Amount" value={scholarship.amount ? `₹${Number(scholarship.amount).toLocaleString("en-IN")}` : "—"} icon={<IndianRupee size={11} style={{ color: catColor }} />} />
          <FieldRow label="Open Date" value={scholarship.applicationStart ? formatDate(scholarship.applicationStart) : "—"} icon={<Calendar size={11} style={{ color: catColor }} />} />
          <FieldRow label="Closing Date" value={deadline ? formatDate(scholarship.deadline) : "—"} icon={<Calendar size={11} style={{ color: isExpired ? C.red500 : catColor }} />} />
          <FieldRow label="Disbursement" value={scholarship.disbursementDate ? formatDate(scholarship.disbursementDate) : "—"} icon={<Banknote size={11} style={{ color: catColor }} />} />
          <FieldRow label="Seats" value={totalSeats ? `${seatsFilled} filled / ${totalSeats} total` : seatsFilled > 0 ? `${seatsFilled} filled (unlimited)` : "Unlimited"} icon={<Users size={11} style={{ color: catColor }} />} />
        </div>

        {seatsProgress !== null && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 4 }}>
              <span>Seats filled</span><span style={{ fontWeight: 700, color: catColor }}>{seatsProgress}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#ebebf0", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${seatsProgress}%`, background: `linear-gradient(90deg, ${catColor}99, ${catColor})`, borderRadius: 99 }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <HoverBtn onClick={() => onViewDetails(scholarship)}
            baseStyle={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${catColor}88`, background: "transparent", color: catColor, cursor: "pointer", transition: "all 0.15s" }}
            hoverStyle={{ background: `${catColor}12`, borderColor: catColor }}
          >
            <FileText size={13} /> View Details
          </HoverBtn>
          <HoverBtn onClick={() => onViewApplicants(scholarship)}
            baseStyle={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "8px 0", borderRadius: 10, border: "none", background: catColor, color: C.white, cursor: "pointer", boxShadow: `0 1px 4px ${catColor}44`, transition: "all 0.15s" }}
            hoverStyle={{ filter: "brightness(0.88)", boxShadow: `0 4px 12px ${catColor}66` }}
          >
            <Users size={13} /> Applications ({scholarship.stats.totalApplicants})
          </HoverBtn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR SANGHA ITEM
// ─────────────────────────────────────────────────────────────────────────────
function SanghaItem({ sangha, active, onClick }: { sangha: Sangha; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 12, border: "none", cursor: "pointer", transition: "all 0.15s",
      backgroundColor: active ? C.orange500 : hovered ? C.orange50 : "transparent",
      color: active ? C.white : C.gray700, boxShadow: active ? "0 1px 4px rgba(249,115,22,0.3)" : "none",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", backgroundColor: active ? "rgba(255,255,255,0.2)" : C.orange100 }}>
        {sangha.logo ? <img src={sangha.logo} alt={sangha.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={15} style={{ color: active ? C.white : C.orange500 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? C.white : C.brick, margin: 0 }}>{sangha.name}</p>
        <p style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? "#fed7aa" : C.gray400, margin: 0 }}>{sangha.activeScholarships} active · {sangha.state}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="a-pulse" style={{ backgroundColor: C.white, borderRadius: 18, border: `1px solid ${C.gray100}`, overflow: "hidden" }}>
      <div style={{ height: 4, background: C.orange200 }} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, backgroundColor: C.gray100, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ height: 11, backgroundColor: C.orange100, borderRadius: 4, width: 110 }} />
          <div style={{ marginLeft: "auto", height: 22, width: 60, backgroundColor: C.gray100, borderRadius: 99 }} />
          <div style={{ width: 30, height: 30, backgroundColor: C.gray50, borderRadius: 8 }} />
        </div>
        <div style={{ height: 18, backgroundColor: C.gray100, borderRadius: 5, width: "80%", marginBottom: 12 }} />
        {[0,1,2,3,4,5,6].map(j => (
          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <div style={{ height: 12, backgroundColor: C.gray100, borderRadius: 4, width: 80 }} />
            <div style={{ height: 12, backgroundColor: C.orange50, borderRadius: 4, width: 100 }} />
          </div>
        ))}
        <div style={{ height: 6, backgroundColor: C.gray100, borderRadius: 99, marginBottom: 14, marginTop: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, height: 34, backgroundColor: C.orange100, borderRadius: 10 }} />
          <div style={{ flex: 1, height: 34, backgroundColor: C.orange200, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminScholarshipPage() {
  const windowWidth = useWindowWidth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sanghaFilter, setSanghaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [sanghas, setSanghas] = useState<Sangha[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicantsTarget, setApplicantsTarget] = useState<Scholarship | null>(null);
  const [detailTarget, setDetailTarget] = useState<Scholarship | null>(null);
  const [scholarshipDetail, setScholarshipDetail] = useState<ScholarshipDetailExtra | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarSearchFocused, setSidebarSearchFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function loadMeta() {
      setLoadingSidebar(true);
      const [sanghasResult, catsResult, statesResult] = await Promise.allSettled([
        axios.get(`${API_BASE}/admin/sanghas`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/admin/scholarship-categories`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE}/admin/scholarship-states`, { headers: getAuthHeaders() }),
      ]);
      if (sanghasResult.status === "fulfilled" && sanghasResult.value.data.success) setSanghas(sanghasResult.value.data.data);
      if (catsResult.status === "fulfilled" && catsResult.value.data.success) {
        const raw = catsResult.value.data.data;
        if (raw.length > 0 && typeof raw[0] === "object") setCategories(raw as CategoryMeta[]);
        else setCategories((raw as string[]).map((n: string) => ({ name: n, color: C.orange500 })));
      }
      if (statesResult.status === "fulfilled" && statesResult.value.data.success) setStates(statesResult.value.data.data);
      setLoadingSidebar(false);
    }
    loadMeta();
  }, []);

  const fetchScholarships = useCallback(async () => {
    setLoadingScholarships(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/scholarships`, {
        params: { search: debouncedSearch, category: categoryFilter, state: stateFilter, sangha_id: sanghaFilter, status: statusFilter, page, limit: LIMIT },
        headers: getAuthHeaders(),
      });
      if (data.success) { setScholarships(data.data); setPagination(data.pagination); }
    } catch { setError("Failed to load scholarships. Please try again."); }
    finally { setLoadingScholarships(false); }
  }, [debouncedSearch, categoryFilter, stateFilter, sanghaFilter, statusFilter, page]);

  useEffect(() => { fetchScholarships(); }, [fetchScholarships]);

  const handleViewDetails = useCallback(async (scholarship: Scholarship) => {
    setDetailTarget(scholarship);
    setScholarshipDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/scholarships/${scholarship.id}`, { headers: getAuthHeaders() });
      if (data.success) {
        setScholarshipDetail({
          tiers: data.data.tiers || [], categoryColor: data.data.categoryColor || C.orange500,
          applicationStart: data.data.applicationStart || null, disbursementDate: data.data.disbursementDate || null,
          seatsFilled: data.data.seatsFilled || 0, eligibilityCount: data.data.eligibilityCount || data.data.eligibility?.length || 0,
        });
      }
    } catch {
      setScholarshipDetail({ tiers: [], categoryColor: scholarship.categoryColor || C.orange500, applicationStart: scholarship.applicationStart || null, disbursementDate: scholarship.disbursementDate || null, seatsFilled: scholarship.stats.approved, eligibilityCount: scholarship.eligibility?.length || 0 });
    } finally { setDetailLoading(false); }
  }, []);

  const handleDrawerViewApplicants = useCallback(() => {
    if (detailTarget) { setApplicantsTarget(detailTarget); setDetailTarget(null); }
  }, [detailTarget]);

  const applyFilter = (setter: (v: string) => void, value: string) => { setter(value); setPage(1); };
  const hasFilters = search || categoryFilter || stateFilter || sanghaFilter || statusFilter;
  const gridCols = windowWidth >= 1280 ? 3 : windowWidth >= 640 ? 2 : 1;
  const filteredSanghas = sidebarSearch ? sanghas.filter(sg => sg.name.toLowerCase().includes(sidebarSearch.toLowerCase())) : sanghas;

  const selectStyle: React.CSSProperties = {
    WebkitAppearance: "none", appearance: "none",
    paddingLeft: 32, paddingRight: 32, paddingTop: 8, paddingBottom: 8,
    fontSize: 13, border: `1px solid ${C.gray200}`, borderRadius: 12,
    outline: "none", backgroundColor: C.gray50, color: C.gray700, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.gray50, display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      <header style={{ backgroundColor: C.white, borderBottom: `1px solid ${C.gray100}`, position: "sticky", top: 0, zIndex: 30, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg, #fb923c, #ea580c)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}>
              <GraduationCap size={20} style={{ color: C.white }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: C.gray800, lineHeight: 1.25, margin: 0, fontFamily: "'Lora', serif" }}>Scholarship Admin</h1>
             
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <HoverBtn onClick={fetchScholarships} title="Refresh"
            baseStyle={{ padding: 8, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.black, display: "flex", alignItems: "center" }}
            hoverStyle={{ color: C.orange500, backgroundColor: C.orange50 }}
          >Refresh page</HoverBtn>
        </div>

        <div style={{ padding: "0 24px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              placeholder="Search scholarships, sanghas…"
              style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, fontSize: 13, borderRadius: 12, outline: "none", border: searchFocused ? `1px solid ${C.orange400}` : `1px solid ${C.gray200}`, boxShadow: searchFocused ? "0 0 0 3px rgba(253,186,116,0.35)" : "none", backgroundColor: C.gray50, color: C.gray700 }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Filter size={12} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
            <select value={categoryFilter} onChange={e => applyFilter(setCategoryFilter, e.target.value)} style={selectStyle}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
          </div>

          <div style={{ position: "relative" }}>
            <MapPin size={12} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
            <select value={stateFilter} onChange={e => applyFilter(setStateFilter, e.target.value)} style={selectStyle}>
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
          </div>

          <div style={{ position: "relative" }}>
            <select value={statusFilter} onChange={e => applyFilter(setStatusFilter, e.target.value)} style={{ ...selectStyle, paddingLeft: 12 }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
          </div>

          {hasFilters && (
            <button onClick={() => { setSearch(""); setCategoryFilter(""); setStateFilter(""); setSanghaFilter(""); setStatusFilter(""); setPage(1); }}
              style={{ fontSize: 12, color: C.orange600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>
              Clear filters
            </button>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ backgroundColor: C.white, borderRight: `1px solid ${C.gray100}`, flexShrink: 0, width: sidebarOpen ? 252 : 54, transition: "width 0.3s", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderBottom: `1px solid ${C.gray50}` }}>
            {sidebarOpen && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Sanghas</p>
                <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>{sanghas.length} total</p>
              </div>
            )}
            <HoverBtn onClick={() => setSidebarOpen(o => !o)}
              baseStyle={{ padding: 6, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.gray400, marginLeft: "auto", display: "flex", alignItems: "center" }}
              hoverStyle={{ color: C.orange500, backgroundColor: C.orange50 }}
            >
              {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </HoverBtn>
          </div>

          {sidebarOpen && (
            <div style={{ padding: "8px 10px 4px" }}>
              <div style={{ position: "relative" }}>
                <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.gray400, pointerEvents: "none" }} />
                <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} onFocus={() => setSidebarSearchFocused(true)} onBlur={() => setSidebarSearchFocused(false)}
                  placeholder="Search sanghas…"
                  style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: sidebarSearch ? 28 : 10, paddingTop: 6, paddingBottom: 6, fontSize: 12, borderRadius: 9, outline: "none", border: sidebarSearchFocused ? `1px solid ${C.orange400}` : `1px solid ${C.gray200}`, boxShadow: sidebarSearchFocused ? "0 0 0 2px rgba(253,186,116,0.3)" : "none", backgroundColor: C.gray50, color: C.gray700, transition: "border-color 0.15s, box-shadow 0.15s" }}
                />
                {sidebarSearch && (
                  <button onClick={() => setSidebarSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray400, display: "flex", alignItems: "center", padding: 0 }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: "6px 8px 0" }}>
            <HoverBtn onClick={() => applyFilter(setSanghaFilter, "")}
              baseStyle={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, backgroundColor: !sanghaFilter ? C.orange500 : "transparent", color: !sanghaFilter ? C.white : C.gray600, border: "none", cursor: "pointer" }}
              hoverStyle={sanghaFilter ? { backgroundColor: C.orange50 } : {}}
            >
              <BookOpen size={13} />{sidebarOpen && "All Sanghas"}
            </HoverBtn>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
            {loadingSidebar ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 20 }}>
                <Loader2 size={16} className="a-spin" style={{ color: C.orange400 }} />
              </div>
            ) : filteredSanghas.length === 0 && sidebarSearch ? (
              sidebarOpen ? <p style={{ fontSize: 11, color: C.gray400, textAlign: "center", padding: "12px 0", margin: 0 }}>No sanghas found</p> : null
            ) : (
              filteredSanghas.map(sg =>
                sidebarOpen
                  ? <SanghaItem key={sg.id} sangha={sg} active={sanghaFilter === sg.id} onClick={() => applyFilter(setSanghaFilter, sanghaFilter === sg.id ? "" : sg.id)} />
                  : <CollapsedSanghaBtn key={sg.id} sangha={sg} active={sanghaFilter === sg.id} onClick={() => applyFilter(setSanghaFilter, sanghaFilter === sg.id ? "" : sg.id)} />
              )
            )}
          </div>
        </aside>

        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {error && (
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, backgroundColor: C.red50, border: "1px solid #fecaca", color: C.red600, borderRadius: 12, padding: "12px 16px", fontSize: 13 }}>
              <AlertCircle size={15} />{error}
              <button onClick={fetchScholarships} style={{ marginLeft: "auto", fontSize: 12, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", color: C.red600 }}>Retry</button>
            </div>
          )}

          {loadingScholarships ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : scholarships.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 288, color: C.gray400 }}>
              <GraduationCap size={52} style={{ marginBottom: 12, opacity: 0.2 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: C.gray500, margin: "0 0 4px", fontFamily: "'Lora', serif" }}>No scholarships found</p>
              <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: C.gray400, marginBottom: 16 }}>
                Showing <span style={{ fontWeight: 600, color: C.gray600 }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination?.total ?? 0)}</span> of <span style={{ fontWeight: 600, color: C.gray600 }}>{pagination?.total ?? 0}</span> scholarships
              </p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20 }}>
                {scholarships.map((s, i) => (
                  <div key={s.id} className="a-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <ScholarshipCard scholarship={s} onViewApplicants={setApplicantsTarget} onViewDetails={handleViewDetails} />
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 32 }}>
                  <HoverBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    baseStyle={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", fontSize: 13, fontWeight: 500, border: `1px solid ${C.gray200}`, borderRadius: 12, color: C.gray600, background: C.white, cursor: "pointer" }}
                    hoverStyle={{ borderColor: C.orange400, color: C.orange600 }}
                    disabledStyle={{ opacity: 0.4, cursor: "not-allowed" }}
                  ><ChevronLeft size={14} /> Previous</HoverBtn>

                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                        acc.push(p); return acc;
                      }, [])
                      .map((p, i) => p === "…"
                        ? <span key={`e-${i}`} style={{ padding: "0 6px", color: C.gray400, fontSize: 14 }}>…</span>
                        : <PageBtn key={p} num={p as number} current={page} onClick={() => setPage(p as number)} />
                      )}
                  </div>

                  <HoverBtn disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                    baseStyle={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", fontSize: 13, fontWeight: 500, border: `1px solid ${C.gray200}`, borderRadius: 12, color: C.gray600, background: C.white, cursor: "pointer" }}
                    hoverStyle={{ borderColor: C.orange400, color: C.orange600 }}
                    disabledStyle={{ opacity: 0.4, cursor: "not-allowed" }}
                  >Next <ChevronRight size={14} /></HoverBtn>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {detailTarget && (
        <ScholarshipDetailDrawer scholarship={detailTarget} detail={scholarshipDetail} detailLoading={detailLoading}
          onClose={() => { setDetailTarget(null); setScholarshipDetail(null); }}
          onViewApplicants={handleDrawerViewApplicants}
        />
      )}

      {applicantsTarget && (
        <ApplicantsModal scholarship={applicantsTarget} onClose={() => setApplicantsTarget(null)} />
      )}
    </div>
  );
}
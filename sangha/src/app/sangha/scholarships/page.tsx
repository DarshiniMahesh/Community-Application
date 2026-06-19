// Community-Application\sangha\src\app\sangha\scholarships\page.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type AgeLimit = { min: number | ""; max: number | "" };
type GenderEligibility = "all" | "male" | "female" | "other";
type MaritalStatus = "all" | "married" | "single_never_married" | "single_divorced" | "single_widowed";
type IncomeRange = { min: number | ""; max: number | "" };
type DocCoverage = "not_required" | "yes" | "no";
type DocCardCoverage = "all" | "must_have" | "should_not_have" | "not_required";
type VisibilityType = "all_users" | "primary_sangha_only";
type CustomCoverageCoverage = "all" | "must_have" | "must_not_have";

interface TieredAmount { id: string; label: string; amount: number | ""; condition: string; }
interface ScholarshipCategory { id: string; name: string; color: string; }

// ─── Custom Criteria Types ────────────────────────────────────────────────────
interface CustomCriterion {
  id: string;
  label: string;
  description: string;
  sort_order: number;
}
interface CustomCriteriaValue {
  criterionId: string;
  label: string;
  description: string;
  coverage: CustomCoverageCoverage;
}

interface ScholarshipCriteria {
  ageLimit: AgeLimit; gender: GenderEligibility; disabilityRequired: boolean | null;
  maritalStatus: MaritalStatus; states: string[]; districts: string[];
  educationLevels: string[]; degrees: string[]; universities: string[];
  meritBased: boolean | null; currentlyStudying: boolean | null;
  employmentStatus: "all" | "employed" | "unemployed" | "self_employed";
  annualFamilyIncome: IncomeRange; selfIncome: IncomeRange;
  ewsOnly: boolean | null; houseOwnership: "all" | "owns" | "rents" | "none";
  agriculturalFamily: boolean | null;
  vehicleOwnership: "all" | "no_vehicle" | "two_wheeler" | "four_wheeler";
  hasAssets: boolean | null; hasInvestments: boolean | null;
  aadhaarRequired: DocCoverage; religion: string[]; caste: string[];
  domicile: boolean | null; singleParentFamily: boolean | null;
  orphan: boolean | null; minorityCommunity: boolean | null;
  sportsQuota: boolean | null; ruralBackground: boolean | null;
  cgpaMin: number | ""; percentageMin: number | "";
  healthInsurance: boolean | null; lifeInsurance: boolean | null; termInsurance: boolean | null;
  konkaniCard: boolean | null; aadhaar: DocCardCoverage; pan: DocCardCoverage;
  voterId: DocCardCoverage; drivingLicense: DocCardCoverage; landDocuments: boolean | null;
  facRentedHouse: boolean | null; facOwnHouse: boolean | null; facAgriculturalLand: boolean | null;
  facTwoWheeler: boolean | null; facCar: boolean | null;
  invFixedDeposits: boolean | null; invMutualFundsSip: boolean | null;
  invSharesDemat: boolean | null; invOthers: boolean | null;
}
interface Scholarship {
  id: string; name: string; description: string; categoryId: string;
  baseAmount: number | ""; tieredAmounts: TieredAmount[]; criteria: ScholarshipCriteria;
  customCriteriaValues: CustomCriteriaValue[];
  status: "draft" | "active" | "closed"; visibility: VisibilityType;
  maxApprovalsUnlimited: boolean; maxApprovals: number | "";
  applicationStart: string; applicationEnd: string; disbursementDate: string; createdAt: string;
}
interface ApplicantRow {
  application_id: string; profile_id: string; full_name: string;
  email: string; phone: string; gender: string; date_of_birth: string; age: number;
  marital_status: string; family_income: string; self_income: string;
  city: string; district: string; state: string;
  application_date?: string; approval_status?: "pending" | "approved" | "rejected";
  review_comment?: string; family_member_id: string | null;
  fm_name: string | null; fm_relation: string | null; fm_age: number | null;
  fm_gender: string | null; fm_dob: string | null;
}
interface ApplicantGroup {
  profile_id: string; full_name: string; email: string; phone: string;
  age: number; gender: string; city: string; state: string; family_income: string;
  applications: ApplicantRow[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options?.headers ?? {}) } });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message ?? `Request failed: ${res.status}`); }
  const json = await res.json();
  return json.data ?? json;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const emptyCriteria = (): ScholarshipCriteria => ({
  ageLimit: { min: "", max: "" }, gender: "all", disabilityRequired: null,
  maritalStatus: "all", states: [], districts: [], educationLevels: [], degrees: [], universities: [],
  meritBased: null, currentlyStudying: null, employmentStatus: "all",
  annualFamilyIncome: { min: "", max: "" }, selfIncome: { min: "", max: "" },
  ewsOnly: null, houseOwnership: "all", agriculturalFamily: null, vehicleOwnership: "all",
  hasAssets: null, hasInvestments: null, aadhaarRequired: "not_required",
  religion: [], caste: [], domicile: null, singleParentFamily: null, orphan: null,
  minorityCommunity: null, sportsQuota: null, ruralBackground: null, cgpaMin: "", percentageMin: "",
  healthInsurance: null, lifeInsurance: null, termInsurance: null, konkaniCard: null,
  aadhaar: "all", pan: "all", voterId: "all", drivingLicense: "all", landDocuments: null,
  facRentedHouse: null, facOwnHouse: null, facAgriculturalLand: null, facTwoWheeler: null, facCar: null,
  invFixedDeposits: null, invMutualFundsSip: null, invSharesDemat: null, invOthers: null,
});
const emptyScholarship = (): Scholarship => ({
  id: crypto.randomUUID(), name: "", description: "", categoryId: "",
  baseAmount: "", tieredAmounts: [], criteria: emptyCriteria(),
  customCriteriaValues: [],
  status: "draft", visibility: "primary_sangha_only", maxApprovalsUnlimited: true,
  maxApprovals: "", applicationStart: "", applicationEnd: "", disbursementDate: "", createdAt: new Date().toISOString(),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const EDUCATION_LEVELS = ["Below 10th","10th / SSLC","12th / PUC","Diploma","ITI","Bachelor's Degree","Master's Degree","Doctoral / PhD","Post Doctoral"];
const INDIAN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Karnataka": ["Bagalkote","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar","Chamarajanagara","Chikkaballapura","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayanagara","Vijayapura","Yadgir"],
  "Kerala": ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
};
const RELIGIONS = ["Hindu","Muslim","Christian","Sikh","Buddhist","Jain","Parsi","Others"];
const AGE_PRESETS = [{ label: "10–17 years", min: 10, max: 17 },{ label: "18–25 years", min: 18, max: 25 },{ label: "21–30 years", min: 21, max: 30 },{ label: "18+ (adult)", min: 18, max: "" as const }];
const SIDEBAR_AGE_OPTIONS = [
  { label: "Any age", value: "" },
  { label: "Under 18", value: "under18" },
  { label: "18–25 years", value: "18-25" },
  { label: "21–30 years", value: "21-30" },
  { label: "26–35 years", value: "26-35" },
  { label: "36–50 years", value: "36-50" },
  { label: "50+ years", value: "50plus" },
];
function sidebarAgeToRange(val: string): [number | null, number | null] {
  switch (val) {
    case "under18": return [null, 17];
    case "18-25":   return [18, 25];
    case "21-30":   return [21, 30];
    case "26-35":   return [26, 35];
    case "36-50":   return [36, 50];
    case "50plus":  return [50, null];
    default:        return [null, null];
  }
}
const ELIGIBILITY_FILTERS = [
  { key: "meritBased",        label: "Merit-based",        icon: "ti-star" },
  { key: "currentlyStudying", label: "Currently studying", icon: "ti-school" },
  { key: "disabilityRequired",label: "Disability",         icon: "ti-accessible" },
  { key: "sportsQuota",       label: "Sports / arts quota",icon: "ti-trophy" },
  { key: "ewsOnly",           label: "EWS only",           icon: "ti-currency-rupee" },
  { key: "orphan",            label: "Orphan",             icon: "ti-heart" },
  { key: "minorityCommunity", label: "Minority community", icon: "ti-users" },
  { key: "singleParentFamily",label: "Single parent family",icon: "ti-user" },
  { key: "ruralBackground",   label: "Rural background",   icon: "ti-plant" },
] as const;
type EligibilityKey = typeof ELIGIBILITY_FILTERS[number]["key"];

const CUSTOM_COVERAGE_OPTIONS: { label: string; value: CustomCoverageCoverage; icon: string; color: string }[] = [
  { label: "Any", value: "all", icon: "ti-circle-dashed", color: "var(--color-text-tertiary)" },
  { label: "Must have", value: "must_have", icon: "ti-circle-check", color: "var(--color-text-success)" },
  { label: "Must not have", value: "must_not_have", icon: "ti-circle-x", color: "var(--color-text-danger)" },
];

// ─── Global Styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/dist/tabler-icons.min.css');
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes cardIn  { from{opacity:0;transform:translateY(16px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes toastProgress { from{width:100%} to{width:0%} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes sectionOpen { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { from{background-position:-200px 0} to{background-position:calc(200px + 100%) 0} }
  @keyframes panelSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .schol-card { animation:cardIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .action-btn { transition:all 0.15s ease; }
  .action-btn:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); }
  .action-btn:active:not(:disabled) { transform:translateY(0); }
  .primary-btn { background:linear-gradient(135deg,#534AB7 0%,#7B72D9 100%); box-shadow:0 2px 12px rgba(83,74,183,0.35); transition:all 0.2s ease; }
  .primary-btn:hover:not(:disabled) { box-shadow:0 4px 20px rgba(83,74,183,0.5); transform:translateY(-1px); }
  .section-body { animation:sectionOpen 0.22s cubic-bezier(0.16,1,0.3,1) both; }
  .stat-card { transition:all 0.2s ease; }
  .stat-card:hover { transform:translateY(-2px); }
  .tab-btn { transition:all 0.18s ease; }
  .member-row { transition:background 0.12s ease; }
  .skeleton { background:linear-gradient(90deg,var(--color-background-secondary) 25%,var(--color-background-primary) 50%,var(--color-background-secondary) 75%); background-size:400px 100%; animation:shimmer 1.4s ease infinite; border-radius:8px; }
  .district-chip { padding:4px 11px; font-size:12px; border-radius:8px; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:400; transition:all 0.14px ease; user-select:none; }
  .district-chip.selected { background:rgba(15,110,86,0.1); color:var(--color-text-success); border:0.5px solid rgba(15,110,86,0.35); font-weight:600; }
  .district-chip.unselected { background:var(--color-background-secondary); color:var(--color-text-secondary); border:0.5px solid var(--color-border-tertiary); }
  .district-chip.unselected:hover { border-color:rgba(83,74,183,0.35); color:#534AB7; background:rgba(83,74,183,0.06); }
  .applicant-group { animation:cardIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .inline-panel { animation:panelSlide 0.28s cubic-bezier(0.16,1,0.3,1) both; }
  .sidebar-filter-btn { transition:all 0.15s ease; border:none; background:none; cursor:pointer; width:100%; text-align:left; font-family:'DM Sans',sans-serif; }
  .sidebar-filter-btn:hover { background:rgba(83,74,183,0.06); }
  .custom-criterion-row { transition:background 0.12s ease; }
  .custom-criterion-row:hover { background:rgba(83,74,183,0.04); }
  input,textarea,select { font-family:'DM Sans',sans-serif; }
  input[type="date"] { cursor:pointer; }
  .search-input:focus { outline:none; box-shadow:0 0 0 3px rgba(83,74,183,0.15); border-color:#534AB7; }
`;

// ─── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: string; type: "success"|"error"|"info"; message: string; }
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position:"fixed",bottom:28,right:28,display:"flex",flexDirection:"column",gap:10,zIndex:9999,pointerEvents:"none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents:"auto",borderRadius:14,fontSize:13,fontWeight:500,color:"#fff",background:t.type==="success"?"linear-gradient(135deg,#0F6E56,#1a9e7d)":t.type==="error"?"linear-gradient(135deg,#C0392B,#e05a4b)":"linear-gradient(135deg,#534AB7,#7B72D9)",boxShadow:`0 8px 32px ${t.type==="success"?"rgba(15,110,86,0.35)":t.type==="error"?"rgba(192,57,43,0.35)":"rgba(83,74,183,0.35)"}`,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:360,animation:"slideUp 0.25s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 16px" }}>
            <div style={{ width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <i className={`ti ${t.type==="success"?"ti-circle-check":t.type==="error"?"ti-circle-x":"ti-info-circle"}`} style={{ fontSize:15 }} />
            </div>
            <span style={{ flex:1,lineHeight:1.4 }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",padding:0 }}><i className="ti ti-x" style={{ fontSize:13 }} /></button>
          </div>
          <div style={{ height:3,background:"rgba(255,255,255,0.15)" }}><div style={{ height:"100%",background:"rgba(255,255,255,0.5)",animation:"toastProgress 4s linear forwards" }} /></div>
        </div>
      ))}
    </div>
  );
}

// ─── Last-Slot Confirm Modal ───────────────────────────────────────────────────
interface LastSlotModalProps {
  scholarshipName: string; maxApprovals: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}
function LastSlotModal({ scholarshipName, maxApprovals, onConfirm, onCancel, loading }: LastSlotModalProps) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:"1rem",backdropFilter:"blur(3px)",animation:"fadeIn 0.18s ease" }} onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}>
      <div style={{ background:"var(--color-background-primary,#fff)",borderRadius:20,width:"100%",maxWidth:420,boxShadow:"0 12px 48px rgba(0,0,0,0.18)",animation:"slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",overflow:"hidden",border:"0.5px solid var(--color-border-tertiary,rgba(0,0,0,0.08))" }}>
        <div style={{ height:4,background:"linear-gradient(90deg,#534AB7,#C0392B)" }} />
        <div style={{ padding:"24px 24px 8px" }}>
          <div style={{ width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,rgba(192,57,43,0.12),rgba(192,57,43,0.06))",border:"0.5px solid rgba(192,57,43,0.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}><i className="ti ti-alert-triangle" style={{ fontSize:24,color:"#C0392B" }} /></div>
          <div style={{ fontSize:17,fontWeight:700,color:"var(--color-text-primary,#1a1a2e)",marginBottom:8,fontFamily:"'DM Sans',sans-serif",lineHeight:1.3 }}>This is the last approval slot</div>
          <p style={{ fontSize:13,color:"var(--color-text-secondary,#6b7280)",lineHeight:1.6,margin:"0 0 16px" }}>You are about to approve the final slot ({maxApprovals}/{maxApprovals}) for{" "}<strong style={{ color:"var(--color-text-primary,#1a1a2e)" }}>{scholarshipName}</strong>.</p>
          <div style={{ padding:"12px 14px",borderRadius:12,background:"rgba(192,57,43,0.06)",border:"0.5px solid rgba(192,57,43,0.2)",marginBottom:22,display:"flex",gap:10,alignItems:"flex-start" }}>
            <i className="ti ti-lock" style={{ fontSize:16,color:"#C0392B",flexShrink:0,marginTop:1 }} />
            <p style={{ margin:0,fontSize:12,color:"var(--color-text-secondary,#6b7280)",lineHeight:1.6 }}>Once confirmed, the applicant will be approved <strong>and the scholarship will be closed</strong>. No further applications will be accepted.</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:10,padding:"0 24px 24px",justifyContent:"flex-end" }}>
          <button onClick={onCancel} disabled={loading} style={{ padding:"9px 20px",fontSize:13,fontWeight:500,border:"0.5px solid var(--color-border-tertiary,rgba(0,0,0,0.12))",borderRadius:10,background:"none",cursor:loading?"not-allowed":"pointer",color:"var(--color-text-secondary,#6b7280)",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding:"9px 22px",fontSize:13,fontWeight:700,border:"none",borderRadius:10,color:"#fff",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif",background:"linear-gradient(135deg,#C0392B,#e05a4b)",boxShadow:"0 2px 12px rgba(192,57,43,0.35)",opacity:loading?0.7:1 }}>
            {loading && <i className="ti ti-loader-2 ti-spin" style={{ fontSize:13 }} />}
            {loading ? "Processing…" : "Approve & Close Scholarship"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Viewer Modal ──────────────────────────────────────────────────────
interface ProfileData {
  user: { email?: string; phone?: string };
  personalDetails: Record<string, any> | null;
  religiousDetails: Record<string, any> | null;
  familyInfo: Record<string, any> | null;
  economicDetails: Record<string, any> | null;
  address: Record<string, any> | null;
  familyMembers: Record<string, any>[];
  memberEducation: Record<string, any>[];
  memberInsurance: Record<string, any> | null;
  memberDocuments: Record<string, any> | null;
}

function ProfileSection({ icon, title, accent, children }: { icon: string; title: string; accent: string; children: React.ReactNode; }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden",marginBottom:10 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:open?"var(--color-background-secondary)":"none",border:"none",borderBottom:open?"0.5px solid var(--color-border-tertiary)":"none",cursor:"pointer",textAlign:"left" }}>
        <span style={{ width:28,height:28,borderRadius:8,background:accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><i className={`ti ${icon}`} style={{ fontSize:14,color:"#fff" }} /></span>
        <span style={{ fontSize:13,fontWeight:600,color:"var(--color-text-primary)",flex:1,fontFamily:"'DM Sans',sans-serif" }}>{title}</span>
        <i className="ti ti-chevron-down" style={{ fontSize:13,color:"var(--color-text-tertiary)",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s" }} />
      </button>
      {open && <div style={{ padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,animation:"sectionOpen 0.2s both" }}>{children}</div>}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
      <span style={{ fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",minWidth:140,paddingTop:1,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13,color:"var(--color-text-primary)",lineHeight:1.5 }}>{String(value)}</span>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (value === null || value === undefined) return null;
  return (
    <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,background:value?"rgba(15,110,86,0.1)":"rgba(100,116,139,0.08)",color:value?"var(--color-text-success)":"var(--color-text-tertiary)",border:`0.5px solid ${value?"rgba(15,110,86,0.25)":"var(--color-border-tertiary)"}` }}>
      {value ? <><i className="ti ti-check" style={{ fontSize:9,marginRight:3 }} />{label}</> : <><i className="ti ti-minus" style={{ fontSize:9,marginRight:3 }} />No {label}</>}
    </span>
  );
}

function ArrayBadges({ values, color = "#534AB7" }: { values?: string[]; color?: string }) {
  if (!values?.length) return <span style={{ fontSize:12,color:"var(--color-text-tertiary)",fontStyle:"italic" }}>None</span>;
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
      {values.map((v, i) => (<span key={i} style={{ fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:`${color}14`,color,border:`0.5px solid ${color}35` }}>{v}</span>))}
    </div>
  );
}

function ProfileViewerModal({ scholarshipId, profileId, applicantName, familyMemberName, familyMemberRelation, onClose }: {
  scholarshipId: string; profileId: string; applicantName: string;
  familyMemberName?: string | null; familyMemberRelation?: string | null; onClose: () => void;
}) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await apiFetch<ProfileData>(`/api/sangha/scholarships/${scholarshipId}/applicants/${profileId}/profile`);
        setData(result);
      } catch (err) {
        setError((err as Error).message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [scholarshipId, profileId]);

  const pd = data?.personalDetails;
  const rd = data?.religiousDetails;
  const ed = data?.economicDetails;
  const addr = data?.address;
  const fullName = pd ? [pd.first_name, pd.middle_name, pd.last_name].filter(Boolean).join(" ") : applicantName;
  const isFamilyMember = !!familyMemberName;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:3000,padding:"1.5rem",backdropFilter:"blur(6px)",animation:"fadeIn 0.18s ease",overflowY:"auto" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--color-background-primary,#ffffff)",borderRadius:20,width:"100%",maxWidth:640,boxShadow:"0 16px 64px rgba(0,0,0,0.28)",animation:"slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",overflow:"hidden",border:"0.5px solid var(--color-border-tertiary)",marginTop:"auto",marginBottom:"auto" }}>
        <div style={{ height:4,background:"linear-gradient(90deg,#534AB7,#7B72D9)" }} />
        <div style={{ padding:"18px 20px 14px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:12,background:"linear-gradient(135deg,rgba(83,74,183,0.05),transparent)" }}>
          <Avatar name={isFamilyMember ? (familyMemberName ?? "?") : fullName} size={44} />
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:16,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif" }}>{isFamilyMember ? familyMemberName : fullName}</div>
            {isFamilyMember && <div style={{ fontSize:12,color:"var(--color-text-secondary)",marginTop:2 }}><i className="ti ti-users" style={{ fontSize:11,marginRight:4 }} />{familyMemberRelation} of <strong>{fullName}</strong></div>}
            <div style={{ display:"flex",gap:6,marginTop:4,flexWrap:"wrap" }}>
              {data?.user?.email && <span style={{ fontSize:11,color:"var(--color-text-tertiary)" }}><i className="ti ti-mail" style={{ fontSize:10,marginRight:3 }} />{data.user.email}</span>}
              {data?.user?.phone && <span style={{ fontSize:11,color:"var(--color-text-tertiary)" }}><i className="ti ti-phone" style={{ fontSize:10,marginRight:3 }} />{data.user.phone}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,border:"0.5px solid var(--color-border-tertiary)",borderRadius:9,background:"var(--color-background-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)",flexShrink:0 }}><i className="ti ti-x" style={{ fontSize:14 }} /></button>
        </div>
        <div style={{ padding:"14px 16px 20px",maxHeight:"70vh",overflowY:"auto" }}>
          {loading && <div style={{ padding:"3rem",textAlign:"center",color:"var(--color-text-tertiary)",display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}><i className="ti ti-loader-2 ti-spin" style={{ fontSize:26,color:"#534AB7" }} /><p style={{ margin:0,fontSize:13 }}>Loading profile…</p></div>}
          {error && <div style={{ padding:"1.5rem",textAlign:"center",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12 }}><i className="ti ti-alert-circle" style={{ fontSize:20,display:"block",marginBottom:8 }} /><p style={{ margin:0,fontSize:13 }}>{error}</p></div>}
          {!loading && !error && data && (
            <>
              <ProfileSection icon="ti-user" title="Personal Details" accent="#534AB7">
                <ProfileField label="Full name" value={fullName} />
                <ProfileField label="Gender" value={pd?.gender} />
                <ProfileField label="Date of birth" value={pd?.date_of_birth ? new Date(pd.date_of_birth).toLocaleDateString("en-IN", { day:"numeric",month:"long",year:"numeric" }) : null} />
                <ProfileField label="Marital status" value={pd?.marital_status} />
                <ProfileField label="Father's name" value={pd?.fathers_name} />
                <ProfileField label="Mother's name" value={pd?.mothers_name} />
                {pd?.wife_name && <ProfileField label="Wife's name" value={pd.wife_name} />}
                {pd?.husbands_name && <ProfileField label="Husband's name" value={pd.husbands_name} />}
                <ProfileField label="Disability" value={pd?.has_disability} />
              </ProfileSection>
              <ProfileSection icon="ti-flame" title="Religious Details" accent="#993C1D">
                <ProfileField label="Gotra" value={rd?.gotra} />
                <ProfileField label="Pravara" value={rd?.pravara} />
                <ProfileField label="Kuladevata" value={rd?.kuladevata !== "other" ? rd?.kuladevata : rd?.kuladevata_other} />
                <ProfileField label="Surname in use" value={rd?.surname_in_use} />
                <ProfileField label="Priest name" value={rd?.priest_name} />
                {rd?.demi_gods && pgArrayToString(rd.demi_gods) && (
                  <div style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                    <span style={{ fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",minWidth:140,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0,paddingTop:1 }}>Demi gods</span>
                    <span style={{ fontSize:13,color:"var(--color-text-primary)" }}>{pgArrayToString(rd.demi_gods)}</span>
                  </div>
                )}
              </ProfileSection>
              <ProfileSection icon="ti-users" title="Family" accent="#185FA5">
                <ProfileField label="Family type" value={data.familyInfo?.family_type} />
                {data.familyMembers.length > 0 && (
                  <div style={{ display:"flex",flexDirection:"column",gap:6,marginTop:4 }}>
                    {data.familyMembers.map((fm) => (
                      <div key={fm.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)" }}>
                        <Avatar name={fm.name || "?"} size={28} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:"var(--color-text-primary)" }}>{fm.name}</div>
                          <div style={{ fontSize:11,color:"var(--color-text-tertiary)" }}>{[fm.relation,fm.age?`${fm.age}y`:null,fm.gender].filter(Boolean).join(" · ")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {data.familyMembers.length === 0 && <span style={{ fontSize:12,color:"var(--color-text-tertiary)",fontStyle:"italic" }}>No family members added</span>}
              </ProfileSection>
              <ProfileSection icon="ti-map-pin" title="Location" accent="#0F6E56">
                {addr ? (
                  <>
                    <ProfileField label="City" value={addr.city} />
                    <ProfileField label="District" value={addr.district} />
                    <ProfileField label="State" value={addr.state} />
                    <ProfileField label="Pincode" value={addr.pincode} />
                  </>
                ) : <span style={{ fontSize:12,color:"var(--color-text-tertiary)",fontStyle:"italic" }}>No address recorded</span>}
              </ProfileSection>
              <ProfileSection icon="ti-currency-rupee" title="Economic Details" accent="#0F6E56">
                <ProfileField label="Self income" value={ed?.self_income ? `₹${Number(ed.self_income).toLocaleString("en-IN")}/yr` : null} />
                <ProfileField label="Family income" value={ed?.family_income ? `₹${Number(ed.family_income).toLocaleString("en-IN")}/yr` : null} />
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:4 }}>
                  <BoolBadge value={ed?.fac_own_house} label="Owns house" />
                  <BoolBadge value={ed?.fac_rented_house} label="Rented house" />
                  <BoolBadge value={ed?.fac_agricultural_land} label="Agri land" />
                  <BoolBadge value={ed?.fac_two_wheeler} label="2-wheeler" />
                  <BoolBadge value={ed?.fac_car} label="Car" />
                </div>
                {data.memberInsurance && (
                  <>
                    <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.07em",marginTop:4 }}>Insurance</div>
                    <div style={{ padding:"8px 10px",borderRadius:9,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)" }}>
                      <ProfileField label="Health" value={pgArrayToString(data.memberInsurance.health_coverage)} />
                      <ProfileField label="Life" value={pgArrayToString(data.memberInsurance.life_coverage)} />
                      <ProfileField label="Term" value={pgArrayToString(data.memberInsurance.term_coverage)} />
                      <ProfileField label="Konkani card" value={pgArrayToString(data.memberInsurance.konkani_card_coverage)} />
                    </div>
                  </>
                )}
                {data.memberDocuments && (
                  <>
                    <div style={{ fontSize:11,fontWeight:600,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.07em",marginTop:4 }}>Documents</div>
                    <div style={{ padding:"8px 10px",borderRadius:9,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)" }}>
                      <ProfileField label="Aadhaar" value={data.memberDocuments.aadhaar_coverage} />
                      <ProfileField label="PAN" value={data.memberDocuments.pan_coverage} />
                      <ProfileField label="Voter ID" value={data.memberDocuments.voter_id_coverage} />
                      <ProfileField label="Driving licence" value={data.memberDocuments.dl_coverage} />
                    </div>
                  </>
                )}
              </ProfileSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function parseIncome(raw: string): string {
  if (!raw) return "";
  const n = Number(raw);
  if (!isNaN(n) && raw !== "") return `₹${n.toLocaleString("en-IN")}`;
  return raw;
}
function pgArrayToString(val: unknown): string | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.length ? val.join(", ") : null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1);
      return inner.length ? inner.split(",").map((s) => s.trim().replace(/^"|"$/g, "")).join(", ") : null;
    }
    return trimmed || null;
  }
  return String(val);
}
function GlobalStyles() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <style>{GLOBAL_STYLES}</style>;
}
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0,2).toUpperCase() || "?";
  const hue = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:`hsl(${hue},55%,50%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:600,color:"#fff",flexShrink:0,fontFamily:"'DM Sans',sans-serif" }}>
      {initials}
    </div>
  );
}

function SectionCard({ title, icon, children, accent, defaultOpen=true }: { title:string; icon:string; children:React.ReactNode; accent:string; defaultOpen?:boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:16,overflow:"hidden",marginBottom:"1rem",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 20px",background:open?"var(--color-background-secondary)":"none",border:"none",borderBottom:open?"0.5px solid var(--color-border-tertiary)":"none",cursor:"pointer",textAlign:"left" }}>
        <span style={{ width:34,height:34,borderRadius:10,background:accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${accent}55` }}><i className={`ti ${icon}`} style={{ fontSize:16,color:"#fff" }} /></span>
        <span style={{ fontSize:14,fontWeight:600,color:"var(--color-text-primary)",flex:1,fontFamily:"'DM Sans',sans-serif" }}>{title}</span>
        <i className="ti ti-chevron-down" style={{ fontSize:15,color:"var(--color-text-tertiary)",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.22s cubic-bezier(0.16,1,0.3,1)" }} />
      </button>
      {open && <div className="section-body" style={{ padding:"18px 20px",display:"flex",flexDirection:"column",gap:16 }}>{children}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize:11,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>{children}</label>;
}
function Field({ label, children, hint }: { label:string; children:React.ReactNode; hint?:string }) {
  return <div><Label>{label}</Label>{hint&&<p style={{ fontSize:11,color:"var(--color-text-tertiary)",margin:"0 0 6px",lineHeight:1.5 }}>{hint}</p>}{children}</div>;
}
function Row({ children, cols="1fr 1fr" }: { children:React.ReactNode; cols?:string }) {
  return <div style={{ display:"grid",gridTemplateColumns:cols,gap:14 }}>{children}</div>;
}
function RadioGroup<T extends string>({ options, value, onChange }: { options:{label:string;value:T}[]; value:T; onChange:(v:T)=>void }) {
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ padding:"5px 13px",fontSize:12,borderRadius:100,border:`0.5px solid ${value===o.value?"#534AB7":"var(--color-border-tertiary)"}`,background:value===o.value?"linear-gradient(135deg,rgba(83,74,183,0.15),rgba(83,74,183,0.08))":"var(--color-background-secondary)",color:value===o.value?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",fontWeight:value===o.value?600:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif" }}>{o.label}</button>
      ))}
    </div>
  );
}
type TriOption = "any"|"yes"|"no";
function TriToggle({ value, onChange, yesLabel="Yes", noLabel="No" }: { value:boolean|null; onChange:(v:boolean|null)=>void; yesLabel?:string; noLabel?:string }) {
  const triValue: TriOption = value===null?"any":value?"yes":"no";
  const handleChange = (v: TriOption) => { if(v==="any") onChange(null); else if(v==="yes") onChange(true); else onChange(false); };
  return <RadioGroup<TriOption> options={[{label:"Any",value:"any"},{label:yesLabel,value:"yes"},{label:noLabel,value:"no"}]} value={triValue} onChange={handleChange} />;
}
function DocCardToggle({ value, onChange }: { value:DocCardCoverage; onChange:(v:DocCardCoverage)=>void }) {
  const options: {label:string;value:DocCardCoverage}[] = [{label:"All",value:"all"},{label:"Must have",value:"must_have"},{label:"Should not have",value:"should_not_have"},{label:"Not required",value:"not_required"}];
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ padding:"5px 13px",fontSize:12,borderRadius:100,border:`0.5px solid ${value===o.value?"#534AB7":"var(--color-border-tertiary)"}`,background:value===o.value?"linear-gradient(135deg,rgba(83,74,183,0.15),rgba(83,74,183,0.08))":"var(--color-background-secondary)",color:value===o.value?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",fontWeight:value===o.value?600:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif" }}>{o.label}</button>
      ))}
    </div>
  );
}
function MultiSelect({ options, value, onChange, showSelectAll }: { options:string[]; value:string[]; onChange:(v:string[])=>void; showSelectAll?:boolean }) {
  const toggle = (o: string) => onChange(value.includes(o)?value.filter((x)=>x!==o):[...value,o]);
  const allSelected = options.length>0&&options.every((o)=>value.includes(o));
  return (
    <div>
      {showSelectAll&&<div style={{ marginBottom:8,display:"flex",gap:6 }}><button onClick={()=>onChange(allSelected?[]:[...options])} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:`0.5px solid ${allSelected?"rgba(83,74,183,0.4)":"var(--color-border-tertiary)"}`,background:allSelected?"rgba(83,74,183,0.12)":"var(--color-background-secondary)",color:allSelected?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",fontWeight:600,transition:"all 0.12s",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:4 }}>{allSelected?<><i className="ti ti-circle-check" style={{ fontSize:10 }} /> All selected</>:<><i className="ti ti-select-all" style={{ fontSize:10 }} /> Select all</>}</button>{value.length>0&&!allSelected&&<button onClick={()=>onChange([])} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:"0.5px solid rgba(192,57,43,0.25)",background:"rgba(192,57,43,0.06)",color:"var(--color-text-danger)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Clear ({value.length})</button>}</div>}
      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
        {options.map((o) => (<button key={o} onClick={()=>toggle(o)} style={{ padding:"4px 10px",fontSize:12,borderRadius:8,border:`0.5px solid ${value.includes(o)?"rgba(15,110,86,0.35)":"var(--color-border-tertiary)"}`,background:value.includes(o)?"rgba(15,110,86,0.1)":"var(--color-background-secondary)",color:value.includes(o)?"var(--color-text-success)":"var(--color-text-secondary)",cursor:"pointer",fontWeight:value.includes(o)?600:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif" }}>{value.includes(o)&&<i className="ti ti-check" style={{ fontSize:10,marginRight:4 }} />}{o}</button>))}
      </div>
    </div>
  );
}
function NumberRange({ min,max,onMinChange,onMaxChange,placeholder }: { min:number|""; max:number|""; onMinChange:(v:number|"")=>void; onMaxChange:(v:number|"")=>void; placeholder?:{min?:string;max?:string} }) {
  return (
    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
      <input type="number" placeholder={placeholder?.min??"Min"} value={min} onChange={(e)=>onMinChange(e.target.value===""?""  :Number(e.target.value))} style={{ flex:1,fontSize:13 }} />
      <span style={{ color:"var(--color-text-tertiary)",fontSize:12,fontWeight:500,flexShrink:0 }}>—</span>
      <input type="number" placeholder={placeholder?.max??"Max"} value={max} onChange={(e)=>onMaxChange(e.target.value===""?"":Number(e.target.value))} style={{ flex:1,fontSize:13 }} />
    </div>
  );
}
function AgeRangeField({ value, onChange }: { value:AgeLimit; onChange:(v:AgeLimit)=>void }) {
  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
        {AGE_PRESETS.map((p) => (
          <button key={p.label} onClick={()=>onChange({min:p.min,max:p.max})} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer",transition:"all 0.12s",fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}
            onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#534AB7";e.currentTarget.style.color="#534AB7";}}
            onMouseLeave={(e)=>{e.currentTarget.style.borderColor="var(--color-border-tertiary)";e.currentTarget.style.color="var(--color-text-secondary)";}}>{p.label}</button>
        ))}
        {(value.min!==""||value.max!=="")&&<button onClick={()=>onChange({min:"",max:""})} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:"0.5px solid rgba(192,57,43,0.3)",background:"rgba(192,57,43,0.06)",color:"var(--color-text-danger)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Clear</button>}
      </div>
      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
        <div style={{ flex:1 }}><div style={{ fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em" }}>Min age</div><input type="number" min={0} max={100} placeholder="e.g. 18" value={value.min} onChange={(e)=>onChange({...value,min:e.target.value===""?""  :Number(e.target.value)})} style={{ fontSize:15,fontWeight:600,textAlign:"center" }} /></div>
        <div style={{ fontSize:18,color:"var(--color-text-tertiary)",fontWeight:300,marginTop:18 }}>–</div>
        <div style={{ flex:1 }}><div style={{ fontSize:10,color:"var(--color-text-tertiary)",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em" }}>Max age</div><input type="number" min={0} max={100} placeholder="e.g. 26" value={value.max} onChange={(e)=>onChange({...value,max:e.target.value===""?""  :Number(e.target.value)})} style={{ fontSize:15,fontWeight:600,textAlign:"center" }} /></div>
        {(value.min!==""&&value.max!=="")&&<div style={{ marginTop:18,padding:"6px 12px",borderRadius:8,background:"linear-gradient(135deg,rgba(83,74,183,0.12),rgba(83,74,183,0.06))",border:"0.5px solid rgba(83,74,183,0.2)",fontSize:12,fontWeight:600,color:"#534AB7",whiteSpace:"nowrap" }}>{value.min}–{value.max} yrs</div>}
      </div>
    </div>
  );
}
function MaxApprovalsField({ unlimited,value,onUnlimitedChange,onValueChange }: { unlimited:boolean; value:number|""; onUnlimitedChange:(v:boolean)=>void; onValueChange:(v:number|"")=>void }) {
  return (
    <div>
      <Label>Maximum approvals</Label>
      <div style={{ display:"flex",gap:6,marginBottom:10 }}>
        <button onClick={()=>onUnlimitedChange(true)} style={{ padding:"5px 14px",fontSize:12,borderRadius:100,border:`0.5px solid ${unlimited?"#534AB7":"var(--color-border-tertiary)"}`,background:unlimited?"linear-gradient(135deg,rgba(83,74,183,0.15),rgba(83,74,183,0.08))":"var(--color-background-secondary)",color:unlimited?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",fontWeight:unlimited?600:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}><i className="ti ti-infinity" style={{ fontSize:13 }} /> Unlimited</button>
        <button onClick={()=>onUnlimitedChange(false)} style={{ padding:"5px 14px",fontSize:12,borderRadius:100,border:`0.5px solid ${!unlimited?"#534AB7":"var(--color-border-tertiary)"}`,background:!unlimited?"linear-gradient(135deg,rgba(83,74,183,0.15),rgba(83,74,183,0.08))":"var(--color-background-secondary)",color:!unlimited?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",fontWeight:!unlimited?600:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}><i className="ti ti-hash" style={{ fontSize:13 }} /> Custom number</button>
      </div>
      {unlimited?(<div style={{ padding:"9px 12px",borderRadius:10,background:"rgba(83,74,183,0.06)",border:"0.5px solid rgba(83,74,183,0.15)",fontSize:12,color:"#534AB7",display:"flex",alignItems:"center",gap:6 }}><i className="ti ti-infinity" style={{ fontSize:14 }} />No cap on approvals — all eligible applicants can be approved.</div>):(
        <div><input type="number" min={1} placeholder="e.g. 10" value={value} onChange={(e)=>onValueChange(e.target.value===""?"":Number(e.target.value))} style={{ fontSize:16,fontWeight:600 }} />{value!==""&&<div style={{ marginTop:6,fontSize:11,color:"var(--color-text-secondary)" }}><i className="ti ti-info-circle" style={{ fontSize:10,marginRight:4 }} />Applications will auto-close once {value} applicants are approved.</div>}</div>
      )}
    </div>
  );
}
function DistrictChipList({ selectedStates,value,onChange }: { selectedStates:string[]; value:string[]; onChange:(v:string[])=>void }) {
  const availableDistricts = selectedStates.length>0?selectedStates.flatMap((s)=>DISTRICTS_BY_STATE[s]??[]):Object.values(DISTRICTS_BY_STATE).flat();
  const uniqueDistricts = Array.from(new Set(availableDistricts)).sort();
  const toggle = (d: string) => onChange(value.includes(d)?value.filter((x)=>x!==d):[...value,d]);
  if(!uniqueDistricts.length) return <p style={{ fontSize:12,color:"var(--color-text-tertiary)",margin:0 }}>No districts available.</p>;
  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:10 }}>
        <button onClick={()=>onChange(uniqueDistricts)} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:4 }}><i className="ti ti-select-all" style={{ fontSize:10 }} /> Select all</button>
        {value.length>0&&<button onClick={()=>onChange([])} style={{ padding:"3px 10px",fontSize:11,borderRadius:8,border:"0.5px solid rgba(192,57,43,0.25)",background:"rgba(192,57,43,0.06)",color:"var(--color-text-danger)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Clear ({value.length})</button>}
      </div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:6,maxHeight:220,overflowY:"auto",paddingRight:2 }}>
        {uniqueDistricts.map((d) => { const selected=value.includes(d); return(<span key={d} className={`district-chip ${selected?"selected":"unselected"}`} onClick={()=>toggle(d)}>{selected&&<i className="ti ti-check" style={{ fontSize:10,marginRight:4 }} />}{d}</span>); })}
      </div>
      {value.length>0&&<p style={{ fontSize:11,color:"var(--color-text-secondary)",margin:"8px 0 0" }}><i className="ti ti-circle-check" style={{ fontSize:10,marginRight:4,color:"var(--color-text-success)" }} />{value.length} district{value.length>1?"s":""} selected</p>}
    </div>
  );
}
function TieredAmountEditor({ items,onChange }: { items:TieredAmount[]; onChange:(v:TieredAmount[])=>void }) {
  const add = () => onChange([...items,{id:crypto.randomUUID(),label:"",amount:"",condition:""}]);
  const update = (id: string, patch: Partial<TieredAmount>) => onChange(items.map((t)=>t.id===id?{...t,...patch}:t));
  const remove = (id: string) => onChange(items.filter((t)=>t.id!==id));
  return (
    <div>
      {items.map((item,idx) => (
        <div key={item.id} style={{ display:"grid",gridTemplateColumns:"1fr 120px 1fr 34px",gap:8,alignItems:"flex-start",marginBottom:8,padding:"12px 14px",background:"var(--color-background-secondary)",borderRadius:12,border:"0.5px solid var(--color-border-tertiary)",animation:`cardIn 0.2s ${idx*0.05}s both` }}>
          <div><Label>Tier label</Label><input placeholder="e.g. Meritorious" value={item.label} onChange={(e)=>update(item.id,{label:e.target.value})} style={{ fontSize:13 }} /></div>
          <div><Label>Amount (₹)</Label><input type="number" placeholder="0" value={item.amount} onChange={(e)=>update(item.id,{amount:e.target.value===""?"":Number(e.target.value)})} style={{ fontSize:13 }} /></div>
          <div><Label>Condition / note</Label><input placeholder="e.g. 90%+ marks" value={item.condition} onChange={(e)=>update(item.id,{condition:e.target.value})} style={{ fontSize:13 }} /></div>
          <button onClick={()=>remove(item.id)} style={{ marginTop:22,width:34,height:34,border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,background:"none",cursor:"pointer",color:"var(--color-text-danger)",display:"flex",alignItems:"center",justifyContent:"center" }}><i className="ti ti-trash" style={{ fontSize:14 }} /></button>
        </div>
      ))}
      <button onClick={add} style={{ padding:"7px 16px",fontSize:12,border:"1px dashed var(--color-border-secondary)",borderRadius:10,background:"none",cursor:"pointer",color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:6,fontFamily:"'DM Sans',sans-serif" }} onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#534AB7";e.currentTarget.style.color="#534AB7";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="var(--color-border-secondary)";e.currentTarget.style.color="var(--color-text-secondary)";}}>
        <i className="ti ti-plus" style={{ fontSize:14 }} /> Add tier
      </button>
    </div>
  );
}

// ─── Custom Criteria Manager Modal ────────────────────────────────────────────
function CustomCriteriaManager({ customCriteria, onClose, onAdd, onEdit, onDelete, saving }: {
  customCriteria: CustomCriterion[]; onClose: () => void;
  onAdd: (label: string, description: string) => Promise<void>;
  onEdit: (id: string, label: string, description: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  saving: boolean;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim() || localSaving) return;
    setLocalSaving(true);
    await onAdd(newLabel.trim(), newDescription.trim());
    setNewLabel("");
    setNewDescription("");
    setLocalSaving(false);
  };

  const handleEdit = async (id: string) => {
    if (!editLabel.trim() || localSaving) return;
    setLocalSaving(true);
    await onEdit(id, editLabel.trim(), editDescription.trim());
    setEditingId(null);
    setLocalSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const startEdit = (c: CustomCriterion) => {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditDescription(c.description || "");
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem",backdropFilter:"blur(3px)",animation:"fadeIn 0.2s ease" }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--color-background-primary,#fff)",borderRadius:20,width:"100%",maxWidth:520,border:"0.5px solid var(--color-border-tertiary)",boxShadow:"0 12px 48px rgba(0,0,0,0.16)",animation:"slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column" }}>
        {/* Header */}
        <div style={{ height:4,background:"linear-gradient(90deg,#534AB7,#7B72D9,#0F6E56)" }} />
        <div style={{ padding:"18px 22px 14px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:12,background:"linear-gradient(135deg,rgba(83,74,183,0.05),transparent)",flexShrink:0 }}>
          <div style={{ width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#534AB7,#7B72D9)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 10px rgba(83,74,183,0.35)" }}>
            <i className="ti ti-list-check" style={{ fontSize:18,color:"#fff" }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif" }}>Custom Eligibility Criteria</div>
            <div style={{ fontSize:11,color:"var(--color-text-tertiary)",marginTop:2 }}>Define unique criteria specific to your sangha</div>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,border:"0.5px solid var(--color-border-tertiary)",borderRadius:9,background:"var(--color-background-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)" }}>
            <i className="ti ti-x" style={{ fontSize:13 }} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 18px" }}>
          {customCriteria.length === 0 && (
            <div style={{ padding:"2rem",textAlign:"center",color:"var(--color-text-tertiary)",border:"1px dashed var(--color-border-secondary)",borderRadius:12,marginBottom:16 }}>
              <i className="ti ti-list-check" style={{ fontSize:26,opacity:0.35,display:"block",marginBottom:8 }} />
              <p style={{ margin:0,fontSize:13 }}>No custom criteria yet. Add one below.</p>
            </div>
          )}
          {customCriteria.length > 0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
              {customCriteria.map((c, idx) => (
                <div key={c.id} className="custom-criterion-row" style={{ borderRadius:12,border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden",animation:`cardIn 0.2s ${idx*0.04}s both` }}>
                  {editingId === c.id ? (
                    <div style={{ padding:"12px 14px",background:"rgba(83,74,183,0.04)",display:"flex",flexDirection:"column",gap:10 }}>
                      <div>
                        <Label>Criterion label</Label>
                        <input value={editLabel} onChange={(e)=>setEditLabel(e.target.value)} placeholder="e.g. Applicant must be a Konkani speaker" style={{ fontSize:13,width:"100%",boxSizing:"border-box" }} onKeyDown={(e)=>e.key==="Enter"&&handleEdit(c.id)} autoFocus />
                      </div>
                      <div>
                        <Label>Description (optional)</Label>
                        <textarea value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} placeholder="Additional context or clarification…" rows={2} style={{ fontSize:12,width:"100%",boxSizing:"border-box",resize:"vertical" }} />
                      </div>
                      <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                        <button onClick={()=>setEditingId(null)} style={{ padding:"6px 14px",fontSize:12,border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"none",cursor:"pointer",color:"var(--color-text-secondary)",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                        <button onClick={()=>handleEdit(c.id)} disabled={!editLabel.trim()||localSaving} style={{ padding:"6px 16px",fontSize:12,fontWeight:600,border:"none",borderRadius:8,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:!editLabel.trim()||localSaving?"not-allowed":"pointer",opacity:!editLabel.trim()||localSaving?0.5:1,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                          {localSaving ? <i className="ti ti-loader-2 ti-spin" style={{ fontSize:11 }} /> : <i className="ti ti-check" style={{ fontSize:11 }} />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10 }}>
                      <div style={{ width:28,height:28,borderRadius:8,background:"rgba(83,74,183,0.1)",border:"0.5px solid rgba(83,74,183,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                        <i className="ti ti-list-check" style={{ fontSize:13,color:"#534AB7" }} />
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:"var(--color-text-primary)",lineHeight:1.4 }}>{c.label}</div>
                        {c.description && <div style={{ fontSize:11,color:"var(--color-text-tertiary)",marginTop:3,lineHeight:1.5 }}>{c.description}</div>}
                      </div>
                      <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                        <button onClick={()=>startEdit(c)} style={{ width:28,height:28,border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)" }}>
                          <i className="ti ti-edit" style={{ fontSize:12 }} />
                        </button>
                        <button onClick={()=>handleDelete(c.id)} disabled={deletingId===c.id} style={{ width:28,height:28,border:"0.5px solid rgba(192,57,43,0.25)",borderRadius:8,background:"rgba(192,57,43,0.05)",cursor:deletingId===c.id?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-danger)",opacity:deletingId===c.id?0.5:1 }}>
                          {deletingId===c.id ? <i className="ti ti-loader-2 ti-spin" style={{ fontSize:11 }} /> : <i className="ti ti-trash" style={{ fontSize:12 }} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:14 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:12 }}>Add new criterion</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div>
                <Label>Eligibility statement</Label>
                <input value={newLabel} onChange={(e)=>setNewLabel(e.target.value)} placeholder="e.g. Applicant must be a Konkani speaker" style={{ fontSize:13,width:"100%",boxSizing:"border-box" }} onKeyDown={(e)=>{ if(e.key==="Enter"&&newLabel.trim()) handleAdd(); }} />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <textarea value={newDescription} onChange={(e)=>setNewDescription(e.target.value)} placeholder="Add context or clarification for this criterion…" rows={2} style={{ fontSize:12,width:"100%",boxSizing:"border-box",resize:"vertical" }} />
              </div>
              <button onClick={handleAdd} disabled={!newLabel.trim()||localSaving} style={{ padding:"9px 18px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:!newLabel.trim()||localSaving?"not-allowed":"pointer",opacity:!newLabel.trim()||localSaving?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"'DM Sans',sans-serif",boxShadow:newLabel.trim()?"0 2px 10px rgba(83,74,183,0.3)":"none",transition:"all 0.2s" }}>
                {localSaving ? <i className="ti ti-loader-2 ti-spin" style={{ fontSize:13 }} /> : <i className="ti ti-plus" style={{ fontSize:14 }} />}
                {localSaving ? "Adding…" : "Add criterion"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Criteria Coverage Editor (inside scholarship form) ─────────────────
function CustomCriteriaFormSection({ customCriteria, values, onChange }: {
  customCriteria: CustomCriterion[];
  values: CustomCriteriaValue[];
  onChange: (v: CustomCriteriaValue[]) => void;
}) {
  const getCoverage = (criterionId: string): CustomCoverageCoverage => {
    return values.find((v) => v.criterionId === criterionId)?.coverage ?? "all";
  };

  const setCoverage = (criterion: CustomCriterion, coverage: CustomCoverageCoverage) => {
    const existing = values.find((v) => v.criterionId === criterion.id);
    if (coverage === "all") {
      onChange(values.filter((v) => v.criterionId !== criterion.id));
    } else if (existing) {
      onChange(values.map((v) => v.criterionId === criterion.id ? { ...v, coverage } : v));
    } else {
      onChange([...values, { criterionId: criterion.id, label: criterion.label, description: criterion.description, coverage }]);
    }
  };

  if (customCriteria.length === 0) {
    return (
      <div style={{ padding:"14px 16px",borderRadius:12,background:"var(--color-background-secondary)",border:"1px dashed var(--color-border-secondary)",textAlign:"center" }}>
        <i className="ti ti-list-check" style={{ fontSize:20,color:"var(--color-text-tertiary)",opacity:0.4,display:"block",marginBottom:6 }} />
        <p style={{ margin:0,fontSize:12,color:"var(--color-text-tertiary)" }}>No custom criteria defined yet. Click "Manage criteria" above to add some.</p>
      </div>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      {customCriteria.map((criterion) => {
        const current = getCoverage(criterion.id);
        return (
          <div key={criterion.id} style={{ padding:"12px 14px",borderRadius:12,border:`0.5px solid ${current==="must_have"?"rgba(15,110,86,0.3)":current==="must_not_have"?"rgba(192,57,43,0.3)":"var(--color-border-tertiary)"}`,background:current==="must_have"?"rgba(15,110,86,0.04)":current==="must_not_have"?"rgba(192,57,43,0.04)":"var(--color-background-secondary)",transition:"all 0.15s ease" }}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"var(--color-text-primary)",lineHeight:1.4,marginBottom:criterion.description?3:0 }}>{criterion.label}</div>
              {criterion.description && <div style={{ fontSize:11,color:"var(--color-text-tertiary)",lineHeight:1.5 }}>{criterion.description}</div>}
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {CUSTOM_COVERAGE_OPTIONS.map((opt) => {
                const isSelected = current === opt.value;
                const colorMap: Record<string,string> = {
                  "all": "var(--color-text-tertiary)",
                  "must_have": "var(--color-text-success)",
                  "must_not_have": "var(--color-text-danger)",
                };
                const bgMap: Record<string,string> = {
                  "all": "var(--color-background-primary)",
                  "must_have": "rgba(15,110,86,0.1)",
                  "must_not_have": "rgba(192,57,43,0.08)",
                };
                const borderMap: Record<string,string> = {
                  "all": "var(--color-border-secondary)",
                  "must_have": "rgba(15,110,86,0.35)",
                  "must_not_have": "rgba(192,57,43,0.3)",
                };
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCoverage(criterion, opt.value)}
                    style={{ padding:"5px 13px",fontSize:12,borderRadius:100,border:`0.5px solid ${isSelected?borderMap[opt.value]:"var(--color-border-tertiary)"}`,background:isSelected?bgMap[opt.value]:"var(--color-background-primary)",color:isSelected?colorMap[opt.value]:"var(--color-text-secondary)",cursor:"pointer",fontWeight:isSelected?700:400,transition:"all 0.15s ease",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}
                  >
                    <i className={`ti ${opt.icon}`} style={{ fontSize:11 }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories,onClose,onAdd }: { categories:ScholarshipCategory[]; onClose:()=>void; onAdd:(c:ScholarshipCategory)=>void }) {
  const [name, setName] = useState("");
  const PALETTE = ["#534AB7","#0F6E56","#993C1D","#185FA5","#854F0B","#64748b","#C0392B","#2D6A4F","#7B3F00","#1A237E"];
  const [color, setColor] = useState(PALETTE[0]);
  const handleAdd = () => { if(!name.trim()) return; onAdd({ id:crypto.randomUUID(),name:name.trim(),color }); setName(""); };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem",backdropFilter:"blur(2px)",animation:"fadeIn 0.2s ease" }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#ffffff",borderRadius:20,width:"100%",maxWidth:460,border:"1px solid rgba(0,0,0,0.08)",boxShadow:"0 8px 40px rgba(0,0,0,0.12)",animation:"slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",overflow:"hidden" }}>
        <div style={{ padding:"18px 22px",borderBottom:"1px solid rgba(0,0,0,0.08)",background:"#f8f9fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",display:"flex",alignItems:"center",justifyContent:"center" }}><i className="ti ti-category" style={{ fontSize:16,color:"#fff" }} /></div>
            <div><div style={{ fontSize:14,fontWeight:600,color:"#1a1a2e" }}>Scholarship Categories</div><div style={{ fontSize:11,color:"#6b7280" }}>{categories.length} categories</div></div>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,border:"1px solid rgba(0,0,0,0.1)",borderRadius:8,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280" }}><i className="ti ti-x" style={{ fontSize:13 }} /></button>
        </div>
        <div style={{ padding:"16px 22px" }}>
          {categories.length > 0 && (
            <div style={{ marginBottom:16,display:"flex",flexDirection:"column",gap:6 }}>
              {categories.map((cat)=>(
                <div key={cat.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 13px",borderRadius:10,background:"#f8f9fa",border:"1px solid rgba(0,0,0,0.07)" }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0 }} />
                  <span style={{ fontSize:13,color:"#1a1a2e",flex:1 }}>{cat.name}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop:categories.length>0?"1px solid rgba(0,0,0,0.07)":"none",paddingTop:categories.length>0?14:0 }}>
            <label style={{ fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:10 }}>Add new category</label>
            <input placeholder="Category name…" value={name} onChange={(e)=>setName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleAdd()} style={{ width:"100%",fontSize:13,padding:"9px 12px",borderRadius:10,border:"1px solid rgba(0,0,0,0.12)",background:"#f8f9fa",color:"#1a1a2e",boxSizing:"border-box",marginBottom:12,outline:"none" }} />
            <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:14 }}>
              {PALETTE.map((c)=>(<button key={c} onClick={()=>setColor(c)} style={{ width:26,height:26,borderRadius:7,background:c,border:color===c?"2.5px solid #1a1a2e":"2.5px solid transparent",cursor:"pointer",transition:"all 0.12s",boxShadow:color===c?"0 0 0 3px rgba(0,0,0,0.12)":"none" }} />))}
            </div>
            <button onClick={handleAdd} disabled={!name.trim()} style={{ width:"100%",padding:"10px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,color:"#fff",cursor:name.trim()?"pointer":"not-allowed",opacity:name.trim()?1:0.45,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"linear-gradient(135deg,#534AB7 0%,#7B72D9 100%)",boxShadow:name.trim()?"0 2px 12px rgba(83,74,183,0.35)":"none",transition:"all 0.2s ease" }}><i className="ti ti-plus" style={{ fontSize:14 }} /> Add category</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubSectionHeader({ label }: { label: string }) {
  return <div style={{ fontSize:10,fontWeight:700,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.1em",padding:"6px 0 2px",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:4 }}>{label}</div>;
}

// ─── Scholarship Form ──────────────────────────────────────────────────────────
function ScholarshipForm({ scholarship,onChange,onSave,onCancel,saving,categories,onManageCategories,customCriteria,onManageCustomCriteria }: {
  scholarship:Scholarship; onChange:(s:Scholarship)=>void; onSave:()=>void; onCancel:()=>void; saving:boolean;
  categories:ScholarshipCategory[]; onManageCategories:()=>void;
  customCriteria: CustomCriterion[]; onManageCustomCriteria: () => void;
}) {
  const c = scholarship.criteria;
  const updateCriteria = (patch: Partial<ScholarshipCriteria>) => onChange({...scholarship,criteria:{...c,...patch}});
  return (
    <div style={{ animation:"fadeIn 0.25s ease" }}>
      <div style={{ background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:16,padding:"22px",marginBottom:"1rem",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <Field label="Scholarship name"><input placeholder="e.g. Konkani Community Merit Scholarship 2025" value={scholarship.name} onChange={(e)=>onChange({...scholarship,name:e.target.value})} style={{ fontSize:16,fontWeight:600,marginBottom:14,fontFamily:"'DM Serif Display',serif" }} /></Field>
        <div style={{ marginBottom:14 }}>
          <Label>Scholarship category</Label>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <select value={scholarship.categoryId} onChange={(e)=>onChange({...scholarship,categoryId:e.target.value})} style={{ flex:1,fontSize:13 }}>
              <option value="">— Select a category —</option>
              {categories.map((cat)=>(<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
            <button onClick={onManageCategories} className="action-btn" style={{ padding:"8px 14px",fontSize:12,border:"0.5px solid var(--color-border-secondary)",borderRadius:10,background:"none",cursor:"pointer",color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif" }}>
              <i className="ti ti-plus" style={{ fontSize:13 }} /> Add category
            </button>
          </div>
        </div>
        <Field label="Description / purpose"><textarea placeholder="Briefly describe the scholarship purpose…" value={scholarship.description} onChange={(e)=>onChange({...scholarship,description:e.target.value})} rows={4} style={{ fontSize:13,resize:"vertical",width:"100%",boxSizing:"border-box" }} /></Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14 }}>
          <div><Label>Base scholarship amount (₹)</Label><input type="number" placeholder="10000" value={scholarship.baseAmount} onChange={(e)=>onChange({...scholarship,baseAmount:e.target.value===""?"":Number(e.target.value)})} style={{ fontSize:16,fontWeight:600 }} /></div>
          <div><Label>Status</Label><select value={scholarship.status} onChange={(e)=>onChange({...scholarship,status:e.target.value as Scholarship["status"]})} style={{ fontSize:13 }}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></div>
        </div>
        <div style={{ marginTop:14 }}><Label>Tiered / conditional amounts</Label><TieredAmountEditor items={scholarship.tieredAmounts} onChange={(v)=>onChange({...scholarship,tieredAmounts:v})} /></div>
      </div>

      <SectionCard title="Application Settings" icon="ti-settings-2" accent="#185FA5">
        <Row>
          <Field label="Visibility">
            <select value={scholarship.visibility} onChange={(e)=>onChange({...scholarship,visibility:e.target.value as VisibilityType})} style={{ fontSize:13 }}><option value="primary_sangha_only">Only members of this sangha</option><option value="all_users">All users on the platform</option></select>
          </Field>
          <MaxApprovalsField unlimited={scholarship.maxApprovalsUnlimited} value={scholarship.maxApprovals} onUnlimitedChange={(v)=>onChange({...scholarship,maxApprovalsUnlimited:v})} onValueChange={(v)=>onChange({...scholarship,maxApprovals:v})} />
        </Row>
        <Row>
          <Field label="Application open date"><input type="date" value={scholarship.applicationStart} max={scholarship.applicationEnd||undefined} onChange={(e)=>{const v=e.target.value;onChange({...scholarship,applicationStart:v,applicationEnd:scholarship.applicationEnd&&v&&scholarship.applicationEnd<v?"":scholarship.applicationEnd,disbursementDate:scholarship.disbursementDate&&v&&scholarship.disbursementDate<v?"":scholarship.disbursementDate});}} style={{ fontSize:13 }} /></Field>
          <Field label="Application close date"><input type="date" value={scholarship.applicationEnd} min={scholarship.applicationStart||undefined} max={scholarship.disbursementDate||undefined} onChange={(e)=>{const v=e.target.value;onChange({...scholarship,applicationEnd:v,disbursementDate:scholarship.disbursementDate&&v&&scholarship.disbursementDate<=v?"":scholarship.disbursementDate});}} style={{ fontSize:13 }} /></Field>
          <Field label="Disbursement date" hint="Expected date funds will be transferred"><input type="date" value={scholarship.disbursementDate} min={scholarship.applicationEnd?scholarship.applicationEnd:scholarship.applicationStart||undefined} onChange={(e)=>onChange({...scholarship,disbursementDate:e.target.value})} style={{ fontSize:13 }} /></Field>
        </Row>
      </SectionCard>

      <SectionCard title="Personal Eligibility Criteria" icon="ti-user-check" accent="#534AB7">
        <Field label="Age range"><AgeRangeField value={c.ageLimit} onChange={(v)=>updateCriteria({ageLimit:v})} /></Field>
        <Row>
          <Field label="Gender"><RadioGroup<GenderEligibility> options={[{label:"All",value:"all"},{label:"Male",value:"male"},{label:"Female",value:"female"},{label:"Other",value:"other"}]} value={c.gender} onChange={(v)=>updateCriteria({gender:v})} /></Field>
          <Field label="Marital status"><RadioGroup<MaritalStatus> options={[{label:"Any",value:"all"},{label:"Married",value:"married"},{label:"Single",value:"single_never_married"},{label:"Divorced",value:"single_divorced"},{label:"Widowed",value:"single_widowed"}]} value={c.maritalStatus} onChange={(v)=>updateCriteria({maritalStatus:v})} /></Field>
        </Row>
        <Row><Field label="Disability"><TriToggle value={c.disabilityRequired} onChange={(v)=>updateCriteria({disabilityRequired:v})} /></Field><Field label="Single parent family"><TriToggle value={c.singleParentFamily} onChange={(v)=>updateCriteria({singleParentFamily:v})} /></Field></Row>
        <Row><Field label="Orphan status"><TriToggle value={c.orphan} onChange={(v)=>updateCriteria({orphan:v})} /></Field><Field label="Minority community"><TriToggle value={c.minorityCommunity} onChange={(v)=>updateCriteria({minorityCommunity:v})} /></Field></Row>
        <Field label="Religion"><MultiSelect options={RELIGIONS} value={c.religion} onChange={(v)=>updateCriteria({religion:v})} /></Field>
        <Field label="Caste / community"><input placeholder="e.g. OBC, SC, ST, General" value={c.caste.join(", ")} onChange={(e)=>updateCriteria({caste:e.target.value.split(",").map((s)=>s.trim()).filter(Boolean)})} style={{ fontSize:13 }} /></Field>
      </SectionCard>

      <SectionCard title="Residential & Regional Criteria" icon="ti-map-pin" accent="#993C1D">
        <Field label="State eligibility"><MultiSelect options={INDIAN_STATES} value={c.states} onChange={(v)=>updateCriteria({states:v,districts:[]})} showSelectAll /></Field>
        <Field label="District eligibility"><DistrictChipList selectedStates={c.states} value={c.districts} onChange={(v)=>updateCriteria({districts:v})} /></Field>
      </SectionCard>

      <SectionCard title="Academic & Education Criteria" icon="ti-school" accent="#185FA5">
        <Field label="Education level"><MultiSelect options={EDUCATION_LEVELS} value={c.educationLevels} onChange={(v)=>updateCriteria({educationLevels:v})} /></Field>
        <Row><Field label="Min CGPA"><input type="number" min={0} max={10} step={0.1} placeholder="leave blank for any" value={c.cgpaMin} onChange={(e)=>updateCriteria({cgpaMin:e.target.value===""?"":Number(e.target.value)})} style={{ fontSize:13 }} /></Field><Field label="Min percentage (%)"><input type="number" min={0} max={100} step={0.1} placeholder="leave blank for any" value={c.percentageMin} onChange={(e)=>updateCriteria({percentageMin:e.target.value===""?"":Number(e.target.value)})} style={{ fontSize:13 }} /></Field></Row>
        <Row><Field label="Merit-based"><TriToggle value={c.meritBased} onChange={(v)=>updateCriteria({meritBased:v})} /></Field><Field label="Currently studying"><TriToggle value={c.currentlyStudying} onChange={(v)=>updateCriteria({currentlyStudying:v})} /></Field></Row>
        <Row><Field label="Sports / arts quota"><TriToggle value={c.sportsQuota} onChange={(v)=>updateCriteria({sportsQuota:v})} /></Field><Field label="Employment status"><RadioGroup<ScholarshipCriteria["employmentStatus"]> options={[{label:"Any",value:"all"},{label:"Employed",value:"employed"},{label:"Unemployed",value:"unemployed"},{label:"Self-employed",value:"self_employed"}]} value={c.employmentStatus} onChange={(v)=>updateCriteria({employmentStatus:v})} /></Field></Row>
      </SectionCard>

      <SectionCard title="Financial & Economic Criteria" icon="ti-currency-rupee" accent="#854F0B">
        <Row><Field label="Annual family income (₹)"><NumberRange min={c.annualFamilyIncome.min} max={c.annualFamilyIncome.max} onMinChange={(v)=>updateCriteria({annualFamilyIncome:{...c.annualFamilyIncome,min:v}})} onMaxChange={(v)=>updateCriteria({annualFamilyIncome:{...c.annualFamilyIncome,max:v}})} /></Field><Field label="Self income (₹)"><NumberRange min={c.selfIncome.min} max={c.selfIncome.max} onMinChange={(v)=>updateCriteria({selfIncome:{...c.selfIncome,min:v}})} onMaxChange={(v)=>updateCriteria({selfIncome:{...c.selfIncome,max:v}})} /></Field></Row>
        <Row><Field label="EWS only"><TriToggle value={c.ewsOnly} onChange={(v)=>updateCriteria({ewsOnly:v})} /></Field><Field label="House ownership"><RadioGroup<ScholarshipCriteria["houseOwnership"]> options={[{label:"Any",value:"all"},{label:"Owns",value:"owns"},{label:"Renting",value:"rents"},{label:"None",value:"none"}]} value={c.houseOwnership} onChange={(v)=>updateCriteria({houseOwnership:v})} /></Field></Row>
        <SubSectionHeader label="Insurance" />
        <Row cols="1fr 1fr 1fr"><Field label="Health"><TriToggle value={c.healthInsurance} onChange={(v)=>updateCriteria({healthInsurance:v})} /></Field><Field label="Life"><TriToggle value={c.lifeInsurance} onChange={(v)=>updateCriteria({lifeInsurance:v})} /></Field><Field label="Term"><TriToggle value={c.termInsurance} onChange={(v)=>updateCriteria({termInsurance:v})} /></Field></Row>
        <SubSectionHeader label="Documents" />
        <Row><Field label="Aadhaar"><DocCardToggle value={c.aadhaar} onChange={(v)=>updateCriteria({aadhaar:v})} /></Field><Field label="PAN"><DocCardToggle value={c.pan} onChange={(v)=>updateCriteria({pan:v})} /></Field></Row>
        <Row><Field label="Voter ID"><DocCardToggle value={c.voterId} onChange={(v)=>updateCriteria({voterId:v})} /></Field><Field label="Driving licence"><DocCardToggle value={c.drivingLicense} onChange={(v)=>updateCriteria({drivingLicense:v})} /></Field></Row>
      </SectionCard>

      {/* ─── Custom Criteria Section — Manage button lives here now ────────── */}
      <SectionCard title="Custom Sangha Criteria" icon="ti-list-check" accent="#0F6E56">
        {/* Header row: description + Manage criteria button */}
        <div style={{ display:"flex",alignItems:"flex-start",gap:12,justifyContent:"space-between" }}>
          <p style={{ margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.6,flex:1 }}>
            Set eligibility rules specific to your sangha. These are defined only for your organisation and won't appear for others.
          </p>
          <button
            onClick={onManageCustomCriteria}
            className="action-btn"
            style={{
              padding:"7px 14px",fontSize:12,
              border:"0.5px solid rgba(83,74,183,0.35)",
              borderRadius:10,
              background:"rgba(83,74,183,0.08)",
              cursor:"pointer",color:"#534AB7",
              display:"flex",alignItems:"center",gap:6,
              whiteSpace:"nowrap",
              fontFamily:"'DM Sans',sans-serif",
              fontWeight:600,flexShrink:0,
            }}
          >
            <i className="ti ti-settings" style={{ fontSize:13 }} />
            create your custom criteria
          </button>
        </div>

        <CustomCriteriaFormSection
          customCriteria={customCriteria}
          values={scholarship.customCriteriaValues}
          onChange={(v) => onChange({ ...scholarship, customCriteriaValues: v })}
        />
      </SectionCard>

      <div style={{ position:"sticky",bottom:0,zIndex:10,display:"flex",gap:10,justifyContent:"flex-end",padding:"14px 0 8px",background:"linear-gradient(to top,var(--color-background-primary) 70%,transparent)" }}>
        <button onClick={onCancel} disabled={saving} className="action-btn" style={{ padding:"9px 22px",fontSize:13,border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,background:"none",cursor:saving?"not-allowed":"pointer",color:"var(--color-text-secondary)",fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}>Cancel</button>
        <button onClick={onSave} disabled={saving} className="action-btn primary-btn" style={{ padding:"9px 26px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,color:"#fff",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"'DM Sans',sans-serif" }}>{saving&&<i className="ti ti-loader-2 ti-spin" style={{ fontSize:14 }} />}{saving?"Saving…":"Save scholarship"}</button>
      </div>
    </div>
  );
}

// ─── Inline Beneficiaries Panel ───────────────────────────────────────────────
interface LastSlotPending { applicationId: string; scholarshipName: string; maxApprovals: number; }

function BeneficiariesPanel({ scholarship, onClose, pushToast, onCountChange, onScholarshipAutoClose }: {
  scholarship: Scholarship; onClose: () => void; pushToast: (type: Toast["type"], msg: string) => void;
  onCountChange: (delta: number) => void; onScholarshipAutoClose: () => void;
}) {
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [memberSearch, setMemberSearch] = useState("");
  const [lastSlotPending, setLastSlotPending] = useState<LastSlotPending | null>(null);
  const [lastSlotLoading, setLastSlotLoading] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<{ profileId:string; applicantName:string; familyMemberName?:string|null; familyMemberRelation?:string|null } | null>(null);

  const approvedCount = applicants.filter((a) => a.approval_status === "approved").length;
  const pendingCount  = applicants.filter((a) => a.approval_status === "pending").length;
  const rejectedCount = applicants.filter((a) => a.approval_status === "rejected").length;
  const isUnlimited   = scholarship.maxApprovalsUnlimited;
  const maxApprovals  = scholarship.maxApprovals;
  const isFull = !isUnlimited && maxApprovals !== "" && typeof maxApprovals === "number" && approvedCount >= maxApprovals;
  const isLastSlot = (currentApproved: number) => !isUnlimited && maxApprovals !== "" && typeof maxApprovals === "number" && currentApproved + 1 >= maxApprovals;

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<ApplicantRow[]>(`/api/sangha/scholarships/${scholarship.id}/applicants`);
        setApplicants(data);
      } catch (err) {
        pushToast("error", (err as Error).message || "Failed to load applicants");
      } finally {
        setLoading(false);
      }
    })();
  }, [scholarship.id, pushToast]);

  const groups: ApplicantGroup[] = useMemo(() => {
    const map = new Map<string, ApplicantGroup>();
    for (const a of applicants) {
      if (!map.has(a.profile_id)) {
        map.set(a.profile_id, { profile_id:a.profile_id,full_name:a.full_name,email:a.email,phone:a.phone,age:a.age,gender:a.gender,city:a.city,state:a.state,family_income:a.family_income,applications:[] });
      }
      map.get(a.profile_id)!.applications.push(a);
    }
    return Array.from(map.values());
  }, [applicants]);

  const filteredGroups = useMemo(() => {
    let gs = groups;
    gs = gs.map((g) => ({ ...g, applications: g.applications.filter((a) => a.approval_status === filterTab) })).filter((g) => g.applications.length > 0);
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      gs = gs.filter((g) => g.full_name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
    }
    return gs;
  }, [groups, filterTab, memberSearch]);

  const doUpdateStatus = async (applicationId: string, action: "approve" | "reject" | "revoke") => {
    const prevStatus = applicants.find((a) => a.application_id === applicationId)?.approval_status;
    setProcessingId(applicationId);
    try {
      const raw = await fetch(`${API_BASE}/api/sangha/scholarships/${scholarship.id}/applicants/${applicationId}`, { method:"PATCH",headers:getAuthHeaders(),body:JSON.stringify({ action }) });
      const json = await raw.json();
      if (!raw.ok) throw new Error(json.message ?? `Request failed: ${raw.status}`);
      const { newStatus, quotaFull } = json;
      setApplicants((prev) => prev.map((a) => a.application_id === applicationId ? { ...a, approval_status: newStatus as ApplicantRow["approval_status"] } : a));
      const delta = action==="approve"?1:action==="revoke"&&prevStatus==="approved"?-1:0;
      if (delta !== 0) onCountChange(delta);
      pushToast("success", action==="approve"?"Application approved":action==="reject"?"Application rejected":"Approval revoked");
      if (quotaFull) onScholarshipAutoClose();
      return { quotaFull };
    } catch (err) {
      pushToast("error", (err as Error).message || `Failed to ${action}`);
      return { quotaFull: false };
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveClick = (applicationId: string) => {
    if (isFull) return;
    if (isLastSlot(approvedCount)) {
      setLastSlotPending({ applicationId, scholarshipName:scholarship.name, maxApprovals:maxApprovals as number });
    } else {
      doUpdateStatus(applicationId, "approve");
    }
  };

  const handleLastSlotConfirm = async () => {
    if (!lastSlotPending) return;
    setLastSlotLoading(true);
    await doUpdateStatus(lastSlotPending.applicationId, "approve");
    setLastSlotLoading(false);
    setLastSlotPending(null);
  };

  const handleApproveAll = async () => {
    const pendingApps = applicants.filter((a) => a.approval_status === "pending");
    for (const app of pendingApps) {
      if (isFull) break;
      if (isLastSlot(applicants.filter((a) => a.approval_status === "approved").length)) {
        setLastSlotPending({ applicationId:app.application_id, scholarshipName:scholarship.name, maxApprovals:maxApprovals as number });
        break;
      }
      await doUpdateStatus(app.application_id, "approve");
    }
  };

  const statusMeta = (s: ApplicantRow["approval_status"]) => {
    if (s === "approved") return { bg:"rgba(15,110,86,0.1)",color:"var(--color-text-success)",border:"rgba(15,110,86,0.25)",label:"Approved",icon:"ti-circle-check" };
    if (s === "rejected") return { bg:"rgba(192,57,43,0.08)",color:"var(--color-text-danger)",border:"rgba(192,57,43,0.2)",label:"Rejected",icon:"ti-circle-x" };
    return { bg:"var(--color-background-secondary)",color:"var(--color-text-secondary)",border:"var(--color-border-tertiary)",label:"Pending",icon:"ti-clock" };
  };

  return (
    <>
      {lastSlotPending && <LastSlotModal scholarshipName={lastSlotPending.scholarshipName} maxApprovals={lastSlotPending.maxApprovals} onConfirm={handleLastSlotConfirm} onCancel={()=>setLastSlotPending(null)} loading={lastSlotLoading} />}
      {viewingProfile && <ProfileViewerModal scholarshipId={scholarship.id} profileId={viewingProfile.profileId} applicantName={viewingProfile.applicantName} familyMemberName={viewingProfile.familyMemberName} familyMemberRelation={viewingProfile.familyMemberRelation} onClose={()=>setViewingProfile(null)} />}

      <div className="inline-panel" style={{ marginTop:0,border:"0.5px solid rgba(83,74,183,0.25)",borderTop:"2px solid #534AB7",borderRadius:"0 0 16px 16px",background:"var(--color-background-primary)",overflow:"hidden",boxShadow:"0 6px 24px rgba(83,74,183,0.1)" }}>
        <div style={{ padding:"14px 18px",background:"linear-gradient(135deg,rgba(83,74,183,0.07),rgba(83,74,183,0.03))",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#534AB7,#7B72D9)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><i className="ti ti-users-check" style={{ fontSize:14,color:"#fff" }} /></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:700,color:"var(--color-text-primary)" }}>Beneficiaries — {scholarship.name}</div>
            <div style={{ fontSize:11,color:"var(--color-text-tertiary)",marginTop:1 }}>Review and manage applications</div>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,border:"0.5px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)" }}><i className="ti ti-x" style={{ fontSize:12 }} /></button>
        </div>

        <div style={{ padding:"16px 18px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14 }}>
            {[
              { label:"Approved",count:approvedCount,color:"var(--color-text-success)",bg:"rgba(15,110,86,0.08)",border:"rgba(15,110,86,0.2)",icon:"ti-circle-check" },
              { label:"Rejected",count:rejectedCount,color:"var(--color-text-danger)",bg:"rgba(192,57,43,0.06)",border:"rgba(192,57,43,0.18)",icon:"ti-circle-x" },
            ].map((s) => (
              <div key={s.label} style={{ padding:"10px 12px",borderRadius:10,background:s.bg,border:`0.5px solid ${s.border}`,display:"flex",alignItems:"center",gap:8 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize:15,color:s.color,flexShrink:0 }} />
                <div><div style={{ fontSize:18,fontWeight:700,color:s.color,fontFamily:"'DM Serif Display',serif",lineHeight:1 }}>{s.count}</div><div style={{ fontSize:10,color:"var(--color-text-tertiary)",marginTop:1 }}>{s.label}</div></div>
              </div>
            ))}
          </div>

          {!isUnlimited && maxApprovals !== "" && typeof maxApprovals === "number" && (
            <div style={{ marginBottom:14,padding:"10px 14px",background:"var(--color-background-secondary)",borderRadius:10,border:`0.5px solid ${isFull?"rgba(192,57,43,0.25)":"var(--color-border-tertiary)"}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ fontSize:11,fontWeight:600,color:"var(--color-text-secondary)" }}>Approval quota</span>
                <span style={{ fontSize:11,fontWeight:700,color:isFull?"var(--color-text-danger)":"var(--color-text-primary)" }}>{approvedCount} / {maxApprovals}{isFull?" — FULL":""}</span>
              </div>
              <div style={{ height:5,borderRadius:3,background:"var(--color-background-primary)",overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${Math.min(100,(approvedCount/maxApprovals)*100)}%`,background:isFull?"#C0392B":"linear-gradient(90deg,#534AB7,#7B72D9)",borderRadius:3,transition:"width 0.4s ease" }} />
              </div>
            </div>
          )}

          <div style={{ display:"flex",gap:4,marginBottom:10,background:"var(--color-background-secondary)",borderRadius:10,padding:3,border:"0.5px solid var(--color-border-tertiary)" }}>
            {[{key:"pending",label:`Pending (${pendingCount})`},{key:"approved",label:`Approved (${approvedCount})`},{key:"rejected",label:`Rejected (${rejectedCount})`}].map((t) => (
              <button key={t.key} onClick={()=>setFilterTab(t.key as typeof filterTab)} style={{ flex:1,padding:"6px 8px",fontSize:11,fontWeight:filterTab===t.key?700:500,borderRadius:7,border:"none",background:filterTab===t.key?"var(--color-background-primary)":"transparent",color:filterTab===t.key?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",boxShadow:filterTab===t.key?"0 1px 3px rgba(0,0,0,0.08)":"none",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s" }}>{t.label}</button>
            ))}
          </div>

          {filterTab === "pending" && pendingCount > 0 && (
            <div style={{ marginBottom:12,display:"flex",justifyContent:"flex-end" }}>
              <button disabled={!!processingId||isFull} onClick={handleApproveAll} className="action-btn" style={{ padding:"6px 16px",fontSize:12,fontWeight:600,border:"0.5px solid rgba(15,110,86,0.35)",borderRadius:9,background:"rgba(15,110,86,0.1)",color:"var(--color-text-success)",cursor:isFull||!!processingId?"not-allowed":"pointer",opacity:isFull?0.4:1,display:"flex",alignItems:"center",gap:6,fontFamily:"'DM Sans',sans-serif" }}>
                <i className="ti ti-checks" style={{ fontSize:13 }} /> Approve all ({pendingCount})
              </button>
            </div>
          )}

          <div style={{ position:"relative",marginBottom:12 }}>
            <i className="ti ti-search" style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"var(--color-text-tertiary)",pointerEvents:"none" }} />
            <input placeholder="Search by name or email…" value={memberSearch} onChange={(e)=>setMemberSearch(e.target.value)} style={{ width:"100%",boxSizing:"border-box",paddingLeft:30,fontSize:12,borderRadius:9 }} />
          </div>

          {loading && (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {[1,2].map((i) => (<div key={i} style={{ padding:"12px 14px",borderRadius:12,border:"0.5px solid var(--color-border-tertiary)" }}><div style={{ display:"flex",gap:10 }}><div className="skeleton" style={{ width:36,height:36,borderRadius:"50%" }} /><div style={{ flex:1 }}><div className="skeleton" style={{ height:12,width:"40%",marginBottom:6 }} /><div className="skeleton" style={{ height:10,width:"60%" }} /></div></div></div>))}
            </div>
          )}

          {!loading && applicants.length === 0 && (
            <div style={{ padding:"2.5rem 1rem",textAlign:"center",color:"var(--color-text-tertiary)" }}>
              <i className="ti ti-inbox" style={{ fontSize:28,opacity:0.4,display:"block",marginBottom:8 }} />
              <p style={{ margin:0,fontSize:13 }}>No applications received yet.</p>
            </div>
          )}

          {!loading && applicants.length > 0 && filteredGroups.length === 0 && (
            <div style={{ padding:"1.5rem",textAlign:"center",color:"var(--color-text-tertiary)",border:"1px dashed var(--color-border-secondary)",borderRadius:12 }}>
              <p style={{ margin:0,fontSize:13 }}>No {filterTab} applications.</p>
            </div>
          )}

          {!loading && filteredGroups.length > 0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {filteredGroups.map((group, gi) => (
                <div key={group.profile_id} className="applicant-group" style={{ border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden",animationDelay:`${gi*0.05}s` }}>
                  <div style={{ padding:"10px 14px",background:"var(--color-background-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",gap:10 }}>
                    <Avatar name={group.full_name||"?"} size={32} />
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:12,fontWeight:700,color:"var(--color-text-primary)" }}>{group.full_name}</div>
                      <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:2 }}>
                        {group.email&&<span style={{ fontSize:10,color:"var(--color-text-tertiary)" }}>{group.email}</span>}
                        {group.age>0&&<span style={{ fontSize:10,color:"var(--color-text-secondary)" }}>{group.age}y · {group.gender}</span>}
                        {(group.city||group.state)&&<span style={{ fontSize:10,color:"var(--color-text-tertiary)" }}><i className="ti ti-map-pin" style={{ fontSize:8,marginRight:2 }} />{[group.city,group.state].filter(Boolean).join(", ")}</span>}
                        {group.family_income&&<span style={{ fontSize:10,padding:"0 6px",borderRadius:5,background:"rgba(15,110,86,0.08)",color:"var(--color-text-success)" }}>{parseIncome(group.family_income)}/yr</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:10,padding:"2px 8px",borderRadius:6,background:"rgba(83,74,183,0.08)",color:"#534AB7",fontWeight:600 }}>{group.applications.length} app{group.applications.length!==1?"s":""}</span>
                  </div>

                  {group.applications.map((app, ai) => {
                    const sm = statusMeta(app.approval_status);
                    const isProcessing = processingId === app.application_id;
                    const isSelf = !app.family_member_id;
                    return (
                      <div key={app.application_id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:ai<group.applications.length-1?"0.5px solid var(--color-border-tertiary)":"none",background:"var(--color-background-primary)" }}>
                        <div style={{ width:22,height:22,borderRadius:"50%",flexShrink:0,background:isSelf?"linear-gradient(135deg,#534AB7,#7B72D9)":"var(--color-background-secondary)",border:isSelf?"2px solid rgba(83,74,183,0.3)":"1.5px solid var(--color-border-secondary)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {isSelf ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a8 8 0 0 1 12.9-6.3"/><path d="M16 11v6m3-3h-6"/></svg>}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:1 }}>
                            <span style={{ fontSize:12,fontWeight:600,color:"var(--color-text-primary)" }}>{isSelf?group.full_name:app.fm_name||"Family Member"}</span>
                            <span style={{ fontSize:10,padding:"0 6px",borderRadius:4,background:isSelf?"rgba(83,74,183,0.1)":"rgba(15,110,86,0.08)",color:isSelf?"#534AB7":"var(--color-text-success)" }}>{isSelf?"Self":app.fm_relation||"Family"}</span>
                          </div>
                          {app.application_date&&<span style={{ fontSize:10,color:"var(--color-text-tertiary)" }}>Applied {new Date(app.application_date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                          <button onClick={()=>setViewingProfile({profileId:app.profile_id,applicantName:group.full_name,familyMemberName:isSelf?null:app.fm_name,familyMemberRelation:isSelf?null:app.fm_relation})} className="action-btn" style={{ padding:"3px 10px",fontSize:11,border:"0.5px solid rgba(83,74,183,0.3)",borderRadius:7,background:"rgba(83,74,183,0.07)",cursor:"pointer",color:"#534AB7",display:"flex",alignItems:"center",gap:3,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>
                            <i className="ti ti-eye" style={{ fontSize:10 }} /> View
                          </button>
                          <span style={{ fontSize:10,padding:"2px 8px",borderRadius:100,background:sm.bg,color:sm.color,border:`0.5px solid ${sm.border}`,fontWeight:600,display:"flex",alignItems:"center",gap:3 }}>
                            <i className={`ti ${sm.icon}`} style={{ fontSize:9 }} /> {sm.label}
                          </span>
                          {app.approval_status==="pending"&&(
                            <>
                              <button onClick={()=>handleApproveClick(app.application_id)} disabled={!!isProcessing||isFull} className="action-btn" style={{ padding:"3px 10px",fontSize:11,border:"0.5px solid rgba(15,110,86,0.35)",borderRadius:7,background:"rgba(15,110,86,0.1)",cursor:isProcessing||isFull?"not-allowed":"pointer",color:"var(--color-text-success)",opacity:isFull?0.4:1,display:"flex",alignItems:"center",gap:3,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>
                                {isProcessing?<i className="ti ti-loader-2 ti-spin" style={{ fontSize:10 }} />:<i className="ti ti-check" style={{ fontSize:10 }} />} Approve
                              </button>
                              <button onClick={()=>doUpdateStatus(app.application_id,"reject")} disabled={!!isProcessing} className="action-btn" style={{ padding:"3px 10px",fontSize:11,border:"0.5px solid rgba(192,57,43,0.25)",borderRadius:7,background:"rgba(192,57,43,0.06)",cursor:isProcessing?"not-allowed":"pointer",color:"var(--color-text-danger)",display:"flex",alignItems:"center",gap:3,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>
                                <i className="ti ti-x" style={{ fontSize:10 }} /> Reject
                              </button>
                            </>
                          )}
                          {app.approval_status==="approved"&&(
                            <button onClick={()=>doUpdateStatus(app.application_id,"revoke")} disabled={!!isProcessing} className="action-btn" style={{ padding:"3px 9px",fontSize:10,border:"0.5px solid var(--color-border-tertiary)",borderRadius:7,background:"none",cursor:isProcessing?"not-allowed":"pointer",color:"var(--color-text-danger)",fontFamily:"'DM Sans',sans-serif" }}>
                              {isProcessing?<i className="ti ti-loader-2 ti-spin" style={{ fontSize:10 }} />:"Revoke"}
                            </button>
                          )}
                          {app.approval_status==="rejected"&&(
                            <button onClick={()=>handleApproveClick(app.application_id)} disabled={isFull||!!isProcessing} className="action-btn" style={{ padding:"3px 9px",fontSize:10,border:"0.5px solid var(--color-border-tertiary)",borderRadius:7,background:"none",cursor:isFull||isProcessing?"not-allowed":"pointer",color:"var(--color-text-secondary)",opacity:isFull?0.4:1,fontFamily:"'DM Sans',sans-serif" }}>
                              {isProcessing?<i className="ti ti-loader-2 ti-spin" style={{ fontSize:10 }} />:"Re-approve"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Criteria chips helper ────────────────────────────────────────────────────
function criteriaChips(c: ScholarshipCriteria, customVals: CustomCriteriaValue[]) {
  const chips: {label:string}[] = [];
  if(c.sportsQuota===true) chips.push({label:"Sports quota"});
  if(c.meritBased===true) chips.push({label:"Merit-based"});
  if(c.currentlyStudying===true) chips.push({label:"Currently studying"});
  if(c.employmentStatus!=="all") chips.push({label:`Employment: ${c.employmentStatus}`});
  if(c.gender!=="all") chips.push({label:`Gender: ${c.gender}`});
  if(c.disabilityRequired===true) chips.push({label:"Disability required"});
  if(c.ageLimit.min!==""||c.ageLimit.max!=="") chips.push({label:`Age ${c.ageLimit.min!==""?c.ageLimit.min:"any"}–${c.ageLimit.max!==""?c.ageLimit.max:"any"}`});
  if(c.states.length&&c.states.length<=3) chips.push({label:`States: ${c.states.join(", ")}`});
  else if(c.states.length>3) chips.push({label:`${c.states.length} states`});
  customVals.filter((v)=>v.coverage!=="all").forEach((v)=>chips.push({label:`${v.coverage==="must_have"?"✓":"✗"} ${v.label}`}));
  return chips;
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────
function FilterSidebar({ categories, selectedCategoryIds, onCategoryToggle, selectedEligibilities, onEligibilityToggle, onClearAll, totalActiveFilters, selectedAgeRange, onAgeRangeChange }: {
  categories: ScholarshipCategory[]; selectedCategoryIds: string[]; onCategoryToggle: (id: string) => void;
  selectedEligibilities: EligibilityKey[]; onEligibilityToggle: (key: EligibilityKey) => void;
  onClearAll: () => void; totalActiveFilters: number; selectedAgeRange: string; onAgeRangeChange: (val: string) => void;
}) {
  return (
    <aside style={{ width:220,flexShrink:0,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:16,padding:"16px 0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",alignSelf:"flex-start",position:"sticky",top:16 }}>
      <div style={{ padding:"0 16px 12px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <i className="ti ti-filter" style={{ fontSize:14,color:"#534AB7" }} />
          <span style={{ fontSize:13,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif" }}>Filters</span>
          {totalActiveFilters>0&&<span style={{ fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:100,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff" }}>{totalActiveFilters}</span>}
        </div>
        {totalActiveFilters>0&&<button onClick={onClearAll} style={{ fontSize:11,color:"var(--color-text-danger)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0 }}>Clear all</button>}
      </div>
      <div style={{ padding:"14px 16px 10px" }}>
        <div style={{ fontSize:10,fontWeight:700,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10 }}>Categories</div>
        {categories.length===0?(<p style={{ fontSize:12,color:"var(--color-text-tertiary)",margin:0,fontStyle:"italic" }}>No categories yet</p>):(
          <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
            {categories.map((cat) => {
              const selected=selectedCategoryIds.includes(cat.id);
              return (<button key={cat.id} className="sidebar-filter-btn" onClick={()=>onCategoryToggle(cat.id)} style={{ display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:9,background:selected?`${cat.color}14`:"transparent",border:selected?`0.5px solid ${cat.color}40`:"0.5px solid transparent" }}><span style={{ width:8,height:8,borderRadius:"50%",background:cat.color,flexShrink:0 }} /><span style={{ fontSize:13,color:selected?cat.color:"var(--color-text-secondary)",fontWeight:selected?600:400,flex:1,textAlign:"left" }}>{cat.name}</span>{selected&&<i className="ti ti-check" style={{ fontSize:11,color:cat.color }} />}</button>);
            })}
          </div>
        )}
      </div>
      <div style={{ height:"0.5px",background:"var(--color-border-tertiary)",margin:"2px 0" }} />
      <div style={{ padding:"14px 16px 10px" }}>
        <div style={{ fontSize:10,fontWeight:700,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10 }}>Age Range</div>
        <div style={{ position:"relative" }}>
          <i className="ti ti-user-circle" style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:selectedAgeRange?"#534AB7":"var(--color-text-tertiary)",pointerEvents:"none",zIndex:1 }} />
          <select value={selectedAgeRange} onChange={(e)=>onAgeRangeChange(e.target.value)} style={{ width:"100%",fontSize:12,padding:"7px 10px 7px 28px",borderRadius:9,border:`0.5px solid ${selectedAgeRange?"rgba(83,74,183,0.4)":"var(--color-border-tertiary)"}`,background:selectedAgeRange?"rgba(83,74,183,0.07)":"var(--color-background-secondary)",color:selectedAgeRange?"#534AB7":"var(--color-text-secondary)",fontWeight:selectedAgeRange?600:400,cursor:"pointer",appearance:"none",outline:"none",fontFamily:"'DM Sans',sans-serif" }}>
            {SIDEBAR_AGE_OPTIONS.map((opt)=><option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <i className="ti ti-chevron-down" style={{ position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--color-text-tertiary)",pointerEvents:"none" }} />
        </div>
      </div>
      <div style={{ height:"0.5px",background:"var(--color-border-tertiary)",margin:"2px 0" }} />
      <div style={{ padding:"14px 16px 6px" }}>
        <div style={{ fontSize:10,fontWeight:700,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10 }}>Eligibility</div>
        <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
          {ELIGIBILITY_FILTERS.map((ef) => {
            const selected=selectedEligibilities.includes(ef.key);
            return (<button key={ef.key} className="sidebar-filter-btn" onClick={()=>onEligibilityToggle(ef.key)} style={{ display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:9,background:selected?"rgba(83,74,183,0.08)":"transparent",border:selected?"0.5px solid rgba(83,74,183,0.25)":"0.5px solid transparent" }}><i className={`ti ${ef.icon}`} style={{ fontSize:13,color:selected?"#534AB7":"var(--color-text-tertiary)",flexShrink:0 }} /><span style={{ fontSize:13,color:selected?"#534AB7":"var(--color-text-secondary)",fontWeight:selected?600:400,flex:1,textAlign:"left" }}>{ef.label}</span>{selected&&<i className="ti ti-check" style={{ fontSize:11,color:"#534AB7" }} />}</button>);
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────
function ScholarshipCard({ scholarship,onEdit,onDelete,onClose:onCloseScholarship,onBeneficiaries,deleting,closing,index,categories,showBeneficiaries,pushToast,approvedCount,onApprovedCountChange,onScholarshipAutoClose }: {
  scholarship:Scholarship; onEdit:()=>void; onDelete:()=>void; onClose:()=>void; onBeneficiaries:()=>void;
  deleting:boolean; closing:boolean; index:number; categories:ScholarshipCategory[]; showBeneficiaries:boolean;
  pushToast:(type:Toast["type"],msg:string)=>void; approvedCount:number;
  onApprovedCountChange:(id:string,delta:number)=>void; onScholarshipAutoClose:(id:string)=>void;
}) {
  const category = categories.find((c) => c.id === scholarship.categoryId);
  const chips = criteriaChips(scholarship.criteria, scholarship.customCriteriaValues);
  const deadlineOver = scholarship.applicationEnd && new Date(scholarship.applicationEnd) < new Date();
  const isActive = scholarship.status === "active";
  const isClosed = scholarship.status === "closed";
  const isDraft  = scholarship.status === "draft";
  const accentColor = category?.color ?? (isActive?"#0F6E56":isClosed?"#64748b":"#534AB7");
  const activeCustomCount = scholarship.customCriteriaValues.filter((v)=>v.coverage!=="all").length;

  return (
    <div style={{ marginBottom:showBeneficiaries?0:"1rem" }}>
      <div className="schol-card" style={{ background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderTop:`3px solid ${accentColor}`,borderRadius:showBeneficiaries?"16px 16px 0 0":16,padding:"18px 20px",opacity:deleting||closing?0.5:1,animationDelay:`${index*0.06}s`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.2s ease" }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:10 }}>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
            {category&&<span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:`${accentColor}18`,color:accentColor,border:`1px solid ${accentColor}40` }}>{category.name}</span>}
            {isActive&&<span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:"rgba(15,110,86,0.08)",color:"#0F6E56",border:"1px solid rgba(15,110,86,0.25)",display:"inline-flex",alignItems:"center",gap:4 }}><span style={{ width:6,height:6,borderRadius:"50%",background:"#0F6E56",animation:"pulse 2s infinite" }} /> Open</span>}
            {isClosed&&<span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:"rgba(100,116,139,0.1)",color:"#64748b",border:"1px solid rgba(100,116,139,0.2)",display:"inline-flex",alignItems:"center",gap:4 }}>🔒 Closed</span>}
            {isDraft&&<span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"1px solid rgba(83,74,183,0.2)",display:"inline-flex",alignItems:"center",gap:4 }}>✏️ Draft</span>}
            {activeCustomCount>0&&<span style={{ fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:100,background:"rgba(15,110,86,0.07)",color:"#0F6E56",border:"0.5px solid rgba(15,110,86,0.2)",display:"inline-flex",alignItems:"center",gap:4 }}><i className="ti ti-list-check" style={{ fontSize:10 }} />{activeCustomCount} custom</span>}
          </div>
          {scholarship.baseAmount!==""&&(
            <div style={{ textAlign:"right",flexShrink:0 }}>
              <div style={{ fontSize:22,fontWeight:700,fontFamily:"'DM Serif Display',serif",color:accentColor }}>₹{Number(scholarship.baseAmount).toLocaleString("en-IN")}</div>
              {scholarship.tieredAmounts.length>0&&<div style={{ fontSize:11,color:"var(--color-text-tertiary)",marginTop:1 }}>+{scholarship.tieredAmounts.length} tiers</div>}
            </div>
          )}
        </div>
        <div style={{ fontSize:17,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>{scholarship.name||"Unnamed scholarship"}</div>
        {scholarship.description&&<p style={{ fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 10px",lineHeight:1.55,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{scholarship.description}</p>}
        {chips.length>0&&(
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
            {chips.slice(0,4).map((chip,i)=><span key={i} style={{ fontSize:12,color:"var(--color-text-secondary)",display:"inline-flex",alignItems:"center",gap:4 }}><i className="ti ti-check" style={{ fontSize:10,color:accentColor }} /> {chip.label}</span>)}
            {chips.length>4&&<span style={{ fontSize:12,color:"var(--color-text-tertiary)" }}>+{chips.length-4} more</span>}
          </div>
        )}
        {isActive&&!scholarship.maxApprovalsUnlimited&&scholarship.maxApprovals!==""&&typeof scholarship.maxApprovals==="number"&&(
          <div style={{ marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
              <span style={{ fontSize:11,color:"var(--color-text-tertiary)" }}>Slots filled</span>
              <span style={{ fontSize:11,fontWeight:600,color:approvedCount>=scholarship.maxApprovals?"var(--color-text-danger)":"var(--color-text-secondary)" }}>{approvedCount}/{scholarship.maxApprovals}{approvedCount>=scholarship.maxApprovals?" — FULL":""}</span>
            </div>
            <div style={{ height:4,borderRadius:2,background:"var(--color-background-secondary)",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${Math.min(100,(approvedCount/scholarship.maxApprovals)*100)}%`,background:approvedCount>=scholarship.maxApprovals?"#C0392B":`linear-gradient(90deg,${accentColor},${accentColor}aa)`,borderRadius:2,transition:"width 0.4s ease" }} />
            </div>
          </div>
        )}
        {(scholarship.applicationStart||scholarship.applicationEnd)&&(
          <div style={{ fontSize:12,color:deadlineOver?"var(--color-text-danger)":"var(--color-text-tertiary)",marginBottom:14,display:"flex",alignItems:"center",gap:5 }}>
            <i className="ti ti-calendar" style={{ fontSize:11 }} />
            {isClosed&&scholarship.applicationEnd?`Closed on ${new Date(scholarship.applicationEnd).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}`:scholarship.applicationEnd?`Apply by ${new Date(scholarship.applicationEnd).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}` :""}
          </div>
        )}
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {isActive&&(
            <>
              <button onClick={onBeneficiaries} className="action-btn" style={{ padding:"7px 16px",fontSize:12,border:`1px solid ${showBeneficiaries?"#534AB7":"rgba(83,74,183,0.3)"}`,borderRadius:100,background:showBeneficiaries?"linear-gradient(135deg,#534AB7,#7B72D9)":"rgba(83,74,183,0.06)",color:showBeneficiaries?"#fff":"#534AB7",cursor:"pointer",fontWeight:600,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s" }}>
                <i className="ti ti-users-check" style={{ fontSize:13 }} /> Beneficiaries {showBeneficiaries?"▲":"→"}
              </button>
              <button onClick={onCloseScholarship} disabled={closing} className="action-btn" style={{ padding:"7px 16px",fontSize:12,border:"1px solid rgba(100,116,139,0.3)",borderRadius:100,background:"rgba(100,116,139,0.06)",color:"#64748b",cursor:closing?"not-allowed":"pointer",fontWeight:500,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                {closing?<i className="ti ti-loader-2 ti-spin" style={{ fontSize:12 }} />:<i className="ti ti-lock" style={{ fontSize:12 }} />} Close
              </button>
            </>
          )}
          {(isClosed||isDraft)&&(
            <>
              <button onClick={onEdit} disabled={deleting} className="action-btn" style={{ padding:"7px 16px",fontSize:12,border:"1px solid var(--color-border-secondary)",borderRadius:100,background:"none",cursor:"pointer",color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif" }}>
                <i className="ti ti-edit" style={{ fontSize:12 }} /> Edit
              </button>
              <button onClick={onDelete} disabled={deleting} className="action-btn" style={{ padding:"7px 16px",fontSize:12,border:"1px solid var(--color-border-tertiary)",borderRadius:100,background:"none",cursor:deleting?"not-allowed":"pointer",color:"var(--color-text-danger)",display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif" }}>
                {deleting?<i className="ti ti-loader-2 ti-spin" style={{ fontSize:12 }} />:<i className="ti ti-trash" style={{ fontSize:12 }} />} Delete
              </button>
            </>
          )}
        </div>
      </div>

      {showBeneficiaries&&(
        <BeneficiariesPanel scholarship={scholarship} onClose={onBeneficiaries} pushToast={pushToast} onCountChange={(delta)=>onApprovedCountChange(scholarship.id,delta)} onScholarshipAutoClose={()=>onScholarshipAutoClose(scholarship.id)} />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ScholarshipPage() {
  type StatusTab = "active" | "closed" | "draft";
  const [activeTab, setActiveTab] = useState<StatusTab>("active");
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [categories, setCategories] = useState<ScholarshipCategory[]>([]);
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([]);
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCustomCriteriaManager, setShowCustomCriteriaManager] = useState(false);
  const [openBeneficiariesId, setOpenBeneficiariesId] = useState<string | null>(null);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedEligibilities, setSelectedEligibilities] = useState<EligibilityKey[]>([]);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("");
  const [approvedCounts, setApprovedCounts] = useState<Record<string, number>>({});

  const fetchAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const [schols, cats, customCrit] = await Promise.all([
        apiFetch<Scholarship[]>("/api/sangha/scholarships"),
        apiFetch<ScholarshipCategory[]>("/api/sangha/scholarships/categories"),
        apiFetch<CustomCriterion[]>("/api/sangha/scholarships/custom-criteria"),
      ]);
      setScholarships(schols.map((s) => ({ ...s, customCriteriaValues: s.customCriteriaValues ?? [] })));
      setCategories(cats);
      setCustomCriteria(customCrit);
      const capped = schols.filter((s) => s.status === "active" && !s.maxApprovalsUnlimited && s.maxApprovals !== "");
      const statsResults = await Promise.allSettled(
        capped.map((s) => apiFetch<{ approved: string }>(`/api/sangha/scholarships/${s.id}/applicants/stats`))
      );
      const counts: Record<string, number> = {};
      statsResults.forEach((result, i) => {
        if (result.status === "fulfilled") counts[capped[i].id] = parseInt(result.value.approved ?? "0", 10);
      });
      setApprovedCounts(counts);
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to load data");
    } finally {
      setPageLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startCreate = () => { setEditing(emptyScholarship()); setIsCreating(true); };
  const handleCancel = () => { setEditing(null); setIsCreating(false); };
  const handleEdit = (s: Scholarship) => { setEditing({ ...s, customCriteriaValues: s.customCriteriaValues ?? [] }); setIsCreating(false); };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { pushToast("error", "Scholarship name is required"); return; }
    setSaving(true);
    try {
      if (isCreating) {
        const created = await apiFetch<{ id: string; createdAt: string }>("/api/sangha/scholarships", { method:"POST",body:JSON.stringify(editing) });
        setScholarships((prev) => [{ ...editing, id:created.id, createdAt:created.createdAt }, ...prev]);
        pushToast("success", "Scholarship created successfully");
      } else {
        await apiFetch(`/api/sangha/scholarships/${editing.id}`, { method:"PUT",body:JSON.stringify(editing) });
        setScholarships((prev) => prev.map((s) => s.id === editing.id ? editing : s));
        pushToast("success", "Scholarship updated");
      }
      setEditing(null);
      setIsCreating(false);
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this scholarship? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/sangha/scholarships/${id}`, { method:"DELETE" });
      setScholarships((prev) => prev.filter((s) => s.id !== id));
      pushToast("success", "Scholarship deleted");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseScholarship = async (id: string) => {
    if (!window.confirm("Close this scholarship? It will no longer accept applications.")) return;
    setClosingId(id);
    try {
      const s = scholarships.find((x) => x.id === id);
      if (!s) return;
      await apiFetch(`/api/sangha/scholarships/${id}`, { method:"PUT",body:JSON.stringify({ ...s, status:"closed" }) });
      setScholarships((prev) => prev.map((x) => x.id === id ? { ...x, status:"closed" } : x));
      setActiveTab("closed");
      pushToast("success", "Scholarship closed");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to close");
    } finally {
      setClosingId(null);
    }
  };

  const handleScholarshipAutoClose = useCallback(async (id: string) => {
    setClosingId(id);
    try {
      const s = scholarships.find((x) => x.id === id);
      if (!s) return;
      await apiFetch(`/api/sangha/scholarships/${id}`, { method:"PUT",body:JSON.stringify({ ...s, status:"closed" }) });
      setScholarships((prev) => prev.map((x) => x.id === id ? { ...x, status:"closed" } : x));
      setOpenBeneficiariesId(null);
      setActiveTab("closed");
      pushToast("success", "Scholarship closed — all approval slots filled");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to close scholarship");
    } finally {
      setClosingId(null);
    }
  }, [scholarships, pushToast]);

  const handleAddCategory = async (cat: ScholarshipCategory) => {
    try {
      const saved = await apiFetch<ScholarshipCategory>("/api/sangha/scholarships/categories", { method:"POST",body:JSON.stringify({ name:cat.name,color:cat.color }) });
      setCategories((prev) => [...prev, saved]);
      pushToast("success", `Category "${saved.name}" added`);
    } catch {
      setCategories((prev) => [...prev, cat]);
      pushToast("info", "Category added locally");
    }
  };

  const handleAddCustomCriterion = async (label: string, description: string) => {
    try {
      const saved = await apiFetch<CustomCriterion>("/api/sangha/scholarships/custom-criteria", {
        method: "POST", body: JSON.stringify({ label, description }),
      });
      setCustomCriteria((prev) => [...prev, saved]);
      pushToast("success", "Custom criterion added");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to add criterion");
    }
  };

  const handleEditCustomCriterion = async (id: string, label: string, description: string) => {
    try {
      await apiFetch(`/api/sangha/scholarships/custom-criteria/${id}`, {
        method: "PUT", body: JSON.stringify({ label, description }),
      });
      setCustomCriteria((prev) => prev.map((c) => c.id === id ? { ...c, label, description } : c));
      pushToast("success", "Criterion updated");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to update criterion");
    }
  };

  const handleDeleteCustomCriterion = async (id: string) => {
    try {
      await apiFetch(`/api/sangha/scholarships/custom-criteria/${id}`, { method: "DELETE" });
      setCustomCriteria((prev) => prev.filter((c) => c.id !== id));
      if (editing) {
        setEditing((prev) => prev ? { ...prev, customCriteriaValues: prev.customCriteriaValues.filter((v) => v.criterionId !== id) } : prev);
      }
      pushToast("success", "Criterion deleted");
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to delete criterion");
    }
  };

  const toggleBeneficiaries = (id: string) => setOpenBeneficiariesId((prev) => (prev === id ? null : id));
  const toggleCategory = (id: string) => setSelectedCategoryIds((prev) => prev.includes(id)?prev.filter((x)=>x!==id):[...prev,id]);
  const toggleEligibility = (key: EligibilityKey) => setSelectedEligibilities((prev) => prev.includes(key)?prev.filter((x)=>x!==key):[...prev,key]);
  const clearAllFilters = () => { setSelectedCategoryIds([]); setSelectedEligibilities([]); setSearchQuery(""); setSelectedAgeRange(""); };
  const handleApprovedCountChange = useCallback((id: string, delta: number) => {
    setApprovedCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }, []);

  const tabScholarships = scholarships.filter((s) => s.status === activeTab);
  const filteredScholarships = useMemo(() => {
    let list = tabScholarships;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const catName = categories.find((c) => c.id === s.categoryId)?.name ?? "";
        return s.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
      });
    }
    if (selectedCategoryIds.length > 0) list = list.filter((s) => selectedCategoryIds.includes(s.categoryId));
    if (selectedEligibilities.length > 0) list = list.filter((s) => selectedEligibilities.every((key) => s.criteria[key] === true));
    if (selectedAgeRange) {
      const [filterMin, filterMax] = sidebarAgeToRange(selectedAgeRange);
      list = list.filter((s) => {
        const scholarshipMin = s.criteria.ageLimit.min !== "" ? Number(s.criteria.ageLimit.min) : null;
        const scholarshipMax = s.criteria.ageLimit.max !== "" ? Number(s.criteria.ageLimit.max) : null;
        if (scholarshipMin === null && scholarshipMax === null) return true;
        const overlapMin = filterMin !== null && scholarshipMax !== null && filterMin > scholarshipMax;
        const overlapMax = filterMax !== null && scholarshipMin !== null && filterMax < scholarshipMin;
        return !overlapMin && !overlapMax;
      });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabScholarships, searchQuery, selectedCategoryIds, selectedEligibilities, selectedAgeRange, categories]);

  const tabCounts = {
    active: scholarships.filter((s) => s.status === "active").length,
    closed: scholarships.filter((s) => s.status === "closed").length,
    draft:  scholarships.filter((s) => s.status === "draft").length,
  };
  const totalActiveFilters = selectedCategoryIds.length + selectedEligibilities.length + (selectedAgeRange ? 1 : 0);

  return (
    <>
      <GlobalStyles />
      <div style={{ padding:"2rem 1rem",fontFamily:"'DM Sans',sans-serif" }}>
        {/* Hero Header — only "New scholarship" button, Custom Criteria button removed */}
        <div style={{ position:"relative",borderRadius:20,padding:"28px 28px 24px",marginBottom:"1.5rem",overflow:"hidden",background:"linear-gradient(135deg,#2D2870 0%,#534AB7 50%,#7B72D9 100%)",boxShadow:"0 8px 32px rgba(83,74,183,0.3)" }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.06)" }} />
          <div style={{ position:"absolute",bottom:-20,right:60,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.04)" }} />
          <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:16 }}>
              <div style={{ width:52,height:52,borderRadius:14,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",border:"0.5px solid rgba(255,255,255,0.25)" }}>
                <i className="ti ti-award" style={{ fontSize:24,color:"#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize:22,fontWeight:400,color:"#fff",margin:0,fontFamily:"'DM Serif Display',serif",letterSpacing:"-0.01em" }}>Scholarships</h2>
                <p style={{ fontSize:13,color:"rgba(255,255,255,0.72)",margin:"4px 0 0",fontWeight:400 }}>Define eligibility, manage programmes & approve beneficiaries</p>
              </div>
            </div>
            {!editing && (
              <button onClick={startCreate} className="action-btn" style={{ padding:"9px 20px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(255,255,255,0.35)",borderRadius:12,background:"rgba(255,255,255,0.18)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:7,backdropFilter:"blur(8px)",flexShrink:0,fontFamily:"'DM Sans',sans-serif" }}>
                <i className="ti ti-plus" style={{ fontSize:15 }} /> New scholarship
              </button>
            )}
          </div>
        </div>

        {editing && (
          <ScholarshipForm
            scholarship={editing} onChange={setEditing} onSave={handleSave} onCancel={handleCancel}
            saving={saving} categories={categories} onManageCategories={()=>setShowCategoryManager(true)}
            customCriteria={customCriteria} onManageCustomCriteria={()=>setShowCustomCriteriaManager(true)}
          />
        )}

        {!editing && (
          <>
            {pageLoading ? (
              <div style={{ padding:"4rem 2rem",textAlign:"center",color:"var(--color-text-tertiary)",display:"flex",flexDirection:"column",alignItems:"center",gap:14 }}>
                <i className="ti ti-loader-2 ti-spin" style={{ fontSize:28,color:"#534AB7" }} />
                <p style={{ fontSize:14,margin:0 }}>Loading scholarships…</p>
              </div>
            ) : (
              <>
                {/* KPI stat cards */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:"1.25rem" }}>
                  {[
                    { key:"active" as StatusTab,label:"Active",value:tabCounts.active,icon:"ti-circle-check",color:"#0F6E56",bg:"rgba(15,110,86,0.08)",border:"rgba(15,110,86,0.2)" },
                    { key:"closed" as StatusTab,label:"Closed",value:tabCounts.closed,icon:"ti-lock",color:"#64748b",bg:"rgba(100,116,139,0.08)",border:"rgba(100,116,139,0.2)" },
                    { key:"draft"  as StatusTab,label:"Draft", value:tabCounts.draft, icon:"ti-pencil",color:"#534AB7",bg:"rgba(83,74,183,0.08)",border:"rgba(83,74,183,0.2)" },
                  ].map((stat) => (
                    <div key={stat.key} className="stat-card" onClick={()=>setActiveTab(stat.key)} style={{ background:activeTab===stat.key?stat.bg:"var(--color-background-secondary)",borderRadius:12,padding:"12px 16px",border:`0.5px solid ${activeTab===stat.key?stat.border:"var(--color-border-tertiary)"}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"all 0.15s",boxShadow:activeTab===stat.key?`0 0 0 2px ${stat.border}`:"none" }}>
                      <div style={{ width:34,height:34,borderRadius:9,background:stat.bg,border:`0.5px solid ${stat.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><i className={`ti ${stat.icon}`} style={{ fontSize:15,color:stat.color }} /></div>
                      <div>
                        <div style={{ fontSize:11,color:activeTab===stat.key?stat.color:"var(--color-text-secondary)",fontWeight:activeTab===stat.key?700:500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:1 }}>{stat.label}</div>
                        <div style={{ fontSize:20,fontWeight:700,color:stat.color,fontFamily:"'DM Serif Display',serif" }}>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position:"relative",marginBottom:"1.25rem" }}>
                  <i className="ti ti-search" style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"var(--color-text-tertiary)",pointerEvents:"none" }} />
                  <input className="search-input" placeholder="Search by scholarship name or category…" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} style={{ width:"100%",boxSizing:"border-box",paddingLeft:42,paddingRight:searchQuery?36:14,paddingTop:11,paddingBottom:11,fontSize:14,borderRadius:12,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",transition:"border-color 0.15s, box-shadow 0.15s" }} />
                  {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",padding:2 }}><i className="ti ti-x" style={{ fontSize:13 }} /></button>}
                </div>

                {/* Active filter chips */}
                {totalActiveFilters > 0 && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:"1rem",alignItems:"center" }}>
                    <span style={{ fontSize:11,color:"var(--color-text-tertiary)",fontWeight:500 }}>Filtered by:</span>
                    {selectedCategoryIds.map((id) => {
                      const cat=categories.find((c)=>c.id===id);
                      if(!cat) return null;
                      return <span key={id} style={{ fontSize:12,padding:"3px 10px",borderRadius:100,background:`${cat.color}15`,color:cat.color,border:`0.5px solid ${cat.color}35`,display:"inline-flex",alignItems:"center",gap:5,fontWeight:600 }}><span style={{ width:6,height:6,borderRadius:"50%",background:cat.color }} />{cat.name}<button onClick={()=>toggleCategory(id)} style={{ background:"none",border:"none",cursor:"pointer",color:cat.color,padding:0,display:"flex",lineHeight:1 }}><i className="ti ti-x" style={{ fontSize:9 }} /></button></span>;
                    })}
                    {selectedAgeRange&&<span style={{ fontSize:12,padding:"3px 10px",borderRadius:100,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.25)",display:"inline-flex",alignItems:"center",gap:5,fontWeight:600 }}><i className="ti ti-user-circle" style={{ fontSize:10 }} />{SIDEBAR_AGE_OPTIONS.find((o)=>o.value===selectedAgeRange)?.label}<button onClick={()=>setSelectedAgeRange("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#534AB7",padding:0,display:"flex",lineHeight:1 }}><i className="ti ti-x" style={{ fontSize:9 }} /></button></span>}
                    {selectedEligibilities.map((key) => {
                      const ef=ELIGIBILITY_FILTERS.find((e)=>e.key===key);
                      if(!ef) return null;
                      return <span key={key} style={{ fontSize:12,padding:"3px 10px",borderRadius:100,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.25)",display:"inline-flex",alignItems:"center",gap:5,fontWeight:600 }}><i className={`ti ${ef.icon}`} style={{ fontSize:10 }} />{ef.label}<button onClick={()=>toggleEligibility(key)} style={{ background:"none",border:"none",cursor:"pointer",color:"#534AB7",padding:0,display:"flex",lineHeight:1 }}><i className="ti ti-x" style={{ fontSize:9 }} /></button></span>;
                    })}
                    <button onClick={clearAllFilters} style={{ fontSize:11,color:"var(--color-text-danger)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"3px 6px" }}>Clear all</button>
                  </div>
                )}

                <div style={{ display:"flex",gap:18,alignItems:"flex-start" }}>
                  <FilterSidebar categories={categories} selectedCategoryIds={selectedCategoryIds} onCategoryToggle={toggleCategory} selectedEligibilities={selectedEligibilities} onEligibilityToggle={toggleEligibility} onClearAll={clearAllFilters} totalActiveFilters={totalActiveFilters} selectedAgeRange={selectedAgeRange} onAgeRangeChange={setSelectedAgeRange} />

                  <div style={{ flex:1,minWidth:0 }}>
                    {filteredScholarships.length === 0 ? (
                      <div style={{ padding:"3.5rem 2rem",textAlign:"center",border:"1px dashed var(--color-border-secondary)",borderRadius:18,color:"var(--color-text-tertiary)",animation:"fadeIn 0.25s ease" }}>
                        <div style={{ width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,rgba(83,74,183,0.08),rgba(83,74,183,0.04))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",border:"0.5px solid rgba(83,74,183,0.12)" }}>
                          <i className="ti ti-award" style={{ fontSize:28,color:"#534AB7",opacity:0.5 }} />
                        </div>
                        <p style={{ margin:"0 0 6px",fontWeight:600,fontSize:15,color:"var(--color-text-secondary)",fontFamily:"'DM Serif Display',serif" }}>
                          {searchQuery||totalActiveFilters>0?"No matching scholarships":`No ${activeTab} scholarships`}
                        </p>
                        <p style={{ margin:"0 0 18px",fontSize:13,opacity:0.65 }}>
                          {searchQuery||totalActiveFilters>0?"Try adjusting your search or filters.":activeTab==="active"?"Create a scholarship and set it to active.":activeTab==="draft"?"Draft scholarships will appear here.":"Closed scholarships will appear here."}
                        </p>
                        {(searchQuery||totalActiveFilters>0)&&<button onClick={clearAllFilters} className="action-btn" style={{ padding:"8px 18px",fontSize:13,border:"0.5px solid var(--color-border-secondary)",borderRadius:10,background:"none",cursor:"pointer",color:"var(--color-text-secondary)",fontFamily:"'DM Sans',sans-serif" }}>Clear filters</button>}
                        {!searchQuery&&totalActiveFilters===0&&activeTab!=="closed"&&<button onClick={startCreate} className="action-btn primary-btn" style={{ padding:"9px 22px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,fontFamily:"'DM Sans',sans-serif" }}><i className="ti ti-plus" style={{ fontSize:15 }} /> New scholarship</button>}
                      </div>
                    ) : (
                      <>
                        {(searchQuery||totalActiveFilters>0)&&<p style={{ fontSize:12,color:"var(--color-text-tertiary)",margin:"0 0 12px",fontWeight:500 }}>{filteredScholarships.length} result{filteredScholarships.length!==1?"s":""}</p>}
                        {filteredScholarships.map((s, i) => (
                          <ScholarshipCard
                            key={s.id} scholarship={s} index={i} categories={categories}
                            onEdit={()=>handleEdit(s)}
                            onDelete={()=>handleDelete(s.id)}
                            onClose={()=>handleCloseScholarship(s.id)}
                            onBeneficiaries={()=>toggleBeneficiaries(s.id)}
                            deleting={deletingId===s.id}
                            closing={closingId===s.id}
                            showBeneficiaries={openBeneficiariesId===s.id}
                            pushToast={pushToast}
                            approvedCount={approvedCounts[s.id]??0}
                            onApprovedCountChange={handleApprovedCountChange}
                            onScholarshipAutoClose={handleScholarshipAutoClose}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showCategoryManager && <CategoryManager categories={categories} onClose={()=>setShowCategoryManager(false)} onAdd={handleAddCategory} />}
      {showCustomCriteriaManager && (
        <CustomCriteriaManager
          customCriteria={customCriteria}
          onClose={()=>setShowCustomCriteriaManager(false)}
          onAdd={handleAddCustomCriterion}
          onEdit={handleEditCustomCriterion}
          onDelete={handleDeleteCustomCriterion}
          saving={false}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
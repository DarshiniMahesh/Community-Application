"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface Member {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  overall_completion_pct: number;
  submitted_at: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
}

interface ProfileStep1 {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  fathers_name?: string;
  mothers_name?: string;
  mothers_maiden_name?: string;
  wife_name?: string;
  wife_maiden_name?: string;
  husbands_name?: string;
  is_married?: boolean;
  surname_in_use?: string;
  surname_as_per_gotra?: string;
  has_disability?: string;
  is_part_of_sangha?: string;
  sangha_name?: string;
  sangha_tenure?: string;
  sangha_role?: string;
}

interface ProfileStep2 {
  gotra?: string;
  pravara?: string;
  upanama?: string;
  upanama_general?: string;
  upanama_proper?: string;
  kuladevata?: string;
  kuladevata_other?: string;
  demi_god?: string;
  demi_god_notes?: string;
  demi_god_challenge?: string;
  priest_name?: string;
  priest_location?: string;
  surname_in_use?: string;
  surname_as_per_gotra?: string;
}

interface FamilyMember {
  id?: string;
  name?: string;
  relation?: string;
  gender?: string;
  dob?: string;
  age?: string | number;
  status?: string;
  disability?: string;
  photo_url?: string;
  sort_order?: number;
}

interface FamilyInfo {
  family_type?: string;
}

interface Address {
  id?: string;
  address_type?: string;
  flat_no?: string;
  building?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  taluk?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

interface Certification {
  edu_id: string;
  certification?: string;
  sort_order?: number;
}

interface Language {
  edu_id: string;
  language?: string;
  language_other?: string;
}

interface EducationRow {
  id?: string;
  member_name?: string;
  member_relation?: string;
  sort_order?: number;
  highest_education?: string;
  brief_profile?: string;
  profession_type?: string;
  profession_other?: string;
  self_employed_type?: string;
  self_employed_other?: string;
  industry?: string;
  is_currently_studying?: boolean;
}

interface EconomicDetails {
  self_income?: string;
  family_income?: string;
  inv_fixed_deposits?: boolean;
  inv_mutual_funds_sip?: boolean;
  inv_shares_demat?: boolean;
  inv_others?: boolean;
  fac_rented_house?: boolean;
  fac_own_house?: boolean;
  fac_agricultural_land?: boolean;
  fac_two_wheeler?: boolean;
  fac_car?: boolean;
}

interface InsuranceRow {
  member_name?: string;
  member_relation?: string;
  health_coverage?: string[];
  life_coverage?: string[];
  term_coverage?: string[];
  konkani_card_coverage?: string[];
}

interface DocumentRow {
  member_name?: string;
  member_relation?: string;
  aadhaar_coverage?: string[];
  pan_coverage?: string[];
  voter_id_coverage?: string[];
  land_doc_coverage?: string[];
  dl_coverage?: string[];
  all_records_coverage?: string[];
}

interface FamilyHistory {
  ancestral_challenge_notes?: string;
  demigods_info?: string;
  snake_god_naga_info?: string;
  common_relative_names?: string;
}

interface ProfileData {
  user: { id: string; email: string; phone: string };
  profile: {
    id: string;
    status: string;
    photo_url?: string;
    photo_uploaded_at?: string;
    submitted_at?: string;
    reviewed_at?: string;
    review_comment?: string;
    overall_completion_pct?: number;
    step1_personal_pct?: number;
    step2_religious_pct?: number;
    step3_family_pct?: number;
    step4_location_pct?: number;
    step5_education_pct?: number;
    step6_economic_pct?: number;
    step1_completed?: boolean;
    step2_completed?: boolean;
    step3_completed?: boolean;
    step4_completed?: boolean;
    step5_completed?: boolean;
    step6_completed?: boolean;
    sangha_id?: string;
  };
  step1: ProfileStep1 | null;
  step2: ProfileStep2 | null;
  step3: { family_info: FamilyInfo | null; members: FamilyMember[] };
  step4: Address[];
  step5: EducationRow[];
  step5_certifications: Certification[];
  step5_languages: Language[];
  step6: {
    economic: EconomicDetails | null;
    insurance: InsuranceRow[];
    documents: DocumentRow[];
    family_history: FamilyHistory | null;
  };
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  approved:          "bg-green-100 text-green-800",
  rejected:          "bg-red-100 text-red-800",
  submitted:         "bg-yellow-100 text-yellow-800",
  under_review:      "bg-blue-100 text-blue-800",
  changes_requested: "bg-orange-100 text-orange-800",
  draft:             "bg-gray-100 text-gray-800",
};

const INCOME_LABELS: Record<string, string> = {
  below_1l:  "Less than 1 Lakh",
  "1_2l":    "₹1 – 2 Lakh",
  "2_3l":    "₹2 – 3 Lakh",
  "3_5l":    "₹3 – 5 Lakh",
  "5_10l":   "₹5 – 10 Lakh",
  "10_25l":  "₹10 – 25 Lakh",
  "25l_plus":"₹25 Lakh+",
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function formatDate(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function hasCoverage(arr?: string[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function coverageLabel(arr?: string[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(", ");
}

function findMemberRow<T extends { member_name?: string; member_relation?: string }>(
  rows: T[], name: string, relation: string
): T | undefined {
  return rows.find(r => r.member_name === name && r.member_relation === relation);
}

function getStatusLabel(status?: string): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    approved: "Approved", rejected: "Rejected", submitted: "Submitted",
    under_review: "Under Review", changes_requested: "Changes Requested", draft: "Draft",
  };
  return map[status.toLowerCase()] ?? (status.charAt(0).toUpperCase() + status.slice(1));
}

const getIncomeLabel = (val?: string) => val ? (INCOME_LABELS[val] ?? val) : "—";
const canReview = (status?: string) => ["submitted", "under_review"].includes(status?.toLowerCase() ?? "");

/* ─── UI Primitives ──────────────────────────────────────────────────────────── */

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <div style={{ paddingBottom: 8, borderBottom: "2px solid #ede9fe", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95", margin: 0, letterSpacing: "0.01em" }}>{title}</h3>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #e5e7eb", margin: "20px 0" }} />;
}

function EmptyNote({ text = "Not filled yet." }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px dashed #e5e7eb" }}>
      <span style={{ fontSize: 14, color: "#9ca3af" }}>—</span>
      <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>{text}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </span>
    </div>
  );
}

function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px",
      borderRadius: 99, fontSize: 11, fontWeight: 600, border: "1px solid",
      background: value ? "#dcfce7" : "#f3f4f6",
      color: value ? "#064e3b" : "#6b7280",
      borderColor: value ? "#86efac" : "#e5e7eb",
    }}>
      {value ? "✓ Yes" : "No"}
    </span>
  );
}

function CoverageRow({ label, arr }: { label: string; arr?: string[] }) {
  const covered = hasCoverage(arr);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
        {covered && <span style={{ fontSize: 11, color: "#6b7280" }}>({coverageLabel(arr)})</span>}
      </div>
      <YesNoBadge value={covered} />
    </div>
  );
}

function BoolChip({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 10px", borderRadius: 6, fontSize: 11,
      background: value ? "#f0fdf4" : "#f9fafb",
      border: `1px solid ${value ? "#86efac" : "#e5e7eb"}`,
    }}>
      <span style={{ color: "#374151", fontWeight: 500 }}>{label}</span>
      <span style={{ color: value ? "#064e3b" : "#9ca3af", fontWeight: 700 }}>{value ? "✓" : "—"}</span>
    </div>
  );
}

function IncomeCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <span style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 2 }}>{label}</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{value}</p>
    </div>
  );
}

function AddressCard({ addr }: { addr: Address }) {
  const line1 = [addr.flat_no, addr.building, addr.street, addr.area].filter(Boolean).join(", ");
  const line2 = [addr.taluk, addr.district, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
  const hasCoords = addr.latitude != null && addr.longitude != null;
  const addrTypeLabel: Record<string, string> = {
    current: "🏠 Current Address", hometown: "🏡 Home Town",
    permanent: "📍 Permanent Address", office: "🏢 Office Address",
  };
  const title = addr.address_type
    ? (addrTypeLabel[addr.address_type] ?? `📌 ${addr.address_type.charAt(0).toUpperCase() + addr.address_type.slice(1)}`)
    : "📌 Address";
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", background: "#fafafa" }}>
      <p style={{ fontWeight: 700, color: "#111827", fontSize: 12, margin: "0 0 8px" }}>{title}</p>
      {line1 && <p style={{ color: "#374151", margin: "0 0 2px", fontSize: 13 }}>{line1}</p>}
      {line2 && <p style={{ color: "#6b7280", margin: 0, fontSize: 12 }}>{line2}</p>}
      {!line1 && !line2 && <p style={{ color: "#9ca3af", margin: 0 }}>—</p>}
      {hasCoords && (
        <a href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noreferrer"
          style={{ fontSize: 11, color: "#7c3aed", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
          📍 View on Map
        </a>
      )}
    </div>
  );
}

/* ─── Profile Photo ──────────────────────────────────────────────────────────── */

function ProfilePhoto({ photoUrl, name }: { photoUrl?: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  if (photoUrl && !imgError) {
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <img src={photoUrl} alt={name} onError={() => setImgError(true)}
          style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover",
            border: "3px solid rgba(255,255,255,0.4)", boxShadow: "0 4px 14px rgba(0,0,0,0.2)", display: "block" }} />
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#22c55e", border: "2px solid #fff" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
      border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 800,
      boxShadow: "0 4px 14px rgba(0,0,0,0.15)", letterSpacing: "0.05em", flexShrink: 0,
    }}>
      {initials || "?"}
    </div>
  );
}

/* ─── Completion Overview ─────────────────────────────────────────────────────── */

function CompletionOverview({ profile }: { profile: ProfileData["profile"] }) {
  const steps = [
    { label: "Personal",  pct: profile.step1_personal_pct  ?? 0, done: profile.step1_completed },
    { label: "Religious", pct: profile.step2_religious_pct ?? 0, done: profile.step2_completed },
    { label: "Family",    pct: profile.step3_family_pct    ?? 0, done: profile.step3_completed },
    { label: "Location",  pct: profile.step4_location_pct  ?? 0, done: profile.step4_completed },
    { label: "Education", pct: profile.step5_education_pct ?? 0, done: profile.step5_completed },
    { label: "Economic",  pct: profile.step6_economic_pct  ?? 0, done: profile.step6_completed },
  ];
  const overall = profile.overall_completion_pct ?? 0;
  const overallColor = overall >= 80 ? "#22c55e" : overall >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#4c1d95", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          📊 Profile Completion
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: overallColor, background: "#fff", padding: "2px 12px", borderRadius: 99, border: `2px solid ${overallColor}` }}>
          {overall}%
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {steps.map(s => (
          <div key={s.label} style={{ flex: "1 1 100px", minWidth: 90 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{s.done ? "✓ " : ""}{s.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.pct >= 80 ? "#22c55e" : s.pct >= 50 ? "#f59e0b" : "#ef4444" }}>{s.pct}%</span>
            </div>
            <div style={{ height: 4, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 99, background: s.pct >= 80 ? "#22c55e" : s.pct >= 50 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
        ))}
      </div>
      {(profile.submitted_at || profile.reviewed_at) && (
        <p style={{ fontSize: 11, color: "#7c3aed", margin: "10px 0 0", fontWeight: 500 }}>
          {profile.submitted_at && `Submitted: ${formatDate(profile.submitted_at)}`}
          {profile.submitted_at && profile.reviewed_at && "  ·  "}
          {profile.reviewed_at && `Reviewed: ${formatDate(profile.reviewed_at)}`}
        </p>
      )}
      {profile.review_comment && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6 }}>
          <p style={{ fontSize: 11, color: "#dc2626", margin: 0, fontWeight: 500 }}>💬 Review Note: {profile.review_comment}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Education Card ─────────────────────────────────────────────────────────── */

function EduCard({ edu, certs, langs, label }: { edu: EducationRow; certs: Certification[]; langs: Language[]; label: string }) {
  const profLabel = edu.is_currently_studying
    ? "Currently Studying"
    : [edu.profession_type, edu.profession_other].filter(Boolean).join(" — ") || undefined;
  const selfEmpLabel = edu.self_employed_type
    ? [edu.self_employed_type, edu.self_employed_other].filter(Boolean).join(" — ")
    : undefined;
  const hasData = edu.highest_education || profLabel || edu.industry || selfEmpLabel || edu.brief_profile || certs.length > 0 || langs.length > 0;
  if (!hasData) return null;
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", background: "#fafafa" }}>
      <p style={{ fontWeight: 700, color: "#111827", fontSize: 13, margin: "0 0 12px" }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: certs.length || langs.length ? 12 : 0 }}>
        <Field label="Highest Education" value={edu.highest_education} />
        <Field label="Profession"        value={profLabel} />
        <Field label="Industry"          value={edu.industry} />
        {selfEmpLabel && <Field label="Self-Employed Type" value={selfEmpLabel} />}
        {edu.brief_profile && <div style={{ gridColumn: "1 / -1" }}><Field label="Brief Profile" value={edu.brief_profile} /></div>}
      </div>
      {certs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Certifications</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {certs.map((c, i) => (
              <span key={i} style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" }}>
                {c.certification}
              </span>
            ))}
          </div>
        </div>
      )}
      {langs.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Languages</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {langs.map((l, i) => (
              <span key={i} style={{ padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>
                {l.language_other || l.language}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Insurance / Documents Boxes ────────────────────────────────────────────── */

function InsuranceBox({ row }: { row: InsuranceRow }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <CoverageRow label="Health Insurance" arr={row.health_coverage} />
      <CoverageRow label="Life Insurance"   arr={row.life_coverage} />
      <CoverageRow label="Term Insurance"   arr={row.term_coverage} />
      <CoverageRow label="Konkani Card"     arr={row.konkani_card_coverage} />
    </div>
  );
}

function DocumentsBox({ row }: { row: DocumentRow }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <CoverageRow label="Aadhaar"         arr={row.aadhaar_coverage} />
      <CoverageRow label="PAN"             arr={row.pan_coverage} />
      <CoverageRow label="Voter ID"        arr={row.voter_id_coverage} />
      <CoverageRow label="Land Docs"       arr={row.land_doc_coverage} />
      <CoverageRow label="Driving License" arr={row.dl_coverage} />
      <CoverageRow label="All Records"     arr={row.all_records_coverage} />
    </div>
  );
}

/* ─── Profile Detail ─────────────────────────────────────────────────────────── */

function ProfileDetail({
  data, onApprove, onReject, onRequestChanges, isMutating,
}: {
  data: ProfileData;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
  isMutating: boolean;
}) {
  const s1      = data.step1;
  const s2      = data.step2;
  const members = data.step3?.members ?? [];
  const famInfo = data.step3?.family_info;
  const s4      = data.step4 ?? [];
  const s5      = data.step5 ?? [];
  const s5cert  = data.step5_certifications ?? [];
  const s5lang  = data.step5_languages ?? [];
  const s6eco   = data.step6?.economic;
  const s6ins   = data.step6?.insurance ?? [];
  const s6doc   = data.step6?.documents ?? [];
  const famHist = data.step6?.family_history;

  const profileStatus = data.profile?.status ?? "";
  const photoUrl      = data.profile?.photo_url;
  const reviewable    = canReview(profileStatus);

  const certsByEduId: Record<string, Certification[]> = {};
  s5cert.forEach(c => { certsByEduId[c.edu_id] = [...(certsByEduId[c.edu_id] ?? []), c]; });
  const langsByEduId: Record<string, Language[]> = {};
  s5lang.forEach(l => { langsByEduId[l.edu_id] = [...(langsByEduId[l.edu_id] ?? []), l]; });

  const fullName = s1
    ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")
    : (data.user?.email ?? "?");
  const selfName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "";
  const selfIns  = findMemberRow(s6ins, selfName, "Self") ?? s6ins.find(r => r.member_relation === "Self");
  const selfDoc  = findMemberRow(s6doc, selfName, "Self") ?? s6doc.find(r => r.member_relation === "Self");

  const currentAddr  = s4.find(a => a.address_type === "current");
  const hometownAddr = s4.find(a => a.address_type === "hometown");
  const otherAddrs   = s4.filter(a => a.address_type !== "current" && a.address_type !== "hometown");

  const hasAnyFamHist = famHist && (
    famHist.ancestral_challenge_notes || famHist.demigods_info ||
    famHist.snake_god_naga_info || famHist.common_relative_names
  );

  return (
    <div>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)",
        borderRadius: 12, padding: "22px 24px", marginBottom: 16,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -40, right: 80, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ flex: 1, zIndex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.01em" }}>{fullName}</h2>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            {s1?.gender && <span style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 500 }}>{s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1)}</span>}
            {s1?.date_of_birth && <span style={{ fontSize: 12, color: "#c4b5fd" }}>🎂 {formatDate(s1.date_of_birth)}</span>}
            {s1?.is_married !== undefined && (
              <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.15)", color: "#e9d5ff" }}>
                {s1.is_married ? "Married" : "Single"}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {data.user?.phone && <span style={{ fontSize: 12, color: "#e9d5ff" }}>📞 {data.user.phone}</span>}
            {data.user?.email && <span style={{ fontSize: 12, color: "#e9d5ff" }}>✉️ {data.user.email}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
              {getStatusLabel(profileStatus)}
            </div>
            {reviewable && (
              <>
                <button onClick={onApprove} disabled={isMutating} style={{ background: "#dcfce7", color: "#064e3b", border: "1px solid #86efac", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: 12, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}>
                  ✓ Approve
                </button>
                <button onClick={onReject} disabled={isMutating} style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: 12, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}>
                  ✕ Reject
                </button>
                <button onClick={onRequestChanges} disabled={isMutating} style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 16px", fontWeight: 700, fontSize: 12, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}>
                  ↩ Request Changes
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ zIndex: 1, flexShrink: 0, textAlign: "center" }}>
          <ProfilePhoto photoUrl={photoUrl} name={fullName} />
          {photoUrl && data.profile.photo_uploaded_at && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>{formatDate(data.profile.photo_uploaded_at)}</p>
          )}
          {!photoUrl && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", fontStyle: "italic" }}>No photo</p>}
        </div>
      </div>

      {/* ══ COMPLETION OVERVIEW ══ */}
      <CompletionOverview profile={data.profile} />

      {/* ══ MAIN INFO CARD ══ */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16, borderLeft: "4px solid #7c3aed" }}>

        <SectionHeader title="Personal Details" icon="👤" />
        {s1 ? (
          <FieldGrid cols={3}>
            <Field label="First Name"           value={s1.first_name} />
            <Field label="Middle Name"          value={s1.middle_name} />
            <Field label="Last Name"            value={s1.last_name} />
            <Field label="Gender"               value={s1.gender ? s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1) : undefined} />
            <Field label="Date of Birth"        value={formatDate(s1.date_of_birth)} />
            <Field label="Marital Status"       value={s1.is_married ? "Married" : "Single / Unmarried"} />
            <Field label="Father's Name"        value={s1.fathers_name} />
            <Field label="Mother's Name"        value={s1.mothers_name} />
            <Field label="Mother's Maiden Name" value={s1.mothers_maiden_name} />
            {s1.is_married && s1.gender?.toLowerCase() === "male" && (
              <>
                <Field label="Wife's Name"        value={s1.wife_name} />
                <Field label="Wife's Maiden Name" value={s1.wife_maiden_name} />
              </>
            )}
            {s1.is_married && s1.gender?.toLowerCase() === "female" && (
              <Field label="Husband's Name" value={s1.husbands_name} />
            )}
            <Field label="Surname in Use"  value={s1.surname_in_use} />
            <Field label="Surname (Gotra)" value={s1.surname_as_per_gotra} />
            <Field label="Has Disability"
              value={s1.has_disability === "yes" ? "Yes" : s1.has_disability === "no" ? "No" : s1.has_disability}
            />
            <Field label="Part of Sangha"
              value={s1.is_part_of_sangha === "yes" ? "Yes" : s1.is_part_of_sangha === "no" ? "No" : s1.is_part_of_sangha}
            />
            {s1.is_part_of_sangha === "yes" && (
              <>
                <Field label="Sangha Name"   value={s1.sangha_name} />
                <Field label="Sangha Role"   value={s1.sangha_role} />
                <Field label="Sangha Tenure" value={s1.sangha_tenure} />
              </>
            )}
            <Field label="Phone" value={data.user?.phone} />
            <Field label="Email" value={data.user?.email} />
          </FieldGrid>
        ) : <EmptyNote text="Personal details not filled yet." />}

        <Divider />

        <SectionHeader title="Religious Details" icon="🕉️" />
        {s2 ? (
          <FieldGrid cols={3}>
            <Field label="Gotra"              value={s2.gotra} />
            <Field label="Pravara"            value={s2.pravara} />
            <Field label="Upanama"            value={s2.upanama} />
            <Field label="Upanama (General)"  value={s2.upanama_general} />
            <Field label="Upanama (Proper)"   value={s2.upanama_proper} />
            <Field label="Kuladevata"         value={s2.kuladevata_other || s2.kuladevata} />
            <Field label="Demi God"           value={s2.demi_god} />
            <Field label="Demi God Notes"     value={s2.demi_god_notes} />
            <Field label="Demi God Challenge" value={s2.demi_god_challenge} />
            <Field label="Family Priest"      value={s2.priest_name} />
            <Field label="Priest Location"    value={s2.priest_location} />
            <Field label="Surname in Use"     value={s2.surname_in_use} />
            <Field label="Surname (Gotra)"    value={s2.surname_as_per_gotra} />
          </FieldGrid>
        ) : <EmptyNote text="Religious details not filled yet." />}

        <Divider />

        <SectionHeader title="Addresses" icon="📍" />
        {s4.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {currentAddr  && <AddressCard addr={currentAddr} />}
            {hometownAddr && <AddressCard addr={hometownAddr} />}
            {otherAddrs.map((a, i) => <AddressCard key={i} addr={a} />)}
          </div>
        ) : <EmptyNote text="No addresses added yet." />}

        <Divider />

        <SectionHeader title="Education & Profession" icon="🎓" />
        {s5.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {s5.map((edu, i) => {
              const certs = edu.id ? (certsByEduId[edu.id] ?? []) : [];
              const langs = edu.id ? (langsByEduId[edu.id] ?? []) : [];
              const lbl = i === 0
                ? "Self"
                : `${edu.member_name || `Member ${i}`}${edu.member_relation ? ` (${edu.member_relation})` : ""}`;
              return <EduCard key={i} edu={edu} certs={certs} langs={langs} label={lbl} />;
            })}
          </div>
        ) : <EmptyNote text="Education & profession details not filled yet." />}

        <Divider />

        <SectionHeader title="Economic Details" icon="💰" />
        {s6eco ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <IncomeCard label="Self Income"   value={getIncomeLabel(s6eco.self_income)} />
              <IncomeCard label="Family Income" value={getIncomeLabel(s6eco.family_income)} />
            </div>

            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Investments</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              <BoolChip label="Fixed Deposits"     value={!!s6eco.inv_fixed_deposits} />
              <BoolChip label="Mutual Funds / SIP" value={!!s6eco.inv_mutual_funds_sip} />
              <BoolChip label="Shares / Demat"     value={!!s6eco.inv_shares_demat} />
              <BoolChip label="Others"             value={!!s6eco.inv_others} />
            </div>

            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Assets & Facilities</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
              <BoolChip label="Own House"         value={!!s6eco.fac_own_house} />
              <BoolChip label="Rented House"      value={!!s6eco.fac_rented_house} />
              <BoolChip label="Agricultural Land" value={!!s6eco.fac_agricultural_land} />
              <BoolChip label="Two Wheeler"       value={!!s6eco.fac_two_wheeler} />
              <BoolChip label="Car"               value={!!s6eco.fac_car} />
            </div>

            {(selfIns || selfDoc) && (
              <div style={{ display: "grid", gridTemplateColumns: selfDoc ? "1fr 1fr" : "1fr", gap: 12 }}>
                {selfIns && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em", margin: "0 0 6px", textTransform: "uppercase" }}>Insurance</p>
                    <InsuranceBox row={selfIns} />
                  </div>
                )}
                {selfDoc && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em", margin: "0 0 6px", textTransform: "uppercase" }}>Documents</p>
                    <DocumentsBox row={selfDoc} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : <EmptyNote text="Economic details not filled yet." />}
      </div>

      {/* ══ FAMILY MEMBERS CARD ══ */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <SectionHeader title="Family Members" icon="👨‍👩‍👧‍👦" />

        {famInfo?.family_type && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 20, padding: "4px 14px" }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Family Type:</span>
            <strong style={{ fontSize: 12, color: "#4c1d95" }}>
              {famInfo.family_type.charAt(0).toUpperCase() + famInfo.family_type.slice(1)}
            </strong>
          </div>
        )}

        {members.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {members.map((member, idx) => {
              const memberEdu = s5[idx + 1];
              const mName = member.name ?? "";
              const mRel  = member.relation ?? "";
              const memberIns = findMemberRow(s6ins, mName, mRel);
              const memberDoc = findMemberRow(s6doc, mName, mRel);
              const mCerts = memberEdu?.id ? (certsByEduId[memberEdu.id] ?? []) : [];
              const mLangs = memberEdu?.id ? (langsByEduId[memberEdu.id] ?? []) : [];

              const mStatusStyle = ({
                active:      { bg: "#dcfce7", color: "#064e3b", border: "#86efac" },
                passed_away: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
              } as Record<string, { bg: string; color: string; border: string }>)[member.status ?? ""]
              ?? { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };

              return (
                <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ background: "#f9fafb", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name ?? ""} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #ede9fe", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ede9fe", color: "#5b21b6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {member.name?.[0]?.toUpperCase() ?? String(idx + 1)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: 14, color: "#111827" }}>{member.name || "—"}</p>
                      <p style={{ color: "#7c3aed", margin: 0, fontSize: 12, fontWeight: 500 }}>{member.relation || "—"}</p>
                    </div>
                    {member.status && (
                      <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: mStatusStyle.bg, color: mStatusStyle.color, border: `1px solid ${mStatusStyle.border}` }}>
                        {member.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
                      <Field label="Gender"        value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : undefined} />
                      <Field label="Date of Birth" value={formatDate(member.dob)} />
                      <Field label="Age"           value={member.age != null ? String(member.age) : undefined} />
                      <Field label="Disability"    value={member.disability === "yes" ? "Yes" : member.disability === "no" ? "No" : member.disability} />
                    </div>

                    {memberEdu && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.05em", margin: "0 0 8px", textTransform: "uppercase" }}>Education & Profession</p>
                        <EduCard edu={memberEdu} certs={mCerts} langs={mLangs}
                          label={`${member.name || "Member"}${member.relation ? ` (${member.relation})` : ""}`} />
                      </div>
                    )}

                    {(memberIns || memberDoc) && (
                      <div style={{ display: "grid", gridTemplateColumns: memberDoc ? "1fr 1fr" : "1fr", gap: 12 }}>
                        {memberIns && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em", margin: "0 0 6px", textTransform: "uppercase" }}>Insurance</p>
                            <InsuranceBox row={memberIns} />
                          </div>
                        )}
                        {memberDoc && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em", margin: "0 0 6px", textTransform: "uppercase" }}>Documents</p>
                            <DocumentsBox row={memberDoc} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyNote text="No family members added." />}
      </div>

      {/* ══ FAMILY HISTORY ══ */}
      {hasAnyFamHist && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Family History" icon="📜" />
          <FieldGrid cols={2}>
            <Field label="Ancestral Challenge Notes" value={famHist!.ancestral_challenge_notes} />
            <Field label="Demigods Info"             value={famHist!.demigods_info} />
            <Field label="Snake God / Naga Info"     value={famHist!.snake_god_naga_info} />
            <Field label="Common Relative Names"     value={famHist!.common_relative_names} />
          </FieldGrid>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */

export default function UserManagementPage() {
  const [members, setMembers]               = useState<Member[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedUser, setSelectedUser]     = useState<Member | null>(null);
  const [profileData, setProfileData]       = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isMutating, setIsMutating]         = useState(false);

  useEffect(() => {
    api.get("/sangha/members")
      .then((data: Member[]) => setMembers(data))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const openModal = async (m: Member) => {
    setSelectedUser(m);
    setProfileData(null);
    setProfileLoading(true);
    try {
      const data = await api.get(`/sangha/review-user/${m.id}`);
      setProfileData(data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeModal = () => { setSelectedUser(null); setProfileData(null); };

  const handleApprove = async () => {
    if (!selectedUser) return;
    if (!confirm(`Approve profile for ${selectedUser.first_name || selectedUser.email}?`)) return;
    setIsMutating(true);
    try {
      await api.post("/sangha/approve", { userId: selectedUser.id });
      setMembers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: "approved" } : u));
      setSelectedUser(prev => prev ? { ...prev, status: "approved" } : prev);
      setProfileData(prev => prev ? { ...prev, profile: { ...prev.profile, status: "approved" } } : prev);
      toast.success("User approved ✅");
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setIsMutating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    const comment = prompt("Reason for rejection (optional):") ?? "";
    setIsMutating(true);
    try {
      await api.post("/sangha/reject", { userId: selectedUser.id, comment });
      setMembers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: "rejected" } : u));
      setSelectedUser(prev => prev ? { ...prev, status: "rejected" } : prev);
      setProfileData(prev => prev ? { ...prev, profile: { ...prev.profile, status: "rejected" } } : prev);
      toast.success("User rejected ✅");
    } catch {
      toast.error("Failed to reject user");
    } finally {
      setIsMutating(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedUser) return;
    const comment = prompt("What changes are needed? (required)");
    if (!comment?.trim()) { toast.error("A comment is required to request changes"); return; }
    setIsMutating(true);
    try {
      await api.post("/sangha/request-changes", { userId: selectedUser.id, comment });
      setMembers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: "changes_requested" } : u));
      setSelectedUser(prev => prev ? { ...prev, status: "changes_requested" } : prev);
      setProfileData(prev => prev ? { ...prev, profile: { ...prev.profile, status: "changes_requested" } } : prev);
      toast.success("Changes requested ✅");
    } catch {
      toast.error("Failed to request changes");
    } finally {
      setIsMutating(false);
    }
  };

  const displayName = (m: Member) =>
    m.first_name || m.last_name
      ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
      : m.email || m.phone || "—";

  const modalTitle = selectedUser
    ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || selectedUser.email || selectedUser.id
    : "";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage all user profiles. Click 👁 to see full details.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {members.length} user{members.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: "50%",
                              background: "#ede9fe", color: "#5b21b6",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700, flexShrink: 0,
                            }}>
                              {displayName(m)[0]?.toUpperCase() ?? "?"}
                            </div>
                            <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{displayName(m)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.phone || m.email || "—"}
                        </TableCell>
                        <TableCell>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
                            <div style={{ flex: 1, height: 4, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{
                                width: `${m.overall_completion_pct ?? 0}%`, height: "100%", borderRadius: 99,
                                background: (m.overall_completion_pct ?? 0) >= 80 ? "#22c55e" : (m.overall_completion_pct ?? 0) >= 50 ? "#f59e0b" : "#ef4444",
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 32 }}>
                              {m.overall_completion_pct ?? 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLOR[m.status] ?? ""} capitalize border-0`}>
                            {m.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => openModal(m)}
                            title="View Profile"
                            style={{
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              borderRadius: 6,
                              padding: "5px 9px",
                              cursor: "pointer",
                              fontSize: 13,
                              lineHeight: 1,
                            }}
                          >
                            👁
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile — {modalTitle}</DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <p style={{ margin: 0, fontSize: 14 }}>Loading profile…</p>
            </div>
          ) : profileData ? (
            <ProfileDetail
              data={profileData}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestChanges={handleRequestChanges}
              isMutating={isMutating}
            />
          ) : !profileLoading && selectedUser ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <p style={{ margin: 0, fontSize: 14 }}>Could not load profile.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
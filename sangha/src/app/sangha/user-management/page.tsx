// Community-Application\sangha\src\app\sangha\user-management\page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────── */

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

/* ─── Constants ──────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  approved:          "bg-green-100 text-green-800",
  rejected:          "bg-red-100 text-red-800",
  submitted:         "bg-yellow-100 text-yellow-800",
  under_review:      "bg-blue-100 text-blue-800",
  changes_requested: "bg-orange-100 text-orange-800",
  draft:             "bg-gray-100 text-gray-800",
};

const INCOME_LABELS: Record<string, string> = {
  below_1l:   "Less than 1 Lakh",
  "1_2l":     "₹1 – 2 Lakh",
  "2_3l":     "₹2 – 3 Lakh",
  "3_5l":     "₹3 – 5 Lakh",
  "5_10l":    "₹5 – 10 Lakh",
  "10_25l":   "₹10 – 25 Lakh",
  "25l_plus": "₹25 Lakh+",
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatIncome(raw?: string | null): string | null {
  if (!raw) return null;
  return INCOME_LABELS[raw] ?? raw.replace(/_/g, " – ").replace(/l$/, " Lakh");
}

function formatStatus(s: string): string {
  if (s === "active")      return "Active";
  if (s === "passed_away") return "Passed Away";
  if (s === "unknown")     return "Unknown";
  return s || "";
}

function formatProfession(p: string): string {
  const map: Record<string, string> = {
    self_employed: "Self Employed or Business",
    stem:          "Science, Technology, Engineering & Mathematics",
    healthcare:    "Healthcare & Medicine",
    business:      "Business & Management",
    law:           "Law & Governance",
    education:     "Education & Research",
    arts_media:    "Arts, Media & Communication",
    trades:        "Trades & Vocational Professions",
    agriculture:   "Agriculture & Others",
  };
  return map[p] || p || "";
}

function formatAddress(a: Record<string, string> | undefined): string {
  if (!a) return "—";
  return [
    a.flat_no, a.building, a.street, a.landmark,
    a.area, a.city, a.taluk, a.district, a.pincode, a.country,
  ].filter(Boolean).join(", ");
}

function getLangLabel(l: { language: string; language_other?: string }): string {
  return l.language === "Other"
    ? String(l.language_other ?? "")
    : String(l.language ?? "");
}

function parseCovArray(val: unknown): string[] {
  if (Array.isArray(val)) return (val as unknown[]).map(String);
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      const inner = t.slice(1, -1).trim();
      if (!inner) return [];
      // handle optional double-quotes inside postgres literals: {"yes","no"}
      return inner.split(",").map(s => s.trim().replace(/^"|"$/g, "").toLowerCase());
    }
    return t ? [t.toLowerCase()] : [];
  }
  return [];
}

function hasCovArray(val: unknown): boolean | null {
  const arr = parseCovArray(val);
  if (arr.length === 0) return null;
  if (arr.every(v => v === "none" || v === "no" || v === ""))  return false;
  if (arr.some(v => v === "yes"))  return true;
  if (arr.some(v => v === "no"))   return false;
  // array has some other non-empty value — treat as covered
  return true;
}
function hasCovScalar(val: unknown): boolean | null {
  if (val === "yes" || val === true)  return true;
  if (val === "no"  || val === false) return false;
  // fall back to array parsing for edge cases
  const arr = parseCovArray(val);
  if (arr.length === 0) return null;
  if (arr.includes("yes")) return true;
  if (arr.includes("no"))  return false;
  return null;
}

/* ─── UI Primitives ──────────────────────────────────────────────────── */

function Field({ label, value }: { label: string; value?: string | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground italic">
        <Minus className="h-3 w-3" />
        Not Selected
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      value
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}>
      {value ? <CheckCircle2 className="h-3 w-3" /> : null}
      {value ? "Yes" : "No"}
    </span>
  );
}

function CoverageRow({ label, value }: { label: string; value: boolean | null }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <YesNoBadge value={value} />
    </div>
  );
}

function SectionBlock({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border mb-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function EduBlock({ edu }: { edu: Record<string, unknown> }) {
  const profType     = typeof edu.profession_type === "string" ? edu.profession_type : "";
  const industry     = typeof edu.industry        === "string" ? edu.industry        : "";
  const briefProfile = typeof edu.brief_profile   === "string" ? edu.brief_profile   : "";
  const educations   = (edu.educations as Record<string, string>[]) ?? [];
  const languages    = (edu.languages  as { language: string; language_other?: string }[]) ?? [];

  // Fix: properly resolve true/false/"true"/"false"/null for both fields
  const isStudying: boolean | null =
    edu.is_currently_studying === true  || edu.is_currently_studying === "true"  ? true  :
    edu.is_currently_studying === false || edu.is_currently_studying === "false" ? false :
    null;

  const isWorking: boolean | null =
    edu.is_currently_working === true  || edu.is_currently_working === "true"  ? true  :
    edu.is_currently_working === false || edu.is_currently_working === "false" ? false :
    null;

  return (
    <div className="space-y-6">

      {/* ── Current Status ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Current Status
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Currently Studying?</span>
            <YesNoBadge value={isStudying} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Currently Working?</span>
            <YesNoBadge value={isWorking} />
          </div>
        </div>
      </div>

      {/* ── Profession ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Profession
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">Type of Profession</Label>
            <p className="text-sm font-medium">{profType ? formatProfession(profType) : <span className="italic text-muted-foreground">Not provided</span>}</p>
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">Industry / Field</Label>
            <p className="text-sm font-medium">{industry || <span className="italic text-muted-foreground">Not provided</span>}</p>
          </div>
          <div className="sm:col-span-2 space-y-0.5">
            <Label className="text-xs text-muted-foreground">Brief Profile</Label>
            <p className="text-sm font-medium">{briefProfile || <span className="italic text-muted-foreground">Not provided</span>}</p>
          </div>
        </div>
      </div>

      {/* ── Education History ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Education History
        </p>
        {educations.filter(e => e.degree_type).length > 0 ? (
          <div className="space-y-3">
            {educations.filter(e => e.degree_type).map((e, i) => (
              <div key={i} className="p-4 border border-border rounded-xl bg-white shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-bold text-sm text-foreground">{e.degree_type}</p>
                  {e.degree_name && (
                    <Badge variant="secondary" className="text-xs shrink-0">{e.degree_name}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Institution</Label>
                    <p className="text-sm font-medium">{e.university || <span className="italic text-muted-foreground">Not provided</span>}</p>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Certificate Name</Label>
                    <p className="text-sm font-medium">{e.certificate || <span className="italic text-muted-foreground">Not provided</span>}</p>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium">{e.start_date ? formatDate(e.start_date) : <span className="italic text-muted-foreground">Not provided</span>}</p>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium">{e.end_date ? formatDate(e.end_date) : <span className="italic text-muted-foreground">Not provided</span>}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No education entries recorded.</p>
        )}
      </div>

      {/* ── Languages Known ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Languages Known
        </p>
        {languages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {languages.map((l, i) => (
              <Badge key={i} variant="outline" className="bg-white border-border text-foreground">
                {getLangLabel(l)}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No languages recorded.</p>
        )}
      </div>

    </div>
  );
}

  
/* ─── Profile Viewer ──────────────────────────────────────────────────── */

function ProfileViewer({ data }: { data: any }) {
  const s1    = data?.step1 as Record<string, any> | null;
  const s2    = data?.step2 as Record<string, unknown> | null;
  const s4    = data?.step4 as Record<string, string>[] | null ?? [];
  const s5    = Array.isArray(data?.step5) ? data.step5 as Record<string, unknown>[] : [];
  const s6eco = (data?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = ((data?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || []);
  const s6doc = ((data?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || []);

  const s3typed       = data?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const familyType    = s3typed?.family_info?.family_type || "";
  const familyMembers = s3typed?.members || [];

  const profile        = data?.profile as Record<string, unknown> | null;
  const completionPct  = typeof profile?.overall_completion_pct === "number" ? profile.overall_completion_pct : 0;
  const profileStatus  = typeof profile?.status === "string" ? profile.status : "";
  const submittedAt    = typeof profile?.submitted_at === "string" ? profile.submitted_at : null;
  const reviewedAt     = typeof profile?.reviewed_at === "string" ? profile.reviewed_at : null;
  const reviewComment  = typeof profile?.review_comment === "string" ? profile.review_comment : null;

  const fullName = s1 ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ") : (data?.user?.email ?? "—");
  const initials = s1 ? `${s1.first_name?.[0] || ""}${s1.last_name?.[0] || ""}`.toUpperCase() : "?";

  const currentAddr  = s4.find(a => a.address_type === "current");
  const hometownAddr = s4.find(a => a.address_type === "hometown");
  const oldAddresses = s4.filter(a => a.address_type?.startsWith("old_"));

  const demiGodsRaw = s2?.demi_gods;
  const demiGodsList: string[] = Array.isArray(demiGodsRaw)
    ? demiGodsRaw as string[]
    : typeof demiGodsRaw === "string"
      ? demiGodsRaw.split(",").map(d => d.trim()).filter(Boolean)
      : [];
  const demiGodOther = typeof s2?.demi_god_other === "string" ? s2.demi_god_other : null;
  const allDemiGods = [
    ...demiGodsList.filter(d => d !== "Other"),
    ...(demiGodOther ? demiGodOther.split(",").map(t => t.trim()).filter(Boolean) : []),
  ];

  // ── INDEX-BASED: 0 = Self, 1+ = family members ──
  const userEdu = s5[0]    ?? null;
  const userIns = s6ins[0] ?? null;
  const userDoc = s6doc[0] ?? null;

  const fac: string[] = [];
  if (s6eco?.fac_rented_house)      fac.push("Staying in Rented House");
  if (s6eco?.fac_own_house)         fac.push("Own a House");
  if (s6eco?.fac_agricultural_land) fac.push("Own Agricultural Land");
  if (s6eco?.fac_two_wheeler)       fac.push("Own a Two Wheeler");
  if (s6eco?.fac_car)               fac.push("Own a Car");

  const inv: string[] = [];
  if (s6eco?.inv_fixed_deposits)   inv.push("Fixed Deposits");
  if (s6eco?.inv_mutual_funds_sip) inv.push("Mutual Funds / SIP");
  if (s6eco?.inv_shares_demat)     inv.push("Trading in Shares / Demat Account");
  if (s6eco?.inv_others)           inv.push("Investment - Others");

  const overallColor = completionPct >= 80 ? "#22c55e" : completionPct >= 50 ? "#f59e0b" : "#ef4444";

  const nonSelfMembers = familyMembers.filter(m => m.relation !== "Self");

  return (
    <div className="space-y-5">

      {/* ── Hero / Avatar ── */}
      <div style={{
        background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)",
        borderRadius: 12, padding: "20px 24px",
        display: "flex", alignItems: "center", gap: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
          border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 800, flexShrink: 0,
        }}>
          {initials || "?"}
        </div>
        <div style={{ flex: 1, zIndex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{fullName}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
            {data?.user?.phone && <span style={{ fontSize: 12, color: "#e9d5ff" }}>📞 {data.user.phone}</span>}
            {data?.user?.email && <span style={{ fontSize: 12, color: "#e9d5ff" }}>✉️ {data.user.email}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 120, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${completionPct}%`, height: "100%", borderRadius: 99, background: overallColor }} />
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{completionPct}% complete</span>
          </div>
        </div>
        <div style={{ zIndex: 1, textAlign: "right" }}>
          <span style={{
            padding: "4px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)",
          }}>
            {profileStatus?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—"}
          </span>
          {submittedAt && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: "6px 0 0" }}>
              Submitted: {formatDate(submittedAt)}
            </p>
          )}
          {reviewedAt && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", margin: "2px 0 0" }}>
              Reviewed: {formatDate(reviewedAt)}
            </p>
          )}
        </div>
      </div>

      {reviewComment && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">💬 Review Note: {reviewComment}</p>
        </div>
      )}

      {/* ── Personal Details ── */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          {s1 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Full Name"            value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")} />
              <Field label="Gender"               value={s1.gender ? s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1) : null} />
              <Field label="Date of Birth"        value={formatDate(s1.date_of_birth)} />
              <Field label="Marital Status"       value={s1.is_married ? "Married" : "Single"} />
              <Field label="Father's Name"        value={s1.fathers_name} />
              <Field label="Mother's Name"        value={s1.mothers_name} />
              {s1.mothers_maiden_name && <Field label="Mother's Maiden Name" value={s1.mothers_maiden_name} />}
              {s1.is_married && s1.gender?.toLowerCase() === "male" && (
                <>
                  {s1.wife_name        && <Field label="Wife's Name"        value={s1.wife_name} />}
                  {s1.wife_maiden_name && <Field label="Wife's Maiden Name" value={s1.wife_maiden_name} />}
                </>
              )}
              {s1.is_married && s1.gender?.toLowerCase() === "female" && (
                s1.husbands_name && <Field label="Husband's Name" value={s1.husbands_name} />
              )}
              <Field label="Surname in Use"       value={s1.surname_in_use} />
              <Field label="Surname as per Gotra" value={s1.surname_as_per_gotra} />
              <Field label="Disability"           value={s1.has_disability === "yes" || s1.has_disability === "true" ? "Yes" : "No"} />
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
        </CardContent>
      </Card>

      {/* ── Religious Details ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Religious Details</CardTitle>
        </CardHeader>
        <CardContent>
          {s2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Surname in Use"              value={typeof s2.surname_in_use === "string" ? s2.surname_in_use : null} />
                <Field label="Surname as per Gotra"        value={typeof s2.surname_as_per_gotra === "string" ? s2.surname_as_per_gotra : null} />
                <Field label="Family Priest"               value={typeof s2.priest_name === "string" ? s2.priest_name : null} />
                <Field label="Priest Location"             value={typeof s2.priest_location === "string" ? s2.priest_location : null} />
                <Field label="Gotra"                       value={typeof s2.gotra === "string" ? s2.gotra : null} />
                <Field label="Pravara"                     value={typeof s2.pravara === "string" ? s2.pravara : null} />
                <Field label="Upanama (General)"           value={typeof s2.upanama_general === "string" ? s2.upanama_general : null} />
                <Field label="Upanama (Proper)"            value={typeof s2.upanama_proper === "string" ? s2.upanama_proper : null} />
                <Field label="Kuladevata"                  value={
                  typeof s2.kuladevata_other === "string" && s2.kuladevata_other
                    ? s2.kuladevata_other
                    : typeof s2.kuladevata === "string" ? s2.kuladevata : null
                } />
                <Field label="Ancestral Tracing Challenge" value={s2.ancestral_challenge === "yes" ? "Yes" : s2.ancestral_challenge === "no" ? "No" : null} />
                {s2.ancestral_challenge === "yes" && (
                  <Field label="Common Relative Known Names" value={typeof s2.ancestral_challenge_notes === "string" ? s2.ancestral_challenge_notes : null} />
                )}
              </div>
              {allDemiGods.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Demi God(s)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {allDemiGods.map((god, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{god}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
        </CardContent>
      </Card>

      {/* ── Family Information ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Family Information</CardTitle>
        </CardHeader>
        <CardContent>
          {familyMembers.length > 0 ? (
            <div className="space-y-3">
              {familyType && (
                <Field label="Family Type" value={
                  familyType === "nuclear" ? "Nuclear Family"
                  : familyType === "joint" ? "Joint Family"
                  : familyType
                } />
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Relation","Name","Date of Birth","Gender","Status","Disability"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {familyMembers.map((m, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-3 py-2 font-medium">{m.relation}</td>
                        <td className="px-3 py-2">{m.name || "—"}</td>
                        <td className="px-3 py-2">{m.dob ? formatDate(m.dob) : m.age ? `Age ${m.age}` : "—"}</td>
                        <td className="px-3 py-2 capitalize">{m.gender || "—"}</td>
                        <td className="px-3 py-2">{m.status ? formatStatus(m.status) : "—"}</td>
                        <td className="px-3 py-2">{m.disability === "yes" ? "Yes" : m.disability === "no" ? "No" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
        </CardContent>
      </Card>

      {/* ── Location ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          {currentAddr ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Current Address</Label>
                <p className="text-sm font-medium mt-0.5">{formatAddress(currentAddr)}</p>
              </div>
              {hometownAddr && (
                <div>
                  <Label className="text-xs text-muted-foreground">Home Town Address</Label>
                  <p className="text-sm font-medium mt-0.5">{formatAddress(hometownAddr)}</p>
                </div>
              )}
              {oldAddresses.map((a, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">Previous Address {i + 1}</Label>
                  <p className="text-sm font-medium mt-0.5">{formatAddress(a)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
        </CardContent>
      </Card>

      {/* ── Education & Profession (Self) ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Education &amp; Profession</CardTitle>
        </CardHeader>
        <CardContent>
          {userEdu
            ? <EduBlock edu={userEdu} />
            : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>
          }
        </CardContent>
      </Card>

      {/* ── Economic Details ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Economic Details</CardTitle>
        </CardHeader>
        <CardContent>
          {s6eco ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <Label className="text-xs text-muted-foreground">Self Income</Label>
                  <p className="text-sm font-semibold">{formatIncome(typeof s6eco.self_income === "string" ? s6eco.self_income : null) || "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                  <Label className="text-xs text-muted-foreground">Family Income</Label>
                  <p className="text-sm font-semibold">{formatIncome(typeof s6eco.family_income === "string" ? s6eco.family_income : null) || "—"}</p>
                </div>
              </div>

              {fac.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Family Facilities</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {fac.map(f => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
                  </div>
                </div>
              )}

              {inv.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Investments</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {inv.map(iv => <Badge key={iv} variant="secondary" className="text-xs">{iv}</Badge>)}
                  </div>
                </div>
              )}

              {userIns && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Insurance</Label>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    <CoverageRow label="Health Insurance" value={hasCovArray(userIns.health_coverage)} />
                    <CoverageRow label="Life Insurance"   value={hasCovArray(userIns.life_coverage)} />
                    <CoverageRow label="Term Insurance"   value={hasCovArray(userIns.term_coverage)} />
                    <CoverageRow label="Konkani Card"     value={hasCovArray(userIns.konkani_card_coverage)} />
                  </div>
                </div>
              )}

              {userDoc && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    <CoverageRow label="Aadhaar"   value={hasCovScalar(userDoc.aadhaar_coverage)} />
                    <CoverageRow label="PAN"        value={hasCovScalar(userDoc.pan_coverage)} />
                    <CoverageRow label="Voter ID"   value={hasCovScalar(userDoc.voter_id_coverage)} />
                    <CoverageRow label="Land Docs"  value={hasCovScalar(userDoc.land_doc_coverage)} />
                    <CoverageRow label="DL"         value={hasCovScalar(userDoc.dl_coverage)} />
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
        </CardContent>
      </Card>

      {/* ── Family Members — Name/Relation Match ── */}
      {nonSelfMembers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Family Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {nonSelfMembers.map((member, idx) => {
              
              // FIX: Match Step 5 data by Name and Relation, not just index.
              const memberEdu = s5.find(s => 
                s.member_name === member.name && 
                s.member_relation === member.relation && 
                s.member_relation !== "Self"
              ) ?? null;
              
              const memberIns = s6ins.find(s => s.member_name === member.name && s.member_relation === member.relation && s.member_relation !== "Self") ?? null;
              const memberDoc = s6doc.find(s => s.member_name === member.name && s.member_relation === member.relation && s.member_relation !== "Self") ?? null;

              return (
                <div key={idx} className="space-y-4">
                  {idx > 0 && <div className="border-t border-border" />}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{member.name || `Member ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{member.relation}</p>
                    </div>
                  </div>

                  <div>
                    <SectionBlock title="Member Details" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Field label="Name"          value={member.name} />
                      <Field label="Relation"      value={member.relation} />
                      <Field label="Date of Birth" value={member.dob ? formatDate(member.dob) : member.age ? `Age: ${member.age}` : null} />
                      <Field label="Gender"        value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null} />
                      <Field label="Status"        value={member.status ? formatStatus(member.status) : null} />
                      <Field label="Disability"    value={member.disability === "yes" ? "Yes" : member.disability === "no" ? "No" : null} />
                    </div>
                  </div>

                  {memberEdu && (
                    <div>
                      <SectionBlock title="Education & Profession" />
                      <EduBlock edu={memberEdu} />
                    </div>
                  )}

                  {(memberIns || memberDoc) && (
                    <div>
                      <SectionBlock title="Insurance & Documents" />
                      <div className="space-y-4">
                        {memberIns && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Insurance</Label>
                            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                              <CoverageRow label="Health Insurance" value={hasCovArray(memberIns.health_coverage)} />
                              <CoverageRow label="Life Insurance"   value={hasCovArray(memberIns.life_coverage)} />
                              <CoverageRow label="Term Insurance"   value={hasCovArray(memberIns.term_coverage)} />
                              <CoverageRow label="Konkani Card"     value={hasCovArray(memberIns.konkani_card_coverage)} />
                            </div>
                          </div>
                        )}
                        {memberDoc && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                              <CoverageRow label="Aadhaar"   value={hasCovScalar(memberDoc.aadhaar_coverage)} />
                              <CoverageRow label="PAN"       value={hasCovScalar(memberDoc.pan_coverage)} />
                              <CoverageRow label="Voter ID"  value={hasCovScalar(memberDoc.voter_id_coverage)} />
                              <CoverageRow label="Land Docs" value={hasCovScalar(memberDoc.land_doc_coverage)} />
                              <CoverageRow label="DL"        value={hasCovScalar(memberDoc.dl_coverage)} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export default function UserManagementPage() {
  const [members, setMembers]               = useState<Member[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedUser, setSelectedUser]     = useState<Member | null>(null);
  const [profileData, setProfileData]       = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isMutating, setIsMutating]         = useState(false);

  useEffect(() => {
    api.get("/sangha/members")
      .then((data: any[]) => {
        const normalized: Member[] = data.map((u) => ({
          ...u,
          status: u.status || "approved",
          overall_completion_pct: u.overall_completion_pct ?? 0,
          first_name: u.first_name || null,
          last_name: u.last_name || null,
          profile_id: u.profile_id || u.id,
        }));
        setMembers(normalized);
      })
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
      setProfileData((prev: any) => prev ? { ...prev, profile: { ...prev.profile, status: "approved" } } : prev);
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
      setProfileData((prev: any) => prev ? { ...prev, profile: { ...prev.profile, status: "rejected" } } : prev);
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
      setProfileData((prev: any) => prev ? { ...prev, profile: { ...prev.profile, status: "changes_requested" } } : prev);
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

  const profileStatus = profileData?.profile?.status ?? "";
  const canReview = ["submitted", "under_review"].includes(profileStatus?.toLowerCase() ?? "");

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
                        No approved users found.
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
                              background: "#f9fafb", border: "1px solid #e5e7eb",
                              borderRadius: 6, padding: "5px 9px", cursor: "pointer",
                              fontSize: 13, lineHeight: 1,
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
            <div className="space-y-4">
              {canReview && (
                <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <button
                    onClick={handleApprove} disabled={isMutating}
                    style={{ background: "#dcfce7", color: "#064e3b", border: "1px solid #86efac", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={handleReject} disabled={isMutating}
                    style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={handleRequestChanges} disabled={isMutating}
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: isMutating ? "not-allowed" : "pointer", opacity: isMutating ? 0.6 : 1 }}
                  >
                    ↩ Request Changes
                  </button>
                </div>
              )}
              <ProfileViewer data={profileData} />
            </div>
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
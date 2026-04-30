"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare, ArrowLeft, Minus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

const INCOME_LABELS: Record<string, string> = {
  below_1l:   "Less than 1 Lakh",
  "1_2l":     "₹1 – 2 Lakh",
  "2_3l":     "₹2 – 3 Lakh",
  "3_5l":     "₹3 – 5 Lakh",
  "5_10l":    "₹5 – 10 Lakh",
  "10_25l":   "₹10 – 25 Lakh",
  "25l_plus": "₹25 Lakh+",
};

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

function hasCovArray(arr: unknown): boolean | null {
  if (!Array.isArray(arr)) return null;
  return arr.length > 0;
}

function hasCovScalar(val: unknown): boolean | null {
  if (val === "yes") return true;
  if (val === "no")  return false;
  if (Array.isArray(val)) return val.length > 0 ? true : false;
  return null;
}

/* ─── UI Primitives ──────────────────────────────────────────────────────────── */

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
  const industry     = typeof edu.industry === "string" ? edu.industry : "";
  const briefProfile = typeof edu.brief_profile === "string" ? edu.brief_profile : "";
  const educations   = (edu.educations as Record<string, string>[]) ?? [];
  const languages    = (edu.languages as { language: string; language_other?: string }[]) ?? [];

  const studyingValue: string =
    edu.is_currently_studying === true || edu.is_currently_studying === "true" ? "Yes" : "No";

  const workingValue: string =
    typeof edu.is_currently_working === "boolean"
      ? edu.is_currently_working ? "Yes" : "No"
      : typeof edu.is_currently_working === "string" && edu.is_currently_working !== ""
        ? edu.is_currently_working === "true" ? "Yes" : "No"
        : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Currently Studying" value={studyingValue} />
        <Field label="Currently Working"  value={workingValue} />
        {profType     && <Field label="Profession"       value={formatProfession(profType)} />}
        {industry     && <Field label="Industry / Field" value={industry} />}
        {briefProfile && <Field label="Brief Profile"    value={briefProfile} />}
      </div>

      {educations.filter(e => e.degree_type).length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Education</Label>
          <div className="space-y-2">
            {educations.filter(e => e.degree_type).map((e, i) => (
              <div key={i} className="p-3 border rounded-lg text-sm space-y-1">
                <p className="font-medium">{e.degree_type}</p>
                {e.degree_name && <p>{e.degree_name}</p>}
                {e.university  && <p>{e.university}</p>}
                {e.start_date && e.end_date && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.start_date)} – {formatDate(e.end_date)}
                  </p>
                )}
                {e.certificate && (
                  <p className="text-xs text-muted-foreground">Cert: {e.certificate}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {languages.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Languages Known</Label>
          <div className="flex flex-wrap gap-2">
            {languages.map((l, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {getLangLabel(l)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Profile Viewer ─────────────────────────────────────────────────────────── */

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

  const profile       = data?.profile as Record<string, unknown> | null;
  const completionPct = typeof profile?.overall_completion_pct === "number" ? profile.overall_completion_pct : 0;
  const profileStatus = typeof profile?.status === "string" ? profile.status : "";
  const submittedAt   = typeof profile?.submitted_at === "string" ? profile.submitted_at : null;
  const reviewedAt    = typeof profile?.reviewed_at === "string" ? profile.reviewed_at : null;
  const reviewComment = typeof profile?.review_comment === "string" ? profile.review_comment : null;

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

  // ── INDEX-BASED: row 0 = Self, row 1+ = family members (same order as DB sort_order) ──
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

  // Non-self members only
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
        <div style={{ zIndex: 1, textAlign: "right", flexShrink: 0 }}>
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
              <Field label="Marital Status" value={
  s1.marital_status === "single_never_married" ? "Single (Never Married)" :
  s1.marital_status === "married"              ? "Married" :
  s1.marital_status === "single_divorced"      ? "Single / Divorced" :
  s1.marital_status === "single_widowed"       ? "Single / Widowed" :
  null
} />
              <Field label="Father's Name"        value={s1.fathers_name} />
              <Field label="Mother's Name"        value={s1.mothers_name} />
              {s1.mothers_maiden_name && <Field label="Mother's Maiden Name" value={s1.mothers_maiden_name} />}
              {s1.marital_status === "married" && s1.gender?.toLowerCase() === "male" && (
                <>
                  {s1.wife_name        && <Field label="Wife's Name"        value={s1.wife_name} />}
                  {s1.wife_maiden_name && <Field label="Wife's Maiden Name" value={s1.wife_maiden_name} />}
                </>
              )}
              {s1.marital_status === "married" && s1.gender?.toLowerCase() === "female" && (
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

      {/* ── Family Members — index-based (0=Self already used above, 1+ = family) ── */}
      {nonSelfMembers.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Family Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {nonSelfMembers.map((member, idx) => {
              // idx+1 because index 0 is Self
              const memberEdu = s5[idx + 1]    ?? null;
              const memberIns = s6ins[idx + 1] ?? null;
              const memberDoc = s6doc[idx + 1] ?? null;

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

/* ─── Review Content ─────────────────────────────────────────────────────────── */

function ReviewContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const userId  = params.get("id");

  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | "changes" | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const result = await api.get(`/sangha/review-user/${userId}`);
        setData(result);
      } catch (err: any) {
        toast.error(err.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleDecision = async (action: "approve" | "reject" | "changes") => {
    if (action !== "approve" && !comment.trim()) {
      toast.error("Please add a comment before rejecting or requesting changes");
      return;
    }
    setSubmitting(action);
    try {
      const endpoint =
        action === "approve" ? "/sangha/approve"
        : action === "reject" ? "/sangha/reject"
        : "/sangha/request-changes";
      await api.post(endpoint, { userId, comment: comment.trim() || undefined });
      toast.success(
        action === "approve" ? "User approved!"
        : action === "reject" ? "User rejected"
        : "Changes requested"
      );
      router.push("/sangha/pending-users");
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setSubmitting(null);
    }
  };

  if (!userId) return <p className="text-muted-foreground p-8">No user selected.</p>;
  if (loading)  return <p className="text-muted-foreground p-8">Loading application...</p>;
  if (!data)    return <p className="text-muted-foreground p-8">Could not load application.</p>;

  const { profile } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/sangha/pending-users")}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Review Application</h1>
            <p className="text-muted-foreground mt-1">Verify details before making a decision</p>
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">{profile?.status?.replace(/_/g, " ")}</Badge>
      </div>

      <ProfileViewer data={data} />

      <Card className="shadow-sm bg-secondary/30">
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>Add a comment (required for reject / request changes)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Add notes or reason for your decision..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" onClick={() => handleDecision("approve")} disabled={submitting !== null}>
              <CheckCircle2 className="h-4 w-4" />
              {submitting === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleDecision("changes")} disabled={submitting !== null}>
              <MessageSquare className="h-4 w-4" />
              {submitting === "changes" ? "Requesting..." : "Request Changes"}
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => handleDecision("reject")} disabled={submitting !== null}>
              <XCircle className="h-4 w-4" />
              {submitting === "reject" ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function ReviewUserPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading...</p>}>
      <ReviewContent />
    </Suspense>
  );
}
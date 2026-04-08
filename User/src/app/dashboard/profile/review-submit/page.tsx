"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Send, Edit, CheckCircle2, Loader2, Lock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { INCOME_SLAB_REVERSE } from "@/lib/constants";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatIncome(raw?: string | null): string | null {
  if (!raw) return null;
  if (INCOME_SLAB_REVERSE[raw]) return INCOME_SLAB_REVERSE[raw];
  return raw.replace(/_/g, " – ").replace(/l$/, " Lakh");
}

function getLangLabel(l: { language: string; language_other?: string }): string {
  return l.language === "Other"
    ? String(l.language_other ?? "")
    : String(l.language ?? "");
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      value
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {value ? <CheckCircle2 className="h-3 w-3" /> : null}
      {value ? "Yes" : "No"}
    </span>
  );
}

function CoverageRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <YesNoBadge value={value} />
    </div>
  );
}

function SectionHeader({
  title, href, isLocked, memberIndex,
}: {
  title: string; href: string; isLocked: boolean; memberIndex?: number;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between py-2 border-b border-border mb-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {!isLocked && (
        <Button
          variant="ghost" size="sm" className="gap-1.5 text-primary h-7"
          onClick={() => {
            if (memberIndex !== undefined) {
              sessionStorage.setItem("openMemberIndex", String(memberIndex));
            }
            router.push(href);
          }}
        >
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
      )}
    </div>
  );
}

function hasCoverage(obj: Record<string, unknown> | undefined, key: string): boolean {
  return Array.isArray(obj?.[key]) && (obj![key] as string[]).length > 0;
}

function findMemberRow(
  rows: Record<string, unknown>[],
  name: string,
  relation: string
): Record<string, unknown> | undefined {
  return rows.find(
    r =>
      (r.member_name as string) === name &&
      (r.member_relation as string) === relation
  );
}

function formatAddress(a: Record<string, string>): string {
  return [a.flat_no, a.building, a.street, a.landmark, a.area, a.city, a.taluk, a.district, a.pincode, a.country]
    .filter(Boolean).join(", ");
}

function formatTenure(t: string): string {
  if (t === "part_time") return "Part Time";
  if (t === "full_time") return "Full Time";
  return t;
}

function formatStatus(s: string): string {
  if (s === "active") return "Active";
  if (s === "passed_away") return "Passed Away";
  if (s === "unknown") return "Unknown";
  return s;
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

interface Sangha {
  id: string;
  sangha_name: string;
  location: string;
}

function EduBlock({ edu }: { edu: Record<string, unknown> }) {
  const profType     = typeof edu.profession_type === "string" ? edu.profession_type : "";
  const industry     = typeof edu.industry === "string" ? edu.industry : "";
  const briefProfile = typeof edu.brief_profile === "string" ? edu.brief_profile : "";
  const educations   = (edu.educations as Record<string, string>[]) ?? [];
  const languages    = (edu.languages as { language: string; language_other?: string }[]) ?? [];
  const isStudying   = edu.is_currently_studying === true || edu.is_currently_studying === "true";

  const workingValue: string | null =
    typeof edu.is_currently_working === "boolean"
      ? edu.is_currently_working ? "Yes" : "No"
      : typeof edu.is_currently_working === "string" && edu.is_currently_working !== ""
        ? edu.is_currently_working === "true" ? "Yes" : "No"
        : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Currently Studying" value={isStudying ? "Yes" : "No"} />
        {isStudying && workingValue && (
          <Field label="Currently Working" value={workingValue} />
        )}
        {profType && <Field label="Profession" value={formatProfession(profType)} />}
        {industry && <Field label="Industry / Field" value={industry} />}
        {briefProfile && <Field label="Brief Profile" value={briefProfile} />}
      </div>

      {educations.filter(e => e.degree_type).length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Education</Label>
          <div className="space-y-2">
            {educations.filter(e => e.degree_type).map((e, i) => (
              <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 p-3 rounded-lg bg-muted/30 border border-border text-sm">
                <span className="font-medium">{e.degree_type}</span>
                {e.degree_name && <span className="text-muted-foreground">{e.degree_name}</span>}
                {e.university && <span className="text-muted-foreground">{e.university}</span>}
                {e.start_date && e.end_date && (
                  <span className="text-muted-foreground text-xs">{formatDate(e.start_date)} – {formatDate(e.end_date)}</span>
                )}
                {e.certificate && <span className="text-muted-foreground text-xs">Cert: {e.certificate}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {languages.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Languages Known</Label>
          <div className="flex flex-wrap gap-1">
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

export default function Page() {
  const router = useRouter();
  const [confirmed, setConfirmed]               = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [submitting, setSubmitting]             = useState(false);
  const [profileData, setProfileData]           = useState<Record<string, unknown> | null>(null);
  const [profileMeta, setProfileMeta]           = useState<Record<string, unknown> | null>(null);
  const [sanghas, setSanghas]                   = useState<Sangha[]>([]);
  const [selectedSangha, setSelectedSangha]     = useState("");
  const [errors, setErrors]                     = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get("/users/profile/full"),
      api.get("/users/profile"),
      api.get("/sangha/approved-list"),
    ]).then(([full, meta, sanghaList]) => {
      setProfileData(full);
      setProfileMeta(meta);
      setSanghas(sanghaList);
      if (meta?.sangha_id) setSelectedSangha(meta.sangha_id as string);
    }).catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const status      = typeof profileMeta?.status === "string" ? profileMeta.status : "";
  const isLocked    = ["submitted", "under_review"].includes(status);
  const submittedAt = typeof profileMeta?.submitted_at === "string" ? profileMeta.submitted_at : null;

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSangha) newErrors.sangha = "Please select a Sangha";
    if (!confirmed) newErrors.confirmation = "Please confirm that all details are accurate";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/users/profile/submit", { sangha_id: selectedSangha });
      toast.success("Profile submitted successfully!");
      setShowSubmitDialog(false);
      router.push("/dashboard/status");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
    </div>
  );

  const s1    = profileData?.step1 as Record<string, string> | null;
  const s2    = profileData?.step2 as Record<string, unknown> | null;
  const s4    = profileData?.step4 as Record<string, string>[] | null;
  const s5    = profileData?.step5 as Record<string, unknown>[] | null;
  const s6eco = (profileData?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = ((profileData?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || []);
  const s6doc = ((profileData?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || []);

  const s3typed = profileData?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  let familyMembers: Record<string, string>[] = s3typed?.members || [];
  const s3raw = profileData?.step3;
  if (Array.isArray(s3raw) && familyMembers.length === 0) {
    familyMembers = s3raw as Record<string, string>[];
  }

  const currentAddr  = s4?.find(a => a.address_type === "current");
  const hometownAddr = s4?.find(a => a.address_type === "hometown");
  const oldAddresses = s4?.filter(a => a.address_type?.startsWith("old_")) || [];

  const s2DemiGodsRaw = s2?.demi_gods;
  const demiGodsList: string[] = Array.isArray(s2DemiGodsRaw)
    ? s2DemiGodsRaw as string[]
    : typeof s2DemiGodsRaw === "string"
      ? s2DemiGodsRaw.split(",").map(d => d.trim()).filter(Boolean)
      : [];
  const demiGodOther = typeof s2?.demi_god_other === "string" ? s2.demi_god_other : null;
  const allDemiGods = [
    ...demiGodsList.filter(d => d !== "Other"),
    ...(demiGodOther ? demiGodOther.split(",").map(t => t.trim()).filter(Boolean) : []),
  ];

  const userName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "";
  const userIns  = findMemberRow(s6ins, userName, "Self") ?? s6ins.find(r => (r.member_relation as string) === "Self");
  const userDoc  = findMemberRow(s6doc, userName, "Self") ?? s6doc.find(r => (r.member_relation as string) === "Self");
  const userEdu  = s5?.[0] ?? null;

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

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Review &amp; Submit</h1>
          <p className="text-muted-foreground mt-1">Step 7 of 7: Review all your information before submitting</p>
        </div>

        <Stepper steps={steps} currentStep={6} />

        {isLocked && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">Profile Locked</p>
                  <p className="text-sm text-blue-600">
                    Your profile is under review. Editing is disabled until Sangha completes the review.
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 capitalize">{status.replace("_", " ")}</Badge>
              </div>
              {submittedAt && (
                <div className="flex items-center gap-2 mt-3 text-xs text-blue-600 border-t border-blue-200 pt-3">
                  <Calendar className="h-3.5 w-3.5" />
                  Submitted on: {new Date(submittedAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Your Information ── */}
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-lg">Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Personal */}
            <div>
              <SectionHeader title="Personal Details" href="/dashboard/profile/personal-details" isLocked={isLocked} />
              {s1 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Full Name"      value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")} />
                  <Field label="Gender"         value={s1.gender ? s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1) : null} />
                  <Field label="Date of Birth"  value={formatDate(s1.date_of_birth)} />
                  <Field label="Marital Status" value={s1.is_married ? "Married" : "Single"} />
                  <Field label="Father's Name"  value={s1.fathers_name} />
                  <Field label="Mother's Name"  value={s1.mothers_name} />
                  <Field label="Surname in Use" value={s1.surname_in_use} />
                  <Field label="Surname as per Gotra" value={s1.surname_as_per_gotra} />
                  <Field label="Disability" value={s1.has_disability === "yes" || s1.has_disability === "true" ? "Yes" : "No"} />
                  {(s1.is_part_of_sangha === "yes" || s1.is_part_of_sangha === "true") && (
                    <>
                      <Field label="Sangha Name"   value={s1.sangha_name} />
                      <Field label="Sangha Role"   value={s1.sangha_role} />
                      <Field label="Sangha Tenure" value={formatTenure(s1.sangha_tenure)} />
                    </>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

            <Separator />

            {/* Religious */}
            <div>
              <SectionHeader title="Religious Details" href="/dashboard/profile/religious-details" isLocked={isLocked} />
              {s2 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Surname in Use"       value={typeof s2.surname_in_use === "string" ? s2.surname_in_use : null} />
                    <Field label="Surname as per Gotra" value={typeof s2.surname_as_per_gotra === "string" ? s2.surname_as_per_gotra : null} />
                    <Field label="Family Priest"        value={typeof s2.priest_name === "string" ? s2.priest_name : null} />
                    <Field label="Priest Location"      value={typeof s2.priest_location === "string" ? s2.priest_location : null} />
                    <Field label="Gotra"                value={typeof s2.gotra === "string" ? s2.gotra : null} />
                    <Field label="Pravara"              value={typeof s2.pravara === "string" ? s2.pravara : null} />
                    <Field label="Upanama (General)"    value={typeof s2.upanama_general === "string" ? s2.upanama_general : null} />
                    <Field label="Upanama (Proper)"     value={typeof s2.upanama_proper === "string" ? s2.upanama_proper : null} />
                    <Field label="Kuladevata"           value={
                      typeof s2.kuladevata_other === "string" && s2.kuladevata_other
                        ? s2.kuladevata_other
                        : typeof s2.kuladevata === "string" ? s2.kuladevata : null
                    } />
                    <Field
                      label="Ancestral Tracing Challenge"
                      value={s2.ancestral_challenge === "yes" ? "Yes" : s2.ancestral_challenge === "no" ? "No" : null}
                    />
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
            </div>

            <Separator />

            {/* Family */}
            <div>
              <SectionHeader title="Family Information" href="/dashboard/profile/family-information" isLocked={isLocked} />
              {familyMembers.length > 0 ? (
                <div className="space-y-3">
                  {s3typed?.family_info?.family_type && (
                    <Field
                      label="Family Type"
                      value={
                        s3typed.family_info.family_type === "nuclear"
                          ? "Nuclear Family"
                          : s3typed.family_info.family_type === "joint"
                            ? "Joint Family"
                            : s3typed.family_info.family_type
                      }
                    />
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
            </div>

            <Separator />

            {/* Location */}
            <div>
              <SectionHeader title="Location" href="/dashboard/profile/location-information" isLocked={isLocked} />
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
            </div>

            <Separator />

            {/* Education – user */}
            <div>
              <SectionHeader title="Education &amp; Profession" href="/dashboard/profile/education-profession" isLocked={isLocked} />
              {userEdu
                ? <EduBlock edu={userEdu} />
                : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>
              }
            </div>

            <Separator />

            {/* Economic */}
            <div>
              <SectionHeader title="Economic Details" href="/dashboard/profile/economic-details" isLocked={isLocked} />
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
                        <CoverageRow label="Health Insurance" value={hasCoverage(userIns, "health_coverage")} />
                        <CoverageRow label="Life Insurance"   value={hasCoverage(userIns, "life_coverage")} />
                        <CoverageRow label="Term Insurance"   value={hasCoverage(userIns, "term_coverage")} />
                        <CoverageRow label="Konkani Card"     value={hasCoverage(userIns, "konkani_card_coverage")} />
                      </div>
                    </div>
                  )}

                  {userDoc && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                        <CoverageRow label="Aadhaar"   value={hasCoverage(userDoc, "aadhaar_coverage")} />
                        <CoverageRow label="PAN"       value={hasCoverage(userDoc, "pan_coverage")} />
                        <CoverageRow label="Voter ID"  value={hasCoverage(userDoc, "voter_id_coverage")} />
                        <CoverageRow label="Land Docs" value={hasCoverage(userDoc, "land_doc_coverage")} />
                        <CoverageRow label="DL"        value={hasCoverage(userDoc, "dl_coverage")} />
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

          </CardContent>
        </Card>

        {/* ── Family Members ── */}
        {familyMembers.filter(m => m.relation !== "Self").length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Family Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {familyMembers.filter(m => m.relation !== "Self").map((member, idx) => {
                const memberEdu = s5?.[idx + 1];
                const memberIns = findMemberRow(s6ins, member.name, member.relation);
                const memberDoc = findMemberRow(s6doc, member.name, member.relation);

                return (
                  <div key={idx} className="space-y-4">
                    {idx > 0 && <Separator />}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{member.name || `Member ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{member.relation}</p>
                      </div>
                    </div>

                    {/* Member basic details */}
                    <div>
                      <SectionHeader title="Member Details" href="/dashboard/profile/family-information" isLocked={isLocked} />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Name"       value={member.name} />
                        <Field label="Relation"   value={member.relation} />
                        <Field label="Date of Birth" value={member.dob ? formatDate(member.dob) : member.age ? `Age: ${member.age}` : null} />
                        <Field label="Gender"     value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null} />
                        <Field label="Status"     value={member.status ? formatStatus(member.status) : null} />
                        <Field label="Disability" value={member.disability === "yes" ? "Yes" : member.disability === "no" ? "No" : null} />
                      </div>
                    </div>

                    {/* Member education */}
                    {memberEdu && (
                      <div>
                        <SectionHeader title="Education &amp; Profession" href="/dashboard/profile/education-profession" isLocked={isLocked} memberIndex={idx + 1} />
                        <EduBlock edu={memberEdu} />
                      </div>
                    )}

                    {/* Member insurance + docs */}
                    {(memberIns || memberDoc) && (
                      <div>
                        <SectionHeader title="Insurance &amp; Documents" href="/dashboard/profile/economic-details" isLocked={isLocked} memberIndex={idx + 1} />
                        <div className="space-y-4">
                          {memberIns && (
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Insurance</Label>
                              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                                <CoverageRow label="Health Insurance" value={hasCoverage(memberIns, "health_coverage")} />
                                <CoverageRow label="Life Insurance"   value={hasCoverage(memberIns, "life_coverage")} />
                                <CoverageRow label="Term Insurance"   value={hasCoverage(memberIns, "term_coverage")} />
                                <CoverageRow label="Konkani Card"     value={hasCoverage(memberIns, "konkani_card_coverage")} />
                              </div>
                            </div>
                          )}
                          {memberDoc && (
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                                <CoverageRow label="Aadhaar"   value={hasCoverage(memberDoc, "aadhaar_coverage")} />
                                <CoverageRow label="PAN"       value={hasCoverage(memberDoc, "pan_coverage")} />
                                <CoverageRow label="Voter ID"  value={hasCoverage(memberDoc, "voter_id_coverage")} />
                                <CoverageRow label="Land Docs" value={hasCoverage(memberDoc, "land_doc_coverage")} />
                                <CoverageRow label="DL"        value={hasCoverage(memberDoc, "dl_coverage")} />
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

        {/* ── Submit section ── */}
        {!isLocked && (
          <>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Select Sangha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="sangha">Submit application to</Label>
                <Select value={selectedSangha} onValueChange={(v) => { setSelectedSangha(v); setErrors(e => ({ ...e, sangha: "" })); }}>
                  <SelectTrigger className={errors.sangha ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a Sangha" />
                  </SelectTrigger>
                  <SelectContent>
                    {sanghas.length === 0 ? (
                      <SelectItem value="none" disabled>No approved Sanghas available</SelectItem>
                    ) : (
                      sanghas.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.sangha_name} — {s.location}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.sangha && <p className="text-xs text-destructive">{errors.sangha}</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-secondary/30">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="confirmation" checked={confirmed}
                    onCheckedChange={c => { setConfirmed(c as boolean); setErrors(e => ({ ...e, confirmation: "" })); }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="confirmation" className="cursor-pointer leading-relaxed">
                      I confirm that all the information provided above is accurate and true to the best of my knowledge.
                      I understand that providing false information may result in rejection of my application.
                    </Label>
                    {errors.confirmation && <p className="text-xs text-destructive">{errors.confirmation}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <Button variant="outline" onClick={() => router.push("/dashboard/profile/economic-details")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Previous Step
              </Button>
              <Button onClick={handleSubmit} className="gap-2">
                <Send className="h-4 w-4" /> Submit for Approval
              </Button>
            </div>
          </>
        )}

        {isLocked && (
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/status")}>View Status</Button>
          </div>
        )}
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Submit Profile for Approval?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, your profile will be sent to the selected Sangha for verification.
              You will not be able to make changes until the review is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Yes, Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
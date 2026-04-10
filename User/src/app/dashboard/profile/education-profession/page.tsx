"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Plus, Trash2, X, RotateCcw, GraduationCap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAutoSave } from "@/lib/useAutoSave";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

const degreeTypes = [
  "High School",
  "Pre-University",
  "Diploma & Associate Degree",
  "Undergraduate / Bachelor's",
  "Postgraduate / Master's",
  "Doctorate",
  "Specialised Professional Degree",
];

const professionTypes = [
  { label: "Self Employed or Business",                              value: "self_employed" },
  { label: "Science, Technology, Engineering & Mathematics",         value: "stem" },
  { label: "Healthcare & Medicine",                                  value: "healthcare" },
  { label: "Business & Management",                                  value: "business" },
  { label: "Law & Governance",                                       value: "law" },
  { label: "Education & Research",                                   value: "education" },
  { label: "Arts, Media & Communication",                            value: "arts_media" },
  { label: "Trades & Vocational Professions",                        value: "trades" },
  { label: "Agriculture & Others",                                   value: "agriculture" },
];

const languageOptions = [
  "RSB Konkani","GSB Konkani","Kannada","Tulu","Marathi","Hindi",
  "Malayalam","Gujarati","English","Tamil","Telugu","Other",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface EducationEntry {
  id: string;
  degreeName: string;
  degreeType: string;
  university: string;
  startDate: string;
  endDate: string;
  certificate: string;
}

interface MemberData {
  id: string;
  name: string;
  relation: string;
  educations: EducationEntry[];
  isCurrentlyStudying: boolean | null;
  isCurrentlyWorking: boolean | null;
  profession: string;
  industry: string;
  briefProfile: string;
  languages: string[];
  otherLanguages: string[];
  otherLanguageInput: string;
}

function blankEducation(): EducationEntry {
  return {
    id: Date.now().toString() + Math.random(),
    degreeName: "",
    degreeType: "",
    university: "",
    startDate: "",
    endDate: "",
    certificate: "",
  };
}

function blankMember(id: string, name = "", relation = ""): MemberData {
  return {
    id,
    name,
    relation,
    educations: [blankEducation()],
    isCurrentlyStudying: null,
    isCurrentlyWorking: null,
    profession: "",
    industry: "",
    briefProfile: "",
    languages: [],
    otherLanguages: [],
    otherLanguageInput: "",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildExpectedMembers(
  data: Record<string, unknown>
): { id: string; name: string; relation: string }[] {
  const s1 = data.step1 as Record<string, string> | null;
  const userName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "You";

  const familyMembers = (
    ((data.step3 as Record<string, unknown>)?.members as Record<string, string>[]) || []
  ).filter((fm) => fm?.relation && fm.relation !== "Self");

  return [
    { id: "self", name: userName, relation: "Self" },
    ...familyMembers.map((fm, i) => ({
      id: `fm_${i}`,
      name: fm.name || "",
      relation: fm.relation || "",
    })),
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const [members, setMembers]                 = useState<MemberData[]>([blankMember("self", "", "Self")]);
  const [errors, setErrors]                   = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading]                 = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting]             = useState(false);
  const [canReset, setCanReset]               = useState(false);
  const [expectedMembers, setExpectedMembers] = useState<{ id: string; name: string; relation: string }[]>([]);

  useEffect(() => {
    api.get("/users/profile").then((meta: unknown) => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data: unknown) => {
      const fullData = data as Record<string, unknown>;

      const expected = buildExpectedMembers(fullData);
      setExpectedMembers(expected);

      const step5Raw = fullData.step5;
      const step5 = Array.isArray(step5Raw) ? step5Raw as Record<string, unknown>[] : [];

      if (step5.length > 0) {
        const mapped: MemberData[] = expected.map((base, i) => {
          let m: Record<string, unknown> | undefined;

          if (base.relation === "Self") {
            m = step5.find(s => (s.member_relation as string) === "Self");
          } else {
            m = step5.find(
              s =>
                (s.member_name as string) === base.name &&
                (s.member_relation as string) === base.relation
            );
            if (!m) {
              const nonSelfStep5 = step5.filter(s => (s.member_relation as string) !== "Self");
              m = nonSelfStep5[i - 1];
            }
          }

          if (!m) return blankMember(base.id, base.name, base.relation);

          const rawLangs = (m.languages as { language: string; language_other?: string }[]) || [];
          const otherEntry = rawLangs.find(l => l.language === "Other");
          const otherLangs = otherEntry?.language_other
            ?.split(",")
            .map((s: string) => s.trim())
            .filter(Boolean) || [];

          const rawEdus = (m.educations as Record<string, string>[]) || [];
          const educations: EducationEntry[] = rawEdus.length > 0
            ? rawEdus.map(e => ({
                id: e.id || Date.now().toString() + Math.random(),
                degreeName:  e.degree_name  || "",
                degreeType:  e.degree_type  || "",
                university:  e.university   || "",
                startDate:   e.start_date   || "",
                endDate:     e.end_date     || "",
                certificate: e.certificate  || "",
              }))
            : [blankEducation()];

          const isStudyingRaw = m.is_currently_studying;
          const isStudying: boolean | null =
            isStudyingRaw === true  ? true  :
            isStudyingRaw === false ? false :
            null;

          const isWorkingRaw = m.is_currently_working;
          const isWorking: boolean | null =
            isWorkingRaw === true  ? true  :
            isWorkingRaw === false ? false :
            null;

          return {
            id:           base.id,
            name:         base.name,
            relation:     base.relation,
            educations,
            isCurrentlyStudying: isStudying,
            isCurrentlyWorking:  isWorking,
            profession:   (m.profession_type as string) || "",
            industry:     (m.industry        as string) || "",
            briefProfile: (m.brief_profile   as string) || "",
            languages:    rawLangs
              .filter(l => l.language !== "Other")
              .map(l => l.language),
            otherLanguages:    otherLangs,
            otherLanguageInput: "",
          };
        });

        setMembers(mapped);
      } else {
        setMembers(expected.map(m => blankMember(m.id, m.name, m.relation)));
      }
    }).catch(() => {});
  }, []);

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateMember = (id: string, field: keyof MemberData, value: unknown) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setErrors(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field as string]: "" } }));
  };

  const updateEducation = (memberId: string, eduId: string, field: keyof EducationEntry, value: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        educations: m.educations.map(e => e.id === eduId ? { ...e, [field]: value } : e),
      };
    }));
  };

  const addEducation = (memberId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return { ...m, educations: [...m.educations, blankEducation()] };
    }));
  };

  const removeEducation = (memberId: string, eduId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      if (m.educations.length <= 1) return m;
      return { ...m, educations: m.educations.filter(e => e.id !== eduId) };
    }));
  };

  // FIX: No longer resets isCurrentlyWorking, profession, industry, briefProfile
  const setCurrentlyStudying = (id: string, val: boolean) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        isCurrentlyStudying: val,
      };
    }));
    setErrors(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), isCurrentlyStudying: "" },
    }));
  };

  // FIX: No longer resets profession, industry, briefProfile when switching to not working
  const setCurrentlyWorking = (id: string, val: boolean) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        isCurrentlyWorking: val,
      };
    }));
    setErrors(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), isCurrentlyWorking: "" },
    }));
  };

  const toggleLanguage = (id: string, lang: string) => {
    const m = members.find(x => x.id === id)!;
    updateMember(
      id,
      "languages",
      m.languages.includes(lang)
        ? m.languages.filter(l => l !== lang)
        : [...m.languages, lang]
    );
  };

  const addOtherLanguage = (id: string) => {
    const m = members.find(x => x.id === id)!;
    const val = m.otherLanguageInput.trim();
    if (val && !m.otherLanguages.includes(val)) {
      updateMember(id, "otherLanguages", [...m.otherLanguages, val]);
      updateMember(id, "otherLanguageInput", "");
    }
  };

  const removeOtherLanguage = (id: string, lang: string) => {
    const m = members.find(x => x.id === id)!;
    updateMember(id, "otherLanguages", m.otherLanguages.filter(l => l !== lang));
  };

  // FIX: Profession is ALWAYS shown — no dependency on studying/working
  const showProfession = (_m: MemberData): boolean => {
    return true;
  };

  // FIX: isComplete now requires both studying AND working to be answered (independently),
  // and profession is always required
  const isComplete = (m: MemberData): boolean => {
    if (!m.educations.some(e => e.degreeType.trim() !== "")) return false;
    if (m.isCurrentlyStudying === null) return false;
    if (m.isCurrentlyWorking === null) return false;
    if (!m.profession) return false;
    return true;
  };

  // ── Payload ───────────────────────────────────────────────────────────────

  const buildPayload = () => ({
    members: members.map(m => ({
      member_name:           m.name     || null,
      member_relation:       m.relation || null,
      is_currently_studying: m.isCurrentlyStudying,
      is_currently_working:  m.isCurrentlyWorking,
      profession_type:       m.profession   || null,
      industry:              m.industry     || null,
      brief_profile:         m.briefProfile || null,
      educations: m.educations
        .filter(e => e.degreeType && e.degreeType.trim() !== "")
        .map(e => ({
          degree_name:  e.degreeName  || null,
          degree_type:  e.degreeType  || null,
          university:   e.university  || null,
          start_date:   e.startDate   || null,
          end_date:     e.endDate     || null,
          certificate:  e.certificate || null,
        })),
      languages: [
        ...m.languages
          .filter(l => l !== "Other")
          .map(l => ({ language: l, language_other: null })),
        ...(m.otherLanguages.length > 0
          ? [{ language: "Other", language_other: m.otherLanguages.join(", ") }]
          : []),
      ],
    })),
  });

  useAutoSave("/users/profile/step5", buildPayload, [members], true);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors: Record<string, Record<string, string>> = {};
    let valid = true;

    members.forEach(m => {
      const e: Record<string, string> = {};

      if (!m.educations.some(edu => edu.degreeType.trim() !== "")) {
        e.education = "At least one education entry with degree type is required";
        valid = false;
      }

      // FIX: Both studying and working are independently required
      if (m.isCurrentlyStudying === null) {
        e.isCurrentlyStudying = "Please answer this question";
        valid = false;
      }

      if (m.isCurrentlyWorking === null) {
        e.isCurrentlyWorking = "Please answer this question";
        valid = false;
      }

      // FIX: Profession always required
      if (!m.profession) {
        e.profession = "Required";
        valid = false;
      }

      if (m.languages.includes("Other") && m.otherLanguages.length === 0) {
        e.otherLanguages = "Please add at least one language";
        valid = false;
      }

      newErrors[m.id] = e;
    });

    setErrors(newErrors);
    return valid;
  };

  const handleNext = async () => {
    if (!validate()) {
      toast.error("Please complete required fields for all members");
      return;
    }
    setLoading(true);
    try {
      await api.post("/users/profile/step5", buildPayload());
      toast.success("Education & profession saved!");
      router.push("/dashboard/profile/economic-details");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset/step5", {});
      toast.success("Education & profession cleared.");
      setMembers(expectedMembers.map(m => blankMember(m.id, m.name, m.relation)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Education &amp; Profession</h1>
          <p className="text-muted-foreground mt-1">Step 5 of 7 — Fill education and profession details for each member</p>
        </div>
        {canReset && (
          <Button
            variant="outline" size="sm"
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={4} />

      {/* Members Accordion */}
      <Accordion type="multiple" defaultValue={members.map(m => m.id)} className="space-y-3">
        {members.map((member, index) => (
          <AccordionItem
            key={member.id} value={member.id}
            className="border border-border rounded-xl overflow-hidden shadow-sm bg-white"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:bg-muted/10">
              <div className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{member.name || `Member ${index + 1}`}</p>
                  <p className="text-xs text-muted-foreground">{member.relation || "Relation not set"}</p>
                </div>
                <div className="mr-2">
                  <Badge
                    variant="outline"
                    className={isComplete(member)
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-orange-50 text-orange-600 border-orange-200"
                    }
                  >
                    {isComplete(member) ? "✓ Complete" : "Incomplete"}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-6 pt-4 border-t border-border space-y-8">

              {/* Member identity row */}
              <div className="grid md:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Member Name</Label>
                  <p className="font-medium text-sm mt-0.5">{member.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Relation</Label>
                  <p className="font-medium text-sm mt-0.5">{member.relation || "—"}</p>
                </div>
              </div>

              {/* ══ EDUCATION ══ */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" /> Education
                  </p>
                </div>

                {errors[member.id]?.education && (
                  <p className="text-xs text-destructive">{errors[member.id].education}</p>
                )}

                <div className="space-y-4">
                  {member.educations.map((edu) => (
                    <div key={edu.id} className="border border-border rounded-xl p-5 bg-muted/20 space-y-4">

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Degree Name</Label>
                        <Input
                          placeholder="e.g. Bachelor of Engineering"
                          value={edu.degreeName}
                          onChange={e => updateEducation(member.id, edu.id, "degreeName", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Type of Degree <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={edu.degreeType || ""}
                          onValueChange={v => updateEducation(member.id, edu.id, "degreeType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select degree type" />
                          </SelectTrigger>
                          <SelectContent>
                            {degreeTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">University / School / Institution</Label>
                        <Input
                          placeholder="e.g. Maharaja Institute of Technology Mysore"
                          value={edu.university}
                          onChange={e => updateEducation(member.id, edu.id, "university", e.target.value)}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Start Date</Label>
                          <Input
                            type="date"
                            value={edu.startDate}
                            onChange={e => updateEducation(member.id, edu.id, "startDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">End Date</Label>
                          <Input
                            type="date"
                            value={edu.endDate}
                            onChange={e => updateEducation(member.id, edu.id, "endDate", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Certificate Name</Label>
                        <Input
                          placeholder="e.g. B.E. in Computer Science"
                          value={edu.certificate}
                          onChange={e => updateEducation(member.id, edu.id, "certificate", e.target.value)}
                        />
                      </div>

                      {member.educations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEducation(member.id, edu.id)}
                          className="flex items-center gap-1.5 text-sm text-destructive hover:underline mt-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEducation(member.id)}
                  className="gap-2 w-full border-dashed"
                >
                  <Plus className="h-4 w-4" /> Add Education
                </Button>
              </div>

              {/* ══ STATUS QUESTIONS ══ */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">Status</p>

                {/* Q1: Currently Studying? — always shown, fully independent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Are you currently studying? <span className="text-destructive">*</span>
                  </Label>
                  {errors[member.id]?.isCurrentlyStudying && (
                    <p className="text-xs text-destructive">{errors[member.id].isCurrentlyStudying}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentlyStudying(member.id, true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        member.isCurrentlyStudying === true
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {member.isCurrentlyStudying === true && <CheckCircle2 className="h-4 w-4" />}
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentlyStudying(member.id, false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        member.isCurrentlyStudying === false
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {member.isCurrentlyStudying === false && <CheckCircle2 className="h-4 w-4" />}
                      No
                    </button>
                  </div>
                </div>

                {/* Q2: Currently Working? — FIX: always shown, fully independent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Are you currently working / have a profession? <span className="text-destructive">*</span>
                  </Label>
                  {errors[member.id]?.isCurrentlyWorking && (
                    <p className="text-xs text-destructive">{errors[member.id].isCurrentlyWorking}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentlyWorking(member.id, true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        member.isCurrentlyWorking === true
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {member.isCurrentlyWorking === true && <CheckCircle2 className="h-4 w-4" />}
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentlyWorking(member.id, false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        member.isCurrentlyWorking === false
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {member.isCurrentlyWorking === false && <CheckCircle2 className="h-4 w-4" />}
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* ══ PROFESSION ══ — FIX: always shown, no condition */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">Profession</p>

                <div className="space-y-4 border border-border rounded-xl p-5 bg-muted/20">

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Type of Profession <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={member.profession || ""}
                      onValueChange={v => updateMember(member.id, "profession", v)}
                    >
                      <SelectTrigger className={errors[member.id]?.profession ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select profession type" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionTypes.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[member.id]?.profession && (
                      <p className="text-xs text-destructive">{errors[member.id].profession}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Industry / Field</Label>
                    <Input
                      placeholder="e.g. Software, Banking, Teaching"
                      value={member.industry}
                      onChange={e => updateMember(member.id, "industry", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Brief Profile{" "}
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      placeholder="Short note about work or achievements"
                      value={member.briefProfile}
                      onChange={e => updateMember(member.id, "briefProfile", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ══ LANGUAGES ══ */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">Languages Known</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {languageOptions.map(lang => (
                    <div key={lang} className="flex items-center gap-2">
                      <Checkbox
                        id={`${member.id}-${lang}`}
                        checked={member.languages.includes(lang)}
                        onCheckedChange={() => toggleLanguage(member.id, lang)}
                      />
                      <Label
                        htmlFor={`${member.id}-${lang}`}
                        className="font-normal cursor-pointer text-sm"
                      >
                        {lang}
                      </Label>
                    </div>
                  ))}
                </div>

                {member.languages.includes("Other") && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <Label className="text-sm">
                      Add other languages <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {member.otherLanguages.map(lang => (
                        <Badge key={lang} variant="secondary" className="gap-1 px-2 py-1">
                          {lang}
                          <button
                            type="button"
                            aria-label={`Remove ${lang}`}
                            onClick={() => removeOtherLanguage(member.id, lang)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type language name and press Enter"
                        value={member.otherLanguageInput}
                        onChange={e => updateMember(member.id, "otherLanguageInput", e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addOtherLanguage(member.id);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOtherLanguage(member.id)}
                      >
                        Add
                      </Button>
                    </div>
                    {errors[member.id]?.otherLanguages && (
                      <p className="text-xs text-destructive">{errors[member.id].otherLanguages}</p>
                    )}
                  </div>
                )}
              </div>

            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/profile/location-information")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Education &amp; Profession?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear only education and profession data. All other steps remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {resetting ? "Resetting..." : "Yes, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
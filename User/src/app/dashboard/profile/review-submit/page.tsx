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

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium text-foreground">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </p>
    </div>
  );
}

function SectionHeader({ title, href, isLocked, memberIndex }: { title: string; href: string; isLocked: boolean; memberIndex?: number }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between py-2 border-b border-border mb-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {!isLocked && (
        <Button variant="ghost" size="sm" className="gap-1.5 text-primary h-7"
          onClick={() => {
            if (memberIndex !== undefined) {
              sessionStorage.setItem("openMemberIndex", String(memberIndex));
            }
            router.push(href);
          }}>
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileMeta, setProfileMeta] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get("/users/profile/full"),
      api.get("/users/profile"),
    ]).then(([full, meta]) => {
      setProfileData(full);
      setProfileMeta(meta);
    }).catch(() => toast.error("Failed to load profile"))
    .finally(() => setLoading(false));
  }, []);

  const status      = profileMeta?.status as string;
  const isLocked    = ["submitted", "under_review", "approved"].includes(status);
  const submittedAt = profileMeta?.submitted_at as string | null;

  const handleSubmit = () => {
    if (!confirmed) { setErrors({ confirmation: "Please confirm that all details are accurate" }); return; }
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/users/profile/submit", {});
      toast.success("Profile submitted successfully!");
      setShowSubmitDialog(false);
      router.push("/dashboard/status");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>;

  const s1    = profileData?.step1 as Record<string, string> | null;
  const s2    = profileData?.step2 as Record<string, string> | null;
  const s3    = profileData?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const s4    = profileData?.step4 as Record<string, string>[] | null;
  const s5    = profileData?.step5 as Record<string, unknown>[] | null;
  const s6eco = (profileData?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = (profileData?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || [];
  const s6doc = (profileData?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || [];

  const currentAddr  = s4?.find(a => a.address_type === "current");
  const hometownAddr = s4?.find(a => a.address_type === "hometown");

  // User's education = first entry in step5 (Self)
  const userEdu = s5?.[0];
  // User's insurance/documents
  const userIns = s6ins[0];
  const userDoc = s6doc[0];

  const familyMembers = s3?.members || [];

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Review & Submit</h1>
          <p className="text-muted-foreground mt-1">Step 7 of 7: Review all your information before submitting</p>
        </div>

        <Stepper steps={steps} currentStep={6} />

        {/* Locked banner */}
        {isLocked && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">Profile Locked</p>
                  <p className="text-sm text-blue-600">Your profile is under review. Editing is disabled until Sangha completes the review.</p>
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

        {/* ═══ YOUR INFORMATION ═══ */}
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
                  <Field label="Full Name" value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")} />
                  <Field label="Gender" value={s1.gender} />
                  <Field label="Date of Birth" value={s1.date_of_birth ? new Date(s1.date_of_birth).toLocaleDateString("en-IN") : null} />
                  <Field label="Marital Status" value={s1.is_married ? "Married" : "Single"} />
                  {s1.is_married && <Field label="Spouse Name" value={s1.wife_name || s1.husbands_name} />}
                  <Field label="Father's Name" value={s1.fathers_name} />
                  <Field label="Mother's Name" value={s1.mothers_name} />
                  <Field label="Surname in Use" value={s1.surname_in_use} />
                  <Field label="Disability" value={s1.has_disability === "yes" ? "Yes" : s1.has_disability === "no" ? "No" : null} />
                  {s1.is_part_of_sangha === "yes" && <>
                    <Field label="Sangha Name" value={s1.sangha_name} />
                    <Field label="Sangha Role" value={s1.sangha_role} />
                  </>}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

            <Separator />

            {/* Religious */}
            <div>
              <SectionHeader title="Religious Details" href="/dashboard/profile/religious-details" isLocked={isLocked} />
              {s2 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Gotra"          value={s2.gotra} />
                  <Field label="Pravara"        value={s2.pravara} />
                  <Field label="Upanama"        value={s2.upanama} />
                  <Field label="Kuladevata"     value={s2.kuladevata_other || s2.kuladevata} />
                  <Field label="Surname"        value={s2.surname_in_use} />
                  <Field label="Family Priest"  value={s2.priest_name} />
                  <Field label="Priest Location" value={s2.priest_location} />
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

            <Separator />

            {/* Location */}
            <div>
              <SectionHeader title="Location" href="/dashboard/profile/location-information" isLocked={isLocked} />
              {currentAddr ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Address</Label>
                    <p className="text-sm font-medium mt-0.5">
                      {[currentAddr.flat_no, currentAddr.building, currentAddr.street, currentAddr.area, currentAddr.city, currentAddr.state, currentAddr.pincode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {hometownAddr && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Home Town</Label>
                      <p className="text-sm font-medium mt-0.5">
                        {[hometownAddr.city, hometownAddr.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

            <Separator />

            {/* User's Education */}
            <div>
              <SectionHeader title="Education & Profession" href="/dashboard/profile/education-profession" isLocked={isLocked} />
              {userEdu ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Highest Education" value={userEdu.highest_education as string} />
                  <Field label="Profession"        value={userEdu.profession_type as string} />
                  <Field label="Industry"          value={userEdu.industry as string} />
                  <Field label="Brief Profile"     value={userEdu.brief_profile as string} />
                  {(userEdu.certifications as string[])?.filter(c => c).length > 0 && (
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Certifications</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(userEdu.certifications as string[]).filter(c => c).map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(userEdu.languages as { language: string }[])?.length > 0 && (
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Languages</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(userEdu.languages as { language: string; language_other?: string }[]).map((l, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {l.language === "Other" ? l.language_other : l.language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

            <Separator />

            {/* User's Economic */}
            <div>
              <SectionHeader title="Economic Details" href="/dashboard/profile/economic-details" isLocked={isLocked} />
              {s6eco ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Self Income"   value={INCOME_SLAB_REVERSE[s6eco.self_income as string]} />
                    <Field label="Family Income" value={INCOME_SLAB_REVERSE[s6eco.family_income as string]} />
                  </div>
                  {userIns && (
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Health Insurance" value={(userIns.health_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                      <Field label="Life Insurance"   value={(userIns.life_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                      <Field label="Term Insurance"   value={(userIns.term_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                    </div>
                  )}
                  {userDoc && (
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Aadhaar"      value={(userDoc.aadhaar_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                      <Field label="PAN"          value={(userDoc.pan_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                      <Field label="Konkani Card" value={(userDoc.all_records_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                    </div>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
            </div>

          </CardContent>
        </Card>

        {/* ═══ FAMILY MEMBERS ═══ */}
        {familyMembers.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Family Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {familyMembers.map((member, idx) => {
                // Find this member's education (index + 1 since 0 is Self)
                const memberEdu = s5?.[idx + 1];
                const memberIns = s6ins[idx + 1];
                const memberDoc = s6doc[idx + 1];

                return (
                  <div key={idx} className="space-y-4">
                    {idx > 0 && <Separator />}

                    {/* Member header */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.relation}</p>
                      </div>
                    </div>

                    {/* Member info */}
                    <div>
                      <SectionHeader title="Member Details" href="/dashboard/profile/family-information" isLocked={isLocked} />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Name"       value={member.name} />
                        <Field label="Relation"   value={member.relation} />
                        <Field label="Date of Birth" value={member.dob || (member.age ? `Age: ${member.age}` : null)} />
                        <Field label="Gender"     value={member.gender} />
                        <Field label="Status"     value={member.status} />
                        <Field label="Disability" value={member.disability === "yes" ? "Yes" : member.disability === "no" ? "No" : null} />
                      </div>
                    </div>

                    {/* Member's Education */}
                    <div>
                      <SectionHeader title="Education & Profession" href="/dashboard/profile/education-profession" isLocked={isLocked} memberIndex={idx + 1} />
                      {memberEdu ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <Field label="Highest Education" value={memberEdu.highest_education as string} />
                          <Field label="Profession"        value={memberEdu.profession_type as string} />
                          <Field label="Industry"          value={memberEdu.industry as string} />
                          {(memberEdu.languages as { language: string }[])?.length > 0 && (
                            <div className="col-span-2">
                              <Label className="text-xs text-muted-foreground">Languages</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(memberEdu.languages as { language: string; language_other?: string }[]).map((l, li) => (
                                  <Badge key={li} variant="secondary" className="text-xs">
                                    {l.language === "Other" ? l.language_other : l.language}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                    </div>

                    {/* Member's Economic Coverage */}
                    <div>
                      <SectionHeader title="Insurance & Documents" href="/dashboard/profile/economic-details" isLocked={isLocked} memberIndex={idx + 1} />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {memberIns && <>
                          <Field label="Health Insurance" value={(memberIns.health_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                          <Field label="Life Insurance"   value={(memberIns.life_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                          <Field label="Term Insurance"   value={(memberIns.term_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                        </>}
                        {memberDoc && <>
                          <Field label="Aadhaar"      value={(memberDoc.aadhaar_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                          <Field label="PAN"          value={(memberDoc.pan_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                          <Field label="Konkani Card" value={(memberDoc.all_records_coverage as string[])?.length > 0 ? "Yes" : "No"} />
                        </>}
                      </div>
                    </div>

                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Submit section */}
        {!isLocked && (
          <>
            <Card className="shadow-sm bg-secondary/30">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox id="confirmation" checked={confirmed}
                    onCheckedChange={c => { setConfirmed(c as boolean); setErrors(e => ({...e, confirmation: ""})) }} />
                  <div className="space-y-1">
                    <Label htmlFor="confirmation" className="cursor-pointer leading-relaxed">
                      I confirm that all the information provided above is accurate and true to the best of my knowledge. I understand that providing false information may result in rejection of my application.
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
              Once submitted, your profile will be sent to the Sangha for verification. You will not be able to make changes until the review is complete.
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
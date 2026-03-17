"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

  const status = profileMeta?.status as string;
  const isLocked = ["submitted", "under_review", "approved"].includes(status);
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

  const s1 = profileData?.step1 as Record<string, string> | null;
  const s2 = profileData?.step2 as Record<string, string> | null;
  const s3 = profileData?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const s4 = profileData?.step4 as Record<string, string>[] | null;
  const s5 = profileData?.step5 as Record<string, string>[] | null;
  const s6eco = (profileData?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const currentAddr  = s4?.find(a => a.address_type === "current");
  const hometownAddr = s4?.find(a => a.address_type === "hometown");

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
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

        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader><CardTitle>Profile Summary</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["item-1"]} className="w-full">

              <AccordionItem value="item-1">
                <AccordionTrigger>Personal Details</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/personal-details")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {s1 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Full Name</Label><p className="font-medium">{[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")}</p></div>
                      <div><Label className="text-muted-foreground">Gender</Label><p className="font-medium capitalize">{s1.gender}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth</Label><p className="font-medium">{s1.date_of_birth ? new Date(s1.date_of_birth).toLocaleDateString("en-IN") : "—"}</p></div>
                      <div><Label className="text-muted-foreground">Marital Status</Label><p className="font-medium">{s1.is_married ? "Married" : "Unmarried"}</p></div>
                      {s1.fathers_name && <div><Label className="text-muted-foreground">Father&apos;s Name</Label><p className="font-medium">{s1.fathers_name}</p></div>}
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Religious Details</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/religious-details")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {s2 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Gotra</Label><p className="font-medium">{s2.gotra || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Pravara</Label><p className="font-medium">{s2.pravara || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Upanama</Label><p className="font-medium">{s2.upanama || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Kuladevata</Label><p className="font-medium">{s2.kuladevata_other || s2.kuladevata || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Surname</Label><p className="font-medium">{s2.surname_in_use || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Family Priest</Label><p className="font-medium">{s2.priest_name || "—"}</p></div>
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Family Information</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/family-information")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {s3?.family_info ? (
                    <div className="space-y-3">
                      <div><Label className="text-muted-foreground">Family Type</Label><p className="font-medium capitalize">{s3.family_info.family_type}</p></div>
                      {s3.members?.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground">{m.relation}, Age: {m.age}</p></div>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded capitalize">{m.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Location Information</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/location-information")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {currentAddr ? (
                    <div className="space-y-3">
                      <div><Label className="text-muted-foreground">Current Address</Label><p className="font-medium">{[currentAddr.flat_no, currentAddr.building, currentAddr.street, currentAddr.area, currentAddr.city, currentAddr.state, currentAddr.pincode].filter(Boolean).join(", ")}</p></div>
                      {hometownAddr && <div><Label className="text-muted-foreground">Home Town</Label><p className="font-medium">{[hometownAddr.city, hometownAddr.state].filter(Boolean).join(", ")}</p></div>}
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Education & Profession</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/education-profession")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {s5?.length ? (
                    <div className="space-y-2">
                      {s5.map((m, i) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{m.member_name || `Member ${i + 1}`} — {m.member_relation}</p>
                          <p className="text-sm text-muted-foreground">{m.highest_education} · {m.profession_type}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Economic Details</AccordionTrigger>
                <AccordionContent>
                  {!isLocked && <div className="flex justify-end mb-3"><Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/profile/economic-details")} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button></div>}
                  {s6eco ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Self Income</Label><p className="font-medium">{INCOME_SLAB_REVERSE[s6eco.self_income as string] || "—"}</p></div>
                      <div><Label className="text-muted-foreground">Family Income</Label><p className="font-medium">{INCOME_SLAB_REVERSE[s6eco.family_income as string] || "—"}</p></div>
                    </div>
                  ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        {/* Submit section — hidden when locked */}
        {!isLocked && (
          <>
            <Card className="shadow-sm bg-secondary/30">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox id="confirmation" checked={confirmed}
                    onCheckedChange={c => { setConfirmed(c as boolean); setErrors(e => ({...e, confirmation: ""})) }} />
                  <div className="space-y-1">
                    <Label htmlFor="confirmation" className="cursor-pointer leading-relaxed">
                      I confirm that all the information provided above is accurate and true to the best of my knowledge.
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
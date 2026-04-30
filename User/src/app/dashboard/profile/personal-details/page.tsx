"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, User, Heart, Shield, RotateCcw } from "lucide-react";
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

export default function Page() {
  const router = useRouter();
  const [loading, setLoading]               = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [canReset, setCanReset]             = useState(false);
  const [userContact, setUserContact]       = useState({ email: "", phone: "" });

  const [formData, setFormData] = useState({
    firstName: "", middleName: "", lastName: "",
    gender: "", dateOfBirth: "",
    surnameInUse: "", surnameAsPerGotra: "",
    fathersName: "", mothersName: "",
    maritalStatus: "",
    hasDisability: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get("/users/profile/full"),
      api.get("/users/profile"),
    ]).then(([full, meta]) => {
      const s      = full.step1;
      const status = meta.status as string;
      setCanReset(status === "draft" || status === "changes_requested" || status === "approved");
      setUserContact({
        email: (meta as Record<string, string>).email || "",
        phone: (meta as Record<string, string>).phone || "",
      });
      if (s) {
        setFormData({
          firstName:         s.first_name || "",
          middleName:        s.middle_name || "",
          lastName:          s.last_name || "",
          gender:            s.gender || "",
          dateOfBirth: s.date_of_birth
          ? String(s.date_of_birth).slice(0, 10)
          : "",
          surnameInUse:      s.surname_in_use || "",
          surnameAsPerGotra: s.surname_as_per_gotra || "",
          fathersName:       s.fathers_name || "",
          mothersName:       s.mothers_name || "",
          maritalStatus:     s.marital_status || "",
          hasDisability:     s.has_disability ? "yes" : "no",
        });
      }
    }).catch(() => {});
  }, []);

  const buildPayload = () => ({
    first_name:           formData.firstName,
    middle_name:          formData.middleName || undefined,
    last_name:            formData.lastName,
    gender:               formData.gender,
    date_of_birth:        formData.dateOfBirth || null,
    surname_in_use:       formData.surnameInUse || undefined,
    surname_as_per_gotra: formData.surnameAsPerGotra || undefined,
    fathers_name:         formData.fathersName || undefined,
    mothers_name:         formData.mothersName || undefined,
    marital_status:       formData.maritalStatus,
    has_disability:       formData.hasDisability === "yes",
  });

  useAutoSave("/users/profile/step1", buildPayload, [formData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim())  e.firstName      = "First name is required";
    if (!formData.lastName.trim())   e.lastName       = "Last name is required";
    if (!formData.gender)            e.gender         = "Please select a gender";
    if (!formData.dateOfBirth)       e.dateOfBirth    = "Date of birth is required";
    if (!formData.maritalStatus)     e.maritalStatus  = "Please select marital status";
    if (!formData.hasDisability)     e.hasDisability  = "Please select disability status";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = buildPayload();
      await api.post("/users/profile/step1", payload);
      toast.success("Personal details saved!");
      router.push("/dashboard/profile/religious-details");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset/step1", {});
      toast.success("Personal details cleared.");
      setFormData({
        firstName: "", middleName: "", lastName: "",
        gender: "", dateOfBirth: "",
        surnameInUse: "", surnameAsPerGotra: "",
        fathersName: "", mothersName: "",
        maritalStatus: "", hasDisability: "",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  const set = (field: string, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold">Personal Details</h1>
          <p className="text-muted-foreground mt-1">Step 1 of 7: Enter your basic personal information</p>
        </div>
        {canReset && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={0} />

      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {(userContact.email || userContact.phone) && (
            <div className="p-3 bg-muted/50 rounded-lg grid md:grid-cols-2 gap-4">
              {userContact.email && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Registered Email</Label>
                  <p className="text-sm font-medium text-foreground">{userContact.email}</p>
                </div>
              )}
              {userContact.phone && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Registered Phone</Label>
                  <p className="text-sm font-medium text-foreground">{userContact.phone}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {([["firstName","First Name",true],["middleName","Middle Name",false],["lastName","Last Name",true]] as [string,string,boolean][]).map(([key, label, req]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label} {req && <span className="text-destructive">*</span>}</Label>
                <Input id={key} placeholder={`Enter ${label.toLowerCase()}`}
                  value={formData[key as keyof typeof formData] as string}
                  onChange={e => set(key, e.target.value)}
                  className={errors[key] ? "border-destructive" : ""} />
                {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Gender <span className="text-destructive">*</span></Label>
              <RadioGroup value={formData.gender} onValueChange={v => set("gender", v)} className="flex gap-6">
                {["male","female","other"].map(g => (
                  <div key={g} className="flex items-center space-x-2">
                    <RadioGroupItem value={g} id={`gender-${g}`} />
                    <Label htmlFor={`gender-${g}`} className="font-normal cursor-pointer capitalize">{g}</Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
              <Input id="dateOfBirth" type="date" value={formData.dateOfBirth}
  min="1000-01-01" max="9999-12-31"
  onChange={e => {
    const val = e.target.value;
    if (val && val.split("-")[0].length !== 4) return;
    set("dateOfBirth", val);
  }}
  className={errors.dateOfBirth ? "border-destructive" : ""} />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surnameInUse">Surname in Use</Label>
              <Input id="surnameInUse" placeholder="Current surname" value={formData.surnameInUse}
                onChange={e => set("surnameInUse", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surnameAsPerGotra">Surname as per Gotra</Label>
              <Input id="surnameAsPerGotra" placeholder="Traditional surname" value={formData.surnameAsPerGotra}
                onChange={e => set("surnameAsPerGotra", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fathersName">Father&apos;s Name</Label>
              <Input id="fathersName" placeholder="Enter father's name" value={formData.fathersName}
                onChange={e => set("fathersName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mothersName">Mother&apos;s Name</Label>
              <Input id="mothersName" placeholder="Enter mother's name" value={formData.mothersName}
                onChange={e => set("mothersName", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-orange-400">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-orange-500" />
            <CardTitle>Marital Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Marital Status <span className="text-destructive">*</span></Label>
            <RadioGroup value={formData.maritalStatus}
              onValueChange={v => { setFormData(p => ({ ...p, maritalStatus: v })); setErrors(e => ({ ...e, maritalStatus: "" })); }}
              className="flex gap-6">
              {[
  { label: "Single (Never Married)", value: "single_never_married" },
  { label: "Married",                value: "married" },
  { label: "Single / Divorced",      value: "single_divorced" },
  { label: "Single / Widowed",       value: "single_widowed" },
].map(opt => (
                <div key={opt.value}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.maritalStatus === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  onClick={() => { setFormData(p => ({ ...p, maritalStatus: opt.value })); setErrors(e => ({ ...e, maritalStatus: "" })); }}>
                  <RadioGroupItem value={opt.value} id={`marital-${opt.value}`} />
                  <Label htmlFor={`marital-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.maritalStatus && <p className="text-xs text-destructive">{errors.maritalStatus}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-orange-400">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <CardTitle>Disability Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Do you have any disability? <span className="text-destructive">*</span></Label>
            <RadioGroup value={formData.hasDisability} onValueChange={v => set("hasDisability", v)} className="flex gap-6">
              {["No", "Yes"].map(opt => (
                <div key={opt}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.hasDisability === opt.toLowerCase() ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  onClick={() => set("hasDisability", opt.toLowerCase())}>
                  <RadioGroupItem value={opt.toLowerCase()} id={`disability-${opt}`} />
                  <Label htmlFor={`disability-${opt}`} className="font-normal cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.hasDisability && <p className="text-xs text-destructive">{errors.hasDisability}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Personal Details?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear only your personal details. All other steps remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-destructive hover:bg-destructive/90">
              {resetting ? "Resetting..." : "Yes, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
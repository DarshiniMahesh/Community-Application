//Community-Application\User\src\app\dashboard\profile\personal-details\page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { COUNTRY_CODES } from "@/lib/constants";
import { useAutoSave } from "@/lib/useAutoSave";
import { indiaDateInputValue } from "@/lib/dateTime";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

// Strip everything except digits and cap at 10 characters.
const sanitizePhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

/**
 * ✅ NEW: shared "scroll to and highlight ?focus=<id>" behaviour used by every
 * step page's "Complete now" target. Wrapped in its own component so the
 * page below can stay as a plain client component using useSearchParams,
 * which Next.js requires to sit under a <Suspense> boundary.
 */
function useFocusHighlight() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (!focusId) return;

    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tryFocus = () => {
      const el = document.getElementById(focusId);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const prevTransition = el.style.transition;
      const prevBoxShadow = el.style.boxShadow;
      el.style.transition = "box-shadow 0.3s ease";
      el.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.55)";
      window.setTimeout(() => {
        el.style.boxShadow = prevBoxShadow;
        window.setTimeout(() => { el.style.transition = prevTransition; }, 300);
      }, 2200);
      return true;
    };

    if (!tryFocus()) {
      intervalId = setInterval(() => {
        attempts += 1;
        if (tryFocus() || attempts > 20) {
          if (intervalId) clearInterval(intervalId);
        }
      }, 150);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}

function PageContent() {
  const router = useRouter();
  useFocusHighlight();

  const [loading, setLoading]               = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [canReset, setCanReset]             = useState(false);
  // Primary (registered) contact: comes from users.email / users.phone via GET /users/profile
  const [registeredContact, setRegisteredContact] = useState({ email: "", phone: "" });

  const todayStr = indiaDateInputValue();

  const [formData, setFormData] = useState({
    firstName: "", middleName: "", lastName: "",
    gender: "", dateOfBirth: "",
    surnameInUse: "", surnameAsPerGotra: "",
    fathersName: "", mothersName: "",
    maritalStatus: "",
    hasDisability: "",
    disabilityDetails: "",
    // Primary contact (users.email / users.phone)
    email: "",
    phone: "",
    phoneCountryCode: "+91",
    // Secondary contact (personal_details.secondary_email / secondary_phone)
    secondaryEmail: "",
    secondaryPhone: "",
    secondaryPhoneCountryCode: "+91",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get("/users/profile/full"),
      api.get("/users/profile"),
    ]).then(([full, meta]) => {
      const s      = full.step1;
      const status = meta.status as string;
      const metaEmail = (meta as Record<string, string>).email || "";
      const metaPhone = (meta as Record<string, string>).phone || "";
      const metaPhoneCC = (meta as Record<string, string>).phone_country_code || "+91";

      setCanReset(status === "draft" || status === "changes_requested" || status === "approved");
      setRegisteredContact({
        email: metaEmail,
        phone: metaPhone,
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
          hasDisability:     s.has_disability ? (s.has_disability === "yes" || s.has_disability === true ? "yes" : "no") : "",
          disabilityDetails: s.disability_details || "",
          // Primary contact always comes from users (via /users/profile)
          email:             metaEmail,
          phone:             metaPhone,
          phoneCountryCode:  metaPhoneCC,
          // Secondary contact always comes from personal_details
          secondaryEmail:    s.secondary_email || "",
          secondaryPhone:    s.secondary_phone || "",
          secondaryPhoneCountryCode: s.secondary_phone_country_code || "+91",
        });
      } else {
        setFormData(p => ({
          ...p,
          email: metaEmail,
          phone: metaPhone,
          phoneCountryCode: metaPhoneCC,
        }));
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
    has_disability:       formData.hasDisability === "yes" ? "yes" : formData.hasDisability === "no" ? "no" : undefined,
    disability_details:   formData.hasDisability === "yes" ? formData.disabilityDetails : undefined,
    email:                formData.email || undefined,
    phone:                formData.phone || undefined,
    phone_country_code:   formData.phoneCountryCode || undefined,
    secondary_email:      formData.secondaryEmail || undefined,
    secondary_phone:      formData.secondaryPhone || undefined,
    secondary_phone_country_code: formData.secondaryPhone ? formData.secondaryPhoneCountryCode : undefined,
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
    if (formData.hasDisability === "yes" && !formData.disabilityDetails.trim()) {
      e.disabilityDetails = "Please describe the disability";
    }

    if (formData.phone && formData.phone.length !== 10) {
      e.phone = "Phone number must be exactly 10 digits";
    }
    if (formData.secondaryPhone && formData.secondaryPhone.length !== 10) {
      e.secondaryPhone = "Secondary phone number must be exactly 10 digits";
    }
    if (
      formData.secondaryPhone &&
      formData.secondaryPhone === formData.phone &&
      formData.secondaryPhoneCountryCode === formData.phoneCountryCode
    ) {
      e.secondaryPhone = "Secondary phone must be different from primary phone";
    }
    if (formData.secondaryEmail && formData.secondaryEmail === formData.email) {
      e.secondaryEmail = "Secondary email must be different from primary email";
    }

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
        maritalStatus: "", hasDisability: "", disabilityDetails: "",
        email: registeredContact.email,
        phone: registeredContact.phone,
        phoneCountryCode: "+91",
        secondaryEmail: "",
        secondaryPhone: "",
        secondaryPhoneCountryCode: "+91",
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

      {/* ── Contact Information ── */}
      <Card id="section-contact" className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Contact Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary contacts (users.email / users.phone) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contactEmail">Email Address</Label>
                {registeredContact.email && (
                  <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Primary Email
                  </span>
                )}
              </div>
              <Input
                id="contactEmail"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={e => set("email", e.target.value)}
                readOnly={!!registeredContact.email}
                className={registeredContact.email ? "bg-muted/50 cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contactPhone">Phone Number</Label>
                {registeredContact.phone && (
                  <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Primary Phone
                  </span>
                )}
              </div>
              <div className="flex gap-2">
               <select
  aria-label="Phone country code"
  value={formData.phoneCountryCode}
  onChange={e => set("phoneCountryCode", e.target.value)}
  disabled={!!registeredContact.phone}
  className={`w-[130px] rounded-md border border-input bg-background px-2 text-sm ${registeredContact.phone ? "bg-muted/50 cursor-not-allowed" : ""}`}
>
  {COUNTRY_CODES.map(c => (
    <option key={c.iso} value={c.code}>{c.code} {c.country}</option>
  ))}
</select>
                <Input
                  id="contactPhone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={formData.phone}
                  onChange={e => set("phone", sanitizePhoneDigits(e.target.value))}
                  readOnly={!!registeredContact.phone}
                  className={`flex-1 ${errors.phone ? "border-destructive" : ""} ${registeredContact.phone ? "bg-muted/50 cursor-not-allowed" : ""}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          {/* Secondary contacts (personal_details.secondary_email / secondary_phone) */}
          <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="secondaryEmail">Secondary Email Address</Label>
              <Input
                id="secondaryEmail"
                type="email"
                placeholder="Enter an alternate email (optional)"
                value={formData.secondaryEmail}
                onChange={e => set("secondaryEmail", e.target.value)}
                className={errors.secondaryEmail ? "border-destructive" : ""}
              />
              {errors.secondaryEmail && <p className="text-xs text-destructive">{errors.secondaryEmail}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPhone">Secondary Phone Number</Label>
              <div className="flex gap-2">
                <select
  aria-label="Secondary phone country code"
  value={formData.secondaryPhoneCountryCode}
  onChange={e => set("secondaryPhoneCountryCode", e.target.value)}
  className="w-[130px] rounded-md border border-input bg-background px-2 text-sm"
>
  {COUNTRY_CODES.map(c => (
    <option key={c.iso} value={c.code}>{c.code} {c.country}</option>
  ))}
</select>
                <Input
                  id="secondaryPhone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter an alternate phone (optional)"
                  value={formData.secondaryPhone}
                  onChange={e => set("secondaryPhone", sanitizePhoneDigits(e.target.value))}
                  className={`flex-1 ${errors.secondaryPhone ? "border-destructive" : ""}`}
                />
              </div>
              {errors.secondaryPhone && <p className="text-xs text-destructive">{errors.secondaryPhone}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="section-basic-info" className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
                <span className="text-[11px] text-muted-foreground font-normal">DD/MM/YYYY</span>
              </div>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                min="1900-01-01"
                max={todayStr}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={e => {
                  const val = e.target.value;
                  if (val && val.split("-")[0].length !== 4) return;
                  set("dateOfBirth", val);
                }}
                className={errors.dateOfBirth ? "border-destructive cursor-pointer" : "cursor-pointer"}
              />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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

      <Card id="section-marital" className="shadow-sm border-l-4 border-l-orange-400">
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

      <Card id="section-disability" className="shadow-sm border-l-4 border-l-orange-400">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <CardTitle>Disability Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Textbox shown only when Yes is clicked */}
          {formData.hasDisability === "yes" && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="disabilityDetails">
                Please describe the type of disability <span className="text-destructive">*</span>
              </Label>
              <Input
                id="disabilityDetails"
                placeholder="e.g. Visual impairment, Physical disability, Hearing impairment, etc."
                value={formData.disabilityDetails}
                onChange={e => set("disabilityDetails", e.target.value)}
                className={errors.disabilityDetails ? "border-destructive" : ""}
              />
              {errors.disabilityDetails && <p className="text-xs text-destructive">{errors.disabilityDetails}</p>}
            </div>
          )}
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

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
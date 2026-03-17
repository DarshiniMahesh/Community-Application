"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", middleName: "", lastName: "",
    gender: "", dateOfBirth: "", isMarried: false,
    spouseName: "", fathersName: "", mothersName: "",
    surnameInUse: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/users/profile/full").then((data) => {
      const s = data.step1;
      if (s) {
        setFormData({
          firstName:    s.first_name || "",
          middleName:   s.middle_name || "",
          lastName:     s.last_name || "",
          gender:       s.gender || "",
          dateOfBirth:  s.date_of_birth?.split("T")[0] || "",
          isMarried:    s.is_married || false,
          spouseName:   s.wife_name || s.husbands_name || "",
          fathersName:  s.fathers_name || "",
          mothersName:  s.mothers_name || "",
          surnameInUse: s.surname_in_use || "",
        });
      }
    }).catch(() => {});
  }, []);

  const buildPayload = () => ({
    first_name:     formData.firstName,
    middle_name:    formData.middleName || undefined,
    last_name:      formData.lastName,
    gender:         formData.gender,
    date_of_birth:  formData.dateOfBirth || undefined,
    is_married:     formData.isMarried,
    fathers_name:   formData.fathersName || undefined,
    mothers_name:   formData.mothersName || undefined,
    surname_in_use: formData.surnameInUse || undefined,
    ...(formData.isMarried && formData.gender === "female"
      ? { husbands_name: formData.spouseName }
      : { wife_name: formData.spouseName }),
  });

  useAutoSave("/users/profile/step1", buildPayload, [formData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim())  e.lastName  = "Last name is required";
    if (!formData.gender)           e.gender    = "Please select a gender";
    if (!formData.dateOfBirth)      e.dateOfBirth = "Date of birth is required";
    if (formData.isMarried && !formData.spouseName.trim()) e.spouseName = "Spouse name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/users/profile/step1", buildPayload());
      toast.success("Personal details saved!");
      router.push("/dashboard/profile/religious-details");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Button>
        <h1 className="text-3xl font-semibold">Personal Details</h1>
        <p className="text-muted-foreground mt-1">Step 1 of 7: Enter your basic personal information</p>
      </div>

      <Stepper steps={steps} currentStep={0} />

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          <div className="grid md:grid-cols-3 gap-4">
            {[["firstName","First Name",true],["middleName","Middle Name",false],["lastName","Last Name",true]].map(([key, label, req]) => (
              <div key={key as string} className="space-y-2">
                <Label htmlFor={key as string}>{label as string} {req && <span className="text-destructive">*</span>}</Label>
                <Input id={key as string} placeholder={`Enter ${(label as string).toLowerCase()}`}
                  value={formData[key as keyof typeof formData] as string}
                  onChange={e => { setFormData({...formData, [key as string]: e.target.value}); setErrors({...errors, [key as string]: ""}) }}
                  className={errors[key as string] ? "border-destructive" : ""} />
                {errors[key as string] && <p className="text-xs text-destructive">{errors[key as string]}</p>}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label>Gender <span className="text-destructive">*</span></Label>
            <RadioGroup value={formData.gender} onValueChange={v => { setFormData({...formData, gender: v}); setErrors({...errors, gender: ""}) }} className="flex gap-6">
              {["male","female","other"].map(g => (
                <div key={g} className="flex items-center space-x-2">
                  <RadioGroupItem value={g} id={g} />
                  <Label htmlFor={g} className="font-normal cursor-pointer capitalize">{g}</Label>
                </div>
              ))}
            </RadioGroup>
            {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
              <Input id="dateOfBirth" type="date" value={formData.dateOfBirth}
                onChange={e => { setFormData({...formData, dateOfBirth: e.target.value}); setErrors({...errors, dateOfBirth: ""}) }}
                className={errors.dateOfBirth ? "border-destructive" : ""} />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="surnameInUse">Surname in Use</Label>
              <Input id="surnameInUse" placeholder="Enter surname" value={formData.surnameInUse}
                onChange={e => setFormData({...formData, surnameInUse: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fathersName">Father&apos;s Name</Label>
              <Input id="fathersName" placeholder="Enter father's name" value={formData.fathersName}
                onChange={e => setFormData({...formData, fathersName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mothersName">Mother&apos;s Name</Label>
              <Input id="mothersName" placeholder="Enter mother's name" value={formData.mothersName}
                onChange={e => setFormData({...formData, mothersName: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marital Status</Label>
                <p className="text-sm text-muted-foreground">Are you currently married?</p>
              </div>
              <Switch checked={formData.isMarried}
                onCheckedChange={c => setFormData({...formData, isMarried: c, spouseName: ""})} />
            </div>
            {formData.isMarried && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="spouseName">Spouse Name <span className="text-destructive">*</span></Label>
                <Input id="spouseName" placeholder="Enter spouse's full name" value={formData.spouseName}
                  onChange={e => { setFormData({...formData, spouseName: e.target.value}); setErrors({...errors, spouseName: ""}) }}
                  className={errors.spouseName ? "border-destructive" : ""} />
                {errors.spouseName && <p className="text-xs text-destructive">{errors.spouseName}</p>}
              </div>
            )}
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
    </div>
  );
}
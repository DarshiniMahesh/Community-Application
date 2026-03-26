"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAutoSave } from "@/lib/useAutoSave";

const religiousHierarchy = [
  { gotra: "Kashyap", pravaras: [{ name: "Kashyap-Avatsara-Naidhruva", upanamas: ["Kaushik","Kaushalya"] }, { name: "Kashyap-Avatsara", upanamas: ["Naitik","Vaidik"] }, { name: "Kashyap-Daival", upanamas: ["Daival","Kashyapiya"] }] },
  { gotra: "Bharadwaj", pravaras: [{ name: "Angirasa-Barhaspatya-Bharadwaj", upanamas: ["Gargya","Bharadwaj"] }, { name: "Bharadwaj-Gargya", upanamas: ["Garg","Gargya"] }] },
  { gotra: "Vishwamitra", pravaras: [{ name: "Vishwamitra-Devarata-Audala", upanamas: ["Kaushik","Madhavi"] }, { name: "Vishwamitra-Madhuchhanda", upanamas: ["Madhuchhanda","Devarata"] }] },
  { gotra: "Jamadagni", pravaras: [{ name: "Bhargava-Chyavana-Jamadagni", upanamas: ["Jamadagni","Apnavan"] }, { name: "Jamadagni-Apnavan", upanamas: ["Bhargava","Richika"] }] },
  { gotra: "Gautam", pravaras: [{ name: "Angirasa-Ayasya-Gautam", upanamas: ["Gautam","Sharadvat"] }, { name: "Gautam-Sharadvat", upanamas: ["Ayasya","Nodha"] }] },
  { gotra: "Atri", pravaras: [{ name: "Atreya-Archanas-Syavasva", upanamas: ["Atreya","Archanas","Mudgala"] }] },
  { gotra: "Vashishtha", pravaras: [{ name: "Vashishtha-Maitravaruna-Koundilya", upanamas: ["Vashishtha","Parashara","Shakti"] }] },
];

const kuladevatas = ["Kalika Devi","Mahalaxmi","Renuka Devi","Tulja Bhavani","Durga Devi","Bhavani Mata","Chamunda Devi","Bhadrakali","Lakshmi Devi","Saraswati Devi","Amba Devi","Khandoba","Venkateshwara","Lakshmi Narayana","Balaji","Mahadev"];

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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [formData, setFormData] = useState({
    gotra: "", pravara: "", upanama: "", kuladevata: "", kuladevataOther: "",
    surnameInUse: "", surnameAsPerGotra: "", priestName: "", priestLocation: "",
  });
  const [pravaraOptions, setPravaraOptions] = useState<{name:string;upanamas:string[]}[]>([]);
  const [upanamaOptions, setUpanamaOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string,string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const s = data.step2;
      if (s) {
        const gotraData = religiousHierarchy.find(g => g.gotra === s.gotra);
        const pravaraData = gotraData?.pravaras.find(p => p.name === s.pravara);
        setPravaraOptions(gotraData?.pravaras || []);
        setUpanamaOptions(pravaraData?.upanamas || []);
        setFormData({
          gotra:             s.gotra || "",
          pravara:           s.pravara || "",
          upanama:           s.upanama || "",
          kuladevata:        s.kuladevata_other ? "Other" : (s.kuladevata || ""),
          kuladevataOther:   s.kuladevata_other || "",
          surnameInUse:      s.surname_in_use || "",
          surnameAsPerGotra: s.surname_as_per_gotra || "",
          priestName:        s.priest_name || "",
          priestLocation:    s.priest_location || "",
        });
      }
    }).catch(() => {});
  }, []);

  const buildPayload = () => ({
    gotra:                formData.gotra,
    pravara:              formData.pravara,
    upanama:              formData.upanama,
    kuladevata:           formData.kuladevata === "Other" ? null : formData.kuladevata,
    kuladevata_other:     formData.kuladevata === "Other" ? formData.kuladevataOther : null,
    surname_in_use:       formData.surnameInUse,
    surname_as_per_gotra: formData.surnameAsPerGotra || null,
    priest_name:          formData.priestName || null,
    priest_location:      formData.priestLocation || null,
  });

  useAutoSave("/users/profile/step2", buildPayload, [formData]);

  const handleGotraChange = (value: string) => {
    const gotraData = religiousHierarchy.find(g => g.gotra === value);
    setFormData(prev => ({ ...prev, gotra: value, pravara: "", upanama: "", kuladevata: "", kuladevataOther: "" }));
    setPravaraOptions(gotraData?.pravaras || []);
    setUpanamaOptions([]);
  };

  const handlePravaraChange = (value: string) => {
    const pravaraData = pravaraOptions.find(p => p.name === value);
    setFormData(prev => ({ ...prev, pravara: value, upanama: "" }));
    setUpanamaOptions(pravaraData?.upanamas || []);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.gotra)      e.gotra      = "Please select Gotra";
    if (!formData.pravara)    e.pravara    = "Please select Pravara";
    if (!formData.upanama)    e.upanama    = "Please select Upanama";
    if (!formData.kuladevata) e.kuladevata = "Please select Kuladevata";
    if (formData.kuladevata === "Other" && !formData.kuladevataOther.trim()) e.kuladevataOther = "Please enter your Kuladevata";
    if (!formData.surnameInUse.trim()) e.surnameInUse = "Surname in use is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/users/profile/step2", buildPayload());
      toast.success("Religious details saved!");
      router.push("/dashboard/profile/family-information");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset", {});
      toast.success("Profile reset successfully.");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Religious Details</h1>
          <p className="text-muted-foreground mt-1">Step 2 of 7: Enter your religious and lineage information</p>
        </div>
        {canReset && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset Profile
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={1} />

      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Religious Lineage</CardTitle>
          <CardDescription>Select your Gotra, Pravara, and Upanama in order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4 p-4 bg-secondary/50 rounded-lg flex-wrap">
            {[
              { label: "Gotra",      sub: formData.gotra      || "Select first" },
              { label: "Pravara",    sub: formData.pravara    || "Filters on Gotra" },
              { label: "Upanama",    sub: formData.upanama    || "Filters on Pravara" },
              { label: "Kuladevata", sub: formData.kuladevata === "Other" ? formData.kuladevataOther || "Other" : formData.kuladevata || "Select after Upanama" },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-sm font-semibold text-primary">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[110px] truncate">{item.sub}</p>
                </div>
                {i < arr.length - 1 && <ArrowDown className="h-4 w-4 text-primary -rotate-90 flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gotra <span className="text-destructive">*</span></Label>
              <Select value={formData.gotra} onValueChange={handleGotraChange}>
                <SelectTrigger className={errors.gotra ? "border-destructive" : ""}><SelectValue placeholder="Select Gotra" /></SelectTrigger>
                <SelectContent>{religiousHierarchy.map(g => <SelectItem key={g.gotra} value={g.gotra}>{g.gotra}</SelectItem>)}</SelectContent>
              </Select>
              {errors.gotra && <p className="text-xs text-destructive">{errors.gotra}</p>}
            </div>
            <div className="space-y-2">
              <Label>Pravara <span className="text-destructive">*</span></Label>
              <Select value={formData.pravara} onValueChange={handlePravaraChange} disabled={!formData.gotra}>
                <SelectTrigger className={errors.pravara ? "border-destructive" : ""}><SelectValue placeholder={formData.gotra ? "Select Pravara" : "Select Gotra first"} /></SelectTrigger>
                <SelectContent>{pravaraOptions.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.pravara && <p className="text-xs text-destructive">{errors.pravara}</p>}
            </div>
            <div className="space-y-2">
              <Label>Upanama <span className="text-destructive">*</span></Label>
              <Select value={formData.upanama} onValueChange={v => { setFormData(p => ({...p, upanama: v})); setErrors(e => ({...e, upanama: ""})); }} disabled={!formData.pravara}>
                <SelectTrigger className={errors.upanama ? "border-destructive" : ""}><SelectValue placeholder={formData.pravara ? "Select Upanama" : "Select Pravara first"} /></SelectTrigger>
                <SelectContent>{upanamaOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              {errors.upanama && <p className="text-xs text-destructive">{errors.upanama}</p>}
            </div>
            <div className="space-y-2">
              <Label>Kuladevata <span className="text-destructive">*</span></Label>
              <Select value={formData.kuladevata} onValueChange={v => { setFormData(p => ({...p, kuladevata: v, kuladevataOther: ""})); setErrors(e => ({...e, kuladevata: ""})); }} disabled={!formData.upanama}>
                <SelectTrigger className={errors.kuladevata ? "border-destructive" : ""}><SelectValue placeholder={formData.upanama ? "Select Kuladevata" : "Select Upanama first"} /></SelectTrigger>
                <SelectContent>
                  {kuladevatas.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  <SelectItem value="Other">Other (Not listed)</SelectItem>
                </SelectContent>
              </Select>
              {errors.kuladevata && <p className="text-xs text-destructive">{errors.kuladevata}</p>}
            </div>
          </div>

          {formData.kuladevata === "Other" && (
            <div className="space-y-2">
              <Label>Enter Kuladevata <span className="text-destructive">*</span></Label>
              <Input placeholder="Type your Kuladevata name" value={formData.kuladevataOther}
                onChange={e => { setFormData(p => ({...p, kuladevataOther: e.target.value})); setErrors(ev => ({...ev, kuladevataOther: ""})); }}
                className={errors.kuladevataOther ? "border-destructive" : ""} />
              {errors.kuladevataOther && <p className="text-xs text-destructive">{errors.kuladevataOther}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Surname & Priest Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Surname (In Use) <span className="text-destructive">*</span></Label>
              <Input placeholder="Current surname" value={formData.surnameInUse}
                onChange={e => { setFormData(p => ({...p, surnameInUse: e.target.value})); setErrors(ev => ({...ev, surnameInUse: ""})); }}
                className={errors.surnameInUse ? "border-destructive" : ""} />
              {errors.surnameInUse && <p className="text-xs text-destructive">{errors.surnameInUse}</p>}
            </div>
            <div className="space-y-2">
              <Label>Surname (As per Gotra)</Label>
              <Input placeholder="Traditional surname" value={formData.surnameAsPerGotra}
                onChange={e => setFormData(p => ({...p, surnameAsPerGotra: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Family Priest Name</Label>
              <Input placeholder="Enter priest's name" value={formData.priestName}
                onChange={e => setFormData(p => ({...p, priestName: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Family Priest Location</Label>
              <Input placeholder="City, Village" value={formData.priestLocation}
                onChange={e => setFormData(p => ({...p, priestLocation: e.target.value}))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/personal-details")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Profile?</AlertDialogTitle>
            <AlertDialogDescription>This will clear all your profile data. Your account remains but all filled information will be deleted. This cannot be undone.</AlertDialogDescription>
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
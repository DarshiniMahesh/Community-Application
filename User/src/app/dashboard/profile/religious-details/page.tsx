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

// ─── Demi God list ────────────────────────────────────────────────────────────
const demiGodList = [
  "Varte",
  "Varte - Kalkuda",
  "Varte- Kalkuda - Tookatteri",
  "Panjurli",
  "Varte - Panjurli",
  "Jumaadi",
  "Dhumavati",
  "Maisandaya",
  "Nandigona",
  "Rahu",
  "Guliga",
  "Guliga-Panjurli",
  "Rahu - Guliga",
  "Rahu - Choundi /Chamundi",
  "Choundi / Chamundi - Guliga",
  "Kala Bhairava",
  "Rakteshwari",
  "Lakkesri",
  "Jattiga",
  "Bobbarya",
  "Kodamanittaya",
  "Kukkinantaya",
  "Kallurti",
  "Kallurti - Kalkuda",
  "Kalamma",
];

const NAGA_DEFAULT = "Snake God / Naga Moola Sthana";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProperEntry {
  names: string[];
  kuladevatas: Record<string, string[]>;
}

interface PravaraGroupEntry {
  // Each word in pravara is a separate selectable option.
  // All words share the same upanamaGenerals / propersByGeneral.
  pravaraWords: string[];          // e.g. ["Angirasa", "Barhaspathya", "Bharadhwaja"]
  upanamaGenerals: string[];
  propersByGeneral: Record<string, ProperEntry>;
}

interface GotraEntry {
  gotra: string;
  pravaraGroups: PravaraGroupEntry[];
}

// ─── Religious Hierarchy ──────────────────────────────────────────────────────
// Pravara words are now INDIVIDUAL options; they all belong to the same group
// so selecting any one of them leads to the same Upanama (General) options.

const religiousHierarchy: GotraEntry[] = [
  {
    gotra: "Bharadwaja",
    pravaraGroups: [
      {
        pravaraWords: ["Angirasa", "Barhaspathya", "Bharadhwaja"],
        upanamaGenerals: ["Nayak", "Naik", "Shenoy", "Shanbhag", "Sharma"],
        propersByGeneral: {
          "Nayak":    { names: ["Madkaikar"],       kuladevatas: { "Madkaikar":  ["Shantadurga"] } },
          "Naik":     { names: ["Salvankar"],        kuladevatas: { "Salvankar":  ["Mahalakshmi"] } },
          "Shenoy":   { names: ["Shivaji"],          kuladevatas: { "Shivaji":    ["Lakshmi-Ravalanath"] } },
          "Shanbhag": { names: ["Thakur", "Wagle"],  kuladevatas: { "Thakur": ["Lakshmi-Narayana"], "Wagle": [] } },
          "Sharma":   { names: [],                   kuladevatas: {} },
        },
      },
    ],
  },
  {
    gotra: "Gautama",
    pravaraGroups: [
      {
        pravaraWords: ["Angirasa", "Ayushya", "Gautama"],
        upanamaGenerals: ["Kamath / Kamat"],
        propersByGeneral: {
          "Kamath / Kamat": {
            names: ["Kamat/Kamath", "Mahajan", "Mokoshi/ Mokashi"],
            kuladevatas: {
              "Kamat/Kamath":       ["Lakshmi-Narayana"],
              "Mahajan":            ["SaptaKoteshwar"],
              "Mokoshi/ Mokashi":   ["Ganapathi"],
            },
          },
        },
      },
    ],
  },
  {
    gotra: "Atri",
    pravaraGroups: [
      {
        pravaraWords: ["Atreya", "Archananasa", "Shyavashya"],
        upanamaGenerals: ["Nayak", "Naik", "Shenoy", "Marathe", "Prabhu"],
        propersByGeneral: {
          "Nayak":   { names: ["Shendre"],           kuladevatas: { "Shendre":       ["Mangesh"] } },
          "Naik":    { names: ["Bokde/Bokade"],       kuladevatas: { "Bokde/Bokade":  ["Mahadeva- Maharudra"] } },
          "Shenoy":  { names: ["Bandre"],             kuladevatas: { "Bandre":        ["Kamakshi"] } },
          "Marathe": { names: ["Budukule"],           kuladevatas: { "Budukule":      ["Mahalakshmi"] } },
          "Prabhu":  { names: ["Goorke", "Burake"],   kuladevatas: { "Goorke": ["Lakshmi-Ravalanath"], "Burake": [] } },
        },
      },
    ],
  },
  {
    gotra: "Kashyapa",
    pravaraGroups: [
      {
        pravaraWords: ["Avatsara", "Kashyapa", "Asike"],
        upanamaGenerals: ["Nayak", "Naik", "Juvale", "Shembekar", "Manjrekar"],
        propersByGeneral: {
          "Nayak":      { names: ["Bhagav"],              kuladevatas: { "Bhagav":    ["Narasimha"] } },
          "Naik":       { names: ["Kinare"],               kuladevatas: { "Kinare":    ["Nagesha"] } },
          "Juvale":     { names: ["Sankolkar"],            kuladevatas: { "Sankolkar": ["Mahalakshmi"] } },
          "Shembekar":  { names: ["Dhonde", "Mahajan"],    kuladevatas: { "Dhonde": ["Mahalasa Narayani"], "Mahajan": ["Shanteri", "Shanteri Kamakshi", "Mangesh"] } },
          "Manjrekar":  { names: ["Manjrekar"],            kuladevatas: { "Manjrekar": ["Shanteri"] } },
        },
      },
    ],
  },
  {
    gotra: "Vashishta",
    pravaraGroups: [
      {
        pravaraWords: ["Vashishta", "Indrapramada", "Bharadwasu"],
        upanamaGenerals: ["Nayak", "Naik", "Prabhu", "Kamath / Kamat"],
        propersByGeneral: {
          "Nayak":          { names: ["Haldonkar"],                                            kuladevatas: { "Haldonkar": ["Bhagavati"] } },
          "Naik":           { names: ["Potkar"],                                               kuladevatas: { "Potkar":    ["Lakshmi-Ravalanath"] } },
          "Prabhu":         { names: ["Ambelkar", "Lanjol", "Lanjekar", "Nidod", "Sankalkar", "Shevde"], kuladevatas: { "Ambelkar": ["Narasimha"], "Lanjol": ["SaptaKoteshwar"], "Lanjekar": [], "Nidod": [], "Sankalkar": [], "Shevde": [] } },
          "Kamath / Kamat": { names: ["Khandolkar"],                                           kuladevatas: { "Khandolkar": ["Mahalakshmi"] } },
        },
      },
    ],
  },
  {
    gotra: "Vatsa",
    pravaraGroups: [
      {
        pravaraWords: ["Bhargava", "Chyavana", "Apnavana", "Cherva", "Jamadagni"],
        upanamaGenerals: ["Nayak", "Naik", "Prabhu", "Kini", "Mallya", "Kamath / Kamat"],
        propersByGeneral: {
          "Nayak":          { names: ["Kini"],                       kuladevatas: { "Kini":        ["Ganapati Khandola"] } },
          "Naik":           { names: ["Navelkar"],                   kuladevatas: { "Navelkar":    ["Ravalanatha"] } },
          "Prabhu":         { names: ["Aslekar"],                    kuladevatas: { "Aslekar":     ["Narasimha"] } },
          "Kini":           { names: ["Khandolkar"],                 kuladevatas: { "Khandolkar":  ["Nagesha"] } },
          "Mallya":         { names: ["Kadavanekar"],                kuladevatas: { "Kadavanekar": ["Mahalakshmi"] } },
          "Kamath / Kamat": { names: ["Valavalkar", "Kamat/Kamath"], kuladevatas: { "Valavalkar": ["Shantadurga"], "Kamat/Kamath": [] } },
        },
      },
    ],
  },
  {
    gotra: "Kaundinya",
    pravaraGroups: [
      {
        pravaraWords: ["Vashishta", "Maitra", "Varuna", "Kaundinya"],
        upanamaGenerals: ["Nayak", "Naik", "Pai", "Prabhu", "Juvale", "Sharma", "Shenvi", "Nayak.Shenvi"],
        propersByGeneral: {
          "Nayak":        { names: ["Shinkar"],    kuladevatas: { "Shinkar":   ["Ramanath"] } },
          "Naik":         { names: ["Lotalikar"],  kuladevatas: { "Lotalikar": ["Mangesh"] } },
          "Pai":          { names: ["Wakade"],     kuladevatas: { "Wakade":    ["Ravalanatha"] } },
          "Prabhu":       { names: ["Shembekar"],  kuladevatas: { "Shembekar": ["Ganapathi"] } },
          "Juvale":       { names: ["Kanchikar"],  kuladevatas: { "Kanchikar": ["Mahalakshmi"] } },
          "Sharma":       { names: ["Borkar"],     kuladevatas: { "Borkar":    ["Shantadurga"] } },
          "Shenvi":       { names: ["Mayekar"],    kuladevatas: { "Mayekar":   [] } },
          "Nayak.Shenvi": { names: ["Kini"],       kuladevatas: { "Kini":      [] } },
        },
      },
    ],
  },
  {
    gotra: "Dhananjaya",
    pravaraGroups: [
      {
        pravaraWords: ["Atreya", "Archananasa", "Dhananjaya"],
        upanamaGenerals: ["Nayak", "Naik", "Prabhu"],
        propersByGeneral: {
          "Nayak":  { names: ["Tendulkar"],  kuladevatas: { "Tendulkar": ["Lakshmi-Ravalanath"] } },
          "Naik":   { names: ["Patkar"],     kuladevatas: { "Patkar":    ["Mahalakshmi"] } },
          "Prabhu": {
            names: ["Kalwari", "Kavatkar / Bhute", "Raykar", "Mede", "Bhagavat", "Brahme", "Gavalkar", "Gudkar", "Godbole", "Jharame"],
            kuladevatas: { "Kalwari": [], "Kavatkar / Bhute": [], "Raykar": [], "Mede": [], "Bhagavat": [], "Brahme": [], "Gavalkar": [], "Gudkar": [], "Godbole": [], "Jharame": [] },
          },
        },
      },
    ],
  },
  {
    gotra: "Kaushika",
    pravaraGroups: [
      {
        pravaraWords: ["Vishwamitra", "Aghamarshana", "Kaushika"],
        upanamaGenerals: ["Nayak", "Naik", "Prabhu", "Pai"],
        propersByGeneral: {
          "Nayak":  { names: ["Kelkar"],                                          kuladevatas: { "Kelkar":      ["Nagesha"] } },
          "Naik":   { names: ["Bandodkar"],                                       kuladevatas: { "Bandodkar":   ["Mahalakshmi"] } },
          "Prabhu": { names: ["Bandelkar", "Chimbalkar", "Juvalosahukar", "Kapur"], kuladevatas: { "Bandelkar": ["Shantadurga"], "Chimbalkar": [], "Juvalosahukar": [], "Kapur": [] } },
          "Pai":    { names: ["Pandit"],                                          kuladevatas: { "Pandit":      [] } },
        },
      },
    ],
  },
  {
    gotra: "Jamadagni",
    pravaraGroups: [
      {
        pravaraWords: ["Jamadagni"],
        upanamaGenerals: ["Nayak", "Naik", "Prabhu"],
        propersByGeneral: {
          "Nayak":  { names: ["Marathe"],   kuladevatas: { "Marathe":  ["Somanatheshwara"] } },
          "Naik":   { names: ["Karlekar"],  kuladevatas: { "Karlekar": ["Lakshmi-Ravalanath"] } },
          "Prabhu": { names: [],            kuladevatas: {} },
        },
      },
    ],
  },
];

// ─── Helper: find the pravaraGroup that contains a given pravaraWord ─────────
function findGroupByPravaraWord(gotraEntry: GotraEntry, word: string): PravaraGroupEntry | undefined {
  return gotraEntry.pravaraGroups.find(g => g.pravaraWords.includes(word));
}

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
    gotra: "",
    pravara: "",            // now stores a single pravara word, e.g. "Angirasa"
    upanamaGeneral: "",
    upanamaProper: "",
    kuladevata: "",
    kuladevataOther: "",
    surnameInUse: "",
    surnameAsPerGotra: "",
    priestName: "",
    priestLocation: "",
    demiGodChallenge: "",
    demiGod: "",
    demiGodNotes: "",
  });

  // Cascading option states
  const [pravaraOptions, setPravaraOptions]               = useState<string[]>([]);
  const [upanamaGeneralOptions, setUpanamaGeneralOptions] = useState<string[]>([]);
  const [upanamaProperOptions, setUpanamaProperOptions]   = useState<string[]>([]);
  const [kuladevataOptions, setKuladevataOptions]         = useState<string[]>([]);

  // Keep track of the active group for cascade lookups
  const [activeGroup, setActiveGroup] = useState<PravaraGroupEntry | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load existing data ────────────────────────────────────────
  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const s = data.step2;
      if (!s) return;

      const gotraData = religiousHierarchy.find(g => g.gotra === s.gotra);
      // All pravara words for the gotra
      const allPravaraWords = gotraData?.pravaraGroups.flatMap(g => g.pravaraWords) ?? [];
      // Find which group the saved pravara word belongs to
      const group = gotraData ? findGroupByPravaraWord(gotraData, s.pravara) : undefined;
      const generalEntry = group?.propersByGeneral[s.upanama_general];
      const kdOptions = generalEntry?.kuladevatas[s.upanama_proper] ?? [];

      setPravaraOptions(allPravaraWords);
      setActiveGroup(group ?? null);
      setUpanamaGeneralOptions(group?.upanamaGenerals ?? []);
      setUpanamaProperOptions(generalEntry?.names ?? []);
      setKuladevataOptions(kdOptions);

      setFormData({
        gotra:             s.gotra || "",
        pravara:           s.pravara || "",
        upanamaGeneral:    s.upanama_general || "",
        upanamaProper:     s.upanama_proper || "",
        kuladevata:        s.kuladevata_other ? "Other" : (s.kuladevata || ""),
        kuladevataOther:   s.kuladevata_other || "",
        surnameInUse:      s.surname_in_use || "",
        surnameAsPerGotra: s.surname_as_per_gotra || "",
        priestName:        s.priest_name || "",
        priestLocation:    s.priest_location || "",
        demiGodChallenge:  s.demi_god_challenge || "",
        demiGod:           s.demi_god || "",
        demiGodNotes:      s.demi_god_notes || "",
      });
    }).catch(() => {});
  }, []);

  // ── Payload ───────────────────────────────────────────────────
  const buildPayload = () => ({
    gotra:                formData.gotra,
    pravara:              formData.pravara,
    upanama_general:      formData.upanamaGeneral,
    upanama_proper:       formData.upanamaProper,
    kuladevata:           formData.kuladevata === "Other" ? null : formData.kuladevata,
    kuladevata_other:     formData.kuladevata === "Other" ? formData.kuladevataOther : null,
    surname_in_use:       formData.surnameInUse,
    surname_as_per_gotra: formData.surnameAsPerGotra || null,
    priest_name:          formData.priestName || null,
    priest_location:      formData.priestLocation || null,
    demi_god_challenge:   formData.demiGodChallenge,
    demi_god:             formData.demiGod,
    demi_god_notes:       formData.demiGodNotes || null,
  });

  useAutoSave("/users/profile/step2", buildPayload, [formData]);

  // ── Cascade handlers ──────────────────────────────────────────
  const handleGotraChange = (value: string) => {
    const gotraData = religiousHierarchy.find(g => g.gotra === value);
    // Flatten all pravara words across all groups for this gotra
    const allPravaraWords = gotraData?.pravaraGroups.flatMap(g => g.pravaraWords) ?? [];
    setFormData(prev => ({ ...prev, gotra: value, pravara: "", upanamaGeneral: "", upanamaProper: "", kuladevata: "", kuladevataOther: "" }));
    setPravaraOptions(allPravaraWords);
    setActiveGroup(null);
    setUpanamaGeneralOptions([]);
    setUpanamaProperOptions([]);
    setKuladevataOptions([]);
  };

  const handlePravaraChange = (value: string) => {
    const gotraData = religiousHierarchy.find(g => g.gotra === formData.gotra);
    const group = gotraData ? findGroupByPravaraWord(gotraData, value) : undefined;
    setFormData(prev => ({ ...prev, pravara: value, upanamaGeneral: "", upanamaProper: "", kuladevata: "", kuladevataOther: "" }));
    setActiveGroup(group ?? null);
    setUpanamaGeneralOptions(group?.upanamaGenerals ?? []);
    setUpanamaProperOptions([]);
    setKuladevataOptions([]);
  };

  const handleUpanamaGeneralChange = (value: string) => {
    const generalEntry = activeGroup?.propersByGeneral[value];
    setFormData(prev => ({ ...prev, upanamaGeneral: value, upanamaProper: "", kuladevata: "", kuladevataOther: "" }));
    setUpanamaProperOptions(generalEntry?.names ?? []);
    setKuladevataOptions([]);
  };

  const handleUpanamaProperChange = (value: string) => {
    const kdOptions = activeGroup?.propersByGeneral[formData.upanamaGeneral]?.kuladevatas[value] ?? [];
    setFormData(prev => ({ ...prev, upanamaProper: value, kuladevata: "", kuladevataOther: "" }));
    setKuladevataOptions(kdOptions);
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.gotra)           e.gotra           = "Please select Gotra";
    if (!formData.pravara)         e.pravara         = "Please select Pravara";
    if (!formData.upanamaGeneral)  e.upanamaGeneral  = "Please select Upanama (General)";
    if (!formData.upanamaProper)   e.upanamaProper   = "Please select Upanama (Proper)";
    if (!formData.kuladevata)      e.kuladevata      = "Please select Kuladevata";
    if (formData.kuladevata === "Other" && !formData.kuladevataOther.trim())
      e.kuladevataOther = "Please enter your Kuladevata";
    if (!formData.surnameInUse.trim()) e.surnameInUse = "Surname in use is required";
    if (!formData.demiGodChallenge)    e.demiGodChallenge = "Please answer this question";
    if (formData.demiGodChallenge === "no" && !formData.demiGod)
      e.demiGod = "Please select a Demi God";
    if (formData.demiGodChallenge === "yes" && !formData.demiGodNotes.trim())
      e.demiGodNotes = "Please enter Common Relative Known Names";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────
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
      await api.post("/users/profile/reset/step2", {});
      toast.success("Religious details cleared.");
      setFormData({ gotra: "", pravara: "", upanamaGeneral: "", upanamaProper: "", kuladevata: "", kuladevataOther: "", surnameInUse: "", surnameAsPerGotra: "", priestName: "", priestLocation: "", demiGodChallenge: "", demiGod: "", demiGodNotes: "" });
      setPravaraOptions([]);
      setActiveGroup(null);
      setUpanamaGeneralOptions([]);
      setUpanamaProperOptions([]);
      setKuladevataOptions([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
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
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={1} />

      {/* ── Religious Lineage ─────────────────────────────────── */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Religious Lineage</CardTitle>
          <CardDescription>Select your lineage in order — each dropdown filters the next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Visual breadcrumb */}
          <div className="flex items-center justify-center gap-3 p-4 bg-secondary/50 rounded-lg flex-wrap">
            {[
              { label: "Gotra",             val: formData.gotra || "—" },
              { label: "Pravara",           val: formData.pravara || "—" },
              { label: "Upanama (General)", val: formData.upanamaGeneral || "—" },
              { label: "Upanama (Proper)",  val: formData.upanamaProper || "—" },
              { label: "Kuladevata",        val: formData.kuladevata === "Other" ? (formData.kuladevataOther || "Other") : (formData.kuladevata || "—") },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xs font-semibold text-primary">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[100px] truncate">{item.val}</p>
                </div>
                {i < arr.length - 1 && <ArrowDown className="h-4 w-4 text-primary -rotate-90 flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            {/* Gotra */}
            <div className="space-y-2">
              <Label>Gotra <span className="text-destructive">*</span></Label>
              <Select value={formData.gotra} onValueChange={handleGotraChange}>
                <SelectTrigger className={errors.gotra ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select Gotra" />
                </SelectTrigger>
                <SelectContent>
                  {religiousHierarchy.map(g => (
                    <SelectItem key={g.gotra} value={g.gotra}>{g.gotra}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gotra && <p className="text-xs text-destructive">{errors.gotra}</p>}
            </div>

            {/* Pravara — now individual words */}
            <div className="space-y-2">
              <Label>Pravara <span className="text-destructive">*</span></Label>
              <Select value={formData.pravara} onValueChange={handlePravaraChange} disabled={!formData.gotra}>
                <SelectTrigger className={errors.pravara ? "border-destructive" : ""}>
                  <SelectValue placeholder={formData.gotra ? "Select Pravara" : "Select Gotra first"} />
                </SelectTrigger>
                <SelectContent>
                  {pravaraOptions.map(word => (
                    <SelectItem key={word} value={word}>{word}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pravara && <p className="text-xs text-destructive">{errors.pravara}</p>}
            </div>

            {/* Upanama General */}
            <div className="space-y-2">
              <Label>Upanama (General) <span className="text-destructive">*</span></Label>
              <Select value={formData.upanamaGeneral} onValueChange={handleUpanamaGeneralChange} disabled={!formData.pravara}>
                <SelectTrigger className={errors.upanamaGeneral ? "border-destructive" : ""}>
                  <SelectValue placeholder={formData.pravara ? "Select Upanama (General)" : "Select Pravara first"} />
                </SelectTrigger>
                <SelectContent>
                  {upanamaGeneralOptions.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.upanamaGeneral && <p className="text-xs text-destructive">{errors.upanamaGeneral}</p>}
            </div>

            {/* Upanama Proper */}
            <div className="space-y-2">
              <Label>Upanama (Proper) <span className="text-destructive">*</span></Label>
              <Select value={formData.upanamaProper} onValueChange={handleUpanamaProperChange} disabled={!formData.upanamaGeneral}>
                <SelectTrigger className={errors.upanamaProper ? "border-destructive" : ""}>
                  <SelectValue placeholder={formData.upanamaGeneral ? "Select Upanama (Proper)" : "Select Upanama (General) first"} />
                </SelectTrigger>
                <SelectContent>
                  {upanamaProperOptions.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.upanamaProper && <p className="text-xs text-destructive">{errors.upanamaProper}</p>}
            </div>

            {/* Kuladevata */}
            <div className="space-y-2 md:col-span-2">
              <Label>Kuladevata <span className="text-destructive">*</span></Label>
              <Select
                value={formData.kuladevata}
                onValueChange={v => {
                  setFormData(p => ({ ...p, kuladevata: v, kuladevataOther: "" }));
                  setErrors(e => ({ ...e, kuladevata: "" }));
                }}
                disabled={!formData.upanamaProper}
              >
                <SelectTrigger className={errors.kuladevata ? "border-destructive" : ""}>
                  <SelectValue placeholder={formData.upanamaProper ? "Select Kuladevata" : "Select Upanama (Proper) first"} />
                </SelectTrigger>
                <SelectContent>
                  {kuladevataOptions.map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other (Not listed)</SelectItem>
                </SelectContent>
              </Select>
              {errors.kuladevata && <p className="text-xs text-destructive">{errors.kuladevata}</p>}
            </div>

          </div>

          {/* Kuladevata Other */}
          {formData.kuladevata === "Other" && (
            <div className="space-y-2">
              <Label>Enter Kuladevata <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Type your Kuladevata name"
                value={formData.kuladevataOther}
                onChange={e => {
                  setFormData(p => ({ ...p, kuladevataOther: e.target.value }));
                  setErrors(ev => ({ ...ev, kuladevataOther: "" }));
                }}
                className={errors.kuladevataOther ? "border-destructive" : ""}
              />
              {errors.kuladevataOther && <p className="text-xs text-destructive">{errors.kuladevataOther}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Demi God ─────────────────────────────────────────────── */}
      <Card className="shadow-sm border-l-4 border-l-orange-400">
        <CardHeader>
          <CardTitle>Demi God Details</CardTitle>
          <CardDescription>Information about your ancestral Demi God (Daiva).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-2">
            <Label>Are you having challenge in tracing your ancestral family? <span className="text-destructive">*</span></Label>
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant={formData.demiGodChallenge === "no" ? "default" : "outline"}
                onClick={() => {
                  setFormData(p => ({ ...p, demiGodChallenge: "no", demiGod: "", demiGodNotes: "" }));
                  setErrors(e => ({ ...e, demiGodChallenge: "" }));
                }}
              >
                No
              </Button>
              <Button
                type="button"
                variant={formData.demiGodChallenge === "yes" ? "default" : "outline"}
                onClick={() => {
                  setFormData(p => ({ ...p, demiGodChallenge: "yes", demiGod: NAGA_DEFAULT, demiGodNotes: "" }));
                  setErrors(e => ({ ...e, demiGodChallenge: "" }));
                }}
              >
                Yes
              </Button>
            </div>
            {errors.demiGodChallenge && <p className="text-xs text-destructive">{errors.demiGodChallenge}</p>}
          </div>

          {formData.demiGodChallenge === "no" && (
            <div className="space-y-2">
              <Label>Select Demi God <span className="text-destructive">*</span></Label>
              <Select
                value={formData.demiGod}
                onValueChange={v => {
                  setFormData(p => ({ ...p, demiGod: v }));
                  setErrors(e => ({ ...e, demiGod: "" }));
                }}
              >
                <SelectTrigger className={errors.demiGod ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select Demi God" />
                </SelectTrigger>
                <SelectContent>
                  {demiGodList.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.demiGod && <p className="text-xs text-destructive">{errors.demiGod}</p>}
            </div>
          )}

          {formData.demiGodChallenge === "yes" && (
            <div className="space-y-4">
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                <span className="font-semibold">Demi God: </span>{NAGA_DEFAULT}
              </div>
              <div className="space-y-2">
                <Label>Common Relative Known Names <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Enter known relative names..."
                  value={formData.demiGodNotes}
                  onChange={e => {
                    setFormData(p => ({ ...p, demiGodNotes: e.target.value }));
                    setErrors(ev => ({ ...ev, demiGodNotes: "" }));
                  }}
                  className={errors.demiGodNotes ? "border-destructive" : ""}
                />
                {errors.demiGodNotes && <p className="text-xs text-destructive">{errors.demiGodNotes}</p>}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ── Surname & Priest ──────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Surname & Priest Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Surname (In Use) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Current surname"
                value={formData.surnameInUse}
                onChange={e => { setFormData(p => ({ ...p, surnameInUse: e.target.value })); setErrors(ev => ({ ...ev, surnameInUse: "" })); }}
                className={errors.surnameInUse ? "border-destructive" : ""}
              />
              {errors.surnameInUse && <p className="text-xs text-destructive">{errors.surnameInUse}</p>}
            </div>
            <div className="space-y-2">
              <Label>Surname (As per Gotra)</Label>
              <Input placeholder="Traditional surname" value={formData.surnameAsPerGotra}
                onChange={e => setFormData(p => ({ ...p, surnameAsPerGotra: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Family Priest Name</Label>
              <Input placeholder="Enter priest's name" value={formData.priestName}
                onChange={e => setFormData(p => ({ ...p, priestName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Family Priest Location</Label>
              <Input placeholder="City, Village" value={formData.priestLocation}
                onChange={e => setFormData(p => ({ ...p, priestLocation: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/personal-details")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Reset dialog ─────────────────────────────────────────── */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Religious Details?</AlertDialogTitle>
            <AlertDialogDescription>This will clear only your religious details. All other steps remain intact.</AlertDialogDescription>
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
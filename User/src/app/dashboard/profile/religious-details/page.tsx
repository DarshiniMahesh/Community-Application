"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, ArrowDown, RotateCcw, X } from "lucide-react";
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
  pravaraWords: string[];
  upanamaGenerals: string[];
  propersByGeneral: Record<string, ProperEntry>;
}

interface GotraEntry {
  gotra: string;
  pravaraGroups: PravaraGroupEntry[];
}

// ─── Religious Hierarchy ──────────────────────────────────────────────────────
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
          "Nayak":  { names: ["Kelkar"],                                            kuladevatas: { "Kelkar":      ["Nagesha"] } },
          "Naik":   { names: ["Bandodkar"],                                         kuladevatas: { "Bandodkar":   ["Mahalakshmi"] } },
          "Prabhu": { names: ["Bandelkar", "Chimbalkar", "Juvalosahukar", "Kapur"], kuladevatas: { "Bandelkar": ["Shantadurga"], "Chimbalkar": [], "Juvalosahukar": [], "Kapur": [] } },
          "Pai":    { names: ["Pandit"],                                            kuladevatas: { "Pandit":      [] } },
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

// ─── Helper ───────────────────────────────────────────────────────────────────
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
  const [loading, setLoading]               = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [canReset, setCanReset]             = useState(false);

  // ── NEW: separate input state for the tag input field ──
  const [demiGodInput, setDemiGodInput] = useState("");
  const demiGodInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    surnameInUse:             "",
    surnameAsPerGotra:        "",
    priestName:               "",
    priestLocation:           "",
    gotra:                    "",
    pravara:                  "",
    upanamaGeneral:           "",
    upanamaProper:            "",
    kuladevata:               "",
    kuladevataOther:          "",
    demiGods:                 [] as string[],
    // ── Changed: now an array of tag strings ──
    demiGodOtherTags:         [] as string[],
    ancestralChallenge:       "",
    ancestralChallengeNotes:  "",
  });

  const [pravaraOptions, setPravaraOptions]               = useState<string[]>([]);
  const [upanamaGeneralOptions, setUpanamaGeneralOptions] = useState<string[]>([]);
  const [upanamaProperOptions, setUpanamaProperOptions]   = useState<string[]>([]);
  const [kuladevataOptions, setKuladevataOptions]         = useState<string[]>([]);
  const [activeGroup, setActiveGroup]                     = useState<PravaraGroupEntry | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const s = data.step2;
      if (!s) return;

      const gotraData       = religiousHierarchy.find(g => g.gotra === s.gotra);
      const allPravaraWords = gotraData?.pravaraGroups.flatMap(g => g.pravaraWords) ?? [];
      const group           = gotraData ? findGroupByPravaraWord(gotraData, s.pravara) : undefined;
      const generalEntry    = group?.propersByGeneral[s.upanama_general];
      const kdOptions       = generalEntry?.kuladevatas[s.upanama_proper] ?? [];

      setPravaraOptions(allPravaraWords);
      setActiveGroup(group ?? null);
      setUpanamaGeneralOptions(group?.upanamaGenerals ?? []);
      setUpanamaProperOptions(generalEntry?.names ?? []);
      setKuladevataOptions(kdOptions);

      const storedDemiGods: string[] = Array.isArray(s.demi_gods)
        ? s.demi_gods
        : (s.demi_gods ? String(s.demi_gods).split(",").map((d: string) => d.trim()) : []);

      // Parse stored demi_god_other back into tags array
      const storedOtherTags: string[] = s.demi_god_other
        ? String(s.demi_god_other).split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      setFormData({
        surnameInUse:            s.surname_in_use || "",
        surnameAsPerGotra:       s.surname_as_per_gotra || "",
        priestName:              s.priest_name || "",
        priestLocation:          s.priest_location || "",
        gotra:                   s.gotra || "",
        pravara:                 s.pravara || "",
        upanamaGeneral:          s.upanama_general || "",
        upanamaProper:           s.upanama_proper || "",
        kuladevata:              s.kuladevata_other ? "Other" : (s.kuladevata || ""),
        kuladevataOther:         s.kuladevata_other || "",
        demiGods:                storedDemiGods,
        demiGodOtherTags:        storedOtherTags,
        ancestralChallenge:      s.ancestral_challenge || "",
        ancestralChallengeNotes: s.ancestral_challenge_notes || "",
      });
    }).catch(() => {});
  }, []);

  // ── Payload ───────────────────────────────────────────────────
  // demi_god_other is sent as a comma-separated string for backend compatibility
  const buildPayload = () => ({
    surname_in_use:             formData.surnameInUse,
    surname_as_per_gotra:       formData.surnameAsPerGotra || null,
    priest_name:                formData.priestName || null,
    priest_location:            formData.priestLocation || null,
    gotra:                      formData.gotra,
    pravara:                    formData.pravara,
    upanama_general:            formData.upanamaGeneral,
    upanama_proper:             formData.upanamaProper,
    kuladevata:                 formData.kuladevata === "Other" ? null : formData.kuladevata,
    kuladevata_other:           formData.kuladevata === "Other" ? formData.kuladevataOther : null,
    demi_gods:                  formData.demiGods,
    demi_god_other:             formData.demiGods.includes("Other") && formData.demiGodOtherTags.length > 0
                                  ? formData.demiGodOtherTags.join(", ")
                                  : null,
    ancestral_challenge:        formData.ancestralChallenge,
    ancestral_challenge_notes:  formData.ancestralChallenge === "yes" ? formData.ancestralChallengeNotes : null,
  });

  useAutoSave("/users/profile/step2", buildPayload, [formData]);

  // ── Cascade handlers ──────────────────────────────────────────
  const handleGotraChange = (value: string) => {
    const gotraData       = religiousHierarchy.find(g => g.gotra === value);
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
    const group     = gotraData ? findGroupByPravaraWord(gotraData, value) : undefined;
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

  // ── Demi God toggle ───────────────────────────────────────────
  const toggleDemiGod = (god: string) => {
    setFormData(prev => {
      const already = prev.demiGods.includes(god);
      const updated = already
        ? prev.demiGods.filter(d => d !== god)
        : [...prev.demiGods, god];
      return {
        ...prev,
        demiGods:         updated,
        // Clear tags when "Other" is unchecked
        demiGodOtherTags: god === "Other" && already ? [] : prev.demiGodOtherTags,
      };
    });
    if (god === "Other") setDemiGodInput("");
    setErrors(e => ({ ...e, demiGods: "" }));
  };

  // ── NEW: Tag add / remove handlers ───────────────────────────
  const handleDemiGodInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = demiGodInput.trim();
      if (!trimmed) return;
      // Avoid duplicate tags
      if (formData.demiGodOtherTags.includes(trimmed)) {
        setDemiGodInput("");
        return;
      }
      setFormData(prev => ({
        ...prev,
        demiGodOtherTags: [...prev.demiGodOtherTags, trimmed],
      }));
      setDemiGodInput("");
      setErrors(ev => ({ ...ev, demiGodOther: "" }));
    }
  };

  const removeDemiGodTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      demiGodOtherTags: prev.demiGodOtherTags.filter(t => t !== tag),
    }));
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.surnameInUse.trim()) e.surnameInUse  = "Surname in use is required";
    if (!formData.gotra)               e.gotra         = "Please select Gotra";
    if (!formData.pravara)             e.pravara       = "Please select Pravara";
    if (!formData.upanamaGeneral)      e.upanamaGeneral = "Please select Upanama (General)";
    if (!formData.upanamaProper)       e.upanamaProper  = "Please select Upanama (Proper)";
    if (!formData.kuladevata)          e.kuladevata    = "Please select Kuladevata";
    if (formData.kuladevata === "Other" && !formData.kuladevataOther.trim())
      e.kuladevataOther = "Please enter your Kuladevata";
    if (formData.demiGods.length === 0)
      e.demiGods = "Please select at least one Demi God";
    if (formData.demiGods.includes("Other") && formData.demiGodOtherTags.length === 0)
      e.demiGodOther = "Please add at least one Demi God name (press Enter to add)";
    if (!formData.ancestralChallenge)
      e.ancestralChallenge = "Please answer this question";
    if (formData.ancestralChallenge === "yes" && !formData.ancestralChallengeNotes.trim())
      e.ancestralChallengeNotes = "Please enter Common Relative Known Names";
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
      setFormData({
        surnameInUse: "", surnameAsPerGotra: "", priestName: "", priestLocation: "",
        gotra: "", pravara: "", upanamaGeneral: "", upanamaProper: "",
        kuladevata: "", kuladevataOther: "",
        demiGods: [], demiGodOtherTags: [],
        ancestralChallenge: "", ancestralChallengeNotes: "",
      });
      setDemiGodInput("");
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
          <Button variant="outline" size="sm"
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={1} />

      {/* ══ Card: Surname & Priest + Religious Lineage ══ */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Religious Details</CardTitle>
          <CardDescription>Fill in your surname, priest details and lineage information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* ── SECTION 1: Surname & Priest ─────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase text-muted-foreground">
              Surname &amp; Priest Information
            </h3>
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
                <Input
                  placeholder="Traditional surname"
                  value={formData.surnameAsPerGotra}
                  onChange={e => setFormData(p => ({ ...p, surnameAsPerGotra: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Family Priest Name</Label>
                <Input
                  placeholder="Enter priest's name"
                  value={formData.priestName}
                  onChange={e => setFormData(p => ({ ...p, priestName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Family Priest Location</Label>
                <Input
                  placeholder="City, Village"
                  value={formData.priestLocation}
                  onChange={e => setFormData(p => ({ ...p, priestLocation: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── SECTION 2: Religious Lineage ────────────────────── */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase text-muted-foreground">
                Religious Lineage
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select your lineage in order — each dropdown filters the next.
              </p>
            </div>

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

              {/* Pravara */}
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
          </div>

        </CardContent>
      </Card>

      {/* ── Demi God ─────────────────────────────────────────────── */}
      <Card className="shadow-sm border-l-4 border-l-orange-400">
        <CardHeader>
          <CardTitle>Demi God Details</CardTitle>
          <CardDescription>Select all ancestral Demi Gods (Daiva) that apply to your family.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-3">
            <Label>Select Demi God(s) <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demiGodList.map(god => (
                <div key={god} className="flex items-center gap-2">
                  <Checkbox
                    id={`dg-${god}`}
                    checked={formData.demiGods.includes(god)}
                    onCheckedChange={() => toggleDemiGod(god)}
                  />
                  <label htmlFor={`dg-${god}`} className="text-sm cursor-pointer leading-tight">
                    {god}
                  </label>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dg-Other"
                  checked={formData.demiGods.includes("Other")}
                  onCheckedChange={() => toggleDemiGod("Other")}
                />
                <label htmlFor="dg-Other" className="text-sm cursor-pointer leading-tight">
                  Other (Not listed)
                </label>
              </div>
            </div>
            {errors.demiGods && <p className="text-xs text-destructive">{errors.demiGods}</p>}
          </div>

          {/* ── NEW: Tag input for "Other" ─────────────────────── */}
          {formData.demiGods.includes("Other") && (
            <div className="space-y-2">
              <Label>Enter Demi God Name(s) <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Type a name and press <kbd className="px-1 py-0.5 text-xs bg-muted border border-border rounded">Enter</kbd> to add it as a tag.</p>

              {/* Tag chips display */}
              {formData.demiGodOtherTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-md border border-border min-h-[36px]">
                  {formData.demiGodOtherTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeDemiGodTag(tag)}
                        className="ml-0.5 hover:text-orange-600 focus:outline-none"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input field */}
              <Input
                ref={demiGodInputRef}
                placeholder="Type a Demi God name and press Enter..."
                value={demiGodInput}
                onChange={e => {
                  setDemiGodInput(e.target.value);
                  setErrors(ev => ({ ...ev, demiGodOther: "" }));
                }}
                onKeyDown={handleDemiGodInputKeyDown}
                className={errors.demiGodOther ? "border-destructive" : ""}
              />
              {errors.demiGodOther && <p className="text-xs text-destructive">{errors.demiGodOther}</p>}
            </div>
          )}

          {/* Selected summary pills — all demi gods including "Other" tags */}
          {(formData.demiGods.filter(d => d !== "Other").length > 0 || formData.demiGodOtherTags.length > 0) && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">Selected:</p>
              <div className="flex flex-wrap gap-1">
                {formData.demiGods.filter(d => d !== "Other").map(god => (
                  <span key={god} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                    {god}
                  </span>
                ))}
                {formData.demiGodOtherTags.map(tag => (
                  <span key={tag} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ── Ancestral Challenge ───────────────────────────────────── */}
      <Card className="shadow-sm border-l-4 border-l-blue-400">
        <CardHeader>
          <CardTitle>Ancestral Family Tracing</CardTitle>
          <CardDescription>Help us understand if you need assistance finding your ancestral lineage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-2">
            <Label>
              Are you facing any challenges in tracing your ancestral family?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant={formData.ancestralChallenge === "no" ? "default" : "outline"}
                onClick={() => {
                  setFormData(p => ({ ...p, ancestralChallenge: "no", ancestralChallengeNotes: "" }));
                  setErrors(e => ({ ...e, ancestralChallenge: "" }));
                }}
              >
                No
              </Button>
              <Button
                type="button"
                variant={formData.ancestralChallenge === "yes" ? "default" : "outline"}
                onClick={() => {
                  setFormData(p => ({ ...p, ancestralChallenge: "yes" }));
                  setErrors(e => ({ ...e, ancestralChallenge: "" }));
                }}
              >
                Yes
              </Button>
            </div>
            {errors.ancestralChallenge && <p className="text-xs text-destructive">{errors.ancestralChallenge}</p>}
          </div>

          {formData.ancestralChallenge === "yes" && (
            <div className="space-y-4">
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                <span className="font-semibold">Default Demi God assigned: </span>{NAGA_DEFAULT}
              </div>
              <div className="space-y-2">
                <Label>Common Relative Known Names <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Enter known relative names to help trace lineage..."
                  rows={3}
                  value={formData.ancestralChallengeNotes}
                  onChange={e => {
                    setFormData(p => ({ ...p, ancestralChallengeNotes: e.target.value }));
                    setErrors(ev => ({ ...ev, ancestralChallengeNotes: "" }));
                  }}
                  className={`resize-none${errors.ancestralChallengeNotes ? " border-destructive" : ""}`}
                />
                {errors.ancestralChallengeNotes && <p className="text-xs text-destructive">{errors.ancestralChallengeNotes}</p>}
              </div>
            </div>
          )}

          {formData.ancestralChallenge === "no" && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Great! Your lineage information has been captured above.
            </div>
          )}

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
            <AlertDialogDescription>
              This will clear only your religious details. All other steps remain intact.
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
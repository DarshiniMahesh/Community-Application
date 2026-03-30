"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAutoSave } from "@/lib/useAutoSave";
import { INCOME_SLAB_MAP, INCOME_SLAB_REVERSE } from "@/lib/constants";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

const incomeSlabs = ["Less than ₹1 Lakh","₹1 – 2 Lakh","₹2 – 3 Lakh","₹3 – 5 Lakh","₹5 – 10 Lakh","₹10 – 25 Lakh","₹25 Lakh+"];
const familyFacilities = ["Stay in Rented House","Own a House","Own Agricultural Land","Own a Two Wheeler","Own a Car"];
const investmentOptions = ["Fixed Deposits","Mutual Funds / SIP","Trading in Shares / Demat Account","Investment - Others"];

interface MemberCoverage {
  id: string; name: string; relation: string;
  healthInsurance: boolean; lifeInsurance: boolean; termInsurance: boolean;
  aadhaar: boolean; pan: boolean; voterId: boolean;
  landDocuments: boolean; drivingLicense: boolean; konkaniCard: boolean;
}

function blankMember(id: string, name = "", relation = ""): MemberCoverage {
  return { id, name, relation, healthInsurance: false, lifeInsurance: false, termInsurance: false, aadhaar: false, pan: false, voterId: false, landDocuments: false, drivingLicense: false, konkaniCard: false };
}

function ToggleCell({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-center">
      <button type="button" onClick={onChange}
        className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg border-2 text-xs font-medium transition-all min-w-[52px] ${checked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
        {checked ? <><Check className="h-3 w-3" />Yes</> : <span>—</span>}
      </button>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading]                         = useState(false);
  const [selfIncome, setSelfIncome]                   = useState("");
  const [familyIncome, setFamilyIncome]               = useState("");
  const [selectedFacilities, setSelectedFacilities]   = useState<string[]>([]);
  const [selectedInvestments, setSelectedInvestments] = useState<string[]>([]);
  const [members, setMembers]                         = useState<MemberCoverage[]>([blankMember("self", "You", "Self")]);
  const [allBases, setAllBases]                       = useState<{id:string;name:string;relation:string}[]>([]);
  const [errors, setErrors]                           = useState<Record<string, string>>({});
  const [showResetDialog, setShowResetDialog]         = useState(false);
  const [resetting, setResetting]                     = useState(false);
  const [canReset, setCanReset]                       = useState(false);

  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const s1 = data.step1;
      const userName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "You";
      const familyMems: Record<string, string>[] = data.step3?.members || [];

      const bases = [
        { id: "self", name: userName, relation: "Self" },
        ...familyMems.map((fm, i) => ({ id: String(i), name: fm.name || `Member ${i + 1}`, relation: fm.relation || "" })),
      ];
      setAllBases(bases);

      const eco = data.step6?.economic;
      if (eco) {
        if (eco.self_income)   setSelfIncome(INCOME_SLAB_REVERSE[eco.self_income] || "");
        if (eco.family_income) setFamilyIncome(INCOME_SLAB_REVERSE[eco.family_income] || "");
        const fac: string[] = [];
        if (eco.fac_rented_house)      fac.push("Stay in Rented House");
        if (eco.fac_own_house)         fac.push("Own a House");
        if (eco.fac_agricultural_land) fac.push("Own Agricultural Land");
        if (eco.fac_two_wheeler)       fac.push("Own a Two Wheeler");
        if (eco.fac_car)               fac.push("Own a Car");
        setSelectedFacilities(fac);
        const inv: string[] = [];
        if (eco.inv_fixed_deposits)   inv.push("Fixed Deposits");
        if (eco.inv_mutual_funds_sip) inv.push("Mutual Funds / SIP");
        if (eco.inv_shares_demat)     inv.push("Trading in Shares / Demat Account");
        if (eco.inv_others)           inv.push("Investment - Others");
        setSelectedInvestments(inv);
      }

      const insurance = (data.step6?.insurance || []) as Record<string, unknown>[];
      const documents = (data.step6?.documents  || []) as Record<string, unknown>[];

      setMembers(bases.map(base => {
        const ins = insurance.find(i => i.member_name === base.name) || {};
        const doc = documents.find(d => d.member_name === base.name) || {};
        return {
          ...blankMember(base.id, base.name, base.relation),
          healthInsurance: ((ins.health_coverage as string[]) || []).length > 0,
          lifeInsurance:   ((ins.life_coverage   as string[]) || []).length > 0,
          termInsurance:   ((ins.term_coverage   as string[]) || []).length > 0,
          aadhaar:         ((doc.aadhaar_coverage     as string[]) || []).length > 0,
          pan:             ((doc.pan_coverage         as string[]) || []).length > 0,
          voterId:         ((doc.voter_id_coverage    as string[]) || []).length > 0,
          landDocuments:   ((doc.land_doc_coverage    as string[]) || []).length > 0,
          drivingLicense:  ((doc.dl_coverage          as string[]) || []).length > 0,
          konkaniCard:     ((doc.all_records_coverage as string[]) || []).length > 0,
        };
      }));
    }).catch(() => {});
  }, []);

  const toggleFacility   = (f: string) => setSelectedFacilities(p  => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  const toggleInvestment = (i: string) => setSelectedInvestments(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  const toggleMember = (id: string, field: keyof MemberCoverage) =>
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: !m[field] } : m));

  const buildPayload = () => ({
    economic: {
      self_income:           INCOME_SLAB_MAP[selfIncome]   || null,
      family_income:         INCOME_SLAB_MAP[familyIncome] || null,
      fac_rented_house:      selectedFacilities.includes("Stay in Rented House"),
      fac_own_house:         selectedFacilities.includes("Own a House"),
      fac_agricultural_land: selectedFacilities.includes("Own Agricultural Land"),
      fac_two_wheeler:       selectedFacilities.includes("Own a Two Wheeler"),
      fac_car:               selectedFacilities.includes("Own a Car"),
      inv_fixed_deposits:    selectedInvestments.includes("Fixed Deposits"),
      inv_mutual_funds_sip:  selectedInvestments.includes("Mutual Funds / SIP"),
      inv_shares_demat:      selectedInvestments.includes("Trading in Shares / Demat Account"),
      inv_others:            selectedInvestments.includes("Investment - Others"),
    },
    insurance: members.map((m, i) => ({
      member_name: m.name || null, member_relation: m.relation || null, sort_order: i,
      health_coverage: m.healthInsurance ? ["self"] : [],
      life_coverage:   m.lifeInsurance   ? ["self"] : [],
      term_coverage:   m.termInsurance   ? ["self"] : [],
    })),
    documents: members.map((m, i) => ({
      member_name: m.name || null, member_relation: m.relation || null, sort_order: i,
      aadhaar_coverage:     m.aadhaar        ? ["self"] : [],
      pan_coverage:         m.pan            ? ["self"] : [],
      voter_id_coverage:    m.voterId        ? ["self"] : [],
      land_doc_coverage:    m.landDocuments  ? ["self"] : [],
      dl_coverage:          m.drivingLicense ? ["self"] : [],
      all_records_coverage: m.konkaniCard    ? ["self"] : [],
    })),
  });

  useAutoSave("/users/profile/step6", buildPayload, [selfIncome, familyIncome, selectedFacilities, selectedInvestments, members]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selfIncome)   e.selfIncome   = "Please select your income slab";
    if (!familyIncome) e.familyIncome = "Please select family income slab";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/users/profile/step6", buildPayload());
      toast.success("Economic details saved!");
      router.push("/dashboard/profile/review-submit");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset/step6", {});
      toast.success("Economic details cleared.");
      setSelfIncome("");
      setFamilyIncome("");
      setSelectedFacilities([]);
      setSelectedInvestments([]);
      setMembers(allBases.map(b => blankMember(b.id, b.name, b.relation)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Economic Details</h1>
          <p className="text-muted-foreground mt-1">Step 6 of 7 — Financial and asset information</p>
        </div>
        {canReset && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={5} />

      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader><CardTitle>Annual Income</CardTitle><CardDescription>Select the applicable income range</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Self Income <span className="text-destructive">*</span></Label>
            <Select value={selfIncome} onValueChange={v => { setSelfIncome(v); setErrors(e => ({...e, selfIncome: ""})); }}>
              <SelectTrigger className={errors.selfIncome ? "border-destructive" : ""}><SelectValue placeholder="Select income range" /></SelectTrigger>
              <SelectContent>{incomeSlabs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.selfIncome && <p className="text-xs text-destructive">{errors.selfIncome}</p>}
          </div>
          <div className="space-y-2">
            <Label>Family Income <span className="text-destructive">*</span></Label>
            <Select value={familyIncome} onValueChange={v => { setFamilyIncome(v); setErrors(e => ({...e, familyIncome: ""})); }}>
              <SelectTrigger className={errors.familyIncome ? "border-destructive" : ""}><SelectValue placeholder="Select income range" /></SelectTrigger>
              <SelectContent>{incomeSlabs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.familyIncome && <p className="text-xs text-destructive">{errors.familyIncome}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Family Facilities</CardTitle><CardDescription>Select all that apply</CardDescription></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {familyFacilities.map(f => (
              <div key={f} onClick={() => toggleFacility(f)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedFacilities.includes(f) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Checkbox checked={selectedFacilities.includes(f)} onCheckedChange={() => toggleFacility(f)} />
                <Label className="font-normal cursor-pointer text-sm">{f}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Investments</CardTitle><CardDescription>Select all investment types that apply</CardDescription></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {investmentOptions.map(inv => (
              <div key={inv} onClick={() => toggleInvestment(inv)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedInvestments.includes(inv) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Checkbox checked={selectedInvestments.includes(inv)} onCheckedChange={() => toggleInvestment(inv)} />
                <Label className="font-normal cursor-pointer text-sm">{inv}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Insurance Coverage</CardTitle><CardDescription>Members are auto-loaded from Family Information. Click a cell to toggle Yes / —</CardDescription></CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[140px]">Member</TableHead>
                    <TableHead className="min-w-[100px]">Relation</TableHead>
                    <TableHead className="text-center min-w-[120px]">Health Insurance</TableHead>
                    <TableHead className="text-center min-w-[120px]">Life Insurance</TableHead>
                    <TableHead className="text-center min-w-[120px]">Term Insurance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.relation}</TableCell>
                      <TableCell><ToggleCell checked={m.healthInsurance} onChange={() => toggleMember(m.id, "healthInsurance")} /></TableCell>
                      <TableCell><ToggleCell checked={m.lifeInsurance}   onChange={() => toggleMember(m.id, "lifeInsurance")} /></TableCell>
                      <TableCell><ToggleCell checked={m.termInsurance}   onChange={() => toggleMember(m.id, "termInsurance")} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Document Information</CardTitle><CardDescription>Select which documents each member has. Click a cell to toggle Yes / —</CardDescription></CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[140px]">Member</TableHead>
                    <TableHead className="min-w-[100px]">Relation</TableHead>
                    <TableHead className="text-center min-w-[90px]">Aadhaar</TableHead>
                    <TableHead className="text-center min-w-[70px]">PAN</TableHead>
                    <TableHead className="text-center min-w-[90px]">Voter ID</TableHead>
                    <TableHead className="text-center min-w-[100px]">Land Docs</TableHead>
                    <TableHead className="text-center min-w-[70px]">DL</TableHead>
                    <TableHead className="text-center min-w-[110px]">Konkani Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.relation}</TableCell>
                      <TableCell><ToggleCell checked={m.aadhaar}        onChange={() => toggleMember(m.id, "aadhaar")} /></TableCell>
                      <TableCell><ToggleCell checked={m.pan}            onChange={() => toggleMember(m.id, "pan")} /></TableCell>
                      <TableCell><ToggleCell checked={m.voterId}        onChange={() => toggleMember(m.id, "voterId")} /></TableCell>
                      <TableCell><ToggleCell checked={m.landDocuments}  onChange={() => toggleMember(m.id, "landDocuments")} /></TableCell>
                      <TableCell><ToggleCell checked={m.drivingLicense} onChange={() => toggleMember(m.id, "drivingLicense")} /></TableCell>
                      <TableCell><ToggleCell checked={m.konkaniCard}    onChange={() => toggleMember(m.id, "konkaniCard")} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/education-profession")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Economic Details?</AlertDialogTitle>
            <AlertDialogDescription>This will clear only your economic details. All other steps remain intact.</AlertDialogDescription>
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
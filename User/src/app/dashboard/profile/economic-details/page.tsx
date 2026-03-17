"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAutoSave } from "@/lib/useAutoSave";
import { INCOME_SLAB_MAP, INCOME_SLAB_REVERSE, COVERAGE_MAP } from "@/lib/constants";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

const incomeSlabs       = ["Less than ₹1 Lakh","₹1 – 2 Lakh","₹2 – 3 Lakh","₹3 – 5 Lakh","₹5 – 10 Lakh","₹10 – 25 Lakh","₹25 Lakh+"];
const familyFacilities  = ["Stay in Rented House","Own a House","Own Agricultural Land","Own a Two Wheeler","Own a Car"];
const insuranceTypes    = ["Have Health Insurance","Have Life Insurance","Have Term Insurance"];
const documentTypes     = ["Have Ration Card","Have AADHAR","Have PAN","Have All Records in Place"];
const coverageOptions   = ["Self","Wife","Kids","Parents","All"];
const investmentOptions = ["Fixed Deposits","Mutual Funds / SIP","Trading in Shares / Demat Account","Investment - Others"];

interface MemberCoverage { id: string; name: string; relation: string; insurance: Record<string, string[]>; documents: Record<string, string[]>; }

function blankMember(id: string): MemberCoverage {
  const ins: Record<string,string[]> = {}; insuranceTypes.forEach(t => { ins[t] = []; });
  const doc: Record<string,string[]> = {}; documentTypes.forEach(d => { doc[d] = []; });
  return { id, name: "", relation: "", insurance: ins, documents: doc };
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selfIncome, setSelfIncome]       = useState("");
  const [familyIncome, setFamilyIncome]   = useState("");
  const [selectedFacilities, setSelectedFacilities]   = useState<string[]>([]);
  const [selectedInvestments, setSelectedInvestments] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberCoverage[]>([blankMember("1")]);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    api.get("/users/profile/full").then((data) => {
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
        if (eco.inv_fixed_deposits)    inv.push("Fixed Deposits");
        if (eco.inv_mutual_funds_sip)  inv.push("Mutual Funds / SIP");
        if (eco.inv_shares_demat)      inv.push("Trading in Shares / Demat Account");
        if (eco.inv_others)            inv.push("Investment - Others");
        setSelectedInvestments(inv);
      }
    }).catch(() => {});
  }, []);

  const buildPayload = () => ({
    economic: {
      self_income:           INCOME_SLAB_MAP[selfIncome] || null,
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
      member_name:     m.name || null,
      member_relation: m.relation || null,
      sort_order:      i,
      health_coverage: m.insurance["Have Health Insurance"].map(c => COVERAGE_MAP[c]).filter(Boolean),
      life_coverage:   m.insurance["Have Life Insurance"].map(c => COVERAGE_MAP[c]).filter(Boolean),
      term_coverage:   m.insurance["Have Term Insurance"].map(c => COVERAGE_MAP[c]).filter(Boolean),
    })),
    documents: members.map((m, i) => ({
      member_name:          m.name || null,
      member_relation:      m.relation || null,
      sort_order:           i,
      ration_card_coverage: m.documents["Have Ration Card"].map(c => COVERAGE_MAP[c]).filter(Boolean),
      aadhaar_coverage:     m.documents["Have AADHAR"].map(c => COVERAGE_MAP[c]).filter(Boolean),
      pan_coverage:         m.documents["Have PAN"].map(c => COVERAGE_MAP[c]).filter(Boolean),
      all_records_coverage: m.documents["Have All Records in Place"].map(c => COVERAGE_MAP[c]).filter(Boolean),
    })),
  });

  useAutoSave("/users/profile/step6", buildPayload, [selfIncome, familyIncome, selectedFacilities, selectedInvestments, members]);

  const toggleFacility   = (f: string) => setSelectedFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleInvestment = (i: string) => setSelectedInvestments(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const addMember    = () => setMembers(prev => [...prev, blankMember(Date.now().toString())]);
  const removeMember = (id: string) => { if (members.length === 1) return; setMembers(prev => prev.filter(m => m.id !== id)); };
  const updateMember = (id: string, field: "name"|"relation", value: string) => setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  const toggleCoverage = (memberId: string, section: "insurance"|"documents", key: string, option: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const cur = m[section][key];
      return { ...m, [section]: { ...m[section], [key]: cur.includes(option) ? cur.filter(x => x !== option) : [...cur, option] } };
    }));
  };

  const validate = () => {
    const e: Record<string,string> = {};
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

  const renderCoverageGrid = (member: MemberCoverage, section: "insurance"|"documents", types: string[]) => (
    <div className="space-y-3">
      {types.map(type => (
        <div key={type} className="space-y-2">
          <p className="text-sm font-medium text-foreground">{type}</p>
          <div className="flex flex-wrap gap-2">
            {coverageOptions.map(opt => {
              const checked = member[section][type]?.includes(opt);
              return (
                <button key={opt} type="button" onClick={() => toggleCoverage(member.id, section, type, opt)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${checked ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4"><ArrowLeft className="h-4 w-4" /> Back to Profile</Button>
        <h1 className="text-3xl font-semibold text-foreground">Economic Details</h1>
        <p className="text-muted-foreground mt-1">Step 6 of 7 — Financial and asset information</p>
      </div>

      <Stepper steps={steps} currentStep={5} />

      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader><CardTitle>Annual Income</CardTitle><CardDescription>Select the applicable income range</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Self Income <span className="text-destructive">*</span></Label>
            <Select value={selfIncome} onValueChange={v => { setSelfIncome(v); setErrors(e => ({...e, selfIncome: ""})) }}>
              <SelectTrigger className={errors.selfIncome ? "border-destructive" : ""}><SelectValue placeholder="Select income range" /></SelectTrigger>
              <SelectContent>{incomeSlabs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.selfIncome && <p className="text-xs text-destructive">{errors.selfIncome}</p>}
          </div>
          <div className="space-y-2">
            <Label>Family Income <span className="text-destructive">*</span></Label>
            <Select value={familyIncome} onValueChange={v => { setFamilyIncome(v); setErrors(e => ({...e, familyIncome: ""})) }}>
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
              <div key={f} onClick={() => toggleFacility(f)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedFacilities.includes(f) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Checkbox checked={selectedFacilities.includes(f)} onCheckedChange={() => toggleFacility(f)} />
                <Label className="font-normal cursor-pointer text-sm">{f}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Insurance & Documents — Per Member</CardTitle>
          <CardDescription>Add each family member and select their coverage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Accordion type="multiple" defaultValue={[members[0]?.id]} className="space-y-3">
            {members.map((member, index) => (
              <AccordionItem key={member.id} value={member.id} className="border border-border rounded-xl overflow-hidden bg-white">
                <div className="flex items-center pr-2">
                  <AccordionTrigger className="flex-1 px-5 py-4 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:bg-muted/10">
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-foreground">{member.name || `Member ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{member.relation || "Relation not set"}</p>
                      </div>
                      <Badge variant="outline" className="mr-2 bg-orange-50 text-orange-600 border-orange-200">Coverage</Badge>
                    </div>
                  </AccordionTrigger>
                  {members.length > 1 && (
                    <button aria-label="Remove member" type="button" onClick={() => removeMember(member.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 ml-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <AccordionContent className="px-5 pb-6 pt-4 border-t border-border space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Member Name</Label><Input placeholder="Full name" value={member.name} onChange={e => updateMember(member.id, "name", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Relation to You</Label><Input placeholder="E.g. Son, Wife" value={member.relation} onChange={e => updateMember(member.id, "relation", e.target.value)} /></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1.5">Insurance Coverage</p>
                    {renderCoverageGrid(member, "insurance", insuranceTypes)}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1.5">Document Status</p>
                    {renderCoverageGrid(member, "documents", documentTypes)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button type="button" variant="outline" onClick={addMember} className="w-full gap-2 border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5 py-5 mt-2">
            <Plus className="h-4 w-4" /> Add Another Member
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Investments</CardTitle><CardDescription>Select all investment types that apply</CardDescription></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {investmentOptions.map(inv => (
              <div key={inv} onClick={() => toggleInvestment(inv)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedInvestments.includes(inv) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Checkbox checked={selectedInvestments.includes(inv)} onCheckedChange={() => toggleInvestment(inv)} />
                <Label className="font-normal cursor-pointer text-sm">{inv}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/education-profession")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Previous Step</Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
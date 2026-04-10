"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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

const incomeSlabs = [
  "Less than ₹1 Lakh", "₹1 – 2 Lakh", "₹2 – 3 Lakh", "₹3 – 5 Lakh",
  "₹5 – 10 Lakh", "₹10 – 25 Lakh", "₹25 Lakh+",
];
const familyFacilities  = ["Staying in Rented House", "Own a House", "Own Agricultural Land", "Own a Two Wheeler", "Own a Car"];
const investmentOptions = ["Fixed Deposits", "Mutual Funds / SIP", "Trading in Shares / Demat Account", "Investment - Others"];

interface MemberCoverage {
  id: string; name: string; relation: string;
  healthInsurance: boolean | null;
  lifeInsurance: boolean | null;
  termInsurance: boolean | null;
  konkaniCard: boolean | null;
  aadhaar: boolean | null;
  pan: boolean | null;
  voterId: boolean | null;
  landDocuments: boolean | null;
  drivingLicense: boolean | null;
}

function blankMember(id: string, name = "", relation = ""): MemberCoverage {
  return {
    id, name, relation,
    healthInsurance: null,
    lifeInsurance: null,
    termInsurance: null,
    konkaniCard: null,
    aadhaar: null,
    pan: null,
    voterId: null,
    landDocuments: null,
    drivingLicense: null,
  };
}

function buildExpectedMembers(
  data: Record<string, unknown>
): { id: string; name: string; relation: string }[] {
  const s1 = data.step1 as Record<string, string> | null;
  const userName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "You";
  const familyMembers = (
    ((data.step3 as Record<string, unknown>)?.members as Record<string, string>[]) || []
  ).filter((fm) => fm.relation !== "Self");

  return [
    { id: "self", name: userName, relation: "Self" },
    ...familyMembers.map((fm, i) => ({
      id: `fm_${i}`,
      name: fm.name || `Member ${i + 1}`,
      relation: fm.relation || "",
    })),
  ];
}

function hasCov(obj: Record<string, unknown>, key: string): boolean | null {
  if (!(key in obj)) return null;
  const arr = obj[key];
  if (!Array.isArray(arr)) return null;
  return arr.length > 0;
}

/**
 * SelectCell — 3-state dropdown: Not Selected / Yes / No
 * Replaces the old ToggleCell (Yes/No pill buttons).
 */
function SelectCell({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (val: boolean | null) => void;
}) {
  const displayValue =
    value === null ? "not_selected" : value ? "yes" : "no";

  return (
    <Select
      value={displayValue}
      onValueChange={(v) => {
        if (v === "yes") onChange(true);
        else if (v === "no") onChange(false);
        else onChange(null);
      }}
    >
      <SelectTrigger
        className={`w-[100px] mx-auto text-xs h-8 px-2 ${
          value === true
            ? "border-green-400 bg-green-50 text-green-700 focus:ring-green-300"
            : value === false
            ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-300"
            : "border-border bg-background text-muted-foreground"
        }`}
      >
        <SelectValue placeholder="Not Selected" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="not_selected">
          <span className="text-muted-foreground">Not Selected</span>
        </SelectItem>
        <SelectItem value="yes">
          <span className="text-green-700 font-medium">Yes</span>
        </SelectItem>
        <SelectItem value="no">
          <span className="text-red-700 font-medium">No</span>
        </SelectItem>
      </SelectContent>
    </Select>
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
  const [allBases, setAllBases]                       = useState<{ id: string; name: string; relation: string }[]>([]);
  const [errors, setErrors]                           = useState<Record<string, string>>({});
  const [showResetDialog, setShowResetDialog]         = useState(false);
  const [resetting, setResetting]                     = useState(false);
  const [canReset, setCanReset]                       = useState(false);

  const dataLoaded     = useRef(false);
  const userInteracted = useRef(false);

  useEffect(() => {
    api.get("/users/profile").then((meta: unknown) => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data: unknown) => {
      const fullData = data as Record<string, unknown>;

      const bases = buildExpectedMembers(fullData);
      setAllBases(bases);

      const eco = (fullData.step6 as Record<string, unknown> | null)?.economic as Record<string, unknown> | undefined;
      if (eco) {
        if (eco.self_income)   setSelfIncome(INCOME_SLAB_REVERSE[eco.self_income as string] || "");
        if (eco.family_income) setFamilyIncome(INCOME_SLAB_REVERSE[eco.family_income as string] || "");
        const fac: string[] = [];
        if (eco.fac_rented_house)      fac.push("Staying in Rented House");
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

      const insurance = ((fullData.step6 as Record<string, unknown> | null)?.insurance || []) as Record<string, unknown>[];
      const documents  = ((fullData.step6 as Record<string, unknown> | null)?.documents  || []) as Record<string, unknown>[];

      setMembers(bases.map((base) => {
        let ins: Record<string, unknown> = {};
        let doc: Record<string, unknown> = {};

        if (base.relation === "Self") {
          ins = (insurance.find(i => (i.member_relation as string) === "Self") ?? {}) as Record<string, unknown>;
          doc = (documents.find(d => (d.member_relation as string) === "Self") ?? {}) as Record<string, unknown>;
        } else {
          ins = (insurance.find(i =>
            (i.member_name     as string) === base.name &&
            (i.member_relation as string) === base.relation
          ) ?? {}) as Record<string, unknown>;

          if (!Object.keys(ins).length && base.relation) {
            ins = (insurance.find(i =>
              (i.member_relation as string) === base.relation &&
              (i.member_relation as string) !== "Self"
            ) ?? {}) as Record<string, unknown>;
          }

          doc = (documents.find(d =>
            (d.member_name     as string) === base.name &&
            (d.member_relation as string) === base.relation
          ) ?? {}) as Record<string, unknown>;

          if (!Object.keys(doc).length && base.relation) {
            doc = (documents.find(d =>
              (d.member_relation as string) === base.relation &&
              (d.member_relation as string) !== "Self"
            ) ?? {}) as Record<string, unknown>;
          }
        }

        return {
          ...blankMember(base.id, base.name, base.relation),
          healthInsurance: hasCov(ins, "health_coverage"),
          lifeInsurance:   hasCov(ins, "life_coverage"),
          termInsurance:   hasCov(ins, "term_coverage"),
          konkaniCard:     hasCov(ins, "konkani_card_coverage"),
          aadhaar:         hasCov(doc, "aadhaar_coverage"),
          pan:             hasCov(doc, "pan_coverage"),
          voterId:         hasCov(doc, "voter_id_coverage"),
          landDocuments:   hasCov(doc, "land_doc_coverage"),
          drivingLicense:  hasCov(doc, "dl_coverage"),
        };
      }));

      dataLoaded.current = true;
    }).catch(() => {
      dataLoaded.current = true;
    });
  }, []);

  const toggleFacility = (f: string) => {
    userInteracted.current = true;
    setSelectedFacilities(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  };

  const toggleInvestment = (i: string) => {
    userInteracted.current = true;
    setSelectedInvestments(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  };

  const setMemberField = (id: string, field: keyof MemberCoverage, val: boolean | null) => {
    userInteracted.current = true;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const covToPayload = (val: boolean | null): string[] | null => {
    if (val === null) return null;
    return val ? ["self"] : [];
  };

  const buildPayload = () => ({
    economic: {
      self_income:           INCOME_SLAB_MAP[selfIncome]   || null,
      family_income:         INCOME_SLAB_MAP[familyIncome] || null,
      fac_rented_house:      selectedFacilities.includes("Staying in Rented House"),
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
      member_name:           m.name     || null,
      member_relation:       m.relation || null,
      sort_order:            i,
      health_coverage:       covToPayload(m.healthInsurance),
      life_coverage:         covToPayload(m.lifeInsurance),
      term_coverage:         covToPayload(m.termInsurance),
      konkani_card_coverage: covToPayload(m.konkaniCard),
    })),
    documents: members.map((m, i) => ({
      member_name:       m.name     || null,
      member_relation:   m.relation || null,
      sort_order:        i,
      aadhaar_coverage:  covToPayload(m.aadhaar),
      pan_coverage:      covToPayload(m.pan),
      voter_id_coverage: covToPayload(m.voterId),
      land_doc_coverage: covToPayload(m.landDocuments),
      dl_coverage:       covToPayload(m.drivingLicense),
    })),
  });

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dataLoaded.current || !userInteracted.current) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      try {
        await api.post("/users/profile/step6", buildPayload());
        toast.success("Auto-saved", { duration: 1500, id: "autosave" });
      } catch {
        // silent fail
      }
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfIncome, familyIncome, selectedFacilities, selectedInvestments, members]);

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
      setSelfIncome(""); setFamilyIncome("");
      setSelectedFacilities([]); setSelectedInvestments([]);
      setMembers(allBases.map(b => blankMember(b.id, b.name, b.relation)));
      userInteracted.current = false;
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
          <Button
            variant="outline" size="sm"
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={5} />

      {/* Annual Income */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Annual Income</CardTitle>
          <CardDescription>Select the applicable income range</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Self Income <span className="text-destructive">*</span></Label>
            <Select value={selfIncome} onValueChange={v => {
              userInteracted.current = true;
              setSelfIncome(v);
              setErrors(e => ({ ...e, selfIncome: "" }));
            }}>
              <SelectTrigger className={errors.selfIncome ? "border-destructive" : ""}>
                <SelectValue placeholder="Select income range" />
              </SelectTrigger>
              <SelectContent>
                {incomeSlabs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.selfIncome && <p className="text-xs text-destructive">{errors.selfIncome}</p>}
          </div>
          <div className="space-y-2">
            <Label>Family Income <span className="text-destructive">*</span></Label>
            <Select value={familyIncome} onValueChange={v => {
              userInteracted.current = true;
              setFamilyIncome(v);
              setErrors(e => ({ ...e, familyIncome: "" }));
            }}>
              <SelectTrigger className={errors.familyIncome ? "border-destructive" : ""}>
                <SelectValue placeholder="Select income range" />
              </SelectTrigger>
              <SelectContent>
                {incomeSlabs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.familyIncome && <p className="text-xs text-destructive">{errors.familyIncome}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Family Facilities */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Family Facilities</CardTitle>
          <CardDescription>Select all that apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {familyFacilities.map(f => (
              <div
                key={f}
                onClick={() => toggleFacility(f)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedFacilities.includes(f)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Checkbox
                  checked={selectedFacilities.includes(f)}
                  onCheckedChange={() => toggleFacility(f)}
                />
                <Label className="font-normal cursor-pointer text-sm">{f}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Investments */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Investments</CardTitle>
          <CardDescription>Select all investment types that apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {investmentOptions.map(inv => (
              <div
                key={inv}
                onClick={() => toggleInvestment(inv)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedInvestments.includes(inv)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Checkbox
                  checked={selectedInvestments.includes(inv)}
                  onCheckedChange={() => toggleInvestment(inv)}
                />
                <Label className="font-normal cursor-pointer text-sm">{inv}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insurance Coverage */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Insurance Coverage</CardTitle>
          <CardDescription>
            Members are auto-loaded from Family Information. Select Yes / No / Not Selected for each member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[90px] text-center">Member</TableHead>
                    <TableHead className="min-w-[100px] text-center">Relation</TableHead>
                    <TableHead className="text-center min-w-[110px]">Health Insurance</TableHead>
                    <TableHead className="text-center min-w-[110px]">Life Insurance</TableHead>
                    <TableHead className="text-center min-w-[110px]">Term Insurance</TableHead>
                    <TableHead className="text-center min-w-[110px]">Konkani Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-center">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm text-center">{m.relation}</TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.healthInsurance} onChange={val => setMemberField(m.id, "healthInsurance", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.lifeInsurance} onChange={val => setMemberField(m.id, "lifeInsurance", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.termInsurance} onChange={val => setMemberField(m.id, "termInsurance", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.konkaniCard} onChange={val => setMemberField(m.id, "konkaniCard", val)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Information */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
          <CardDescription>
            Select which documents each member has. Choose Yes / No / Not Selected for each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[90px] text-center">Member</TableHead>
                    <TableHead className="min-w-[100px] text-center">Relation</TableHead>
                    <TableHead className="text-center min-w-[110px]">Aadhaar</TableHead>
                    <TableHead className="text-center min-w-[90px]">PAN</TableHead>
                    <TableHead className="text-center min-w-[110px]">Voter ID</TableHead>
                    <TableHead className="text-center min-w-[110px]">Land Docs</TableHead>
                    <TableHead className="text-center min-w-[90px]">DL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-center">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm text-center">{m.relation}</TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.aadhaar} onChange={val => setMemberField(m.id, "aadhaar", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.pan} onChange={val => setMemberField(m.id, "pan", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.voterId} onChange={val => setMemberField(m.id, "voterId", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.landDocuments} onChange={val => setMemberField(m.id, "landDocuments", val)} />
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <SelectCell value={m.drivingLicense} onChange={val => setMemberField(m.id, "drivingLicense", val)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/profile/education-profession")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Economic Details?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear only your economic details. All other steps remain intact.
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
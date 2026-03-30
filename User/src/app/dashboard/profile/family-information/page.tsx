"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Plus, Trash2, RotateCcw } from "lucide-react";
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

const nuclearRelations = ["Spouse","Son","Daughter"];
const allRelations     = ["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Uncle","Aunt","Other"];

interface FamilyMember {
  id: string;
  relation: string;
  name: string;
  dob: string;
  gender: string;
  status: string;
  disability: string;
}

const blankRow = (): FamilyMember => ({ id: Date.now().toString(), relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" });

const calcAge = (dob: string) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [familyType, setFamilyType] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: "1", relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string,string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const s3 = data.step3;
      if (s3?.family_info?.family_type) setFamilyType(s3.family_info.family_type);
      if (s3?.members?.length > 0) {
        setFamilyMembers(s3.members.map((m: Record<string, string>, i: number) => ({
          id:         String(i + 1),
          relation:   m.relation   || "",
          name:       m.name       || "",
          dob:        m.dob        || "",
          gender:     m.gender     || "",
          status:     m.status     || "active",
          disability: m.disability || "no",
        })));
      }
    }).catch(() => {});
  }, []);

  const relations = familyType === "nuclear" ? nuclearRelations : allRelations;
  const addMember = () => setFamilyMembers(prev => [...prev, blankRow()]);
  const removeMember = (id: string) => { if (familyMembers.length > 1) setFamilyMembers(prev => prev.filter(m => m.id !== id)); };
  const update = (id: string, field: keyof FamilyMember, value: string) =>
    setFamilyMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const buildPayload = () => ({
    family_type: familyType,
    members: familyMembers.map(m => ({
      relation: m.relation, name: m.name,
      age: calcAge(m.dob), dob: m.dob || null,
      gender: m.gender || null, status: m.status, disability: m.disability,
    })),
  });

  useAutoSave("/users/profile/step3", buildPayload, [familyType, familyMembers]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!familyType) e.familyType = "Please select family type";
    familyMembers.forEach((m, i) => {
      if (!m.relation)    e[`relation_${i}`] = "Required";
      if (!m.name.trim()) e[`name_${i}`]     = "Required";
      if (!m.gender)      e[`gender_${i}`]   = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/users/profile/step3", buildPayload());
      toast.success("Family information saved!");
      router.push("/dashboard/profile/location-information");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset/step3", {});
      toast.success("Family information cleared.");
      setFamilyType("");
      setFamilyMembers([{ id: "1", relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Family Information</h1>
          <p className="text-muted-foreground mt-1">Step 3 of 7: Add details about your family members</p>
        </div>
        {canReset && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={2} />

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Family Type</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Type of Family <span className="text-destructive">*</span></Label>
            <RadioGroup value={familyType}
              onValueChange={v => { setFamilyType(v); setErrors(e => ({...e, familyType: ""})); setFamilyMembers([{ id: "1", relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" }]); }}
              className="flex gap-6">
              <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${familyType === "nuclear" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                onClick={() => { setFamilyType("nuclear"); setFamilyMembers([{ id: "1", relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" }]); }}>
                <RadioGroupItem value="nuclear" id="nuclear" />
                <Label htmlFor="nuclear" className="font-normal cursor-pointer">Nuclear Family <span className="text-xs text-muted-foreground ml-1">(Spouse &amp; Children)</span></Label>
              </div>
              <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${familyType === "joint" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                onClick={() => { setFamilyType("joint"); setFamilyMembers([{ id: "1", relation: "", name: "", dob: "", gender: "", status: "active", disability: "no" }]); }}>
                <RadioGroupItem value="joint" id="joint" />
                <Label htmlFor="joint" className="font-normal cursor-pointer">Joint Family <span className="text-xs text-muted-foreground ml-1">(All members)</span></Label>
              </div>
            </RadioGroup>
            {errors.familyType && <p className="text-xs text-destructive">{errors.familyType}</p>}
          </div>
        </CardContent>
      </Card>

      {familyType && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Family Members</CardTitle>
              <Button onClick={addMember} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Member</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[160px]">Relation</TableHead>
                      <TableHead className="w-[180px]">Name</TableHead>
                      <TableHead className="w-[140px]">Date of Birth</TableHead>
                      <TableHead className="w-[120px]">Gender</TableHead>
                      <TableHead className="w-[130px]">Status</TableHead>
                      <TableHead className="w-[110px]">Disability</TableHead>
                      <TableHead className="w-[60px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((member, index) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Select value={member.relation} onValueChange={v => update(member.id, "relation", v)}>
                            <SelectTrigger className={errors[`relation_${index}`] ? "border-destructive h-9" : "h-9"}><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{relations.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input placeholder="Full name" value={member.name}
                            onChange={e => update(member.id, "name", e.target.value)}
                            className={errors[`name_${index}`] ? "border-destructive h-9" : "h-9"} />
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={member.dob} onChange={e => update(member.id, "dob", e.target.value)} className="h-9" />
                        </TableCell>
                        <TableCell>
                          <Select value={member.gender} onValueChange={v => update(member.id, "gender", v)}>
                            <SelectTrigger className={errors[`gender_${index}`] ? "border-destructive h-9" : "h-9"}><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={member.status} onValueChange={v => update(member.id, "status", v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="passed_away">Passed Away</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={member.disability} onValueChange={v => update(member.id, "disability", v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button aria-label="Remove member" variant="ghost" size="sm"
                            onClick={() => removeMember(member.id)}
                            disabled={familyMembers.length === 1}
                            className="h-9 w-9 p-0">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Click &quot;Add Member&quot; to include more family members.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/religious-details")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Family Information?</AlertDialogTitle>
            <AlertDialogDescription>This will clear only your family information. All other steps remain intact.</AlertDialogDescription>
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
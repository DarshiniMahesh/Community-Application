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
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
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

const relations = ["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Uncle","Aunt","Other"];

interface FamilyMember { id: string; relation: string; name: string; age: string; gender: string; status: string; }

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [familyType, setFamilyType] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: "1", relation: "", name: "", age: "", gender: "", status: "active" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/users/profile/full").then((data) => {
      const s3 = data.step3;
      if (s3?.family_info?.family_type) setFamilyType(s3.family_info.family_type);
      if (s3?.members?.length > 0) {
        setFamilyMembers(s3.members.map((m: Record<string, string>, i: number) => ({
          id: String(i + 1),
          relation: m.relation || "",
          name:     m.name || "",
          age:      m.age ? String(m.age) : "",
          gender:   m.gender || "",
          status:   m.status || "active",
        })));
      }
    }).catch(() => {});
  }, []);

  const addMember = () => setFamilyMembers(prev => [...prev, { id: Date.now().toString(), relation: "", name: "", age: "", gender: "", status: "active" }]);
  const removeMember = (id: string) => { if (familyMembers.length > 1) setFamilyMembers(prev => prev.filter(m => m.id !== id)); };
  const updateMember = (id: string, field: keyof FamilyMember, value: string) =>
    setFamilyMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const buildPayload = () => ({
    family_type: familyType,
    members: familyMembers.map(m => ({
      relation: m.relation,
      name:     m.name,
      age:      m.age ? Number(m.age) : null,
      gender:   m.gender || null,
      status:   m.status === "passed" ? "passed_away" : m.status,
    })),
  });

  useAutoSave("/users/profile/step3", buildPayload, [familyType, familyMembers]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!familyType) e.familyType = "Please select family type";
    familyMembers.forEach((m, i) => {
      if (!m.relation)    e[`relation_${i}`] = "Required";
      if (!m.name.trim()) e[`name_${i}`]     = "Required";
      if (!m.age)         e[`age_${i}`]      = "Required";
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Button>
        <h1 className="text-3xl font-semibold text-foreground">Family Information</h1>
        <p className="text-muted-foreground mt-1">Step 3 of 7: Add details about your family members</p>
      </div>

      <Stepper steps={steps} currentStep={2} />

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Family Type</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Type of Family <span className="text-destructive">*</span></Label>
            <RadioGroup value={familyType} onValueChange={v => { setFamilyType(v); setErrors(e => ({...e, familyType: ""})) }} className="flex gap-6">
              <div className="flex items-center space-x-2"><RadioGroupItem value="nuclear" id="nuclear" /><Label htmlFor="nuclear" className="font-normal cursor-pointer">Nuclear Family</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="joint" id="joint" /><Label htmlFor="joint" className="font-normal cursor-pointer">Joint Family</Label></div>
            </RadioGroup>
            {errors.familyType && <p className="text-xs text-destructive">{errors.familyType}</p>}
          </div>
        </CardContent>
      </Card>

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
                  <TableRow>
                    <TableHead className="w-[180px]">Relation</TableHead>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[100px]">Age</TableHead>
                    <TableHead className="w-[120px]">Gender</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {familyMembers.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Select value={member.relation} onValueChange={v => updateMember(member.id, "relation", v)}>
                          <SelectTrigger className={errors[`relation_${index}`] ? "border-destructive h-9" : "h-9"}><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{relations.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input placeholder="Full name" value={member.name} onChange={e => updateMember(member.id, "name", e.target.value)}
                          className={errors[`name_${index}`] ? "border-destructive h-9" : "h-9"} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" placeholder="Age" value={member.age} onChange={e => updateMember(member.id, "age", e.target.value)}
                          className={errors[`age_${index}`] ? "border-destructive h-9" : "h-9"} />
                      </TableCell>
                      <TableCell>
                        <Select value={member.gender} onValueChange={v => updateMember(member.id, "gender", v)}>
                          <SelectTrigger className={errors[`gender_${index}`] ? "border-destructive h-9" : "h-9"}><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={member.status} onValueChange={v => updateMember(member.id, "status", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="passed_away">Passed Away</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button aria-label="Remove member" variant="ghost" size="sm" onClick={() => removeMember(member.id)} disabled={familyMembers.length === 1} className="h-9 w-9 p-0">
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

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/religious-details")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
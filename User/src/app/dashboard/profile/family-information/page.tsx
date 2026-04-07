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

const allRelations = ["Father","Mother","Husband", "Spouse","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Uncle","Aunt","Other"];

interface FamilyMember {
  id: string;
  relation: string;
  name: string;
  dob: string;
  gender: string;
  status: string;
  disability: string;
  isSelf?: boolean;
}

const blankRow = (): FamilyMember => ({
  id: Date.now().toString(),
  relation: "",
  name: "",
  dob: "",
  gender: "",
  status: "active",
  disability: "no",
});

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
  const [selfMember, setSelfMember] = useState<FamilyMember>({
    id: "self",
    relation: "Self",
    name: "",
    dob: "",
    gender: "",
    status: "active",
    disability: "no",
    isSelf: true,
  });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([blankRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    api.get("/users/profile").then((meta) => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      // Pre-fill self from personal details (step1)
      const s1 = data.step1;
      if (s1) {
        setSelfMember((prev) => ({
          ...prev,
          name: [s1.first_name, s1.last_name].filter(Boolean).join(" ") || prev.name,
          dob: s1.date_of_birth || s1.dob || prev.dob,
          gender: s1.gender || prev.gender,
          disability: s1.disability || prev.disability,
        }));
      }

      const s3 = data.step3;
      if (s3?.family_info?.family_type) setFamilyType(s3.family_info.family_type);
      if (s3?.members?.length > 0) {
        const members = s3.members as Record<string, string>[];
        // Separate self from other members
        const selfFromSaved = members.find((m) => m.relation === "Self");
        const othersFromSaved = members.filter((m) => m.relation !== "Self");

        if (selfFromSaved) {
          setSelfMember((prev) => ({
            ...prev,
            name: selfFromSaved.name || prev.name,
            dob: selfFromSaved.dob || prev.dob,
            gender: selfFromSaved.gender || prev.gender,
            status: selfFromSaved.status || prev.status,
            disability: selfFromSaved.disability || prev.disability,
          }));
        }

        if (othersFromSaved.length > 0) {
          setFamilyMembers(
            othersFromSaved.map((m, i) => ({
              id: String(i + 1),
              relation: m.relation || "",
              name: m.name || "",
              dob: m.dob || "",
              gender: m.gender || "",
              status: m.status || "active",
              disability: m.disability || "no",
            }))
          );
        }
      }
    }).catch(() => {});
  }, []);

  const addMember = () => setFamilyMembers((prev) => [...prev, blankRow()]);
  const removeMember = (id: string) => {
    if (familyMembers.length > 1) setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };
  const update = (id: string, field: keyof FamilyMember, value: string) =>
    setFamilyMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const updateSelf = (field: keyof FamilyMember, value: string) =>
    setSelfMember((prev) => ({ ...prev, [field]: value }));

  const buildPayload = () => ({
    family_type: familyType,
    members: [
      {
        relation: "Self",
        name: selfMember.name,
        age: calcAge(selfMember.dob),
        dob: selfMember.dob || null,
        gender: selfMember.gender || null,
        status: selfMember.status,
        disability: selfMember.disability,
      },
      ...familyMembers.map((m) => ({
        relation: m.relation,
        name: m.name,
        age: calcAge(m.dob),
        dob: m.dob || null,
        gender: m.gender || null,
        status: m.status,
        disability: m.disability,
      })),
    ],
  });

  useAutoSave("/users/profile/step3", buildPayload, [familyType, familyMembers, selfMember]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!familyType) e.familyType = "Please select family type";
    // Validate self
    if (!selfMember.gender) e["gender_self"] = "Required";
    // Validate other members
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
      setFamilyMembers([blankRow()]);
      setSelfMember((prev) => ({ ...prev, status: "active", disability: "no" }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  const renderRow = (
    member: FamilyMember,
    index: number | "self",
    isSelf = false
  ) => {
    const idxKey = index === "self" ? "self" : index;
    return (
      <TableRow key={member.id} className={isSelf ? "bg-muted/30" : ""}>
        {/* Relation */}
        <TableCell>
          {isSelf ? (
            <span className="text-sm font-medium text-muted-foreground px-2">Self</span>
          ) : (
            <Select
              value={member.relation}
              onValueChange={(v) => update(member.id, "relation", v)}
            >
              <SelectTrigger className={errors[`relation_${idxKey}`] ? "border-destructive h-9" : "h-9"}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {allRelations.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>

        {/* Name */}
        <TableCell>
          <Input
            placeholder="Full name"
            value={member.name}
            onChange={(e) =>
              isSelf ? updateSelf("name", e.target.value) : update(member.id, "name", e.target.value)
            }
            className={errors[`name_${idxKey}`] ? "border-destructive h-9" : "h-9"}
            readOnly={isSelf}
          />
        </TableCell>

        {/* Date of Birth */}
        <TableCell>
          <Input
            type="date"
            value={member.dob}
            onChange={(e) =>
              isSelf ? updateSelf("dob", e.target.value) : update(member.id, "dob", e.target.value)
            }
            className="h-9"
            readOnly={isSelf}
          />
        </TableCell>

        {/* Gender */}
        <TableCell>
          <Select
            value={member.gender}
            onValueChange={(v) =>
              isSelf ? updateSelf("gender", v) : update(member.id, "gender", v)
            }
            disabled={isSelf}
          >
            <SelectTrigger className={errors[`gender_${idxKey}`] ? "border-destructive h-9" : "h-9"}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Status */}
        <TableCell>
          <Select
            value={member.status}
            onValueChange={(v) =>
              isSelf ? updateSelf("status", v) : update(member.id, "status", v)
            }
            disabled={isSelf}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="passed_away">Passed Away</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Disability */}
        <TableCell>
          <Select
            value={member.disability}
            onValueChange={(v) =>
              isSelf ? updateSelf("disability", v) : update(member.id, "disability", v)
            }
            disabled={isSelf}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Action */}
        <TableCell>
          {isSelf ? (
            <span className="text-xs text-muted-foreground px-2">—</span>
          ) : (
            <Button
              aria-label="Remove member"
              variant="ghost"
              size="sm"
              onClick={() => removeMember(member.id)}
              disabled={familyMembers.length === 1}
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={2} />

      {/* Family Type Card */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Family Type</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Type of Family <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={familyType}
              onValueChange={(v) => {
                setFamilyType(v);
                setErrors((e) => ({ ...e, familyType: "" }));
              }}
              className="flex gap-6"
            >
              <div
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  familyType === "nuclear" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
                onClick={() => { setFamilyType("nuclear"); setErrors((e) => ({ ...e, familyType: "" })); }}
              >
                <RadioGroupItem value="nuclear" id="nuclear" />
                <Label htmlFor="nuclear" className="font-normal cursor-pointer">
                  Nuclear Family <span className="text-xs text-muted-foreground ml-1">(Spouse &amp; Children)</span>
                </Label>
              </div>
              <div
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  familyType === "joint" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
                onClick={() => { setFamilyType("joint"); setErrors((e) => ({ ...e, familyType: "" })); }}
              >
                <RadioGroupItem value="joint" id="joint" />
                <Label htmlFor="joint" className="font-normal cursor-pointer">
                  Joint Family <span className="text-xs text-muted-foreground ml-1">(All members)</span>
                </Label>
              </div>
            </RadioGroup>
            {errors.familyType && <p className="text-xs text-destructive">{errors.familyType}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Family Members Table — shown only after type is selected */}
      {familyType && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Family Members</CardTitle>
              <Button onClick={addMember} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Member
              </Button>
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
                    {/* Self row — always first, locked */}
                    {renderRow(selfMember, "self", true)}
                    {/* Other family members */}
                    {familyMembers.map((member, index) => renderRow(member, index))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Click &quot;Add Member&quot; to include more family members.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/profile/religious-details")}
          className="gap-2"
        >
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
            <AlertDialogDescription>
              This will clear only your family information. All other steps remain intact.
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
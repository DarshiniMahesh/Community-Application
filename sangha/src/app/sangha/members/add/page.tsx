"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MemberForm {
  fullName: string;
  gender: string;
  phone: string;
  email: string;
  dob: string;
  role: string;
  memberType: string;
}

const roles = [
  "President",
  "Secretary",
  "Treasurer",
  "Accountant",
  "Auditor",
  "Legal Advisor",
];

export default function AddMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<MemberForm>({
    fullName: "",
    gender: "",
    phone: "",
    email: "",
    dob: "",
    role: "",
    memberType: ""
  });
  const [errors, setErrors] = useState<Record<keyof MemberForm, string>>({
    fullName: "",
    gender: "",
    phone: "",
    email: "",
    dob: "",
    role: "",
    memberType: ""
  });

  const validate = () => {
    const newErrors: Record<keyof MemberForm, string> = {
      fullName: "",
      gender: "",
      phone: "",
      email: "",
      dob: "",
      role: "",
      memberType: ""
    };
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.dob) newErrors.dob = "DOB is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.memberType) newErrors.memberType = "Member type is required";
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (field: keyof MemberForm) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await api.post("/sangha/team-members", {
        fullName:   formData.fullName,
        gender:     formData.gender,
        phone:      formData.phone,
        email:      formData.email,
        dob:        formData.dob,
        role:       formData.role,
        memberType: formData.memberType,
      });
      toast.success("Member added successfully");
      router.push("/sangha/members");
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Add Sangha Member</h1>
        <p className="text-muted-foreground mt-1">Add a new internal member to the Sangha team.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName")(e.target.value)}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex items-center gap-6 pt-1">
                {["Male", "Female", "Other"].map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      onChange={(e) => handleChange("gender")(e.target.value)}
                      className="h-4 w-4"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleChange("phone")(e.target.value)}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleChange("email")(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">DOB</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange("dob")(e.target.value)}
                className={errors.dob ? "border-destructive" : ""}
              />
              {errors.dob && <p className="text-xs text-destructive">{errors.dob}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange("role")(value)}>
                <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberType">Member Type</Label>
              <Select value={formData.memberType} onValueChange={(value) => handleChange("memberType")(value)}>
                <SelectTrigger className={errors.memberType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select member type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Time">Full Time</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                </SelectContent>
              </Select>
              {errors.memberType && <p className="text-xs text-destructive">{errors.memberType}</p>}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Add Member</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
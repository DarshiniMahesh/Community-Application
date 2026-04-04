"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface MemberForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  phone: string;
  email: string;
  dob: string;
  role: string;
  memberType: string;
}

const roles = [
  "Common Member",
  "Treasurer",
  "Accountant",
  "Secretary",
  "Auditor",
  "Hon. Secretary",
  "President",
  "Hon. President",
  "Advisor",
  "Legal Advisor",
];

export default function AddMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<MemberForm>({
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    phone: "",
    email: "",
    dob: "",
    role: "",
    memberType: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MemberForm, string>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof MemberForm, string>> = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Phone or Email is required";
      newErrors.email = "Phone or Email is required";
    }
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.memberType) newErrors.memberType = "Member type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange =
    (field: keyof MemberForm) =>
    (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await api.post("/sangha/team-members", {
        firstName:  formData.first_name,
        middleName: formData.middle_name,
        lastName:   formData.last_name,
        gender:     formData.gender,
        phone:      formData.phone || null,
        email:      formData.email || null,
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
        <p className="text-muted-foreground mt-1">
          Add a new internal member to the Sangha team.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* First Name | Middle Name | Last Name — 3 columns */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name")(e.target.value)}
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  placeholder="Enter middle name"
                  value={formData.middle_name}
                  onChange={(e) => handleChange("middle_name")(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name")(e.target.value)}
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Gender + Date of Birth — same row, matching image 1 layout */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <Label>
                  Gender <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-6 pt-1">
                  {["Male", "Female", "Other"].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option}
                        checked={formData.gender === option}
                        onChange={(e) => handleChange("gender")(e.target.value)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-xs text-destructive">{errors.gender}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleChange("dob")(e.target.value)}
                  className={errors.dob ? "border-destructive" : ""}
                />
                {errors.dob && (
                  <p className="text-xs text-destructive">{errors.dob}</p>
                )}
              </div>
            </div>

            {/* Phone */}
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
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
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
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleChange("role")(value)}
              >
                <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role}</p>
              )}
            </div>

            {/* Member Type */}
            <div className="space-y-2">
              <Label htmlFor="memberType">
                Member Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.memberType}
                onValueChange={(value) => handleChange("memberType")(value)}
              >
                <SelectTrigger
                  className={errors.memberType ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select member type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Time">Full Time</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                </SelectContent>
              </Select>
              {errors.memberType && (
                <p className="text-xs text-destructive">{errors.memberType}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/sangha/members")}
              >
                Cancel
              </Button>
              <Button type="submit">Add Member</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
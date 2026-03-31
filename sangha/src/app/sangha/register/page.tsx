"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

function getPasswordStrength(pw: string): {
  label: "Weak" | "Medium" | "Strong";
  score: number;
  color: string;
  barColor: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak",   score: 1, color: "text-red-500",    barColor: "bg-red-500" };
  if (score === 2) return { label: "Medium", score: 2, color: "text-yellow-500", barColor: "bg-yellow-500" };
  return              { label: "Strong", score: 3, color: "text-green-500",  barColor: "bg-green-500" };
}

interface FormData {
  sangha_name: string;
  location: string;
  contact_person: string;
  area_covered: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

export default function SanghaRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    sangha_name: "", location: "", contact_person: "",
    area_covered: "", email: "", phone: "",
    password: "", confirm: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const strength = formData.password ? getPasswordStrength(formData.password) : null;

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!formData.sangha_name.trim())    e.sangha_name    = "Sangha name is required";
    if (!formData.location.trim())       e.location       = "Location is required";
    if (!formData.contact_person.trim()) e.contact_person = "Contact person is required";
    if (!formData.email.trim() && !formData.phone.trim())
      e.email = "Email or phone is required";
    if (formData.email && !formData.email.includes("@"))
      e.email = "Enter a valid email";
    if (formData.phone && !/^\d{10}$/.test(formData.phone))
      e.phone = "Enter a valid 10-digit phone";
    if (!formData.password)              e.password = "Password is required";
    else if (formData.password.length < 8) e.password = "Minimum 8 characters";
    if (formData.password !== formData.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/sangha/register", {
        sangha_name:    formData.sangha_name,
        location:       formData.location,
        contact_person: formData.contact_person,
        area_covered:   formData.area_covered || undefined,
        email:          formData.email || undefined,
        phone:          formData.phone || undefined,
        password:       formData.password,
      });
      toast.success("Registered! Awaiting admin approval.");
      router.push("/sangha/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg shadow-xl border-border">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <span className="text-2xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-2xl">Sangha Registration</CardTitle>
          <CardDescription>Register your Sangha to manage community applications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Sangha Name */}
            <div className="space-y-1">
              <Label>Sangha Name</Label>
              <Input placeholder="Enter Sangha name" value={formData.sangha_name} onChange={set("sangha_name")} className={errors.sangha_name ? "border-destructive" : ""} />
              {errors.sangha_name && <p className="text-xs text-destructive">{errors.sangha_name}</p>}
            </div>

            {/* Location */}
            <div className="space-y-1">
              <Label>Location</Label>
              <Input placeholder="City / Town" value={formData.location} onChange={set("location")} className={errors.location ? "border-destructive" : ""} />
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>

            {/* Contact Person */}
            <div className="space-y-1">
              <Label>Contact Person</Label>
              <Input placeholder="Full name" value={formData.contact_person} onChange={set("contact_person")} className={errors.contact_person ? "border-destructive" : ""} />
              {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
            </div>

            {/* Area Covered */}
            <div className="space-y-1">
              <Label>Area Covered <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="Villages / areas covered" value={formData.area_covered} onChange={set("area_covered")} />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="name@example.com" value={formData.email} onChange={set("email")} className={`pl-9 ${errors.email ? "border-destructive" : ""}`} />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input placeholder="10-digit number" value={formData.phone} onChange={set("phone")} className={errors.phone ? "border-destructive" : ""} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={set("password")}
                  className={`pl-9 pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              {formData.password && strength && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.barColor : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength.color}`}>{strength.label} password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  value={formData.confirm}
                  onChange={set("confirm")}
                  className={`pl-9 pr-10 ${errors.confirm ? "border-destructive" : ""}`}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
              {formData.confirm && !errors.confirm && formData.password === formData.confirm && (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Passwords match</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Registering..." : "Register Sangha"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/sangha/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
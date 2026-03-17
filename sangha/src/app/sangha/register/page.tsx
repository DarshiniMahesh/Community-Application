"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, MapPin, Phone, Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SanghaRegisterForm {
  sanghaName: string; location: string; contactPerson: string;
  phone: string; email: string; password: string;
}

export default function SanghaRegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SanghaRegisterForm>({ sanghaName: "", location: "", contactPerson: "", phone: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<keyof SanghaRegisterForm, string>>({ sanghaName: "", location: "", contactPerson: "", phone: "", email: "", password: "" });

  const validate = () => {
    const newErrors: Record<keyof SanghaRegisterForm, string> = { sanghaName: "", location: "", contactPerson: "", phone: "", email: "", password: "" };
    if (!formData.sanghaName.trim()) newErrors.sanghaName = "Sangha name is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact person is required";
    if (!formData.phone.trim()) { newErrors.phone = "Phone is required"; } else if (formData.phone.length !== 10) { newErrors.phone = "Please enter a valid 10-digit phone number"; }
    if (!formData.email.trim()) { newErrors.email = "Email is required"; } else if (!formData.email.includes("@")) { newErrors.email = "Please enter a valid email address"; }
    if (!formData.password) { newErrors.password = "Password is required"; } else if (formData.password.length < 8) { newErrors.password = "Password must be at least 8 characters"; }
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (field: keyof SanghaRegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/sangha/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.sanghaName, location: formData.location, contactPerson: formData.contactPerson, phone: formData.phone, email: formData.email, password: formData.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data && (data.message || data.error)) || "Failed to register Sangha";
        toast.error(message); return;
      }
      toast.success("Sangha registered successfully. Awaiting admin approval.");
      router.push("/sangha/login");
    } catch {
      toast.error("Something went wrong while registering Sangha");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Sangha Registration</CardTitle>
          <CardDescription>Register a Sangha to manage community applications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sanghaName">Sangha Name</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Users className="h-4 w-4" /></div>
                <Input id="sanghaName" placeholder="Enter Sangha name" value={formData.sanghaName} onChange={handleChange("sanghaName")} className={`pl-10 ${errors.sanghaName ? "border-destructive" : ""}`} />
              </div>
              {errors.sanghaName && <p className="text-xs text-destructive">{errors.sanghaName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><MapPin className="h-4 w-4" /></div>
                <Input id="location" placeholder="City / Village, District" value={formData.location} onChange={handleChange("location")} className={`pl-10 ${errors.location ? "border-destructive" : ""}`} />
              </div>
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><UserIcon className="h-4 w-4" /></div>
                <Input id="contactPerson" placeholder="Full name of contact person" value={formData.contactPerson} onChange={handleChange("contactPerson")} className={`pl-10 ${errors.contactPerson ? "border-destructive" : ""}`} />
              </div>
              {errors.contactPerson && <p className="text-xs text-destructive">{errors.contactPerson}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone className="h-4 w-4" /></div>
                <Input id="phone" type="tel" placeholder="10-digit phone number" value={formData.phone} onChange={handleChange("phone")} className={`pl-10 ${errors.phone ? "border-destructive" : ""}`} />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Mail className="h-4 w-4" /></div>
                <Input id="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleChange("email")} className={`pl-10 ${errors.email ? "border-destructive" : ""}`} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-4 w-4" /></div>
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={formData.password} onChange={handleChange("password")} className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? "Registering..." : "Register Sangha"}</Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have a Sangha account?{" "}
              <Link href="/sangha/login" className="text-primary hover:underline font-medium">Sign in here</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

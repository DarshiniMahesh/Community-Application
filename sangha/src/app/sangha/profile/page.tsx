"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, MapPin, User as UserIcon, Phone, Mail } from "lucide-react";

interface SanghaProfileForm {
  name: string; location: string; contactPerson: string;
  phone: string; email: string; description: string;
}

export default function SanghaProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SanghaProfileForm>({ name: "", location: "", contactPerson: "", phone: "", email: "", description: "" });
  const [errors, setErrors] = useState<Record<keyof SanghaProfileForm, string>>({ name: "", location: "", contactPerson: "", phone: "", email: "", description: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = window.localStorage.getItem("role");
    if (role !== "SANGHA" && role !== "ADMIN") { router.replace("/sangha/login"); }
  }, [router]);

  const validate = () => {
    const newErrors: Record<keyof SanghaProfileForm, string> = { name: "", location: "", contactPerson: "", phone: "", email: "", description: "" };
    if (!formData.name.trim()) newErrors.name = "Sangha name is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.contactPerson.trim()) newErrors.contactPerson = "Contact person is required";
    if (!formData.phone.trim()) { newErrors.phone = "Phone is required"; } else if (formData.phone.length !== 10) { newErrors.phone = "Please enter a valid 10-digit phone number"; }
    if (!formData.email.trim()) { newErrors.email = "Email is required"; } else if (!formData.email.includes("@")) { newErrors.email = "Please enter a valid email address"; }
    if (!formData.description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (field: keyof SanghaProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (typeof window !== "undefined") { window.localStorage.setItem("sanghaStatus", "pending_approval"); }
    toast.success("Sangha profile submitted for approval");
    router.push("/sangha/dashboard");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Sangha Profile</h1>
        <p className="text-muted-foreground mt-1">Provide basic details about your Sangha for admin approval.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sangha Details</CardTitle>
          <CardDescription>These details will be used for managing members and applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {([
              ["name", "Sangha Name", "Enter Sangha name", Users],
              ["location", "Location", "City / Village, District", MapPin],
              ["contactPerson", "Contact Person", "Full name of contact person", UserIcon],
            ] as [keyof SanghaProfileForm, string, string, any][]).map(([field, label, placeholder, Icon]) => (
              <div className="space-y-2" key={field}>
                <Label htmlFor={field}>{label}</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon className="h-4 w-4" /></div>
                  <Input id={field} placeholder={placeholder} value={formData[field] as string} onChange={handleChange(field)} className={`pl-10 ${errors[field] ? "border-destructive" : ""}`} />
                </div>
                {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
              </div>
            ))}
            <div className="grid md:grid-cols-2 gap-4">
              {([["phone", "Phone", "10-digit phone number", Phone, "tel"], ["email", "Email", "name@example.com", Mail, "email"]] as [keyof SanghaProfileForm, string, string, any, string][]).map(([field, label, placeholder, Icon, type]) => (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon className="h-4 w-4" /></div>
                    <Input id={field} type={type} placeholder={placeholder} value={formData[field] as string} onChange={handleChange(field)} className={`pl-10 ${errors[field] ? "border-destructive" : ""}`} />
                  </div>
                  {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Briefly describe your Sangha and its purpose" value={formData.description} onChange={handleChange("description")} className={errors.description ? "border-destructive" : ""} />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit">Submit for Approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

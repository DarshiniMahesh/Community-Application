"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface SanghaRegisterForm {
  email: string;
  phone: string;
  password: string;
  emailOtp: string;
  phoneOtp: string;
}

export default function SanghaRegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SanghaRegisterForm>({
    email: "",
    phone: "",
    password: "",
    emailOtp: "",
    phoneOtp: "",
  });
  const [errors, setErrors] = useState<Record<keyof SanghaRegisterForm, string>>({
    email: "",
    phone: "",
    password: "",
    emailOtp: "",
    phoneOtp: "",
  });

  const validate = () => {
    const newErrors: Record<keyof SanghaRegisterForm, string> = {
      email: "",
      phone: "",
      password: "",
      emailOtp: "",
      phoneOtp: "",
    };
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.phone.length !== 10) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.password) { newErrors.password = "Password is required"; } else if (formData.password.length < 8) { newErrors.password = "Password must be at least 8 characters"; }
    if (!emailVerified) newErrors.emailOtp = "Please verify email OTP";
    if (!phoneVerified) newErrors.phoneOtp = "Please verify phone OTP";
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (field: keyof SanghaRegisterForm) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSendEmailOTP = () => {
    if (!formData.email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (!formData.email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }));
      return;
    }
    setEmailVerified(false);
    setShowEmailOTP(true);
    toast.success("OTP sent (Use 1234)");
  };

  const handleSendPhoneOTP = () => {
    if (!formData.phone.trim()) {
      setErrors((prev) => ({ ...prev, phone: "Phone number is required" }));
      return;
    }
    if (formData.phone.length !== 10) {
      setErrors((prev) => ({ ...prev, phone: "Please enter a valid 10-digit phone number" }));
      return;
    }
    setPhoneVerified(false);
    setShowPhoneOTP(true);
    toast.success("OTP sent (Use 1234)");
  };

  const handleVerifyEmailOTP = () => {
    if (formData.emailOtp === "1234") {
      setEmailVerified(true);
      setErrors((prev) => ({ ...prev, emailOtp: "" }));
      toast.success("Email verified successfully");
      return;
    }
    setEmailVerified(false);
    setErrors((prev) => ({ ...prev, emailOtp: "Invalid OTP" }));
  };

  const handleVerifyPhoneOTP = () => {
    if (formData.phoneOtp === "1234") {
      setPhoneVerified(true);
      setErrors((prev) => ({ ...prev, phoneOtp: "" }));
      toast.success("Phone verified successfully");
      return;
    }
    setPhoneVerified(false);
    setErrors((prev) => ({ ...prev, phoneOtp: "Invalid OTP" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      // Simulate registration
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sanghaStatus", "pending_approval");
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
            <div className="h-8 w-8 text-primary-foreground">S</div>
          </div>
          <CardTitle className="text-2xl">Sangha Registration</CardTitle>
          <CardDescription>Register a Sangha to manage community applications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input id="email" placeholder="Enter email" value={formData.email} onChange={(e) => { handleChange("email")(e.target.value); setEmailVerified(false); }} className={`pl-10 ${errors.email ? "border-destructive" : ""}`} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              <Button type="button" variant="outline" className="w-full" onClick={handleSendEmailOTP}>
                Send OTP
              </Button>
            </div>
            {showEmailOTP && (
              <div className="space-y-2">
                <Label>Email OTP</Label>
                <InputOTP maxLength={4} value={formData.emailOtp} onChange={(value) => handleChange("emailOtp")(value)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.emailOtp && <p className="text-xs text-destructive">{errors.emailOtp}</p>}
                <Button type="button" variant="outline" className="w-full" onClick={handleVerifyEmailOTP}>
                  Verify Email OTP
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <Input id="phone" type="tel" placeholder="Enter 10-digit phone number" value={formData.phone} onChange={(e) => { handleChange("phone")(e.target.value); setPhoneVerified(false); }} className={`pl-10 ${errors.phone ? "border-destructive" : ""}`} />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              <Button type="button" variant="outline" className="w-full" onClick={handleSendPhoneOTP}>
                Send OTP
              </Button>
            </div>
            {showPhoneOTP && (
              <div className="space-y-2">
                <Label>Phone OTP</Label>
                <InputOTP maxLength={4} value={formData.phoneOtp} onChange={(value) => handleChange("phoneOtp")(value)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.phoneOtp && <p className="text-xs text-destructive">{errors.phoneOtp}</p>}
                <Button type="button" variant="outline" className="w-full" onClick={handleVerifyPhoneOTP}>
                  Verify Phone OTP
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="h-4 w-4" /></div>
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={formData.password} onChange={(e) => handleChange("password")(e.target.value)} className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting || !emailVerified || !phoneVerified}>{submitting ? "Registering..." : "Verify & Register"}</Button>
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

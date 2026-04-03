"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Phone, User, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak",   score: 1, color: "text-red-500",    barColor: "bg-red-500" };
  if (score === 2) return { label: "Medium", score: 2, color: "text-yellow-500", barColor: "bg-yellow-500" };
  return              { label: "Strong", score: 3, color: "text-green-500",  barColor: "bg-green-500" };
}

type Step = "details" | "otp";

interface FormData {
  sangha_name: string;
  email:       string;
  phone:       string;
  password:    string;
  confirm:     string;
}

export default function SanghaRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");

  const [formData, setFormData] = useState<FormData>({
    sangha_name: "", email: "", phone: "", password: "", confirm: "",
  });
  const [errors, setErrors]           = useState<Partial<FormData>>({});
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);

  const [otp, setOtp]               = useState("");
  const [otpError, setOtpError]     = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const strength   = formData.password ? getPasswordStrength(formData.password) : null;
  const identifier = formData.email.trim() || formData.phone.trim();

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      setErrors(prev  => ({ ...prev, [field]: "" }));
    };

  const validate = () => {
    const e: Partial<FormData> = {};

    if (!formData.sangha_name.trim()) e.sangha_name = "Sangha name is required";

    const hasEmail = formData.email.trim().length > 0;
    const hasPhone = formData.phone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      e.email = "At least one of email or phone is required";
    } else {
      if (hasEmail && !/\S+@\S+\.\S+/.test(formData.email.trim()))
        e.email = "Enter a valid email address";
      if (hasPhone && !/^\d{10}$/.test(formData.phone.trim()))
        e.phone = "Enter a valid 10-digit phone number";
    }

    if (!formData.password)                e.password = "Password is required";
    else if (formData.password.length < 8) e.password = "Minimum 8 characters";
    if (formData.password !== formData.confirm) e.confirm = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Step 1 — send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/sangha/register/send-otp", {
        sangha_name: formData.sangha_name.trim(),
        email:       formData.email.trim()  || undefined,
        phone:       formData.phone.trim()  || undefined,
        password:    formData.password,
      });
      toast.success("OTP sent! Check your email or phone.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { setOtpError("OTP is required"); return; }
    if (otp.trim().length !== 6) { setOtpError("Enter a valid 6-digit OTP"); return; }
    setOtpError("");
    setOtpLoading(true);
    try {
      const data = await api.post("/sangha/register/verify-otp", {
        identifier,
        otp: otp.trim(),
      });
      localStorage.setItem("token",        data.token);
      localStorage.setItem("role",         data.role         ?? "sangha");
      localStorage.setItem("sanghaStatus", data.sanghaStatus ?? "pending_approval");
      localStorage.setItem("sanghaName",   data.sanghaName   ?? "");
      toast.success("Account created! Please complete your Sangha profile.");
      router.push("/sangha/profile");
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await api.post("/sangha/register/send-otp", {
        sangha_name: formData.sangha_name.trim(),
        email:       formData.email.trim()  || undefined,
        phone:       formData.phone.trim()  || undefined,
        password:    formData.password,
      });
      toast.success("OTP resent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md shadow-xl border-border">

        {/* ══ STEP 1: Details ══════════════════════════════════ */}
        {step === "details" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-primary-foreground">S</span>
              </div>
              <CardTitle className="text-2xl">Sangha Registration</CardTitle>
              <CardDescription>
                Register your Sangha to manage community applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOtp} className="space-y-4">

                {/* Sangha Name */}
                <div className="space-y-1">
                  <Label htmlFor="sangha_name">Sangha Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sangha_name"
                      placeholder="Enter your Sangha name"
                      value={formData.sangha_name}
                      onChange={set("sangha_name")}
                      className={`pl-10 ${errors.sangha_name ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.sangha_name && <p className="text-xs text-destructive">{errors.sangha_name}</p>}
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={set("email")}
                        className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="10-digit number"
                        value={formData.phone}
                        onChange={set("phone")}
                        className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  At least one of email or phone is required
                </p>

                {/* Password */}
                <div className="space-y-1">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={set("password")}
                      className={`pl-9 pr-10 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  {formData.password && strength && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.barColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${strength.color}`}>
                        {strength.label} password
                        {strength.label === "Weak"   && " — Add uppercase, numbers & symbols"}
                        {strength.label === "Medium" && " — Add special characters to strengthen"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label htmlFor="confirm">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat password"
                      value={formData.confirm}
                      onChange={set("confirm")}
                      className={`pl-9 pr-10 ${errors.confirm ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
                  {formData.confirm && !errors.confirm && formData.password === formData.confirm && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending OTP..." : "Continue"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already registered?{" "}
                  <Link href="/sangha/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ══ STEP 2: OTP ══════════════════════════════════════ */}
        {step === "otp" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <ShieldCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Verify OTP</CardTitle>
              <CardDescription>
                Enter the OTP sent to{" "}
                <span className="font-medium text-foreground">{identifier}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <Label>OTP</Label>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setOtpError(""); }}
                    className={`text-center text-lg tracking-widest ${otpError ? "border-destructive" : ""}`}
                    maxLength={6}
                  />
                  {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                  <p className="text-xs text-muted-foreground text-center">
                    For demo, OTP is: <span className="font-mono font-bold">123456</span>
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={otpLoading}>
                  {otpLoading ? "Verifying..." : "Verify & Create Account"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => setStep("details")}
                    className="text-muted-foreground hover:text-foreground">
                    ← Back
                  </button>
                  <button type="button" onClick={handleResendOtp}
                    className="text-primary hover:underline font-medium">
                    Resend OTP
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

      </Card>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2,
} from "lucide-react";
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

type Step =
  | "credentials"    // Step 1: identifier + password
  | "login-otp"      // Step 2: OTP to complete login
  | "forgot-id"      // Forgot Step 1: enter email/phone
  | "forgot-otp"     // Forgot Step 2: verify OTP
  | "forgot-reset";  // Forgot Step 3: new password

export default function SanghaLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");

  // Login state
  const [identifier, setIdentifier]     = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors]   = useState<Record<string, string>>({});
  const [loginLoading, setLoginLoading] = useState(false);

  // Login OTP state
  const [loginOtp, setLoginOtp]               = useState("");
  const [loginOtpError, setLoginOtpError]     = useState("");
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);

  // Forgot state
  const [fpId, setFpId]                   = useState("");
  const [fpIdError, setFpIdError]         = useState("");
  const [fpOtp, setFpOtp]                 = useState("");
  const [fpOtpError, setFpOtpError]       = useState("");
  const [fpNewPw, setFpNewPw]             = useState("");
  const [fpConfirmPw, setFpConfirmPw]     = useState("");
  const [fpPwErrors, setFpPwErrors]       = useState<Record<string, string>>({});
  const [showFpNew, setShowFpNew]         = useState(false);
  const [showFpConfirm, setShowFpConfirm] = useState(false);
  const [fpLoading, setFpLoading]         = useState(false);

  const newPwStrength = fpNewPw ? getPasswordStrength(fpNewPw) : null;

  // ── Validate login ───────────────────────────────────────
  const validateLogin = () => {
    const errs: Record<string, string> = {};
    const val = identifier.trim();
    if (!val) {
      errs.identifier = "Email or phone number is required";
    } else {
      const isEmail = val.includes("@");
      const isPhone = /^\d{10}$/.test(val);
      if (!isEmail && !isPhone) errs.identifier = "Enter a valid email or 10-digit phone number";
    }
    if (!password.trim()) errs.password = "Password is required";
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 1: verify credentials → send OTP ───────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoginLoading(true);
    try {
      await api.post("/sangha/login/send-otp", {
        identifier: identifier.trim(),
        password,
      });
      toast.success("Credentials verified! OTP sent.");
      setStep("login-otp");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Step 2: verify login OTP → get token ────────────────
  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtp.trim()) { setLoginOtpError("OTP is required"); return; }
    if (loginOtp.trim().length !== 6) { setLoginOtpError("Enter a valid 6-digit OTP"); return; }
    setLoginOtpError("");
    setLoginOtpLoading(true);
    try {
      const data = await api.post("/sangha/login/verify-otp", {
        identifier: identifier.trim(),
        otp: loginOtp.trim(),
      });
      localStorage.setItem("token",        data.token);
      localStorage.setItem("role",         data.role         ?? "sangha");
      localStorage.setItem("sanghaStatus", data.sanghaStatus ?? "pending_approval");
      localStorage.setItem("sanghaName",   data.sanghaName   ?? "");
      toast.success("Login successful!");
      router.push("/sangha/profile");
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    try {
      await api.post("/sangha/login/send-otp", {
        identifier: identifier.trim(),
        password,
      });
      toast.success("OTP resent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    }
  };

  // ── Forgot Step 1: send OTP ──────────────────────────────
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = fpId.trim();
    if (!val) { setFpIdError("Email or phone is required"); return; }
    const isEmail = val.includes("@");
    const isPhone = /^\d{10}$/.test(val);
    if (!isEmail && !isPhone) { setFpIdError("Enter a valid email or 10-digit phone"); return; }
    setFpIdError("");
    setFpLoading(true);
    try {
      await api.post("/sangha/forgot-password/send-otp", { identifier: val });
      toast.success("OTP sent!");
      setStep("forgot-otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot Step 2: verify OTP ────────────────────────────
  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpOtp.trim()) { setFpOtpError("OTP is required"); return; }
    if (fpOtp.trim().length !== 6) { setFpOtpError("Enter a valid 6-digit OTP"); return; }
    setFpOtpError("");
    setFpLoading(true);
    try {
      await api.post("/sangha/forgot-password/verify-otp", {
        identifier: fpId.trim(),
        otp: fpOtp.trim(),
      });
      toast.success("OTP verified! Set your new password.");
      setStep("forgot-reset");
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot Step 3: reset password ───────────────────────
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!fpNewPw) errs.newPw = "New password is required";
    else if (fpNewPw.length < 8) errs.newPw = "Minimum 8 characters";
    if (fpNewPw !== fpConfirmPw) errs.confirmPw = "Passwords do not match";
    setFpPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFpLoading(true);
    try {
      await api.post("/sangha/forgot-password/reset", {
        identifier:  fpId.trim(),
        otp:         fpOtp.trim(),
        newPassword: fpNewPw,
      });
      toast.success("Password reset! Please log in.");
      // Reset all forgot state
      setFpId(""); setFpOtp(""); setFpNewPw(""); setFpConfirmPw("");
      setStep("credentials");
    } catch (err: any) {
      toast.error(err.message || "Password reset failed");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">

        {/* ── STEP 1: Credentials ── */}
        {step === "credentials" && (
          <>
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Sangha Login</CardTitle>
              <CardDescription>Sign in with your registered email or phone</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label>Email or Phone Number</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter email or 10-digit phone"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setLoginErrors(p => ({ ...p, identifier: "" })); }}
                      className={`pl-10 ${loginErrors.identifier ? "border-destructive" : ""}`}
                    />
                  </div>
                  {loginErrors.identifier && <p className="text-xs text-destructive">{loginErrors.identifier}</p>}
                </div>

                <div className="space-y-1">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginErrors(p => ({ ...p, password: "" })); }}
                      className={`pl-10 pr-10 ${loginErrors.password ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="text-xs text-destructive">{loginErrors.password}</p>}
                </div>

                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={() => setStep("forgot-id")}
                    className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loginLoading}>
                  {loginLoading ? "Verifying..." : "Sign In"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Need to register a Sangha?{" "}
                  <Link href="/sangha/register" className="text-primary hover:underline font-medium">
                    Register here
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── STEP 2: Login OTP ── */}
        {step === "login-otp" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <ShieldCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Enter OTP</CardTitle>
              <CardDescription>
                OTP sent to <span className="font-medium text-foreground">{identifier}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginOtp} className="space-y-4">
                <div className="space-y-1">
                  <Label>OTP</Label>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={loginOtp}
                    onChange={(e) => { setLoginOtp(e.target.value); setLoginOtpError(""); }}
                    className={`text-center text-lg tracking-widest ${loginOtpError ? "border-destructive" : ""}`}
                    maxLength={6}
                  />
                  {loginOtpError && <p className="text-xs text-destructive">{loginOtpError}</p>}
                  <p className="text-xs text-muted-foreground text-center">
                    For demo, OTP is: <span className="font-mono font-bold">123456</span>
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loginOtpLoading}>
                  {loginOtpLoading ? "Verifying..." : "Verify & Login"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => setStep("credentials")}
                    className="text-muted-foreground hover:text-foreground">
                    ← Back
                  </button>
                  <button type="button" onClick={handleResendLoginOtp}
                    className="text-primary hover:underline font-medium">
                    Resend OTP
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── FORGOT Step 1: Enter identifier ── */}
        {step === "forgot-id" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
              <CardDescription>Enter your registered email or phone to receive an OTP</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                <div className="space-y-1">
                  <Label>Email or Phone Number</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter email or 10-digit phone"
                      value={fpId}
                      onChange={(e) => { setFpId(e.target.value); setFpIdError(""); }}
                      className={`pl-10 ${fpIdError ? "border-destructive" : ""}`}
                    />
                  </div>
                  {fpIdError && <p className="text-xs text-destructive">{fpIdError}</p>}
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={fpLoading}>
                  {fpLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
                <button type="button" onClick={() => setStep("credentials")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
                  ← Back to Sign In
                </button>
              </form>
            </CardContent>
          </>
        )}

        {/* ── FORGOT Step 2: Verify OTP ── */}
        {step === "forgot-otp" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <ShieldCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Verify OTP</CardTitle>
              <CardDescription>
                OTP sent to <span className="font-medium text-foreground">{fpId}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <Label>OTP</Label>
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={fpOtp}
                    onChange={(e) => { setFpOtp(e.target.value); setFpOtpError(""); }}
                    className={`text-center text-lg tracking-widest ${fpOtpError ? "border-destructive" : ""}`}
                    maxLength={6}
                  />
                  {fpOtpError && <p className="text-xs text-destructive">{fpOtpError}</p>}
                  <p className="text-xs text-muted-foreground text-center">
                    For demo, OTP is: <span className="font-mono font-bold">123456</span>
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={fpLoading}>
                  {fpLoading ? "Verifying..." : "Verify OTP"}
                </Button>
                <button type="button" onClick={() => setStep("forgot-id")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
                  ← Back
                </button>
              </form>
            </CardContent>
          </>
        )}

        {/* ── FORGOT Step 3: Reset Password ── */}
        {step === "forgot-reset" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>Enter your new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotReset} className="space-y-4">
                <div className="space-y-1">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showFpNew ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={fpNewPw}
                      onChange={(e) => { setFpNewPw(e.target.value); setFpPwErrors(p => ({ ...p, newPw: "" })); }}
                      className={`pl-9 pr-10 ${fpPwErrors.newPw ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowFpNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showFpNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fpPwErrors.newPw && <p className="text-xs text-destructive">{fpPwErrors.newPw}</p>}
                  {fpNewPw && newPwStrength && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= newPwStrength.score ? newPwStrength.barColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${newPwStrength.color}`}>{newPwStrength.label} password</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showFpConfirm ? "text" : "password"}
                      placeholder="Repeat new password"
                      value={fpConfirmPw}
                      onChange={(e) => { setFpConfirmPw(e.target.value); setFpPwErrors(p => ({ ...p, confirmPw: "" })); }}
                      className={`pl-9 pr-10 ${fpPwErrors.confirmPw ? "border-destructive" : ""}`}
                    />
                    <button type="button" onClick={() => setShowFpConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showFpConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fpPwErrors.confirmPw && <p className="text-xs text-destructive">{fpPwErrors.confirmPw}</p>}
                  {fpConfirmPw && !fpPwErrors.confirmPw && fpNewPw === fpConfirmPw && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={fpLoading}>
                  {fpLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

      </Card>
    </div>
  );
}
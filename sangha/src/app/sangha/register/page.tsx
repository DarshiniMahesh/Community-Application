"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ── Password strength helper ───────────────────────────────────────────────
function getPasswordStrength(pw: string): {
  label: "Weak" | "Medium" | "Strong";
  score: number; // 1 | 2 | 3
  color: string;
  barColor: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1)
    return { label: "Weak", score: 1, color: "text-red-500", barColor: "bg-red-500" };
  if (score === 2)
    return { label: "Medium", score: 2, color: "text-yellow-500", barColor: "bg-yellow-500" };
  return { label: "Strong", score: 3, color: "text-green-500", barColor: "bg-green-500" };
}

// ── Step 1: Identifier entry ───────────────────────────────────────────────
function StepIdentifier({ onNext }: { onNext: (identifier: string) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) {
      setError("Email or phone number is required");
      return;
    }
    const isEmail = value.includes("@");
    const isPhone = /^\d{10}$/.test(value);
    if (!isEmail && !isPhone) {
      setError("Enter a valid email or 10-digit phone number");
      return;
    }
    onNext(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or Phone Number</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="identifier"
            placeholder="Enter email or 10-digit phone"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
            className={`pl-10 ${error ? "border-destructive" : ""}`}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button type="submit" className="w-full" size="lg">
        Send OTP <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sangha/login" className="text-primary hover:underline font-medium">
          Sign in here
        </Link>
      </div>
    </form>
  );
}

// ── Step 2: Password + Confirm Password ───────────────────────────────────
function StepPassword({
  identifier,
  onSuccess,
}: {
  identifier: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const strength = password ? getPasswordStrength(password) : null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!confirm) {
      newErrors.confirm = "Please confirm your password";
    } else if (password !== confirm) {
      newErrors.confirm = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Save registration
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sanghaStatus", "pending_approval");
        window.localStorage.removeItem("otp_identifier");
        window.localStorage.removeItem("otp_flow");
        window.localStorage.removeItem("otp_verified");
      }
      toast.success("Sangha registered successfully! Awaiting admin approval.");
      onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Verified badge */}
      <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-700 dark:text-green-400 truncate">
          {identifier} verified
        </span>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Create Password</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }}
            className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}

        {/* Strength bar */}
        {password.length > 0 && strength && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= strength.score ? strength.barColor : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${strength.color}`}>
              {strength.label} password
              {strength.label === "Weak" && " — Add uppercase, numbers & symbols"}
              {strength.label === "Medium" && " — Add special characters to make it stronger"}
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm Password</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm your password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors({ ...errors, confirm: "" }); }}
            className={`pl-10 pr-10 ${errors.confirm ? "border-destructive" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        {confirm && !errors.confirm && password === confirm && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Passwords match
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Registering..." : "Complete Registration"}
      </Button>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
function SanghaRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step"); // "password" after OTP verified

  const [identifier, setIdentifier] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("otp_identifier") || "";
      setIdentifier(stored);
    }
  }, []);

  const handleIdentifierNext = (value: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("otp_identifier", value);
      window.localStorage.setItem("otp_flow", "register");
    }
    toast.success("OTP sent! (Use 1234)");
    router.push("/sangha/verify-otp");
  };

  const handleRegistrationSuccess = () => {
    router.push("/sangha/login");
  };

  const isPasswordStep = step === "password" && identifier;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <span className="text-2xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-2xl">
            {isPasswordStep ? "Set Your Password" : "Sangha Registration"}
          </CardTitle>
          <CardDescription>
            {isPasswordStep
              ? "Create a strong password to secure your account"
              : "Register your Sangha to manage community applications"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPasswordStep ? (
            <StepPassword identifier={identifier} onSuccess={handleRegistrationSuccess} />
          ) : (
            <StepIdentifier onNext={handleIdentifierNext} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SanghaRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      }
    >
      <SanghaRegisterContent />
    </Suspense>
  );
}
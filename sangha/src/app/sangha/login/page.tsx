"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SanghaLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Do NOT auto-login. Clear any stale session on mount.
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Remove any previously stored session so user must login again
      window.localStorage.removeItem("role");
      window.localStorage.removeItem("currentUser");
      window.localStorage.removeItem("otp_identifier");
      window.localStorage.removeItem("otp_password");
    }
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const value = formData.identifier.trim();
    if (!value) {
      newErrors.identifier = "Email or phone number is required";
    } else {
      const isEmail = value.includes("@");
      const isPhone = /^\d{10}$/.test(value);
      if (!isEmail && !isPhone) {
        newErrors.identifier = "Enter a valid email or 10-digit phone number";
      }
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetOTP = async () => {
    if (!validate()) return;
    setLoading(true);
    // Store credentials temporarily for the OTP page to use
    if (typeof window !== "undefined") {
      window.localStorage.setItem("otp_identifier", formData.identifier.trim());
      window.localStorage.setItem("otp_password", formData.password);
      window.localStorage.setItem("otp_flow", "login");
    }
    toast.success("OTP sent successfully! (Use 1234)");
    setLoading(false);
    router.push("/sangha/verify-otp");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Sangha Login</CardTitle>
          <CardDescription>Sign in with email or phone</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); handleGetOTP(); }}
            className="space-y-4"
          >
            {/* Identifier */}
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone Number</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Enter email or 10-digit phone"
                  value={formData.identifier}
                  onChange={(e) => {
                    setFormData({ ...formData, identifier: e.target.value });
                    setErrors({ ...errors, identifier: "" });
                  }}
                  className={`pl-10 ${errors.identifier ? "border-destructive" : ""}`}
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-destructive">{errors.identifier}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: "" });
                  }}
                  className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Sending OTP..." : "Get OTP"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Need to register a Sangha?{" "}
              <Link href="/sangha/register" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
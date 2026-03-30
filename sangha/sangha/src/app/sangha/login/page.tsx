"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SanghaLoginPage() {
  const router = useRouter();
  const [showOTPField, setShowOTPField] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "", otp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = window.localStorage.getItem("role");
      if (role === "SANGHA" || role === "ADMIN") {
        router.replace("/sangha/profile");
      }
    }
  }, [router]);

  const validateIdentifier = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.identifier) {
      newErrors.identifier = "Email or phone number is required";
    } else {
      const value = formData.identifier.trim();
      const isEmail = value.includes("@");
      const isPhone = /^\d{10}$/.test(value);
      if (!isEmail && !isPhone) {
        newErrors.identifier = "Enter a valid email or 10-digit phone number";
      }
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleGetOTP = () => {
    if (!validateIdentifier()) return;
    setShowOTPField(true);
    toast.success("OTP sent successfully (Use 1234)");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!validateIdentifier()) return;
    if (!showOTPField) {
      newErrors.otp = "Please click Get OTP first";
    } else if (!formData.otp.trim()) {
      newErrors.otp = "OTP is required";
    } else if (formData.otp !== "1234") {
      newErrors.otp = "Invalid OTP";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("role", "SANGHA");
      window.localStorage.setItem("currentUser", formData.identifier);
    }
    toast.success("Login successful");
    router.push("/sangha/profile");
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone Number</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input id="identifier" type="text"
                  placeholder="Enter email or phone number"
                  value={formData.identifier}
                  onChange={(e) => { setFormData({ ...formData, identifier: e.target.value }); setErrors({ ...errors, identifier: "" }); }}
                  className={`pl-10 ${errors.identifier ? "border-destructive" : ""}`} />
              </div>
            </div>
            {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: "" }); }}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="button" className="w-full" size="lg" onClick={handleGetOTP}>Get OTP</Button>
            {showOTPField && (
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  placeholder="Enter OTP"
                  value={formData.otp}
                  onChange={(e) => { setFormData({ ...formData, otp: e.target.value }); setErrors({ ...errors, otp: "" }); }}
                  className={errors.otp ? "border-destructive" : ""}
                />
                {errors.otp && <p className="text-xs text-destructive">{errors.otp}</p>}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg">Login</Button>
            <div className="text-center text-sm text-muted-foreground">
              Need to register a Sangha?{" "}
              <Link href="/sangha/register" className="text-primary hover:underline font-medium">Register here</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

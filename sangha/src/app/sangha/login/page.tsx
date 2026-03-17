"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Mail, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function SanghaLoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"email" | "phone">("email");
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({ identifier: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = window.localStorage.getItem("role");
      if (role === "SANGHA" || role === "ADMIN") {
        router.replace("/sangha/dashboard");
      }
    }
  }, [router]);

  const startResendTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.identifier) {
      newErrors.identifier = loginType === "email" ? "Email is required" : "Phone number is required";
    } else if (loginType === "email" && !formData.identifier.includes("@")) {
      newErrors.identifier = "Please enter a valid email address";
    } else if (loginType === "phone" && formData.identifier.length !== 10) {
      newErrors.identifier = "Please enter a valid 10-digit phone number";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    toast.success("OTP sent successfully");
    setShowOTPDialog(true);
    startResendTimer();
  };

  const handleVerifyOTP = () => {
    if (otpValue.length !== 6) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("role", "SANGHA");
      window.localStorage.setItem("sanghaId", "1");
      window.localStorage.setItem("sanghaStatus", "profile_pending");
    }
    toast.success("Login successful");
    setShowOTPDialog(false);
    router.push("/sangha/profile");
  };

  const handleResendOTP = () => {
    if (resendTimer === 0) { toast.success("OTP resent"); setOtpValue(""); startResendTimer(); }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  return (
    <>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button type="button" onClick={() => { setLoginType("email"); setErrors({ ...errors, identifier: "" }); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${loginType === "email" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <Mail className="h-4 w-4" /><span>Email</span>
                </button>
                <button type="button" onClick={() => { setLoginType("phone"); setErrors({ ...errors, identifier: "" }); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${loginType === "phone" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <Phone className="h-4 w-4" /><span>Phone</span>
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">{loginType === "email" ? "Email Address" : "Phone Number"}</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {loginType === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  </div>
                  <Input id="identifier" type={loginType === "email" ? "email" : "tel"}
                    placeholder={loginType === "email" ? "name@example.com" : "1234567890"}
                    value={formData.identifier}
                    onChange={(e) => { setFormData({ ...formData, identifier: e.target.value }); setErrors({ ...errors, identifier: "" }); }}
                    className={`pl-10 ${errors.identifier ? "border-destructive" : ""}`} />
                </div>
                {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
              </div>
              <Button type="submit" className="w-full" size="lg">Send OTP</Button>
              <div className="text-center text-sm text-muted-foreground">
                Need to register a Sangha?{" "}
                <Link href="/sangha/register" className="text-primary hover:underline font-medium">Register here</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Verify Your {loginType === "email" ? "Email" : "Phone"}</DialogTitle>
            <DialogDescription className="text-center">
              We&apos;ve sent a 6-digit code to <br />
              <span className="font-medium text-foreground">{formData.identifier}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpValue} onChange={(value) => setOtpValue(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-sm text-muted-foreground">Resend code in {resendTimer} seconds</p>
              ) : (
                <button onClick={handleResendOTP} className="text-sm text-primary hover:underline font-medium">Resend OTP</button>
              )}
            </div>
            <Button onClick={handleVerifyOTP} disabled={otpValue.length !== 6} className="w-full" size="lg">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify &amp; Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

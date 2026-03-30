"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const OTP_EXPIRY_SECONDS = 60;

function VerifyOTPContent() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [identifier, setIdentifier] = useState("");
  const [flow, setFlow] = useState<"login" | "register">("login");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("otp_identifier") || "";
      const f = window.localStorage.getItem("otp_flow") as "login" | "register" || "login";
      setIdentifier(id);
      setFlow(f);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const maskedIdentifier = identifier.includes("@")
    ? identifier.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : identifier.replace(/(\d{2})(\d{6})(\d{2})/, "$1******$3");

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newOtp = [...otp];
    for (let i = 0; i < 4; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    inputsRef.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleResend = () => {
    setOtp(["", "", "", ""]);
    setError("");
    setTimer(OTP_EXPIRY_SECONDS);
    setCanResend(false);
    toast.success("OTP resent successfully! (Use 1234)");
    inputsRef.current[0]?.focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 4) {
      setError("Please enter the complete 4-digit OTP");
      return;
    }
    if (otpValue !== "1234") {
      setError("Invalid OTP. Please try again.");
      return;
    }

    setLoading(true);

    if (flow === "login") {
      // Complete login
      if (typeof window !== "undefined") {
        window.localStorage.setItem("role", "SANGHA");
        window.localStorage.setItem("currentUser", identifier);
        window.localStorage.removeItem("otp_identifier");
        window.localStorage.removeItem("otp_password");
        window.localStorage.removeItem("otp_flow");
      }
      toast.success("Login successful!");
      router.push("/sangha/profile");
    } else {
      // Registration flow — mark OTP verified, go back to register to set password
      if (typeof window !== "undefined") {
        window.localStorage.setItem("otp_verified", "true");
      }
      toast.success("OTP verified! Please set your password.");
      router.push("/sangha/register?step=password");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-2">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Verify OTP</CardTitle>
          <CardDescription>
            We sent a 4-digit OTP to{" "}
            <span className="font-medium text-foreground">{maskedIdentifier}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Boxes */}
          <div className="space-y-2">
            <Label>Enter OTP</Label>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-14 h-14 text-center text-xl font-bold tracking-widest ${
                    error ? "border-destructive" : ""
                  }`}
                />
              ))}
            </div>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
          </div>

          {/* Timer / Resend */}
          <div className="text-center text-sm text-muted-foreground">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="text-primary font-medium hover:underline"
              >
                Resend OTP
              </button>
            ) : (
              <span>
                Resend OTP in{" "}
                <span className="font-semibold text-foreground">
                  {String(Math.floor(timer / 60)).padStart(2, "0")}:
                  {String(timer % 60).padStart(2, "0")}
                </span>
              </span>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleVerify}
            disabled={loading || otp.join("").length < 4}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Go back
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}
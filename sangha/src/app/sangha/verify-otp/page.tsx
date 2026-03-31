"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveAuth } from "@/lib/api";

const OTP_EXPIRY_SECONDS = 60;
const HARDCODED_OTP = "123456";

function VerifyOTPContent() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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
      const f = (window.localStorage.getItem("otp_flow") as "login" | "register") || "login";
      setIdentifier(id);
      setFlow(f);
    }
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
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
    if (value && index < 5) {
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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || "";
    setOtp(newOtp);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setTimer(OTP_EXPIRY_SECONDS);
    setCanResend(false);
    toast.success(`OTP resent! Use ${HARDCODED_OTP}`);
    inputsRef.current[0]?.focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    if (otpValue !== HARDCODED_OTP) {
      setError("Invalid OTP. Please try again.");
      return;
    }

    setLoading(true);

    if (flow === "login") {
      // Read the pending login data stored by login page
      const pendingToken       = localStorage.getItem("pending_token") ?? "";
      const pendingRole        = localStorage.getItem("pending_role") ?? "sangha";
      const pendingSanghaStatus = localStorage.getItem("pending_sanghaStatus") ?? "pending_approval";
      const pendingSanghaName  = localStorage.getItem("pending_sanghaName") ?? "";

      // Save real auth
      saveAuth(pendingToken, pendingRole, pendingSanghaStatus, pendingSanghaName);

      // Clean up pending keys
      localStorage.removeItem("pending_token");
      localStorage.removeItem("pending_role");
      localStorage.removeItem("pending_sanghaStatus");
      localStorage.removeItem("pending_sanghaName");
      localStorage.removeItem("otp_identifier");
      localStorage.removeItem("otp_flow");

      toast.success("Login successful!");

      if (pendingSanghaStatus === "approved") {
        router.push("/sangha/dashboard");
      } else {
        router.push("/sangha/profile");
      }
    } else {
      // Registration flow
      localStorage.setItem("otp_verified", "true");
      toast.success("OTP verified!");
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
            Enter the 6-digit OTP sent to{" "}
            <span className="font-medium text-foreground">{maskedIdentifier}</span>
          </CardDescription>
          <p className="text-xs text-muted-foreground">(Demo: use <strong>{HARDCODED_OTP}</strong>)</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Enter OTP</Label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                  className={`w-12 h-12 text-center text-xl font-bold ${error ? "border-destructive" : ""}`}
                />
              ))}
            </div>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {canResend ? (
              <button type="button" onClick={handleResend} className="text-primary font-medium hover:underline">
                Resend OTP
              </button>
            ) : (
              <span>
                Resend in{" "}
                <span className="font-semibold text-foreground">
                  {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
                </span>
              </span>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleVerify}
            disabled={loading || otp.join("").length < 6}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>

          <div className="text-center">
            <button type="button" onClick={() => router.back()}
              className="text-sm text-muted-foreground hover:text-foreground underline">
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
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function OtpPage() {
  const router = useRouter();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [contact, setContact] = useState("");
  const [resend, setResend] = useState(30);
  const [err, setErr] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Read contact from sessionStorage (set by login page) ──────────────────
  useEffect(() => {
    const c = sessionStorage.getItem("otp_contact") ?? "";
    if (!c) router.push("/signup/login");
    setContact(c);
    startTimer();
    setTimeout(() => refs.current[0]?.focus(), 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [router]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResend(30);
    timerRef.current = setInterval(() => {
      setResend((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Input handlers ─────────────────────────────────────────────────────────
  const onChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...digits];
    pasted.forEach((d, i) => (next[i] = d));
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  // ── Verify ─────────────────────────────────────────────────────────────────
  const verify = () => {
    if (digits.join("").length < 6) return;

    // TODO: replace with real API call
    if (digits.join("") === "123456") {
      sessionStorage.removeItem("otp_contact");
      if (typeof window !== "undefined") localStorage.setItem("role", "ADMIN");
      toast.success("Login successful");
      router.push("/dashboard");
    } else {
      setErr("Incorrect OTP. Demo: 123456");
      setTimeout(() => setErr(""), 3000);
    }
  };

  const handleResend = () => {
    if (resend > 0) return;
    setDigits(["", "", "", "", "", ""]);
    toast.success("OTP resent");
    startTimer();
    setTimeout(() => refs.current[0]?.focus(), 50);
  };

  const otpComplete = digits.join("").length === 6;
  const isEmail = contact.includes("@");

  return (
    // Dark overlay background — matches screenshot
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "rgba(30, 30, 30, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* White modal card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: 420,
          padding: "2.25rem 2rem 2rem",
        }}
      >
        {/* Title */}
        <h2
          style={{
            margin: "0 0 0.5rem",
            textAlign: "center",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#111111",
          }}
        >
          Verify Your {isEmail ? "Email" : "Phone"}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            margin: "0 0 1.75rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          We&apos;ve sent a 6-digit code to
          <br />
          <strong style={{ color: "#111111" }}>{contact}</strong>
        </p>

        {/* Error */}
        {err && (
          <p
            style={{
              margin: "0 0 1rem",
              textAlign: "center",
              fontSize: "0.82rem",
              color: "#ef4444",
            }}
          >
            {err}
          </p>
        )}

        {/* OTP digit boxes */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              maxLength={1}
              value={d}
              inputMode="numeric"
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPaste={onPaste}
              style={{
                width: 52,
                height: 56,
                textAlign: "center",
                fontSize: "1.3rem",
                fontWeight: 700,
                borderRadius: 8,
                border: `2px solid ${d ? "#f97316" : "#e5e7eb"}`,
                backgroundColor: "#ffffff",
                color: "#111111",
                outline: "none",
                transition: "border-color .15s",
                caretColor: "#f97316",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#f97316")}
              onBlur={(e) => (e.target.style.borderColor = d ? "#f97316" : "#e5e7eb")}
            />
          ))}
        </div>

        {/* Resend timer */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          {resend > 0 ? (
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
              Resend code in {resend} seconds
            </p>
          ) : (
            <button
              onClick={handleResend}
              style={{
                background: "none",
                border: "none",
                fontSize: "0.875rem",
                color: "#f97316",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Verify & Continue button — light orange when disabled, solid when enabled */}
        <button
          onClick={verify}
          disabled={!otpComplete}
          style={{
            width: "100%",
            padding: "0.8rem",
            borderRadius: 8,
            border: "none",
            backgroundColor: otpComplete ? "#f97316" : "#fdba74",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: otpComplete ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background-color .15s",
          }}
          onMouseEnter={(e) => {
            if (otpComplete)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ea6c0a";
          }}
          onMouseLeave={(e) => {
            if (otpComplete)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f97316";
          }}
        >
          <CheckCircle2 size={18} />
          Verify &amp; Continue
        </button>
      </div>
    </div>
  );
}
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, saveCompanyAuth } from "@/lib/api";
import { Building2, ShieldCheck } from "lucide-react";

export default function CompanyOtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [contact, setContact] = useState("");
  const [method, setMethod] = useState("email");
  const [purpose, setPurpose] = useState("register");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const c = sessionStorage.getItem("company_contact") ?? "";
    const m = sessionStorage.getItem("company_method") ?? "email";
    const purpose = sessionStorage.getItem("company_otp_purpose") ?? "register";
    if (!c) router.push("/auth/login");
    setPurpose(purpose);
    setContact(c);
    setMethod(m);
    startCooldown();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCooldown = () => {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev: number) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const onChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (!val && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((ch: string, i: number) => { next[i] = ch; });
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const verify = async () => {
    const otp = digits.join("");
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const body = method === "email"
        ? { email: contact, otp }
        : { phone: contact, otp };
      const endpoint = purpose === "login"
        ? "/company/auth/verify-login-otp"
        : "/company/auth/verify-otp";
      const data = await api.post(endpoint, body);
      saveCompanyAuth(data.token);
      sessionStorage.removeItem("company_otp_purpose");
      if (!data.profileComplete) {
  router.push("/dashboard/profile?setup=true");
} else if (data.companyStatus === "approved") {
  router.push("/dashboard");
} else {
  // pending or rejected — only profile page
  router.push("/dashboard/profile");
}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setErr(msg);
      setTimeout(() => setErr(""), 3000);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const body = method === "email"
        ? { email: contact }
        : { phone: contact };
      await api.post("/company/auth/resend-otp", body);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
      setToast(true);
      setTimeout(() => setToast(false), 3000);
      startCooldown();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to resend OTP";
      setErr(msg);
      setTimeout(() => setErr(""), 3000);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") verify();
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const otp = digits.join("");

  return (
    <div style={styles.page}>
      <div style={{ ...styles.toast, opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(-12px)" }}>
        ✓ OTP resent successfully!
      </div>

      <div style={styles.card}>
        <div style={styles.iconBox}>
          <Building2 size={28} color="#1a56db" />
        </div>
        <h2 style={styles.title}>Verify Your Account</h2>
        <p style={styles.sub}>
          Enter the 6-digit code sent to{" "}
          <strong style={{ color: "#1a1a2e" }}>{contact}</strong>
        </p>

        <div style={styles.shieldRow}>
          <ShieldCheck size={14} color="#1a56db" />
          <span style={styles.shieldText}>Secure OTP verification</span>
        </div>

        {err && <div style={styles.errBanner}>{err}</div>}

        <div style={styles.otpRow} onPaste={handlePaste}>
          {digits.map((d: string, i: number) => (
            <input
              key={i}
              ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }}
              style={{
                ...styles.otpInput,
                borderColor: d ? "#1a56db" : "#d1d5db",
                background: d ? "#eff6ff" : "#fff",
              }}
              maxLength={1}
              value={d}
              inputMode="numeric"
              aria-label={`OTP digit ${i + 1}`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(i, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button
          style={{
            ...styles.verifyBtn,
            opacity: otp.length < 6 || loading ? 0.6 : 1,
            cursor: otp.length < 6 || loading ? "not-allowed" : "pointer",
          }}
          onClick={verify}
          disabled={otp.length < 6 || loading}
        >
          {loading ? "Verifying..." : "Verify & Continue →"}
        </button>

        <div style={styles.footer}>
          <button
            style={styles.backLink}
            onClick={() => router.push(purpose === "login" ? "/auth/login" : "/auth/register")}
          >
            ← Back
          </button>
          <button
            style={{
              ...styles.resendLink,
              color: resendCooldown > 0 ? "#9ca3af" : "#1a56db",
              cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            }}
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #eff6ff 0%, #f3f4f6 100%)",
    fontFamily: "'Segoe UI', sans-serif", padding: 16,
  },
  toast: {
    position: "fixed", top: 20, right: 20, zIndex: 50,
    background: "#f0fdf4", border: "1px solid #86efac",
    borderRadius: 8, padding: "10px 18px",
    color: "#16a34a", fontSize: 13, fontWeight: 600,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    transition: "opacity 0.3s, transform 0.3s",
  },
  card: {
    background: "#fff", borderRadius: 16,
    padding: "44px 40px", width: "100%", maxWidth: 420,
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
    textAlign: "center",
  },
  iconBox: {
    width: 60, height: 60, borderRadius: 16,
    background: "#eff6ff", display: "flex",
    alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  sub: { fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.6 },
  shieldRow: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, marginBottom: 24,
  },
  shieldText: { fontSize: 12, color: "#1a56db", fontWeight: 500 },
  errBanner: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px",
    color: "#dc2626", fontSize: 13, marginBottom: 16,
  },
  otpRow: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 },
  otpInput: {
    width: 48, height: 54, textAlign: "center",
    fontSize: 20, fontWeight: 700, borderRadius: 10,
    border: "2px solid", outline: "none",
    transition: "all 0.15s", cursor: "text",
  },
  verifyBtn: {
    width: "100%", padding: "13px 0",
    background: "#1a56db", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 15, fontWeight: 600,
    transition: "background 0.15s", marginBottom: 20,
  },
  footer: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  backLink: {
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, padding: 0,
  },
  resendLink: {
    background: "none", border: "none", fontSize: 13,
    fontWeight: 600, padding: 0,
  },
};
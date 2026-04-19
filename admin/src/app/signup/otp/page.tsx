/*Community-Application\admin\src\app\signup\otp\page.tsx*/
"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IC } from "@/components/Icons";

export default function OtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const c = sessionStorage.getItem("admin_email") ?? "";
    if (!c) router.push("/");
    setContact(c);
  }, [router]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

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
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const verify = async () => {
    const otp = digits.join("");
    if (otp.length < 6) return;
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      if (otp !== "123456") throw new Error("Incorrect OTP");
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setErr(msg + ". Demo OTP: 123456");
      setTimeout(() => setErr(""), 3000);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") verify();
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    // TODO: call your real resend API here
    await new Promise(r => setTimeout(r, 400));

    setDigits(["", "", "", "", "", ""]);
    refs.current[0]?.focus();

    // Show top-right toast
    setToast(true);
    setTimeout(() => setToast(false), 3000);

    // 30-second cooldown
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" style={{ width: 700, height: 700, top: -320, right: -160 }} />
      <div className="auth-bg" style={{ width: 400, height: 400, bottom: -110, left: -110 }} />

      {/* ── Top-right toast ── */}
      <div style={{
        position: "fixed", top: 24, right: 24, zIndex: 50,
        display: "flex", alignItems: "center", gap: 10,
        background: "#fff", border: "1px solid rgba(22,163,74,0.25)",
        borderRadius: 10, padding: "12px 18px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        transition: "opacity 0.3s, transform 0.6s",
        opacity: toast ? 1 : 0,
        transform: toast ? "translateY(0)" : "translateY(-12px)",
        pointerEvents: "none",
        minWidth: 180,
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>OTP resent successfully!</span>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">{IC.building}</div>
          <div><div className="auth-logo-text">Census Management System</div></div>
        </div>

        <div className="auth-title">Verify OTP</div>
        <div className="auth-subtitle">
          Enter the 6-digit code sent to <strong>{contact}</strong>
        </div>

        <div style={{
          background: "var(--green-pale)", color: "var(--green)",
          border: "1px solid rgba(22,163,74,0.2)",
          borderRadius: "var(--radius-sm)", padding: "10px 14px",
          fontSize: 13, marginBottom: 14,
        }}>
          For demo, OTP is: <strong style={{ fontFamily: "var(--mono)", letterSpacing: 3 }}>123456</strong>
        </div>

        {err && <div className="alert alert-error">{err}</div>}

        <div className="otp-wrap" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              aria-label={`OTP digit ${i + 1}`}
              className={`otp-input ${d ? "filled" : ""}`}
              maxLength={1}
              value={d}
              inputMode="numeric"
              onChange={e => onChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginBottom: 14, padding: "14px 20px", fontSize: 15, letterSpacing: "0.03em" }}
          onClick={verify}
          disabled={digits.join("").length < 6 || loading}
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--gray-400)" }}>
          <button className="auth-link" onClick={() => {
            sessionStorage.removeItem("admin_token");
            sessionStorage.removeItem("admin_email");
            router.push("/");
          }}>
            ← Back to Login
          </button>

          <button
            className="auth-link"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{
              color: resendCooldown > 0 ? "var(--gray-300)" : undefined,
              cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}
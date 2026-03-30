"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IC } from "@/components/Icons";

export default function OtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState("");
  const [contact, setContact] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const c = sessionStorage.getItem("otp_contact") ?? "";
    if (!c) router.push("/signup/login");
    setContact(c);
  }, [router]);

  const onChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[i] = val; setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (!val && i > 0) refs.current[i - 1]?.focus();
  };

  const verify = () => {
    if (digits.join("") === "123456") router.push("/dashboard");
    else { setErr("Incorrect OTP. Demo: 123456"); setTimeout(() => setErr(""), 3000); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" style={{ width: 500, height: 500, top: -150, right: -80 }} />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark" style={{ background: "var(--blue)" }}>{IC.lock}</div>
          <div><div className="auth-logo-text">OTP Verification</div></div>
        </div>
        <div className="auth-title">Enter OTP</div>
        <div className="auth-subtitle">6-digit code sent to <strong>{contact}</strong></div>
        <div style={{ background: "var(--green-pale)", color: "var(--green)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
          Demo OTP: <strong style={{ fontFamily: "var(--mono)", letterSpacing: 3 }}>123456</strong>
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="otp-wrap">
          {digits.map((d, i) => (
            <input aria-label="Remove item" key={i} ref={el => { refs.current[i] = el; }}
              className={`otp-input ${d ? "filled" : ""}`}
              maxLength={1} value={d}
              onChange={e => onChange(i, e.target.value)}
              onKeyDown={e => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()} />
          ))}
        </div>
        <button className="btn btn-primary btn-full" style={{ marginBottom: 12 }} onClick={verify} disabled={digits.join("").length < 6}>
          Verify OTP
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--gray-400)" }}>
          Did not receive? <button className="auth-link">Resend OTP</button>
        </div>
      </div>
    </div>
  );
}
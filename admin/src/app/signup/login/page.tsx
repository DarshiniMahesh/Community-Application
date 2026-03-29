"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IC } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [err, setErr] = useState("");

  const sendOtp = () => {
    if (!contact.trim()) {
      setErr("Please enter your email or phone number");
      setTimeout(() => setErr(""), 3000);
      return;
    }
    sessionStorage.setItem("otp_contact", contact);
    router.push("/signup/otp");
  };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" style={{ width: 700, height: 700, top: -320, right: -160 }} />
      <div className="auth-bg" style={{ width: 400, height: 400, bottom: -110, left: -110 }} />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">{IC.building}</div>
          <div><div className="auth-logo-text">Census Management System</div></div>
        </div>
        <div className="auth-title">Administrator Login</div>
        <div className="auth-subtitle">Secure access for authorised administrators only</div>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="form-group">
          <label className="form-label">Email Address or Phone Number</label>
          <input className="form-input" type="text" placeholder="Enter email or phone number"
            value={contact} onChange={e => setContact(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendOtp()} />
        </div>
        <button className="btn btn-primary btn-full"
          style={{ marginBottom: 14, padding: "14px 20px", fontSize: 15, letterSpacing: "0.03em" }}
          onClick={sendOtp}>
          Send OTP
        </button>
      </div>
    </div>
  );
}
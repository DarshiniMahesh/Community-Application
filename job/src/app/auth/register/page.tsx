"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveCompanyAuth } from "@/lib/api";
import { Eye, EyeOff, Building2, Mail, Lock } from "lucide-react";

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = (() => {
    let s = 0;
    const p = password;
    if (p.length >= 8) s += 25;
    if (p.match(/[a-z]/) && p.match(/[A-Z]/)) s += 25;
    if (p.match(/[0-9]/)) s += 25;
    if (p.match(/[^a-zA-Z0-9]/)) s += 25;
    return s;
  })();

  const strengthLabel =
    passwordStrength < 50 ? "Weak" : passwordStrength < 75 ? "Medium" : "Strong";
  const strengthColor =
    passwordStrength < 50 ? "#e74c3c" : passwordStrength < 75 ? "#f39c12" : "#27ae60";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contact.trim()) {
      e.contact = "Email or phone number is required";
    } else if (/^\d+$/.test(contact) && contact.length !== 10) {
      e.contact = "Enter a valid 10-digit phone number";
    } else if (!(/^\d{10}$/.test(contact)) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      e.contact = "Enter a valid email or 10-digit phone number";
    }
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Minimum 8 characters required";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const isPhone = /^\d{10}$/.test(contact);
      const body = isPhone
        ? { phone: contact, password }
        : { email: contact, password };

      const data = await api.post("/company/auth/register", body);
      saveCompanyAuth(data.token);

      // Store contact for OTP page
      sessionStorage.setItem("company_contact", contact);
      sessionStorage.setItem("company_method", /^\d{10}$/.test(contact) ? "phone" : "email");
      router.push("/auth/otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandBox}>
          <div style={styles.brandIcon}>
            <Building2 size={36} color="#fff" />
          </div>
          <h1 style={styles.brandTitle}>Job Portal</h1>
          <p style={styles.brandSub}>Company Portal</p>
        </div>
        <div style={styles.featureList}>
          {[
            "Post unlimited job openings",
            "Manage employee directory",
            "Track applications in real time",
            "Get verified company badge",
          ].map((f) => (
            <div key={f} style={styles.featureItem}>
              <span style={styles.featureDot}>✓</span>
              <span style={styles.featureText}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Register your Company</h2>
          <p style={styles.cardSub}>Create an account to start hiring</p>

          {errors.general && <div style={styles.errorBanner}>{errors.general}</div>}

          <form onSubmit={handleSubmit}>
            {/* Contact */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address or Phone Number</label>
              <div style={styles.inputWrap}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  style={{ ...styles.input, ...(errors.contact ? styles.inputError : {}) }}
                  type="text"
                  placeholder="company@example.com or 10-digit phone"
                  value={contact}
                  onChange={(e) => { setContact(e.target.value); setErrors({ ...errors, contact: "" }); }}
                />
              </div>
              {errors.contact && <p style={styles.errText}>{errors.contact}</p>}
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <Lock size={16} style={styles.inputIcon} />
                <input
                  style={{ ...styles.input, paddingRight: 44, ...(errors.password ? styles.inputError : {}) }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ ...styles.strengthBar, background: "#e0e0e0" }}>
                    <div style={{ ...styles.strengthFill, width: `${passwordStrength}%`, background: strengthColor }} />
                  </div>
                  <p style={{ fontSize: 11, color: strengthColor, marginTop: 2 }}>
                    Strength: {strengthLabel}
                  </p>
                </div>
              )}
              {errors.password && <p style={styles.errText}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrap}>
                <Lock size={16} style={styles.inputIcon} />
                <input
                  style={{
                    ...styles.input, paddingRight: 44,
                    ...(errors.confirmPassword ? styles.inputError : {}),
                    ...(confirmPassword && confirmPassword === password ? { borderColor: "#27ae60" } : {}),
                  }}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: "" }); }}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p style={styles.errText}>{errors.confirmPassword}</p>}
            </div>

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Creating account..." : "Create Company Account"}
            </button>
          </form>

          <p style={styles.footerText}>
            Already registered?{" "}
            <a href="/auth/login" style={styles.link}>Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f3f4f6",
  },
  leftPanel: {
    width: 380,
    background: "linear-gradient(160deg, #1a56db 0%, #0f3d9e 100%)",
    padding: "60px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 40,
    flexShrink: 0,
  },
  brandBox: { display: "flex", flexDirection: "column", gap: 8 },
  brandIcon: {
    width: 64, height: 64, borderRadius: 16,
    background: "rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  brandTitle: { color: "#fff", fontSize: 28, fontWeight: 700, margin: 0 },
  brandSub: { color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 },
  featureList: { display: "flex", flexDirection: "column", gap: 16 },
  featureItem: { display: "flex", alignItems: "flex-start", gap: 12 },
  featureDot: {
    width: 22, height: 22, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  featureText: { color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.5 },
  rightPanel: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  },
  card: {
    background: "#fff", borderRadius: 12, padding: "40px 36px",
    width: "100%", maxWidth: 460,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  cardTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  cardSub: { fontSize: 13, color: "#6b7280", margin: "0 0 24px" },
  toggle: {
    display: "flex", background: "#f3f4f6", borderRadius: 8,
    padding: 4, marginBottom: 24, gap: 4,
  },
  toggleBtn: {
    flex: 1, padding: "8px 0", borderRadius: 6, border: "none",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
    color: "#6b7280", background: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  },
  toggleActive: { background: "#fff", color: "#1a56db", fontWeight: 600, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },
  errorBanner: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px",
    color: "#dc2626", fontSize: 13, marginBottom: 16,
  },
  fieldGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  inputWrap: { position: "relative" },
  inputIcon: {
    position: "absolute", left: 12, top: "50%",
    transform: "translateY(-50%)", color: "#9ca3af",
  },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px 10px 38px",
    border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: 14, color: "#1a1a2e", outline: "none",
    transition: "border-color 0.15s",
  },
  inputError: { borderColor: "#dc2626" },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%",
    transform: "translateY(-50%)", background: "none",
    border: "none", cursor: "pointer", color: "#9ca3af", padding: 0,
  },
  strengthBar: { height: 4, borderRadius: 4, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 4, transition: "width 0.3s" },
  errText: { fontSize: 11, color: "#dc2626", margin: "4px 0 0" },
  submitBtn: {
    width: "100%", padding: "12px 0",
    background: "#1a56db", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    marginTop: 8, transition: "background 0.15s",
  },
  footerText: { textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 20 },
  link: { color: "#1a56db", fontWeight: 600, textDecoration: "none" },
};
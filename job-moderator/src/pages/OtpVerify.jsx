import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { AlertCircle, MailCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import { SubmitButton } from "../components/FormField.jsx";
import api from "../api/axiosInstance.js";
import { useAuth } from "../context/AuthContext.jsx";

const OTP_LENGTH = 6;

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const email = location.state?.email;

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  if (!email) return <Navigate to="/login" replace />;

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[idx] = val.slice(-1);
    setDigits(next);
    if (val && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(pasted.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH));
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const otp = digits.join("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/job-moderator/login/verify-otp", { email, otp });
      setToken(res.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await api.post("/api/job-moderator/login/send-otp", { email, resend: true });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend the code");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Step 2 of 2"
      title="Enter verification code"
      subtitle={<>We sent a 6-digit code to <strong style={{ color: "var(--ink)" }}>{email}</strong></>}
    >
      <form onSubmit={handleSubmit}>
        <div style={styles.otpRow} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              style={styles.otpBox}
            />
          ))}
        </div>

        {error && (
          <div style={styles.alert}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton loading={loading}>Verify & continue</SubmitButton>
      </form>

      <div style={styles.resendRow}>
        {resent ? (
          <span style={styles.resentMsg}><MailCheck size={13} /> Code resent</span>
        ) : (
          <button type="button" onClick={handleResend} disabled={resending} style={styles.resendBtn}>
            {resending ? "Sending..." : "Resend code"}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}

const styles = {
  otpRow: { display: "flex", gap: 8, marginBottom: 18 },
  otpBox: {
    width: "100%", aspectRatio: "1", textAlign: "center",
    fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)",
    color: "var(--ink)", background: "var(--bg-soft)",
    border: "1.5px solid var(--border)", borderRadius: 10, outline: "none",
  },
  alert: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--red-bg)", color: "var(--red-text)",
    padding: "10px 12px", borderRadius: 8, fontSize: 13,
    marginBottom: 16, fontWeight: 500,
  },
  resendRow: { marginTop: 18, textAlign: "center" },
  resendBtn: {
    background: "none", border: "none", color: "var(--blue-700)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  resentMsg: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 600, color: "var(--green-text)",
  },
};

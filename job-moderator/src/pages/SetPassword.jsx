import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import { FormField, SubmitButton } from "../components/FormField.jsx";
import api from "../api/axiosInstance.js";

export default function SetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This link is missing its setup token. Please use the link from your invite email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/job-moderator/set-password", { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Could not set your password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout eyebrow="All set" title="Password created" subtitle="Redirecting you to sign in...">
        <div style={styles.successBox}>
          <CheckCircle2 size={40} color="var(--green-text)" />
          <p style={styles.successText}>Your account is ready. Taking you to the sign-in page.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Welcome"
      title="Set your password"
      subtitle="Create a password for your Job Moderator account to finish setting up access."
    >
      {!token && (
        <div style={styles.alert}>
          <AlertCircle size={15} />
          <span>No setup token found in this link. Open the link from your invite email again.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="New password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormField
          label="Confirm password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && (
          <div style={styles.alert}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton loading={loading}>Create password</SubmitButton>
      </form>

      <p style={styles.hint}>
        Already set up? <Link to="/login" style={styles.link}>Sign in instead</Link>
      </p>
    </AuthLayout>
  );
}

const styles = {
  alert: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--red-bg)", color: "var(--red-text)",
    padding: "10px 12px", borderRadius: 8, fontSize: 13,
    marginBottom: 16, fontWeight: 500,
  },
  hint: { marginTop: 20, fontSize: 12.5, color: "var(--ink-faint)", textAlign: "center" },
  link: { color: "var(--blue-700)", fontWeight: 700, textDecoration: "none" },
  successBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0 4px" },
  successText: { fontSize: 13.5, color: "var(--ink-soft)", textAlign: "center", margin: 0 },
};

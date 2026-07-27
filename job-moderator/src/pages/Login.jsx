import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, AlertCircle } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import { FormField, SubmitButton } from "../components/FormField.jsx";
import api from "../api/axiosInstance.js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/job-moderator/login/send-otp", { email: email.trim(), password });
      navigate("/verify-otp", { state: { email: email.trim() } });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Moderator Console"
      title="Sign in to review referrals"
      subtitle="Enter the email and password set up for your moderator account."
    >
      <form onSubmit={handleSubmit}>
        <FormField
          label="Email address"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@communityportal.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div style={styles.alert}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton loading={loading}>Continue</SubmitButton>
      </form>

      <p style={styles.hint}>
        First time here? Use the setup link from your invite email, or{" "}
        <Link to="/set-password" style={styles.link}>set your password</Link>.
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
  hint: { marginTop: 20, fontSize: 12.5, color: "var(--ink-faint)", textAlign: "center", lineHeight: 1.6 },
  link: { color: "var(--blue-700)", fontWeight: 700, textDecoration: "none" },
};

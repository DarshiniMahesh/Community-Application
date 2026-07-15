import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div style={s.wrap}>
      <div style={s.backdrop} aria-hidden="true">
        <div style={s.blob1} />
        <div style={s.blob2} />
        <svg style={s.grid} width="100%" height="100%">
          <defs>
            <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#c9dcf8" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div style={s.card}>
        <div style={s.brandRow}>
          <div style={s.brandMark}>
            <ShieldCheck size={18} color="#fff" strokeWidth={2.4} />
          </div>
          <span style={s.brandName}>Job Moderator</span>
        </div>

        {eyebrow && <span style={s.eyebrow}>{eyebrow}</span>}
        <h1 style={s.title}>{title}</h1>
        {subtitle && <p style={s.subtitle}>{subtitle}</p>}

        <div style={{ marginTop: 28 }}>{children}</div>
      </div>

      <p style={s.footer}>Community Portal · Job Moderation Console</p>
    </div>
  );
}

const s = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(180deg, #dbe9ff 0%, #eef4ff 40%)",
  },
  backdrop: { position: "absolute", inset: 0, zIndex: 0 },
  grid: { position: "absolute", inset: 0, opacity: 0.5 },
  blob1: {
    position: "absolute", top: "-12%", right: "-8%",
    width: 420, height: 420, borderRadius: "50%",
    background: "radial-gradient(circle, #bfdbfe 0%, transparent 70%)",
    filter: "blur(4px)",
  },
  blob2: {
    position: "absolute", bottom: "-16%", left: "-10%",
    width: 380, height: 380, borderRadius: "50%",
    background: "radial-gradient(circle, #93c5fd 0%, transparent 70%)",
    opacity: 0.6,
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 408,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    padding: "36px 34px 34px",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 26 },
  brandMark: {
    width: 32, height: 32, borderRadius: 9,
    background: "linear-gradient(135deg, var(--blue-600), var(--blue-800))",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 10px rgba(37,99,235,0.35)",
  },
  brandName: { fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" },
  eyebrow: {
    display: "inline-block", fontSize: 11, fontWeight: 700,
    color: "var(--blue-700)", background: "var(--blue-100)",
    padding: "4px 10px", borderRadius: 20, letterSpacing: "0.04em",
    textTransform: "uppercase", marginBottom: 12,
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800,
    color: "var(--ink)", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  subtitle: { fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 },
  footer: { position: "relative", zIndex: 1, marginTop: 22, fontSize: 12, color: "var(--ink-faint)" },
};

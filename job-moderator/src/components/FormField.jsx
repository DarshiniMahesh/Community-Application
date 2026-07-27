export function FormField({ label, icon: Icon, error, ...inputProps }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={16} style={styles.icon} />}
        <input
          {...inputProps}
          style={{
            ...styles.input,
            paddingLeft: Icon ? 40 : 14,
            borderColor: error ? "#f0a3a3" : "var(--border)",
          }}
        />
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

export function SubmitButton({ children, loading, ...rest }) {
  return (
    <button type="submit" disabled={loading} style={styles.button} {...rest}>
      {loading ? <span style={styles.spinner} /> : children}
    </button>
  );
}

const styles = {
  label: {
    display: "block", fontSize: 12.5, fontWeight: 600,
    color: "var(--ink-soft)", marginBottom: 7,
  },
  icon: {
    position: "absolute", left: 13, top: "50%",
    transform: "translateY(-50%)", color: "var(--ink-faint)",
  },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "12px 14px", fontSize: 14.5, color: "var(--ink)",
    background: "var(--bg-soft)", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)", outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  error: { fontSize: 12, color: "var(--red-text)", margin: "6px 0 0" },
  button: {
    width: "100%", padding: "13px 16px",
    background: "linear-gradient(135deg, var(--blue-600), var(--blue-700))",
    color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
    fontSize: 14.5, fontWeight: 700, letterSpacing: "0.01em",
    boxShadow: "0 6px 16px rgba(37,99,235,0.28)",
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: 46,
  },
  spinner: {
    width: 18, height: 18, borderRadius: "50%",
    border: "2.5px solid rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite",
  },
};

const styleTag = document.createElement("style");
styleTag.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
if (!document.head.querySelector("#jm-spin-kf")) {
  styleTag.id = "jm-spin-kf";
  document.head.appendChild(styleTag);
}

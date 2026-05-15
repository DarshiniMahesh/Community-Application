//sangha\src\app\sangha\sholarships\page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgeLimit = { min: number | ""; max: number | "" };
type GenderEligibility = "all" | "male" | "female" | "other";
type MaritalStatus =
  | "all"
  | "married"
  | "single_never_married"
  | "single_divorced"
  | "single_widowed";
type IncomeRange = { min: number | ""; max: number | "" };
type DocCoverage = "not_required" | "yes" | "no";

interface TieredAmount {
  id: string;
  label: string;
  amount: number | "";
  condition: string;
}

interface ScholarshipCriteria {
  ageLimit: AgeLimit;
  gender: GenderEligibility;
  disabilityRequired: boolean | null;
  maritalStatus: MaritalStatus;
  states: string[];
  districts: string[];
  educationLevels: string[];
  degrees: string[];
  universities: string[];
  meritBased: boolean | null;
  currentlyStudying: boolean | null;
  employmentStatus: "all" | "employed" | "unemployed" | "self_employed";
  annualFamilyIncome: IncomeRange;
  selfIncome: IncomeRange;
  ewsOnly: boolean | null;
  houseOwnership: "all" | "owns" | "rents" | "none";
  agriculturalFamily: boolean | null;
  vehicleOwnership: "all" | "no_vehicle" | "two_wheeler" | "four_wheeler";
  hasAssets: boolean | null;
  hasInvestments: boolean | null;
  aadhaarRequired: DocCoverage;
}

interface Scholarship {
  id: string;
  name: string;
  description: string;
  baseAmount: number | "";
  tieredAmounts: TieredAmount[];
  criteria: ScholarshipCriteria;
  status: "draft" | "active" | "closed";
  createdAt: string;
}

interface EligibleMember {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  age: number;
  marital_status: string;
  family_income: string;
  self_income: string;
  family_type: string;
  city: string;
  district: string;
  state: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyCriteria = (): ScholarshipCriteria => ({
  ageLimit: { min: "", max: "" },
  gender: "all",
  disabilityRequired: null,
  maritalStatus: "all",
  states: [],
  districts: [],
  educationLevels: [],
  degrees: [],
  universities: [],
  meritBased: null,
  currentlyStudying: null,
  employmentStatus: "all",
  annualFamilyIncome: { min: "", max: "" },
  selfIncome: { min: "", max: "" },
  ewsOnly: null,
  houseOwnership: "all",
  agriculturalFamily: null,
  vehicleOwnership: "all",
  hasAssets: null,
  hasInvestments: null,
  aadhaarRequired: "not_required",
});

const emptyScholarship = (): Scholarship => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  baseAmount: "",
  tieredAmounts: [],
  criteria: emptyCriteria(),
  status: "draft",
  createdAt: new Date().toISOString(),
});

// ─── Constants ────────────────────────────────────────────────────────────────

const EDUCATION_LEVELS = [
  "Below 10th",
  "10th / SSLC",
  "12th / PUC",
  "Diploma",
  "ITI",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctoral / PhD",
  "Post Doctoral",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

// ─── Global Styles ────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes toastProgress {
    from { width: 100%; }
    to   { width: 0%; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes sectionOpen {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .schol-card {
    animation: cardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
    transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  }
  .schol-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(83, 74, 183, 0.12), 0 2px 8px rgba(0,0,0,0.06);
    border-color: rgba(83, 74, 183, 0.3) !important;
  }

  .action-btn {
    transition: all 0.15s ease;
  }
  .action-btn:hover:not(:disabled) {
    filter: brightness(1.07);
    transform: translateY(-1px);
  }
  .action-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .primary-btn {
    background: linear-gradient(135deg, #534AB7 0%, #7B72D9 100%);
    box-shadow: 0 2px 12px rgba(83, 74, 183, 0.35);
    transition: all 0.2s ease;
  }
  .primary-btn:hover:not(:disabled) {
    box-shadow: 0 4px 20px rgba(83, 74, 183, 0.5);
    transform: translateY(-1px);
  }

  .section-body {
    animation: sectionOpen 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .stat-card {
    transition: all 0.2s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
  }

  input, textarea, select {
    font-family: 'DM Sans', sans-serif;
  }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, display: "flex", flexDirection: "column", gap: 10, zIndex: 9999, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: t.type === "success"
              ? "linear-gradient(135deg, #0F6E56, #1a9e7d)"
              : "linear-gradient(135deg, #C0392B, #e05a4b)",
            boxShadow: `0 8px 32px ${t.type === "success" ? "rgba(15,110,86,0.35)" : "rgba(192,57,43,0.35)"}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            maxWidth: 360,
            animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <i className={`ti ${t.type === "success" ? "ti-circle-check" : "ti-circle-x"}`} style={{ fontSize: 15 }} />
            </div>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
              <i className="ti ti-x" style={{ fontSize: 13 }} />
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.15)" }}>
            <div style={{ height: "100%", background: "rgba(255,255,255,0.5)", animation: "toastProgress 4s linear forwards" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const hue = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue}, 55%, 50%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 600, color: "#fff", flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {initials}
    </div>
  );
}

// ─── Eligible Members Modal ───────────────────────────────────────────────────

function EligibleMembersModal({ scholarship, onClose }: { scholarship: Scholarship; onClose: () => void }) {
  const [members, setMembers] = useState<EligibleMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ totalEligible: number; members: EligibleMember[] }>(
      `/sangha/scholarships/${scholarship.id}/eligible-members`
    )
      .then((data) => { setTotal(data.totalEligible); setMembers(data.members); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scholarship.id]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--color-background-primary)",
        borderRadius: 20,
        width: "100%", maxWidth: 740, maxHeight: "82vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: "0.5px solid var(--color-border-tertiary)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
        animation: "slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--color-background-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #534AB7, #7B72D9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-users-check" style={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "'DM Sans', sans-serif" }}>Eligible Members</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>{scholarship.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!loading && !error && (
              <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg, rgba(15,110,86,0.15), rgba(15,110,86,0.08))", color: "var(--color-text-success)", border: "0.5px solid rgba(15,110,86,0.2)" }}>
                {total} eligible
              </span>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: 12, color: "var(--color-text-secondary)", fontSize: 13, flexDirection: "column" }}>
              <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 28, color: "#534AB7" }} />
              <span>Checking eligibility across all members…</span>
            </div>
          )}
          {error && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-danger)", fontSize: 13 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.7 }} />
              {error}
            </div>
          )}
          {!loading && !error && members.length === 0 && (
            <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className="ti ti-users-minus" style={{ fontSize: 28 }} />
              </div>
              <p style={{ margin: 0, fontWeight: 500 }}>No members match the eligibility criteria</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.7 }}>Try relaxing some constraints to widen the pool.</p>
            </div>
          )}
          {!loading && !error && members.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              {members.map((m, i) => (
                <div key={m.profile_id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 24px",
                  borderBottom: i < members.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Avatar name={m.full_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.full_name || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {m.email || m.phone || "No contact info"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {m.age ? (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                        {m.age}y {m.gender ? `· ${m.gender}` : ""}
                      </span>
                    ) : null}
                    {(m.city || m.state) ? (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                        <i className="ti ti-map-pin" style={{ fontSize: 10, marginRight: 3 }} />
                        {[m.city, m.state].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {m.family_income ? (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(15,110,86,0.08)", color: "var(--color-text-success)", border: "0.5px solid rgba(15,110,86,0.15)", fontWeight: 500 }}>
                        ₹{Number(m.family_income).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, accent }: { title: string; icon: string; children: React.ReactNode; accent: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: "1rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          background: open ? "var(--color-background-secondary)" : "none",
          border: "none", borderBottom: open ? "0.5px solid var(--color-border-tertiary)" : "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 10,
          background: accent,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: `0 2px 8px ${accent}55`,
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: "#fff" }} aria-hidden />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", flex: 1, fontFamily: "'DM Sans', sans-serif" }}>
          {title}
        </span>
        <i
          className="ti ti-chevron-down"
          style={{ fontSize: 15, color: "var(--color-text-tertiary)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          aria-hidden
        />
      </button>
      {open && (
        <div className="section-body" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}

function RadioGroup<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 13px", fontSize: 12, borderRadius: 100,
            border: `0.5px solid ${value === o.value ? "#534AB7" : "var(--color-border-tertiary)"}`,
            background: value === o.value ? "linear-gradient(135deg, rgba(83,74,183,0.15), rgba(83,74,183,0.08))" : "var(--color-background-secondary)",
            color: value === o.value ? "#534AB7" : "var(--color-text-secondary)",
            cursor: "pointer", fontWeight: value === o.value ? 600 : 400,
            transition: "all 0.15s ease",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type TriOption = "any" | "yes" | "no";

function TriToggle({ value, onChange, yesLabel = "Required", noLabel = "Not required" }: { value: boolean | null; onChange: (v: boolean | null) => void; yesLabel?: string; noLabel?: string }) {
  const triValue: TriOption = value === null ? "any" : value ? "yes" : "no";
  const handleChange = (v: TriOption) => {
    if (v === "any") onChange(null);
    else if (v === "yes") onChange(true);
    else onChange(false);
  };
  return (
    <RadioGroup<TriOption>
      options={[{ label: "Any", value: "any" }, { label: yesLabel, value: "yes" }, { label: noLabel, value: "no" }]}
      value={triValue}
      onChange={handleChange}
    />
  );
}

function MultiSelect({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => toggle(o)}
          style={{
            padding: "4px 10px", fontSize: 12, borderRadius: 8,
            border: `0.5px solid ${value.includes(o) ? "rgba(15,110,86,0.35)" : "var(--color-border-tertiary)"}`,
            background: value.includes(o) ? "rgba(15,110,86,0.1)" : "var(--color-background-secondary)",
            color: value.includes(o) ? "var(--color-text-success)" : "var(--color-text-secondary)",
            cursor: "pointer", fontWeight: value.includes(o) ? 600 : 400,
            transition: "all 0.15s ease",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {value.includes(o) && <i className="ti ti-check" style={{ fontSize: 10, marginRight: 4 }} />}
          {o}
        </button>
      ))}
    </div>
  );
}

function NumberRange({ min, max, onMinChange, onMaxChange, placeholder }: { min: number | ""; max: number | ""; onMinChange: (v: number | "") => void; onMaxChange: (v: number | "") => void; placeholder?: { min?: string; max?: string } }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="number" placeholder={placeholder?.min ?? "Min"} value={min} onChange={(e) => onMinChange(e.target.value === "" ? "" : Number(e.target.value))} style={{ flex: 1, fontSize: 13 }} />
      <span style={{ color: "var(--color-text-tertiary)", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>—</span>
      <input type="number" placeholder={placeholder?.max ?? "Max"} value={max} onChange={(e) => onMaxChange(e.target.value === "" ? "" : Number(e.target.value))} style={{ flex: 1, fontSize: 13 }} />
    </div>
  );
}

// ─── Tiered Amount Editor ─────────────────────────────────────────────────────

function TieredAmountEditor({ items, onChange }: { items: TieredAmount[]; onChange: (v: TieredAmount[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), label: "", amount: "", condition: "" }]);
  const update = (id: string, patch: Partial<TieredAmount>) => onChange(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange(items.filter((t) => t.id !== id));

  return (
    <div>
      {items.map((item, idx) => (
        <div key={item.id} style={{
          display: "grid", gridTemplateColumns: "1fr 120px 1fr 34px", gap: 8, alignItems: "flex-start",
          marginBottom: 8, padding: "12px 14px",
          background: "var(--color-background-secondary)",
          borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)",
          animation: `cardIn 0.2s ${idx * 0.05}s both`,
        }}>
          <div>
            <Label>Tier label</Label>
            <input placeholder="e.g. Meritorious" value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} style={{ fontSize: 13 }} />
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <input type="number" placeholder="0" value={item.amount} onChange={(e) => update(item.id, { amount: e.target.value === "" ? "" : Number(e.target.value) })} style={{ fontSize: 13 }} />
          </div>
          <div>
            <Label>Condition / note</Label>
            <input placeholder="e.g. 90%+ marks" value={item.condition} onChange={(e) => update(item.id, { condition: e.target.value })} style={{ fontSize: 13 }} />
          </div>
          <button onClick={() => remove(item.id)} style={{ marginTop: 22, width: 34, height: 34, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "none", cursor: "pointer", color: "var(--color-text-danger)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Remove tier">
            <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden />
          </button>
        </div>
      ))}
      <button onClick={add} style={{ padding: "7px 16px", fontSize: 12, border: "1px dashed var(--color-border-secondary)", borderRadius: 10, background: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#534AB7"; e.currentTarget.style.color = "#534AB7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
      >
        <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden />
        Add tier
      </button>
    </div>
  );
}

// ─── Scholarship Form ─────────────────────────────────────────────────────────

function ScholarshipForm({ scholarship, onChange, onSave, onCancel, saving }: {
  scholarship: Scholarship;
  onChange: (s: Scholarship) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const c = scholarship.criteria;
  const updateCriteria = (patch: Partial<ScholarshipCriteria>) =>
    onChange({ ...scholarship, criteria: { ...c, ...patch } });

  return (
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      {/* Header info card */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "22px", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <Field label="Scholarship name">
          <input
            placeholder="e.g. Konkani Community Merit Scholarship 2025"
            value={scholarship.name}
            onChange={(e) => onChange({ ...scholarship, name: e.target.value })}
            style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, fontFamily: "'DM Serif Display', serif" }}
          />
        </Field>
        <Field label="Description / purpose">
          <textarea
            placeholder="Briefly describe the scholarship purpose, funding source, and who it benefits…"
            value={scholarship.description}
            onChange={(e) => onChange({ ...scholarship, description: e.target.value })}
            rows={3}
            style={{ fontSize: 13, resize: "vertical" }}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div>
            <Label>Base scholarship amount (₹)</Label>
            <input
              type="number" placeholder="10000"
              value={scholarship.baseAmount}
              onChange={(e) => onChange({ ...scholarship, baseAmount: e.target.value === "" ? "" : Number(e.target.value) })}
              style={{ fontSize: 16, fontWeight: 600 }}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select value={scholarship.status} onChange={(e) => onChange({ ...scholarship, status: e.target.value as Scholarship["status"] })} style={{ fontSize: 13 }}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Label>Tiered / conditional amounts</Label>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
            Add different amounts for different eligibility tiers (e.g. merit, income bracket, disability supplement).
          </p>
          <TieredAmountEditor items={scholarship.tieredAmounts} onChange={(v) => onChange({ ...scholarship, tieredAmounts: v })} />
        </div>
      </div>

      {/* Personal */}
      <SectionCard title="Personal Eligibility Criteria" icon="ti-user-check" accent="#534AB7">
        <Row>
          <Field label="Age range">
            <NumberRange min={c.ageLimit.min} max={c.ageLimit.max} onMinChange={(v) => updateCriteria({ ageLimit: { ...c.ageLimit, min: v } })} onMaxChange={(v) => updateCriteria({ ageLimit: { ...c.ageLimit, max: v } })} placeholder={{ min: "e.g. 14", max: "e.g. 25" }} />
          </Field>
          <Field label="Gender eligibility">
            <RadioGroup<GenderEligibility>
              options={[{ label: "All", value: "all" }, { label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }]}
              value={c.gender}
              onChange={(v) => updateCriteria({ gender: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Disability / special needs">
            <TriToggle value={c.disabilityRequired} onChange={(v) => updateCriteria({ disabilityRequired: v })} yesLabel="Must have" noLabel="Must not have" />
          </Field>
          <Field label="Marital status">
            <RadioGroup<MaritalStatus>
              options={[{ label: "All", value: "all" }, { label: "Married", value: "married" }, { label: "Single", value: "single_never_married" }, { label: "Divorced", value: "single_divorced" }, { label: "Widowed", value: "single_widowed" }]}
              value={c.maritalStatus}
              onChange={(v) => updateCriteria({ maritalStatus: v })}
            />
          </Field>
        </Row>
      </SectionCard>

      {/* Residential */}
      <SectionCard title="Residential & Regional Criteria" icon="ti-map-pin" accent="#993C1D">
        <Field label="State eligibility (leave empty for all)">
          <MultiSelect options={INDIAN_STATES} value={c.states} onChange={(v) => updateCriteria({ states: v })} />
        </Field>
        <Field label="District eligibility (comma-separated, optional)">
          <input placeholder="e.g. Udupi, Mangaluru, South Canara" value={c.districts.join(", ")} onChange={(e) => updateCriteria({ districts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={{ fontSize: 13 }} />
        </Field>
      </SectionCard>

      {/* Academic */}
      <SectionCard title="Academic & Education Criteria" icon="ti-school" accent="#185FA5">
        <Field label="Current education level">
          <MultiSelect options={EDUCATION_LEVELS} value={c.educationLevels} onChange={(v) => updateCriteria({ educationLevels: v })} />
        </Field>
        <Field label="Degree / course eligibility (comma-separated)">
          <input placeholder="e.g. B.E., MBBS, B.Ed (leave blank for all)" value={c.degrees.join(", ")} onChange={(e) => updateCriteria({ degrees: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={{ fontSize: 13 }} />
        </Field>
        <Field label="University / institution verification (comma-separated)">
          <input placeholder="e.g. Mangalore University, IIT Bombay (leave blank for all)" value={c.universities.join(", ")} onChange={(e) => updateCriteria({ universities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={{ fontSize: 13 }} />
        </Field>
        <Row>
          <Field label="Merit-based eligibility">
            <TriToggle value={c.meritBased} onChange={(v) => updateCriteria({ meritBased: v })} yesLabel="Yes — merit filter" noLabel="Not merit-based" />
          </Field>
          <Field label="Currently studying status">
            <TriToggle value={c.currentlyStudying} onChange={(v) => updateCriteria({ currentlyStudying: v })} yesLabel="Must be studying" noLabel="Not required" />
          </Field>
        </Row>
        <Field label="Employment status">
          <RadioGroup<ScholarshipCriteria["employmentStatus"]>
            options={[{ label: "Any", value: "all" }, { label: "Employed", value: "employed" }, { label: "Unemployed", value: "unemployed" }, { label: "Self-employed", value: "self_employed" }]}
            value={c.employmentStatus}
            onChange={(v) => updateCriteria({ employmentStatus: v })}
          />
        </Field>
      </SectionCard>

      {/* Financial */}
      <SectionCard title="Financial & Economic Criteria" icon="ti-currency-rupee" accent="#854F0B">
        <Row>
          <Field label="Annual family income (₹)">
            <NumberRange min={c.annualFamilyIncome.min} max={c.annualFamilyIncome.max} onMinChange={(v) => updateCriteria({ annualFamilyIncome: { ...c.annualFamilyIncome, min: v } })} onMaxChange={(v) => updateCriteria({ annualFamilyIncome: { ...c.annualFamilyIncome, max: v } })} placeholder={{ min: "Min ₹", max: "Max ₹" }} />
          </Field>
          <Field label="Individual self income (₹)">
            <NumberRange min={c.selfIncome.min} max={c.selfIncome.max} onMinChange={(v) => updateCriteria({ selfIncome: { ...c.selfIncome, min: v } })} onMaxChange={(v) => updateCriteria({ selfIncome: { ...c.selfIncome, max: v } })} placeholder={{ min: "Min ₹", max: "Max ₹" }} />
          </Field>
        </Row>
        <Row>
          <Field label="EWS (Economically Weaker Section) only">
            <TriToggle value={c.ewsOnly} onChange={(v) => updateCriteria({ ewsOnly: v })} yesLabel="EWS only" noLabel="Not restricted" />
          </Field>
          <Field label="House ownership status">
            <RadioGroup<ScholarshipCriteria["houseOwnership"]>
              options={[{ label: "Any", value: "all" }, { label: "Owns", value: "owns" }, { label: "Renting", value: "rents" }, { label: "None", value: "none" }]}
              value={c.houseOwnership}
              onChange={(v) => updateCriteria({ houseOwnership: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Agricultural family background">
            <TriToggle value={c.agriculturalFamily} onChange={(v) => updateCriteria({ agriculturalFamily: v })} yesLabel="Must be agri" noLabel="Non-agri only" />
          </Field>
          <Field label="Vehicle ownership verification">
            <RadioGroup<ScholarshipCriteria["vehicleOwnership"]>
              options={[{ label: "Any", value: "all" }, { label: "No vehicle", value: "no_vehicle" }, { label: "2-wheeler", value: "two_wheeler" }, { label: "4-wheeler", value: "four_wheeler" }]}
              value={c.vehicleOwnership}
              onChange={(v) => updateCriteria({ vehicleOwnership: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Asset-based financial screening">
            <TriToggle value={c.hasAssets} onChange={(v) => updateCriteria({ hasAssets: v })} yesLabel="Must have assets" noLabel="Must not have assets" />
          </Field>
          <Field label="Investment-based financial screening">
            <TriToggle value={c.hasInvestments} onChange={(v) => updateCriteria({ hasInvestments: v })} yesLabel="Must have investments" noLabel="Must not have investments" />
          </Field>
        </Row>
        <Field label="Aadhaar verification requirement">
          <RadioGroup<DocCoverage>
            options={[{ label: "Not required", value: "not_required" }, { label: "Must have Aadhaar", value: "yes" }, { label: "No Aadhaar", value: "no" }]}
            value={c.aadhaarRequired}
            onChange={(v) => updateCriteria({ aadhaarRequired: v })}
          />
        </Field>
      </SectionCard>

      {/* Sticky action bar */}
      <div style={{
        position: "sticky", bottom: 0, zIndex: 10,
        display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 0 8px",
        background: "linear-gradient(to top, var(--color-background-primary) 70%, transparent)",
      }}>
        <button
          onClick={onCancel} disabled={saving}
          className="action-btn"
          style={{ padding: "9px 22px", fontSize: 13, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "none", cursor: saving ? "not-allowed" : "pointer", color: "var(--color-text-secondary)", opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
        >
          Cancel
        </button>
        <button
          onClick={onSave} disabled={saving}
          className="action-btn primary-btn"
          style={{ padding: "9px 26px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 10, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}
        >
          {saving && <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 14 }} />}
          {saving ? "Saving…" : "Save scholarship"}
        </button>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function statusBadge(status: Scholarship["status"]) {
  const map: Record<Scholarship["status"], { bg: string; color: string; border: string; label: string; dot?: boolean }> = {
    draft: { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "var(--color-border-tertiary)", label: "Draft" },
    active: { bg: "rgba(15,110,86,0.1)", color: "var(--color-text-success)", border: "rgba(15,110,86,0.25)", label: "Active", dot: true },
    closed: { bg: "rgba(192,57,43,0.08)", color: "var(--color-text-danger)", border: "rgba(192,57,43,0.2)", label: "Closed" },
  };
  const s = map[status];
  return (
    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
      {s.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "pulse 2s infinite" }} />}
      {s.label}
    </span>
  );
}

// ─── Criteria Chips ───────────────────────────────────────────────────────────

function criteriaChips(c: ScholarshipCriteria): { label: string; icon: string }[] {
  const chips: { label: string; icon: string }[] = [];
  if (c.ageLimit.min !== "" || c.ageLimit.max !== "")
    chips.push({ label: `Age ${c.ageLimit.min !== "" ? c.ageLimit.min : "any"}–${c.ageLimit.max !== "" ? c.ageLimit.max : "any"}`, icon: "ti-user" });
  if (c.gender !== "all")
    chips.push({ label: `${c.gender.charAt(0).toUpperCase() + c.gender.slice(1)} only`, icon: "ti-gender-bigender" });
  if (c.maritalStatus !== "all")
    chips.push({ label: c.maritalStatus.replace(/_/g, " "), icon: "ti-heart" });
  if (c.states.length)
    chips.push({ label: `${c.states.length} state${c.states.length > 1 ? "s" : ""}`, icon: "ti-map-pin" });
  if (c.educationLevels.length)
    chips.push({ label: `${c.educationLevels.length} edu level${c.educationLevels.length > 1 ? "s" : ""}`, icon: "ti-school" });
  if (c.ewsOnly === true)
    chips.push({ label: "EWS only", icon: "ti-currency-rupee" });
  if (c.currentlyStudying === true)
    chips.push({ label: "Must be studying", icon: "ti-book" });
  if (c.annualFamilyIncome.max !== "")
    chips.push({ label: `Income ≤ ₹${Number(c.annualFamilyIncome.max).toLocaleString("en-IN")}`, icon: "ti-coins" });
  return chips.slice(0, 5);
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────

function ScholarshipCard({ scholarship, onEdit, onDelete, onViewEligible, deleting, index }: {
  scholarship: Scholarship;
  onEdit: () => void;
  onDelete: () => void;
  onViewEligible: () => void;
  deleting: boolean;
  index: number;
}) {
  const chips = criteriaChips(scholarship.criteria);
  return (
    <div
      className="schol-card"
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 16, padding: "18px 20px", marginBottom: "0.75rem",
        opacity: deleting ? 0.5 : 1,
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
              {scholarship.name || "Unnamed scholarship"}
            </span>
            {statusBadge(scholarship.status)}
          </div>
          {scholarship.description && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {scholarship.description}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {scholarship.baseAmount !== "" && (
            <div style={{
              fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)",
              fontFamily: "'DM Serif Display', serif",
              background: "linear-gradient(135deg, #534AB7, #7B72D9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              ₹{Number(scholarship.baseAmount).toLocaleString("en-IN")}
            </div>
          )}
          {scholarship.tieredAmounts.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
              +{scholarship.tieredAmounts.length} tier{scholarship.tieredAmounts.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {chips.map((chip) => (
            <span key={chip.label} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
              <i className={`ti ${chip.icon}`} style={{ fontSize: 10, opacity: 0.7 }} />
              {chip.label}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} disabled={deleting} className="action-btn"
          style={{ padding: "5px 13px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
          <i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden /> Edit
        </button>

        {scholarship.status === "active" && (
          <button onClick={onViewEligible} disabled={deleting} className="action-btn"
            style={{ padding: "5px 13px", fontSize: 12, border: "0.5px solid #534AB7", borderRadius: 8, background: "linear-gradient(135deg, rgba(83,74,183,0.1), rgba(83,74,183,0.06))", cursor: "pointer", color: "#534AB7", display: "flex", alignItems: "center", gap: 5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
            <i className="ti ti-users-check" style={{ fontSize: 13 }} aria-hidden /> Eligible members
          </button>
        )}

        <button onClick={onDelete} disabled={deleting} className="action-btn"
          style={{ padding: "5px 13px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, background: "none", cursor: deleting ? "not-allowed" : "pointer", color: "var(--color-text-danger)", display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
          {deleting ? <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} /> : <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden />}
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, accent }: { label: string; value: number; icon: string; color: string; accent: string }) {
  return (
    <div className="stat-card" style={{
      background: "var(--color-background-secondary)",
      borderRadius: 14, padding: "14px 18px",
      border: "0.5px solid var(--color-border-tertiary)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 17, color: "#fff" }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScholarshipPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [eligibleFor, setEligibleFor] = useState<Scholarship | null>(null);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  const fetchScholarships = useCallback(async () => {
    try {
      const data = await apiFetch<Scholarship[]>("/sangha/scholarships");
      setScholarships(data);
    } catch (e) {
      pushToast("error", (e as Error).message || "Failed to load scholarships");
    } finally {
      setPageLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchScholarships(); }, [fetchScholarships]);

  const startCreate = () => { setEditing(emptyScholarship()); setIsCreating(true); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isCreating) {
        const created = await apiFetch<Scholarship>("/sangha/scholarships", { method: "POST", body: JSON.stringify(editing) });
        setScholarships((prev) => [created, ...prev]);
        pushToast("success", "Scholarship created successfully");
      } else {
        const updated = await apiFetch<Scholarship>(`/sangha/scholarships/${editing.id}`, { method: "PUT", body: JSON.stringify(editing) });
        setScholarships((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        pushToast("success", "Scholarship updated successfully");
      }
      setEditing(null);
      setIsCreating(false);
    } catch (e) {
      pushToast("error", (e as Error).message || "Failed to save scholarship");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setEditing(null); setIsCreating(false); };
  const handleEdit = (s: Scholarship) => { setEditing({ ...s }); setIsCreating(false); };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this scholarship? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/sangha/scholarships/${id}`, { method: "DELETE" });
      setScholarships((prev) => prev.filter((s) => s.id !== id));
      pushToast("success", "Scholarship deleted");
    } catch (e) {
      pushToast("error", (e as Error).message || "Failed to delete scholarship");
    } finally {
      setDeletingId(null);
    }
  };

  void isCreating;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1rem", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Hero Header ── */}
        <div style={{
          position: "relative", borderRadius: 20, padding: "28px 28px 24px",
          marginBottom: "1.75rem", overflow: "hidden",
          background: "linear-gradient(135deg, #2D2870 0%, #534AB7 50%, #7B72D9 100%)",
          boxShadow: "0 8px 32px rgba(83,74,183,0.3)",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -20, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(255,255,255,0.25)" }}>
                <i className="ti ti-award" style={{ fontSize: 24, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 400, color: "#fff", margin: 0, fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.01em" }}>
                  Scholarships
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", margin: "4px 0 0", fontWeight: 400 }}>
                  Define eligibility criteria and manage your scholarship programmes
                </p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={startCreate}
                className="action-btn"
                style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600, border: "0.5px solid rgba(255,255,255,0.35)", borderRadius: 12, background: "rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, backdropFilter: "blur(8px)", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}
              >
                <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden />
                New scholarship
              </button>
            )}
          </div>
        </div>

        {/* ── Form ── */}
        {editing && (
          <ScholarshipForm scholarship={editing} onChange={setEditing} onSave={handleSave} onCancel={handleCancel} saving={saving} />
        )}

        {/* ── List ── */}
        {!editing && (
          <>
            {pageLoading ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--color-text-tertiary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, rgba(83,74,183,0.15), rgba(83,74,183,0.06))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 24, color: "#534AB7" }} aria-hidden />
                </div>
                <p style={{ fontSize: 14, margin: 0 }}>Loading scholarships…</p>
              </div>
            ) : scholarships.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed var(--color-border-secondary)", borderRadius: 20, color: "var(--color-text-tertiary)" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, rgba(83,74,183,0.1), rgba(83,74,183,0.05))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "0.5px solid rgba(83,74,183,0.15)" }}>
                  <i className="ti ti-award" style={{ fontSize: 32, color: "#534AB7", opacity: 0.7 }} aria-hidden />
                </div>
                <p style={{ fontSize: 15, margin: "0 0 6px", fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'DM Serif Display', serif" }}>No scholarships yet</p>
                <p style={{ fontSize: 13, margin: "0 0 20px", opacity: 0.7 }}>Create your first scholarship to start matching eligible members.</p>
                <button onClick={startCreate} className="action-btn primary-btn" style={{ padding: "9px 22px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}>
                  <i className="ti ti-plus" style={{ fontSize: 15 }} />
                  New scholarship
                </button>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
                  <StatCard label="Total" value={scholarships.length} icon="ti-award" color="var(--color-text-primary)" accent="#534AB7" />
                  <StatCard label="Active" value={scholarships.filter((s) => s.status === "active").length} icon="ti-circle-check" color="var(--color-text-success)" accent="#0F6E56" />
                  <StatCard label="Draft" value={scholarships.filter((s) => s.status === "draft").length} icon="ti-pencil" color="var(--color-text-secondary)" accent="#64748b" />
                </div>

                {scholarships.map((s, i) => (
                  <ScholarshipCard
                    key={s.id}
                    scholarship={s}
                    index={i}
                    onEdit={() => handleEdit(s)}
                    onDelete={() => handleDelete(s.id)}
                    onViewEligible={() => setEligibleFor(s)}
                    deleting={deletingId === s.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {eligibleFor && <EligibleMembersModal scholarship={eligibleFor} onClose={() => setEligibleFor(null)} />}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
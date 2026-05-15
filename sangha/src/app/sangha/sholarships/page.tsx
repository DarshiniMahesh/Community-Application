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
type FamilyType = "all" | "nuclear" | "joint";
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
  maxFamilySize: number | "";
  maxDependents: number | "";
  singleParentOnly: boolean | null;
  disabledFamilyMember: boolean | null;
  familyType: FamilyType;
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
  // Token is stored under "token" by the existing sangha login flow
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
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
  maxFamilySize: "",
  maxDependents: "",
  singleParentOnly: null,
  disabledFamilyMember: null,
  familyType: "all",
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
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            padding: "10px 16px",
            borderRadius: "var(--border-radius-md)",
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: t.type === "success" ? "#0F6E56" : "#C0392B",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 340,
            animation: "slideUp 0.2s ease",
          }}
        >
          <i
            className={`ti ${t.type === "success" ? "ti-circle-check" : "ti-circle-x"}`}
            style={{ fontSize: 16, flexShrink: 0 }}
          />
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
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

// ─── Eligible Members Modal ───────────────────────────────────────────────────

function EligibleMembersModal({
  scholarship,
  onClose,
}: {
  scholarship: Scholarship;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<EligibleMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ totalEligible: number; members: EligibleMember[] }>(
      `/sangha/scholarships/${scholarship.id}/eligible-members`
    )
      .then((data) => {
        setTotal(data.totalEligible);
        setMembers(data.members);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scholarship.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: "var(--border-radius-lg)",
          width: "100%",
          maxWidth: 720,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                marginBottom: 2,
              }}
            >
              Eligible Members
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {scholarship.name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!loading && !error && (
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "var(--color-background-success)",
                  color: "var(--color-text-success)",
                }}
              >
                {total} eligible
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                background: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
              }}
            >
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                gap: 10,
                color: "var(--color-text-secondary)",
                fontSize: 13,
              }}
            >
              <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 18 }} />
              Checking eligibility…
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-text-danger)",
                fontSize: 13,
              }}
            >
              <i className="ti ti-alert-circle" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
              {error}
            </div>
          )}
          {!loading && !error && members.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--color-text-tertiary)",
                fontSize: 13,
              }}
            >
              <i
                className="ti ti-users-minus"
                style={{ fontSize: 36, display: "block", marginBottom: 10 }}
              />
              No approved members match the eligibility criteria.
            </div>
          )}
          {!loading && !error && members.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--color-background-secondary)",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {["Name", "Contact", "Age / Gender", "Location", "Income (Family)"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 16px",
                          textAlign: "left",
                          fontWeight: 500,
                          color: "var(--color-text-secondary)",
                          borderBottom: "0.5px solid var(--color-border-tertiary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr
                    key={m.profile_id}
                    style={{
                      background:
                        i % 2 === 0
                          ? "var(--color-background-primary)"
                          : "var(--color-background-secondary)",
                    }}
                  >
                    <td
                      style={{
                        padding: "9px 16px",
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                      }}
                    >
                      {m.full_name || "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px",
                        color: "var(--color-text-secondary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                      }}
                    >
                      {m.email || m.phone || "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px",
                        color: "var(--color-text-secondary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.age ? `${m.age} yrs` : "—"}
                      {m.gender ? ` · ${m.gender}` : ""}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px",
                        color: "var(--color-text-secondary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                      }}
                    >
                      {[m.city, m.district, m.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td
                      style={{
                        padding: "9px 16px",
                        color: "var(--color-text-secondary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.family_income
                        ? `₹${Number(m.family_income).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents (unchanged visually) ──────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accent: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          background: "none",
          border: "none",
          borderBottom: open ? "0.5px solid var(--color-border-tertiary)" : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: "#fff" }} aria-hidden />
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            flex: 1,
          }}
        >
          {title}
        </span>
        <i
          className="ti ti-chevron-down"
          style={{
            fontSize: 16,
            color: "var(--color-text-secondary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
          aria-hidden
        />
      </button>
      {open && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        display: "block",
        marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {children}
    </div>
  );
}

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 12px",
            fontSize: 13,
            borderRadius: 100,
            border: `0.5px solid ${
              value === o.value ? "var(--color-border-info)" : "var(--color-border-tertiary)"
            }`,
            background:
              value === o.value
                ? "var(--color-background-info)"
                : "var(--color-background-secondary)",
            color:
              value === o.value ? "var(--color-text-info)" : "var(--color-text-secondary)",
            cursor: "pointer",
            fontWeight: value === o.value ? 500 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type TriOption = "any" | "yes" | "no";

function TriToggle({
  value,
  onChange,
  yesLabel = "Required",
  noLabel = "Not required",
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  yesLabel?: string;
  noLabel?: string;
}) {
  const triValue: TriOption = value === null ? "any" : value ? "yes" : "no";
  const handleChange = (v: TriOption) => {
    if (v === "any") onChange(null);
    else if (v === "yes") onChange(true);
    else onChange(false);
  };
  return (
    <RadioGroup<TriOption>
      options={[
        { label: "Any", value: "any" },
        { label: yesLabel, value: "yes" },
        { label: noLabel, value: "no" },
      ]}
      value={triValue}
      onChange={handleChange}
    />
  );
}

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => toggle(o)}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 6,
            border: `0.5px solid ${
              value.includes(o) ? "var(--color-border-success)" : "var(--color-border-tertiary)"
            }`,
            background: value.includes(o)
              ? "var(--color-background-success)"
              : "var(--color-background-secondary)",
            color: value.includes(o)
              ? "var(--color-text-success)"
              : "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function NumberRange({
  min,
  max,
  onMinChange,
  onMaxChange,
  placeholder,
}: {
  min: number | "";
  max: number | "";
  onMinChange: (v: number | "") => void;
  onMaxChange: (v: number | "") => void;
  placeholder?: { min?: string; max?: string };
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="number"
        placeholder={placeholder?.min ?? "Min"}
        value={min}
        onChange={(e) =>
          onMinChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        style={{ flex: 1, fontSize: 13 }}
      />
      <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>to</span>
      <input
        type="number"
        placeholder={placeholder?.max ?? "Max"}
        value={max}
        onChange={(e) =>
          onMaxChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        style={{ flex: 1, fontSize: 13 }}
      />
    </div>
  );
}

// ─── Tiered Amount Editor ─────────────────────────────────────────────────────

function TieredAmountEditor({
  items,
  onChange,
}: {
  items: TieredAmount[];
  onChange: (v: TieredAmount[]) => void;
}) {
  const add = () =>
    onChange([
      ...items,
      { id: crypto.randomUUID(), label: "", amount: "", condition: "" },
    ]);
  const update = (id: string, patch: Partial<TieredAmount>) =>
    onChange(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange(items.filter((t) => t.id !== id));

  return (
    <div>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 1fr 32px",
            gap: 8,
            alignItems: "flex-start",
            marginBottom: 8,
            padding: "10px 12px",
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-tertiary)",
          }}
        >
          <div>
            <Label>Tier label</Label>
            <input
              placeholder="e.g. Meritorious"
              value={item.label}
              onChange={(e) => update(item.id, { label: e.target.value })}
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <input
              type="number"
              placeholder="0"
              value={item.amount}
              onChange={(e) =>
                update(item.id, {
                  amount: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <Label>Condition / note</Label>
            <input
              placeholder="e.g. 90%+ marks"
              value={item.condition}
              onChange={(e) => update(item.id, { condition: e.target.value })}
              style={{ fontSize: 13 }}
            />
          </div>
          <button
            onClick={() => remove(item.id)}
            style={{
              marginTop: 20,
              width: 32,
              height: 32,
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: "none",
              cursor: "pointer",
              color: "var(--color-text-danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Remove tier"
          >
            <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        style={{
          padding: "6px 14px",
          fontSize: 12,
          border: "0.5px dashed var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)",
          background: "none",
          cursor: "pointer",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden />
        Add tier
      </button>
    </div>
  );
}

// ─── Scholarship Form ─────────────────────────────────────────────────────────

function ScholarshipForm({
  scholarship,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
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
    <div>
      {/* Header info */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "20px",
          marginBottom: "1rem",
        }}
      >
        <Field label="Scholarship name">
          <input
            placeholder="e.g. Konkani Community Merit Scholarship 2025"
            value={scholarship.name}
            onChange={(e) => onChange({ ...scholarship, name: e.target.value })}
            style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}
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
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}
        >
          <div>
            <Label>Base scholarship amount (₹)</Label>
            <input
              type="number"
              placeholder="10000"
              value={scholarship.baseAmount}
              onChange={(e) =>
                onChange({
                  ...scholarship,
                  baseAmount: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              style={{ fontSize: 15 }}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={scholarship.status}
              onChange={(e) =>
                onChange({ ...scholarship, status: e.target.value as Scholarship["status"] })
              }
              style={{ fontSize: 13 }}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Label>Tiered / conditional amounts</Label>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
            Add different amounts for different eligibility tiers (e.g. merit, income bracket,
            disability supplement).
          </p>
          <TieredAmountEditor
            items={scholarship.tieredAmounts}
            onChange={(v) => onChange({ ...scholarship, tieredAmounts: v })}
          />
        </div>
      </div>

      {/* Personal */}
      <SectionCard title="Personal Eligibility Criteria" icon="ti-user-check" accent="#534AB7">
        <Row>
          <Field label="Age range">
            <NumberRange
              min={c.ageLimit.min}
              max={c.ageLimit.max}
              onMinChange={(v) => updateCriteria({ ageLimit: { ...c.ageLimit, min: v } })}
              onMaxChange={(v) => updateCriteria({ ageLimit: { ...c.ageLimit, max: v } })}
              placeholder={{ min: "e.g. 14", max: "e.g. 25" }}
            />
          </Field>
          <Field label="Gender eligibility">
            <RadioGroup<GenderEligibility>
              options={[
                { label: "All", value: "all" },
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
                { label: "Other", value: "other" },
              ]}
              value={c.gender}
              onChange={(v) => updateCriteria({ gender: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Disability / special needs">
            <TriToggle
              value={c.disabilityRequired}
              onChange={(v) => updateCriteria({ disabilityRequired: v })}
              yesLabel="Must have"
              noLabel="Must not have"
            />
          </Field>
          <Field label="Marital status">
            <RadioGroup<MaritalStatus>
              options={[
                { label: "All", value: "all" },
                { label: "Married", value: "married" },
                { label: "Single", value: "single_never_married" },
                { label: "Divorced", value: "single_divorced" },
                { label: "Widowed", value: "single_widowed" },
              ]}
              value={c.maritalStatus}
              onChange={(v) => updateCriteria({ maritalStatus: v })}
            />
          </Field>
        </Row>
      </SectionCard>

      {/* Family */}
      <SectionCard
        title="Family & Social Background Criteria"
        icon="ti-users"
        accent="#0F6E56"
      >
        <Row>
          <Field label="Max family size">
            <input
              type="number"
              placeholder="e.g. 6 (leave blank for any)"
              value={c.maxFamilySize}
              onChange={(e) =>
                updateCriteria({
                  maxFamilySize: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              style={{ fontSize: 13 }}
            />
          </Field>
          <Field label="Max number of dependents">
            <input
              type="number"
              placeholder="e.g. 4 (leave blank for any)"
              value={c.maxDependents}
              onChange={(e) =>
                updateCriteria({
                  maxDependents: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              style={{ fontSize: 13 }}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Single-parent family only">
            <TriToggle
              value={c.singleParentOnly}
              onChange={(v) => updateCriteria({ singleParentOnly: v })}
              yesLabel="Yes, only"
              noLabel="Excluded"
            />
          </Field>
          <Field label="Disabled family member">
            <TriToggle
              value={c.disabledFamilyMember}
              onChange={(v) => updateCriteria({ disabledFamilyMember: v })}
              yesLabel="Must have"
              noLabel="Not required"
            />
          </Field>
        </Row>
        <Field label="Family structure (verification)">
          <RadioGroup<FamilyType>
            options={[
              { label: "All types", value: "all" },
              { label: "Nuclear only", value: "nuclear" },
              { label: "Joint only", value: "joint" },
            ]}
            value={c.familyType}
            onChange={(v) => updateCriteria({ familyType: v })}
          />
        </Field>
      </SectionCard>

      {/* Residential */}
      <SectionCard
        title="Residential & Regional Criteria"
        icon="ti-map-pin"
        accent="#993C1D"
      >
        <Field label="State eligibility (leave empty for all)">
          <MultiSelect
            options={INDIAN_STATES}
            value={c.states}
            onChange={(v) => updateCriteria({ states: v })}
          />
        </Field>
        <Field label="District eligibility (comma-separated, optional)">
          <input
            placeholder="e.g. Udupi, Mangaluru, South Canara"
            value={c.districts.join(", ")}
            onChange={(e) =>
              updateCriteria({
                districts: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            style={{ fontSize: 13 }}
          />
        </Field>
      </SectionCard>

      {/* Academic */}
      <SectionCard title="Academic & Education Criteria" icon="ti-school" accent="#185FA5">
        <Field label="Current education level">
          <MultiSelect
            options={EDUCATION_LEVELS}
            value={c.educationLevels}
            onChange={(v) => updateCriteria({ educationLevels: v })}
          />
        </Field>
        <Field label="Degree / course eligibility (comma-separated)">
          <input
            placeholder="e.g. B.E., MBBS, B.Ed (leave blank for all)"
            value={c.degrees.join(", ")}
            onChange={(e) =>
              updateCriteria({
                degrees: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            style={{ fontSize: 13 }}
          />
        </Field>
        <Field label="University / institution verification (comma-separated)">
          <input
            placeholder="e.g. Mangalore University, IIT Bombay (leave blank for all)"
            value={c.universities.join(", ")}
            onChange={(e) =>
              updateCriteria({
                universities: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            style={{ fontSize: 13 }}
          />
        </Field>
        <Row>
          <Field label="Merit-based eligibility">
            <TriToggle
              value={c.meritBased}
              onChange={(v) => updateCriteria({ meritBased: v })}
              yesLabel="Yes — merit filter"
              noLabel="Not merit-based"
            />
          </Field>
          <Field label="Currently studying status">
            <TriToggle
              value={c.currentlyStudying}
              onChange={(v) => updateCriteria({ currentlyStudying: v })}
              yesLabel="Must be studying"
              noLabel="Not required"
            />
          </Field>
        </Row>
        <Field label="Employment status">
          <RadioGroup<ScholarshipCriteria["employmentStatus"]>
            options={[
              { label: "Any", value: "all" },
              { label: "Employed", value: "employed" },
              { label: "Unemployed", value: "unemployed" },
              { label: "Self-employed", value: "self_employed" },
            ]}
            value={c.employmentStatus}
            onChange={(v) => updateCriteria({ employmentStatus: v })}
          />
        </Field>
      </SectionCard>

      {/* Financial */}
      <SectionCard
        title="Financial & Economic Criteria"
        icon="ti-currency-rupee"
        accent="#854F0B"
      >
        <Row>
          <Field label="Annual family income (₹)">
            <NumberRange
              min={c.annualFamilyIncome.min}
              max={c.annualFamilyIncome.max}
              onMinChange={(v) =>
                updateCriteria({ annualFamilyIncome: { ...c.annualFamilyIncome, min: v } })
              }
              onMaxChange={(v) =>
                updateCriteria({ annualFamilyIncome: { ...c.annualFamilyIncome, max: v } })
              }
              placeholder={{ min: "Min ₹", max: "Max ₹" }}
            />
          </Field>
          <Field label="Individual self income (₹)">
            <NumberRange
              min={c.selfIncome.min}
              max={c.selfIncome.max}
              onMinChange={(v) =>
                updateCriteria({ selfIncome: { ...c.selfIncome, min: v } })
              }
              onMaxChange={(v) =>
                updateCriteria({ selfIncome: { ...c.selfIncome, max: v } })
              }
              placeholder={{ min: "Min ₹", max: "Max ₹" }}
            />
          </Field>
        </Row>
        <Row>
          <Field label="EWS (Economically Weaker Section) only">
            <TriToggle
              value={c.ewsOnly}
              onChange={(v) => updateCriteria({ ewsOnly: v })}
              yesLabel="EWS only"
              noLabel="Not restricted"
            />
          </Field>
          <Field label="House ownership status">
            <RadioGroup<ScholarshipCriteria["houseOwnership"]>
              options={[
                { label: "Any", value: "all" },
                { label: "Owns house", value: "owns" },
                { label: "Renting", value: "rents" },
                { label: "No house", value: "none" },
              ]}
              value={c.houseOwnership}
              onChange={(v) => updateCriteria({ houseOwnership: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Agricultural family background">
            <TriToggle
              value={c.agriculturalFamily}
              onChange={(v) => updateCriteria({ agriculturalFamily: v })}
              yesLabel="Must be agri"
              noLabel="Non-agri only"
            />
          </Field>
          <Field label="Vehicle ownership verification">
            <RadioGroup<ScholarshipCriteria["vehicleOwnership"]>
              options={[
                { label: "Any", value: "all" },
                { label: "No vehicle", value: "no_vehicle" },
                { label: "2-wheeler only", value: "two_wheeler" },
                { label: "Has 4-wheeler", value: "four_wheeler" },
              ]}
              value={c.vehicleOwnership}
              onChange={(v) => updateCriteria({ vehicleOwnership: v })}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Asset-based financial screening">
            <TriToggle
              value={c.hasAssets}
              onChange={(v) => updateCriteria({ hasAssets: v })}
              yesLabel="Must have assets"
              noLabel="Must not have assets"
            />
          </Field>
          <Field label="Investment-based financial screening">
            <TriToggle
              value={c.hasInvestments}
              onChange={(v) => updateCriteria({ hasInvestments: v })}
              yesLabel="Must have investments"
              noLabel="Must not have investments"
            />
          </Field>
        </Row>
        <Field label="Aadhaar verification requirement">
          <RadioGroup<DocCoverage>
            options={[
              { label: "Not required", value: "not_required" },
              { label: "Must have Aadhaar", value: "yes" },
              { label: "No Aadhaar", value: "no" },
            ]}
            value={c.aadhaarRequired}
            onChange={(v) => updateCriteria({ aadhaarRequired: v })}
          />
        </Field>
      </SectionCard>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: 8 }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            background: "none",
            cursor: saving ? "not-allowed" : "pointer",
            color: "var(--color-text-secondary)",
            opacity: saving ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: "8px 24px",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            borderRadius: "var(--border-radius-md)",
            background: "#534AB7",
            color: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {saving && <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 14 }} />}
          {saving ? "Saving…" : "Save scholarship"}
        </button>
      </div>
    </div>
  );
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────

function statusBadge(status: Scholarship["status"]) {
  const map: Record<Scholarship["status"], { bg: string; color: string; label: string }> = {
    draft: {
      bg: "var(--color-background-secondary)",
      color: "var(--color-text-secondary)",
      label: "Draft",
    },
    active: {
      bg: "var(--color-background-success)",
      color: "var(--color-text-success)",
      label: "Active",
    },
    closed: {
      bg: "var(--color-background-danger)",
      color: "var(--color-text-danger)",
      label: "Closed",
    },
  };
  const s = map[status];
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function criteriaChips(c: ScholarshipCriteria): string[] {
  const chips: string[] = [];
  if (c.ageLimit.min !== "" || c.ageLimit.max !== "")
    chips.push(
      `Age ${c.ageLimit.min !== "" ? c.ageLimit.min : "any"}–${
        c.ageLimit.max !== "" ? c.ageLimit.max : "any"
      }`
    );
  if (c.gender !== "all") chips.push(`Gender: ${c.gender}`);
  if (c.maritalStatus !== "all") chips.push(c.maritalStatus.replace(/_/g, " "));
  if (c.states.length) chips.push(`${c.states.length} state(s)`);
  if (c.educationLevels.length) chips.push(`${c.educationLevels.length} edu level(s)`);
  if (c.ewsOnly === true) chips.push("EWS only");
  if (c.currentlyStudying === true) chips.push("Must be studying");
  if (c.annualFamilyIncome.max !== "")
    chips.push(`Income ≤ ₹${Number(c.annualFamilyIncome.max).toLocaleString("en-IN")}`);
  return chips.slice(0, 5);
}

function ScholarshipCard({
  scholarship,
  onEdit,
  onDelete,
  onViewEligible,
  deleting,
}: {
  scholarship: Scholarship;
  onEdit: () => void;
  onDelete: () => void;
  onViewEligible: () => void;
  deleting: boolean;
}) {
  const chips = criteriaChips(scholarship.criteria);
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px 20px",
        marginBottom: "0.75rem",
        opacity: deleting ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              {scholarship.name || "Unnamed scholarship"}
            </span>
            {statusBadge(scholarship.status)}
          </div>
          {scholarship.description && (
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                margin: "0 0 8px",
                lineHeight: 1.5,
              }}
            >
              {scholarship.description}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {scholarship.baseAmount !== "" && (
            <div
              style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              ₹{Number(scholarship.baseAmount).toLocaleString("en-IN")}
            </div>
          )}
          {scholarship.tieredAmounts.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              +{scholarship.tieredAmounts.length} tier(s)
            </div>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {chips.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--color-background-secondary)",
                color: "var(--color-text-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onEdit}
          disabled={deleting}
          style={{
            padding: "5px 14px",
            fontSize: 12,
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            background: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden /> Edit
        </button>
        {/* Only show Eligible Members for active scholarships — drafts aren't published */}
        {scholarship.status === "active" && (
          <button
            onClick={onViewEligible}
            disabled={deleting}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              border: "0.5px solid var(--color-border-info)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-info)",
              cursor: "pointer",
              color: "var(--color-text-info)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="ti ti-users-check" style={{ fontSize: 13 }} aria-hidden /> Eligible
            members
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            padding: "5px 14px",
            fontSize: 12,
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            background: "none",
            cursor: deleting ? "not-allowed" : "pointer",
            color: "var(--color-text-danger)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {deleting ? (
            <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 13 }} />
          ) : (
            <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden />
          )}
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScholarshipPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Loading states
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Eligible members modal
  const [eligibleFor, setEligibleFor] = useState<Scholarship | null>(null);

  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // ── Fetch all scholarships on mount ───────────────────────────────────────
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

  useEffect(() => {
    fetchScholarships();
  }, [fetchScholarships]);

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const startCreate = () => {
    setEditing(emptyScholarship());
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isCreating) {
        // POST — backend returns the created scholarship with server-generated id
        const created = await apiFetch<Scholarship>("/sangha/scholarships", {
          method: "POST",
          body: JSON.stringify(editing),
        });
        setScholarships((prev) => [created, ...prev]);
        pushToast("success", "Scholarship created successfully");
      } else {
        // PUT
        const updated = await apiFetch<Scholarship>(`/sangha/scholarships/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(editing),
        });
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

  const handleCancel = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const handleEdit = (s: Scholarship) => {
    setEditing({ ...s });
    setIsCreating(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
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

  // suppress unused warning
  void isCreating;

  return (
    <>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "2rem 1rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              Scholarships
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Define and manage scholarships with detailed eligibility criteria.
            </p>
          </div>
          {!editing && (
            <button
              onClick={startCreate}
              style={{
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                borderRadius: "var(--border-radius-md)",
                background: "#534AB7",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden />
              New scholarship
            </button>
          )}
        </div>

        {/* Form */}
        {editing && (
          <ScholarshipForm
            scholarship={editing}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        )}

        {/* List */}
        {!editing && (
          <>
            {pageLoading ? (
              <div
                style={{
                  padding: "3rem 2rem",
                  textAlign: "center",
                  color: "var(--color-text-tertiary)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <i
                  className="ti ti-loader-2 ti-spin"
                  style={{ fontSize: 32 }}
                  aria-hidden
                />
                <p style={{ fontSize: 14, margin: 0 }}>Loading scholarships…</p>
              </div>
            ) : scholarships.length === 0 ? (
              <div
                style={{
                  padding: "3rem 2rem",
                  textAlign: "center",
                  border: "0.5px dashed var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-lg)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                <i
                  className="ti ti-award"
                  style={{ fontSize: 40, display: "block", marginBottom: 12 }}
                  aria-hidden
                />
                <p style={{ fontSize: 14, margin: 0 }}>
                  No scholarships yet. Click "New scholarship" to get started.
                </p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    marginBottom: "1.5rem",
                  }}
                >
                  {(
                    [
                      {
                        label: "Total",
                        value: scholarships.length,
                        color: "var(--color-text-primary)",
                      },
                      {
                        label: "Active",
                        value: scholarships.filter((s) => s.status === "active").length,
                        color: "var(--color-text-success)",
                      },
                      {
                        label: "Draft",
                        value: scholarships.filter((s) => s.status === "draft").length,
                        color: "var(--color-text-secondary)",
                      },
                    ] as { label: string; value: number; color: string }[]
                  ).map((m) => (
                    <div
                      key={m.label}
                      style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        padding: "12px 16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-secondary)",
                          marginBottom: 4,
                        }}
                      >
                        {m.label}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: m.color }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {scholarships.map((s) => (
                  <ScholarshipCard
                    key={s.id}
                    scholarship={s}
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

      {/* Eligible Members Modal */}
      {eligibleFor && (
        <EligibleMembersModal
          scholarship={eligibleFor}
          onClose={() => setEligibleFor(null)}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
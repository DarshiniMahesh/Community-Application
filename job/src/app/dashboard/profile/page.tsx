"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { COMPANY_TYPES } from "@/lib/constants";
import { Building2, Save, Send } from "lucide-react";

interface ProfileForm {
  company_name: string;
  company_description: string;
  address_line1: string;
  address_line2: string;
  company_category: string;
  company_subcategory: string;
  company_size: string;
}

const EMPTY_FORM: ProfileForm = {
  company_name: "",
  company_description: "",
  address_line1: "",
  address_line2: "",
  company_category: "",
  company_subcategory: "",
  company_size: "",
};

export default function CompanyProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSetup = searchParams.get("setup") === "true";

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<ProfileForm>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isSetup);
  const [success, setSuccess] = useState("");
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (isSetup) return;
    api.get("/company/profile")
      .then((d) => {
        setForm({
          company_name: d.company_name || "",
          company_description: d.company_description || "",
          address_line1: d.address_line1 || "",
          address_line2: d.address_line2 || "",
          company_category: d.company_category || "",
          company_subcategory: d.company_subcategory || "",
          company_size: d.company_size?.toString() || "",
        });
        setCompanyStatus(d.status);
        setRejectionReason(d.rejection_reason || "");
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isSetup]);

  const subCategories = form.company_category ? COMPANY_TYPES[form.company_category] || [] : [];

  const set = (key: keyof ProfileForm, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
    if (key === "company_category") {
      setForm((f) => ({ ...f, company_category: val, company_subcategory: "" }));
    }
  };

  const validate = () => {
    const e: Partial<ProfileForm> = {};
    if (!form.company_name.trim()) e.company_name = "Company name is required";
    if (!form.company_description.trim()) e.company_description = "Description is required";
    if (!form.address_line1.trim()) e.address_line1 = "Address line 1 is required";
    if (!form.company_category) e.company_category = "Please select a category";
    if (!form.company_subcategory) e.company_subcategory = "Please select a sub-category";
    if (!form.company_size || isNaN(Number(form.company_size)) || Number(form.company_size) <= 0) {
      e.company_size = "Enter a valid company size";
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const body = { ...form, company_size: Number(form.company_size) };
      if (isSetup) {
        await api.post("/company/profile", body);
        router.push("/dashboard");
      } else {
        await api.put("/company/profile", body);
        setSuccess("Profile updated successfully.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setErrors({ company_name: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReapply = async () => {
    setLoading(true);
    try {
      await api.post("/company/reapply", {});
      setCompanyStatus("pending");
      setSuccess("Reapplication submitted successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reapply";
      setErrors({ company_name: msg });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={styles.loading}>Loading profile...</div>;

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>{isSetup ? "Set Up Your Company Profile" : "Company Profile"}</h1>
        <p style={styles.pageSub}>
          {isSetup
            ? "Complete your profile to apply for approval and start posting jobs."
            : "Manage your company information."}
        </p>
      </div>

      {/* Rejection banner */}
      {companyStatus === "rejected" && (
        <div style={styles.rejectedBanner}>
          <strong>❌ Your registration was rejected.</strong>
          {rejectionReason && <p style={{ margin: "4px 0 0", fontSize: 13 }}>Reason: {rejectionReason}</p>}
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>
            Please update your profile and click <strong>Reapply</strong>.
          </p>
        </div>
      )}

      {success && <div style={styles.successBanner}>{success}</div>}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Building2 size={18} color="#1a56db" />
          <h3 style={styles.cardTitle}>Company Information</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.grid2}>
            {/* Company Name */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Name <span style={styles.req}>*</span></label>
              <input
                style={{ ...styles.input, ...(errors.company_name ? styles.inputError : {}) }}
                placeholder="Official legal/business name"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
              {errors.company_name && <p style={styles.errText}>{errors.company_name}</p>}
            </div>

            {/* Company Size */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Size (number of employees) <span style={styles.req}>*</span></label>
              <input
                style={{ ...styles.input, ...(errors.company_size ? styles.inputError : {}) }}
                type="number" min="1"
                placeholder="e.g. 150"
                value={form.company_size}
                onChange={(e) => set("company_size", e.target.value)}
              />
              {errors.company_size && <p style={styles.errText}>{errors.company_size}</p>}
            </div>
          </div>

          {/* Description */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Company Description <span style={styles.req}>*</span></label>
            <textarea
              style={{ ...styles.textarea, ...(errors.company_description ? styles.inputError : {}) }}
              rows={4}
              placeholder="Describe your company, its mission, products/services..."
              value={form.company_description}
              onChange={(e) => set("company_description", e.target.value)}
            />
            {errors.company_description && <p style={styles.errText}>{errors.company_description}</p>}
          </div>

          {/* Address */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Address Line 1 <span style={styles.req}>*</span></label>
            <input
              style={{ ...styles.input, ...(errors.address_line1 ? styles.inputError : {}) }}
              placeholder="Street, building number"
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
            />
            {errors.address_line1 && <p style={styles.errText}>{errors.address_line1}</p>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Address Line 2</label>
            <input
              style={styles.input}
              placeholder="Area, locality (optional)"
              value={form.address_line2}
              onChange={(e) => set("address_line2", e.target.value)}
            />
          </div>

          <div style={styles.grid2}>
            {/* Category */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Category <span style={styles.req}>*</span></label>
              <select
  title="Company category"
  style={{ ...styles.select, ...(errors.company_category ? styles.inputError : {}) }}
  value={form.company_category}
  onChange={(e) => set("company_category", e.target.value)}
>
                <option value="">Select category</option>
                {Object.keys(COMPANY_TYPES).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.company_category && <p style={styles.errText}>{errors.company_category}</p>}
            </div>

            {/* Sub-Category */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Sub-Category <span style={styles.req}>*</span></label>
              <select
  title="Company sub-category"
  style={{ ...styles.select, ...(errors.company_subcategory ? styles.inputError : {}), ...((!form.company_category) ? { opacity: 0.5 } : {}) }}
  value={form.company_subcategory}
  onChange={(e) => set("company_subcategory", e.target.value)}
  disabled={!form.company_category}
>
                <option value="">Select sub-category</option>
                {subCategories.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.company_subcategory && <p style={styles.errText}>{errors.company_subcategory}</p>}
            </div>
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.saveBtn} disabled={loading}>
              <Save size={16} />
              {loading ? "Saving..." : isSetup ? "Save & Submit for Approval" : "Save"}
            </button>

            {companyStatus === "rejected" && !isSetup && (
              <button
                type="button"
                style={styles.reapplyBtn}
                onClick={handleReapply}
                disabled={loading}
              >
                <Send size={16} />
                Reapply for Approval
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: "center", color: "#6b7280", fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  rejectedBanner: {
    background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8,
    padding: "14px 16px", color: "#991b1b", fontSize: 13, marginBottom: 16,
  },
  successBanner: {
    background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8,
    padding: "12px 16px", color: "#065f46", fontSize: 13, marginBottom: 16,
  },
  card: {
    background: "#fff", borderRadius: 10, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  req: { color: "#ef4444" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, color: "#1a1a2e", outline: "none",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, color: "#1a1a2e",
    resize: "vertical", outline: "none", fontFamily: "inherit",
  },
  select: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, color: "#1a1a2e",
    background: "#fff", outline: "none", cursor: "pointer",
  },
  inputError: { borderColor: "#ef4444" },
  errText: { fontSize: 11, color: "#ef4444", margin: "4px 0 0" },
  actions: { display: "flex", gap: 12, marginTop: 8 },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 24px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  reapplyBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 24px", background: "#fff",
    color: "#1a56db", border: "1.5px solid #1a56db",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { COMPANY_TYPES } from "@/lib/constants";
import { Building2, Save, Send, Camera, Globe, Mail, Phone } from "lucide-react";

interface ProfileForm {
  company_name: string;
  company_description: string;
  company_size: string;
  company_category: string;
  company_subcategory: string;

  registered_address_line1: string;
  registered_address_line2: string;
  registered_city: string;
  registered_pincode: string;

  same_as_registered: boolean;
  company_address_line1: string;
  company_address_line2: string;
  company_city: string;
  company_pincode: string;

  website: string;
  contact_email: string;
  contact_phone: string;
}

const EMPTY_FORM: ProfileForm = {
  company_name: "",
  company_description: "",
  company_size: "",
  company_category: "",
  company_subcategory: "",

  registered_address_line1: "",
  registered_address_line2: "",
  registered_city: "",
  registered_pincode: "",

  same_as_registered: true,
  company_address_line1: "",
  company_address_line2: "",
  company_city: "",
  company_pincode: "",

  website: "",
  contact_email: "",
  contact_phone: "",
};

export default function CompanyProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSetup = searchParams.get("setup") === "true";

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isSetup);
  const [success, setSuccess] = useState("");
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Registered contact — read-only, sourced from company_auth (login credentials)
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");

  // Logo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (isSetup) return;
    api.get("/company/profile")
      .then((d) => {
        setForm({
          company_name: d.company_name || "",
          company_description: d.company_description || "",
          company_size: d.company_size?.toString() || "",
          company_category: d.company_category || "",
          company_subcategory: d.company_subcategory || "",

          registered_address_line1: d.registered_address_line1 || "",
          registered_address_line2: d.registered_address_line2 || "",
          registered_city: d.registered_city || "",
          registered_pincode: d.registered_pincode || "",

          same_as_registered: d.same_as_registered !== false,
          company_address_line1: d.company_address_line1 || "",
          company_address_line2: d.company_address_line2 || "",
          company_city: d.company_city || "",
          company_pincode: d.company_pincode || "",

          website: d.website || "",
          contact_email: d.contact_email || "",
          contact_phone: d.contact_phone || "",
        });
        setRegisteredEmail(d.registered_email || "");
        setRegisteredPhone(d.registered_phone || "");
        setLogoUrl(d.logo_url || "");
        setLogoPreview(d.logo_url || "");
        setCompanyStatus(d.status);
        setRejectionReason(d.rejection_reason || "");
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isSetup]);

  const subCategories = form.company_category ? COMPANY_TYPES[form.company_category] || [] : [];

  const set = (key: keyof ProfileForm, val: string | boolean) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
    if (key === "company_category") {
      setForm((f) => ({ ...f, company_category: val as string, company_subcategory: "" }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e: Partial<Record<keyof ProfileForm, string>> = {};
    if (!form.company_name.trim()) e.company_name = "Company name is required";
    if (!form.company_description.trim()) e.company_description = "Description is required";
    if (!form.company_category) e.company_category = "Please select a category";
    if (!form.company_subcategory) e.company_subcategory = "Please select a sub-category";
    if (!form.company_size || isNaN(Number(form.company_size)) || Number(form.company_size) <= 0) {
      e.company_size = "Enter a valid company size";
    }
    if (!form.registered_address_line1.trim()) e.registered_address_line1 = "Address line 1 is required";
    if (!form.registered_city.trim()) e.registered_city = "City is required";
    if (!/^\d{6}$/.test(form.registered_pincode)) e.registered_pincode = "Enter a valid 6-digit pincode";

    if (!form.same_as_registered) {
      if (!form.company_address_line1.trim()) e.company_address_line1 = "Address line 1 is required";
      if (!form.company_city.trim()) e.company_city = "City is required";
      if (!/^\d{6}$/.test(form.company_pincode)) e.company_pincode = "Enter a valid 6-digit pincode";
    }

    if (form.website && !/^https?:\/\/.+\..+/.test(form.website))
      e.website = "Enter a valid URL (starting with http:// or https://)";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = "Enter a valid email";
    if (form.contact_phone && !/^\d{10}$/.test(form.contact_phone))
      e.contact_phone = "Enter a valid 10-digit phone number";

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const uploadRes = await api.postForm("/company/profile/logo", fd);
        finalLogoUrl = uploadRes.logo_url;
      }

      const body = {
        ...form,
        company_size: Number(form.company_size),
        logo_url: finalLogoUrl || undefined,
      };

      if (isSetup) {
        await api.post("/company/profile", body);
        router.push("/dashboard");
      } else {
        await api.put("/company/profile", body);
        setCompanyStatus("pending");
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        setSuccess("Profile updated and sent for re-approval. Refreshing access...");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
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
      setSuccess("Reapplication submitted successfully. Refreshing access...");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
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

      {companyStatus === "approved" && (
        <div style={styles.approvedBanner}>✅ Your company is approved and active.</div>
      )}

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
          {/* Logo */}
          <div style={styles.logoRow}>
            <div style={styles.logoWrap}>
              <div style={styles.logoCircle}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" style={styles.logoImg} />
                ) : (
                  <span style={styles.logoInitial}>{form.company_name?.charAt(0) || "C"}</span>
                )}
              </div>
              <button
                type="button"
                style={styles.logoBtn}
                onClick={() => logoInputRef.current?.click()}
                aria-label="Upload company logo"
              >
                <Camera size={14} />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleLogoChange}
              />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" }}>Company Logo</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>PNG, JPG, or WEBP. Max 2MB.</p>
            </div>
          </div>

          <div style={styles.grid2}>
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

          <div style={styles.grid2}>
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

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Sub-Category <span style={styles.req}>*</span></label>
              <select
                title="Company sub-category"
                style={{
                  ...styles.select,
                  ...(errors.company_subcategory ? styles.inputError : {}),
                  ...(!form.company_category ? { opacity: 0.5 } : {}),
                }}
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

          <hr style={styles.divider} />
          <h4 style={styles.sectionTitle}>Registered Contact</h4>
          <p style={styles.sectionSub}>The email/phone you used to log in. Contact support to change this.</p>

          <div style={styles.grid2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Mail size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Registered Email
              </label>
              <input style={{ ...styles.input, ...styles.inputReadOnly }} value={registeredEmail || "—"} readOnly />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <Phone size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Registered Phone
              </label>
              <input style={{ ...styles.input, ...styles.inputReadOnly }} value={registeredPhone || "—"} readOnly />
            </div>
          </div>

          <hr style={styles.divider} />
          <h4 style={styles.sectionTitle}>Registered Address</h4>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Address Line 1 <span style={styles.req}>*</span></label>
            <input
              style={{ ...styles.input, ...(errors.registered_address_line1 ? styles.inputError : {}) }}
              placeholder="Street, building number"
              value={form.registered_address_line1}
              onChange={(e) => set("registered_address_line1", e.target.value)}
            />
            {errors.registered_address_line1 && <p style={styles.errText}>{errors.registered_address_line1}</p>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Address Line 2</label>
            <input
              style={styles.input}
              placeholder="Area, locality (optional)"
              value={form.registered_address_line2}
              onChange={(e) => set("registered_address_line2", e.target.value)}
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>City <span style={styles.req}>*</span></label>
              <input
                style={{ ...styles.input, ...(errors.registered_city ? styles.inputError : {}) }}
                placeholder="City"
                value={form.registered_city}
                onChange={(e) => set("registered_city", e.target.value)}
              />
              {errors.registered_city && <p style={styles.errText}>{errors.registered_city}</p>}
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Pincode <span style={styles.req}>*</span></label>
              <input
                style={{ ...styles.input, ...(errors.registered_pincode ? styles.inputError : {}) }}
                placeholder="6-digit pincode"
                maxLength={6}
                value={form.registered_pincode}
                onChange={(e) => set("registered_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              {errors.registered_pincode && <p style={styles.errText}>{errors.registered_pincode}</p>}
            </div>
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.same_as_registered}
              onChange={(e) => set("same_as_registered", e.target.checked)}
            />
            Company address is the same as registered address
          </label>

          {!form.same_as_registered && (
            <>
              <h4 style={styles.sectionTitle}>Company Address</h4>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Address Line 1 <span style={styles.req}>*</span></label>
                <input
                  style={{ ...styles.input, ...(errors.company_address_line1 ? styles.inputError : {}) }}
                  placeholder="Street, building number"
                  value={form.company_address_line1}
                  onChange={(e) => set("company_address_line1", e.target.value)}
                />
                {errors.company_address_line1 && <p style={styles.errText}>{errors.company_address_line1}</p>}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Address Line 2</label>
                <input
                  style={styles.input}
                  placeholder="Area, locality (optional)"
                  value={form.company_address_line2}
                  onChange={(e) => set("company_address_line2", e.target.value)}
                />
              </div>

              <div style={styles.grid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>City <span style={styles.req}>*</span></label>
                  <input
                    style={{ ...styles.input, ...(errors.company_city ? styles.inputError : {}) }}
                    placeholder="City"
                    value={form.company_city}
                    onChange={(e) => set("company_city", e.target.value)}
                  />
                  {errors.company_city && <p style={styles.errText}>{errors.company_city}</p>}
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Pincode <span style={styles.req}>*</span></label>
                  <input
                    style={{ ...styles.input, ...(errors.company_pincode ? styles.inputError : {}) }}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    value={form.company_pincode}
                    onChange={(e) => set("company_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  {errors.company_pincode && <p style={styles.errText}>{errors.company_pincode}</p>}
                </div>
              </div>
            </>
          )}

          <hr style={styles.divider} />
          <h4 style={styles.sectionTitle}>Website & Contact (optional)</h4>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <Globe size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Company Website
            </label>
            <input
              style={{ ...styles.input, ...(errors.website ? styles.inputError : {}) }}
              placeholder="https://yourcompany.com"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
            {errors.website && <p style={styles.errText}>{errors.website}</p>}
          </div>

          <div style={styles.grid2}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contact Email</label>
              <input
                style={{ ...styles.input, ...(errors.contact_email ? styles.inputError : {}) }}
                placeholder="hr@yourcompany.com"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
              {errors.contact_email && <p style={styles.errText}>{errors.contact_email}</p>}
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contact Phone</label>
              <input
                style={{ ...styles.input, ...(errors.contact_phone ? styles.inputError : {}) }}
                placeholder="10-digit phone"
                maxLength={10}
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
              {errors.contact_phone && <p style={styles.errText}>{errors.contact_phone}</p>}
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
  approvedBanner: {
    background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8,
    padding: "12px 16px", color: "#065f46", fontSize: 13, marginBottom: 16, fontWeight: 500,
  },
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

  logoRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  logoWrap: { position: "relative", width: 72, height: 72, flexShrink: 0 },
  logoCircle: {
    width: 72, height: 72, borderRadius: "50%",
    background: "#eff6ff", border: "2px solid #d1e0fa",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoInitial: { fontSize: 26, fontWeight: 700, color: "#1a56db" },
  logoBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: "50%",
    background: "#1a56db", color: "#fff", border: "2px solid #fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  req: { color: "#ef4444" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, color: "#1a1a2e", outline: "none",
  },
  inputReadOnly: { background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" },
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

  divider: { border: "none", borderTop: "1px solid #eee", margin: "24px 0 16px" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  sectionSub: { fontSize: 12, color: "#9ca3af", margin: "0 0 14px" },

  checkboxRow: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, color: "#374151", margin: "4px 0 20px", cursor: "pointer",
  },

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
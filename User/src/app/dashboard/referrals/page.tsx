"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Share2, Plus, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

const WORK_TYPES = ["Remote", "On-site", "Hybrid"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Volunteer"];
const EXPERIENCE_LEVELS = ["Entry level", "Mid level", "Senior level", "Director", "Executive"];

interface ReferralForm {
  job_title: string;
  company_name: string;
  location: string;
  work_type: string;
  employment_type: string;
  job_posting_url: string;
  job_reference_number: string;
  job_description: string;
  application_deadline: string;
  message_for_applicants: string;
  // optional
  experience_level_required: string;
  salary_range: string;
  key_skills_required: string;
  benefits_highlights: string;
  brief_job_description: string;
  why_join: string;
  who_to_contact: string;
  personal_note: string;
  tags: string;
}

const EMPTY: ReferralForm = {
  job_title: "", company_name: "", location: "", work_type: "",
  employment_type: "", job_posting_url: "", job_reference_number: "",
  job_description: "", application_deadline: "", message_for_applicants: "",
  experience_level_required: "", salary_range: "", key_skills_required: "",
  benefits_highlights: "", brief_job_description: "", why_join: "",
  who_to_contact: "", personal_note: "", tags: "",
};

export default function ReferralsPage() {
  const router = useRouter();
  const [form, setForm] = useState<ReferralForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<ReferralForm>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const set = (key: keyof ReferralForm, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const validate = () => {
    const e: Partial<ReferralForm> = {};
    if (!form.job_title.trim()) e.job_title = "Job title is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.work_type) e.work_type = "Work type is required";
    if (!form.employment_type) e.employment_type = "Employment type is required";
    if (!form.job_posting_url.trim()) e.job_posting_url = "Job posting URL is required";
    else {
      try { new URL(form.job_posting_url); } catch {
        e.job_posting_url = "Enter a valid URL (e.g. https://...)";
      }
    }
    if (!form.job_reference_number.trim()) e.job_reference_number = "Job ID / Reference number is required";
    if (!form.job_description.trim()) e.job_description = "Job description is required";
    if (!form.message_for_applicants.trim()) e.message_for_applicants = "Message for applicants is required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post("/referrals", { ...form, tags });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      setErrors({ job_title: msg });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.successPage}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}><CheckCircle2 size={48} color="#059669" /></div>
          <h2 style={styles.successTitle}>Referral Submitted!</h2>
          <p style={styles.successSub}>
            Your referral has been submitted for moderator review. It will appear publicly once approved.
          </p>
          <div style={styles.successActions}>
            <button style={styles.newBtn} onClick={() => { setForm(EMPTY); setTags([]); setSubmitted(false); }}>
              Post Another Referral
            </button>
            <button style={styles.backBtn2} onClick={() => router.push("/dashboard/my-career")}>
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const F = ({ label, req, children, error }: { label: string; req?: boolean; children: React.ReactNode; error?: string }) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label} {req && <span style={styles.req}>*</span>}</label>
      {children}
      {error && <p style={styles.errText}>{error}</p>}
    </div>
  );

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
          <ArrowLeft size={15} /> Back to Jobs
        </button>
        <div style={styles.titleRow}>
          <div style={styles.titleIcon}><Share2 size={20} color="#1a56db" /></div>
          <div>
            <h1 style={styles.pageTitle}>Post a Job Referral</h1>
            <p style={styles.pageSub}>Share a job opportunity with your community. Goes to moderator for approval.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Mandatory Section */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Required Information</h3>

          <div style={styles.grid2}>
            <F label="Job Title" req error={errors.job_title}>
              <input style={{ ...styles.input, ...(errors.job_title ? styles.inputError : {}) }}
                placeholder="e.g. Frontend Engineer" value={form.job_title}
                onChange={(e) => set("job_title", e.target.value)} />
            </F>
            <F label="Company Name">
              <input style={styles.input} placeholder="Company name (auto-filled if available)"
                value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </F>
          </div>

          <div style={styles.grid3}>
            <F label="Location" req error={errors.location}>
              <input style={{ ...styles.input, ...(errors.location ? styles.inputError : {}) }}
                placeholder="City, State, Country" value={form.location}
                onChange={(e) => set("location", e.target.value)} />
            </F>
            <F label="Work Type" req error={errors.work_type}>
              <select title="Work Type" style={{ ...styles.select, ...(errors.work_type ? styles.inputError : {}) }}
  value             ={form.work_type} onChange={(e) => set("work_type", e.target.value)}>
                <option value="">Select...</option>
                {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </F>
            <F label="Employment Type" req error={errors.employment_type}>
              <select title="Employment Type" style={{ ...styles.select, ...(errors.employment_type ? styles.inputError : {}) }}
  value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                <option value="">Select...</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </F>
          </div>

          <div style={styles.grid2}>
            <F label="Job Posting Link / URL" req error={errors.job_posting_url}>
              <input style={{ ...styles.input, ...(errors.job_posting_url ? styles.inputError : {}) }}
                placeholder="https://company.com/careers/job-id" value={form.job_posting_url}
                onChange={(e) => set("job_posting_url", e.target.value)} />
            </F>
            <F label="Job ID / Reference Number" req error={errors.job_reference_number}>
              <input style={{ ...styles.input, ...(errors.job_reference_number ? styles.inputError : {}) }}
                placeholder="e.g. JOB-2024-001" value={form.job_reference_number}
                onChange={(e) => set("job_reference_number", e.target.value)} />
            </F>
          </div>

          <F label="Job Description" req error={errors.job_description}>
            <textarea style={{ ...styles.textarea, ...(errors.job_description ? styles.inputError : {}) }}
              rows={4} placeholder="Summary of the role and its responsibilities..."
              value={form.job_description} onChange={(e) => set("job_description", e.target.value)} />
          </F>

          <F label="Application Deadline">
            <input type="date" title="Application Deadline" placeholder="YYYY-MM-DD" style={styles.input} value={form.application_deadline}
              onChange={(e) => set("application_deadline", e.target.value)} />
          </F>

          <F label="Message for Applicants" req error={errors.message_for_applicants}>
            <textarea style={{ ...styles.textarea, ...(errors.message_for_applicants ? styles.inputError : {}) }}
              rows={3}
              placeholder="Why should someone apply? Any tips or insider info for applicants..."
              value={form.message_for_applicants}
              onChange={(e) => set("message_for_applicants", e.target.value)} />
          </F>
        </div>

        {/* Optional Section */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Optional Details</h3>

          <div style={styles.grid2}>
            <F label="Experience Level Required">
              <select title="Experience Level Required" style={styles.select} value={form.experience_level_required}
                onChange={(e) => set("experience_level_required", e.target.value)}>
                <option value="">Select...</option>
                {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </F>
            <F label="Salary Range">
              <input style={styles.input} placeholder="e.g. ₹8–12 LPA or $80k–100k"
                value={form.salary_range} onChange={(e) => set("salary_range", e.target.value)} />
            </F>
          </div>

          <F label="Key Skills Required">
            <input style={styles.input} placeholder="e.g. React, Node.js, AWS"
              value={form.key_skills_required} onChange={(e) => set("key_skills_required", e.target.value)} />
          </F>

          <F label="Benefits Highlights">
            <input style={styles.input} placeholder="e.g. Health insurance, 401k, Remote-first"
              value={form.benefits_highlights} onChange={(e) => set("benefits_highlights", e.target.value)} />
          </F>

          <F label="Why Join This Role?">
            <textarea style={styles.textarea} rows={3}
              placeholder="Growth opportunities, company culture, exciting work..."
              value={form.why_join} onChange={(e) => set("why_join", e.target.value)} />
          </F>

          <div style={styles.grid2}>
            <F label="Who to Contact">
              <input style={styles.input} placeholder="Contact name or email for queries"
                value={form.who_to_contact} onChange={(e) => set("who_to_contact", e.target.value)} />
            </F>
            <F label="Personal Note / Endorsement">
              <input style={styles.input} placeholder="Your personal recommendation..."
                value={form.personal_note} onChange={(e) => set("personal_note", e.target.value)} />
            </F>
          </div>

          {/* Tags */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Tags / Keywords</label>
            <div style={styles.tagInputRow}>
              <input style={styles.input} placeholder="e.g. hiring, techjobs, remote"
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <button type="button" style={styles.addTagBtn} onClick={addTag}>
                <Plus size={14} /> Add
              </button>
            </div>
            {tags.length > 0 && (
              <div style={styles.tagList}>
                {tags.map((t) => (
                  <span key={t} style={styles.tag}>
                    #{t}
                    <button title="Remove tag" aria-label="Remove tag" style={styles.tagRemove} onClick={() => removeTag(t)} type="button">
  <Trash2 size={10} />
</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.submitRow}>
          <button type="button" style={styles.cancelBtn} onClick={() => router.push("/dashboard/my-career")}>
            Cancel
          </button>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            <Share2 size={15} />
            {loading ? "Submitting..." : "Submit Referral for Review"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 24 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, padding: "0 0 12px", fontWeight: 500,
  },
  titleRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  titleIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: "#eff6ff", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  card: {
    background: "#fff", borderRadius: 10, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: "#1a1a2e",
    margin: "0 0 16px", paddingBottom: 10,
    borderBottom: "1px solid #f3f4f6",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  req: { color: "#ef4444" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e",
    resize: "vertical", outline: "none", fontFamily: "inherit",
  },
  select: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e",
    background: "#fff", outline: "none",
  },
  inputError: { borderColor: "#ef4444" },
  errText: { fontSize: 11, color: "#ef4444", margin: "4px 0 0" },
  tagInputRow: { display: "flex", gap: 8 },
  addTagBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 14px", background: "#eff6ff",
    color: "#1a56db", border: "none", borderRadius: 7,
    fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  tagList: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, padding: "4px 10px", borderRadius: 20,
    background: "#eff6ff", color: "#1a56db", fontWeight: 500,
  },
  tagRemove: { background: "none", border: "none", cursor: "pointer", color: "#1a56db", padding: 0, display: "flex" },
  submitRow: { display: "flex", gap: 12, justifyContent: "flex-end", paddingBottom: 24 },
  cancelBtn: {
    padding: "11px 24px", background: "#fff",
    color: "#374151", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  submitBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 28px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  successPage: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "60vh",
  },
  successCard: {
    background: "#fff", borderRadius: 12, padding: "48px 40px",
    textAlign: "center", maxWidth: 440, width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 10px" },
  successSub: { fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: "0 0 24px" },
  successActions: { display: "flex", gap: 10, justifyContent: "center" },
  newBtn: {
    padding: "10px 20px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  backBtn2: {
    padding: "10px 20px", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EMPLOYMENT_TYPES, WORK_SETTINGS } from "@/lib/constants";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

interface JobForm {
  job_title: string;
  job_description: string;
  location: string;
  postal_code: string;
  country: string;
  job_code: string;
  department: string;
  functional_area: string;
  certifications: string[];
  work_setting: string;
  employment_type: string;
  experience_min_years: string;
  experience_min_months: string;
  experience_max_years: string;
  experience_max_months: string;
  duration: string;
  contract_duration: string;
  salary_min: string;
  salary_max: string;
  salary_grade: string;
  bonuses_offered: boolean;
  bonus_details: string;
  other_perks: string;
  screening_questions: string[];
  resume_required: boolean;
  cover_letter_required: boolean;
  portfolio_required: boolean;
  application_deadline: string;
  expected_start_date: string;
  recruitment_timeline: string;
  contact_phone: string;
  contact_email: string;
  job_poster: string;
  hiring_manager: string;
  number_of_openings: string;
  equal_opportunity_statement: string;
  ada_compliance: string;
  legal_disclosures: string;
  background_check_required: boolean;
  reason_for_vacancy: string;
  budget_code: string;
}

const EMPTY_FORM: JobForm = {
  job_title: "", job_description: "", location: "", postal_code: "",
  country: "", job_code: "", department: "", functional_area: "",
  certifications: [],
  work_setting: "", employment_type: "",
  experience_min_years: "", experience_min_months: "",
  experience_max_years: "", experience_max_months: "",
  duration: "", contract_duration: "",
  salary_min: "", salary_max: "", salary_grade: "",
  bonuses_offered: false, bonus_details: "", other_perks: "",
  screening_questions: [],
  resume_required: true, cover_letter_required: false, portfolio_required: false,
  application_deadline: "", expected_start_date: "", recruitment_timeline: "",
  contact_phone: "", contact_email: "",
  job_poster: "", hiring_manager: "", number_of_openings: "",
  equal_opportunity_statement: "We are an Equal Opportunity Employer. All qualified applicants will receive consideration for employment without regard to race, color, religion, sex, national origin, disability, or protected veteran status.",
  ada_compliance: "", legal_disclosures: "", background_check_required: false,
  reason_for_vacancy: "", budget_code: "",
};

const SECTIONS = [
  "Job Identification",
  "Work Setting & Employment",
  "Compensation & Benefits",
  "Application Details",
  "Compliance & Legal",
  "Internal / HR Fields",
];

const FIELD_SECTION: Partial<Record<keyof JobForm, number>> = {
  job_title: 0, job_description: 0, location: 0, postal_code: 0, country: 0,
  work_setting: 1, employment_type: 1,
  contact_email: 3, application_deadline: 3,
  equal_opportunity_statement: 4,
};

function FieldGroup({
  label, req, children, error,
}: { label: string; req?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label} {req && <span style={styles.req}>*</span>}
      </label>
      {children}
      {error && <p style={styles.errText}>{error}</p>}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <input
      style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TextareaInput({
  value, onChange, placeholder, rows = 4, error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}) {
  return (
    <textarea
      style={{ ...styles.textarea, minHeight: rows * 24, ...(error ? styles.inputError : {}) }}
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder, error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <select
      title={placeholder || "Select option"}
      style={{ ...styles.select, ...(error ? styles.inputError : {}) }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof JobForm, string>>>({});
  const [openSections, setOpenSections] = useState<number[]>([0]);
  const [loading, setLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCertification, setNewCertification] = useState("");

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const set = (key: keyof JobForm, val: string | boolean | string[]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const toggleSection = (i: number) => {
    setOpenSections((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    set("screening_questions", [...form.screening_questions, newQuestion.trim()]);
    setNewQuestion("");
  };

  const removeQuestion = (i: number) => {
    set("screening_questions", form.screening_questions.filter((_, idx) => idx !== i));
  };

  const addCertification = () => {
    if (!newCertification.trim()) return;
    set("certifications", [...form.certifications, newCertification.trim()]);
    setNewCertification("");
  };

  const removeCertification = (i: number) => {
    set("certifications", form.certifications.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const e: Partial<Record<keyof JobForm, string>> = {};
    if (!form.job_title.trim()) e.job_title = "Job title is required";
    if (!form.job_description.trim()) e.job_description = "Job description is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.postal_code.trim()) e.postal_code = "Postal code is required";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.work_setting) e.work_setting = "Work setting is required";
    if (!form.employment_type) e.employment_type = "Employment type is required";
    if (!form.contact_email.trim()) e.contact_email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = "Enter a valid email";
    if (!form.equal_opportunity_statement.trim()) e.equal_opportunity_statement = "EOE statement is required";

    return e;
  };

  const scrollToSection = (sectionIdx: number) => {
    setTimeout(() => {
      sectionRefs.current[sectionIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);

      const errorKeys = Object.keys(errs) as (keyof JobForm)[];
      const sectionsToOpen = [
        ...new Set(
          errorKeys
            .map((k) => FIELD_SECTION[k])
            .filter((s): s is number => s !== undefined)
        ),
      ];
      setOpenSections((prev) => [...new Set([...prev, ...sectionsToOpen])]);

      if (sectionsToOpen.length > 0) {
        scrollToSection(Math.min(...sectionsToOpen));
      }
      return;
    }

    setLoading(true);
    try {
      await api.post("/jobs", {
        ...form,
        number_of_openings: form.number_of_openings ? Number(form.number_of_openings) : null,
      });
      router.push("/dashboard/job-postings");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post job";
      setErrors({ job_title: msg });
      setOpenSections((prev) => [...new Set([...prev, 0])]);
      scrollToSection(0);
    } finally {
      setLoading(false);
    }
  };

  const isContract = form.employment_type === "Contract";

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Post a New Job</h1>
        <p style={styles.pageSub}>Fill in the details below. Fields marked <span style={styles.req}>*</span> are mandatory.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {SECTIONS.map((section, idx) => {
          const open = openSections.includes(idx);
          return (
            <div
              key={section}
              style={styles.section}
              ref={(el) => { sectionRefs.current[idx] = el; }}
            >
              <button
                type="button"
                style={styles.sectionHeader}
                onClick={() => toggleSection(idx)}
              >
                <div style={styles.sectionTitleRow}>
                  <span style={styles.sectionNum}>{idx + 1}</span>
                  <span style={styles.sectionTitle}>{section}</span>
                  {idx === 5 && <span style={styles.internalBadge}>Internal — Not visible to candidates</span>}
                </div>
                {open ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
              </button>

              {open && (
                <div style={styles.sectionBody}>
                  {idx === 0 && (
                    <>
                      <FieldGroup label="Job Title" req error={errors.job_title}>
                        <TextInput value={form.job_title} onChange={(v) => set("job_title", v)} placeholder="e.g. Senior Software Engineer" error={errors.job_title} />
                      </FieldGroup>
                      <FieldGroup label="Job Description" req error={errors.job_description}>
                        <TextareaInput value={form.job_description} onChange={(v) => set("job_description", v)} rows={5} placeholder="Full description of duties, responsibilities, and requirements..." error={errors.job_description} />
                      </FieldGroup>
                      <div style={styles.grid2}>
                        <FieldGroup label="Location" req error={errors.location}>
                          <TextInput value={form.location} onChange={(v) => set("location", v)} placeholder="City, State, Country" error={errors.location} />
                        </FieldGroup>
                        <FieldGroup label="Postal Code / ZIP Code" req error={errors.postal_code}>
                          <TextInput value={form.postal_code} onChange={(v) => set("postal_code", v)} placeholder="e.g. 560001" error={errors.postal_code} />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid3}>
                        <FieldGroup label="Country" req error={errors.country}>
                          <TextInput value={form.country} onChange={(v) => set("country", v)} placeholder="e.g. India" error={errors.country} />
                        </FieldGroup>
                        <FieldGroup label="Job Code / Requisition ID">
                          <TextInput value={form.job_code} onChange={(v) => set("job_code", v)} placeholder="Internal tracking code" />
                        </FieldGroup>
                        <FieldGroup label="Department">
                          <TextInput value={form.department} onChange={(v) => set("department", v)} placeholder="e.g. Engineering" />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Functional Area">
                        <TextInput value={form.functional_area} onChange={(v) => set("functional_area", v)} placeholder="e.g. Engineering, Sales, HR" />
                      </FieldGroup>

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Certifications</label>
                        {form.certifications.map((c, i) => (
                          <div key={i} style={styles.questionItem}>
                            <span style={styles.questionText}>{i + 1}. {c}</span>
                            <button type="button" title="Remove certification" style={styles.removeQ} onClick={() => removeCertification(i)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <div style={styles.addQuestionRow}>
                          <input
                            style={styles.input}
                            placeholder="Type a certification and press Enter..."
                            value={newCertification}
                            onChange={(e) => setNewCertification(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCertification(); } }}
                          />
                          <button type="button" title="Add certification" style={styles.addQBtn} onClick={addCertification}>
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {idx === 1 && (
                    <>
                      <div style={styles.grid2}>
                        <FieldGroup label="Work Setting" req error={errors.work_setting}>
                          <SelectInput value={form.work_setting} onChange={(v) => set("work_setting", v)} options={WORK_SETTINGS} placeholder="Select work setting" error={errors.work_setting} />
                        </FieldGroup>
                        <FieldGroup label="Employment Type" req error={errors.employment_type}>
                          <SelectInput value={form.employment_type} onChange={(v) => set("employment_type", v)} options={EMPLOYMENT_TYPES} placeholder="Select employment type" error={errors.employment_type} />
                        </FieldGroup>
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Experience Level (Min – Max)</label>
                        <div style={styles.grid4}>
                          <input style={styles.input} type="number" min="0" placeholder="Min Years" value={form.experience_min_years} onChange={(e) => set("experience_min_years", e.target.value)} />
                          <input style={styles.input} type="number" min="0" max="11" placeholder="Min Months" value={form.experience_min_months} onChange={(e) => set("experience_min_months", e.target.value)} />
                          <input style={styles.input} type="number" min="0" placeholder="Max Years" value={form.experience_max_years} onChange={(e) => set("experience_max_years", e.target.value)} />
                          <input style={styles.input} type="number" min="0" max="11" placeholder="Max Months" value={form.experience_max_months} onChange={(e) => set("experience_max_months", e.target.value)} />
                        </div>
                        <p style={styles.hint}>Enter 0 for fresher / entry-level positions</p>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Duration">
                          <SelectInput value={form.duration} onChange={(v) => set("duration", v)} options={["Permanent", "Temporary"]} placeholder="Select duration" />
                        </FieldGroup>
                        {isContract && (
                          <FieldGroup label="Contract Duration">
                            <TextInput value={form.contract_duration} onChange={(v) => set("contract_duration", v)} placeholder="e.g. 6 months" />
                          </FieldGroup>
                        )}
                      </div>
                    </>
                  )}

                  {idx === 2 && (
                    <>
                      <p style={styles.sectionNote}>All fields optional — mandatory in some locations by law.</p>
                      <div style={styles.grid2}>
                        <FieldGroup label="Salary Range — Minimum">
                          <TextInput value={form.salary_min} onChange={(v) => set("salary_min", v)} type="number" placeholder="e.g. 500000" />
                        </FieldGroup>
                        <FieldGroup label="Salary Range — Maximum">
                          <TextInput value={form.salary_max} onChange={(v) => set("salary_max", v)} type="number" placeholder="e.g. 1200000" />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Salary Grade">
                        <TextInput value={form.salary_grade} onChange={(v) => set("salary_grade", v)} placeholder="e.g. L4, Band B" />
                      </FieldGroup>

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Bonuses Offered?</label>
                        <div style={styles.checkRow}>
                          <label style={styles.checkLabel}>
                            <input type="radio" name="bonuses_offered" checked={form.bonuses_offered === true} onChange={() => set("bonuses_offered", true)} />
                            Yes
                          </label>
                          <label style={styles.checkLabel}>
                            <input type="radio" name="bonuses_offered" checked={form.bonuses_offered === false} onChange={() => { set("bonuses_offered", false); set("bonus_details", ""); }} />
                            No
                          </label>
                        </div>
                      </div>
                      {form.bonuses_offered && (
                        <FieldGroup label="Bonus Details">
                          <TextareaInput value={form.bonus_details} onChange={(v) => set("bonus_details", v)} rows={3} placeholder="e.g. Signing bonus of ₹50,000; annual performance bonus up to 15% of base salary" />
                        </FieldGroup>
                      )}

                      <FieldGroup label="Other Perks">
                        <TextareaInput value={form.other_perks} onChange={(v) => set("other_perks", v)} rows={3} placeholder="Gym, meals, tuition reimbursement, etc." />
                      </FieldGroup>
                    </>
                  )}

                  {idx === 3 && (
                    <>
                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Required Application Documents <span style={styles.req}>*</span></label>
                        <div style={styles.checkRow}>
                          <label style={styles.checkLabel}>
                            <input type="checkbox" checked={form.resume_required} onChange={(e) => set("resume_required", e.target.checked)} />
                            Resume (Mandatory)
                          </label>
                          <label style={styles.checkLabel}>
                            <input type="checkbox" checked={form.cover_letter_required} onChange={(e) => set("cover_letter_required", e.target.checked)} />
                            Cover Letter
                          </label>
                          <label style={styles.checkLabel}>
                            <input type="checkbox" checked={form.portfolio_required} onChange={(e) => set("portfolio_required", e.target.checked)} />
                            Portfolio / Work Samples
                          </label>
                        </div>
                      </div>

                      <div style={styles.fieldGroup}>
                        <label style={styles.label}>Screening Questions</label>
                        {form.screening_questions.map((q, i) => (
                          <div key={i} style={styles.questionItem}>
                            <span style={styles.questionText}>{i + 1}. {q}</span>
                            <button type="button" title="Remove question" style={styles.removeQ} onClick={() => removeQuestion(i)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <div style={styles.addQuestionRow}>
                          <input
                            style={styles.input}
                            placeholder="Type a screening question..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
                          />
                          <button type="button" title="Add question" style={styles.addQBtn} onClick={addQuestion}>
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </div>

                      <div style={styles.grid2}>
                        <FieldGroup label="Contact Email" req error={errors.contact_email}>
                          <TextInput value={form.contact_email} onChange={(v) => set("contact_email", v)} placeholder="hiring@company.com" error={errors.contact_email} />
                        </FieldGroup>
                        <FieldGroup label="Contact Phone">
                          <TextInput value={form.contact_phone} onChange={(v) => set("contact_phone", v)} placeholder="+91 XXXXXXXXXX" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid3}>
                        <FieldGroup label="Application Deadline">
                          <TextInput value={form.application_deadline} onChange={(v) => set("application_deadline", v)} type="date" />
                        </FieldGroup>
                        <FieldGroup label="Onboarding Date">
                          <TextInput value={form.expected_start_date} onChange={(v) => set("expected_start_date", v)} type="date" />
                        </FieldGroup>
                        <FieldGroup label="Recruitment Timeline">
                          <TextInput value={form.recruitment_timeline} onChange={(v) => set("recruitment_timeline", v)} placeholder="e.g. 2–3 weeks" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid3}>
                        <FieldGroup label="Job Poster">
                          <TextInput value={form.job_poster} onChange={(v) => set("job_poster", v)} placeholder="Name of person posting (if on behalf)" />
                        </FieldGroup>
                        <FieldGroup label="Hiring Manager">
                          <TextInput value={form.hiring_manager} onChange={(v) => set("hiring_manager", v)} placeholder="Hiring manager name" />
                        </FieldGroup>
                        <FieldGroup label="Number of Openings">
                          <TextInput value={form.number_of_openings} onChange={(v) => set("number_of_openings", v)} type="number" placeholder="e.g. 3" />
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  {idx === 4 && (
                    <>
                      <FieldGroup label="Equal Opportunity Statement" req error={errors.equal_opportunity_statement}>
                        <TextareaInput value={form.equal_opportunity_statement} onChange={(v) => set("equal_opportunity_statement", v)} rows={3} placeholder="EOE statement..." error={errors.equal_opportunity_statement} />
                      </FieldGroup>
                      <FieldGroup label="ADA Compliance">
                        <TextInput value={form.ada_compliance} onChange={(v) => set("ada_compliance", v)} placeholder="Americans with Disabilities Act compliance note" />
                      </FieldGroup>
                      <FieldGroup label="Legal Disclosures">
                        <TextareaInput value={form.legal_disclosures} onChange={(v) => set("legal_disclosures", v)} rows={2} placeholder="Any required legal disclosures..." />
                      </FieldGroup>
                      <div style={styles.fieldGroup}>
                        <label style={styles.checkLabel}>
                          <input
                            type="checkbox"
                            checked={form.background_check_required}
                            onChange={(e) => set("background_check_required", e.target.checked)}
                          />
                          <span style={{ marginLeft: 8 }}>Background Check Required</span>
                        </label>
                      </div>
                    </>
                  )}

                  {idx === 5 && (
                    <>
                      <div style={styles.internalNote}>
                        🔒 These fields are for internal use only and will not be shown to candidates.
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Reason for Vacancy">
                          <SelectInput value={form.reason_for_vacancy} onChange={(v) => set("reason_for_vacancy", v)} options={["New role", "Replacement", "Expansion"]} placeholder="Select reason" />
                        </FieldGroup>
                        <FieldGroup label="Budget Code">
                          <TextInput value={form.budget_code} onChange={(v) => set("budget_code", v)} placeholder="Internal budget code" />
                        </FieldGroup>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={styles.submitRow}>
          <button type="button" style={styles.cancelBtn} onClick={() => router.push("/dashboard/job-postings")}>
            Cancel
          </button>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "Posting Job..." : "Post Job"}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  req: { color: "#ef4444" },
  section: {
    background: "#fff", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12, overflow: "hidden",
  },
  sectionHeader: {
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "16px 20px",
    background: "none", border: "none", cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
  },
  sectionTitleRow: { display: "flex", alignItems: "center", gap: 10 },
  sectionNum: {
    width: 26, height: 26, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e" },
  internalBadge: {
    fontSize: 10, padding: "2px 8px", borderRadius: 20,
    background: "#fef3c7", color: "#92400e", fontWeight: 600,
  },
  sectionBody: { padding: "20px" },
  sectionNote: { fontSize: 12, color: "#6b7280", marginBottom: 16, fontStyle: "italic" },
  internalNote: {
    background: "#fef3c7", border: "1px solid #fde68a",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#92400e", marginBottom: 16,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 0 },
  grid4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 },
  fieldGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13.5, color: "#1a1a2e", outline: "none",
    fontFamily: "inherit", background: "#fff",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13.5, color: "#1a1a2e",
    resize: "vertical", outline: "none", fontFamily: "inherit",
    lineHeight: 1.6, minHeight: 90, background: "#fff",
  },
  select: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13.5, color: "#1a1a2e",
    background: "#fff", outline: "none", cursor: "pointer", fontFamily: "inherit",
  },
  inputError: { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.08)" },
  errText: { fontSize: 11, color: "#ef4444", margin: "4px 0 0" },
  hint: { fontSize: 11, color: "#9ca3af", margin: "4px 0 0" },
  checkRow: { display: "flex", gap: 20, flexWrap: "wrap", marginTop: 4 },
  checkLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" },
  questionItem: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#f9fafb", borderRadius: 6, padding: "8px 12px", marginBottom: 6,
  },
  questionText: { flex: 1, fontSize: 13, color: "#374151" },
  removeQ: {
    background: "none", border: "none", cursor: "pointer",
    color: "#ef4444", display: "flex", alignItems: "center",
  },
  addQuestionRow: { display: "flex", gap: 8, marginTop: 6 },
  addQBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 16px", background: "#eff6ff",
    color: "#1a56db", border: "none", borderRadius: 7,
    fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  submitRow: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8, paddingBottom: 24 },
  cancelBtn: {
    padding: "11px 28px", background: "#fff",
    color: "#374151", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  submitBtn: {
    padding: "11px 32px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
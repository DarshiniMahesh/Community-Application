"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EMPLOYMENT_TYPES, WORK_SETTINGS } from "@/lib/constants";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

interface JobForm {
  // 6.1
  job_title: string;
  job_description: string;
  location: string;
  postal_code: string;
  country: string;
  job_code: string;
  department: string;
  functional_area: string;
  // 6.2
  work_setting: string;
  employment_type: string;
  experience_min_years: string;
  experience_min_months: string;
  experience_max_years: string;
  experience_max_months: string;
  duration: string;
  contract_duration: string;
  // 6.3
  company_website: string;
  industry: string;
  // 6.4
  required_skills: string;
  preferred_skills: string;
  technical_skills: string;
  soft_skills: string;
  required_experience: string;
  preferred_qualifications: string;
  certifications: string;
  licenses: string;
  // 6.5
  responsibilities: string;
  key_responsibilities: string;
  role_overview: string;
  day_to_day_activities: string;
  long_term_goals: string;
  team_information: string;
  reports_to: string;
  travel_requirements: string;
  relocation_requirements: string;
  physical_requirements: string;
  shift_schedule: string;
  // 6.6
  salary_min: string;
  salary_max: string;
  salary_grade: string;
  performance_bonuses: string;
  signing_bonus: string;
  health_benefits: string;
  retirement_plan: string;
  paid_time_off: string;
  flexible_hours: string;
  remote_work_options: string;
  other_perks: string;
  // 6.7
  screening_questions: string[];
  resume_required: boolean;
  cover_letter_required: boolean;
  portfolio_required: boolean;
  application_deadline: string;
  expected_start_date: string;
  recruitment_timeline: string;
  contact_phone: string;
  contact_email: string;
  // 6.8
  job_poster: string;
  hiring_manager: string;
  job_expiration: string;
  number_of_openings: string;
  // 6.9
  equal_opportunity_statement: string;
  ada_compliance: string;
  legal_disclosures: string;
  background_check_required: boolean;
  // 6.10 (internal)
  reason_for_vacancy: string;
  budget_code: string;
  resume_scoring: string;
}

const EMPTY_FORM: JobForm = {
  job_title: "", job_description: "", location: "", postal_code: "",
  country: "", job_code: "", department: "", functional_area: "",
  work_setting: "", employment_type: "",
  experience_min_years: "", experience_min_months: "",
  experience_max_years: "", experience_max_months: "",
  duration: "", contract_duration: "",
  company_website: "", industry: "",
  required_skills: "", preferred_skills: "", technical_skills: "",
  soft_skills: "", required_experience: "", preferred_qualifications: "",
  certifications: "", licenses: "",
  responsibilities: "", key_responsibilities: "", role_overview: "",
  day_to_day_activities: "", long_term_goals: "", team_information: "",
  reports_to: "", travel_requirements: "", relocation_requirements: "",
  physical_requirements: "", shift_schedule: "",
  salary_min: "", salary_max: "", salary_grade: "",
  performance_bonuses: "", signing_bonus: "", health_benefits: "",
  retirement_plan: "", paid_time_off: "", flexible_hours: "",
  remote_work_options: "", other_perks: "",
  screening_questions: [],
  resume_required: true, cover_letter_required: false, portfolio_required: false,
  application_deadline: "", expected_start_date: "", recruitment_timeline: "",
  contact_phone: "", contact_email: "",
  job_poster: "", hiring_manager: "", job_expiration: "", number_of_openings: "",
  equal_opportunity_statement: "We are an Equal Opportunity Employer. All qualified applicants will receive consideration for employment without regard to race, color, religion, sex, national origin, disability, or protected veteran status.",
  ada_compliance: "", legal_disclosures: "", background_check_required: false,
  reason_for_vacancy: "", budget_code: "", resume_scoring: "",
};

const SECTIONS = [
  "Job Identification",
  "Work Setting & Employment",
  "Company Information",
  "Qualifications & Requirements",
  "Role Details",
  "Compensation & Benefits",
  "Application Details",
  "Job Settings",
  "Compliance & Legal",
  "Internal / HR Fields",
];

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof JobForm, string>>>({});
  const [openSections, setOpenSections] = useState<number[]>([0]);
  const [loading, setLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

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

  const validate = () => {
    const e: Partial<Record<keyof JobForm, string>> = {};
    if (!form.job_title.trim()) e.job_title = "Job title is required";
    if (!form.job_description.trim()) e.job_description = "Job description is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.postal_code.trim()) e.postal_code = "Postal code is required";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.work_setting) e.work_setting = "Work setting is required";
    if (!form.employment_type) e.employment_type = "Employment type is required";
    if (!form.company_website.trim()) e.company_website = "Company website is required";
    if (!form.required_skills.trim()) e.required_skills = "Required skills are mandatory";
    if (!form.responsibilities.trim()) e.responsibilities = "Responsibilities are mandatory";
    if (!form.key_responsibilities.trim()) e.key_responsibilities = "Key responsibilities are mandatory";
    if (!form.contact_email.trim()) e.contact_email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = "Enter a valid email";
    if (!form.equal_opportunity_statement.trim()) e.equal_opportunity_statement = "EOE statement is required";

    // Expiry not before today
    if (form.job_expiration) {
      const exp = new Date(form.job_expiration);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (exp < today) e.job_expiration = "Expiry date cannot be in the past";
    }

    // Deadline before expiry
    if (form.application_deadline && form.job_expiration) {
      const deadline = new Date(form.application_deadline);
      const expiry = new Date(form.job_expiration);
      if (deadline > expiry) e.application_deadline = "Deadline cannot be after job expiry date";
    }

    // Resume scoring float
    if (form.resume_scoring && isNaN(parseFloat(form.resume_scoring))) {
      e.resume_scoring = "Must be a decimal number (e.g. 0.75)";
    }

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Open sections with errors
      const errorKeys = Object.keys(errs);
      const sectionsToOpen: number[] = [];
      if (errorKeys.some((k) => ["job_title","job_description","location","postal_code","country"].includes(k))) sectionsToOpen.push(0);
      if (errorKeys.some((k) => ["work_setting","employment_type"].includes(k))) sectionsToOpen.push(1);
      if (errorKeys.some((k) => ["company_website"].includes(k))) sectionsToOpen.push(2);
      if (errorKeys.some((k) => ["required_skills"].includes(k))) sectionsToOpen.push(3);
      if (errorKeys.some((k) => ["responsibilities","key_responsibilities"].includes(k))) sectionsToOpen.push(4);
      if (errorKeys.some((k) => ["contact_email","application_deadline"].includes(k))) sectionsToOpen.push(6);
      if (errorKeys.some((k) => ["job_expiration"].includes(k))) sectionsToOpen.push(7);
      if (errorKeys.some((k) => ["equal_opportunity_statement"].includes(k))) sectionsToOpen.push(8);
      if (errorKeys.some((k) => ["resume_scoring"].includes(k))) sectionsToOpen.push(9);
      setOpenSections((prev) => [...new Set([...prev, ...sectionsToOpen])]);
      return;
    }

    setLoading(true);
    try {
      await api.post("/company/jobs", {
        ...form,
        number_of_openings: form.number_of_openings ? Number(form.number_of_openings) : null,
        resume_scoring: form.resume_scoring ? parseFloat(form.resume_scoring) : null,
      });
      router.push("/dashboard/job-postings");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post job";
      setErrors({ job_title: msg });
      setOpenSections((prev) => [...new Set([...prev, 0])]);
    } finally {
      setLoading(false);
    }
  };

  const isContract = form.employment_type === "Contract";

  const F = ({ label, req, children, error }: { label: string; req?: boolean; children: React.ReactNode; error?: string }) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label} {req && <span style={styles.req}>*</span>}
      </label>
      {children}
      {error && <p style={styles.errText}>{error}</p>}
    </div>
  );

  const Input = ({ name, placeholder, type = "text" }: { name: keyof JobForm; placeholder?: string; type?: string }) => (
    <input
      style={{ ...styles.input, ...(errors[name] ? styles.inputError : {}) }}
      type={type}
      placeholder={placeholder}
      value={form[name] as string}
      onChange={(e) => set(name, e.target.value)}
    />
  );

  const Textarea = ({ name, placeholder, rows = 4 }: { name: keyof JobForm; placeholder?: string; rows?: number }) => (
    <textarea
      style={{ ...styles.textarea, ...(errors[name] ? styles.inputError : {}) }}
      rows={rows}
      placeholder={placeholder}
      value={form[name] as string}
      onChange={(e) => set(name, e.target.value)}
    />
  );

  const Select = ({ name, options, placeholder }: { name: keyof JobForm; options: string[]; placeholder?: string }) => (
  <select
    title={placeholder || "Select option"}
    style={{ ...styles.select, ...(errors[name] ? styles.inputError : {}) }}
    value={form[name] as string}
    onChange={(e) => set(name, e.target.value)}
  >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

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
            <div key={section} style={styles.section}>
              <button
                type="button"
                style={styles.sectionHeader}
                onClick={() => toggleSection(idx)}
              >
                <div style={styles.sectionTitleRow}>
                  <span style={styles.sectionNum}>{idx + 1}</span>
                  <span style={styles.sectionTitle}>{section}</span>
                  {idx === 9 && <span style={styles.internalBadge}>Internal — Not visible to candidates</span>}
                </div>
                {open ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
              </button>

              {open && (
                <div style={styles.sectionBody}>
                  {/* ── Section 0: Job Identification ── */}
                  {idx === 0 && (
                    <>
                      <F label="Job Title" req error={errors.job_title}>
                        <Input name="job_title" placeholder="e.g. Senior Software Engineer" />
                      </F>
                      <F label="Job Description" req error={errors.job_description}>
                        <Textarea name="job_description" rows={5} placeholder="Full description of duties, responsibilities, and requirements..." />
                      </F>
                      <div style={styles.grid2}>
                        <F label="Location" req error={errors.location}>
                          <Input name="location" placeholder="City, State, Country" />
                        </F>
                        <F label="Postal Code / ZIP Code" req error={errors.postal_code}>
                          <Input name="postal_code" placeholder="e.g. 560001" />
                        </F>
                      </div>
                      <div style={styles.grid3}>
                        <F label="Country" req error={errors.country}>
                          <Input name="country" placeholder="e.g. India" />
                        </F>
                        <F label="Job Code / Requisition ID">
                          <Input name="job_code" placeholder="Internal tracking code" />
                        </F>
                        <F label="Department">
                          <Input name="department" placeholder="e.g. Engineering" />
                        </F>
                      </div>
                      <F label="Functional Area">
                        <Input name="functional_area" placeholder="e.g. Engineering, Sales, HR" />
                      </F>
                    </>
                  )}

                  {/* ── Section 1: Work Setting & Employment ── */}
                  {idx === 1 && (
                    <>
                      <div style={styles.grid2}>
                        <F label="Work Setting" req error={errors.work_setting}>
                          <Select name="work_setting" options={WORK_SETTINGS} placeholder="Select work setting" />
                        </F>
                        <F label="Employment Type" req error={errors.employment_type}>
                          <Select name="employment_type" options={EMPLOYMENT_TYPES} placeholder="Select employment type" />
                        </F>
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
                        <F label="Duration">
                          <Select name="duration" options={["Permanent", "Temporary"]} placeholder="Select duration" />
                        </F>
                        {isContract && (
                          <F label="Contract Duration">
                            <Input name="contract_duration" placeholder="e.g. 6 months" />
                          </F>
                        )}
                      </div>
                    </>
                  )}

                  {/* ── Section 2: Company Information ── */}
                  {idx === 2 && (
                    <>
                      <div style={styles.grid2}>
                        <F label="Company Website" req error={errors.company_website}>
                          <Input name="company_website" placeholder="https://yourcompany.com" />
                        </F>
                        <F label="Industry">
                          <Input name="industry" placeholder="e.g. Technology, Finance" />
                        </F>
                      </div>
                      <p style={styles.hint}>Company name is auto-filled from your registered profile.</p>
                    </>
                  )}

                  {/* ── Section 3: Qualifications & Requirements ── */}
                  {idx === 3 && (
                    <>
                      <F label="Required Skills & Qualifications" req error={errors.required_skills}>
                        <Textarea name="required_skills" placeholder="List must-have education, experience, technical & soft skills..." />
                      </F>
                      <div style={styles.grid2}>
                        <F label="Preferred Skills">
                          <Textarea name="preferred_skills" rows={3} placeholder="Nice-to-have skills..." />
                        </F>
                        <F label="Technical Skills">
                          <Textarea name="technical_skills" rows={3} placeholder="Specific technical competencies..." />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Soft Skills">
                          <Input name="soft_skills" placeholder="e.g. Communication, Leadership" />
                        </F>
                        <F label="Required Experience">
                          <Input name="required_experience" placeholder="Specific experience requirements" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Preferred Qualifications">
                          <Input name="preferred_qualifications" placeholder="Additional beneficial qualifications" />
                        </F>
                        <F label="Certifications">
                          <Input name="certifications" placeholder="e.g. AWS Certified, PMP" />
                        </F>
                      </div>
                      <F label="Licenses">
                        <Input name="licenses" placeholder="Required professional licenses" />
                      </F>
                    </>
                  )}

                  {/* ── Section 4: Role Details ── */}
                  {idx === 4 && (
                    <>
                      <F label="Role / Responsibilities" req error={errors.responsibilities}>
                        <Textarea name="responsibilities" rows={5} placeholder="Specific duties and expectations (bullet points recommended)..." />
                      </F>
                      <F label="Key Responsibilities" req error={errors.key_responsibilities}>
                        <Textarea name="key_responsibilities" rows={4} placeholder="Priority tasks and day-to-day activities..." />
                      </F>
                      <div style={styles.grid2}>
                        <F label="Role Overview">
                          <Textarea name="role_overview" rows={3} placeholder="High-level overview of position purpose..." />
                        </F>
                        <F label="Day-to-Day Activities">
                          <Textarea name="day_to_day_activities" rows={3} placeholder="Detailed daily tasks..." />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Long-term Goals">
                          <Input name="long_term_goals" placeholder="Role's long-term objectives" />
                        </F>
                        <F label="Team Information">
                          <Input name="team_information" placeholder="Team structure, who you'll work with" />
                        </F>
                      </div>
                      <div style={styles.grid3}>
                        <F label="Reports To">
                          <Input name="reports_to" placeholder="e.g. Engineering Manager" />
                        </F>
                        <F label="Travel Requirements">
                          <Input name="travel_requirements" placeholder="e.g. 20% travel" />
                        </F>
                        <F label="Shift Schedule">
                          <Input name="shift_schedule" placeholder="e.g. 9AM–6PM IST" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Relocation Requirements">
                          <Input name="relocation_requirements" placeholder="Relocation details if required" />
                        </F>
                        <F label="Physical Requirements">
                          <Input name="physical_requirements" placeholder="Physical demands of the job" />
                        </F>
                      </div>
                    </>
                  )}

                  {/* ── Section 5: Compensation & Benefits ── */}
                  {idx === 5 && (
                    <>
                      <p style={styles.sectionNote}>All fields optional — mandatory in some locations by law.</p>
                      <div style={styles.grid2}>
                        <F label="Salary Range — Minimum">
                          <Input name="salary_min" type="number" placeholder="e.g. 500000" />
                        </F>
                        <F label="Salary Range — Maximum">
                          <Input name="salary_max" type="number" placeholder="e.g. 1200000" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Salary Grade">
                          <Input name="salary_grade" placeholder="e.g. L4, Band B" />
                        </F>
                        <F label="Performance Bonuses">
                          <Input name="performance_bonuses" placeholder="Bonus structure details" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Signing Bonus">
                          <Input name="signing_bonus" placeholder="Signing incentive amount" />
                        </F>
                        <F label="Health Benefits">
                          <Input name="health_benefits" placeholder="Medical, dental, vision details" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Retirement Plan">
                          <Input name="retirement_plan" placeholder="e.g. EPF, 401(k)" />
                        </F>
                        <F label="Paid Time Off">
                          <Input name="paid_time_off" placeholder="e.g. 21 days annual leave" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Flexible Hours">
                          <Input name="flexible_hours" placeholder="Flexible working policy" />
                        </F>
                        <F label="Remote Work Options">
                          <Input name="remote_work_options" placeholder="Remote work details" />
                        </F>
                      </div>
                      <F label="Other Perks">
                        <Textarea name="other_perks" rows={3} placeholder="Gym, meals, tuition reimbursement, etc." />
                      </F>
                    </>
                  )}

                  {/* ── Section 6: Application Details ── */}
                  {idx === 6 && (
                    <>
                      {/* Documents */}
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

                      {/* Screening Questions */}
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
                        <F label="Contact Email" req error={errors.contact_email}>
                          <Input name="contact_email" placeholder="hiring@company.com" />
                        </F>
                        <F label="Contact Phone">
                          <Input name="contact_phone" placeholder="+91 XXXXXXXXXX" />
                        </F>
                      </div>
                      <div style={styles.grid3}>
                        <F label="Application Deadline" error={errors.application_deadline}>
                          <Input name="application_deadline" type="date" />
                        </F>
                        <F label="Expected Start Date">
                          <Input name="expected_start_date" type="date" />
                        </F>
                        <F label="Recruitment Timeline">
                          <Input name="recruitment_timeline" placeholder="e.g. 2–3 weeks" />
                        </F>
                      </div>
                    </>
                  )}

                  {/* ── Section 7: Job Settings ── */}
                  {idx === 7 && (
                    <>
                      <div style={styles.grid2}>
                        <F label="Job Poster">
                          <Input name="job_poster" placeholder="Name of person posting (if on behalf)" />
                        </F>
                        <F label="Hiring Manager">
                          <Input name="hiring_manager" placeholder="Hiring manager name" />
                        </F>
                      </div>
                      <div style={styles.grid2}>
                        <F label="Job Posting Expiration" error={errors.job_expiration}>
                          <Input name="job_expiration" type="date" />
                        </F>
                        <F label="Number of Openings">
                          <Input name="number_of_openings" type="number" placeholder="e.g. 3" />
                        </F>
                      </div>
                    </>
                  )}

                  {/* ── Section 8: Compliance & Legal ── */}
                  {idx === 8 && (
                    <>
                      <F label="Equal Opportunity Statement" req error={errors.equal_opportunity_statement}>
                        <Textarea name="equal_opportunity_statement" rows={3} placeholder="EOE statement..." />
                      </F>
                      <F label="ADA Compliance">
                        <Input name="ada_compliance" placeholder="Americans with Disabilities Act compliance note" />
                      </F>
                      <F label="Legal Disclosures">
                        <Textarea name="legal_disclosures" rows={2} placeholder="Any required legal disclosures..." />
                      </F>
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

                  {/* ── Section 9: Internal / HR Fields ── */}
                  {idx === 9 && (
                    <>
                      <div style={styles.internalNote}>
                        🔒 These fields are for internal use only and will not be shown to candidates.
                      </div>
                      <div style={styles.grid2}>
                        <F label="Reason for Vacancy">
                          <Select name="reason_for_vacancy" options={["New role", "Replacement", "Expansion"]} placeholder="Select reason" />
                        </F>
                        <F label="Budget Code">
                          <Input name="budget_code" placeholder="Internal budget code" />
                        </F>
                      </div>
                      <F label="Resume Scoring Weight" error={errors.resume_scoring}>
                        <Input name="resume_scoring" placeholder="Float value e.g. 0.75" />
                      </F>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit */}
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
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
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
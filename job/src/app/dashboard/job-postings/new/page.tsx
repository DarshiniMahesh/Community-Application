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
  work_setting: string;
  employment_type: string;
  experience_min_years: string;
  experience_min_months: string;
  experience_max_years: string;
  experience_max_months: string;
  duration: string;
  contract_duration: string;
  company_website: string;
  industry: string;
  required_skills: string;
  preferred_skills: string;
  technical_skills: string;
  soft_skills: string;
  required_experience: string;
  preferred_qualifications: string;
  certifications: string;
  licenses: string;
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
  job_expiration: string;
  number_of_openings: string;
  equal_opportunity_statement: string;
  ada_compliance: string;
  legal_disclosures: string;
  background_check_required: boolean;
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

// Maps each validated field to the accordion section it lives in.
// Used to auto-open + auto-scroll to the first invalid field on submit.
const FIELD_SECTION: Partial<Record<keyof JobForm, number>> = {
  job_title: 0, job_description: 0, location: 0, postal_code: 0, country: 0,
  work_setting: 1, employment_type: 1,
  company_website: 2,
  required_skills: 3,
  responsibilities: 4, key_responsibilities: 4,
  contact_email: 6, application_deadline: 6,
  job_expiration: 7,
  equal_opportunity_statement: 8,
  resume_scoring: 9,
};

// ─────────────────────────────────────────────────────────────────
// Field components defined OUTSIDE the page component.
//
// These were previously defined INSIDE NewJobPage's function body,
// which meant a brand-new component function was created on every
// re-render (i.e. every keystroke). React saw each one as a
// different component type than the last render, so it unmounted
// the old <input>/<textarea> DOM node and mounted a new one —
// wiping focus after every single character. Defining them here
// keeps a stable identity across renders, which fixes that.
// ─────────────────────────────────────────────────────────────────

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

    if (form.job_expiration) {
      const exp = new Date(form.job_expiration);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (exp < today) e.job_expiration = "Expiry date cannot be in the past";
    }

    if (form.application_deadline && form.job_expiration) {
      const deadline = new Date(form.application_deadline);
      const expiry = new Date(form.job_expiration);
      if (deadline > expiry) e.application_deadline = "Deadline cannot be after job expiry date";
    }

    if (form.resume_scoring && isNaN(parseFloat(form.resume_scoring))) {
      e.resume_scoring = "Must be a decimal number (e.g. 0.75)";
    }

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
        resume_scoring: form.resume_scoring ? parseFloat(form.resume_scoring) : null,
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
                  {idx === 9 && <span style={styles.internalBadge}>Internal — Not visible to candidates</span>}
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
                      <div style={styles.grid2}>
                        <FieldGroup label="Company Website" req error={errors.company_website}>
                          <TextInput value={form.company_website} onChange={(v) => set("company_website", v)} placeholder="https://yourcompany.com" error={errors.company_website} />
                        </FieldGroup>
                        <FieldGroup label="Industry">
                          <TextInput value={form.industry} onChange={(v) => set("industry", v)} placeholder="e.g. Technology, Finance" />
                        </FieldGroup>
                      </div>
                      <p style={styles.hint}>Company name is auto-filled from your registered profile.</p>
                    </>
                  )}

                  {idx === 3 && (
                    <>
                      <FieldGroup label="Required Skills & Qualifications" req error={errors.required_skills}>
                        <TextareaInput value={form.required_skills} onChange={(v) => set("required_skills", v)} rows={5} placeholder="List must-have education, experience, technical & soft skills..." error={errors.required_skills} />
                      </FieldGroup>
                      <div style={styles.grid2}>
                        <FieldGroup label="Preferred Skills">
                          <TextareaInput value={form.preferred_skills} onChange={(v) => set("preferred_skills", v)} rows={3} placeholder="Nice-to-have skills..." />
                        </FieldGroup>
                        <FieldGroup label="Technical Skills">
                          <TextareaInput value={form.technical_skills} onChange={(v) => set("technical_skills", v)} rows={3} placeholder="Specific technical competencies..." />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Soft Skills">
                          <TextInput value={form.soft_skills} onChange={(v) => set("soft_skills", v)} placeholder="e.g. Communication, Leadership" />
                        </FieldGroup>
                        <FieldGroup label="Required Experience">
                          <TextInput value={form.required_experience} onChange={(v) => set("required_experience", v)} placeholder="Specific experience requirements" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Preferred Qualifications">
                          <TextInput value={form.preferred_qualifications} onChange={(v) => set("preferred_qualifications", v)} placeholder="Additional beneficial qualifications" />
                        </FieldGroup>
                        <FieldGroup label="Certifications">
                          <TextInput value={form.certifications} onChange={(v) => set("certifications", v)} placeholder="e.g. AWS Certified, PMP" />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Licenses">
                        <TextInput value={form.licenses} onChange={(v) => set("licenses", v)} placeholder="Required professional licenses" />
                      </FieldGroup>
                    </>
                  )}

                  {idx === 4 && (
                    <>
                      <FieldGroup label="Role / Responsibilities" req error={errors.responsibilities}>
                        <TextareaInput value={form.responsibilities} onChange={(v) => set("responsibilities", v)} rows={5} placeholder="Specific duties and expectations (bullet points recommended)..." error={errors.responsibilities} />
                      </FieldGroup>
                      <FieldGroup label="Key Responsibilities" req error={errors.key_responsibilities}>
                        <TextareaInput value={form.key_responsibilities} onChange={(v) => set("key_responsibilities", v)} rows={4} placeholder="Priority tasks and day-to-day activities..." error={errors.key_responsibilities} />
                      </FieldGroup>
                      <div style={styles.grid2}>
                        <FieldGroup label="Role Overview">
                          <TextareaInput value={form.role_overview} onChange={(v) => set("role_overview", v)} rows={3} placeholder="High-level overview of position purpose..." />
                        </FieldGroup>
                        <FieldGroup label="Day-to-Day Activities">
                          <TextareaInput value={form.day_to_day_activities} onChange={(v) => set("day_to_day_activities", v)} rows={3} placeholder="Detailed daily tasks..." />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Long-term Goals">
                          <TextInput value={form.long_term_goals} onChange={(v) => set("long_term_goals", v)} placeholder="Role's long-term objectives" />
                        </FieldGroup>
                        <FieldGroup label="Team Information">
                          <TextInput value={form.team_information} onChange={(v) => set("team_information", v)} placeholder="Team structure, who you'll work with" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid3}>
                        <FieldGroup label="Reports To">
                          <TextInput value={form.reports_to} onChange={(v) => set("reports_to", v)} placeholder="e.g. Engineering Manager" />
                        </FieldGroup>
                        <FieldGroup label="Travel Requirements">
                          <TextInput value={form.travel_requirements} onChange={(v) => set("travel_requirements", v)} placeholder="e.g. 20% travel" />
                        </FieldGroup>
                        <FieldGroup label="Shift Schedule">
                          <TextInput value={form.shift_schedule} onChange={(v) => set("shift_schedule", v)} placeholder="e.g. 9AM–6PM IST" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Relocation Requirements">
                          <TextInput value={form.relocation_requirements} onChange={(v) => set("relocation_requirements", v)} placeholder="Relocation details if required" />
                        </FieldGroup>
                        <FieldGroup label="Physical Requirements">
                          <TextInput value={form.physical_requirements} onChange={(v) => set("physical_requirements", v)} placeholder="Physical demands of the job" />
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  {idx === 5 && (
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
                      <div style={styles.grid2}>
                        <FieldGroup label="Salary Grade">
                          <TextInput value={form.salary_grade} onChange={(v) => set("salary_grade", v)} placeholder="e.g. L4, Band B" />
                        </FieldGroup>
                        <FieldGroup label="Performance Bonuses">
                          <TextInput value={form.performance_bonuses} onChange={(v) => set("performance_bonuses", v)} placeholder="Bonus structure details" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Signing Bonus">
                          <TextInput value={form.signing_bonus} onChange={(v) => set("signing_bonus", v)} placeholder="Signing incentive amount" />
                        </FieldGroup>
                        <FieldGroup label="Health Benefits">
                          <TextInput value={form.health_benefits} onChange={(v) => set("health_benefits", v)} placeholder="Medical, dental, vision details" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Retirement Plan">
                          <TextInput value={form.retirement_plan} onChange={(v) => set("retirement_plan", v)} placeholder="e.g. EPF, 401(k)" />
                        </FieldGroup>
                        <FieldGroup label="Paid Time Off">
                          <TextInput value={form.paid_time_off} onChange={(v) => set("paid_time_off", v)} placeholder="e.g. 21 days annual leave" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Flexible Hours">
                          <TextInput value={form.flexible_hours} onChange={(v) => set("flexible_hours", v)} placeholder="Flexible working policy" />
                        </FieldGroup>
                        <FieldGroup label="Remote Work Options">
                          <TextInput value={form.remote_work_options} onChange={(v) => set("remote_work_options", v)} placeholder="Remote work details" />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Other Perks">
                        <TextareaInput value={form.other_perks} onChange={(v) => set("other_perks", v)} rows={3} placeholder="Gym, meals, tuition reimbursement, etc." />
                      </FieldGroup>
                    </>
                  )}

                  {idx === 6 && (
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
                        <FieldGroup label="Application Deadline" error={errors.application_deadline}>
                          <TextInput value={form.application_deadline} onChange={(v) => set("application_deadline", v)} type="date" error={errors.application_deadline} />
                        </FieldGroup>
                        <FieldGroup label="Expected Start Date">
                          <TextInput value={form.expected_start_date} onChange={(v) => set("expected_start_date", v)} type="date" />
                        </FieldGroup>
                        <FieldGroup label="Recruitment Timeline">
                          <TextInput value={form.recruitment_timeline} onChange={(v) => set("recruitment_timeline", v)} placeholder="e.g. 2–3 weeks" />
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  {idx === 7 && (
                    <>
                      <div style={styles.grid2}>
                        <FieldGroup label="Job Poster">
                          <TextInput value={form.job_poster} onChange={(v) => set("job_poster", v)} placeholder="Name of person posting (if on behalf)" />
                        </FieldGroup>
                        <FieldGroup label="Hiring Manager">
                          <TextInput value={form.hiring_manager} onChange={(v) => set("hiring_manager", v)} placeholder="Hiring manager name" />
                        </FieldGroup>
                      </div>
                      <div style={styles.grid2}>
                        <FieldGroup label="Job Posting Expiration" error={errors.job_expiration}>
                          <TextInput value={form.job_expiration} onChange={(v) => set("job_expiration", v)} type="date" error={errors.job_expiration} />
                        </FieldGroup>
                        <FieldGroup label="Number of Openings">
                          <TextInput value={form.number_of_openings} onChange={(v) => set("number_of_openings", v)} type="number" placeholder="e.g. 3" />
                        </FieldGroup>
                      </div>
                    </>
                  )}

                  {idx === 8 && (
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

                  {idx === 9 && (
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
                      <FieldGroup label="Resume Scoring Weight" error={errors.resume_scoring}>
                        <TextInput value={form.resume_scoring} onChange={(v) => set("resume_scoring", v)} placeholder="Float value e.g. 0.75" error={errors.resume_scoring} />
                      </FieldGroup>
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
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { ArrowLeft, Edit2, Eye, Users, Save, X } from "lucide-react";

interface Job {
  id: string;
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
  experience_min_years: number;
  experience_max_years: number;
  duration: string;
  contract_duration: string;
  company_name: string;
  company_website: string;
  industry: string;
  required_skills: string;
  preferred_skills: string;
  technical_skills: string;
  soft_skills: string;
  responsibilities: string;
  key_responsibilities: string;
  salary_min: number;
  salary_max: number;
  contact_email: string;
  contact_phone: string;
  screening_questions: string[];
  resume_required: boolean;
  cover_letter_required: boolean;
  portfolio_required: boolean;
  application_deadline: string;
  expected_start_date: string;
  number_of_openings: number;
  job_expiration: string;
  equal_opportunity_statement: string;
  background_check_required: boolean;
  status: string;
  posted_at: string;
  applicant_count: number;
}

interface Applicant {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  applied_at: string;
  resume_url: string;
  cover_letter_url: string;
  portfolio_url: string;
}

const WORK_SETTINGS = ["On-site", "Hybrid", "Remote"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Volunteer", "Contract"];
const JOB_STATUSES = ["active", "draft", "expired"];

export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "applicants">("details");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(searchParams.get("edit") === "true");
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [saving, setSaving] = useState(false);
  const [questionsRaw, setQuestionsRaw] = useState(""); // comma/newline separated

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/${jobId}`),
      api.get(`/jobs/${jobId}/applicants`),
    ])
      .then(([jobData, applicantsData]) => {
        setJob(jobData.job);
        setApplicants(applicantsData.applicants || []);
        setEditForm(jobData.job);
        setQuestionsRaw((jobData.job.screening_questions || []).join("\n"));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleEnterEdit = () => {
    setEditForm(job ?? {});
    setQuestionsRaw((job?.screening_questions || []).join("\n"));
    setIsEditMode(true);
    setActiveTab("details");
  };

  const handleCancelEdit = () => {
    setEditForm(job ?? {});
    setQuestionsRaw((job?.screening_questions || []).join("\n"));
    setIsEditMode(false);
  };

  const handleField = (field: keyof Job, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveJob = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        screening_questions: questionsRaw
          .split(/[\n,]+/)
          .map((q) => q.trim())
          .filter(Boolean),
      };
      const updated = await api.patch(`/jobs/${jobId}`, payload);
      const updatedJob = updated.job ?? updated;
      setJob(updatedJob);
      setEditForm(updatedJob);
      setIsEditMode(false);
      showToast("Job updated successfully!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (applicantId: string, newStatus: string, currentStatus: string) => {
    const statusOrder = APPLICATION_STATUSES;
    const currentIdx = statusOrder.indexOf(currentStatus);
    const newIdx = statusOrder.indexOf(newStatus);
    if (newStatus === "Submitted" && currentIdx > 0) {
      showToast("Cannot move applicant back to Submitted status.");
      return;
    }
    if (newIdx < currentIdx && newStatus !== "Rejected") {
      showToast("Cannot move applicant to a previous status.");
      return;
    }
    setUpdatingStatus(applicantId);
    try {
      await api.patch(`/jobs/${jobId}/applicants/${applicantId}/status`, { status: newStatus });
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
      );
      showToast(`Status updated to "${newStatus}"`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!job) return <div style={styles.loading}>Job not found.</div>;

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      "Submitted":          { background: "#eff6ff", color: "#1e40af" },
      "Application Viewed": { background: "#f0f9ff", color: "#0369a1" },
      "In Review":          { background: "#fef3c7", color: "#92400e" },
      "Interviewing":       { background: "#ede9fe", color: "#5b21b6" },
      "Rejected":           { background: "#fee2e2", color: "#991b1b" },
      "Offer":              { background: "#d1fae5", color: "#065f46" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  return (
    <div>
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Header */}
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard/job-postings")}>
          <ArrowLeft size={16} /> Back to Jobs
        </button>
        <div style={styles.headerRight}>
          {isEditMode ? (
            <>
              <button style={styles.cancelBtn} onClick={handleCancelEdit} disabled={saving}>
                <X size={14} /> Cancel
              </button>
              <button style={styles.saveBtn} onClick={handleSaveJob} disabled={saving}>
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button style={styles.editBtn} onClick={handleEnterEdit}>
              <Edit2 size={14} /> Edit Job
            </button>
          )}
        </div>
      </div>

      {/* Job Title Banner */}
      <div style={styles.banner}>
        <div style={{ flex: 1 }}>
          {isEditMode ? (
            <input
              style={styles.titleInput}
              value={editForm.job_title ?? ""}
              onChange={(e) => handleField("job_title", e.target.value)}
              placeholder="Job Title"
              title="Job Title"
            />
          ) : (
            <h1 style={styles.bannerTitle}>{job.job_title}</h1>
          )}
          <div style={styles.bannerMeta}>
            <span>{job.company_name}</span>
            <span style={styles.dot}>·</span>
            <span>{job.location}</span>
            <span style={styles.dot}>·</span>
            <span>{job.work_setting}</span>
            <span style={styles.dot}>·</span>
            <span>{job.employment_type}</span>
          </div>
        </div>
        <div style={styles.bannerStats}>
          <div style={styles.statBubble}>
            <Users size={16} color="#1a56db" />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{job.applicant_count}</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Applicants</span>
          </div>
          {isEditMode ? (
            <select
              title="Job Status"
              style={styles.statusSelect}
              value={editForm.status ?? job.status}
              onChange={(e) => handleField("status", e.target.value)}
            >
              {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span style={{ ...styles.statusBadge, ...statusStyle(job.status) }}>{job.status}</span>
          )}
        </div>
      </div>

      {/* Tabs — hide applicants tab in edit mode */}
      <div style={styles.tabs}>
        {(["details", "applicants"] as const).map((tab) => {
          if (isEditMode && tab === "applicants") return null;
          return (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "details" ? <Eye size={14} /> : <Users size={14} />}
              {tab === "details" ? (isEditMode ? "Editing Details" : "Job Details") : `Applicants (${applicants.length})`}
            </button>
          );
        })}
      </div>

      {/* ── EDIT FORM ── */}
      {isEditMode && activeTab === "details" && (
        <div style={styles.editGrid}>

          <EditSection title="Basic Information">
            <div style={styles.formGrid2}>
              <Field label="Job Title" required>
                <input style={styles.input} value={editForm.job_title ?? ""} onChange={(e) => handleField("job_title", e.target.value)} placeholder="e.g. Senior Developer" title="Job Title" />
              </Field>
              <Field label="Job Code">
                <input style={styles.input} value={editForm.job_code ?? ""} onChange={(e) => handleField("job_code", e.target.value)} placeholder="e.g. ENG-001" title="Job Code" />
              </Field>
              <Field label="Department">
                <input style={styles.input} value={editForm.department ?? ""} onChange={(e) => handleField("department", e.target.value)} placeholder="e.g. Engineering" title="Department" />
              </Field>
              <Field label="Functional Area">
                <input style={styles.input} value={editForm.functional_area ?? ""} onChange={(e) => handleField("functional_area", e.target.value)} placeholder="e.g. Software" title="Functional Area" />
              </Field>
              <Field label="Industry">
                <input style={styles.input} value={editForm.industry ?? ""} onChange={(e) => handleField("industry", e.target.value)} placeholder="e.g. Technology" title="Industry" />
              </Field>
              <Field label="Number of Openings">
                <input style={styles.input} type="number" min={1} value={editForm.number_of_openings ?? ""} onChange={(e) => handleField("number_of_openings", Number(e.target.value))} title="Number of Openings" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="Job Description">
            <Field label="Description" required>
              <textarea style={styles.textarea} rows={5} value={editForm.job_description ?? ""} onChange={(e) => handleField("job_description", e.target.value)} placeholder="Describe the role..." title="Job Description" />
            </Field>
            <Field label="Key Responsibilities">
              <textarea style={styles.textarea} rows={5} value={editForm.key_responsibilities ?? ""} onChange={(e) => handleField("key_responsibilities", e.target.value)} placeholder="List key responsibilities..." title="Key Responsibilities" />
            </Field>
          </EditSection>

          <EditSection title="Skills">
            <div style={styles.formGrid2}>
              <Field label="Required Skills">
                <textarea style={styles.textarea} rows={3} value={editForm.required_skills ?? ""} onChange={(e) => handleField("required_skills", e.target.value)} placeholder="e.g. React, Node.js" title="Required Skills" />
              </Field>
              <Field label="Preferred Skills">
                <textarea style={styles.textarea} rows={3} value={editForm.preferred_skills ?? ""} onChange={(e) => handleField("preferred_skills", e.target.value)} placeholder="e.g. GraphQL, Docker" title="Preferred Skills" />
              </Field>
              <Field label="Technical Skills">
                <textarea style={styles.textarea} rows={3} value={editForm.technical_skills ?? ""} onChange={(e) => handleField("technical_skills", e.target.value)} placeholder="e.g. Python, AWS" title="Technical Skills" />
              </Field>
              <Field label="Soft Skills">
                <textarea style={styles.textarea} rows={3} value={editForm.soft_skills ?? ""} onChange={(e) => handleField("soft_skills", e.target.value)} placeholder="e.g. Communication, Leadership" title="Soft Skills" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="Work Details">
            <div style={styles.formGrid2}>
              <Field label="Work Setting">
                <select style={styles.input} value={editForm.work_setting ?? ""} onChange={(e) => handleField("work_setting", e.target.value)} title="Work Setting">
                  <option value="">Select...</option>
                  {WORK_SETTINGS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Employment Type">
                <select style={styles.input} value={editForm.employment_type ?? ""} onChange={(e) => handleField("employment_type", e.target.value)} title="Employment Type">
                  <option value="">Select...</option>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Min Experience (yrs)">
                <input style={styles.input} type="number" min={0} value={editForm.experience_min_years ?? ""} onChange={(e) => handleField("experience_min_years", Number(e.target.value))} title="Minimum Experience" />
              </Field>
              <Field label="Max Experience (yrs)">
                <input style={styles.input} type="number" min={0} value={editForm.experience_max_years ?? ""} onChange={(e) => handleField("experience_max_years", Number(e.target.value))} title="Maximum Experience" />
              </Field>
              <Field label="Salary Min (₹)">
                <input style={styles.input} type="number" min={0} value={editForm.salary_min ?? ""} onChange={(e) => handleField("salary_min", Number(e.target.value))} title="Minimum Salary" />
              </Field>
              <Field label="Salary Max (₹)">
                <input style={styles.input} type="number" min={0} value={editForm.salary_max ?? ""} onChange={(e) => handleField("salary_max", Number(e.target.value))} title="Maximum Salary" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="Location & Contact">
            <div style={styles.formGrid2}>
              <Field label="Location">
                <input style={styles.input} value={editForm.location ?? ""} onChange={(e) => handleField("location", e.target.value)} placeholder="e.g. Bengaluru" title="Location" />
              </Field>
              <Field label="Postal Code">
                <input style={styles.input} value={editForm.postal_code ?? ""} onChange={(e) => handleField("postal_code", e.target.value)} title="Postal Code" />
              </Field>
              <Field label="Country">
                <input style={styles.input} value={editForm.country ?? ""} onChange={(e) => handleField("country", e.target.value)} title="Country" />
              </Field>
              <Field label="Contact Email">
                <input style={styles.input} type="email" value={editForm.contact_email ?? ""} onChange={(e) => handleField("contact_email", e.target.value)} title="Contact Email" />
              </Field>
              <Field label="Contact Phone">
                <input style={styles.input} value={editForm.contact_phone ?? ""} onChange={(e) => handleField("contact_phone", e.target.value)} title="Contact Phone" />
              </Field>
              <Field label="Company Website">
                <input style={styles.input} value={editForm.company_website ?? ""} onChange={(e) => handleField("company_website", e.target.value)} title="Company Website" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="Dates">
            <div style={styles.formGrid2}>
              <Field label="Application Deadline">
                <input style={styles.input} type="date" value={editForm.application_deadline?.slice(0, 10) ?? ""} onChange={(e) => handleField("application_deadline", e.target.value)} title="Application Deadline" />
              </Field>
              <Field label="Expected Start Date">
                <input style={styles.input} type="date" value={editForm.expected_start_date?.slice(0, 10) ?? ""} onChange={(e) => handleField("expected_start_date", e.target.value)} title="Expected Start Date" />
              </Field>
              <Field label="Job Expiration Date">
                <input style={styles.input} type="date" value={editForm.job_expiration?.slice(0, 10) ?? ""} onChange={(e) => handleField("job_expiration", e.target.value)} title="Job Expiration Date" />
              </Field>
            </div>
          </EditSection>

          <EditSection title="Required Documents">
            <div style={styles.checkRow}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={true} disabled title="Resume required" /> Resume (always required)
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  title="Cover letter required"
                  checked={editForm.cover_letter_required ?? false}
                  onChange={(e) => handleField("cover_letter_required", e.target.checked)}
                /> Cover Letter Required
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  title="Portfolio required"
                  checked={editForm.portfolio_required ?? false}
                  onChange={(e) => handleField("portfolio_required", e.target.checked)}
                /> Portfolio Required
              </label>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  title="Background check required"
                  checked={editForm.background_check_required ?? false}
                  onChange={(e) => handleField("background_check_required", e.target.checked)}
                /> Background Check Required
              </label>
            </div>
          </EditSection>

          <EditSection title="Screening Questions">
            <p style={styles.fieldHint}>One question per line.</p>
            <textarea
              style={styles.textarea}
              rows={5}
              title="Screening Questions"
              value={questionsRaw}
              onChange={(e) => setQuestionsRaw(e.target.value)}
              placeholder={"Do you have a valid driver's license?\nAre you willing to relocate?"}
            />
          </EditSection>

          <EditSection title="Equal Opportunity Statement">
            <textarea
              style={styles.textarea}
              rows={3}
              title="Equal Opportunity Statement"
              value={editForm.equal_opportunity_statement ?? ""}
              onChange={(e) => handleField("equal_opportunity_statement", e.target.value)}
              placeholder="We are an equal opportunity employer..."
            />
          </EditSection>

          {/* Bottom save bar */}
          <div style={styles.saveBar}>
            <button style={styles.cancelBtn} onClick={handleCancelEdit} disabled={saving}>
              <X size={14} /> Cancel
            </button>
            <button style={styles.saveBtn} onClick={handleSaveJob} disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW: Details Tab ── */}
      {!isEditMode && activeTab === "details" && (
        <div style={styles.detailGrid}>
          <Section title="Job Description">
            <p style={styles.bodyText}>{job.job_description}</p>
          </Section>
          <Section title="Key Responsibilities">
            <p style={styles.bodyText}>{job.key_responsibilities}</p>
          </Section>
          <Section title="Required Skills & Qualifications">
            <p style={styles.bodyText}>{job.required_skills}</p>
          </Section>
          {job.preferred_skills && (
            <Section title="Preferred Skills">
              <p style={styles.bodyText}>{job.preferred_skills}</p>
            </Section>
          )}
          <Section title="Job Details">
            <div style={styles.infoGrid}>
              <Info label="Work Setting" value={job.work_setting} />
              <Info label="Employment Type" value={job.employment_type} />
              <Info label="Experience" value={`${job.experience_min_years}–${job.experience_max_years} yrs`} />
              <Info label="Location" value={`${job.location}, ${job.country} ${job.postal_code}`} />
              {job.salary_min && <Info label="Salary Range" value={`₹${job.salary_min.toLocaleString()} – ₹${job.salary_max?.toLocaleString()}`} />}
              {job.number_of_openings && <Info label="Openings" value={String(job.number_of_openings)} />}
              {job.application_deadline && <Info label="Application Deadline" value={new Date(job.application_deadline).toLocaleDateString()} />}
              {job.expected_start_date && <Info label="Expected Start" value={new Date(job.expected_start_date).toLocaleDateString()} />}
              <Info label="Contact Email" value={job.contact_email} />
              {job.contact_phone && <Info label="Contact Phone" value={job.contact_phone} />}
            </div>
          </Section>
          <Section title="Required Documents">
            <div style={styles.checksList}>
              <span style={checkItemStyle(true)}>✓ Resume (Required)</span>
              <span style={checkItemStyle(job.cover_letter_required)}>
                {job.cover_letter_required ? "✓" : "○"} Cover Letter {job.cover_letter_required ? "(Required)" : "(Optional)"}
              </span>
              <span style={checkItemStyle(job.portfolio_required)}>
                {job.portfolio_required ? "✓" : "○"} Portfolio {job.portfolio_required ? "(Required)" : "(Optional)"}
              </span>
            </div>
          </Section>
          {job.screening_questions?.length > 0 && (
            <Section title="Screening Questions">
              {job.screening_questions.map((q, i) => (
                <p key={i} style={styles.questionLine}>{i + 1}. {q}</p>
              ))}
            </Section>
          )}
          <Section title="Compliance">
            <p style={{ ...styles.bodyText, fontStyle: "italic", fontSize: 12 }}>{job.equal_opportunity_statement}</p>
            {job.background_check_required && (
              <p style={{ fontSize: 12, color: "#92400e", marginTop: 8 }}>⚠ Background check required for this role.</p>
            )}
          </Section>
        </div>
      )}

      {/* ── Applicants Tab ── */}
      {!isEditMode && activeTab === "applicants" && (
        <div style={styles.card}>
          {applicants.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={40} color="#d1d5db" />
              <p style={{ color: "#6b7280", margin: "8px 0 0" }}>No applications received yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Applicant", "Applied On", "Documents", "Status", "Update Status"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app) => (
                    <tr key={app.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.applicantCell}>
                          <div style={styles.appAvatar}>{app.applicant_name.charAt(0)}</div>
                          <div>
                            <p style={styles.appName}>{app.applicant_name}</p>
                            <p style={styles.appEmail}>{app.applicant_email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <div style={styles.docsRow}>
                          {app.resume_url && <a href={app.resume_url} target="_blank" rel="noreferrer" style={styles.docLink}>Resume</a>}
                          {app.cover_letter_url && <a href={app.cover_letter_url} target="_blank" rel="noreferrer" style={styles.docLink}>Cover Letter</a>}
                          {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noreferrer" style={styles.docLink}>Portfolio</a>}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...statusStyle(app.status) }}>{app.status}</span>
                      </td>
                      <td style={styles.td}>
                        <select
                          title="Update application status"
                          style={styles.statusSelect}
                          value={app.status}
                          disabled={updatingStatus === app.id || app.status === "Rejected" || app.status === "Offer"}
                          onChange={(e) => handleStatusUpdate(app.id, e.target.value, app.status)}
                        >
                          {APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {updatingStatus === app.id && <span style={styles.updatingText}>Updating...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>{title}</h3>
      {children}
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px", paddingBottom: 8, borderBottom: "2px solid #eff6ff", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#1a1a2e", margin: 0, fontWeight: 500 }}>{value || "—"}</p>
    </div>
  );
}

const checkItemStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 13,
  color: active ? "#065f46" : "#9ca3af",
  fontWeight: active ? 600 : 400,
});

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: "center", color: "#6b7280", fontFamily: "'Segoe UI', sans-serif" },
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 100,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 20px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, fontWeight: 500, padding: 0,
  },
  headerRight: { display: "flex", gap: 10 },
  editBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 16px", background: "#eff6ff",
    color: "#1a56db", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 18px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  cancelBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 16px", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  banner: {
    background: "#fff", borderRadius: 10, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16,
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  },
  bannerTitle: { fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  titleInput: {
    fontSize: 20, fontWeight: 700, color: "#1a1a2e",
    border: "1.5px solid #1a56db", borderRadius: 6,
    padding: "4px 10px", outline: "none", width: "100%",
    boxSizing: "border-box", marginBottom: 8,
    fontFamily: "'Segoe UI', sans-serif",
  },
  bannerMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 13, color: "#6b7280" },
  dot: { color: "#d1d5db" },
  bannerStats: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  statBubble: {
    display: "flex", flexDirection: "column", alignItems: "center",
    background: "#eff6ff", borderRadius: 10, padding: "10px 16px", gap: 2,
  },
  statusBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, display: "inline-block" },
  statusSelect: {
    padding: "6px 10px", border: "1.5px solid #d1d5db",
    borderRadius: 6, fontSize: 12, color: "#374151",
    background: "#fff", cursor: "pointer", outline: "none",
  },
  tabs: { display: "flex", gap: 4, marginBottom: 16 },
  tab: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 18px", borderRadius: 8,
    border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 500,
    background: "#fff", color: "#6b7280",
  },
  tabActive: { background: "#1a56db", color: "#fff", fontWeight: 600 },
  detailGrid: { display: "flex", flexDirection: "column", gap: 0 },
  editGrid: { display: "flex", flexDirection: "column", gap: 0 },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  bodyText: { fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" },
  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e",
    outline: "none", fontFamily: "'Segoe UI', sans-serif",
    background: "#fff",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e",
    outline: "none", resize: "vertical",
    fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.6,
  },
  fieldHint: { fontSize: 11, color: "#9ca3af", margin: "0 0 6px" },
  checkRow: { display: "flex", flexDirection: "column", gap: 10 },
  checkLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" },
  checksList: { display: "flex", flexDirection: "column", gap: 6 },
  questionLine: { fontSize: 13, color: "#374151", margin: "0 0 6px" },
  saveBar: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "16px 0 4px",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th: { fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "10px 14px", textAlign: "left", borderBottom: "2px solid #f3f4f6" },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "12px 14px", fontSize: 13, color: "#374151", verticalAlign: "middle" },
  applicantCell: { display: "flex", alignItems: "center", gap: 10 },
  appAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  appName: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" },
  appEmail: { fontSize: 11, color: "#6b7280", margin: 0 },
  docsRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  docLink: {
    fontSize: 11, padding: "3px 8px", borderRadius: 4,
    background: "#eff6ff", color: "#1a56db",
    textDecoration: "none", fontWeight: 600,
  },
  updatingText: { fontSize: 11, color: "#6b7280", marginLeft: 6 },
  emptyState: {
    textAlign: "center", padding: "48px 0",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
};
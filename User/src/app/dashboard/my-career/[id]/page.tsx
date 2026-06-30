"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft, MapPin, Briefcase, Clock, Users, Building2,
  BookmarkCheck, Bookmark, CheckCircle2, AlertCircle, X,
  Upload, FileText, Link as LinkIcon, ChevronDown, ChevronUp,
} from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  job_description: string;
  location: string;
  postal_code: string;
  country: string;
  department: string;
  functional_area: string;
  work_setting: string;
  employment_type: string;
  experience_min_years: number;
  experience_max_years: number;
  company_name: string;
  company_website: string;
  industry: string;
  required_skills: string;
  preferred_skills: string;
  technical_skills: string;
  soft_skills: string;
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
  equal_opportunity_statement: string;
  background_check_required: boolean;
  status: string;
  posted_at: string;
  applicant_count: number;
}

interface ApplicationStatus {
  hasApplied: boolean;
  status?: string;
}

type ModalStep = "idle" | "form" | "submitting" | "success" | "error";

export default function UserJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingId, setSavingId] = useState(false);
  const [appStatus, setAppStatus] = useState<ApplicationStatus>({ hasApplied: false });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Apply modal
  const [modalStep, setModalStep] = useState<ModalStep>("idle");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const resumeRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Expandable sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    description: true,
    responsibilities: true,
    skills: true,
    details: true,
    documents: true,
    questions: true,
    compliance: false,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/public/${jobId}`),
      api.get("/jobs/saved").catch(() => ({ saved_jobs: [] })),
      api.get("/jobs/my-applications").catch(() => ({ applications: [] })),
    ]).then(([jobData, savedData, appsData]) => {
      setJob(jobData.job ?? jobData);
      const savedIds = new Set<string>(
        (savedData.saved_jobs || []).map((s: { job_id: string }) => s.job_id)
      );
      setIsSaved(savedIds.has(jobId));
      const myApp = (appsData.applications || []).find(
        (a: { job_id?: string; id?: string; status: string }) =>
          a.job_id === jobId || a.id === jobId
      );
      if (myApp) setAppStatus({ hasApplied: true, status: myApp.status });
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (job?.screening_questions?.length) {
      setAnswers(new Array(job.screening_questions.length).fill(""));
    }
  }, [job]);

  const handleSave = async () => {
    setSavingId(true);
    try {
      const d = await api.post(`/jobs/save/${jobId}`, {});
      setIsSaved(d.saved);
      showToast(d.saved ? "Job saved!" : "Removed from saved jobs");
    } catch {
      showToast("Could not save job", "error");
    } finally {
      setSavingId(false);
    }
  };

  const openApplyModal = () => {
    setResumeFile(null);
    setCoverLetterFile(null);
    setPortfolioUrl("");
    setAnswers(new Array(job?.screening_questions?.length ?? 0).fill(""));
    setErrorMsg("");
    setModalStep("form");
  };

  const handleSubmitApplication = async () => {
    if (!resumeFile) {
      setErrorMsg("Please upload your resume.");
      return;
    }
    if (job?.cover_letter_required && !coverLetterFile) {
      setErrorMsg("Cover letter is required for this role.");
      return;
    }
    if (job?.screening_questions?.length && answers.some((a) => !a.trim())) {
      setErrorMsg("Please answer all screening questions.");
      return;
    }

    setModalStep("submitting");
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      if (coverLetterFile) formData.append("cover_letter", coverLetterFile);
      if (portfolioUrl) formData.append("portfolio_url", portfolioUrl);
      if (answers.length) formData.append("answers", JSON.stringify(answers));

      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/jobs/apply/${jobId}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
}).then(res => { if (!res.ok) throw new Error("Failed to submit"); return res.json(); });
      setAppStatus({ hasApplied: true, status: "Submitted" });
      setModalStep("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setModalStep("error");
    }
  };

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const appStatusStyle = (s?: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      "Submitted":          { background: "#eff6ff", color: "#1e40af" },
      "Application Viewed": { background: "#f0f9ff", color: "#0369a1" },
      "In Review":          { background: "#fef3c7", color: "#92400e" },
      "Interviewing":       { background: "#ede9fe", color: "#5b21b6" },
      "Rejected":           { background: "#fee2e2", color: "#991b1b" },
      "Offer":              { background: "#d1fae5", color: "#065f46" },
    };
    return s ? (map[s] ?? { background: "#f3f4f6", color: "#6b7280" }) : {};
  };

  if (loading) return <div style={styles.loading}>Loading job details...</div>;
  if (!job) return (
    <div style={styles.loading}>
      <AlertCircle size={36} color="#d1d5db" />
      <p>Job not found or no longer available.</p>
      <button style={styles.backBtnSolid} onClick={() => router.push("/dashboard/my-career")}>
        Back to Jobs
      </button>
    </div>
  );

  const deadline = job.application_deadline ? new Date(job.application_deadline) : null;
  const isExpired = deadline ? deadline < new Date() : false;
  const canApply = !appStatus.hasApplied && !isExpired && job.status === "active";

  return (
    <div style={styles.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === "error" ? styles.toastError : {}) }}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
        <ArrowLeft size={15} /> Back to Job Search
      </button>

      {/* Expired banner */}
      {isExpired && (
        <div style={styles.expiredBanner}>
          <AlertCircle size={15} /> This job posting has closed — applications are no longer accepted.
        </div>
      )}

      {/* ── Hero card ── */}
      <div style={styles.heroCard}>
        <div style={styles.companyAvatar}>{job.company_name.charAt(0)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={styles.jobTitle}>{job.job_title}</h1>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}><Building2 size={13} /> {job.company_name}</span>
            <span style={styles.metaItem}><MapPin size={13} /> {job.location}{job.country ? `, ${job.country}` : ""}</span>
            <span style={styles.metaItem}><Briefcase size={13} /> {job.employment_type}</span>
            <span style={styles.metaItem}><Clock size={13} /> {job.work_setting}</span>
            <span style={styles.metaItem}><Users size={13} /> {job.applicant_count} applicants</span>
          </div>

          <div style={styles.tagsRow}>
            {job.department && <span style={styles.tag}>{job.department}</span>}
            {job.industry && <span style={styles.tag}>{job.industry}</span>}
            {job.functional_area && <span style={styles.tag}>{job.functional_area}</span>}
            {(job.experience_min_years !== null) && (
              <span style={styles.tag}>
                {job.experience_min_years}–{job.experience_max_years ?? "+"} yrs exp
              </span>
            )}
            {job.salary_min ? (
              <span style={styles.salaryTag}>
                ₹{(job.salary_min / 100000).toFixed(1)}L – ₹{((job.salary_max || job.salary_min) / 100000).toFixed(1)}L
              </span>
            ) : null}
          </div>

          <div style={styles.metaRow} >
            {deadline && (
              <span style={{ fontSize: 12, color: isExpired ? "#dc2626" : "#6b7280" }}>
                {isExpired ? "⚠ Deadline passed" : `⏰ Apply by ${deadline.toLocaleDateString()}`}
              </span>
            )}
            {job.number_of_openings > 0 && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>· {job.number_of_openings} opening{job.number_of_openings > 1 ? "s" : ""}</span>
            )}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>· Posted {timeAgo(job.posted_at)}</span>
          </div>
        </div>

        {/* CTA column */}
        <div style={styles.ctaCol}>
          {appStatus.hasApplied ? (
            <div style={styles.appliedBox}>
              <CheckCircle2 size={18} color="#059669" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>Applied</span>
              {appStatus.status && (
                <span style={{ ...styles.statusPill, ...appStatusStyle(appStatus.status) }}>
                  {appStatus.status}
                </span>
              )}
            </div>
          ) : (
            <button
              style={{ ...styles.applyBtn, ...((!canApply) ? styles.applyBtnDisabled : {}) }}
              onClick={canApply ? openApplyModal : undefined}
              disabled={!canApply}
            >
              {isExpired ? "Applications Closed" : "Apply Now"}
            </button>
          )}

          <button
            style={styles.saveBtn}
            onClick={handleSave}
            disabled={savingId}
          >
            {isSaved ? <BookmarkCheck size={16} color="#f59e0b" /> : <Bookmark size={16} color="#6b7280" />}
            {isSaved ? "Saved" : "Save Job"}
          </button>

          {job.company_website && (
            <a href={job.company_website} target="_blank" rel="noreferrer" style={styles.websiteLink}>
              <LinkIcon size={13} /> Company Website
            </a>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={styles.bodyGrid}>
        {/* LEFT: main content */}
        <div style={styles.leftCol}>

          <Accordion title="Job Description" open={expanded.description} onToggle={() => toggle("description")}>
            <p style={styles.bodyText}>{job.job_description}</p>
          </Accordion>

          {job.key_responsibilities && (
            <Accordion title="Key Responsibilities" open={expanded.responsibilities} onToggle={() => toggle("responsibilities")}>
              <p style={styles.bodyText}>{job.key_responsibilities}</p>
            </Accordion>
          )}

          <Accordion title="Skills & Qualifications" open={expanded.skills} onToggle={() => toggle("skills")}>
            {job.required_skills && (
              <div style={{ marginBottom: 14 }}>
                <p style={styles.skillGroupLabel}>Required</p>
                <div style={styles.skillChips}>
                  {job.required_skills.split(/[,\n]+/).filter(Boolean).map((s, i) => (
                    <span key={i} style={styles.skillChip}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {job.preferred_skills && (
              <div style={{ marginBottom: 14 }}>
                <p style={styles.skillGroupLabel}>Preferred</p>
                <div style={styles.skillChips}>
                  {job.preferred_skills.split(/[,\n]+/).filter(Boolean).map((s, i) => (
                    <span key={i} style={{ ...styles.skillChip, ...styles.skillChipAlt }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {job.technical_skills && (
              <div style={{ marginBottom: 14 }}>
                <p style={styles.skillGroupLabel}>Technical</p>
                <div style={styles.skillChips}>
                  {job.technical_skills.split(/[,\n]+/).filter(Boolean).map((s, i) => (
                    <span key={i} style={styles.skillChip}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {job.soft_skills && (
              <div>
                <p style={styles.skillGroupLabel}>Soft Skills</p>
                <div style={styles.skillChips}>
                  {job.soft_skills.split(/[,\n]+/).filter(Boolean).map((s, i) => (
                    <span key={i} style={{ ...styles.skillChip, ...styles.skillChipSoft }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </Accordion>

          {job.screening_questions?.length > 0 && (
            <Accordion title={`Screening Questions (${job.screening_questions.length})`} open={expanded.questions} onToggle={() => toggle("questions")}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                You'll answer these when you apply.
              </p>
              {job.screening_questions.map((q, i) => (
                <div key={i} style={styles.questionItem}>
                  <span style={styles.questionNum}>{i + 1}</span>
                  <p style={styles.questionText}>{q}</p>
                </div>
              ))}
            </Accordion>
          )}

          <Accordion title="Compliance & Equal Opportunity" open={expanded.compliance} onToggle={() => toggle("compliance")}>
            {job.equal_opportunity_statement && (
              <p style={{ ...styles.bodyText, fontStyle: "italic", fontSize: 12, color: "#6b7280" }}>
                {job.equal_opportunity_statement}
              </p>
            )}
            {job.background_check_required && (
              <p style={{ fontSize: 12, color: "#92400e", marginTop: 8, fontWeight: 600 }}>
                ⚠ A background check is required for this role.
              </p>
            )}
          </Accordion>
        </div>

        {/* RIGHT: sidebar */}
        <div style={styles.rightCol}>
          <div style={styles.sideCard}>
            <p style={styles.sideCardTitle}>Job Details</p>
            <SideInfo label="Work Setting" value={job.work_setting} />
            <SideInfo label="Employment Type" value={job.employment_type} />
            {(job.experience_min_years !== null) && (
              <SideInfo label="Experience" value={`${job.experience_min_years}–${job.experience_max_years ?? "+"} years`} />
            )}
            {job.salary_min > 0 && (
              <SideInfo
                label="Salary Range"
                value={`₹${job.salary_min.toLocaleString()} – ₹${(job.salary_max || job.salary_min).toLocaleString()}`}
              />
            )}
            {job.number_of_openings > 0 && (
              <SideInfo label="Openings" value={String(job.number_of_openings)} />
            )}
            {job.expected_start_date && (
              <SideInfo label="Expected Start" value={new Date(job.expected_start_date).toLocaleDateString()} />
            )}
            {deadline && (
              <SideInfo
                label="Application Deadline"
                value={deadline.toLocaleDateString()}
                valueStyle={{ color: isExpired ? "#dc2626" : "#1a1a2e" }}
              />
            )}
          </div>

          <div style={styles.sideCard}>
            <p style={styles.sideCardTitle}>Required Documents</p>
            <DocItem label="Resume" required={true} />
            <DocItem label="Cover Letter" required={job.cover_letter_required} />
            <DocItem label="Portfolio" required={job.portfolio_required} />
          </div>

          <div style={styles.sideCard}>
            <p style={styles.sideCardTitle}>Contact</p>
            {job.contact_email && (
              <SideInfo label="Email" value={job.contact_email} />
            )}
            {job.contact_phone && (
              <SideInfo label="Phone" value={job.contact_phone} />
            )}
          </div>

          {/* Sticky apply CTA at bottom of sidebar */}
          {!appStatus.hasApplied && !isExpired && (
            <button
              style={styles.sideApplyBtn}
              onClick={openApplyModal}
            >
              Apply for this Role
            </button>
          )}
        </div>
      </div>

      {/* ── Apply Modal ── */}
      {modalStep !== "idle" && (
        <div style={styles.modalOverlay} onClick={() => modalStep !== "submitting" && setModalStep("idle")}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* Success */}
            {modalStep === "success" && (
              <div style={styles.modalCenter}>
                <div style={styles.successCircle}><CheckCircle2 size={36} color="#059669" /></div>
                <h2 style={styles.modalTitle}>Application Submitted!</h2>
                <p style={styles.modalSub}>
                  Your application for <strong>{job.job_title}</strong> at <strong>{job.company_name}</strong> has been received.
                  Track your status in the <a href="/dashboard/my-career/application-tracker" style={{ color: "#1a56db" }}>Application Tracker</a>.
                </p>
                <button style={styles.applyBtn} onClick={() => setModalStep("idle")}>Done</button>
              </div>
            )}

            {/* Error */}
            {modalStep === "error" && (
              <div style={styles.modalCenter}>
                <AlertCircle size={36} color="#dc2626" />
                <h2 style={{ ...styles.modalTitle, color: "#dc2626" }}>Submission Failed</h2>
                <p style={styles.modalSub}>{errorMsg}</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={styles.secondaryBtn} onClick={() => setModalStep("idle")}>Cancel</button>
                  <button style={styles.applyBtn} onClick={() => setModalStep("form")}>Try Again</button>
                </div>
              </div>
            )}

            {/* Form */}
            {(modalStep === "form" || modalStep === "submitting") && (
              <>
                <div style={styles.modalHeader}>
                  <div>
                    <h2 style={styles.modalTitle}>Apply — {job.job_title}</h2>
                    <p style={styles.modalSub}>{job.company_name} · {job.location}</p>
                  </div>
                  <button style={styles.closeBtn} onClick={() => setModalStep("idle")} aria-label="Close modal">
  <X size={18} />
</button>
                </div>

                <div style={styles.modalBody}>
                  {/* Resume */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>
                      Resume <span style={styles.required}>*</span>
                    </label>
                    <div
                      style={{ ...styles.fileZone, ...(resumeFile ? styles.fileZoneFilled : {}) }}
                      onClick={() => resumeRef.current?.click()}
                    >
                      {resumeFile ? (
                        <><FileText size={16} color="#1a56db" /> <span style={styles.fileName}>{resumeFile.name}</span></>
                      ) : (
                        <><Upload size={16} color="#9ca3af" /> <span style={{ color: "#9ca3af", fontSize: 13 }}>Click to upload PDF or DOCX</span></>
                      )}
                    </div>
                    <input
  ref={resumeRef}
  type="file"
  accept=".pdf,.doc,.docx"
  style={{ display: "none" }}
  title="Upload resume"
  aria-label="Upload resume"
  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
/>
                  </div>

                  {/* Cover Letter */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>
                      Cover Letter {job.cover_letter_required
                        ? <span style={styles.required}>*</span>
                        : <span style={styles.optional}>(optional)</span>}
                    </label>
                    <div
                      style={{ ...styles.fileZone, ...(coverLetterFile ? styles.fileZoneFilled : {}) }}
                      onClick={() => coverRef.current?.click()}
                    >
                      {coverLetterFile ? (
                        <><FileText size={16} color="#1a56db" /> <span style={styles.fileName}>{coverLetterFile.name}</span></>
                      ) : (
                        <><Upload size={16} color="#9ca3af" /> <span style={{ color: "#9ca3af", fontSize: 13 }}>Click to upload PDF or DOCX</span></>
                      )}
                    </div>
                    <input
  ref={coverRef}
  type="file"
  accept=".pdf,.doc,.docx"
  style={{ display: "none" }}
  title="Upload cover letter"
  aria-label="Upload cover letter"
  onChange={(e) => setCoverLetterFile(e.target.files?.[0] ?? null)}
/>
                  </div>

                  {/* Portfolio URL */}
                  {job.portfolio_required && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>
                        Portfolio URL <span style={styles.required}>*</span>
                      </label>
                      <input
  style={styles.textInput}
  type="url"
  placeholder="https://yourportfolio.com"
  title="Portfolio URL"
  aria-label="Portfolio URL"
  value={portfolioUrl}
  onChange={(e) => setPortfolioUrl(e.target.value)}
/>
                    </div>
                  )}

                  {/* Screening Questions */}
                  {job.screening_questions?.length > 0 && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>Screening Questions <span style={styles.required}>*</span></label>
                      {job.screening_questions.map((q, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <p style={styles.questionMini}>{i + 1}. {q}</p>
                          <textarea
  style={styles.textarea}
  rows={3}
  placeholder="Your answer..."
  title={`Answer for question ${i + 1}`}
  aria-label={`Answer for question ${i + 1}`}
  value={answers[i] ?? ""}
  onChange={(e) => {
    const next = [...answers];
    next[i] = e.target.value;
    setAnswers(next);
  }}
/>
                        </div>
                      ))}
                    </div>
                  )}

                  {errorMsg && modalStep === "form" && (
                    <div style={styles.errorBox}>
                      <AlertCircle size={14} /> {errorMsg}
                    </div>
                  )}
                </div>

                <div style={styles.modalFooter}>
                  <button style={styles.secondaryBtn} onClick={() => setModalStep("idle")} disabled={modalStep === "submitting"}>
                    Cancel
                  </button>
                  <button
                    style={{ ...styles.applyBtn, opacity: modalStep === "submitting" ? 0.7 : 1 }}
                    onClick={handleSubmitApplication}
                    disabled={modalStep === "submitting"}
                  >
                    {modalStep === "submitting" ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Accordion({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={accordionStyles.wrap}>
      <button style={accordionStyles.header} onClick={onToggle}>
        <span style={accordionStyles.title}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={accordionStyles.body}>{children}</div>}
    </div>
  );
}

const accordionStyles: Record<string, React.CSSProperties> = {
  wrap: { background: "#fff", borderRadius: 10, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  header: {
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
  },
  title: { fontSize: 14, fontWeight: 700, color: "#1a1a2e" },
  body: { padding: "16px 18px" },
};

function SideInfo({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 13, color: "#1a1a2e", margin: 0, fontWeight: 500, ...valueStyle }}>{value || "—"}</p>
    </div>
  );
}

function DocItem({ label, required }: { label: string; required: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{
        fontSize: 13,
        color: required ? "#059669" : "#9ca3af",
        fontWeight: required ? 600 : 400,
      }}>
        {required ? "✓" : "○"}
      </span>
      <span style={{ fontSize: 13, color: required ? "#1a1a2e" : "#9ca3af" }}>
        {label} <span style={{ fontSize: 11 }}>{required ? "(Required)" : "(Optional)"}</span>
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif", maxWidth: 1100, margin: "0 auto" },
  loading: {
    padding: 60, textAlign: "center", color: "#6b7280",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  },
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 200,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 18px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    display: "flex", alignItems: "center", gap: 8,
  },
  toastError: { background: "#dc2626" },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, fontWeight: 500,
    padding: "0 0 14px",
  },
  backBtnSolid: {
    padding: "9px 20px", background: "#1a56db", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  expiredBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fee2e2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 16px",
    fontSize: 13, color: "#991b1b", fontWeight: 500, marginBottom: 14,
  },

  // Hero card
  heroCard: {
    background: "#fff", borderRadius: 12, padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 20,
    display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap",
  },
  companyAvatar: {
    width: 56, height: 56, borderRadius: 12,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, fontWeight: 800, flexShrink: 0,
  },
  jobTitle: { fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: "0 0 10px", lineHeight: 1.2 },
  metaRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 },
  metaItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6b7280" },
  tagsRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tag: {
    fontSize: 11, padding: "3px 10px", borderRadius: 20,
    background: "#f3f4f6", color: "#6b7280", fontWeight: 500,
  },
  salaryTag: {
    fontSize: 11, padding: "3px 10px", borderRadius: 20,
    background: "#d1fae5", color: "#065f46", fontWeight: 700,
  },

  // CTA col
  ctaCol: { display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", minWidth: 170 },
  applyBtn: {
    padding: "12px 24px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    textAlign: "center",
  },
  applyBtnDisabled: { background: "#d1d5db", color: "#9ca3af", cursor: "not-allowed" },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 16px", background: "#f9fafb",
    color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 8,
    fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  websiteLink: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontSize: 12, color: "#1a56db", textDecoration: "none", fontWeight: 500,
  },
  appliedBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    background: "#f0fdf4", borderRadius: 8, padding: "12px 16px",
    border: "1.5px solid #bbf7d0",
  },
  statusPill: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 },

  // Body layout
  bodyGrid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" },
  leftCol: {},
  rightCol: { display: "flex", flexDirection: "column", gap: 12 },
  sideCard: {
    background: "#fff", borderRadius: 10, padding: "16px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  sideCardTitle: { fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid #f3f4f6" },
  sideApplyBtn: {
    padding: "13px 0", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%",
    boxShadow: "0 2px 8px rgba(26,86,219,0.3)",
  },

  // Content
  bodyText: { fontSize: 13, color: "#374151", lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" },
  skillGroupLabel: { fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" },
  skillChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  skillChip: { fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "#eff6ff", color: "#1a56db", fontWeight: 500 },
  skillChipAlt: { background: "#f0fdf4", color: "#059669" },
  skillChipSoft: { background: "#faf5ff", color: "#7c3aed" },
  questionItem: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  questionNum: {
    width: 22, height: 22, borderRadius: "50%", background: "#eff6ff", color: "#1a56db",
    fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  questionText: { fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 14,
    width: "100%", maxWidth: 560,
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  modalSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  modalBody: { padding: "20px 24px", overflowY: "auto", flex: 1 },
  modalFooter: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "16px 24px", borderTop: "1px solid #f3f4f6",
  },
  modalCenter: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 24px", gap: 12, textAlign: "center",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", padding: 4, flexShrink: 0,
  },
  successCircle: {
    width: 64, height: 64, borderRadius: "50%",
    background: "#f0fdf4", display: "flex",
    alignItems: "center", justifyContent: "center",
  },

  // Form fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 },
  required: { color: "#dc2626" },
  optional: { color: "#9ca3af", fontWeight: 400, fontSize: 12 },
  fileZone: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1.5px dashed #d1d5db", borderRadius: 8,
    padding: "14px 16px", cursor: "pointer",
    transition: "border-color 0.15s",
  },
  fileZoneFilled: { border: "1.5px solid #1a56db", background: "#f8fbff" },
  fileName: { fontSize: 13, color: "#1a56db", fontWeight: 500 },
  textInput: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none",
    resize: "vertical", fontFamily: "'Segoe UI', sans-serif",
  },
  questionMini: { fontSize: 13, color: "#374151", fontWeight: 500, margin: "0 0 6px" },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fee2e2", border: "1px solid #fecaca",
    borderRadius: 6, padding: "10px 14px",
    fontSize: 13, color: "#dc2626", fontWeight: 500,
  },
  secondaryBtn: {
    padding: "10px 20px", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
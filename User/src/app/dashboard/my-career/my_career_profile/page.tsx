//Community-Application\User\src\app\dashboard\my-career\my_career_profile\page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatIndiaDate } from "@/lib/dateTime";
import { ArrowLeft, Plus, Trash2, RefreshCw, Upload, FileText, Star } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
interface OtherLink { label: string; url: string }

interface Experience {
  clientId: string;
  job_title: string;
  company_name: string;
  start_month: string; // YYYY-MM
  end_month: string;   // YYYY-MM
  is_current: boolean;
  responsibilities: string;
}

interface FormState {
  professional_title: string;
  bio: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  other_links: OtherLink[];
  experiences: Experience[];
  primary_email: string;
  secondary_email: string;
  primary_phone: string;
  primary_phone_country_code: string;
  secondary_phone: string;
  secondary_phone_country_code: string;
}

interface EducationItem {
  key: string;
  level: "degree" | "pu" | "sslc";
  degree: string | null;
  field_of_study: string | null;
  institution: string | null;
  graduation_year: string | null;
  is_expected: boolean;
  grade: string | null;
}

interface Certification { id: string; name: string }

interface Limits {
  TITLE_MAX: number;
  BIO_MAX: number;
  OTHER_LINKS_MAX: number;
  EXPERIENCES_MAX: number;
  NAME_MAX: number;
  RESP_LINES_MAX: number;
  RESP_LINE_CHARS_MAX: number;
  EMAIL_MAX: number;
  PHONE_MAX: number;
  COUNTRY_CODE_MAX: number;
}

interface ServerExperience {
  id: string;
  job_title: string;
  company_name: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  responsibilities: string;
}

interface ServerResponse {
  profile: {
    professional_title: string;
    bio: string;
    linkedin_url: string;
    github_url: string;
    portfolio_url: string;
    other_links: OtherLink[];
    primary_email: string;
    secondary_email: string;
    primary_phone: string;
    primary_phone_country_code: string;
    secondary_phone: string;
    secondary_phone_country_code: string;
    updated_at: string | null;
  };
  experiences: ServerExperience[];
  education: EducationItem[];
  certifications: Certification[];
  highest_education: string | null;
  limits: Limits;
}

interface EducationResponse {
  education: EducationItem[];
  certifications: Certification[];
  highest_education: string | null;
}

interface SavedResume {
  id: string;
  file_name: string;
  resume_url: string;
  file_size: number | null;
  is_default: boolean;
  uploaded_at: string;
}

interface SavedCoverLetter {
  id: string;
  file_name: string;
  cover_letter_url: string;
  file_size: number | null;
  is_default: boolean;
  uploaded_at: string;
}

/* ── Constants & helpers ───────────────────────────────────────── */
const DEFAULT_LIMITS: Limits = {
  TITLE_MAX: 150,
  BIO_MAX: 1000,
  OTHER_LINKS_MAX: 5,
  EXPERIENCES_MAX: 20,
  NAME_MAX: 150,
  RESP_LINES_MAX: 4,
  RESP_LINE_CHARS_MAX: 250,
  EMAIL_MAX: 254,
  PHONE_MAX: 15,
  COUNTRY_CODE_MAX: 5,
};

const MAX_RESUMES = 5;
const MAX_COVER_LETTERS = 5;

let idCounter = 0;
const nextClientId = () => `exp-${Date.now()}-${++idCounter}`;

const emptyExperience = (): Experience => ({
  clientId: nextClientId(),
  job_title: "",
  company_name: "",
  start_month: "",
  end_month: "",
  is_current: false,
  responsibilities: "",
});

const emptyForm = (): FormState => ({
  professional_title: "",
  bio: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  other_links: [],
  experiences: [],
  primary_email: "",
  secondary_email: "",
  primary_phone: "",
  primary_phone_country_code: "+91",
  secondary_phone: "",
  secondary_phone_country_code: "+91",
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

function formFromServer(d: ServerResponse): FormState {
  return {
    professional_title: d.profile.professional_title || "",
    bio: d.profile.bio || "",
    linkedin_url: d.profile.linkedin_url || "",
    github_url: d.profile.github_url || "",
    portfolio_url: d.profile.portfolio_url || "",
    other_links: (d.profile.other_links || []).map((l) => ({ label: l.label || "", url: l.url || "" })),
    experiences: (d.experiences || []).map((e) => ({
      clientId: nextClientId(),
      job_title: e.job_title,
      company_name: e.company_name,
      start_month: e.start_date ? e.start_date.slice(0, 7) : "",
      end_month: e.end_date ? e.end_date.slice(0, 7) : "",
      is_current: e.is_current,
      responsibilities: e.responsibilities || "",
    })),
    primary_email: d.profile.primary_email || "",
    secondary_email: d.profile.secondary_email || "",
    primary_phone: d.profile.primary_phone || "",
    primary_phone_country_code: d.profile.primary_phone_country_code || "+91",
    secondary_phone: d.profile.secondary_phone || "",
    secondary_phone_country_code: d.profile.secondary_phone_country_code || "+91",
  };
}

function payloadFromForm(f: FormState) {
  return {
    professional_title: f.professional_title,
    bio: f.bio,
    linkedin_url: f.linkedin_url,
    github_url: f.github_url,
    portfolio_url: f.portfolio_url,
    other_links: f.other_links,
    experiences: f.experiences.map((e) => ({
      job_title: e.job_title,
      company_name: e.company_name,
      start_date: e.start_month ? `${e.start_month}-01` : "",
      end_date: e.is_current || !e.end_month ? null : `${e.end_month}-01`,
      is_current: e.is_current,
      responsibilities: e.responsibilities,
    })),
    primary_email: f.primary_email,
    secondary_email: f.secondary_email,
    primary_phone: f.primary_phone,
    primary_phone_country_code: f.primary_phone_country_code,
    secondary_phone: f.secondary_phone,
    secondary_phone_country_code: f.secondary_phone_country_code,
  };
}

// Stable string used to detect unsaved changes (ignores client-only ids)
const snapshotOf = (f: FormState) =>
  JSON.stringify({
    ...f,
    experiences: f.experiences.map(({ clientId: _ignored, ...rest }) => rest),
  });

const limitLines = (value: string, max: number) => {
  const lines = value.split("\n");
  return lines.length > max ? lines.slice(0, max).join("\n") : value;
};

const nonEmptyLines = (value: string) => value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const countSentences = (text: string) =>
  text.trim() ? (text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).length : 0;

function looksLikeUrl(v: string) {
  const s = /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`;
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function looksLikePhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

function validate(f: FormState, limits: Limits): Record<string, string> {
  const e: Record<string, string> = {};

  if (f.professional_title.trim().length > limits.TITLE_MAX)
    e.professional_title = `Keep this under ${limits.TITLE_MAX} characters`;
  if (f.bio.trim().length > limits.BIO_MAX) e.bio = `Keep this under ${limits.BIO_MAX} characters`;

  (["linkedin_url", "github_url", "portfolio_url"] as const).forEach((k) => {
    if (f[k].trim() && !looksLikeUrl(f[k])) e[k] = "Enter a valid link, like https://example.com/you";
  });

  f.other_links.forEach((l, i) => {
    if (l.url.trim() && !looksLikeUrl(l.url)) e[`other-${i}-url`] = "Enter a valid link";
    if (l.label.trim().length > 50) e[`other-${i}-label`] = "Keep this under 50 characters";
  });

  f.experiences.forEach((x) => {
    const k = x.clientId;
    if (!x.job_title.trim()) e[`${k}-job_title`] = "Enter your job title";
    if (!x.company_name.trim()) e[`${k}-company_name`] = "Enter the company name";
    if (!x.start_month) e[`${k}-start_month`] = "Choose a start date";
    if (!x.is_current) {
      if (!x.end_month) e[`${k}-end_month`] = 'Choose an end date, or tick "I currently work here"';
      else if (x.start_month && x.end_month < x.start_month)
        e[`${k}-end_month`] = "End date cannot be before the start date";
    }
    const lines = nonEmptyLines(x.responsibilities);
    if (lines.length > limits.RESP_LINES_MAX)
      e[`${k}-responsibilities`] = `Use at most ${limits.RESP_LINES_MAX} lines`;
    else if (lines.some((l) => l.length > limits.RESP_LINE_CHARS_MAX))
      e[`${k}-responsibilities`] = `Keep each line under ${limits.RESP_LINE_CHARS_MAX} characters`;
  });

  if (f.primary_email.trim() && !looksLikeEmail(f.primary_email))
    e.primary_email = "Enter a valid email address";
  if (f.secondary_email.trim() && !looksLikeEmail(f.secondary_email))
    e.secondary_email = "Enter a valid email address";
  if (
    f.primary_email.trim() && f.secondary_email.trim() &&
    f.primary_email.trim().toLowerCase() === f.secondary_email.trim().toLowerCase()
  ) e.secondary_email = "This must be different from your primary email";

  if (f.primary_phone.trim() && !looksLikePhone(f.primary_phone))
    e.primary_phone = "Enter a valid phone number";
  if (f.secondary_phone.trim() && !looksLikePhone(f.secondary_phone))
    e.secondary_phone = "Enter a valid phone number";
  if (
    f.primary_phone.trim() && f.secondary_phone.trim() &&
    f.primary_phone.replace(/\D/g, "") === f.secondary_phone.replace(/\D/g, "") &&
    f.primary_phone_country_code === f.secondary_phone_country_code
  ) e.secondary_phone = "This must be different from your primary phone";

  return e;
}

function formatYear(item: EducationItem) {
  if (item.graduation_year) return item.is_expected ? `Expected ${item.graduation_year}` : item.graduation_year;
  return item.is_expected ? "In progress" : null;
}

/* ── Small presentational pieces ───────────────────────────────── */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.cardSub}>{description}</p>
      {children}
    </section>
  );
}

function Field({
  label, htmlFor, hint, error, optional, children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} style={styles.label}>
        {label}
        {optional && <span style={styles.optional}> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p style={styles.errorText} role="alert">{error}</p>
      ) : hint ? (
        <div style={styles.hintText}>{hint}</div>
      ) : null}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function MyCareerProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => snapshotOf(emptyForm()));
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);

  const [education, setEducation] = useState<EducationItem[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [highestEducation, setHighestEducation] = useState<string | null>(null);
  const [educationCheckedAt, setEducationCheckedAt] = useState<Date | null>(null);
  const [refreshingEducation, setRefreshingEducation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // ── Resume library ──────────────────────────────────────────
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeActionId, setResumeActionId] = useState<string | null>(null);
  const resumeUploadRef = useRef<HTMLInputElement>(null);

  // ── Cover letter library ─────────────────────────────────────
  const [coverLetters, setCoverLetters] = useState<SavedCoverLetter[]>([]);
  const [coverLettersLoading, setCoverLettersLoading] = useState(true);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [coverLetterActionId, setCoverLetterActionId] = useState<string | null>(null);
  const coverLetterUploadRef = useRef<HTMLInputElement>(null);

  const lastEducationFetch = useRef(0);

  const dirty = useMemo(() => snapshotOf(form) !== savedSnapshot, [form, savedSnapshot]);

  const applyServer = useCallback((d: ServerResponse) => {
    const next = formFromServer(d);
    setForm(next);
    setSavedSnapshot(snapshotOf(next));
    setEducation(d.education || []);
    setCertifications(d.certifications || []);
    setHighestEducation(d.highest_education || null);
    setEducationCheckedAt(new Date());
    lastEducationFetch.current = Date.now();
    if (d.limits) setLimits({ ...DEFAULT_LIMITS, ...d.limits });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d: ServerResponse = await api.get("/jobs/career-profile");
      applyServer(d);
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [applyServer]);

  const loadResumes = useCallback(async () => {
    setResumesLoading(true);
    setResumeError(null);
    try {
      const d = await api.get("/jobs/resumes");
      setResumes(d.resumes || []);
    } catch (e) {
      setResumeError(errMsg(e));
    } finally {
      setResumesLoading(false);
    }
  }, []);

  const loadCoverLetters = useCallback(async () => {
    setCoverLettersLoading(true);
    setCoverLetterError(null);
    try {
      const d = await api.get("/jobs/cover-letters");
      setCoverLetters(d.coverLetters || []);
    } catch (e) {
      setCoverLetterError(errMsg(e));
    } finally {
      setCoverLettersLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadResumes(); }, [loadResumes]);
  useEffect(() => { loadCoverLetters(); }, [loadCoverLetters]);

  // Education is read-only here and always comes straight from the database.
  const refreshEducation = useCallback(async (force = false) => {
    if (!force && Date.now() - lastEducationFetch.current < 2000) return;
    lastEducationFetch.current = Date.now();
    setRefreshingEducation(true);
    try {
      const d: EducationResponse = await api.get("/jobs/career-profile/education");
      setEducation(d.education || []);
      setCertifications(d.certifications || []);
      setHighestEducation(d.highest_education || null);
      setEducationCheckedAt(new Date());
    } catch {
      /* keep showing the last known data */
    } finally {
      setRefreshingEducation(false);
    }
  }, []);

  // Pull the latest education whenever the user comes back to this tab
  // (e.g. after updating their profile in another tab).
  useEffect(() => {
    const onFocus = () => refreshEducation();
    const onVisible = () => { if (document.visibilityState === "visible") refreshEducation(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshEducation]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Form updaters ── */
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key as string);
  };

  const updateExperience = (clientId: string, patch: Partial<Experience>, errorKey?: string) => {
    setForm((f) => ({
      ...f,
      experiences: f.experiences.map((x) => (x.clientId === clientId ? { ...x, ...patch } : x)),
    }));
    if (errorKey) clearError(`${clientId}-${errorKey}`);
    if (patch.is_current) clearError(`${clientId}-end_month`);
  };

  const addExperience = () => {
    if (form.experiences.length >= limits.EXPERIENCES_MAX) return;
    setForm((f) => ({ ...f, experiences: [...f.experiences, emptyExperience()] }));
  };

  const removeExperience = (clientId: string) =>
    setForm((f) => ({ ...f, experiences: f.experiences.filter((x) => x.clientId !== clientId) }));

  const updateOtherLink = (i: number, patch: Partial<OtherLink>) => {
    setForm((f) => ({
      ...f,
      other_links: f.other_links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
    clearError(`other-${i}-url`);
    clearError(`other-${i}-label`);
  };

  const addOtherLink = () => {
    if (form.other_links.length >= limits.OTHER_LINKS_MAX) return;
    setForm((f) => ({ ...f, other_links: [...f.other_links, { label: "", url: "" }] }));
  };

  const removeOtherLink = (i: number) =>
    setForm((f) => ({ ...f, other_links: f.other_links.filter((_, idx) => idx !== i) }));

  /* ── Resume library actions ── */
  const handleResumeFileSelected = async (file: File | null) => {
    if (!file) return;
    if (resumes.length >= MAX_RESUMES) {
      setResumeError(`You can save up to ${MAX_RESUMES} resumes. Delete one first.`);
      return;
    }
    setResumeError(null);
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const d = await api.postForm("/jobs/resumes", formData);
      setResumes((prev) => [d.resume, ...prev]);
    } catch (e) {
      setResumeError(errMsg(e));
    } finally {
      setUploadingResume(false);
      if (resumeUploadRef.current) resumeUploadRef.current.value = "";
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (resumes.length <= 1) {
      setResumeError("You need at least one saved resume. Upload a new one before deleting this one.");
      return;
    }
    setResumeError(null);
    setResumeActionId(id);
    try {
      await api.delete(`/jobs/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setResumeError(errMsg(e));
    } finally {
      setResumeActionId(null);
    }
  };

  const handleSetDefaultResume = async (id: string) => {
    setResumeError(null);
    setResumeActionId(id);
    try {
      await api.patch(`/jobs/resumes/${id}/default`, {});
      setResumes((prev) => prev.map((r) => ({ ...r, is_default: r.id === id })));
    } catch (e) {
      setResumeError(errMsg(e));
    } finally {
      setResumeActionId(null);
    }
  };

  /* ── Cover letter library actions ── */
  const handleCoverLetterFileSelected = async (file: File | null) => {
    if (!file) return;
    if (coverLetters.length >= MAX_COVER_LETTERS) {
      setCoverLetterError(`You can save up to ${MAX_COVER_LETTERS} cover letters. Delete one first.`);
      return;
    }
    setCoverLetterError(null);
    setUploadingCoverLetter(true);
    try {
      const formData = new FormData();
      formData.append("coverLetter", file);
      const d = await api.postForm("/jobs/cover-letters", formData);
      setCoverLetters((prev) => [d.coverLetter, ...prev]);
    } catch (e) {
      setCoverLetterError(errMsg(e));
    } finally {
      setUploadingCoverLetter(false);
      if (coverLetterUploadRef.current) coverLetterUploadRef.current.value = "";
    }
  };

  const handleDeleteCoverLetter = async (id: string) => {
    setCoverLetterError(null);
    setCoverLetterActionId(id);
    try {
      await api.delete(`/jobs/cover-letters/${id}`);
      setCoverLetters((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setCoverLetterError(errMsg(e));
    } finally {
      setCoverLetterActionId(null);
    }
  };

  const handleSetDefaultCoverLetter = async (id: string) => {
    setCoverLetterError(null);
    setCoverLetterActionId(id);
    try {
      await api.patch(`/jobs/cover-letters/${id}/default`, {});
      setCoverLetters((prev) => prev.map((c) => ({ ...c, is_default: c.id === id })));
    } catch (e) {
      setCoverLetterError(errMsg(e));
    } finally {
      setCoverLetterActionId(null);
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    setSaveError(null);
    const found = validate(form, limits);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError("Some fields need your attention before this can be saved.");
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    setSaving(true);
    try {
      const data: ServerResponse = await api.post("/jobs/career-profile", payloadFromForm(form));
      applyServer(data);
      setToast("Career profile saved");
    } catch (e) {
      setSaveError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div style={styles.root}>
        <p style={styles.loadingText}>Loading your career profile...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.root}>
        <div style={styles.errorBox} role="alert">
          <p style={{ margin: 0, fontWeight: 600 }}>We couldn&apos;t load your career profile.</p>
          <p style={{ margin: "4px 0 12px" }}>{loadError}</p>
          <button type="button" style={styles.primaryBtn} onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const bioLen = form.bio.trim().length;
  const bioSentences = countSentences(form.bio);
  const errAttr = (key: string) => (errors[key] ? { "data-error": "true", "aria-invalid": true } : {});
  const inputStyle = (key: string): React.CSSProperties => ({
    ...styles.input,
    ...(errors[key] ? styles.inputError : {}),
  });

  return (
    <div style={styles.root}>
      {/* Header */}
      <button type="button" style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
        <ArrowLeft size={14} /> Back to My Career
      </button>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>My Career Profile</h1>
        <p style={styles.pageSub}>
          Tell employers who you are and where you&apos;ve worked. Your education and certifications come from
          your community profile, so they&apos;re always up to date.
        </p>
      </div>

      {/* Resume Library */}
      <Section
        title="Resume Library"
        description={`Keep up to ${MAX_RESUMES} resumes on hand. Pick one of these — or upload a new one — each time you apply for a job.`}
      >
        <div style={styles.stack}>
          {resumeError && (
            <div style={styles.errorBox}>
              <p style={{ margin: 0 }}>{resumeError}</p>
            </div>
          )}

          {resumesLoading ? (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading your resumes...</p>
          ) : resumes.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                You haven&apos;t uploaded a resume yet. You&apos;ll need at least one to apply for jobs.
              </p>
            </div>
          ) : (
            <div style={styles.resumeList}>
              {resumes.map((r) => (
                <div key={r.id} style={styles.resumeRow}>
                  <FileText size={16} color="#1a56db" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.resumeName}>{r.file_name}</p>
                    <p style={styles.resumeMeta}>
                      {formatFileSize(r.file_size)}
                      {r.file_size ? " · " : ""}
                      Uploaded {formatIndiaDate(r.uploaded_at)}
                    </p>
                  </div>
                  {r.is_default ? (
                    <span style={styles.defaultBadge}><Star size={11} /> Default</span>
                  ) : (
                    <button
                      type="button"
                      style={styles.setDefaultBtn}
                      onClick={() => handleSetDefaultResume(r.id)}
                      disabled={resumeActionId === r.id}
                    >
                      Set as default
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.iconBtn}
                    onClick={() => handleDeleteResume(r.id)}
                    disabled={resumeActionId === r.id}
                    aria-label={`Delete ${r.file_name}`}
                    title="Delete resume"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {resumes.length < MAX_RESUMES ? (
            <div>
              <button
                type="button"
                style={{ ...styles.linkBtn, opacity: uploadingResume ? 0.6 : 1 }}
                onClick={() => resumeUploadRef.current?.click()}
                disabled={uploadingResume}
              >
                <Upload size={14} /> {uploadingResume ? "Uploading..." : "Upload a resume"}
              </button>
              <input
                ref={resumeUploadRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => handleResumeFileSelected(e.target.files?.[0] ?? null)}
              />
              <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "6px 0 0" }}>
                {resumes.length}/{MAX_RESUMES} resumes used · PDF or Word, up to 5MB each
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0 }}>
              You&apos;ve reached the limit of {MAX_RESUMES} resumes. Delete one to upload a new one.
            </p>
          )}
        </div>
      </Section>

      {/* Cover Letter Library */}
      <Section
        title="Cover Letter Library"
        description={`Keep up to ${MAX_COVER_LETTERS} cover letters on hand. Pick one — or upload a new one — each time you apply for a job.`}
      >
        <div style={styles.stack}>
          {coverLetterError && (
            <div style={styles.errorBox}>
              <p style={{ margin: 0 }}>{coverLetterError}</p>
            </div>
          )}

          {coverLettersLoading ? (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading your cover letters...</p>
          ) : coverLetters.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                You haven&apos;t uploaded a cover letter yet. Cover letters are optional when you apply for jobs.
              </p>
            </div>
          ) : (
            <div style={styles.resumeList}>
              {coverLetters.map((c) => (
                <div key={c.id} style={styles.resumeRow}>
                  <FileText size={16} color="#1a56db" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.resumeName}>{c.file_name}</p>
                    <p style={styles.resumeMeta}>
                      {formatFileSize(c.file_size)}
                      {c.file_size ? " · " : ""}
                      Uploaded {formatIndiaDate(c.uploaded_at)}
                    </p>
                  </div>
                  {c.is_default ? (
                    <span style={styles.defaultBadge}><Star size={11} /> Default</span>
                  ) : (
                    <button
                      type="button"
                      style={styles.setDefaultBtn}
                      onClick={() => handleSetDefaultCoverLetter(c.id)}
                      disabled={coverLetterActionId === c.id}
                    >
                      Set as default
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.iconBtn}
                    onClick={() => handleDeleteCoverLetter(c.id)}
                    disabled={coverLetterActionId === c.id}
                    aria-label={`Delete ${c.file_name}`}
                    title="Delete cover letter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {coverLetters.length < MAX_COVER_LETTERS ? (
            <div>
              <button
                type="button"
                style={{ ...styles.linkBtn, opacity: uploadingCoverLetter ? 0.6 : 1 }}
                onClick={() => coverLetterUploadRef.current?.click()}
                disabled={uploadingCoverLetter}
              >
                <Upload size={14} /> {uploadingCoverLetter ? "Uploading..." : "Upload a cover letter"}
              </button>
              <input
                ref={coverLetterUploadRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => handleCoverLetterFileSelected(e.target.files?.[0] ?? null)}
              />
              <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "6px 0 0" }}>
                {coverLetters.length}/{MAX_COVER_LETTERS} cover letters used · PDF or Word, up to 5MB each
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0 }}>
              You&apos;ve reached the limit of {MAX_COVER_LETTERS} cover letters. Delete one to upload a new one.
            </p>
          )}
        </div>
      </Section>

      {/* Contact details */}
      <Section
        title="Contact details"
        description="A primary and a backup contact so employers and our team can always reach you."
      >
        <div style={styles.stack}>
          <div style={styles.grid2}>
            <Field label="Primary email" htmlFor="primary_email" error={errors.primary_email}>
              <input
                id="primary_email"
                type="email"
                style={inputStyle("primary_email")}
                value={form.primary_email}
                maxLength={limits.EMAIL_MAX}
                onChange={(e) => setField("primary_email", e.target.value)}
                placeholder="you@example.com"
                {...errAttr("primary_email")}
              />
            </Field>
            <Field label="Secondary email" htmlFor="secondary_email" error={errors.secondary_email} optional>
              <input
                id="secondary_email"
                type="email"
                style={inputStyle("secondary_email")}
                value={form.secondary_email}
                maxLength={limits.EMAIL_MAX}
                onChange={(e) => setField("secondary_email", e.target.value)}
                placeholder="backup@example.com"
                {...errAttr("secondary_email")}
              />
            </Field>
          </div>

          <div style={styles.grid2}>
            <Field label="Primary phone" htmlFor="primary_phone" error={errors.primary_phone}>
              <div style={styles.phoneRow}>
                <input
                  aria-label="Primary phone country code"
                  type="text"
                  style={{ ...inputStyle("primary_phone"), width: 68, flexShrink: 0, textAlign: "center" }}
                  value={form.primary_phone_country_code}
                  maxLength={limits.COUNTRY_CODE_MAX}
                  onChange={(e) => setField("primary_phone_country_code", e.target.value)}
                  placeholder="+91"
                />
                <input
                  id="primary_phone"
                  type="tel"
                  style={{ ...inputStyle("primary_phone"), flex: 1 }}
                  value={form.primary_phone}
                  maxLength={limits.PHONE_MAX}
                  onChange={(e) => setField("primary_phone", e.target.value)}
                  placeholder="9876543210"
                  {...errAttr("primary_phone")}
                />
              </div>
            </Field>
            <Field label="Secondary phone" htmlFor="secondary_phone" error={errors.secondary_phone} optional>
              <div style={styles.phoneRow}>
                <input
                  aria-label="Secondary phone country code"
                  type="text"
                  style={{ ...inputStyle("secondary_phone"), width: 68, flexShrink: 0, textAlign: "center" }}
                  value={form.secondary_phone_country_code}
                  maxLength={limits.COUNTRY_CODE_MAX}
                  onChange={(e) => setField("secondary_phone_country_code", e.target.value)}
                  placeholder="+91"
                />
                <input
                  id="secondary_phone"
                  type="tel"
                  style={{ ...inputStyle("secondary_phone"), flex: 1 }}
                  value={form.secondary_phone}
                  maxLength={limits.PHONE_MAX}
                  onChange={(e) => setField("secondary_phone", e.target.value)}
                  placeholder="9876543210"
                  {...errAttr("secondary_phone")}
                />
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Headline & links */}
      <Section
        title="Headline and links"
        description="A short line that says what you do, plus places where people can see your work."
      >
        <div style={styles.stack}>
          <Field
            label="Professional title"
            htmlFor="professional_title"
            hint="For example: Frontend Developer, or Content Strategist & Writer"
            error={errors.professional_title}
          >
            <input
              id="professional_title"
              type="text"
              style={inputStyle("professional_title")}
              value={form.professional_title}
              maxLength={limits.TITLE_MAX + 20}
              onChange={(e) => setField("professional_title", e.target.value)}
              placeholder="Frontend Developer"
              {...errAttr("professional_title")}
            />
          </Field>

          <div style={styles.grid2}>
            <Field label="LinkedIn" htmlFor="linkedin_url" error={errors.linkedin_url} optional>
              <input
                id="linkedin_url"
                type="text"
                inputMode="url"
                style={inputStyle("linkedin_url")}
                value={form.linkedin_url}
                onChange={(e) => setField("linkedin_url", e.target.value)}
                placeholder="linkedin.com/in/your-name"
                {...errAttr("linkedin_url")}
              />
            </Field>
            <Field label="GitHub" htmlFor="github_url" error={errors.github_url} optional>
              <input
                id="github_url"
                type="text"
                inputMode="url"
                style={inputStyle("github_url")}
                value={form.github_url}
                onChange={(e) => setField("github_url", e.target.value)}
                placeholder="github.com/your-handle"
                {...errAttr("github_url")}
              />
            </Field>
          </div>

          <Field label="Portfolio or website" htmlFor="portfolio_url" error={errors.portfolio_url} optional>
            <input
              id="portfolio_url"
              type="text"
              inputMode="url"
              style={inputStyle("portfolio_url")}
              value={form.portfolio_url}
              onChange={(e) => setField("portfolio_url", e.target.value)}
              placeholder="yourname.com"
              {...errAttr("portfolio_url")}
            />
          </Field>

          {form.other_links.map((l, i) => (
            <div key={i} style={styles.linkRow}>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <input
                  aria-label={`Other link ${i + 1} name`}
                  type="text"
                  style={inputStyle(`other-${i}-label`)}
                  value={l.label}
                  onChange={(e) => updateOtherLink(i, { label: e.target.value })}
                  placeholder="Name (e.g. Behance)"
                  {...errAttr(`other-${i}-label`)}
                />
                {errors[`other-${i}-label`] && <p style={styles.errorText}>{errors[`other-${i}-label`]}</p>}
              </div>
              <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                <input
                  aria-label={`Other link ${i + 1} URL`}
                  type="text"
                  inputMode="url"
                  style={inputStyle(`other-${i}-url`)}
                  value={l.url}
                  onChange={(e) => updateOtherLink(i, { url: e.target.value })}
                  placeholder="https://"
                  {...errAttr(`other-${i}-url`)}
                />
                {errors[`other-${i}-url`] && <p style={styles.errorText}>{errors[`other-${i}-url`]}</p>}
              </div>
              <button
                type="button"
                style={styles.iconBtn}
                onClick={() => removeOtherLink(i)}
                aria-label={`Remove other link ${i + 1}`}
                title="Remove link"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {form.other_links.length < limits.OTHER_LINKS_MAX && (
            <div>
              <button type="button" style={styles.linkBtn} onClick={addOtherLink}>
                <Plus size={14} /> Add another link
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Summary */}
      <Section
        title="Career summary"
        description="Three to five sentences on your background, your strongest skills and what you want next."
      >
        <Field
          label="Professional bio"
          htmlFor="bio"
          error={errors.bio}
          hint={
            <div style={styles.hintSplit}>
              <span>
                {bioSentences === 0
                  ? "Write in the first person or the third, whichever feels natural."
                  : `${bioSentences} ${bioSentences === 1 ? "sentence" : "sentences"}${
                      bioSentences < 3 ? " — aim for at least three" : bioSentences > 5 ? " — try to trim to five" : ""
                    }`}
              </span>
              <span style={bioLen > limits.BIO_MAX ? { color: "#dc2626" } : undefined}>
                {bioLen}/{limits.BIO_MAX}
              </span>
            </div>
          }
        >
          <textarea
            id="bio"
            rows={5}
            style={{ ...inputStyle("bio"), resize: "vertical", lineHeight: 1.5 }}
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            placeholder="Frontend developer with four years of experience building accessible React interfaces…"
            {...errAttr("bio")}
          />
        </Field>
      </Section>

      {/* Work experience */}
      <Section
        title="Work experience"
        description="List your most recent role first. Keep responsibilities to three or four short lines."
      >
        {form.experiences.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>
              You haven&apos;t added any work experience yet.
            </p>
            <button type="button" style={styles.primaryBtn} onClick={addExperience}>
              <Plus size={14} /> Add your first role
            </button>
          </div>
        ) : (
          <div style={styles.stack}>
            {form.experiences.map((x, idx) => {
              const k = x.clientId;
              const lineCount = nonEmptyLines(x.responsibilities).length;
              const heading =
                x.job_title.trim() || x.company_name.trim()
                  ? [x.job_title.trim(), x.company_name.trim()].filter(Boolean).join(" at ")
                  : `Role ${idx + 1}`;
              return (
                <div key={k} style={styles.expCard}>
                  <div style={styles.expHeader}>
                    <h3 style={styles.expTitle}>{heading}</h3>
                    <button type="button" style={styles.removeBtn} onClick={() => removeExperience(k)}>
                      <Trash2 size={14} /> Remove role
                    </button>
                  </div>

                  <div style={styles.grid2}>
                    <Field label="Job title" htmlFor={`${k}-job_title`} error={errors[`${k}-job_title`]}>
                      <input
                        id={`${k}-job_title`}
                        type="text"
                        style={inputStyle(`${k}-job_title`)}
                        value={x.job_title}
                        onChange={(e) => updateExperience(k, { job_title: e.target.value }, "job_title")}
                        placeholder="Software Engineer"
                        {...errAttr(`${k}-job_title`)}
                      />
                    </Field>
                    <Field label="Company" htmlFor={`${k}-company_name`} error={errors[`${k}-company_name`]}>
                      <input
                        id={`${k}-company_name`}
                        type="text"
                        style={inputStyle(`${k}-company_name`)}
                        value={x.company_name}
                        onChange={(e) => updateExperience(k, { company_name: e.target.value }, "company_name")}
                        placeholder="Acme Technologies"
                        {...errAttr(`${k}-company_name`)}
                      />
                    </Field>
                    <Field label="Start date" htmlFor={`${k}-start_month`} error={errors[`${k}-start_month`]}>
                      <input
                        id={`${k}-start_month`}
                        type="month"
                        style={inputStyle(`${k}-start_month`)}
                        value={x.start_month}
                        max={x.end_month && !x.is_current ? x.end_month : undefined}
                        onChange={(e) => updateExperience(k, { start_month: e.target.value }, "start_month")}
                        {...errAttr(`${k}-start_month`)}
                      />
                    </Field>
                    <Field label="End date" htmlFor={`${k}-end_month`} error={errors[`${k}-end_month`]}>
                      <input
                        id={`${k}-end_month`}
                        type="month"
                        style={{ ...inputStyle(`${k}-end_month`), ...(x.is_current ? { background: "#f9fafb" } : {}) }}
                        value={x.is_current ? "" : x.end_month}
                        min={x.start_month || undefined}
                        disabled={x.is_current}
                        onChange={(e) => updateExperience(k, { end_month: e.target.value }, "end_month")}
                        {...errAttr(`${k}-end_month`)}
                      />
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={x.is_current}
                          onChange={(e) =>
                            updateExperience(k, {
                              is_current: e.target.checked,
                              end_month: e.target.checked ? "" : x.end_month,
                            })
                          }
                        />
                        I currently work here
                      </label>
                    </Field>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Field
                      label="Key responsibilities and achievements"
                      htmlFor={`${k}-responsibilities`}
                      error={errors[`${k}-responsibilities`]}
                      hint={
                        <div style={styles.hintSplit}>
                          <span>One point per line. Lead with what you achieved.</span>
                          <span>{lineCount}/{limits.RESP_LINES_MAX} lines</span>
                        </div>
                      }
                    >
                      <textarea
                        id={`${k}-responsibilities`}
                        rows={4}
                        style={{ ...inputStyle(`${k}-responsibilities`), resize: "vertical", lineHeight: 1.5 }}
                        value={x.responsibilities}
                        onChange={(e) =>
                          updateExperience(
                            k,
                            { responsibilities: limitLines(e.target.value, limits.RESP_LINES_MAX) },
                            "responsibilities"
                          )
                        }
                        placeholder={"Rebuilt the checkout flow, cutting drop-off by 18%\nLed a team of three developers on the mobile redesign"}
                        {...errAttr(`${k}-responsibilities`)}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}

            {form.experiences.length < limits.EXPERIENCES_MAX && (
              <div>
                <button type="button" style={styles.linkBtn} onClick={addExperience}>
                  <Plus size={14} /> Add another role
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Education & credentials (read-only, live from DB) */}
      <Section
        title="Education and credentials"
        description="Taken from your community profile. To change anything here, update the education details in your profile."
      >
        <div style={styles.eduToolbar}>
          <span style={styles.eduMeta}>
            {educationCheckedAt
              ? `Checked ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(educationCheckedAt)}`
              : "Not checked yet"}
            {highestEducation ? ` · Highest education: ${highestEducation}` : ""}
          </span>
          <button
            type="button"
            style={{ ...styles.secondaryBtn, opacity: refreshingEducation ? 0.6 : 1 }}
            onClick={() => refreshEducation(true)}
            disabled={refreshingEducation}
          >
            <RefreshCw size={13} /> {refreshingEducation ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {education.length === 0 && certifications.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>No education details found on your profile yet.</p>
            <p style={{ margin: "4px 0 0", color: "#9ca3af", fontSize: 12 }}>
              Add them in your profile&apos;s education step and they&apos;ll show up here automatically.
            </p>
          </div>
        ) : (
          <div style={styles.stack}>
            {education.length > 0 && (
              <div style={styles.eduList}>
                {education.map((item, i) => {
                  const year = formatYear(item);
                  return (
                    <div key={item.key} style={{ ...styles.eduItem, ...(i > 0 ? { borderTop: "1px solid #e5e7eb" } : {}) }}>
                      <div style={styles.eduTop}>
                        <span style={styles.eduDegree}>{item.degree || "Degree not specified"}</span>
                        {year && <span style={styles.eduYear}>{year}</span>}
                      </div>
                      {item.field_of_study && <div style={styles.eduField}>{item.field_of_study}</div>}
                      <div style={styles.eduInst}>
                        {item.institution || "Institution not specified"}
                        {item.grade ? ` · Score ${item.grade}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {certifications.length > 0 && (
              <div>
                <h3 style={styles.subHeading}>Certifications and licenses</h3>
                <div style={styles.chips}>
                  {certifications.map((c) => (
                    <span key={c.id} style={styles.chip}>{c.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Save bar */}
      <div style={styles.saveBar}>
        <div style={{ fontSize: 13 }} aria-live="polite">
          {saveError ? (
            <span style={{ color: "#dc2626" }} role="alert">{saveError}</span>
          ) : dirty ? (
            <span style={{ color: "#b45309" }}>You have unsaved changes</span>
          ) : (
            <span style={{ color: "#6b7280" }}>All changes saved</span>
          )}
        </div>
        <button
          type="button"
          style={{ ...styles.primaryBtn, opacity: saving || !dirty ? 0.5 : 1, cursor: saving || !dirty ? "not-allowed" : "pointer" }}
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving..." : "Save Career Profile"}
        </button>
      </div>

      {toast && <div role="status" style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif", maxWidth: 860 },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "none", border: "none", padding: 0, marginBottom: 12,
    color: "#6b7280", fontSize: 13, cursor: "pointer",
  },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 40, fontSize: 14 },
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
    borderRadius: 10, padding: 20, fontSize: 13.5,
  },

  card: {
    background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  cardSub: { fontSize: 12.5, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 },
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },

  label: { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 },
  optional: { fontWeight: 400, color: "#9ca3af" },
  input: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13.5,
    color: "#1a1a2e", background: "#fff", fontFamily: "inherit",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 12, color: "#dc2626", margin: "4px 0 0" },
  hintText: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  hintSplit: { display: "flex", justifyContent: "space-between", gap: 12 },

  phoneRow: { display: "flex", gap: 8 },

  linkRow: { display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" },
  iconBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 40, background: "#f3f4f6", color: "#6b7280",
    border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0,
  },
  linkBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "none", border: "none", padding: 0,
    color: "#1a56db", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },

  expCard: { border: "1.5px solid #e5e7eb", borderRadius: 10, padding: 16 },
  expHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 },
  expTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  removeBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 10px", background: "#fee2e2", color: "#dc2626",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  checkRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#374151", cursor: "pointer" },

  emptyBox: {
    textAlign: "center", padding: "24px 16px",
    border: "1.5px dashed #d1d5db", borderRadius: 10, background: "#fafafa",
  },

  eduToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  eduMeta: { fontSize: 12, color: "#9ca3af" },
  eduList: { border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" },
  eduItem: { padding: "12px 14px" },
  eduTop: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  eduDegree: { fontSize: 14, fontWeight: 700, color: "#1a1a2e" },
  eduYear: { fontSize: 12.5, color: "#6b7280" },
  eduField: { fontSize: 13, color: "#374151", marginTop: 2 },
  eduInst: { fontSize: 12.5, color: "#6b7280", marginTop: 2 },
  subHeading: { fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: "5px 12px", background: "#eff6ff", color: "#1a56db",
    border: "1px solid #bfdbfe", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
  },

  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "10px 20px", background: "#1a56db", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  },
  secondaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 12px", background: "#f3f4f6", color: "#374151",
    border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },

  saveBar: {
    position: "sticky", bottom: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    background: "#fff", borderTop: "1px solid #e5e7eb", borderRadius: 12,
    padding: "12px 16px", boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
  },
  toast: {
    position: "fixed", bottom: 80, right: 20, zIndex: 1000,
    background: "#1a1a2e", color: "#fff", padding: "10px 16px",
    borderRadius: 8, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },

  // ── Resume Library ──────────────────────────────────────
  resumeList: { display: "flex", flexDirection: "column", gap: 8 },
  resumeRow: {
    display: "flex", alignItems: "center", gap: 10,
    border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px",
  },
  resumeName: {
    fontSize: 13.5, fontWeight: 600, color: "#1a1a2e", margin: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  resumeMeta: { fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" },
  defaultBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 700, color: "#065f46",
    background: "#d1fae5", borderRadius: 999, padding: "4px 10px", flexShrink: 0,
  },
  setDefaultBtn: {
    fontSize: 11.5, fontWeight: 600, color: "#1a56db",
    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999,
    padding: "5px 10px", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
  },
};
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, MapPin, Briefcase, Clock, Users, Bookmark, BookmarkCheck, Filter, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_setting: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  experience_min_years: number;
  experience_max_years: number;
  posted_at: string;
  applicant_count: number;
}

interface Referral {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_type: string;
  employment_type: string;
  job_posting_url: string;
  message_for_applicants: string;
  posted_by_email: string;
  created_at: string;
}

interface ReferralApplication {
  referral_id: string;
  status: string;
}

const WORK_SETTINGS = ["On-site", "Hybrid", "Remote"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Volunteer", "Contract"];

export default function MyCareerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"jobs" | "referrals">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [referralAppStatus, setReferralAppStatus] = useState<Record<string, string>>({});
  const [applyingReferralId, setApplyingReferralId] = useState<string | null>(null);

  // Filters
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workSetting, setWorkSetting] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [industry, setIndustry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (location) params.set("location", location);
    if (workSetting) params.set("work_setting", workSetting);
    if (employmentType) params.set("employment_type", employmentType);
    if (industry) params.set("industry", industry);

    api.get(`/jobs/public?${params.toString()}`)
      .then((d) => setJobs(d.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchReferralApplications = () => {
    api.get("/referrals/my-applications")
      .then((d) => {
        const map: Record<string, string> = {};
        (d.applications || []).forEach((a: ReferralApplication) => {
          map[a.referral_id] = a.status;
        });
        setReferralAppStatus(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchJobs();
    // Load saved job ids
    api.get("/jobs/saved")
      .then((d) => {
        const ids = new Set<string>((d.saved_jobs || []).map((s: { job_id: string }) => s.job_id));
        setSavedJobIds(ids);
      })
      .catch(() => {});
    // Load applied job ids
    api.get("/jobs/my-applications")
      .then((d) => {
        const ids = new Set<string>((d.applications || []).map((a: { job_id: string }) => a.job_id));
        setAppliedJobIds(ids);
      })
      .catch(() => {});
    // Load approved community referrals
    api.get("/referrals/public")
      .then((d) => setReferrals(d.referrals || []))
      .catch(() => {});
    // Load referral application statuses
    fetchReferralApplications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchJobs(); };

  const handleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingId(jobId);
    try {
      const d = await api.post(`/jobs/save/${jobId}`, {});
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        if (d.saved) next.add(jobId); else next.delete(jobId);
        return next;
      });
    } catch (err) { console.error(err); }
    finally { setSavingId(null); }
  };

  const handleApplyReferral = async (referralId: string) => {
    setApplyingReferralId(referralId);
    try {
      await api.post(`/referrals/${referralId}/apply`, {});
      setReferralAppStatus((prev) => ({ ...prev, [referralId]: "applied" }));
    } catch (err) {
      console.error(err);
    } finally {
      setApplyingReferralId(null);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const referralStatusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      applied:  { background: "#eff6ff", color: "#1e40af" },
      approved: { background: "#d1fae5", color: "#065f46" },
      rejected: { background: "#fee2e2", color: "#991b1b" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  return (
    <div style={styles.root}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>My Career</h1>
        <p style={styles.pageSub}>Find jobs tailored for your community</p>
      </div>

      {/* Quick Nav */}
      <div style={styles.quickNav}>
        <a href="/dashboard/my-career/saved-jobs" style={styles.quickNavItem}>
          <Bookmark size={15} color="#1a56db" />
          <span>Saved Jobs</span>
          <ChevronRight size={13} color="#9ca3af" />
        </a>
        <a href="/dashboard/my-career/application-tracker" style={styles.quickNavItem}>
          <Briefcase size={15} color="#1a56db" />
          <span>Application Tracker</span>
          <ChevronRight size={13} color="#9ca3af" />
        </a>
        <a href="/dashboard/referrals" style={styles.quickNavItem}>
          <Users size={15} color="#1a56db" />
          <span>Post a Referral</span>
          <ChevronRight size={13} color="#9ca3af" />
        </a>
        <a href="/dashboard/my-referrals" style={styles.quickNavItem}>
          <Users size={15} color="#1a56db" />
          <span>My Referrals</span>
          <ChevronRight size={13} color="#9ca3af" />
        </a>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === "jobs" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("jobs")}
        >
          <Briefcase size={13} /> Job Postings
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "referrals" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("referrals")}
        >
          <Users size={13} /> Community Referrals
        </button>
      </div>

      {activeTab === "jobs" && (
        <>
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={styles.searchCard}>
            <div style={styles.searchRow}>
              <div style={styles.searchField}>
                <Search size={16} style={styles.fieldIcon} />
                <input
                  style={styles.searchInput}
                  placeholder="Job title, keyword..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div style={styles.searchField}>
                <MapPin size={16} style={styles.fieldIcon} />
                <input
                  style={styles.searchInput}
                  placeholder="Location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button type="submit" style={styles.searchBtn}>Search Jobs</button>
              <button
                type="button"
                style={styles.filterToggle}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter size={15} /> Filters
              </button>
            </div>

            {showFilters && (
              <div style={styles.filtersRow}>
                <select title="Work Setting" style={styles.filterSelect} value={workSetting} onChange={(e) => setWorkSetting(e.target.value)}>
                  <option value="">Work Setting</option>
                  {WORK_SETTINGS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
                <select title="Employment Type" style={styles.filterSelect} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                  <option value="">Employment Type</option>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  style={styles.filterSelect}
                  placeholder="Industry..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
                <button
                  type="button"
                  style={styles.clearBtn}
                  onClick={() => { setWorkSetting(""); setEmploymentType(""); setIndustry(""); setTitle(""); setLocation(""); }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </form>

          {/* Results */}
          <div style={styles.resultsHeader}>
            <p style={styles.resultCount}>{jobs.length} job(s) found</p>
          </div>

          {loading ? (
            <p style={styles.loadingText}>Searching jobs...</p>
          ) : jobs.length === 0 ? (
            <div style={styles.emptyState}>
              <Search size={40} color="#d1d5db" />
              <p style={{ color: "#6b7280", margin: "8px 0 0" }}>No jobs found. Try different keywords.</p>
            </div>
          ) : (
            <div style={styles.jobList}>
              {jobs.map((job) => {
                const isSaved = savedJobIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    style={styles.jobCard}
                    onClick={() => router.push(`/dashboard/my-career/${job.id}`)}
                  >
                    {/* Company Avatar */}
                    <div style={styles.companyAvatar}>{job.company_name.charAt(0)}</div>

                    {/* Job Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.jobTitleRow}>
                        <h3 style={styles.jobTitle}>{job.job_title}</h3>
                        <button
                          style={{ ...styles.saveBtn, color: isSaved ? "#f59e0b" : "#9ca3af" }}
                          onClick={(e) => handleSave(job.id, e)}
                          disabled={savingId === job.id}
                          title={isSaved ? "Remove from saved" : "Save job"}
                        >
                          {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                        </button>
                      </div>

                      <p style={styles.companyName}>{job.company_name}</p>

                      <div style={styles.metaRow}>
                        <span style={styles.metaItem}><MapPin size={12} /> {job.location}</span>
                        <span style={styles.metaItem}><Briefcase size={12} /> {job.employment_type}</span>
                        <span style={styles.metaItem}><Clock size={12} /> {job.work_setting}</span>
                        {(job.experience_min_years !== null) && (
                          <span style={styles.metaItem}>
                            {job.experience_min_years}–{job.experience_max_years ?? "+"} yrs exp
                          </span>
                        )}
                      </div>

                      <div style={styles.bottomRow}>
                        {job.salary_min ? (
                          <span style={styles.salary}>
                            ₹{(job.salary_min / 100000).toFixed(1)}L – ₹{((job.salary_max || job.salary_min) / 100000).toFixed(1)}L
                          </span>
                        ) : (
                          <span style={styles.salaryHidden}>Salary not disclosed</span>
                        )}
                        <div style={styles.rightMeta}>
                          <span style={styles.applicants}><Users size={11} /> {job.applicant_count} applicants</span>
                          <span style={styles.postedAgo}>{timeAgo(job.posted_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Apply Button */}
                    {appliedJobIds.has(job.id) ? (
                      <button
                        style={{ ...styles.applyBtn, ...styles.appliedBtn }}
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/my-career/application-tracker`); }}
                      >
                        ✓ Applied
                      </button>
                    ) : (
                      <button
                        style={styles.applyBtn}
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/my-career/${job.id}`); }}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "referrals" && (
        <>
          <div style={styles.resultsHeader}>
            <p style={styles.resultCount}>{referrals.length} referral(s) found</p>
          </div>

          {referrals.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={40} color="#d1d5db" />
              <p style={{ color: "#6b7280", margin: "8px 0 0" }}>No community referrals yet.</p>
            </div>
          ) : (
            <div style={styles.jobList}>
              {referrals.map((r) => {
                const appStatus = referralAppStatus[r.id];
                return (
                  <div key={r.id} style={styles.jobCard}>
                    <div style={styles.companyAvatar}>{r.company_name?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={styles.jobTitle}>{r.job_title}</h3>
                      <p style={styles.companyName}>{r.company_name} · {r.location}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>{r.message_for_applicants}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Referred by {r.posted_by_email}</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {appStatus ? (
                        <span style={{ ...styles.referralStatusBadge, ...referralStatusStyle(appStatus) }}>
                          {appStatus === "applied" ? "✓ Applied" : appStatus === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </span>
                      ) : (
                        <button
                          style={styles.applyBtn}
                          disabled={applyingReferralId === r.id}
                          onClick={() => handleApplyReferral(r.id)}
                        >
                          {applyingReferralId === r.id ? "Applying..." : "Apply"}
                        </button>
                      )}
                      <a href={r.job_posting_url} target="_blank" rel="noreferrer" style={styles.viewPostingLink}>
                        View posting →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  quickNav: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  quickNavItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 16px", background: "#fff", borderRadius: 8,
    textDecoration: "none", color: "#374151", fontSize: 13, fontWeight: 500,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 16 },
  tab: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 16px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 500, background: "#fff", color: "#6b7280",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tabActive: { background: "#1a56db", color: "#fff" },
  searchCard: {
    background: "#fff", borderRadius: 12, padding: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 20,
  },
  searchRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  searchField: { flex: 1, position: "relative", minWidth: 160 },
  fieldIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: {
    width: "100%", boxSizing: "border-box",
    padding: "11px 12px 11px 36px",
    border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: 14, color: "#1a1a2e", outline: "none",
  },
  searchBtn: {
    padding: "11px 24px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  filterToggle: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "11px 16px", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  filtersRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  filterSelect: {
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#374151",
    background: "#fff", outline: "none", minWidth: 160,
  },
  clearBtn: {
    padding: "9px 14px", background: "#fee2e2",
    color: "#dc2626", border: "none", borderRadius: 8,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  resultsHeader: { marginBottom: 12 },
  resultCount: { fontSize: 13, color: "#6b7280", margin: 0 },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 40, fontSize: 14 },
  emptyState: { textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  jobList: { display: "flex", flexDirection: "column", gap: 12 },
  jobCard: {
    background: "#fff", borderRadius: 10, padding: "18px 20px",
    display: "flex", gap: 16, alignItems: "flex-start",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    cursor: "pointer", transition: "box-shadow 0.15s",
    border: "1.5px solid transparent",
  },
  companyAvatar: {
    width: 48, height: 48, borderRadius: 10,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: 700, flexShrink: 0,
  },
  jobTitleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  jobTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px", lineHeight: 1.3 },
  saveBtn: { background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 },
  companyName: { fontSize: 13, color: "#6b7280", margin: "0 0 8px" },
  metaRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 },
  metaItem: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#6b7280",
  },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  salary: { fontSize: 13, fontWeight: 700, color: "#059669" },
  salaryHidden: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  rightMeta: { display: "flex", alignItems: "center", gap: 12 },
  applicants: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9ca3af" },
  postedAgo: { fontSize: 12, color: "#9ca3af" },
  applyBtn: {
    padding: "9px 18px", background: "#eff6ff",
    color: "#1a56db", border: "1.5px solid #bfdbfe",
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
    alignSelf: "center", textDecoration: "none",
  },
  appliedBtn: { background: "#f0fdf4", color: "#059669", border: "1.5px solid #bbf7d0", cursor: "default" },
  referralStatusBadge: {
    fontSize: 11, padding: "6px 14px", borderRadius: 8,
    fontWeight: 600, whiteSpace: "nowrap",
  },
  viewPostingLink: { fontSize: 11, color: "#1a56db", textDecoration: "none", whiteSpace: "nowrap" },
};
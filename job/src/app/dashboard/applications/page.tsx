"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/constants";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { FileText, Search, Filter, Lock, Check } from "lucide-react";
import Link from "next/link";

interface Application {
  id: string;
  applicant_name: string;
  applicant_email: string;
  job_id: string;
  job_title: string;
  status: string;
  applied_at: string;
  resume_url: string | null;
  cover_letter_url: string | null;
  portfolio_url: string | null;
  resume_score: number | null;
}

// API_BASE may be "http://localhost:8000/api" or "http://localhost:8000" —
// strip a trailing /api so we get the plain origin the file server (/uploads/...) lives on.
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const fileUrl = (path?: string | null): string => {
  if (!path || path === "undefined" || path === "null") return "";
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return `${API_ORIGIN}${path}`;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Resume score in-progress input values, keyed by application id
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    api.get("/jobs/applications")
      .then((d) => setApplications(d.applications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (app: Application, newStatus: string) => {
    const statusOrder = APPLICATION_STATUSES;
    const currentIdx = statusOrder.indexOf(app.status);
    const newIdx = statusOrder.indexOf(newStatus);

    if (newStatus === "Submitted" && currentIdx > 0) {
      showToast("Cannot move applicant back to Submitted.");
      return;
    }
    if (newIdx < currentIdx && newStatus !== "Rejected") {
      showToast("Cannot move applicant to a previous status.");
      return;
    }

    setUpdatingId(app.id);
    try {
      await api.patch(`/jobs/${app.job_id}/applicants/${app.id}/status`, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
      );
      showToast(`Status updated to "${newStatus}"`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleScoreDraftChange = (appId: string, raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, "").slice(0, 3);
    const clamped = digitsOnly === "" ? "" : String(Math.min(100, Number(digitsOnly)));
    setScoreDrafts((prev) => ({ ...prev, [appId]: clamped }));
  };

  const handleSaveScore = async (app: Application) => {
    const draft = scoreDrafts[app.id];
    if (draft === undefined || draft === "") {
      showToast("Enter a score between 0 and 100");
      return;
    }
    const score = Number(draft);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      showToast("Score must be between 0 and 100");
      return;
    }

    setSavingScoreId(app.id);
    try {
      await api.put(`/jobs/${app.job_id}/applicants/${app.id}/resume-score`, { resume_score: score });
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, resume_score: score } : a))
      );
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
      showToast("Resume score saved");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save score");
    } finally {
      setSavingScoreId(null);
    }
  };

  const filtered = applications.filter((a) => {
    const matchSearch =
      a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      a.job_title.toLowerCase().includes(search.toLowerCase()) ||
      a.applicant_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

  const counts = APPLICATION_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>All Applications</h1>
          <p style={styles.pageSub}>Manage applications across all your job postings</p>
        </div>
      </div>

      <div style={styles.summaryRow}>
        {APPLICATION_STATUSES.map((s) => (
          <button
            key={s}
            style={{
              ...styles.summaryChip,
              ...(statusFilter === s ? { borderColor: "#1a56db", background: "#eff6ff" } : {}),
            }}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
          >
            <span style={{ ...styles.summaryCount, ...statusStyle(s) }}>{counts[s] || 0}</span>
            <span style={styles.summaryLabel}>{s}</span>
          </button>
        ))}
      </div>

      <div style={styles.filtersRow}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Search by applicant name, email, or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.filterWrap}>
          <Filter size={14} color="#6b7280" />
          <select
            title="Filter by status"
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <p style={styles.resultCount}>{filtered.length} application(s) found</p>

      <div style={styles.card}>
        {loading ? (
          <p style={styles.loadingText}>Loading applications...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <FileText size={40} color="#d1d5db" />
            <p style={{ color: "#6b7280", margin: "8px 0 0" }}>
              {applications.length === 0 ? "No applications received yet." : "No applications match your filters."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Applicant", "Job", "Applied On", "Documents", "Resume Score", "Current Status", "Update Status"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const resumeHref = fileUrl(app.resume_url);
                  const coverHref = fileUrl(app.cover_letter_url);
                  const portfolioHref = fileUrl(app.portfolio_url);
                  const hasScore = app.resume_score !== null && app.resume_score !== undefined;

                  return (
                    <tr key={app.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.applicantCell}>
                          <div style={styles.avatar}>{app.applicant_name.charAt(0)}</div>
                          <div>
                            <p style={styles.appName}>{app.applicant_name}</p>
                            <p style={styles.appEmail}>{app.applicant_email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <Link href={`/dashboard/job-postings/${app.job_id}`} style={styles.jobLink}>
                          {app.job_title}
                        </Link>
                      </td>
                      <td style={styles.td}>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <div style={styles.docsRow}>
                          {resumeHref && <a href={resumeHref} target="_blank" rel="noreferrer" style={styles.docLink}>Resume</a>}
                          {coverHref && <a href={coverHref} target="_blank" rel="noreferrer" style={styles.docLink}>Cover</a>}
                          {portfolioHref && <a href={portfolioHref} target="_blank" rel="noreferrer" style={styles.docLink}>Portfolio</a>}
                          {!resumeHref && !coverHref && !portfolioHref && (
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {hasScore ? (
                          <span style={styles.scoreLockedBadge}>
                            <Lock size={11} /> {app.resume_score}/100
                          </span>
                        ) : (
                          <div style={styles.scoreInputRow}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0-100"
                              value={scoreDrafts[app.id] ?? ""}
                              onChange={(e) => handleScoreDraftChange(app.id, e.target.value)}
                              style={styles.scoreInput}
                              disabled={savingScoreId === app.id}
                            />
                            <button
                              type="button"
                              style={styles.scoreSaveBtn}
                              onClick={() => handleSaveScore(app)}
                              disabled={savingScoreId === app.id || !scoreDrafts[app.id]}
                              title="Save score (cannot be changed once set)"
                            >
                              {savingScoreId === app.id ? "..." : <Check size={13} />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...statusStyle(app.status) }}>{app.status}</span>
                      </td>
                      <td style={styles.td}>
                        {app.status === "Rejected" || app.status === "Offer" ? (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>Final</span>
                        ) : (
                          <select
                            title="Update application status"
                            style={styles.statusSelect}
                            value={app.status}
                            disabled={updatingId === app.id}
                            onChange={(e) => handleStatusUpdate(app, e.target.value)}
                          >
                            {APPLICATION_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                        {updatingId === app.id && <span style={styles.updatingText}>Saving...</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 100,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 20px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  summaryRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  summaryChip: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 14px", background: "#fff",
    border: "1.5px solid #e5e7eb", borderRadius: 8,
    cursor: "pointer", transition: "all 0.15s",
  },
  summaryCount: {
    fontSize: 13, fontWeight: 700, padding: "1px 8px",
    borderRadius: 20, minWidth: 24, textAlign: "center",
  },
  summaryLabel: { fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" },
  filtersRow: { display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: 1, minWidth: 220 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px 9px 34px",
    border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  filterWrap: { display: "flex", alignItems: "center", gap: 8 },
  filterSelect: {
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#374151",
    background: "#fff", outline: "none", cursor: "pointer",
  },
  resultCount: { fontSize: 13, color: "#6b7280", margin: "0 0 12px" },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: { textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "10px 14px", textAlign: "left", borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "12px 14px", fontSize: 13, color: "#374151", verticalAlign: "middle" },
  applicantCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  appName: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" },
  appEmail: { fontSize: 11, color: "#6b7280", margin: 0 },
  jobLink: { color: "#1a56db", fontWeight: 600, textDecoration: "none", fontSize: 13 },
  docsRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  docLink: { fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#eff6ff", color: "#1a56db", textDecoration: "none", fontWeight: 600 },
  statusBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, display: "inline-block" },
  statusSelect: { padding: "6px 10px", border: "1.5px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#374151", background: "#fff", cursor: "pointer", outline: "none" },
  updatingText: { fontSize: 11, color: "#6b7280", marginLeft: 6 },
  scoreInputRow: { display: "flex", alignItems: "center", gap: 6 },
  scoreInput: {
    width: 56, padding: "6px 8px", border: "1.5px solid #d1d5db",
    borderRadius: 6, fontSize: 12, color: "#1a1a2e", outline: "none",
  },
  scoreSaveBtn: {
    width: 26, height: 26, borderRadius: 6, border: "none",
    background: "#1a56db", color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  scoreLockedBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 600, color: "#374151",
    background: "#f3f4f6", padding: "4px 10px", borderRadius: 20,
  },
};
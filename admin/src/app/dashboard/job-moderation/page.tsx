"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Briefcase, FileText, Search, Eye } from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_setting: string;
  employment_type: string;
  posted_at: string;
  status: string;
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
  status: string;
  posted_by_email: string;
  created_at: string;
  message_for_applicants: string;
  rejection_reason: string | null;
}

type TabType = "jobs" | "pending" | "approved" | "rejected";

export default function JobModerationPage() {
  const [tab, setTab] = useState<TabType>("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    setLoading(true);
    if (tab === "jobs") {
      api.get("/jobs/admin/all")
        .then((d) => setJobs(d.jobs || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      api.get(`/referrals?status=${tab}`)
        .then((d) => setReferrals(d.referrals || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    setSearch("");
    setSelectedJob(null);
  }, [tab]);

  const filteredJobs = jobs.filter((j) =>
    j.job_title.toLowerCase().includes(search.toLowerCase()) ||
    j.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReferrals = referrals.filter((r) =>
    r.job_title.toLowerCase().includes(search.toLowerCase()) ||
    r.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyle = (s: string): React.CSSProperties => ({
    active:    { background: "#d1fae5", color: "#065f46" },
    expired:   { background: "#f3f4f6", color: "#6b7280" },
    pending:   { background: "#fef3c7", color: "#92400e" },
    approved:  { background: "#d1fae5", color: "#065f46" },
    rejected:  { background: "#fee2e2", color: "#991b1b" },
  }[s] ?? { background: "#f3f4f6", color: "#6b7280" });

  const TABS: { key: TabType; label: string }[] = [
    { key: "jobs",     label: "Job Postings (View Only)" },
    { key: "pending",  label: "Pending Referrals" },
    { key: "approved", label: "Approved Referrals" },
    { key: "rejected", label: "Rejected Referrals" },
  ];

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Job Moderation</h1>
        <p style={styles.pageSub}>View job postings and manage referrals</p>
      </div>

      <div style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(tab === key ? styles.tabActive : {}) }}
            onClick={() => setTab(key)}
          >
            {key === "jobs" ? <Briefcase size={13} /> : <FileText size={13} />}
            {label}
          </button>
        ))}
      </div>

      <div style={styles.searchWrap}>
        <Search size={15} style={styles.searchIcon} />
        <input
          style={styles.searchInput}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Jobs Tab (View Only) ── */}
      {tab === "jobs" && (
        <div style={styles.layout}>
          <div style={styles.card}>
            <p style={styles.noteBar}>
              ℹ Admin can view job postings. Job postings do not require individual approval.
            </p>
            {loading ? (
              <p style={styles.loadingText}>Loading jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <div style={styles.emptyState}>
                <Briefcase size={36} color="#d1d5db" />
                <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>No job postings found.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Job Title", "Company", "Location", "Type", "Applicants", "Posted", "Status"].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((j) => (
                      <tr key={j.id} style={styles.tr}>
                        <td style={styles.td}>
                          <p style={styles.jobTitle}>{j.job_title}</p>
                        </td>
                        <td style={styles.td}>{j.company_name}</td>
                        <td style={styles.td}>{j.location}</td>
                        <td style={styles.td}><span style={styles.chip}>{j.employment_type}</span></td>
                        <td style={styles.td}>
                          <span style={styles.countChip}><Eye size={11} /> {j.applicant_count}</span>
                        </td>
                        <td style={styles.td}>{new Date(j.posted_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...statusStyle(j.status) }}>{j.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Referral Tabs ── */}
      {tab !== "jobs" && (
        <div style={styles.card}>
          {loading ? (
            <p style={styles.loadingText}>Loading referrals...</p>
          ) : filteredReferrals.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={36} color="#d1d5db" />
              <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>No {tab} referrals.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Job Title", "Company", "Location", "Work Type", "Posted By", "Date", "Status"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>
                        <p style={styles.jobTitle}>{r.job_title}</p>
                        <a href={r.job_posting_url} target="_blank" rel="noreferrer" style={styles.urlLink}>
                          View posting →
                        </a>
                      </td>
                      <td style={styles.td}>{r.company_name || "—"}</td>
                      <td style={styles.td}>{r.location}</td>
                      <td style={styles.td}><span style={styles.chip}>{r.work_type}</span></td>
                      <td style={styles.td}>{r.posted_by_email}</td>
                      <td style={styles.td}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...statusStyle(r.status) }}>{r.status}</span>
                        {r.rejection_reason && (
                          <p style={styles.rejectionNote}>{r.rejection_reason}</p>
                        )}
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

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  tabs: { display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" },
  tab: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 16px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 12, fontWeight: 500,
    background: "#fff", color: "#6b7280",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tabActive: { background: "#1a56db", color: "#fff", fontWeight: 600 },
  searchWrap: { position: "relative", marginBottom: 16, maxWidth: 380 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px 9px 34px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  layout: {},
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  noteBar: {
    background: "#eff6ff", borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#1e40af", margin: "0 0 16px",
  },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: { textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th: { fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "12px 12px", fontSize: 13, color: "#374151", verticalAlign: "top" },
  jobTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" },
  urlLink: { fontSize: 11, color: "#1a56db", textDecoration: "none" },
  chip: { fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#eff6ff", color: "#1a56db", fontWeight: 500 },
  countChip: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" },
  badge: { fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 600, display: "inline-block" },
  rejectionNote: { fontSize: 11, color: "#991b1b", margin: "4px 0 0", fontStyle: "italic" },
};
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Briefcase, Users, FileText, Eye, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

interface DashStats {
  total_jobs: number;
  active_jobs: number;
  total_employees: number;
  total_applications: number;
  pending_applications: number;
  recent_jobs: {
    id: string;
    job_title: string;
    employment_type: string;
    location: string;
    applicant_count: number;
    posted_at: string;
    status: string;
  }[];
  recent_applications: {
    id: string;
    applicant_name: string;
    job_title: string;
    status: string;
    applied_at: string;
  }[];
}

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/company/dashboard/stats")
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  const statCards = [
    { label: "Total Jobs Posted", value: stats?.total_jobs ?? 0, icon: Briefcase, color: "#1a56db", bg: "#eff6ff" },
    { label: "Active Jobs",        value: stats?.active_jobs ?? 0, icon: TrendingUp, color: "#059669", bg: "#d1fae5" },
    { label: "Total Employees",    value: stats?.total_employees ?? 0, icon: Users, color: "#7c3aed", bg: "#ede9fe" },
    { label: "Total Applications", value: stats?.total_applications ?? 0, icon: FileText, color: "#d97706", bg: "#fef3c7" },
  ];

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Dashboard</h1>
        <p style={styles.pageSub}>Overview of your company activity</p>
      </div>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <p style={styles.statValue}>{value}</p>
              <p style={styles.statLabel}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.twoCol}>
        {/* Recent Jobs */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Recent Job Postings</h3>
            <Link href="/dashboard/job-postings" style={styles.viewAll}>View all →</Link>
          </div>
          {!stats?.recent_jobs?.length ? (
            <div style={styles.emptyState}>
              <Briefcase size={32} color="#d1d5db" />
              <p>No jobs posted yet.</p>
              <Link href="/dashboard/job-postings/new" style={styles.emptyLink}>Post your first job →</Link>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Job Title", "Type", "Applicants", "Posted", "Status"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_jobs.map((j) => (
                    <tr key={j.id} style={styles.tr}>
                      <td style={styles.td}>
                        <Link href={`/dashboard/job-postings/${j.id}`} style={styles.jobLink}>
                          {j.job_title}
                        </Link>
                        <p style={styles.tdSub}>{j.location}</p>
                      </td>
                      <td style={styles.td}><span style={styles.typeBadge}>{j.employment_type}</span></td>
                      <td style={styles.td}>
                        <span style={styles.countBadge}>
                          <Eye size={12} /> {j.applicant_count}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(j.posted_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(j.status) }}>
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Recent Applications</h3>
            <Link href="/dashboard/applications" style={styles.viewAll}>View all →</Link>
          </div>
          {!stats?.recent_applications?.length ? (
            <div style={styles.emptyState}>
              <FileText size={32} color="#d1d5db" />
              <p>No applications yet.</p>
            </div>
          ) : (
            <div style={styles.appList}>
              {stats.recent_applications.map((a) => (
                <div key={a.id} style={styles.appItem}>
                  <div style={styles.appAvatar}>{a.applicant_name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={styles.appName}>{a.applicant_name}</p>
                    <p style={styles.appJob}>{a.job_title}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ ...styles.statusBadge, ...getStatusStyle(a.status) }}>{a.status}</span>
                    <p style={styles.appDate}>{new Date(a.applied_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending applications alert */}
      {(stats?.pending_applications ?? 0) > 0 && (
        <div style={styles.alertBanner}>
          <Clock size={16} />
          <span>
            You have <strong>{stats?.pending_applications}</strong> pending application(s) to review.{" "}
            <Link href="/dashboard/applications" style={{ color: "#92400e", fontWeight: 700 }}>Review now →</Link>
          </span>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    active:             { background: "#d1fae5", color: "#065f46" },
    expired:            { background: "#f3f4f6", color: "#6b7280" },
    draft:              { background: "#fef3c7", color: "#92400e" },
    Submitted:          { background: "#eff6ff", color: "#1e40af" },
    "In Review":        { background: "#fef3c7", color: "#92400e" },
    Interviewing:       { background: "#ede9fe", color: "#5b21b6" },
    Rejected:           { background: "#fee2e2", color: "#991b1b" },
    Offer:              { background: "#d1fae5", color: "#065f46" },
    "Application Viewed": { background: "#f0f9ff", color: "#0369a1" },
  };
  return map[status] ?? { background: "#f3f4f6", color: "#6b7280" };
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, textAlign: "center", color: "#6b7280", fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16, marginBottom: 24,
  },
  statCard: {
    background: "#fff", borderRadius: 10, padding: 20,
    display: "flex", gap: 16, alignItems: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  statIcon: {
    width: 48, height: 48, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  statValue: { fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: "0 0 2px" },
  statLabel: { fontSize: 12, color: "#6b7280", margin: 0 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  card: {
    background: "#fff", borderRadius: 10, padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  viewAll: { fontSize: 13, color: "#1a56db", textDecoration: "none", fontWeight: 500 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 11, color: "#9ca3af", fontWeight: 600, padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "10px 10px", fontSize: 13, color: "#374151", verticalAlign: "top" },
  tdSub: { fontSize: 11, color: "#9ca3af", margin: "2px 0 0" },
  jobLink: { color: "#1a56db", fontWeight: 600, textDecoration: "none", fontSize: 13 },
  typeBadge: {
    fontSize: 11, padding: "3px 8px", borderRadius: 20,
    background: "#eff6ff", color: "#1a56db", fontWeight: 500,
  },
  countBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#6b7280",
  },
  statusBadge: {
    fontSize: 11, padding: "3px 8px", borderRadius: 20,
    fontWeight: 600, display: "inline-block",
  },
  emptyState: {
    textAlign: "center", padding: "32px 0",
    color: "#9ca3af", fontSize: 13, display: "flex",
    flexDirection: "column", alignItems: "center", gap: 8,
  },
  emptyLink: { color: "#1a56db", fontWeight: 600, textDecoration: "none", fontSize: 13 },
  appList: { display: "flex", flexDirection: "column", gap: 12 },
  appItem: { display: "flex", alignItems: "center", gap: 12 },
  appAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  appName: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" },
  appJob: { fontSize: 11, color: "#6b7280", margin: 0 },
  appDate: { fontSize: 11, color: "#9ca3af", margin: "4px 0 0" },
  alertBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fef3c7", border: "1px solid #fde68a",
    borderRadius: 8, padding: "12px 16px",
    fontSize: 13, color: "#92400e",
  },
};
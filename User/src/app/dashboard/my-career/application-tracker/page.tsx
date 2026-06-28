"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Application {
  id: string;
  job_title: string;
  company_name: string;
  applied_at: string;
  status: string;
}

const STATUS_FLOW = [
  "Submitted",
  "Application Viewed",
  "In Review",
  "Interviewing",
  "Offer",
];

export default function ApplicationTrackerPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/jobs/my-applications")
      .then((d) => setApplications(d.applications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? applications
    : applications.filter((a) => a.status === filter);

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

  const ALL_STATUSES = ["Submitted", "Application Viewed", "In Review", "Interviewing", "Rejected", "Offer"];

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
          <ArrowLeft size={15} /> Back to Job Search
        </button>
        <h1 style={styles.pageTitle}>Application Tracker</h1>
        <p style={styles.pageSub}>Track the status of all your job applications</p>
      </div>

      {/* Status Summary */}
      <div style={styles.summaryRow}>
        <button
          style={{ ...styles.summaryChip, ...(filter === "all" ? styles.summaryActive : {}) }}
          onClick={() => setFilter("all")}
        >
          <span style={styles.summaryCount}>{applications.length}</span>
          <span style={styles.summaryLabel}>All</span>
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            style={{ ...styles.summaryChip, ...(filter === s ? styles.summaryActive : {}) }}
            onClick={() => setFilter(filter === s ? "all" : s)}
          >
            <span style={{ ...styles.summaryCountBadge, ...statusStyle(s) }}>{counts[s] || 0}</span>
            <span style={styles.summaryLabel}>{s}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading applications...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <FileText size={40} color="#d1d5db" />
          <p style={{ color: "#6b7280", margin: "8px 0 4px" }}>
            {applications.length === 0 ? "You haven't applied to any jobs yet." : "No applications match this filter."}
          </p>
          {applications.length === 0 && (
            <button style={styles.browseBtn} onClick={() => router.push("/dashboard/my-career")}>
              Browse Jobs
            </button>
          )}
        </div>
      ) : (
        <div style={styles.appList}>
          {filtered.map((app) => (
            <div key={app.id} style={styles.appCard}>
              <div style={styles.appLeft}>
                <div style={styles.appAvatar}>{app.company_name.charAt(0)}</div>
                <div>
                  <h3 style={styles.jobTitle}>{app.job_title}</h3>
                  <p style={styles.companyName}>{app.company_name}</p>
                  <p style={styles.appliedDate}>Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div style={styles.appRight}>
                <span style={{ ...styles.statusBadge, ...statusStyle(app.status) }}>{app.status}</span>

                {/* Progress Bar (only for non-rejected) */}
                {app.status !== "Rejected" && (
                  <div style={styles.progressRow}>
                    {STATUS_FLOW.map((step, i) => {
                      const currentIdx = STATUS_FLOW.indexOf(app.status);
                      const done = i <= currentIdx;
                      return (
                        <div key={step} style={styles.progressStep}>
                          <div style={{ ...styles.progressDot, ...(done ? styles.progressDotDone : {}) }}>
                            {done && <CheckCircle2 size={10} color="#fff" />}
                          </div>
                          <span style={{ ...styles.progressLabel, ...(done ? { color: "#1a56db" } : {}) }}>
                            {step.split(" ")[0]}
                          </span>
                          {i < STATUS_FLOW.length - 1 && (
                            <div style={{ ...styles.progressLine, ...(done && i < currentIdx ? styles.progressLineDone : {}) }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {app.status === "Rejected" && (
                  <p style={styles.rejectedNote}>This application was not selected. Keep applying!</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 20 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, padding: "0 0 10px", fontWeight: 500,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  summaryRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  summaryChip: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", background: "#fff",
    border: "1.5px solid #e5e7eb", borderRadius: 8,
    cursor: "pointer", transition: "all 0.15s",
  },
  summaryActive: { borderColor: "#1a56db", background: "#f8fbff" },
  summaryCount: { fontSize: 15, fontWeight: 700, color: "#1a1a2e" },
  summaryCountBadge: { fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20, minWidth: 22, textAlign: "center" },
  summaryLabel: { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 40, fontSize: 14 },
  emptyState: { textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  browseBtn: { padding: "9px 20px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  appList: { display: "flex", flexDirection: "column", gap: 12 },
  appCard: {
    background: "#fff", borderRadius: 10, padding: "18px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
  },
  appLeft: { display: "flex", gap: 12, alignItems: "flex-start", flex: "0 0 280px" },
  appAvatar: {
    width: 44, height: 44, borderRadius: 10,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  jobTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 3px" },
  companyName: { fontSize: 13, color: "#6b7280", margin: "0 0 3px" },
  appliedDate: { fontSize: 11, color: "#9ca3af", margin: 0 },
  appRight: { flex: 1, display: "flex", flexDirection: "column", gap: 10 },
  statusBadge: { fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 600, display: "inline-block", width: "fit-content" },
  progressRow: { display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", overflow: "hidden" },
  progressStep: { display: "flex", alignItems: "center", gap: 0 },
  progressDot: {
    width: 20, height: 20, borderRadius: "50%",
    background: "#e5e7eb", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  progressDotDone: { background: "#1a56db" },
  progressLabel: { fontSize: 9, color: "#9ca3af", margin: "0 2px", whiteSpace: "nowrap" },
  progressLine: { width: 24, height: 2, background: "#e5e7eb", flexShrink: 0 },
  progressLineDone: { background: "#1a56db" },
  rejectedNote: { fontSize: 12, color: "#991b1b", fontStyle: "italic", margin: 0 },
};
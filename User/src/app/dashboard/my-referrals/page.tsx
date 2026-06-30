"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Clock, MapPin, ExternalLink,
} from "lucide-react";

interface Referral {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_type: string;
  employment_type: string;
  job_posting_url: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  applicant_count: string;
}

interface Applicant {
  id: string;
  email: string;
  name: string;
  status: string;
  applied_at: string;
}

export default function MyReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, Applicant[]>>({});
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/referrals/mine")
      .then((d) => setReferrals(d.referrals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (referralId: string) => {
    if (expandedId === referralId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(referralId);
    if (!applicants[referralId]) {
      setLoadingApplicants(referralId);
      try {
        const d = await api.get(`/referrals/${referralId}/applicants`);
        setApplicants((prev) => ({ ...prev, [referralId]: d.applicants || [] }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingApplicants(null);
      }
    }
  };

  const handleApplicantStatus = async (referralId: string, applicantId: string, status: string) => {
    setUpdatingId(applicantId);
    try {
      await api.patch(`/referrals/${referralId}/applicants/${applicantId}/status`, { status });
      setApplicants((prev) => ({
        ...prev,
        [referralId]: prev[referralId].map((a) =>
          a.id === applicantId ? { ...a, status } : a
        ),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const moderationStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      pending:  { background: "#fef3c7", color: "#92400e" },
      approved: { background: "#d1fae5", color: "#065f46" },
      rejected: { background: "#fee2e2", color: "#991b1b" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  const applicantStatusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      applied:  { background: "#eff6ff", color: "#1e40af" },
      approved: { background: "#d1fae5", color: "#065f46" },
      rejected: { background: "#fee2e2", color: "#991b1b" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  return (
    <div style={styles.root}>
      <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
        <ArrowLeft size={15} /> Back to Jobs
      </button>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>My Referrals</h1>
        <p style={styles.pageSub}>Track moderation status and manage applicants for your posted referrals.</p>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading your referrals...</p>
      ) : referrals.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={40} color="#d1d5db" />
          <p style={{ color: "#6b7280", margin: "8px 0 0" }}>You haven&apos;t posted any referrals yet.</p>
          <button style={styles.postBtn} onClick={() => router.push("/dashboard/referrals")}>
            Post a Referral
          </button>
        </div>
      ) : (
        <div style={styles.list}>
          {referrals.map((r) => (
            <div key={r.id} style={styles.card}>
              <div style={styles.cardHeader} onClick={() => toggleExpand(r.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.titleRow}>
                    <h3 style={styles.jobTitle}>{r.job_title}</h3>
                    <span style={{ ...styles.badge, ...moderationStyle(r.status) }}>{r.status}</span>
                  </div>
                  <p style={styles.companyName}>{r.company_name || "—"}</p>
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}><MapPin size={12} /> {r.location}</span>
                    <span style={styles.metaItem}>{r.work_type}</span>
                    <span style={styles.metaItem}><Users size={12} /> {r.applicant_count} applicant{r.applicant_count !== "1" ? "s" : ""}</span>
                    <a
                      href={r.job_posting_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={styles.urlLink}
                    >
                      <ExternalLink size={11} /> View posting
                    </a>
                  </div>
                  {r.status === "rejected" && r.rejection_reason && (
                    <p style={styles.rejectionNote}>Rejection reason: {r.rejection_reason}</p>
                  )}
                  {r.status === "pending" && (
                    <p style={styles.pendingNote}>⏳ Awaiting moderator approval. It will be public once approved.</p>
                  )}
                </div>
                <button style={styles.expandBtn} aria-label="Toggle applicants">
                  {expandedId === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {expandedId === r.id && (
                <div style={styles.applicantsSection}>
                  {loadingApplicants === r.id ? (
                    <p style={styles.loadingText}>Loading applicants...</p>
                  ) : (applicants[r.id]?.length ?? 0) === 0 ? (
                    <p style={styles.noApplicants}>No one has applied yet.</p>
                  ) : (
                    <div style={styles.applicantsTable}>
                      {applicants[r.id].map((a) => (
                        <div key={a.id} style={styles.applicantRow}>
                          <div style={styles.applicantAvatar}>{a.name.charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={styles.applicantName}>{a.name}</p>
                            <p style={styles.applicantEmail}>{a.email}</p>
                            <p style={styles.applicantDate}>
                              <Clock size={10} /> Applied {new Date(a.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{ ...styles.badge, ...applicantStatusStyle(a.status) }}>{a.status}</span>
                          {a.status === "applied" && (
                            <div style={styles.actionBtns}>
                              <button
                                style={styles.approveBtn}
                                disabled={updatingId === a.id}
                                onClick={() => handleApplicantStatus(r.id, a.id, "approved")}
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button
                                style={styles.rejectBtn}
                                disabled={updatingId === a.id}
                                onClick={() => handleApplicantStatus(r.id, a.id, "rejected")}
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif", maxWidth: 900, margin: "0 auto" },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, fontWeight: 500, padding: "0 0 14px",
  },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: {
    textAlign: "center", padding: "60px 0", display: "flex",
    flexDirection: "column", alignItems: "center", gap: 8,
  },
  postBtn: {
    marginTop: 8, padding: "10px 20px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "#fff", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
  },
  cardHeader: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "16px 18px", cursor: "pointer",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 },
  jobTitle: { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  companyName: { fontSize: 13, color: "#6b7280", margin: "0 0 8px" },
  metaRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  metaItem: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" },
  urlLink: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#1a56db", textDecoration: "none", fontWeight: 500,
  },
  rejectionNote: { fontSize: 12, color: "#991b1b", margin: "8px 0 0", fontStyle: "italic" },
  pendingNote: { fontSize: 12, color: "#92400e", margin: "8px 0 0" },
  badge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" },
  expandBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", padding: 4, flexShrink: 0,
  },
  applicantsSection: {
    borderTop: "1px solid #f3f4f6", padding: "14px 18px", background: "#fafbfc",
  },
  noApplicants: { fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 },
  applicantsTable: { display: "flex", flexDirection: "column", gap: 10 },
  applicantRow: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#fff", borderRadius: 8, padding: "10px 14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flexWrap: "wrap",
  },
  applicantAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  applicantName: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: "0 0 2px" },
  applicantEmail: { fontSize: 11, color: "#6b7280", margin: "0 0 2px" },
  applicantDate: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 10, color: "#9ca3af", margin: 0,
  },
  actionBtns: { display: "flex", gap: 6 },
  approveBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "6px 12px", background: "#d1fae5", color: "#065f46",
    border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
  rejectBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "6px 12px", background: "#fee2e2", color: "#991b1b",
    border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
};
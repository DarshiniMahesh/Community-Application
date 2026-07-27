//Community-Application\User\src\app\dashboard\my-referrals\page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Clock, MapPin, ExternalLink, Eye, X,
  LinkIcon, FileText, Download,
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
  applicant_name?: string | null;
  portfolio_link?: string | null;
  resume_url?: string | null;
  status: string;
  applied_at: string;
}

type TabKey = "approved" | "rejected";

export default function MyReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("approved");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, Applicant[]>>({});
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);

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
      setViewingApplicant((prev) => (prev && prev.id === applicantId ? { ...prev, status } : prev));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const applicantStatusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      applied:  { background: "#eff6ff", color: "#1e40af" },
      approved: { background: "#d1fae5", color: "#065f46" },
      rejected: { background: "#fee2e2", color: "#991b1b" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  const filteredReferrals = referrals.filter((r) => r.status === activeTab);
  const approvedCount = referrals.filter((r) => r.status === "approved").length;
  const rejectedCount = referrals.filter((r) => r.status === "rejected").length;

  return (
    <div style={styles.root}>
      <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
        <ArrowLeft size={15} /> Back to Jobs
      </button>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>My Referrals</h1>
        <p style={styles.pageSub}>Track moderation status and manage applicants for your posted referrals.</p>
      </div>

      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === "approved" ? styles.tabBtnActive : {}) }}
          onClick={() => { setActiveTab("approved"); setExpandedId(null); }}
        >
          Approved <span style={styles.tabCount}>{approvedCount}</span>
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === "rejected" ? styles.tabBtnActiveRejected : {}) }}
          onClick={() => { setActiveTab("rejected"); setExpandedId(null); }}
        >
          Rejected <span style={styles.tabCount}>{rejectedCount}</span>
        </button>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading your referrals...</p>
      ) : filteredReferrals.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={40} color="#d1d5db" />
          <p style={{ color: "#6b7280", margin: "8px 0 0" }}>
            {activeTab === "approved"
              ? "You don't have any approved referrals yet."
              : "You don't have any rejected referrals."}
          </p>
          {activeTab === "approved" && (
            <button style={styles.postBtn} onClick={() => router.push("/dashboard/referrals")}>
              Post a Referral
            </button>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredReferrals.map((r) => (
            <div key={r.id} style={styles.card}>
              <div
                style={{ ...styles.cardHeader, cursor: activeTab === "approved" ? "pointer" : "default" }}
                onClick={() => activeTab === "approved" && toggleExpand(r.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.titleRow}>
                    <h3 style={styles.jobTitle}>{r.job_title}</h3>
                    <span
                      style={{
                        ...styles.badge,
                        ...(r.status === "approved"
                          ? { background: "#d1fae5", color: "#065f46" }
                          : { background: "#fee2e2", color: "#991b1b" }),
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p style={styles.companyName}>{r.company_name || "—"}</p>
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}><MapPin size={12} /> {r.location}</span>
                    <span style={styles.metaItem}>{r.work_type}</span>
                    {activeTab === "approved" && (
                      <span style={styles.metaItem}>
                        <Users size={12} /> {r.applicant_count} applicant{r.applicant_count !== "1" ? "s" : ""}
                      </span>
                    )}
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
                  {activeTab === "rejected" && r.rejection_reason && (
                    <p style={styles.rejectionNote}>Rejection reason: {r.rejection_reason}</p>
                  )}
                </div>
                {activeTab === "approved" && (
                  <button style={styles.expandBtn} aria-label="Toggle applicants">
                    {expandedId === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
              </div>

              {activeTab === "approved" && expandedId === r.id && (
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
                          <div style={styles.actionBtns}>
                            <button
                              style={styles.viewBtn}
                              onClick={() => setViewingApplicant(a)}
                            >
                              <Eye size={13} /> View
                            </button>
                            {a.status === "applied" && (
                              <>
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
                              </>
                            )}
                          </div>
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

      {viewingApplicant && (
        <div style={styles.modalOverlay} onClick={() => setViewingApplicant(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalAvatar}>
                {viewingApplicant.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={styles.modalName}>{viewingApplicant.name}</h3>
                <span style={{ ...styles.badge, ...applicantStatusStyle(viewingApplicant.status) }}>
                  {viewingApplicant.status}
                </span>
              </div>
              <button style={styles.closeBtn} onClick={() => setViewingApplicant(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {viewingApplicant.portfolio_link && (
                <div style={styles.detailRow}>
                  <LinkIcon size={15} color="#6b7280" />
                  <div>
                    <p style={styles.detailLabel}>Portfolio Link</p>
                    <a
                      href={viewingApplicant.portfolio_link}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.detailLinkValue}
                    >
                      {viewingApplicant.portfolio_link}
                    </a>
                  </div>
                </div>
              )}

              {viewingApplicant.resume_url && (
                <div style={styles.detailRow}>
                  <FileText size={15} color="#6b7280" />
                  <div>
                    <p style={styles.detailLabel}>Resume</p>
                    <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
                      <a
                        href={viewingApplicant.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.detailLinkValue}
                      >
                        <Eye size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                        View
                      </a>
                      <a
                        href={viewingApplicant.resume_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={styles.detailLinkValue}
                      >
                        <Download size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {!viewingApplicant.portfolio_link && !viewingApplicant.resume_url && (
                <p style={styles.noApplicants}>No portfolio link or resume was provided.</p>
              )}
            </div>

            {viewingApplicant.status === "applied" && (
              <div style={styles.modalFooter}>
                <button
                  style={styles.rejectBtnWide}
                  disabled={updatingId === viewingApplicant.id}
                  onClick={() => {
                    const referralId = expandedId;
                    if (referralId) handleApplicantStatus(referralId, viewingApplicant.id, "rejected");
                  }}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  style={styles.approveBtnWide}
                  disabled={updatingId === viewingApplicant.id}
                  onClick={() => {
                    const referralId = expandedId;
                    if (referralId) handleApplicantStatus(referralId, viewingApplicant.id, "approved");
                  }}
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              </div>
            )}
          </div>
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
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },

  tabRow: { display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid #e5e7eb" },
  tabBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    padding: "10px 4px", marginRight: 18,
    fontSize: 14, fontWeight: 600, color: "#9ca3af",
    borderBottom: "2px solid transparent",
  },
  tabBtnActive: { color: "#065f46", borderBottom: "2px solid #10b981" },
  tabBtnActiveRejected: { color: "#991b1b", borderBottom: "2px solid #ef4444" },
  tabCount: {
    fontSize: 11, fontWeight: 700, background: "#f3f4f6", color: "#6b7280",
    borderRadius: 20, padding: "1px 8px",
  },

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
    padding: "16px 18px",
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
  actionBtns: { display: "flex", gap: 6, flexWrap: "wrap" },
  viewBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "6px 12px", background: "#eff6ff", color: "#1e40af",
    border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
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

  // ── Modal ──
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  modalCard: {
    background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420,
    maxHeight: "85vh", overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "18px 18px 14px", borderBottom: "1px solid #f3f4f6",
  },
  modalAvatar: {
    width: 44, height: 44, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, fontWeight: 700, flexShrink: 0,
  },
  modalName: { fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", padding: 4, flexShrink: 0,
  },
  modalBody: { padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 },
  detailRow: { display: "flex", alignItems: "flex-start", gap: 10 },
  detailLabel: { fontSize: 11, color: "#9ca3af", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" },
  detailLinkValue: {
    fontSize: 13, color: "#1a56db", wordBreak: "break-all", textDecoration: "none",
    fontWeight: 500, display: "inline-flex", alignItems: "center",
  },
  modalFooter: {
    display: "flex", gap: 10, padding: "14px 18px",
    borderTop: "1px solid #f3f4f6",
  },
  approveBtnWide: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 12px", background: "#10b981", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  rejectBtnWide: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 12px", background: "#fee2e2", color: "#991b1b",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
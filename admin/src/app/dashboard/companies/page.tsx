"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Building2, CheckCircle, XCircle, Eye, Search } from "lucide-react";

interface Company {
  id: string;
  company_name: string;
  company_category: string;
  company_subcategory: string;
  company_size: number;
  address_line1: string;
  address_line2: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  email: string;
  phone: string;
}

type TabType = "pending" | "approved" | "rejected";

export default function AdminCompaniesPage() {
  const [tab, setTab] = useState<TabType>("pending");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Company | null>(null);
  const [reasonError, setReasonError] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchCompanies = (status: TabType) => {
    setLoading(true);
    api.get(`/company/admin/companies?status=${status}`)
      .then((d) => setCompanies(d.companies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(tab); }, [tab]);

  const handleApprove = async (company: Company) => {
    setActionLoading(true);
    try {
      await api.put(`/company/admin/companies/${company.id}/approve`, {});
      showToast(`${company.company_name} approved successfully.`);
      fetchCompanies(tab);
      setSelected(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (company: Company) => {
    setRejectTarget(company);
    setRejectReason("");
    setReasonError("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setReasonError("Rejection reason is required"); return; }
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await api.put(`/company/admin/companies/${rejectTarget.id}/reject`, { reason: rejectReason });
      showToast(`${rejectTarget.company_name} rejected.`);
      setShowRejectModal(false);
      fetchCompanies(tab);
      setSelected(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = companies.filter((c) =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabCounts: Record<TabType, number> = { pending: 0, approved: 0, rejected: 0 };

  const statusStyle = (s: string): React.CSSProperties => ({
    pending:  { background: "#fef3c7", color: "#92400e" },
    approved: { background: "#d1fae5", color: "#065f46" },
    rejected: { background: "#fee2e2", color: "#991b1b" },
  }[s] ?? { background: "#f3f4f6", color: "#6b7280" });

  const TABS: TabType[] = ["pending", "approved", "rejected"];

  return (
    <div style={styles.root}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Company Management</h1>
        <p style={styles.pageSub}>Review and approve company registrations</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => { setTab(t); setSelected(null); setSearch(""); }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <Search size={15} style={styles.searchIcon} />
        <input
          style={styles.searchInput}
          placeholder="Search by company name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.layout}>
        {/* List */}
        <div style={styles.list}>
          {loading ? (
            <p style={styles.loadingText}>Loading...</p>
          ) : filtered.length === 0 ? (
            <div style={styles.emptyState}>
              <Building2 size={36} color="#d1d5db" />
              <p style={{ color: "#6b7280", margin: "8px 0 0", fontSize: 13 }}>
                No {tab} companies.
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                style={{
                  ...styles.companyCard,
                  ...(selected?.id === c.id ? styles.companyCardActive : {}),
                }}
                onClick={() => setSelected(c)}
              >
                <div style={styles.companyAvatar}>{c.company_name?.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.companyName}>{c.company_name}</p>
                  <p style={styles.companySub}>{c.company_category} · {c.company_subcategory}</p>
                  <p style={styles.companySub}>{c.email || c.phone}</p>
                </div>
                <span style={{ ...styles.badge, ...statusStyle(c.status) }}>{c.status}</span>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div style={styles.detail}>
            <div style={styles.detailHeader}>
              <div style={styles.detailAvatar}>{selected.company_name?.charAt(0)}</div>
              <div>
                <h2 style={styles.detailTitle}>{selected.company_name}</h2>
                <span style={{ ...styles.badge, ...statusStyle(selected.status) }}>{selected.status}</span>
              </div>
            </div>

            <div style={styles.infoSection}>
              <Info label="Category" value={`${selected.company_category} → ${selected.company_subcategory}`} />
              <Info label="Company Size" value={`${selected.company_size} employees`} />
              <Info label="Address" value={[selected.address_line1, selected.address_line2].filter(Boolean).join(", ")} />
              <Info label="Email" value={selected.email || "—"} />
              <Info label="Phone" value={selected.phone || "—"} />
              <Info label="Applied On" value={new Date(selected.created_at).toLocaleDateString()} />
              {selected.rejection_reason && (
                <div style={styles.rejectionBox}>
                  <p style={styles.rejectionLabel}>Previous Rejection Reason:</p>
                  <p style={styles.rejectionText}>{selected.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {tab === "pending" && (
              <div style={styles.actionRow}>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApprove(selected)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  style={styles.rejectBtn}
                  onClick={() => openRejectModal(selected)}
                  disabled={actionLoading}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            )}

            {tab === "rejected" && (
              <div style={styles.actionRow}>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApprove(selected)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={15} /> Approve Now
                </button>
              </div>
            )}

            {tab === "approved" && (
              <div style={styles.approvedNote}>
                <CheckCircle size={14} color="#065f46" /> Company is approved and active.
              </div>
            )}
          </div>
        ) : (
          <div style={styles.noSelection}>
            <Eye size={32} color="#d1d5db" />
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0 0" }}>
              Select a company to view details
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && rejectTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Reject Company</h3>
            <p style={styles.modalSub}>
              You are rejecting <strong>{rejectTarget.company_name}</strong>.
              Please provide a reason (visible to the company).
            </p>
            <textarea
              style={{ ...styles.textarea, ...(reasonError ? { borderColor: "#ef4444" } : {}) }}
              rows={4}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setReasonError(""); }}
            />
            {reasonError && <p style={styles.errText}>{reasonError}</p>}
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button style={styles.rejectConfirmBtn} onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#1a1a2e", margin: 0, fontWeight: 500 }}>{value || "—"}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 100,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 20px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  tabs: { display: "flex", gap: 4, marginBottom: 16 },
  tab: {
    padding: "9px 20px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
    background: "#fff", color: "#6b7280",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tabActive: { background: "#1a56db", color: "#fff", fontWeight: 600 },
  searchWrap: { position: "relative", marginBottom: 16, maxWidth: 400 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px 9px 34px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  layout: { display: "flex", gap: 16, alignItems: "flex-start" },
  list: {
    width: 340, flexShrink: 0,
    display: "flex", flexDirection: "column", gap: 8,
  },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: { textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  companyCard: {
    background: "#fff", borderRadius: 10, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    cursor: "pointer", border: "2px solid transparent",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "border-color 0.15s",
  },
  companyCardActive: { borderColor: "#1a56db", background: "#f8fbff" },
  companyAvatar: {
    width: 40, height: 40, borderRadius: 10,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  companyName: { fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: "0 0 2px" },
  companySub: { fontSize: 11, color: "#9ca3af", margin: "1px 0" },
  badge: { fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" },
  detail: {
    flex: 1, background: "#fff", borderRadius: 10, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  detailHeader: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
  detailAvatar: {
    width: 56, height: 56, borderRadius: 14,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, fontWeight: 700, flexShrink: 0,
  },
  detailTitle: { fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: "0 0 6px" },
  infoSection: { marginBottom: 24 },
  rejectionBox: {
    background: "#fee2e2", borderRadius: 8, padding: "10px 14px", marginTop: 8,
  },
  rejectionLabel: { fontSize: 11, color: "#991b1b", fontWeight: 700, margin: "0 0 4px" },
  rejectionText: { fontSize: 13, color: "#7f1d1d", margin: 0 },
  actionRow: { display: "flex", gap: 10 },
  approveBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 20px", background: "#059669",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  rejectBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 20px", background: "#ef4444",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  approvedNote: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, color: "#065f46", fontWeight: 500,
    background: "#d1fae5", borderRadius: 8, padding: "10px 14px",
  },
  noSelection: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#fff", borderRadius: 10, padding: 48,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#fff", borderRadius: 12, padding: 28,
    width: "100%", maxWidth: 440,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  modalSub: { fontSize: 13, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 },
  textarea: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#1a1a2e",
    resize: "vertical", outline: "none", fontFamily: "inherit",
  },
  errText: { fontSize: 11, color: "#ef4444", margin: "4px 0 0" },
  modalActions: { display: "flex", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, padding: "10px 0", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  rejectConfirmBtn: {
    flex: 1, padding: "10px 0", background: "#ef4444",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { UserCog, Mail, CheckCircle2, Clock, Plus, Search, Ban, ShieldCheck, Trash2 } from "lucide-react";

interface Moderator {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_blocked: boolean;
  setup_complete: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function JobModerationPage() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadModerators = () => {
    setLoading(true);
    api.get("/api/admin/job-moderators")
      .then((d) => setModerators(d.moderators || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadModerators(); }, []);

  const filteredModerators = moderators.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Name and email are required");
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await api.post("/api/admin/job-moderators", {
        name: formName.trim(),
        email: formEmail.trim(),
      });
      setFormSuccess(res.message || "Job moderator added successfully");
      setFormName("");
      setFormEmail("");
      setShowAddForm(false);
      loadModerators();
    } catch (err: any) {
      setFormError(err?.message || "Failed to add job moderator");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleBlock = async (m: Moderator) => {
    setActionError("");
    setActionLoadingId(m.id);
    try {
      await api.post(`/api/admin/job-moderators/${m.id}/block`, {});
      loadModerators();
    } catch (err: any) {
      setActionError(err?.message || "Failed to block moderator");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblock = async (m: Moderator) => {
    setActionError("");
    setActionLoadingId(m.id);
    try {
      await api.post(`/api/admin/job-moderators/${m.id}/unblock`, {});
      loadModerators();
    } catch (err: any) {
      setActionError(err?.message || "Failed to unblock moderator");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (m: Moderator) => {
    const confirmed = window.confirm(`Delete job moderator "${m.name}"? This cannot be undone.`);
    if (!confirmed) return;
    setActionError("");
    setActionLoadingId(m.id);
    try {
      await api.delete(`/api/admin/job-moderators/${m.id}`);
      loadModerators();
    } catch (err: any) {
      setActionError(err?.message || "Failed to delete moderator");
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusStyle = (s: string): React.CSSProperties => ({
    active:   { background: "#d1fae5", color: "#065f46" },
    expired:  { background: "#f3f4f6", color: "#6b7280" },
    pending:  { background: "#fef3c7", color: "#92400e" },
    rejected: { background: "#fee2e2", color: "#991b1b" },
  }[s] ?? { background: "#f3f4f6", color: "#6b7280" });

  return (
    <div style={styles.root}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Job Moderation</h1>
        <p style={styles.pageSub}>Manage job moderator accounts</p>
      </div>

      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Search moderators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddForm((s) => !s)}>
          <Plus size={14} /> Add Job Moderator
        </button>
      </div>

      {showAddForm && (
        <div style={styles.card}>
          <form onSubmit={handleAddModerator}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Name</label>
                <input
                  style={styles.formInput}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Email</label>
                <input
                  style={styles.formInput}
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            {formError && <p style={styles.formError}>{formError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={styles.submitBtn} disabled={formSubmitting}>
                {formSubmitting ? "Sending..." : "Add & Send Setup Email"}
              </button>
              <button type="button" style={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {formSuccess && (
        <div style={styles.successBar}>
          <CheckCircle2 size={15} /> {formSuccess}
        </div>
      )}

      {actionError && (
        <div style={styles.errorBar}>
          {actionError}
        </div>
      )}

      <div style={styles.card}>
        {loading ? (
          <p style={styles.loadingText}>Loading job moderators...</p>
        ) : filteredModerators.length === 0 ? (
          <div style={styles.emptyState}>
            <UserCog size={36} color="#d1d5db" />
            <p style={{ color: "#6b7280", fontSize: 13, margin: "8px 0 0" }}>No job moderators yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Name", "Email", "Status", "Setup", "Added", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredModerators.map((m) => {
                  const isBusy = actionLoadingId === m.id;
                  return (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}><p style={styles.name}>{m.name}</p></td>
                      <td style={styles.td}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Mail size={12} color="#9ca3af" /> {m.email}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...statusStyle(m.is_blocked ? "rejected" : m.is_active ? "active" : "expired") }}>
                          {m.is_blocked ? "Blocked" : m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {m.setup_complete ? (
                          <span style={{ ...styles.badge, ...statusStyle("active") }}>
                            <CheckCircle2 size={11} style={{ marginRight: 4, verticalAlign: "-2px" }} /> Complete
                          </span>
                        ) : (
                          <span style={{ ...styles.badge, ...statusStyle("pending") }}>
                            <Clock size={11} style={{ marginRight: 4, verticalAlign: "-2px" }} /> Pending
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{new Date(m.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {m.is_blocked ? (
                            <button
                              style={styles.unblockBtn}
                              disabled={isBusy}
                              onClick={() => handleUnblock(m)}
                              title="Unblock moderator"
                            >
                              <ShieldCheck size={12} /> {isBusy ? "..." : "Unblock"}
                            </button>
                          ) : (
                            <button
                              style={{
                                ...styles.blockBtn,
                                ...(m.setup_complete ? {} : styles.btnDisabled),
                              }}
                              disabled={isBusy || !m.setup_complete}
                              onClick={() => handleBlock(m)}
                              title={m.setup_complete ? "Block moderator" : "Cannot block until setup is complete"}
                            >
                              <Ban size={12} /> {isBusy ? "..." : "Block"}
                            </button>
                          )}
                          <button
                            style={styles.deleteBtn}
                            disabled={isBusy}
                            onClick={() => handleDelete(m)}
                            title="Delete moderator"
                          >
                            <Trash2 size={12} /> {isBusy ? "..." : "Delete"}
                          </button>
                        </div>
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
  root: { fontFamily: "'Segoe UI', sans-serif" },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  searchWrap: { position: "relative", maxWidth: 380, flex: 1 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: { width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 },
  formRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 },
  formGroup: { flex: 1, minWidth: 200 },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  formInput: { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#1a1a2e", outline: "none" },
  formError: { color: "#991b1b", fontSize: 12, margin: "0 0 12px" },
  submitBtn: { padding: "9px 18px", background: "#1a56db", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  cancelBtn: { padding: "9px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  successBar: { display: "flex", alignItems: "center", gap: 8, background: "#d1fae5", color: "#065f46", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500 },
  errorBar: { background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 500 },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: { textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "12px 12px", fontSize: 13, color: "#374151", verticalAlign: "top" },
  name: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: 0 },
  badge: { fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 600, display: "inline-block" },
  blockBtn: { display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  unblockBtn: { display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  deleteBtn: { display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  btnDisabled: { opacity: 0.4, cursor: "not-allowed" },
};
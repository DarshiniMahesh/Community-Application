import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Search, LogOut, Clock, CheckCircle2, XCircle,
  Users, Mail, Phone, MapPin, Briefcase, X, Check, Ban,
} from "lucide-react";
import api from "../api/axiosInstance.js";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
];

export default function Dashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("pending");
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null); // { referral, applicants }
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadReferrals = (status) => {
    setLoading(true);
    api.get(`/api/referrals/admin?status=${status}`)
      .then((res) => setReferrals(res.data.referrals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReferrals(tab);
    setSearch("");
  }, [tab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return referrals.filter(
      (r) => r.job_title?.toLowerCase().includes(q) || r.company_name?.toLowerCase().includes(q)
    );
  }, [referrals, search]);

  const openDetail = async (referralId) => {
    setDetailLoading(true);
    setDetail({ id: referralId });
    try {
      const res = await api.get(`/api/referrals/${referralId}/moderator-detail`);
      setDetail(res.data);
    } catch (err) {
      console.error(err);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/referrals/${id}/approve`, {});
      setReferrals((prev) => prev.filter((r) => r.id !== id));
      setDetail(null);
    } catch (err) {
      console.error(err);
    }
  };

  const submitReject = async (id) => {
    try {
      await api.patch(`/api/referrals/${id}/reject`, { reason: rejectReason || null });
      setReferrals((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason("");
      setDetail(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.brandRow}>
          <div style={s.brandMark}><ShieldCheck size={17} color="#fff" strokeWidth={2.4} /></div>
          <div>
            <p style={s.brandTitle}>Job Moderator</p>
            <p style={s.brandSub}>Community Portal</p>
          </div>
        </div>

        <nav style={s.nav}>
          <p style={s.navLabel}>Referrals</p>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ ...s.navItem, ...(tab === key ? s.navItemActive : {}) }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {tab === key && <span style={s.navDot} />}
            </button>
          ))}
        </nav>

        <button style={s.logoutBtn} onClick={logout}>
          <LogOut size={15} /> Sign out
        </button>
      </aside>

      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{TABS.find((t) => t.key === tab)?.label} referrals</h1>
            <p style={s.pageSub}>
              {tab === "pending" && "Review new job referrals before they go live."}
              {tab === "approved" && "Live referrals, along with who posted them and who has applied."}
              {tab === "rejected" && "Referrals that were declined, with the reason given."}
            </p>
          </div>
          <div style={s.searchWrap}>
            <Search size={15} style={s.searchIcon} />
            <input
              style={s.searchInput}
              placeholder="Search job title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {loading ? (
          <div style={s.stateBox}>
            <div style={s.loader} />
            <p style={s.stateText}>Loading referrals…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.stateBox}>
            <Briefcase size={34} color="var(--blue-300)" />
            <p style={s.stateText}>No {tab} referrals right now.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map((r) => (
              <ReferralCard
                key={r.id}
                referral={r}
                tab={tab}
                onView={() => openDetail(r.id)}
                onApprove={() => handleApprove(r.id)}
                onReject={() => setRejectingId(r.id)}
              />
            ))}
          </div>
        )}
      </main>

      {detail && (
        <DetailModal
          detail={detail}
          loading={detailLoading}
          tab={tab}
          onClose={() => setDetail(null)}
          onApprove={handleApprove}
          onReject={(id) => setRejectingId(id)}
        />
      )}

      {rejectingId && (
        <RejectModal
          reason={rejectReason}
          setReason={setRejectReason}
          onCancel={() => { setRejectingId(null); setRejectReason(""); }}
          onConfirm={() => submitReject(rejectingId)}
        />
      )}
    </div>
  );
}

function ReferralCard({ referral: r, tab, onView, onApprove, onReject }) {
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div>
          <p style={s.cardTitle}>{r.job_title}</p>
          <p style={s.cardCompany}>{r.company_name || "Company not specified"}</p>
        </div>
        <StatusPill status={r.status} />
      </div>

      <div style={s.metaRow}>
        {r.location && <MetaChip icon={MapPin} text={r.location} />}
        {r.work_type && <MetaChip icon={Briefcase} text={r.work_type} />}
      </div>

      <div style={s.posterRow}>
        <Mail size={12} color="var(--ink-faint)" />
        <span style={s.posterText}>Posted by {r.posted_by_email}</span>
      </div>

      {tab === "approved" && (
        <div style={s.applicantRow}>
          <Users size={13} color="var(--blue-600)" />
          <span style={s.applicantText}>
            {r.applicant_count ?? 0} applicant{Number(r.applicant_count) === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {r.rejection_reason && tab === "rejected" && (
        <p style={s.rejectionNote}>“{r.rejection_reason}”</p>
      )}

      <div style={s.cardActions}>
        <button style={s.viewBtn} onClick={onView}>View details</button>
        {tab === "pending" && (
          <>
            <button style={s.approveBtn} onClick={onApprove}><Check size={13} /> Approve</button>
            <button style={s.rejectBtn} onClick={onReject}><Ban size={13} /> Reject</button>
          </>
        )}
      </div>
    </div>
  );
}

function MetaChip({ icon: Icon, text }) {
  return (
    <span style={s.chip}>
      <Icon size={11} /> {text}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: "var(--amber-bg)", fg: "var(--amber-text)", label: "Pending" },
    approved: { bg: "var(--green-bg)", fg: "var(--green-text)", label: "Approved" },
    rejected: { bg: "var(--red-bg)", fg: "var(--red-text)", label: "Rejected" },
  };
  const st = map[status] || { bg: "var(--blue-100)", fg: "var(--blue-700)", label: status };
  return <span style={{ ...s.pill, background: st.bg, color: st.fg }}>{st.label}</span>;
}

function DetailModal({ detail, loading, tab, onClose, onApprove, onReject }) {
  const referral = detail?.referral;
  const applicants = detail?.applicants || [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <button style={s.modalClose} onClick={onClose}><X size={18} /></button>

        {loading || !referral ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={s.loader} />
            <p style={s.stateText}>Loading details…</p>
          </div>
        ) : (
          <>
            <div style={s.modalHead}>
              <StatusPill status={referral.status} />
              <h2 style={s.modalTitle}>{referral.job_title}</h2>
              <p style={s.modalCompany}>{referral.company_name || "Company not specified"}</p>
            </div>

            <SectionLabel>Job details</SectionLabel>
            <div style={s.detailGrid}>
              <DetailRow label="Location" value={referral.location} />
              <DetailRow label="Work type" value={referral.work_type} />
              <DetailRow label="Employment type" value={referral.employment_type} />
              <DetailRow label="Reference no." value={referral.job_reference_number} />
              {referral.experience_level_required && (
                <DetailRow label="Experience" value={referral.experience_level_required} />
              )}
              {referral.salary_range && <DetailRow label="Salary range" value={referral.salary_range} />}
            </div>

            {referral.message_for_applicants && (
              <>
                <SectionLabel>Message for applicants</SectionLabel>
                <p style={s.bodyText}>{referral.message_for_applicants}</p>
              </>
            )}

            <SectionLabel>Posted by</SectionLabel>
            <div style={s.posterCard}>
              <div style={s.avatarCircle}>
                {referral.posted_by_email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p style={s.posterName}>{referral.posted_by_email}</p>
                {referral.posted_by_phone && (
                  <p style={s.posterPhone}><Phone size={11} /> {referral.posted_by_phone}</p>
                )}
              </div>
            </div>

            <SectionLabel>
              Applicants
              <span style={s.applicantCountBadge}>{applicants.length}</span>
            </SectionLabel>

            {applicants.length === 0 ? (
              <p style={s.emptyApplicants}>No one has applied to this referral yet.</p>
            ) : (
              <div style={s.applicantList}>
                {applicants.map((a) => (
                  <div key={a.id} style={s.applicantItem}>
                    <div style={s.avatarCircleSm}>{a.name?.[0]?.toUpperCase() || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={s.applicantName}>{a.name}</p>
                      <p style={s.applicantMeta}>
                        {a.email}{a.phone ? ` · ${a.phone}` : ""}
                      </p>
                    </div>
                    <span style={s.appliedDate}>
                      {new Date(a.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {referral.rejection_reason && (
              <>
                <SectionLabel>Rejection reason</SectionLabel>
                <p style={{ ...s.bodyText, color: "var(--red-text)" }}>{referral.rejection_reason}</p>
              </>
            )}

            {tab === "pending" && (
              <div style={s.modalActions}>
                <button style={s.approveBtnLg} onClick={() => onApprove(referral.id)}>
                  <Check size={15} /> Approve referral
                </button>
                <button style={s.rejectBtnLg} onClick={() => onReject(referral.id)}>
                  <Ban size={15} /> Reject referral
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RejectModal({ reason, setReason, onCancel, onConfirm }) {
  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.rejectModal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.rejectTitle}>Reject this referral?</h3>
        <p style={s.rejectSub}>Let the poster know why — this note is optional but helpful.</p>
        <textarea
          style={s.rejectTextarea}
          rows={3}
          placeholder="e.g. Missing job posting URL, duplicate listing…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div style={s.rejectActions}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={s.confirmRejectBtn} onClick={onConfirm}>Reject referral</button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={s.sectionLabel}>{children}</p>;
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}</span>
      <span style={s.detailValue}>{value}</span>
    </div>
  );
}

const s = {
  shell: { display: "flex", minHeight: "100vh", background: "var(--bg)" },

  sidebar: {
    width: 232, flexShrink: 0, background: "var(--surface)",
    borderRight: "1px solid var(--border)", padding: "24px 18px",
    display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 30, padding: "0 4px" },
  brandMark: {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    background: "linear-gradient(135deg, var(--blue-600), var(--blue-800))",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 10px rgba(37,99,235,0.3)",
  },
  brandTitle: { margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  brandSub: { margin: 0, fontSize: 11, color: "var(--ink-faint)" },

  nav: { flex: 1 },
  navLabel: {
    fontSize: 10.5, fontWeight: 700, color: "var(--ink-faint)",
    textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 8px",
  },
  navItem: {
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 10, border: "none",
    background: "transparent", color: "var(--ink-soft)",
    fontSize: 13.5, fontWeight: 600, marginBottom: 4, textAlign: "left", position: "relative",
  },
  navItemActive: { background: "var(--blue-50)", color: "var(--blue-700)" },
  navDot: {
    position: "absolute", right: 10, width: 6, height: 6,
    borderRadius: "50%", background: "var(--blue-600)",
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 12px", borderRadius: 10, border: "1px solid var(--border)",
    background: "var(--bg-soft)", color: "var(--ink-soft)",
    fontSize: 13, fontWeight: 600,
  },

  main: { flex: 1, padding: "28px 34px 60px", minWidth: 0 },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    gap: 20, flexWrap: "wrap", marginBottom: 24,
  },
  pageTitle: {
    fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800,
    color: "var(--ink)", margin: "0 0 6px", letterSpacing: "-0.01em",
  },
  pageSub: { margin: 0, fontSize: 13.5, color: "var(--ink-soft)" },
  searchWrap: { position: "relative", width: 300, maxWidth: "100%" },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)" },
  searchInput: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px",
    border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13.5,
    color: "var(--ink)", background: "var(--surface)", outline: "none",
  },

  stateBox: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "80px 0", background: "var(--surface)", borderRadius: 16, border: "1px dashed var(--border)",
  },
  stateText: { fontSize: 13.5, color: "var(--ink-faint)", marginTop: 12 },
  loader: {
    width: 26, height: 26, borderRadius: "50%",
    border: "3px solid var(--blue-100)", borderTopColor: "var(--blue-600)",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },

  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16,
  },
  card: {
    background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)",
    padding: 18, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitle: { margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  cardCompany: { margin: 0, fontSize: 12.5, color: "var(--ink-soft)" },
  pill: { fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 20, whiteSpace: "nowrap" },
  metaRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, padding: "4px 9px", borderRadius: 20,
    background: "var(--blue-50)", color: "var(--blue-700)", fontWeight: 600,
  },
  posterRow: { display: "flex", alignItems: "center", gap: 6 },
  posterText: { fontSize: 12, color: "var(--ink-faint)" },
  applicantRow: {
    display: "flex", alignItems: "center", gap: 6,
    background: "var(--blue-50)", padding: "6px 10px", borderRadius: 8, width: "fit-content",
  },
  applicantText: { fontSize: 12, fontWeight: 700, color: "var(--blue-700)" },
  rejectionNote: { fontSize: 12, color: "var(--red-text)", fontStyle: "italic", margin: 0 },
  cardActions: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" },
  viewBtn: {
    padding: "8px 14px", background: "var(--bg-soft)", color: "var(--ink)",
    border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
  },
  approveBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "8px 14px", background: "var(--green-bg)", color: "var(--green-text)",
    border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
  },
  rejectBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "8px 14px", background: "var(--red-bg)", color: "var(--red-text)",
    border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
  },

  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,39,72,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 20, backdropFilter: "blur(2px)",
  },
  modal: {
    position: "relative", background: "var(--surface)", borderRadius: 20,
    width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
    padding: "30px 30px 26px", boxShadow: "var(--shadow-lg)",
  },
  modalClose: {
    position: "absolute", top: 18, right: 18, background: "var(--bg-soft)",
    border: "none", borderRadius: 8, padding: 6, color: "var(--ink-soft)",
  },
  modalHead: { marginBottom: 10, paddingRight: 30 },
  modalTitle: { margin: "10px 0 4px", fontSize: 20, fontWeight: 800, color: "var(--ink)" },
  modalCompany: { margin: 0, fontSize: 13.5, color: "var(--ink-soft)" },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: "var(--ink-faint)",
    textTransform: "uppercase", letterSpacing: "0.05em",
    margin: "22px 0 10px", display: "flex", alignItems: "center", gap: 8,
  },
  applicantCountBadge: {
    background: "var(--blue-100)", color: "var(--blue-700)",
    fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 20,
  },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" },
  detailRow: { display: "flex", flexDirection: "column", gap: 2 },
  detailLabel: { fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 600 },
  detailValue: { fontSize: 13, color: "var(--ink)", fontWeight: 600 },
  bodyText: { fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 },
  externalLink: {
    display: "inline-flex", alignItems: "center", gap: 6,
    marginTop: 12, fontSize: 12.5, color: "var(--blue-700)",
    fontWeight: 700, textDecoration: "none",
  },
  posterCard: {
    display: "flex", alignItems: "center", gap: 12,
    background: "var(--bg-soft)", border: "1px solid var(--border-soft)",
    borderRadius: 12, padding: "12px 14px",
  },
  avatarCircle: {
    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg, var(--blue-500), var(--blue-700))",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 15,
  },
  posterName: { margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  posterPhone: { margin: "2px 0 0", fontSize: 12, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 4 },

  emptyApplicants: { fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic", margin: 0 },
  applicantList: { display: "flex", flexDirection: "column", gap: 8 },
  applicantItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: 10, background: "var(--bg-soft)",
    border: "1px solid var(--border-soft)",
  },
  avatarCircleSm: {
    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
    background: "var(--blue-100)", color: "var(--blue-700)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 12.5,
  },
  applicantName: { margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  applicantMeta: { margin: "1px 0 0", fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  appliedDate: { fontSize: 10.5, color: "var(--ink-faint)", flexShrink: 0, fontWeight: 600 },

  modalActions: { display: "flex", gap: 10, marginTop: 26 },
  approveBtnLg: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "12px 16px", background: "var(--green-bg)", color: "var(--green-text)",
    border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
  },
  rejectBtnLg: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    padding: "12px 16px", background: "var(--red-bg)", color: "var(--red-text)",
    border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
  },

  rejectModal: {
    background: "var(--surface)", borderRadius: 18, padding: 26,
    width: "100%", maxWidth: 400, boxShadow: "var(--shadow-lg)",
  },
  rejectTitle: { margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: "var(--ink)" },
  rejectSub: { margin: "0 0 14px", fontSize: 13, color: "var(--ink-soft)" },
  rejectTextarea: {
    width: "100%", boxSizing: "border-box", padding: 12, fontSize: 13.5,
    border: "1.5px solid var(--border)", borderRadius: 10, resize: "vertical",
    color: "var(--ink)", background: "var(--bg-soft)", outline: "none", fontFamily: "inherit",
  },
  rejectActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  cancelBtn: {
    padding: "9px 16px", background: "var(--bg-soft)", color: "var(--ink-soft)",
    border: "1px solid var(--border)", borderRadius: 9, fontSize: 13, fontWeight: 600,
  },
  confirmRejectBtn: {
    padding: "9px 16px", background: "var(--red-text)", color: "#fff",
    border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700,
  },
};

if (typeof document !== "undefined" && !document.head.querySelector("#jm-spin-kf")) {
  const tag = document.createElement("style");
  tag.id = "jm-spin-kf";
  tag.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(tag);
}

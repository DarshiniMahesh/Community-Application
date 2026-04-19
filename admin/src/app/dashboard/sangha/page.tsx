/*Community-Application\admin\src\app\dashboard\sangha\page.tsx*/
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

/* ─── Types ─────────────────────────────────────────────── */

interface SanghaMember {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: string;
  phone?: string;
  email?: string;
  dob?: string;
  role?: string;
  member_type?: string;
  [key: string]: any;
}

interface Sangha {
  id: string;
  sangha_auth_id: string;
  name: string;
  email: string;
  phone: string;
  reg_email: string;
  reg_phone: string;
  location: string;
  address_line: string;
  village_town?: string;
  taluk?: string;
  state: string;
  pincode?: string;
  status: string;
  description?: string;
  logo_url?: string;
  sangha_contact_same?: boolean;
  sangha_email?: string;
  sangha_phone?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface SanghaDetail extends Sangha {
  members: SanghaMember[];
}

type Tab = 'approved' | 'rejected';

/* ─── Constants ─────────────────────────────────────────── */

const STATUS_TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'approved', label: 'Approved', color: 'var(--purple)' },
  { key: 'rejected', label: 'Rejected', color: 'var(--danger)' },
];

const avatarClass: Record<Tab, string> = {
  approved: 'avatar-purple',
  rejected: 'avatar-danger',
};

/* ─── PDF Download Helper ────────────────────────────────── */

function downloadAsPdf(data: object, filename: string) {
  const loadAndDownload = () => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(JSON.stringify(data, null, 2), 180);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(10);
    doc.text(lines, 14, 20);
    doc.save(`${filename}.pdf`);
  };
  // @ts-ignore
  if (window.jspdf) {
    loadAndDownload();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = loadAndDownload;
    document.head.appendChild(script);
  }
}

/* ─── Helper fns ────────────────────────────────────────── */

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : null;

const fmtStatus = (s?: string | null) =>
  (s ?? 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const statusBadgeStyle = (status: string): React.CSSProperties => {
  if (status === 'approved')
    return { background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' };
  if (status === 'pending_approval')
    return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  if (status === 'suspended')
    return { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' };
  return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
};

const memberDisplayName = (m: SanghaMember) => {
  if (m.first_name || m.last_name) return [m.first_name, m.last_name].filter(Boolean).join(' ');
  if (m.full_name) return m.full_name;
  return '—';
};

/* ─── Modal sub-components ──────────────────────────────── */

const ViewField = ({
  label,
  value,
}: {
  label: string;
  value?: string | null | boolean | number;
}) => {
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : typeof value === 'boolean'
        ? value ? 'Yes' : 'No'
        : String(value);
  const isEmpty = display === '—';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: isEmpty ? '#d1d5db' : '#111827' }}>
        {display}
      </span>
    </div>
  );
};

const SectionHeading = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    paddingBottom: 8, marginBottom: 14, marginTop: 22,
    borderBottom: '2px solid #f3f4f6',
  }}>
    {icon && <span style={{ width: 14, height: 14, display: 'inline-flex', opacity: 0.6 }}>{icon}</span>}
    {title}
  </div>
);

const FieldGrid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 20px' }}>
    {children}
  </div>
);

const BoolPill = ({ value }: { value: boolean }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: value ? '#dcfce7' : '#f3f4f6',
    color: value ? '#065f46' : '#6b7280',
    border: `1px solid ${value ? '#86efac' : '#e5e7eb'}`,
  }}>
    {value ? '✓ Yes' : '✗ No'}
  </span>
);

/* ─── Page ──────────────────────────────────────────────── */

export default function SanghaPage() {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<Tab>('approved');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<Sangha[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState<SanghaDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const getToken = useCallback(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  /* ── Fetch counts ──────────────────────────────────────── */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/admin/sangha/counts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCounts({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
        });
      })
      .catch(console.error);
  }, [getToken]);

  /* ── Fetch list by tab ─────────────────────────────────── */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);

    let endpoint = '';
    if (statusTab === 'approved') {
      endpoint = `${BASE_URL}/api/admin/sangha/all`;
     
    } else if (statusTab === 'rejected') {
      endpoint = `${BASE_URL}/api/admin/sangha/history`;
    }

    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        let formattedList = Array.isArray(data) ? data : [];
        if (statusTab === 'rejected') {
          formattedList = formattedList.filter((s: Sangha) => s.status === 'rejected');
        }
        setList(formattedList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken, statusTab]);

  /* ── Open detail modal ─────────────────────────────────── */
  const openDetail = async (s: Sangha) => {
    const token = getToken();
    if (!token) return;
    setDetailLoading(true);
    setViewModal(null);
    setLogoError(false);
    try {
      const r = await fetch(`${BASE_URL}/api/admin/sangha/${s.id}/detail`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setViewModal(data);
      } else {
        setViewModal({ ...s, members: [] });
      }
    } catch {
      setViewModal({ ...s, members: [] });
    }
    setDetailLoading(false);
  };

  /* ── Approve ───────────────────────────────────────────── */
  const handleApprove = async (sangha_auth_id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const r = await fetch(`${BASE_URL}/api/admin/sangha/approve/${sangha_auth_id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        setList(prev => prev.filter(s => s.sangha_auth_id !== sangha_auth_id));
        setCounts(c => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
      } else {
        const err = await r.json();
        alert(err.message || 'Failed to approve');
      }
    } catch (e) { console.error(e); }
  };

  /* ── Reject ────────────────────────────────────────────── */
  const handleReject = async (sangha_auth_id: string, name: string) => {
    const reason = prompt(`Reject "${name}".\nEnter reason (optional):`);
    if (reason === null) return;
    const token = getToken();
    if (!token) return;
    try {
      const r = await fetch(`${BASE_URL}/api/admin/sangha/reject/${sangha_auth_id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }) });
      if (r.ok) {
        setList(prev => prev.filter(s => s.sangha_auth_id !== sangha_auth_id));
        setCounts(c => ({ ...c, pending: Math.max(0, c.pending - 1), rejected: c.rejected + 1 }));
      } else {
        const err = await r.json();
        alert(err.message || 'Failed to reject');
      }
    } catch (e) { console.error(e); }
  };

  /* ── Export ────────────────────────────────────────────── */
  const handleExport = () => {
    const headers = ['ID', 'Auth ID', 'Name', 'Location', 'Email', 'Phone', 'Status', 'Created At'];
    const rows = filtered.map(s => [
      s.id, s.sangha_auth_id, s.name, s.location || '',
      s.reg_email || s.email || '', s.reg_phone || s.phone || '',
      s.status, s.created_at || '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${statusTab}_sangha_export.csv`;
    a.click();
  };

  /* ── Derived ───────────────────────────────────────────── */
  const countFor = (t: Tab) => {
   
    if (t === 'rejected') return counts.rejected || 0;
    if (t === 'approved') return counts.approved || 0;
    return 0;
  };

  const filtered = list.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.id?.toString().includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase()),
  );

  const colSpan = statusTab === 'rejected' ? 7 : 6;

  /* ── Render ────────────────────────────────────────────── */
  if (loading && list.length === 0)
    return <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sangha Management</h1>
      </div>

      {/* ── Summary chips ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_TABS.map(({ key, label, color }) => (
          <div className="total-chip" key={key}>
            <div className="total-chip-val" style={{ color }}>{countFor(key)}</div>
            <div className="total-chip-label">Total {label} Sangha</div>
          </div>
        ))}
      </div>

      {/* ── Status tabs ──────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', marginBottom: 20 }}>
        {STATUS_TABS.map(({ key, label, color }) => (
          <button key={key}
            onClick={() => { setStatusTab(key); setSearch(''); }}
            style={{
              padding: '10px 24px', fontWeight: statusTab === key ? 700 : 400,
              fontSize: 14, background: 'none', border: 'none',
              borderBottom: statusTab === key ? `2px solid ${color}` : '2px solid transparent',
              color: statusTab === key ? color : 'var(--gray-500)',
              cursor: 'pointer', transition: 'all .15s', marginBottom: -1,
            }}
          >
            {label}
            <span style={{
              marginLeft: 8, borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 7px',
              background: statusTab === key ? color : 'var(--gray-100)',
              color: statusTab === key ? '#fff' : 'var(--gray-500)',
              transition: 'all .15s',
            }}>
              {countFor(key)}
            </span>
          </button>
        ))}
      </div>

      {/* ── Action bar ───────────────────────────────────── */}
      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input placeholder={`Search ${statusTab} Sangha...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>Export</button>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Email</th>
              <th>Phone</th>
              {statusTab === 'rejected' && <th>Updated</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td><span className="chip">{s.id?.slice(0, 8) ?? '—'}</span></td>
                <td>
                  <div className="avatar-cell">
                    <div className={`avatar-sm ${avatarClass[statusTab]}`}>{s.name?.[0] ?? '?'}</div>
                    {s.name}
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.location || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.reg_email || s.email || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.reg_phone || s.phone || '—'}</td>
                {statusTab === 'rejected' && <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '—'}</td>}
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {/* View button */}
                    <button className="icon-btn" title="View Details" onClick={() => openDetail(s)}
                      style={{
                        background: '#f9fafb', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                        fontSize: 13, lineHeight: 1,
                      }}
                    >
                      👁
                    </button>

                    

                    {/* ── Download PDF button ── */}
                    <button
                      className="icon-btn"
                      title="Download PDF"
                      onClick={() => downloadAsPdf(s, s.name)}
                      style={{
                        background: '#f9fafb', border: '1px solid #e5e7eb',
                        borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                        fontSize: 13, lineHeight: 1,
                      }}
                    >
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>⬇️</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No {statusTab} Sangha found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════ VIEW DETAIL MODAL ═══════════════════ */}
      {(viewModal || detailLoading) && (
        <Modal
          open
          title={detailLoading ? 'Loading...' : `Sangha Profile — ${viewModal!.name}`}
          onClose={() => { setViewModal(null); setLogoError(false); }}
          maxWidth="960px"
        >
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
              Loading details...
            </div>
          ) : viewModal ? (
            <div style={{ padding: '4px 0' }}>

              {/* ══ MODAL HEADER BAND — status badge + logo ══════════ */}
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', marginBottom: 20, gap: 16,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                  ...statusBadgeStyle(viewModal.status),
                }}>
                  {fmtStatus(viewModal.status)}
                </div>

                <div style={{
                  width: 72, height: 72, borderRadius: 12, flexShrink: 0,
                  border: '1px solid #e5e7eb', overflow: 'hidden',
                  background: '#f9fafb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {viewModal.logo_url && !logoError ? (
                    <img
                      src={viewModal.logo_url}
                      alt={`${viewModal.name} logo`}
                      onError={() => setLogoError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    }}>
                      <span style={{
                        fontSize: 26, fontWeight: 800, color: '#9ca3af',
                        lineHeight: 1,
                      }}>
                        {viewModal.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                      <span style={{ fontSize: 9, color: '#d1d5db', marginTop: 2 }}>No Logo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ══ MAIN CARD ════════════════════════════════════════ */}
              <div style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: 24, borderLeft: '4px solid #7c3aed',
              }}>

                <SectionHeading title="Basic Information" icon={IC.users ?? null} />
                <FieldGrid cols={2}>
                  <ViewField label="Sangha Name" value={viewModal.name} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}>
                  <ViewField label="Description" value={viewModal.description} />
                </div>

                <SectionHeading title="Registration Contact" />
                <FieldGrid cols={2}>
                  <ViewField label="Registered Email" value={viewModal.reg_email} />
                  <ViewField label="Registered Phone" value={viewModal.reg_phone} />
                </FieldGrid>

                <SectionHeading title="Sangha Contact" />
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Same as Registration Contact:</span>
                  <BoolPill value={!!viewModal.sangha_contact_same} />
                </div>
                <FieldGrid cols={2}>
                  <ViewField
                    label="Sangha Email"
                    value={viewModal.sangha_contact_same ? viewModal.reg_email : (viewModal.sangha_email || viewModal.reg_email)}
                  />
                  <ViewField
                    label="Sangha Phone"
                    value={viewModal.sangha_contact_same ? viewModal.reg_phone : (viewModal.sangha_phone || viewModal.reg_phone)}
                  />
                </FieldGrid>

                <SectionHeading title="Address" />
                <FieldGrid cols={2}>
                  <ViewField label="Address Line" value={viewModal.address_line} />
                  <ViewField label="Village / Town" value={viewModal.village_town} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}>
                  <FieldGrid cols={4}>
                    <ViewField label="Taluk" value={viewModal.taluk} />
                    <ViewField label="District" value={viewModal.location} />
                    <ViewField label="State" value={viewModal.state} />
                    <ViewField label="Pincode" value={viewModal.pincode} />
                  </FieldGrid>
                </div>

                <SectionHeading title="Status & Timeline" />
                <FieldGrid cols={2}>
                  <ViewField label="Current Status" value={fmtStatus(viewModal.status)} />
                  <ViewField label="Created At" value={fmtDate(viewModal.created_at)} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}>
                  <ViewField label="Last Updated" value={fmtDate(viewModal.updated_at)} />
                </div>

                {(viewModal.status === 'rejected' || viewModal.status === 'suspended') && (
                  <div style={{
                    marginTop: 14, padding: '10px 14px', borderRadius: 8,
                    background: '#fff1f2', border: '1px solid #fecdd3',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                      Rejection / Suspension Reason
                    </span>
                    <span style={{ fontSize: 13, color: '#881337' }}>
                      {viewModal.rejection_reason || 'No reason provided'}
                    </span>
                  </div>
                )}

                <SectionHeading title={`Sangha Members (${viewModal.members?.length ?? 0})`} />

                {viewModal.members && viewModal.members.length > 0 ? (
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['#', 'Name', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Role', 'Member Type'].map(h => (
                            <th key={h} style={{
                              textAlign: 'left', padding: '10px 10px',
                              color: '#6b7280', fontWeight: 600, fontSize: 11,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                              borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewModal.members.map((m, i) => (
                          <tr key={m.id || i} style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: i % 2 === 0 ? '#fff' : '#fafafa',
                          }}>
                            <td style={{ padding: '10px 10px', color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '10px 10px', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                  background: '#ede9fe', color: '#7c3aed',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: 11,
                                }}>
                                  {memberDisplayName(m)[0]?.toUpperCase() ?? '?'}
                                </div>
                                {memberDisplayName(m)}
                              </div>
                            </td>
                            <td style={{ padding: '10px 10px', color: '#6b7280' }}>
                              {m.gender ? m.gender.charAt(0).toUpperCase() + m.gender.slice(1) : '—'}
                            </td>
                            <td style={{ padding: '10px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {m.dob ? new Date(m.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '10px 10px', color: '#6b7280' }}>{m.phone || '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#6b7280' }}>{m.email || '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#6b7280' }}>
                              {m.role
                                ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#ede9fe', color: '#5b21b6', fontWeight: 600 }}>{m.role}</span>
                                : '—'}
                            </td>
                            <td style={{ padding: '10px 10px', color: '#6b7280' }}>
                              {m.member_type
                                ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#f0fdf4', color: '#065f46', fontWeight: 600 }}>{m.member_type}</span>
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    padding: '20px 0', textAlign: 'center',
                    fontSize: 13, color: '#9ca3af',
                    border: '1px dashed #e5e7eb', borderRadius: 8,
                  }}>
                    No members found for this Sangha
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
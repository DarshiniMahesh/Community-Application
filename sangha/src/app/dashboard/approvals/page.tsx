// C:\Users\anu03\Community-Application\admin\src\app\dashboard\approvals\page.tsx
'use client';
import { useState } from 'react';
import { USERS, SANGHA_LIST, PENDING_SANGHA, User, Sangha, PendingSangha } from '@/data/mockData';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

type Tab = 'user' | 'sangha';
type Section = 'personal' | 'religious' | 'family' | 'location' | 'education' | 'economic' | 'approval';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('user');

  const [pendingUsers, setPendingUsers] = useState<User[]>(USERS.filter(u => u.status === 'pending'));
  const [pendingSanghas, setPendingSanghas] = useState<PendingSangha[]>(PENDING_SANGHA);

  const [rejectModal, setRejectModal] = useState<{ id: string; name: string; kind: Tab } | null>(null);
  const [viewModal, setViewModal] = useState<User | null>(null);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['personal']));
  const [reason, setReason] = useState('');

  const toggleSection = (s: Section) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const approveUser = (id: string) => {
    const userIndex = USERS.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      USERS[userIndex].status = 'approved';
      USERS[userIndex].approvedDate = new Date().toISOString().split('T')[0];
      USERS[userIndex].approvedBy = 'Admin';
    }
    setPendingUsers(p => p.filter(u => u.id !== id));
  };

  const approveSangha = (id: string) => {
    setPendingSanghas(p => p.filter(s => s.id !== id));
  };

  const openView = (u: User) => {
    setOpenSections(new Set(u.status === 'approved' ? ['personal', 'approval'] : ['personal']));
    setViewModal(u);
  };

  const confirmReject = () => {
    if (!rejectModal) return;

    const today = new Date().toISOString().split('T')[0];

    if (rejectModal.kind === 'user') {
      const userIndex = USERS.findIndex(u => u.id === rejectModal.id);
      if (userIndex !== -1) {
        USERS[userIndex].status = 'rejected';
        USERS[userIndex].rejectedDate = today;
        USERS[userIndex].rejectedBy = 'Admin';
      }
      setPendingUsers(p => p.filter(u => u.id !== rejectModal.id));
    } else {
      setPendingSanghas(p => p.filter(s => s.id !== rejectModal.id));
    }

    setRejectModal(null);
    setReason('');
  };

  // User tab always shows only pending requests
  const displayUsers = pendingUsers;

  // Sangha tab always shows only pending requests
  const displaySanghas = pendingSanghas;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'user', label: 'User Requests', count: pendingUsers.length },
    { id: 'sangha', label: 'Sangha Requests', count: pendingSanghas.length },
  ];

  return (
    <div className="page">
      <div className="page-header"><h1>Approve Sangha and Users</h1></div>

      <div className="radio-tab-group">
        {tabs.map(t => (
          <label
            key={t.id}
            className={`radio-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <input type="radio" name="apTab" checked={tab === t.id} onChange={() => setTab(t.id)} />
            {t.label}
            <span className={`cnt-badge ${tab === t.id ? 'cnt-active' : 'cnt-idle'}`}>{t.count}</span>
          </label>
        ))}
      </div>

      {/* ── User Cards ── */}
      {tab === 'user' && (
        <>
          {displayUsers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              No pending user requests found.
            </div>
          ) : (
            displayUsers.map(u => (
              <div className="approval-card" key={u.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--orange-pale)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>
                      {u.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                        {u.name} <span className="chip">{u.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{u.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{u.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => approveUser(u.id)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejectModal({ id: u.id, name: u.name, kind: 'user' })}>Reject</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openView(u)}>See</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── Sangha Cards ── */}
      {tab === 'sangha' && (
        <>
          {displaySanghas.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              No pending sangha requests found.
            </div>
          ) : (
            displaySanghas.map(s => (
              <div className="approval-card ac-purple" key={s.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--purple-pale)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                        {s.name} <span className="chip">{s.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{s.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{s.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={() => approveSangha(s.id)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejectModal({ id: s.id, name: s.name, kind: 'sangha' })}>Reject</button>
                    <button className="btn btn-secondary btn-sm">See</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          FULL REVIEW MODAL
      ══════════════════════════════════════════════════ */}
      {viewModal && (
        <Modal
          open
          title={`Profile Review — ${viewModal.id}`}
          onClose={() => setViewModal(null)}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {viewModal.status === 'pending' && (
                  <>
                    <button className="btn btn-success btn-sm" onClick={() => { approveUser(viewModal.id); setViewModal(null); }}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setViewModal(null); setRejectModal({ id: viewModal.id, name: viewModal.name, kind: 'user' }); }}>✕ Reject</button>
                  </>
                )}
              </div>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
            </div>
          }
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 10, marginBottom: 20,
            background: 'var(--orange-pale, #fff7ed)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: 'var(--orange, #f97316)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22,
            }}>{viewModal.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{viewModal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{viewModal.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{viewModal.phone}
                </span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusBadge color={viewModal.status === 'approved' ? 'green' : viewModal.status === 'rejected' ? 'red' : 'orange'}>
                  {viewModal.status === 'approved' ? '✓ Approved' : viewModal.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                </StatusBadge>
                <StatusBadge color="blue">Submitted: {viewModal.submitted}</StatusBadge>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Profile Summary
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {viewModal.status === 'approved' && (
              <AccordionSection title="Approval Details" step="✓" open={openSections.has('approval')} onToggle={() => toggleSection('approval')} accentColor="#059669">
                <FieldGrid>
                  <Field label="Approved Date" value={viewModal.approvedDate || '—'} />
                  <Field label="Approved By" value={viewModal.approvedBy || '—'} />
                </FieldGrid>
              </AccordionSection>
            )}

            {viewModal.status === 'rejected' && (
              <AccordionSection title="Rejection Details" step="✕" open={openSections.has('approval')} onToggle={() => toggleSection('approval')} accentColor="#dc2626">
                <FieldGrid>
                  <Field label="Rejected Date" value={viewModal.rejectedDate || '—'} />
                  <Field label="Rejected By" value={viewModal.rejectedBy || '—'} />
                </FieldGrid>
              </AccordionSection>
            )}

            <AccordionSection title="Personal Details" step="Step 1" open={openSections.has('personal')} onToggle={() => toggleSection('personal')}>
              <FieldGrid>
                <Field label="Full Name" value={viewModal.name} />
                <Field label="Phone" value={viewModal.phone} />
                <Field label="Email" value={viewModal.email} />
                <Field label="State" value={viewModal.state} />
              </FieldGrid>
            </AccordionSection>

            <AccordionSection title="Family Information" step="Step 2" open={openSections.has('family')} onToggle={() => toggleSection('family')}>
              <FieldGrid>
                <Field label="Total Members" value={String(viewModal.family)} />
              </FieldGrid>
            </AccordionSection>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal open title="Confirm Rejection"
          onClose={() => { setRejectModal(null); setReason(''); }}
          maxWidth="420px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setReason(''); }}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmReject}>Confirm Rejection</button>
            </>
          }>
          <div className="alert alert-warning">You are about to reject <strong>{rejectModal.name}</strong>.</div>
          <label className="form-label">Reason</label>
          <textarea className="form-input form-textarea" placeholder="State a reason..." value={reason} onChange={e => setReason(e.target.value)} />
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Helper components
══════════════════════════════════════════════════ */

function AccordionSection({
  title, step, open, onToggle, children, accentColor
}: {
  title: string;
  step: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: open ? 'var(--blue-pale, #eff6ff)' : 'var(--gray-50, #f9fafb)', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--gray-200)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: accentColor || (open ? 'var(--blue)' : 'var(--gray-300)'), color: '#fff', transition: 'all 0.15s' }}>{step}</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)' }}>{title}</span>
        </div>
        <span style={{ fontSize: 16, color: 'var(--gray-400)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>
      {open && <div style={{ padding: '16px 16px', background: 'var(--white, #fff)' }}>{children}</div>}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  const empty = value === '—';
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: empty ? 'var(--gray-300)' : 'var(--gray-800)', fontStyle: empty ? 'italic' : 'normal' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ children, color }: { children: React.ReactNode; color: 'orange' | 'blue' | 'gray' | 'green' | 'red' }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    blue:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    gray:   { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
    green:  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    red:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  };
  const s = styles[color];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{children}</span>;
}
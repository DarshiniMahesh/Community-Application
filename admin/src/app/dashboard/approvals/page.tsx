'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

type Tab = 'sangha' | 'user';

interface SanghaItem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  contact_person: string;
  status: string;
  created_at: string;
}

interface UserItem {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  sangha_name: string;
  sangha_id: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sangha');
  const [pendingUsers, setPendingUsers] = useState<UserItem[]>([]);
  const [pendingSanghas, setPendingSanghas] = useState<SanghaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string; kind: Tab } | null>(null);
  const [viewModal, setViewModal] = useState<SanghaItem | UserItem | null>(null);
  const [viewKind, setViewKind] = useState<Tab>('sangha');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = useCallback((): string | null => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  const authHeaders = useCallback((token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE_URL}/api/admin/sangha/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/admin/users/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([sanghas, users]) => {
        setPendingSanghas(Array.isArray(sanghas) ? sanghas : []);
        setPendingUsers(Array.isArray(users) ? users : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const approveSangha = async (item: SanghaItem) => {
    const token = getToken();
    if (!token) return;
    setActionLoading(true);
    try {
      await fetch(`${BASE_URL}/api/admin/sangha/approve/${item.user_id}`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      setPendingSanghas(p => p.filter(s => s.id !== item.id));
    } finally {
      setActionLoading(false);
    }
  };

  const approveUser = async (item: UserItem) => {
    const token = getToken();
    if (!token) return;
    setActionLoading(true);
    try {
      await fetch(`${BASE_URL}/api/admin/users/approve`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ userId: item.id }),
      });
      setPendingUsers(p => p.filter(u => u.id !== item.id));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const token = getToken();
    if (!token) return;
    setActionLoading(true);
    try {
      if (rejectModal.kind === 'sangha') {
        const item = pendingSanghas.find(s => s.id === rejectModal.id);
        if (!item) return;
        await fetch(`${BASE_URL}/api/admin/sangha/reject/${item.user_id}`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ reason }),
        });
        setPendingSanghas(p => p.filter(s => s.id !== rejectModal.id));
      } else {
        await fetch(`${BASE_URL}/api/admin/users/reject`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ userId: rejectModal.id, comment: reason }),
        });
        setPendingUsers(p => p.filter(u => u.id !== rejectModal.id));
      }
    } finally {
      setActionLoading(false);
      setRejectModal(null);
      setReason('');
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'sangha', label: 'Sangha Request', count: pendingSanghas.length },
    { id: 'user',   label: 'User Request',   count: pendingUsers.length   },
  ];

  const getSanghaViewFields = (s: SanghaItem): [string, string][] => [
    ['ID',             s.id],
    ['Name',           s.name],
    ['Email',          s.email],
    ['Phone',          s.phone],
    ['Location',       s.location || '—'],
    ['Contact Person', s.contact_person || '—'],
    ['Submitted',      s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'],
  ];

  const getUserViewFields = (u: UserItem): [string, string][] => [
    ['ID',             u.id],
    ['Name',           `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'],
    ['Email',          u.email],
    ['Phone',          u.phone],
    ['Requested Sangha', u.sangha_name || '—'],
    ['Status',         u.status],
    ['Submitted',      u.submitted_at ? new Date(u.submitted_at).toLocaleDateString() : '—'],
  ];

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
      Loading...
    </div>
  );

  return (
    <div className="page">
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

      {/* ── Sangha Requests ── */}
      {tab === 'sangha' && (
        pendingSanghas.length === 0
          ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              All Sangha requests processed
            </div>
          )
          : pendingSanghas.map(s => (
            <div className="approval-card ac-purple" key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--purple-pale)', color: 'var(--purple)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 17,
                  }}>
                    {s.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                      {s.name} <span className="chip">{s.id}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>
                        {s.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>
                        {s.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => approveSangha(s)}>Approve</button>
                  <button className="btn btn-danger btn-sm"  disabled={actionLoading} onClick={() => setRejectModal({ id: s.id, name: s.name, kind: 'sangha' })}>Reject</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setViewModal(s); setViewKind('sangha'); }}>See</button>
                </div>
              </div>
            </div>
          ))
      )}

      {/* ── User Requests ── */}
      {tab === 'user' && (
        pendingUsers.length === 0
          ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              All user requests processed
            </div>
          )
          : pendingUsers.map(u => {
            const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
            return (
              <div className="approval-card" key={u.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: 'var(--orange-pale)', color: 'var(--orange)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 17,
                    }}>
                      {displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                        {displayName} <span className="chip">{u.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>
                          {u.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>
                          {u.phone}
                        </span>
                      </div>
                      {/* ── Sangha badge ── */}
                      {u.sangha_name && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'var(--purple-pale)', color: 'var(--purple)',
                            borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            {u.sangha_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => approveUser(u)}>Approve</button>
                    <button className="btn btn-danger btn-sm"  disabled={actionLoading} onClick={() => setRejectModal({ id: u.id, name: displayName, kind: 'user' })}>Reject</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setViewModal(u); setViewKind('user'); }}>See</button>
                  </div>
                </div>
              </div>
            );
          })
      )}

      {/* ── View Modal ── */}
      {viewModal && (
        <Modal
          open
          title={`${viewKind === 'sangha' ? 'Sangha' : 'User'} Info — ${viewModal.id}`}
          onClose={() => setViewModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>}
        >
          {(viewKind === 'sangha'
            ? getSanghaViewFields(viewModal as SanghaItem)
            : getUserViewFields(viewModal as UserItem)
          ).map(([k, v]) => (
            <div className="info-row" key={k}>
              <span className="info-key">{k}</span>
              <span className="info-val">{v}</span>
            </div>
          ))}
        </Modal>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal
          open
          title="Confirm Rejection"
          onClose={() => { setRejectModal(null); setReason(''); }}
          maxWidth="420px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setReason(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={actionLoading} onClick={confirmReject}>Confirm Rejection</button>
            </>
          }
        >
          <div className="alert alert-warning">
            You are about to reject <strong>{rejectModal.name}</strong>.
          </div>
          <label className="form-label">Reason</label>
          <textarea
            className="form-input form-textarea"
            placeholder="State a reason..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
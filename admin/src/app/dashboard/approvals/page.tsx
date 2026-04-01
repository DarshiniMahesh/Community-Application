'use client';
import { useState } from 'react';
import { USERS, PENDING_SANGHA, User, PendingSangha } from '@/data/mockData';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

type Tab = 'sangha' | 'user';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('sangha');
  const [pendingUsers, setPendingUsers] = useState<User[]>(USERS.filter(u => u.status === 'pending'));
  const [pendingSanghas, setPendingSanghas] = useState<PendingSangha[]>(PENDING_SANGHA);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string; kind: Tab } | null>(null);
  const [viewModal, setViewModal] = useState<User | PendingSangha | null>(null);
  const [viewKind, setViewKind] = useState<Tab>('sangha');
  const [reason, setReason] = useState('');

  const approveUser   = (id: string) => setPendingUsers(p => p.filter(u => u.id !== id));
  const approveSangha = (id: string) => setPendingSanghas(p => p.filter(s => s.id !== id));

  const confirmReject = () => {
    if (!rejectModal) return;
    if (rejectModal.kind === 'user') setPendingUsers(p => p.filter(u => u.id !== rejectModal.id));
    else setPendingSanghas(p => p.filter(s => s.id !== rejectModal.id));
    setRejectModal(null); setReason('');
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'sangha', label: 'Sangha Request', count: pendingSanghas.length },
    { id: 'user',   label: 'User Request',   count: pendingUsers.length   },
  ];

  const getViewFields = (): [string, string][] => {
    if (!viewModal) return [];
    if (viewKind === 'sangha') {
      return [
        ['Name', viewModal.name],
        ['Email', viewModal.email],
        ['Phone', viewModal.phone],
      ];
    }
    return [
      ['Name', viewModal.name],
      ['Email', viewModal.email],
      ['Phone', viewModal.phone],
      ['Submitted', (viewModal as User).submitted],
    ];
  };

  return (
    <div className="page">

      <div className="radio-tab-group">
        {tabs.map(t => (
          <label key={t.id} className={`radio-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <input type="radio" name="apTab" checked={tab === t.id} onChange={() => setTab(t.id)} />
            {t.label}
            <span className={`cnt-badge ${tab === t.id ? 'cnt-active' : 'cnt-idle'}`}>{t.count}</span>
          </label>
        ))}
      </div>

      {tab === 'sangha' && (
        pendingSanghas.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>All Sangha requests processed</div>
          : pendingSanghas.map(s => (
            <div className="approval-card ac-purple" key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--purple-pale)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>{s.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{s.name} <span className="chip">{s.id}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{s.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{s.phone}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-success btn-sm" onClick={() => approveSangha(s.id)}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setRejectModal({ id: s.id, name: s.name, kind: 'sangha' })}>Reject</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setViewModal(s); setViewKind('sangha'); }}>See</button>
                </div>
              </div>
            </div>
          ))
      )}

      {tab === 'user' && (
        pendingUsers.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>All user requests processed</div>
          : pendingUsers.map(u => (
            <div className="approval-card" key={u.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--orange-pale)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{u.name} <span className="chip">{u.id}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{u.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{u.phone}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-success btn-sm" onClick={() => approveUser(u.id)}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setRejectModal({ id: u.id, name: u.name, kind: 'user' })}>Reject</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setViewModal(u); setViewKind('user'); }}>See</button>
                </div>
              </div>
            </div>
          ))
      )}

      {viewModal && (
        <Modal open title={`${viewKind === 'sangha' ? 'Sangha' : 'User'} Info — ${viewModal.id}`} onClose={() => setViewModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>}>
          {getViewFields().map(([k, v]) => (
            <div className="info-row" key={k}>
              <span className="info-key">{k}</span>
              <span className="info-val">{v}</span>
            </div>
          ))}
        </Modal>
      )}

      {rejectModal && (
        <Modal open title="Confirm Rejection" onClose={() => { setRejectModal(null); setReason(''); }} maxWidth="420px"
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
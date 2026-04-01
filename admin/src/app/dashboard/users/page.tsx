'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

interface UserItem {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  submitted_at: string;
  overall_completion_pct: number;
  first_name: string;
  last_name: string;
  gender: string;
  sangha_name: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<UserItem | null>(null);

  const getToken = useCallback(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/admin/users/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const filtered = list.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const q = search.toLowerCase();
    return fullName.includes(q) || u.email?.toLowerCase().includes(q) || u.id?.toString().includes(q);
  });

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input placeholder="Search by name, email or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm">Export</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Sangha</th><th>Status</th><th>Completion</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
              return (
                <tr key={u.id}>
                  <td><span className="chip">{u.id}</span></td>
                  <td><div className="avatar-cell"><div className="avatar-sm">{displayName[0]?.toUpperCase() ?? '?'}</div>{displayName}</div></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.phone}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.sangha_name || '—'}</td>
                  <td>
                    <span className={`status-chip ${u.status === 'approved' ? 'status-approved' : u.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                      {u.status || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.overall_completion_pct != null ? `${u.overall_completion_pct}%` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="icon-btn" title="See Info" onClick={() => setModal(u)}>
                        <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.eye}</span>
                      </button>
                      <button className="icon-btn" title="Export">
                        <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.download}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal open title={`User Info — ${modal.id}`} onClose={() => setModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>}>
          {([
            ['Name',       `${modal.first_name || ''} ${modal.last_name || ''}`.trim() || '—'],
            ['Email',      modal.email],
            ['Phone',      modal.phone],
            ['Gender',     modal.gender || '—'],
            ['Sangha',     modal.sangha_name || '—'],
            ['Completion', modal.overall_completion_pct != null ? `${modal.overall_completion_pct}%` : '—'],
            ['Status',     modal.status || '—'],
            ['Submitted',  modal.submitted_at ? new Date(modal.submitted_at).toLocaleDateString() : '—'],
          ] as [string, string][]).map(([k, v]) => (
            <div className="info-row" key={k}>
              <span className="info-key">{k}</span>
              <span className="info-val">{v}</span>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
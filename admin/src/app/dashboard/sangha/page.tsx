'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

interface Sangha {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  contact_person: string;
  area_covered: string;
  status: string;
  created_at: string;
}

export default function SanghaPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<Sangha[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Sangha | null>(null);

  const getToken = useCallback(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/admin/sangha/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const filtered = list.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.id?.toString().includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input placeholder="Search Sangha..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm">Export</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Status</th><th>Registered</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td><span className="chip">{s.id}</span></td>
                <td><div className="avatar-cell"><div className="avatar-sm avatar-purple">{s.name?.[0] ?? '?'}</div>{s.name}</div></td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.email}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.phone}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.location || '—'}</td>
                <td>
                  <span className={`status-chip ${s.status === 'approved' ? 'status-approved' : s.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                    {s.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="icon-btn" title="See Info" onClick={() => setModal(s)}>
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.eye}</span>
                    </button>
                    <button className="icon-btn" title="Download">
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.download}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No Sangha found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal open title={`Sangha Info — ${modal.id}`} onClose={() => setModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>}>
          {([
            ['ID',             modal.id],
            ['Name',           modal.name],
            ['Email',          modal.email],
            ['Phone',          modal.phone],
            ['Location',       modal.location || '—'],
            ['Contact Person', modal.contact_person || '—'],
            ['Area Covered',   modal.area_covered || '—'],
            ['Status',         modal.status],
            ['Registered',     modal.created_at ? new Date(modal.created_at).toLocaleDateString() : '—'],
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
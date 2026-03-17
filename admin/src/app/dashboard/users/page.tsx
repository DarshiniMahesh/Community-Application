'use client';
import { useState } from 'react';
import { USERS, User } from '@/data/mockData';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<User | null>(null);

  const list = USERS.filter(u =>
    u.status === 'approved' &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search))
  );

  return (
    <div className="page">
      <div className="page-header"><h1>User Management</h1></div>

      <div className="total-chip">
        <div className="total-chip-val" style={{ color: 'var(--blue)' }}>
          {USERS.filter(u => u.status === 'approved').length}
        </div>
        <div className="total-chip-label">Total Approved Users</div>
      </div>

      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm">Export</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td><span className="chip">{u.id}</span></td>
                <td><div className="avatar-cell"><div className="avatar-sm">{u.name[0]}</div>{u.name}</div></td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.phone}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.submitted}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="icon-btn" title="See Info" onClick={() => setModal(u)}>
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.eye}</span>
                    </button>
                    <button className="icon-btn" title="Export">
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.download}</span>
                    </button>
                    <button className="icon-btn icon-btn-danger" title="Delete">
                      <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.trash}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal open title={`User Info — ${modal.id}`} onClose={() => setModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>}>
          {([
            ['Name', modal.name], ['Email', modal.email], ['Phone', modal.phone],
            ['Annual Income', `Rs.${modal.income.toLocaleString()}`],
            ['Family Members', String(modal.family)], ['Assets', modal.assets],
            ['BPL', modal.bpl ? 'Yes' : 'No'], ['Status', modal.status],
            ['Submitted', modal.submitted],
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

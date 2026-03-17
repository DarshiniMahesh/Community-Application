'use client';
import { useState } from 'react';
import { USERS, SANGHA_LIST } from '@/data/mockData';
import { IC } from '@/components/Icons';

type HistTab = 'users' | 'sangha';

const approvedUsers  = USERS.filter(u => u.status === 'approved' || u.status === 'rejected');
const approvedSangha = SANGHA_LIST;

export default function HistoryPage() {
  const [tab, setTab]       = useState<HistTab>('users');
  const [search, setSearch] = useState('');

  const filtU = approvedUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search));
  const filtS = approvedSangha.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search));

  return (
    <div className="page">
      <div className="page-header"><h1>Approval History</h1></div>

      <div className="radio-tab-group">
        {([['users', 'Users', approvedUsers.length], ['sangha', 'Sangha', approvedSangha.length]] as [HistTab, string, number][]).map(([id, label, cnt]) => (
          <label key={id} className={`radio-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <input type="radio" name="histTab" checked={tab === id} onChange={() => setTab(id)} />
            {label}
            <span className={`cnt-badge ${tab === id ? 'cnt-active' : 'cnt-idle'}`}>{cnt}</span>
          </label>
        ))}
      </div>

      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {tab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Submitted</th><th>Approved</th></tr></thead>
            <tbody>
              {filtU.map(u => (
                <tr key={u.id}>
                  <td><span className="chip">{u.id}</span></td>
                  <td><div className="avatar-cell"><div className="avatar-sm">{u.name[0]}</div>{u.name}</div></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.phone}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.submitted}</td>
                  <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                </tr>
              ))}
              {filtU.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sangha' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Approved</th></tr></thead>
            <tbody>
              {filtS.map(s => (
                <tr key={s.id}>
                  <td><span className="chip">{s.id}</span></td>
                  <td><div className="avatar-cell"><div className="avatar-sm avatar-purple">{s.name[0]}</div>{s.name}</div></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.phone}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.joined}</td>
                  <td><span className="badge badge-approved">Approved</span></td>
                </tr>
              ))}
              {filtS.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

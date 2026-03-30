// src/app/dashboard/blocklist/page.tsx

'use client';
import { useState } from 'react';
import { USERS, SANGHA_LIST } from '@/data/mockData';

export default function BlocklistPage() {
  const [users, setUsers] = useState(USERS);
  const [sangha, setSangha] = useState(SANGHA_LIST);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [deleted, setDeleted] = useState<any[]>([]);
  const [tab, setTab] = useState<'users' | 'sangha'>('users');
  const [search, setSearch] = useState('');

  const blockUser = (u: any) => {
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setBlocked(prev => [...prev, { ...u, type: 'user' }]);
  };

  const deleteUser = (u: any) => {
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDeleted(prev => [...prev, { ...u, type: 'user' }]);
  };

  const blockSangha = (s: any) => {
    setSangha(prev => prev.filter(x => x.id !== s.id));
    setBlocked(prev => [...prev, { ...s, type: 'sangha' }]);
  };

  const deleteSangha = (s: any) => {
    setSangha(prev => prev.filter(x => x.id !== s.id));
    setDeleted(prev => [...prev, { ...s, type: 'sangha' }]);
  };

  const list = (tab === 'users' ? users : sangha).filter((item: any) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Block</h1>
      </div>

      {/* Tabs */}
      <div className="radio-tab-group">
        <button
          className={`radio-tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
        <button
          className={`radio-tab ${tab === 'sangha' ? 'active' : ''}`}
          onClick={() => setTab('sangha')}
        >
          Sangha
        </button>
      </div>

      {/* Search */}
      <div className="action-bar">
        <input
          className="search-box"
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th> {/* Added Email Header */}
              <th>Phone</th> {/* Added Phone Header */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item: any) => (
              <tr key={item.id}>
                <td><span className="chip">{item.id}</span></td>
                <td>{item.name}</td>
                <td>{item.email}</td> {/* Added Email Data */}
                <td>{item.phone}</td> {/* Added Phone Data */}
                <td style={{ display: 'flex', gap: 10 }}>
                  
                  {/* Orange Block */}
                  <button
                    style={{
                      background: 'var(--orange)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() =>
                      tab === 'users' ? blockUser(item) : blockSangha(item)
                    }
                  >
                    Block
                  </button>

                  {/* Delete (red toned but subtle) */}
                  <button
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() =>
                      tab === 'users' ? deleteUser(item) : deleteSangha(item)
                    }
                  >
                    Delete
                  </button>

                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                {/* Updated colSpan to 5 to account for new columns */}
                <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
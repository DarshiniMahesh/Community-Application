'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type MainTab = 'users' | 'sangha';
type SubTab  = 'approved' | 'rejected';

interface UserLog {
  profile_id:       string;
  user_id:          string;
  email:            string | null;
  phone:            string | null;
  first_name:       string | null;
  last_name:        string | null;
  status:           string;
  submitted_at:     string | null;
  reviewed_at:      string | null;
  review_comment:   string | null;
  reviewed_by_name: string | null;
}

interface SanghaLog {
  id:           string;
  sangha_name:  string;
  email:        string | null;
  phone:        string | null;
  location:     string | null;
  state:        string | null;
  status:       string;
  submitted_at: string | null;
  reviewed_at:  string | null;
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN');
}

function isPending(s: string) {
  return s === 'submitted' || s === 'under_review';
}

export default function HistoryPage() {
  const [mainTab,    setMainTab]    = useState<MainTab>('users');
  const [subTab,     setSubTab]     = useState<SubTab>('approved');
  const [search,     setSearch]     = useState('');
  const [userLogs,   setUserLogs]   = useState<UserLog[]>([]);
  const [sanghaLogs, setSanghaLogs] = useState<SanghaLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/activity-logs'),
      api.get('/api/admin/sangha/history'),
    ])
      .then(([users, sanghas]) => {
        setUserLogs(Array.isArray(users)   ? users   : []);
        setSanghaLogs(Array.isArray(sanghas) ? sanghas : []);
        setError(null);
      })
      .catch((err) => {
        console.error('Activity log fetch error:', err);
        setError('Failed to load data. Check API connection.');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Buckets ────────────────────────────────────────────────
  const userBuckets = {
    approved: userLogs.filter((u) => u.status === 'approved'),
    pending:  userLogs.filter((u) => isPending(u.status)),
    rejected: userLogs.filter((u) => u.status === 'rejected'),
  };
  const sanghaBuckets = {
    approved: sanghaLogs.filter((s) => s.status === 'approved'),
    pending:  sanghaLogs.filter((s) => s.status === 'pending_approval'),
    rejected: sanghaLogs.filter((s) => s.status === 'rejected'),
  };

  const srch = search.toLowerCase();

  const displayName = (u: UserLog) =>
    u.first_name || u.last_name
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : u.email || u.phone || 'Unknown';

  const currentUsers = userBuckets[subTab].filter((u) =>
    displayName(u).toLowerCase().includes(srch) ||
    (u.email ?? '').toLowerCase().includes(srch) ||
    (u.phone ?? '').includes(srch)
  );

  const currentSangha = sanghaBuckets[subTab].filter((s) =>
    (s.sangha_name ?? '').toLowerCase().includes(srch) ||
    (s.email ?? '').toLowerCase().includes(srch) ||
    (s.phone ?? '').includes(srch)
  );

  const switchMain = (t: MainTab) => {
    setMainTab(t);
    setSubTab('approved');
    setSearch('');
  };

  const subTabDefs: { key: SubTab; label: string }[] = [
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const countFor = (key: SubTab) =>
    mainTab === 'users' ? userBuckets[key].length : sanghaBuckets[key].length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity log</h1>
      </div>

      {/* Main radio tabs */}
      <div className="radio-tab-group">
        {(['users', 'sangha'] as MainTab[]).map((id) => (
          <label
            key={id}
            className={`radio-tab ${mainTab === id ? 'active' : ''}`}
            onClick={() => switchMain(id)}
          >
            <input type="radio" name="mainTab" checked={mainTab === id} onChange={() => {}} />
            {id === 'users' ? 'Users' : 'Sangha'}
          </label>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', marginTop: 16 }}>
        {subTabDefs.map(({ key, label }) => {
          const active = subTab === key;
          return (
            <button
              key={key}
              onClick={() => { setSubTab(key); setSearch(''); }}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderBottom: active
                  ? '2px solid var(--primary, #f97316)'
                  : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary, #f97316)' : 'var(--gray-500)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {label}
              <span
                style={{
                  background: active ? 'var(--primary, #f97316)' : 'var(--gray-200)',
                  color:      active ? '#fff' : 'var(--gray-600)',
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {countFor(key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="action-bar" style={{ marginTop: 16 }}>
        <div className="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            placeholder="Search by Name, Email, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
          Loading...
        </div>
      )}
      {error && (
        <div style={{ padding: 20, color: 'red', fontSize: 13 }}>{error}</div>
      )}

      {/* ── Users table ──────────────────────────────────── */}
      {!loading && !error && mainTab === 'users' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>SUBMITTED</th>
                <th>STATUS</th>
                <th>APPROVED BY</th>
                <th>APPROVED DATE</th>
                <th>REJECTED BY</th>
                <th>REJECTED DATE</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No records found
                  </td>
                </tr>
              ) : (
                currentUsers.map((u, i) => (
                  <tr key={u.profile_id}>
                    <td>
                      <span className="chip">U{String(i + 1).padStart(3, '0')}</span>
                    </td>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar-sm">
                          {(u.first_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        {displayName(u)}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{fmt(u.submitted_at)}</td>
                    <td>
                      <span className={`badge badge-${u.status === 'approved' ? 'approved' : u.status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {isPending(u.status) ? 'pending' : u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.status === 'approved' ? (u.reviewed_by_name || 'Admin') : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {u.status === 'approved' ? fmt(u.reviewed_at) : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.status === 'rejected' ? (u.reviewed_by_name || 'Admin') : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {u.status === 'rejected' ? fmt(u.reviewed_at) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sangha table ─────────────────────────────────── */}
      {!loading && !error && mainTab === 'sangha' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>SANGHA NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>LOCATION</th>
                <th>STATE</th>
                <th>SUBMITTED</th>
                <th>STATUS</th>
                <th>APPROVED DATE</th>
                <th>REJECTED DATE</th>
              </tr>
            </thead>
            <tbody>
              {currentSangha.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No records found
                  </td>
                </tr>
              ) : (
                currentSangha.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <span className="chip">S{String(i + 1).padStart(3, '0')}</span>
                    </td>
                    <td>
                      <div className="avatar-cell">
                        <div className="avatar-sm avatar-purple">
                          {(s.sangha_name || '?')[0].toUpperCase()}
                        </div>
                        {s.sangha_name}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.email || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.location || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.state || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{fmt(s.submitted_at)}</td>
                    <td>
                      <span className={`badge badge-${s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {s.status === 'pending_approval' ? 'pending' : s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {s.status === 'approved' ? fmt(s.reviewed_at) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {s.status === 'rejected' ? fmt(s.reviewed_at) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
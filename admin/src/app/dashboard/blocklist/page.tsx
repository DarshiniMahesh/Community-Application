'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  sangha_name: string;
  is_blocked: boolean;
  created_at?: string;
  profile_status?: string;
}

interface SanghaRow {
  id: string;
  sangha_auth_id: string;
  sangha_name: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  is_blocked: boolean;
  created_at?: string;
}

type ActiveTab = 'users' | 'sangha';
type Notif = { message: string; type: 'success' | 'error' };

// ─── Helpers ───────────────────────────────────────────────────────────────────
const shortId = (id: string) => id?.slice(0, 8).toUpperCase() ?? '—';

const toBool = (val: unknown): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  if (typeof val === 'number') return val === 1;
  return false;
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BlocklistPage() {
  const [tab, setTab] = useState<ActiveTab>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sanghas, setSanghas] = useState<SanghaRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notif, setNotif] = useState<Notif | null>(null);

  const notify = (message: string, type: 'success' | 'error') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 3500);
  };

  // ── Fetch functions (separate for selective refetch) ─────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/blocklist/users/all');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      notify('Failed to load users', 'error');
    }
  }, []);

  const fetchSanghas = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/blocklist/sanghas/all');
      setSanghas(Array.isArray(data) ? data : []);
    } catch {
      notify('Failed to load sanghas', 'error');
    }
  }, []);

  // Load all on mount
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchUsers(), fetchSanghas()]);
    setLoading(false);
  }, [fetchUsers, fetchSanghas]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── User actions ─────────────────────────────────────────────────────────────
  const handleBlockUser = async (userId: string) => {
    if (!confirm('Block this user? They will not be able to login until unblocked.')) return;
    setActionLoading(userId + '-block');
    try {
      await api.post('/api/admin/users/block', { userId });
      notify('User blocked successfully', 'success');
      // REFETCH to get latest state from database
      await fetchUsers();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to block user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!confirm('Unblock this user? They will be able to login again.')) return;
    setActionLoading(userId + '-unblock');
    try {
      await api.post('/api/admin/users/unblock', { userId });
      notify('User unblocked successfully', 'success');
      // REFETCH to get latest state from database
      await fetchUsers();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to unblock user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    setActionLoading(userId + '-del');
    try {
      // Using POST instead of DELETE to reliably send body
      await api.post('/api/admin/users/delete', { userId });
      notify('User deleted permanently', 'success');
      // REFETCH to get latest state from database
      await fetchUsers();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Sangha actions ───────────────────────────────────────────────────────────
  const handleBlockSangha = async (sanghaId: string) => {
    if (!confirm('Block this sangha? Their account and all access will be suspended.')) return;
    setActionLoading(sanghaId + '-block');
    try {
      await api.post('/api/admin/sangha/block', { sanghaId });
      notify('Sangha blocked successfully', 'success');
      // REFETCH to get latest state from database
      await fetchSanghas();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to block sangha', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockSangha = async (sanghaId: string) => {
    if (!confirm('Unblock this sangha? Their account will be restored.')) return;
    setActionLoading(sanghaId + '-unblock');
    try {
      await api.post('/api/admin/sangha/unblock', { sanghaId });
      notify('Sangha unblocked successfully', 'success');
      // REFETCH to get latest state from database
      await fetchSanghas();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to unblock sangha', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSangha = async (sanghaId: string) => {
    if (!confirm('Permanently delete this sangha and their account? This cannot be undone.')) return;
    setActionLoading(sanghaId + '-del');
    try {
      // Using POST instead of DELETE to reliably send body
      await api.post('/api/admin/sangha/delete', { sanghaId });
      notify('Sangha deleted permanently', 'success');
      // REFETCH to get latest state from database
      await fetchSanghas();
    } catch (e: any) {
      notify(e?.response?.data?.message || e.message || 'Failed to delete sangha', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Frontend search filter ───────────────────────────────────────────────────
  const q = search.toLowerCase().trim();

  const filteredUsers = users.filter(u => {
    if (!q) return true;
    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q) ||
      (u.id ?? '').toLowerCase().includes(q) ||
      (u.sangha_name ?? '').toLowerCase().includes(q)
    );
  });

  const filteredSanghas = sanghas.filter(s => {
    if (!q) return true;
    return (
      (s.sangha_name ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').includes(q) ||
      (s.location ?? '').toLowerCase().includes(q) ||
      (s.id ?? '').toLowerCase().includes(q)
    );
  });

  const getFullName = (u: UserRow) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return name || null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Notification ── */}
      {notif && (
        <div style={{
          marginBottom: 20, padding: '10px 16px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: notif.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: notif.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${notif.type === 'success' ? '#86efac' : '#fca5a5'}`,
        }}>
          <span>{notif.message}</span>
          <button
            onClick={() => setNotif(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, opacity: 0.5 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Page Title ── */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
        Block
      </h1>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['users', 'sangha'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            style={{
              padding: '7px 22px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === t ? 'none' : '1px solid #e5e7eb',
              background: tab === t ? '#f97316' : '#fff',
              color: tab === t ? '#fff' : '#6b7280',
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}
          >
            {t === 'users' ? 'Users' : 'Sangha'}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 16, position: 'relative', width: 260 }}>
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '8px 32px 8px 12px',
            border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', color: '#374151',
            background: '#fff', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#f97316')}
          onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, color: '#9ca3af', lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>
          <div style={{
            width: 20, height: 20, border: '2px solid #f97316',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          Loading...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ══ USERS TABLE ══ */}
      {!loading && tab === 'users' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['ID', 'NAME', 'EMAIL', 'PHONE', 'ACTIONS'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 13 }}>
                    {q ? `No users match "${search}"` : 'No approved users found'}
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const blocked = toBool(user.is_blocked);
                const isActionLoading = !!actionLoading;
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      opacity: blocked ? 0.8 : 1,
                      background: blocked ? '#fffbfb' : '#fff',
                    }}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        color: '#6b7280', letterSpacing: '0.02em',
                      }}>
                        {shortId(user.id)}
                      </span>
                    </td>

                    <td style={{ padding: '11px 16px', fontWeight: 500, color: '#111827' }}>
                      {getFullName(user) ?? (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontWeight: 400 }}>No name</span>
                      )}
                    </td>

                    <td style={{ padding: '11px 16px', color: '#6b7280' }}>
                      {user.email || '—'}
                    </td>

                    <td style={{ padding: '11px 16px', color: '#6b7280' }}>
                      {user.phone || '—'}
                    </td>

                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {blocked ? (
                          <button
                            onClick={() => handleUnblockUser(user.id)}
                            disabled={isActionLoading}
                            style={btnStyle('dark', isActionLoading)}
                          >
                            {actionLoading === user.id + '-unblock' ? '...' : 'Unblock'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user.id)}
                            disabled={isActionLoading}
                            style={btnStyle('orange', isActionLoading)}
                          >
                            {actionLoading === user.id + '-block' ? '...' : 'Block'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isActionLoading}
                          style={btnStyle('red', isActionLoading)}
                        >
                          {actionLoading === user.id + '-del' ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ SANGHA TABLE ══ */}
      {!loading && tab === 'sangha' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['ID', 'NAME', 'EMAIL', 'PHONE', 'ACTIONS'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSanghas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 13 }}>
                    {q ? `No sanghas match "${search}"` : 'No approved sanghas found'}
                  </td>
                </tr>
              ) : filteredSanghas.map(sangha => {
                const blocked = toBool(sangha.is_blocked);
                const isActionLoading = !!actionLoading;
                return (
                  <tr
                    key={sangha.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      opacity: blocked ? 0.8 : 1,
                      background: blocked ? '#fffbfb' : '#fff',
                    }}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        color: '#6b7280', letterSpacing: '0.02em',
                      }}>
                        {shortId(sangha.id)}
                      </span>
                    </td>

                    <td style={{ padding: '11px 16px', fontWeight: 500, color: '#111827' }}>
                      {sangha.sangha_name || '—'}
                    </td>

                    <td style={{ padding: '11px 16px', color: '#6b7280' }}>
                      {sangha.email || '—'}
                    </td>

                    <td style={{ padding: '11px 16px', color: '#6b7280' }}>
                      {sangha.phone || '—'}
                    </td>

                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {blocked ? (
                          <button
                            onClick={() => handleUnblockSangha(sangha.id)}
                            disabled={isActionLoading}
                            style={btnStyle('dark', isActionLoading)}
                          >
                            {actionLoading === sangha.id + '-unblock' ? '...' : 'Unblock'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockSangha(sangha.id)}
                            disabled={isActionLoading}
                            style={btnStyle('orange', isActionLoading)}
                          >
                            {actionLoading === sangha.id + '-block' ? '...' : 'Block'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSangha(sangha.id)}
                          disabled={isActionLoading}
                          style={btnStyle('red', isActionLoading)}
                        >
                          {actionLoading === sangha.id + '-del' ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Button style helper ────────────────────────────────────────────────────────
function btnStyle(variant: 'orange' | 'dark' | 'red' | 'green', disabled: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '5px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity .15s',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };

  const variants: Record<string, React.CSSProperties> = {
    orange: { background: '#f97316', color: '#fff' },
    dark: { background: '#374151', color: '#fff' },
    red: { background: '#ef4444', color: '#fff' },
    green: { background: '#22c55e', color: '#fff' },
  };

  return { ...base, ...variants[variant] };
}
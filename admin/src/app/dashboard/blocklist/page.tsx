'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface UserRow {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  sangha_name: string;
  is_blocked: boolean;
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
}

type Notif = { message: string; type: 'success' | 'error' };

export default function BlocklistPage() {
  const [tab, setTab]                     = useState<'users' | 'sangha'>('users');
  const [users, setUsers]                 = useState<UserRow[]>([]);
  const [sanghas, setSanghas]             = useState<SanghaRow[]>([]);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notif, setNotif]                 = useState<Notif | null>(null);

  const notify = (message: string, type: 'success' | 'error') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 3500);
  };

  // Load ALL on mount — frontend search filter
  const fetchAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      api.get('/api/admin/blocklist/users').then(data => {
        setUsers(Array.isArray(data) ? data : []);
      }).catch(() => notify('Failed to load users', 'error')),
      api.get('/api/admin/blocklist/sanghas').then(data => {
        setSanghas(Array.isArray(data) ? data : []);
      }).catch(() => notify('Failed to load sanghas', 'error')),
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── User actions ──────────────────────────────────────────
  const handleBlockUser = async (userId: string) => {
    if (!confirm('Block this user? They will not be able to login until unblocked by admin.')) return;
    setActionLoading(userId + '-block');
    try {
      await api.post('/api/admin/users/block', { userId });
      notify('User blocked successfully', 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true } : u));
    } catch (e: any) {
      notify(e.message || 'Failed to block user', 'error');
    } finally { setActionLoading(null); }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!confirm('Unblock this user? They will be able to login again.')) return;
    setActionLoading(userId + '-unblock');
    try {
      await api.post('/api/admin/users/unblock', { userId });
      notify('User unblocked successfully', 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: false } : u));
    } catch (e: any) {
      notify(e.message || 'Failed to unblock user', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    setActionLoading(userId + '-del');
    try {
      await api.delete('/api/admin/users/delete', { userId });
      notify('User deleted permanently', 'success');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e: any) {
      notify(e.message || 'Failed to delete user', 'error');
    } finally { setActionLoading(null); }
  };

  // ── Sangha actions ────────────────────────────────────────
  const handleBlockSangha = async (sanghaId: string) => {
    if (!confirm('Block this sangha? Their account and all access will be suspended.')) return;
    setActionLoading(sanghaId + '-block');
    try {
      await api.post('/api/admin/sangha/block', { sanghaId });
      notify('Sangha blocked successfully', 'success');
      setSanghas(prev => prev.map(s => s.id === sanghaId ? { ...s, is_blocked: true } : s));
    } catch (e: any) {
      notify(e.message || 'Failed to block sangha', 'error');
    } finally { setActionLoading(null); }
  };

  const handleUnblockSangha = async (sanghaId: string) => {
    if (!confirm('Unblock this sangha? Their account will be restored.')) return;
    setActionLoading(sanghaId + '-unblock');
    try {
      await api.post('/api/admin/sangha/unblock', { sanghaId });
      notify('Sangha unblocked successfully', 'success');
      setSanghas(prev => prev.map(s => s.id === sanghaId ? { ...s, is_blocked: false } : s));
    } catch (e: any) {
      notify(e.message || 'Failed to unblock sangha', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDeleteSangha = async (sanghaId: string) => {
    if (!confirm('Permanently delete this sangha and their account? This cannot be undone.')) return;
    setActionLoading(sanghaId + '-del');
    try {
      await api.delete('/api/admin/sangha/delete', { sanghaId });
      notify('Sangha deleted permanently', 'success');
      setSanghas(prev => prev.filter(s => s.id !== sanghaId));
    } catch (e: any) {
      notify(e.message || 'Failed to delete sangha', 'error');
    } finally { setActionLoading(null); }
  };

  // ── Frontend filter ───────────────────────────────────────
  const q = search.toLowerCase();
  const filteredUsers = users.filter(u =>
    !q ||
    u.email?.toLowerCase().includes(q) ||
    u.phone?.includes(q) ||
    u.first_name?.toLowerCase().includes(q) ||
    u.last_name?.toLowerCase().includes(q) ||
    u.sangha_name?.toLowerCase().includes(q)
  );

  const filteredSanghas = sanghas.filter(s =>
    !q ||
    s.sangha_name?.toLowerCase().includes(q) ||
    s.email?.toLowerCase().includes(q) ||
    s.phone?.includes(q) ||
    s.location?.toLowerCase().includes(q)
  );

  const getFullName = (u: UserRow) =>
    (u.first_name || u.last_name) ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : null;

  const userActiveCount   = users.filter(u => !u.is_blocked).length;
  const userBlockedCount  = users.filter(u => u.is_blocked).length;
  const sanghaActiveCount  = sanghas.filter(s => !s.is_blocked).length;
  const sanghaBlockedCount = sanghas.filter(s => s.is_blocked).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Block Management</h1>
        <p className="text-sm text-gray-500">
          Manage access for approved users and sanghas. Only admin can unblock or delete.
        </p>
      </div>

      {/* Notification */}
      {notif && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between border ${
          notif.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span>{notif.message}</span>
          <button onClick={() => setNotif(null)} className="ml-4 text-lg leading-none opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* Tabs + Stats */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {(['users', 'sangha'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'users' ? 'Users' : 'Sangha'}
            {!loading && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {t === 'users' ? users.length : sanghas.length}
              </span>
            )}
          </button>
        ))}

        {/* Inline stats */}
        {!loading && tab === 'users' && users.length > 0 && (
          <div className="flex gap-2 ml-2">
            <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full font-medium">
              {userActiveCount} Active
            </span>
            <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full font-medium">
              {userBlockedCount} Blocked
            </span>
          </div>
        )}
        {!loading && tab === 'sangha' && sanghas.length > 0 && (
          <div className="flex gap-2 ml-2">
            <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full font-medium">
              {sanghaActiveCount} Active
            </span>
            <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-full font-medium">
              {sanghaBlockedCount} Blocked
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5 w-80">
        <input
          type="text"
          placeholder={tab === 'users' ? 'Search by name, email or phone...' : 'Search by name, email or location...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >×</button>
        )}
      </div>

      {/* Loading state — plain CSS, NO SVG icons */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm py-16 justify-center">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}

      {/* ── Users Table ── */}
      {!loading && tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sangha</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      {search ? `No users match "${search}"` : 'No approved users found'}
                    </td>
                  </tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.is_blocked ? 'opacity-75' : ''}`}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {getFullName(user) ?? <span className="text-gray-400 italic font-normal">No name</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{user.email || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{user.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{user.sangha_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.is_blocked ? 'bg-red-500' : 'bg-green-500'}`} />
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {user.is_blocked ? (
                          <button
                            onClick={() => handleUnblockUser(user.id)}
                            disabled={actionLoading === user.id + '-unblock'}
                            className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === user.id + '-unblock' ? '...' : 'Unblock'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockUser(user.id)}
                            disabled={actionLoading === user.id + '-block'}
                            className="px-3 py-1.5 text-xs rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === user.id + '-block' ? '...' : 'Block'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === user.id + '-del' ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sangha Table ── */}
      {!loading && tab === 'sangha' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sangha Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSanghas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      {search ? `No sanghas match "${search}"` : 'No approved sanghas found'}
                    </td>
                  </tr>
                ) : filteredSanghas.map(sangha => (
                  <tr key={sangha.id} className={`hover:bg-gray-50 transition-colors ${sangha.is_blocked ? 'opacity-75' : ''}`}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{sangha.sangha_name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{sangha.email || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{sangha.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{sangha.location || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sangha.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sangha.is_blocked ? 'bg-red-500' : 'bg-green-500'}`} />
                        {sangha.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {sangha.is_blocked ? (
                          <button
                            onClick={() => handleUnblockSangha(sangha.id)}
                            disabled={actionLoading === sangha.id + '-unblock'}
                            className="px-3 py-1.5 text-xs rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === sangha.id + '-unblock' ? '...' : 'Unblock'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockSangha(sangha.id)}
                            disabled={actionLoading === sangha.id + '-block'}
                            className="px-3 py-1.5 text-xs rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === sangha.id + '-block' ? '...' : 'Block'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSangha(sangha.id)}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === sangha.id + '-del' ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

interface UserRow {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  is_blocked: boolean;
}

export default function SanghaBlockPage() {
  const [allUsers, setAllUsers]           = useState<UserRow[]>([]);
  const [searchInput, setSearchInput]     = useState('');
  const [showDropdown, setShowDropdown]   = useState(false);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notif, setNotif]                 = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const notify = (message: string, type: 'success' | 'error') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 3500);
  };

  // Load ALL approved members once on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await api.get('/sangha/members');
        const list = Array.isArray(data) ? data : [];
        setAllUsers(list.map((u: any) => ({
          id:         u.id,
          email:      u.email || '',
          phone:      u.phone || '',
          first_name: u.first_name || '',
          last_name:  u.last_name || '',
          is_blocked: u.is_blocked ?? false,
        })));
      } catch {
        notify('Failed to load members', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFullName = (u: UserRow) =>
    (u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}`.trim() : null;

  const handleBlock = async (userId: string) => {
    if (!confirm('Block this user? They will not be able to login. Only admin can unblock them.')) return;
    setActionLoading(userId);
    try {
      await api.post('/api/sangha/block-user', { userId });
      notify('User blocked. They must contact admin to unblock.', 'success');
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true } : u));
    } catch (e: any) {
      notify(e.message || 'Failed to block user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Frontend filter — no extra API calls needed
  const q = searchInput.trim().toLowerCase();
  const filtered = q
    ? allUsers.filter(u =>
        getFullName(u)?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    : allUsers;

  // Dropdown: top 6 suggestions
  const suggestions = q ? filtered.slice(0, 6) : [];

  const activeCount  = allUsers.filter(u => !u.is_blocked).length;
  const blockedCount = allUsers.filter(u => u.is_blocked).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Block Members</h1>
        <p className="text-sm text-gray-500">
          Blocked members cannot login. Only admin can unblock them.
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

      {/* Stats strip */}
      {!loading && allUsers.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm">
            <span className="font-semibold text-gray-700">{allUsers.length}</span>
            <span className="text-gray-500 ml-1">Total Members</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
            <span className="font-semibold text-green-700">{activeCount}</span>
            <span className="text-green-600 ml-1">Active</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
            <span className="font-semibold text-red-700">{blockedCount}</span>
            <span className="text-red-600 ml-1">Blocked</span>
          </div>
        </div>
      )}

      {/* Search with dropdown */}
      <div className="relative mb-5 w-96" ref={searchRef}>
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setShowDropdown(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >×</button>
        )}

        {/* Dropdown suggestions */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(u => (
              <div
                key={u.id}
                onClick={() => {
                  setSearchInput(getFullName(u) || u.email || u.phone);
                  setShowDropdown(false);
                }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {getFullName(u) ?? <span className="italic text-gray-400">No name</span>}
                  </p>
                  <p className="text-xs text-gray-500">{u.email || u.phone || '—'}</p>
                </div>
                {u.is_blocked && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Blocked</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm py-16 justify-center">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          Loading members...
        </div>
      )}

      {/* Empty state */}
      {!loading && allUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium text-sm">No approved members yet</p>
          <p className="text-gray-400 text-xs mt-1">Members will appear here once their profiles are approved</p>
        </div>
      )}

      {/* No search results */}
      {!loading && allUsers.length > 0 && filtered.length === 0 && q && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 text-sm font-medium">No members found for "{searchInput}"</p>
          <p className="text-gray-400 text-xs mt-1">Try a different name, email or phone number</p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {q && (
            <div className="px-5 py-2.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-700 font-medium">
              Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchInput}"
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.is_blocked ? 'opacity-70' : ''}`}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {getFullName(user) ?? <span className="text-gray-400 italic font-normal">No name</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{user.email || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{user.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      {user.is_blocked ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.is_blocked ? (
                        <span className="text-xs text-gray-400 italic">Contact admin to unblock</span>
                      ) : (
                        <button
                          onClick={() => handleBlock(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 text-xs rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === user.id ? '...' : 'Block'}
                        </button>
                      )}
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
'use client';
import { useState } from 'react';
import {
  BLOCKED_USERS,
  DELETED_USERS,
  BLOCKED_SANGHA,
  DELETED_SANGHA,
  USERS,
  SANGHA_LIST,
  USER_DISPLAY_NAMES,
  SANGHA_DISPLAY_NAMES
} from '@/data/mockData';

export default function RetrievePage() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'users' | 'sangha'>('users');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [blockedUsers, setBlockedUsers] = useState([...BLOCKED_USERS]);
  const [deletedUsers, setDeletedUsers] = useState([...DELETED_USERS]);
  const [blockedSangha, setBlockedSangha] = useState([...BLOCKED_SANGHA]);
  const [deletedSangha, setDeletedSangha] = useState([...DELETED_SANGHA]);

  const retrieveUser = (u: any, type: 'blocked' | 'deleted') => {
    USERS.push(u);

    if (type === 'blocked') {
      setBlockedUsers(prev => prev.filter(x => x.id !== u.id));
      BLOCKED_USERS.splice(BLOCKED_USERS.findIndex(x => x.id === u.id), 1);
    } else {
      setDeletedUsers(prev => prev.filter(x => x.id !== u.id));
      DELETED_USERS.splice(DELETED_USERS.findIndex(x => x.id === u.id), 1);
    }
  };

  const retrieveSangha = (s: any, type: 'blocked' | 'deleted') => {
    SANGHA_LIST.push(s);

    if (type === 'blocked') {
      setBlockedSangha(prev => prev.filter(x => x.id !== s.id));
      BLOCKED_SANGHA.splice(BLOCKED_SANGHA.findIndex(x => x.id === s.id), 1);
    } else {
      setDeletedSangha(prev => prev.filter(x => x.id !== s.id));
      DELETED_SANGHA.splice(DELETED_SANGHA.findIndex(x => x.id === s.id), 1);
    }
  };

  // Helper to filter lists based on search query
  const filterList = (list: any[], displayMap: Record<string, string>) => {
    if (!searchQuery.trim()) return list;
    
    return list.filter(item => {
      const name = displayMap[item.id] || item.name;
      return (
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };

  // Filtered Data
  const filteredBlockedUsers = filterList(blockedUsers, USER_DISPLAY_NAMES);
  const filteredDeletedUsers = filterList(deletedUsers, USER_DISPLAY_NAMES);
  const filteredBlockedSangha = filterList(blockedSangha, SANGHA_DISPLAY_NAMES);
  const filteredDeletedSangha = filterList(deletedSangha, SANGHA_DISPLAY_NAMES);

  // Styles
  const tabActiveStyle = {
    background: 'var(--orange)',
    color: '#fff',
    borderColor: 'var(--orange)'
  };

  const tabInactiveStyle = {
    background: 'transparent',
    color: '#555',
    borderColor: '#ddd'
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Retrieve</h1>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 20px',
            border: '1px solid',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            ...(activeTab === 'users' ? tabActiveStyle : tabInactiveStyle)
          }}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('sangha')}
          style={{
            padding: '10px 20px',
            border: '1px solid',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            ...(activeTab === 'sangha' ? tabActiveStyle : tabInactiveStyle)
          }}
        >
          Sangha
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={`Search ${activeTab === 'users' ? 'Users' : 'Sangha'} by ID or Name...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 15px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Users Content */}
      {activeTab === 'users' && (
        <>
          <h3>Blocked Users</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlockedUsers.length > 0 ? (
                  filteredBlockedUsers.map(u => (
                    <tr key={u.id}>
                      <td><span className="chip">{u.id}</span></td>
                      <td>{USER_DISPLAY_NAMES[u.id] || u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>
                        <button style={{ background:'var(--orange)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}
                          onClick={() => retrieveUser(u, 'blocked')}>
                          Retrieve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop:30 }}>Deleted Users</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeletedUsers.length > 0 ? (
                  filteredDeletedUsers.map(u => (
                    <tr key={u.id}>
                      <td><span className="chip">{u.id}</span></td>
                      <td>{USER_DISPLAY_NAMES[u.id] || u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone}</td>
                      <td>
                        <button style={{ background:'var(--orange)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}
                          onClick={() => retrieveUser(u, 'deleted')}>
                          Retrieve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Sangha Content */}
      {activeTab === 'sangha' && (
        <>
          <h3>Blocked Sangha</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlockedSangha.length > 0 ? (
                  filteredBlockedSangha.map(s => (
                    <tr key={s.id}>
                      <td><span className="chip">{s.id}</span></td>
                      <td>{SANGHA_DISPLAY_NAMES[s.id] || s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.phone}</td>
                      <td>
                        <button style={{ background:'var(--orange)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}
                          onClick={() => retrieveSangha(s, 'blocked')}>
                          Retrieve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop:30 }}>Deleted Sangha</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeletedSangha.length > 0 ? (
                  filteredDeletedSangha.map(s => (
                    <tr key={s.id}>
                      <td><span className="chip">{s.id}</span></td>
                      <td>{SANGHA_DISPLAY_NAMES[s.id] || s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.phone}</td>
                      <td>
                        <button style={{ background:'var(--orange)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}
                          onClick={() => retrieveSangha(s, 'deleted')}>
                          Retrieve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
'use client';
import { useState } from 'react';
import { SANGHA_LIST, Sangha } from '@/data/mockData';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

export default function SanghaPage() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Sangha | null>(null);

  const list = SANGHA_LIST.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
  );

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
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Approved Date</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id}>
                <td><span className="chip">{s.id}</span></td>
                <td><div className="avatar-cell"><div className="avatar-sm avatar-purple">{s.name[0]}</div>{s.name}</div></td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.email}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.phone}</td>
                <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.joined}</td>
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
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No Sangha found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal open title={`Sangha Info — ${modal.id}`} onClose={() => setModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>}>
          {([['ID', modal.id], ['Name', modal.name], ['Email', modal.email], ['Phone', modal.phone], ['Approved Date', modal.joined]] as [string, string][]).map(([k, v]) => (
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
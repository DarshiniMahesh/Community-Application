'use client';
import { useState } from 'react';
import { SANGHA_LIST, Sangha } from '@/data/mockData';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

export default function SanghaPage() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Sangha | null>(null);
  const [editModal, setEditModal] = useState<Sangha | null>(null);

  const list = SANGHA_LIST.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.includes(search)
  );

  const handleSaveEdit = (updated: Sangha) => {
    console.log("Updated:", updated);
  };

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-header">
        <h1 style={{ color: '#f97316' }}>Sangha Management</h1>
      </div>

      {/* COUNT */}
      <div className="total-chip">
        <div className="total-chip-val" style={{ color: '#f97316' }}>
          {SANGHA_LIST.length}
        </div>
        <div className="total-chip-label">Total Sangha</div>
      </div>

      {/* SEARCH */}
      <div className="action-bar">
        <div className="search-box">
          <span>{IC.search}</span>
          <input
            placeholder="Search Sangha..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {list.map(s => (
              <tr key={s.id}>
                <td><span className="chip">{s.id}</span></td>

                <td>
                  <div className="avatar-cell">
                    <div className="avatar-sm" style={{ background: '#f97316', color: '#fff' }}>
                      {s.name[0]}
                    </div>
                    {s.name}
                  </div>
                </td>

                <td>{s.email}</td>
                <td>{s.phone}</td>
                <td>{s.joined}</td>

                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn" onClick={() => setModal(s)}>
                      {IC.eye}
                    </button>

                    <button className="icon-btn" onClick={() => setEditModal(s)}>
                      {IC.edit}
                    </button>

                    <button className="icon-btn">
                      {IC.download}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                  No Sangha found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {modal && (
        <Modal
          open
          title={`Sangha Info — ${modal.id}`}
          onClose={() => setModal(null)}
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>}
        >
          {([
            ['Name', modal.name],
            ['Email', modal.email],
            ['Phone', modal.phone],
            ['Joined', modal.joined],

            ['Building', modal.addressLine1],
            ['Street', modal.addressLine2],
            ['Landmark', modal.addressLine3],
            ['Taluk', modal.taluk],
            ['Floor', modal.floorNumber],
            ['City', modal.city],
            ['State', modal.state],
            ['Pincode', modal.pincode],

            ['Office Phone', modal.officePhone],
            ['Office Email', modal.officeEmail],

            ['Description', modal.description],

            ['Status', modal.status],
            ['Approved Date', modal.approvedDate],
            ['Rejected Date', modal.rejectedDate],
          ] as [string, any][])
            .filter(([_, v]) => v)
            .map(([k, v]) => (
              <div className="info-row" key={k}>
                <span className="info-key">{k}</span>
                <span className="info-val">{v}</span>
              </div>
            ))}
        </Modal>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editModal && (
        <Modal
          open
          title={`Edit Sangha — ${editModal.id}`}
          onClose={() => setEditModal(null)}
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#f97316', color: '#fff' }}
                onClick={() => {
                  handleSaveEdit(editModal);
                  setEditModal(null);
                }}
              >
                Save
              </button>
            </div>
          }
        >
          <div className="grid" style={{ gap: 10 }}>

            <input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} placeholder="Name" />
            <input value={editModal.email} onChange={e => setEditModal({ ...editModal, email: e.target.value })} placeholder="Email" />
            <input value={editModal.phone} onChange={e => setEditModal({ ...editModal, phone: e.target.value })} placeholder="Phone" />

            <input value={editModal.addressLine1 || ''} onChange={e => setEditModal({ ...editModal, addressLine1: e.target.value })} placeholder="Building" />
            <input value={editModal.addressLine2 || ''} onChange={e => setEditModal({ ...editModal, addressLine2: e.target.value })} placeholder="Street" />
            <input value={editModal.city || ''} onChange={e => setEditModal({ ...editModal, city: e.target.value })} placeholder="City" />
            <input value={editModal.state || ''} onChange={e => setEditModal({ ...editModal, state: e.target.value })} placeholder="State" />
            <input value={editModal.pincode || ''} onChange={e => setEditModal({ ...editModal, pincode: e.target.value })} placeholder="Pincode" />

            <input value={editModal.officePhone || ''} onChange={e => setEditModal({ ...editModal, officePhone: e.target.value })} placeholder="Office Phone" />
            <input value={editModal.officeEmail || ''} onChange={e => setEditModal({ ...editModal, officeEmail: e.target.value })} placeholder="Office Email" />

            <textarea value={editModal.description || ''} onChange={e => setEditModal({ ...editModal, description: e.target.value })} placeholder="Description" />

            <select
              value={editModal.status}
              onChange={e => setEditModal({ ...editModal, status: e.target.value as any })}
            >
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>

          </div>
        </Modal>
      )}
    </div>
  );
}
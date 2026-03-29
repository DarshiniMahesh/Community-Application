'use client';
import './user.css';
import { useState } from 'react';
import { USERS, User } from '@/data/mockData';
import Modal from '@/components/Modal';

type EditTab =
  | 'personal'
  | 'religious'
  | 'family'
  | 'location'
  | 'education'
  | 'professional'
  | 'economic'
  | 'review';

const TABS = [
  { id: 'personal',     label: 'Personal'     },
  { id: 'religious',    label: 'Religious'    },
  { id: 'family',       label: 'Family'       },
  { id: 'location',     label: 'Location'     },
  { id: 'education',    label: 'Education'    },
  { id: 'professional', label: 'Professional' },
  { id: 'economic',     label: 'Economic'     },
  { id: 'review',       label: 'Review'       },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FamilyMember = { [key: string]: string; name: string; age: string; gender: string; status: string };
type Address      = { [key: string]: string; flatNo: string; buildingName: string; streetName: string; area: string; city: string; state: string; pincode: string };

interface EditForm {
  // Personal
  name: string;
  fathersName: string;
  mothersName: string;
  mothersMaidenName: string;
  spouseName: string;
  wifesMaidenName: string;
  surnameInUse: string;
  surnameAsPerGotra: string;

  // Religious
  gotra: string;
  kuladevata: string;
  priestName: string;
  priestLocation: string;

  // Family
  familyType: string;
  familyMembersCount: string;
  familyMembers: Record<string, FamilyMember>;
  locations: Record<string, Address>;

  // Location
  currentCity: string;
  currentState: string;
  currentPincode: string;
  homeAddress: string;
  homeBuilding: string;
  homeStreet: string;
  homeCity: string;
  homeState: string;
  homePincode: string;

  // Education
  highestQualification: string;
  institution: string;

  // Professional
  occupation: string;
  employer: string;
  professionType: string;
  businessType: string;
  industry: string;

  // Economic
  income: string;
  assets: string;
  selfIncome: string;
  familyIncome: string;
  housing: string[];
  vehicles: string[];
  healthInsurance: boolean;
  healthInsuranceFor: string[];
  lifeInsurance: boolean;
  lifeInsuranceFor: string[];
  termInsurance: boolean;
  termInsuranceFor: string[];
  rationCard: boolean;
  rationCardFor: string[];
  aadhar: boolean;
  aadharFor: string[];
  pan: boolean;
  panFor: string[];
  allRecords: boolean;
  allRecordsFor: string[];
  investments: string[];
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const initForm = (u: User): EditForm => ({
  name: u.name,
  fathersName: '',
  mothersName: '',
  mothersMaidenName: '',
  spouseName: '',
  wifesMaidenName: '',
  surnameInUse: '',
  surnameAsPerGotra: '',

  gotra: '',
  kuladevata: '',
  priestName: '',
  priestLocation: '',

  familyType: '',
  familyMembersCount: String(u.family),
  familyMembers: {},
  locations: {},

  currentCity: u.state,
  currentState: u.state,
  currentPincode: '',
  homeAddress: '',
  homeBuilding: '',
  homeStreet: '',
  homeCity: '',
  homeState: '',
  homePincode: '',

  highestQualification: '',
  institution: '',

  occupation: '',
  employer: '',
  professionType: '',
  businessType: '',
  industry: '',

  income: String(u.income),
  assets: u.assets,
  selfIncome: '',
  familyIncome: '',
  housing: [],
  vehicles: [],
  healthInsurance: false,
  healthInsuranceFor: [],
  lifeInsurance: false,
  lifeInsuranceFor: [],
  termInsurance: false,
  termInsuranceFor: [],
  rationCard: false,
  rationCardFor: [],
  aadhar: false,
  aadharFor: [],
  pan: false,
  panFor: [],
  allRecords: false,
  allRecordsFor: [],
  investments: [],
});

// ─── Shared sub-components ────────────────────────────────────────────────────

const Section = ({ title }: { title: string }) => (
  <h3 style={{ color: '#f97316', borderBottom: '2px solid #fed7aa', paddingBottom: 4, marginTop: 16 }}>
    {title}
  </h3>
);

const Row = ({ label, value }: { label: string; value: any }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #fdba74' }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#fff7ed', color: '#7c2d12',
  border: '1px solid #fdba74', borderRadius: 4,
  padding: '5px 8px', outline: 'none', fontSize: '0.85rem',
};

const sectionHeadStyle: React.CSSProperties = {
  color: '#ea580c', marginBottom: '0.75rem',
  borderBottom: '2px solid #fed7aa', paddingBottom: '0.4rem',
};

const subLabelStyle: React.CSSProperties = {
  fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.8rem',
  color: '#c2410c', letterSpacing: '0.06em', textTransform: 'uppercase',
};

const saveBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #fb923c)',
  color: '#fff', border: 'none', borderRadius: 8,
  padding: '10px 28px', fontWeight: 700, fontSize: '0.95rem',
  cursor: 'pointer', alignSelf: 'flex-start',
  boxShadow: '0 4px 15px #fb923c55', marginTop: '1rem',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [modal,     setModal]     = useState<User | null>(null);
  const [editModal, setEditModal] = useState<User | null>(null);
  const [editTab,   setEditTab]   = useState<EditTab>('personal');
  const [editForm,  setEditForm]  = useState<EditForm>(initForm(USERS[0]));
  const [search,    setSearch]    = useState('');

  const openEdit = (u: User) => { setEditForm(initForm(u)); setEditModal(u); };

  const set = (k: keyof EditForm, v: unknown) =>
    setEditForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!editModal) return;
    const index = USERS.findIndex(u => u.id === editModal.id);
    if (index !== -1) {
      USERS[index] = {
        ...USERS[index],
        name:   editForm.name,
        state:  editForm.currentState,
        income: Number(editForm.income),
        assets: editForm.assets,
      };
    }
    alert('Saved successfully ✅');
  };

  const handleDownload = (user: User) => {
    const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${user.name}.json`;
    a.click();
  };

  const filteredUsers = USERS.filter(u =>
    u.id.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.toLowerCase().includes(search.toLowerCase())
  );

  const incomePills = ['Less than 1 Lakh','1-2 Lakh','2-3 Lakh','3-5 Lakh','5-10 Lakh','10-25 Lakh','25 Lakh+'];
  const whoOptions  = ['Self','Wife','Kids','Parents','All'];

  const pillStyle = (active: boolean, size: 'sm' | 'xs' = 'sm'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: active ? '#fed7aa' : '#fff7ed',
    border: `1px solid ${active ? '#f97316' : '#fdba74'}`,
    borderRadius: 20,
    padding: size === 'sm' ? '5px 14px' : '3px 10px',
    cursor: 'pointer',
    fontSize: size === 'sm' ? '0.85rem' : '0.78rem',
    color: '#7c2d12',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
  });

  const toggleArrayItem = (key: keyof EditForm, item: string) => {
    const prev = (editForm[key] as string[]) ?? [];
    set(key, prev.includes(item) ? prev.filter(v => v !== item) : [...prev, item]);
  };

  return (
    <div style={{ padding: 20 }}>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search by ID, Name, Email, Phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, padding: 10, width: '100%', border: '2px solid #f97316', borderRadius: 8 }}
      />

      {/* TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f97316', color: '#fff' }}>
            <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.phone}</td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(u)}>👁</button>
                <button onClick={() => openEdit(u)}>✏️</button>
                <button onClick={() => handleDownload(u)}>⬇️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════════════ VIEW MODAL ═══════════════ */}
      {modal && (
        <Modal open title={`User Profile — ${modal.name}`} onClose={() => setModal(null)}>
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 6 }}>
            <Section title="Personal Information" />
            <Row label="First Name"         value={modal?.name} />
            <Row label="Father Name"        value={modal?.fathersName} />
            <Row label="Mother Name"        value={modal?.mothersName} />
            <Row label="Mother Maiden Name" value={modal?.mothersMaidenName} />
            <Row label="Spouse Name"        value={modal?.spouseName} />
            <Row label="Spouse Maiden Name" value={modal?.wifesMaidenName} />
            <Row label="Surname (In Use)"   value={modal?.surnameInUse} />
            <Row label="Surname (Gotra)"    value={modal?.surnameAsPerGotra} />

            <Section title="Religious Details" />
            <Row label="Gotra"           value={modal?.gotra} />
            <Row label="Kul Dev"         value={modal?.kuladevata} />
            <Row label="Priest Name"     value={modal?.priestName} />
            <Row label="Priest Location" value={modal?.priestLocation} />

            <Section title="Education" />
            <Row label="Highest Qualification" value={modal?.highestQualification} />
            <Row label="Certifications"        value={modal?.institution} />

            <Section title="Languages" />
            <Row label="Spoken At Home" value={modal?.languages?.join(', ')} />

            <Section title="Professional" />
            <Row label="Profession Type" value={modal?.professionType} />
            <Row label="Business Type"   value={modal?.businessType} />
            <Row label="Industry"        value={modal?.industry} />
            <Row label="Occupation"      value={modal?.occupation} />
            <Row label="Employer"        value={modal?.employer} />

            <Section title="Current Address" />
            <Row label="City"    value={modal?.currentCity} />
            <Row label="State"   value={modal?.currentState} />
            <Row label="Pincode" value={modal?.currentPincode} />

            <Section title="Home Town" />
            <Row label="House"    value={modal?.homeAddress} />
            <Row label="Building" value={modal?.homeBuilding} />
            <Row label="Street"   value={modal?.homeStreet} />
            <Row label="City"     value={modal?.homeCity} />
            <Row label="State"    value={modal?.homeState} />
            <Row label="Pincode"  value={modal?.homePincode} />

            <Section title="Family" />
            <Row label="Members Count" value={modal?.familyMembersCount} />

            <Section title="Economical Information" />
            <Row label="Self Income"   value={modal?.selfIncome} />
            <Row label="Family Income" value={modal?.familyIncome} />

            <Section title="Family Facilities" />
            <Row label="Housing"  value={(modal as any)?.housing?.join(', ')} />
            <Row label="Vehicles" value={(modal as any)?.vehicles?.join(', ')} />

            <Section title="Insurance" />
            <Row label="Health Insurance" value={(modal as any)?.healthInsurance ? `Yes — ${(modal as any)?.healthInsuranceFor?.join(', ')}` : 'No'} />
            <Row label="Life Insurance"   value={(modal as any)?.lifeInsurance   ? `Yes — ${(modal as any)?.lifeInsuranceFor?.join(', ')}`   : 'No'} />
            <Row label="Term Insurance"   value={(modal as any)?.termInsurance   ? `Yes — ${(modal as any)?.termInsuranceFor?.join(', ')}`   : 'No'} />

            <Section title="Documents" />
            <Row label="Ration Card"           value={(modal as any)?.rationCard  ? `Yes — ${(modal as any)?.rationCardFor?.join(', ')}`  : 'No'} />
            <Row label="Aadhaar"               value={(modal as any)?.aadhar      ? `Yes — ${(modal as any)?.aadharFor?.join(', ')}`      : 'No'} />
            <Row label="PAN"                   value={(modal as any)?.pan         ? `Yes — ${(modal as any)?.panFor?.join(', ')}`         : 'No'} />
            <Row label="Property/Govt Records" value={(modal as any)?.allRecords  ? `Yes — ${(modal as any)?.allRecordsFor?.join(', ')}` : 'No'} />

            <Section title="Investments" />
            <Row label="Investment Types" value={(modal as any)?.investments?.join(', ')} />
          </div>
        </Modal>
      )}

      {/* ═══════════════ EDIT MODAL ═══════════════ */}
      {editModal && (
        <Modal open title="Edit User" onClose={() => setEditModal(null)}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setEditTab(t.id as EditTab)}
                style={{
                  background: editTab === t.id ? '#f97316' : '#fff',
                  color:      editTab === t.id ? '#fff'    : '#f97316',
                  border: '1px solid #f97316', padding: 6,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>

            {/* ══════════ PERSONAL ══════════ */}
            {editTab === 'personal' && (
              <div>
                <h3 style={{ color: '#f97316' }}>Personal Details</h3>
                <div className="grid">
                  <input value={editForm.name}              onChange={e => set('name',              e.target.value)} placeholder="First Name" />
                  <input value={editForm.fathersName}       onChange={e => set('fathersName',       e.target.value)} placeholder="Father Name" />
                  <input value={editForm.mothersName}       onChange={e => set('mothersName',       e.target.value)} placeholder="Mother Name" />
                  <input value={editForm.mothersMaidenName} onChange={e => set('mothersMaidenName', e.target.value)} placeholder="Mother Maiden Name" />
                  <input value={editForm.spouseName}        onChange={e => set('spouseName',        e.target.value)} placeholder="Spouse Name" />
                  <input value={editForm.wifesMaidenName}   onChange={e => set('wifesMaidenName',   e.target.value)} placeholder="Wife Maiden Name" />
                </div>
                <h3 style={{ color: '#f97316', marginTop: 16 }}>Surname & Lineage</h3>
                <div className="grid">
                  <input value={editForm.surnameInUse}      onChange={e => set('surnameInUse',      e.target.value)} placeholder="Surname (In Use)" />
                  <input value={editForm.surnameAsPerGotra} onChange={e => set('surnameAsPerGotra', e.target.value)} placeholder="Surname (Gotra)" />
                </div>
                <button className="saveBtn" onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ RELIGIOUS ══════════ */}
            {editTab === 'religious' && (
              <div>
                <h3 style={{ color: '#f97316' }}>Religious Details</h3>
                <div className="grid">
                  <input value={editForm.gotra}          onChange={e => set('gotra',          e.target.value)} placeholder="Gotra" />
                  <input value={editForm.kuladevata}     onChange={e => set('kuladevata',     e.target.value)} placeholder="Kul Dev" />
                  <input value={editForm.priestName}     onChange={e => set('priestName',     e.target.value)} placeholder="Priest Name" />
                  <input value={editForm.priestLocation} onChange={e => set('priestLocation', e.target.value)} placeholder="Priest Location" />
                </div>
                <button className="saveBtn" onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ FAMILY ══════════ */}
            {editTab === 'family' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ color: '#ea580c' }}>Family Information</h3>

                {/* Family Members table */}
                <section>
                  <h4 style={sectionHeadStyle}>Family Members</h4>
                  {([
                    { label: 'Siblings',              keys: Array.from({ length: 10 }, (_, i) => `sibling${i + 1}`) },
                    { label: 'Kids',                  keys: Array.from({ length: 4  }, (_, i) => `kid${i + 1}`) },
                    { label: 'Parents',               keys: ['father', 'mother'] },
                    { label: 'Paternal Grandparents', keys: ['grandFatherPaternal', 'grandMotherPaternal'] },
                    { label: 'Maternal Grandparents', keys: ['grandFatherMaternal', 'grandMotherMaternal'] },
                    { label: 'Paternal Side',         keys: ['unclePaternal', 'auntPaternal'] },
                    { label: 'Maternal Side',         keys: ['uncleMaternal', 'auntMaternal'] },
                  ] as { label: string; keys: string[] }[]).map(({ label, keys }) => (
                    <div key={label} style={{ marginBottom: '1.25rem' }}>
                      <p style={subLabelStyle}>{label}</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#ffedd5' }}>
                            {['Relation', 'Name', 'Age', 'Gender', 'Status'].map(h => (
                              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#9a3412' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((key, idx) => {
                            const member = editForm.familyMembers?.[key] ?? {} as FamilyMember;
                            const relLabel = key.replace(/([A-Z])/g, ' $1').replace(/(\d+)/, ' $1').trim();
                            return (
                              <tr key={key} style={{ borderBottom: '1px solid #fed7aa', background: idx % 2 === 0 ? '#ffffff' : '#fff7ed' }}>
                                <td style={{ padding: '5px 10px', color: '#c2410c', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                  {relLabel}
                                </td>
                                {(['name', 'age', 'gender', 'status'] as const).map(field => (
                                  <td key={field} style={{ padding: '4px 6px' }}>
                                    {field === 'gender' ? (
                                      <select
                                        value={member[field] ?? ''}
                                        onChange={e => set('familyMembers', { ...editForm.familyMembers, [key]: { ...member, [field]: e.target.value } })}
                                        style={inputStyle}
                                      >
                                        <option value=''>—</option>
                                        <option value='Male'>Male</option>
                                        <option value='Female'>Female</option>
                                        <option value='Other'>Other</option>
                                      </select>
                                    ) : field === 'status' ? (
                                      <select
                                        value={member[field] ?? ''}
                                        onChange={e => set('familyMembers', { ...editForm.familyMembers, [key]: { ...member, [field]: e.target.value } })}
                                        style={inputStyle}
                                      >
                                        <option value=''>—</option>
                                        <option value='Active'>Active</option>
                                        <option value='Dead'>Dead</option>
                                        <option value='Unknown'>Unknown</option>
                                      </select>
                                    ) : (
                                      <input
                                        type={field === 'age' ? 'number' : 'text'}
                                        value={member[field] ?? ''}
                                        onChange={e => set('familyMembers', { ...editForm.familyMembers, [key]: { ...member, [field]: e.target.value } })}
                                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                        style={inputStyle}
                                      />
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </section>

                {/* Location within family tab */}
                <section>
                  <h4 style={sectionHeadStyle}>Location Related</h4>
                  {([
                    { label: 'Current City', key: 'currentCity' },
                    { label: 'Home Town',    key: 'homeTown'    },
                    ...Array.from({ length: 4 }, (_, i) => ({ label: `Old Address ${i + 1}`, key: `oldAddress${i + 1}` })),
                  ] as { label: string; key: string }[]).map(({ label, key }) => {
                    const addr = editForm.locations?.[key] ?? {} as Address;
                    return (
                      <div key={key} style={{ marginBottom: '1.25rem', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 10, padding: '1rem' }}>
                        <p style={subLabelStyle}>{label}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          {([
                            { field: 'flatNo',       placeholder: 'Flat No / House No' },
                            { field: 'buildingName', placeholder: 'Building Name'      },
                            { field: 'streetName',   placeholder: 'Street Name'        },
                            { field: 'area',         placeholder: 'Area'               },
                            { field: 'city',         placeholder: 'City'               },
                            { field: 'state',        placeholder: 'State'              },
                            { field: 'pincode',      placeholder: 'Pincode'            },
                          ] as { field: string; placeholder: string }[]).map(({ field, placeholder }) => (
                            <input
                              key={field}
                              value={addr[field] ?? ''}
                              placeholder={placeholder}
                              onChange={e => set('locations', { ...editForm.locations, [key]: { ...addr, [field]: e.target.value } })}
                              style={{ background: '#ffffff', color: '#7c2d12', border: '1px solid #fdba74', borderRadius: 6, padding: '7px 10px', fontSize: '0.85rem', outline: 'none' }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>

                <button style={saveBtn} onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ LOCATION ══════════ */}
            {editTab === 'location' && (
              <div>
                <h3 style={{ color: '#f97316' }}>Current Address</h3>
                <div className="grid">
                  <input value={editForm.currentCity}    onChange={e => set('currentCity',    e.target.value)} placeholder="City" />
                  <input value={editForm.currentState}   onChange={e => set('currentState',   e.target.value)} placeholder="State" />
                  <input value={editForm.currentPincode} onChange={e => set('currentPincode', e.target.value)} placeholder="Pincode" />
                </div>
                <h3 style={{ color: '#f97316', marginTop: 16 }}>Home Town</h3>
                <div className="grid">
                  <input value={editForm.homeAddress}  onChange={e => set('homeAddress',  e.target.value)} placeholder="House / Flat No" />
                  <input value={editForm.homeBuilding}  onChange={e => set('homeBuilding',  e.target.value)} placeholder="Building Name" />
                  <input value={editForm.homeStreet}    onChange={e => set('homeStreet',    e.target.value)} placeholder="Street Name" />
                  <input value={editForm.homeCity}      onChange={e => set('homeCity',      e.target.value)} placeholder="City" />
                  <input value={editForm.homeState}     onChange={e => set('homeState',     e.target.value)} placeholder="State" />
                  <input value={editForm.homePincode}   onChange={e => set('homePincode',   e.target.value)} placeholder="Pincode" />
                </div>
                <button className="saveBtn" onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ EDUCATION ══════════ */}
            {editTab === 'education' && (
              <div>
                <h3 style={{ color: '#f97316' }}>Education</h3>
                <div className="grid">
                  <input value={editForm.highestQualification} onChange={e => set('highestQualification', e.target.value)} placeholder="Highest Education" />
                  <input value={editForm.institution}          onChange={e => set('institution',          e.target.value)} placeholder="Certifications" />
                </div>
                <button className="saveBtn" onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ PROFESSIONAL ══════════ */}
            {editTab === 'professional' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ color: '#ea580c' }}>Professional Information</h3>

                <section>
                  <h4 style={sectionHeadStyle}>Professional Details</h4>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Type of Profession</p>
                    <select
                      value={editForm.professionType}
                      onChange={e => { set('professionType', e.target.value); set('businessType', ''); }}
                      style={{ ...inputStyle, width: 'auto', minWidth: 260, padding: '7px 12px' }}
                    >
                      <option value=''>— Select —</option>
                      <option value='Working for Private Firm'>Working for Private Firm</option>
                      <option value='Working for Government Firm / PSU'>Working for Government Firm / PSU</option>
                      <option value='IAS / IPS / IFS Service'>IAS / IPS / IFS Service</option>
                      <option value='Self Employed / Business'>Self Employed / Business</option>
                    </select>
                  </div>

                  {editForm.professionType === 'Self Employed / Business' && (
                    <div style={{ marginBottom: '1.25rem', paddingLeft: '1rem', borderLeft: '3px solid #fdba74' }}>
                      <p style={subLabelStyle}>Business Type</p>
                      <select
                        value={editForm.businessType ?? ''}
                        onChange={e => set('businessType', e.target.value)}
                        style={{ ...inputStyle, width: 'auto', minWidth: 260, padding: '7px 12px' }}
                      >
                        <option value=''>— Select —</option>
                        <option value='Own a small firm'>Own a small firm</option>
                        <option value='Own a Company'>Own a Company</option>
                        <option value='Own a shop'>Own a shop</option>
                        <option value='Freelances'>Freelances</option>
                        <option value='Farmer'>Farmer</option>
                        <option value='Other'>Other</option>
                        <option value='Training'>Training</option>
                      </select>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Industry</p>
                    <input
                      value={editForm.industry ?? ''}
                      onChange={e => set('industry', e.target.value)}
                      placeholder="e.g. IT, Healthcare, Manufacturing..."
                      style={{ ...inputStyle, maxWidth: 400, padding: '7px 12px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Employer / Company Name</p>
                    <input
                      value={editForm.employer}
                      onChange={e => set('employer', e.target.value)}
                      placeholder="Employer or Company Name"
                      style={{ ...inputStyle, maxWidth: 400, padding: '7px 12px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Occupation / Designation</p>
                    <input
                      value={editForm.occupation}
                      onChange={e => set('occupation', e.target.value)}
                      placeholder="e.g. Software Engineer, Manager..."
                      style={{ ...inputStyle, maxWidth: 400, padding: '7px 12px' }}
                    />
                  </div>
                </section>

                <button style={saveBtn} onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ ECONOMIC ══════════ */}
            {editTab === 'economic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ color: '#ea580c' }}>Economical Information</h3>

                <section>
                  <h4 style={sectionHeadStyle}>Annual Income</h4>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Self Income</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {incomePills.map(opt => (
                        <label key={opt} style={pillStyle(editForm.selfIncome === opt)}>
                          <input type="radio" name="selfIncome" value={opt} checked={editForm.selfIncome === opt} onChange={() => set('selfIncome', opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p style={subLabelStyle}>Family Income</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {incomePills.map(opt => (
                        <label key={opt} style={pillStyle(editForm.familyIncome === opt)}>
                          <input type="radio" name="familyIncome" value={opt} checked={editForm.familyIncome === opt} onChange={() => set('familyIncome', opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={sectionHeadStyle}>Family Facilities</h4>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Housing</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Stay in Rented House', 'Own a House', 'Own Agricultural Land'].map(opt => (
                        <label key={opt} style={pillStyle((editForm.housing ?? []).includes(opt))}>
                          <input type="checkbox" checked={(editForm.housing ?? []).includes(opt)} onChange={() => toggleArrayItem('housing', opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Vehicles</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Own a Two Wheeler', 'Own a Car'].map(opt => (
                        <label key={opt} style={pillStyle((editForm.vehicles ?? []).includes(opt))}>
                          <input type="checkbox" checked={(editForm.vehicles ?? []).includes(opt)} onChange={() => toggleArrayItem('vehicles', opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Insurance</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {([
                        { key: 'healthInsurance', forKey: 'healthInsuranceFor', label: 'Have Health Insurance' },
                        { key: 'lifeInsurance',   forKey: 'lifeInsuranceFor',   label: 'Have Life Insurance'   },
                        { key: 'termInsurance',   forKey: 'termInsuranceFor',   label: 'Have Term Insurance'   },
                      ] as { key: keyof EditForm; forKey: keyof EditForm; label: string }[]).map(({ key, forKey, label }) => (
                        <div key={String(key)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <label style={pillStyle(!!editForm[key])}>
                            <input type="checkbox" checked={!!editForm[key]} onChange={e => set(key, e.target.checked)} style={{ display: 'none' }} />
                            {label}
                          </label>
                          {editForm[key] && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {whoOptions.map(who => (
                                <label key={who} style={pillStyle((editForm[forKey] as string[] ?? []).includes(who), 'xs')}>
                                  <input type="checkbox" checked={(editForm[forKey] as string[] ?? []).includes(who)} onChange={() => toggleArrayItem(forKey, who)} style={{ display: 'none' }} />
                                  {who}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={subLabelStyle}>Documents</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {([
                        { key: 'rationCard', forKey: 'rationCardFor', label: 'Have Ration Card' },
                        { key: 'aadhar',     forKey: 'aadharFor',     label: 'Have AADHAR'      },
                        { key: 'pan',        forKey: 'panFor',         label: 'Have PAN'         },
                        { key: 'allRecords', forKey: 'allRecordsFor', label: 'Have all Records in place (Land / Property / Pension / Govt Facility)' },
                      ] as { key: keyof EditForm; forKey: keyof EditForm; label: string }[]).map(({ key, forKey, label }) => (
                        <div key={String(key)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <label style={{ ...pillStyle(!!editForm[key]), minWidth: 180 }}>
                            <input type="checkbox" checked={!!editForm[key]} onChange={e => set(key, e.target.checked)} style={{ display: 'none' }} />
                            {label}
                          </label>
                          {editForm[key] && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {whoOptions.map(who => (
                                <label key={who} style={pillStyle((editForm[forKey] as string[] ?? []).includes(who), 'xs')}>
                                  <input type="checkbox" checked={(editForm[forKey] as string[] ?? []).includes(who)} onChange={() => toggleArrayItem(forKey, who)} style={{ display: 'none' }} />
                                  {who}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p style={subLabelStyle}>Investments</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Fixed Deposits', 'Mutual Funds / SIP', 'Trading in Shares / Demat Account', 'Investment - Others'].map(opt => (
                        <label key={opt} style={pillStyle((editForm.investments ?? []).includes(opt))}>
                          <input type="checkbox" checked={(editForm.investments ?? []).includes(opt)} onChange={() => toggleArrayItem('investments', opt)} style={{ display: 'none' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <button style={saveBtn} onClick={handleSave}>Save</button>
              </div>
            )}

            {/* ══════════ REVIEW ══════════ */}
            {editTab === 'review' && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {Object.entries(editForm).map(([k, v]) => (
                  <div key={k} style={{ padding: '4px 0', borderBottom: '1px dashed #fdba74' }}>
                    <strong style={{ color: '#c2410c' }}>{k}:</strong>{' '}
                    {v === null || v === undefined
                      ? '—'
                      : Array.isArray(v)
                      ? (v.length ? v.join(', ') : '—')
                      : typeof v === 'boolean'
                      ? (v ? 'Yes' : 'No')
                      : typeof v === 'object'
                      ? (
                        <div style={{ paddingLeft: '1rem' }}>
                          {Object.entries(v).map(([nk, nv]) => (
                            <div key={nk}>
                              <em>{nk}:</em>{' '}
                              {typeof nv === 'object' && nv !== null
                                ? Object.entries(nv).map(([fk, fv]) => `${fk}: ${fv}`).join(', ')
                                : String(nv ?? '—')}
                            </div>
                          ))}
                        </div>
                      )
                      : String(v) || '—'
                    }
                  </div>
                ))}
              </div>
            )}

          </div>
        </Modal>
      )}

    </div>
  );
}
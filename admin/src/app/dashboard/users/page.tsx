'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';

const BASE_URL = 'http://localhost:8000';

interface UserItem {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  submitted_at: string;
  overall_completion_pct: number;
  first_name: string;
  last_name: string;
  gender: string;
  sangha_name: string;
  sangha_id: string;
}

interface ProfileStep1 {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  is_married?: boolean;
  wife_name?: string;
  husbands_name?: string;
  fathers_name?: string;
  mothers_name?: string;
  has_disability?: string;
  is_part_of_sangha?: string;
  sangha_name?: string;
  sangha_role?: string;
}

interface ProfileStep2 {
  gotra?: string;
  pravara?: string;
  kuladevata?: string;
  kuladevata_other?: string;
  priest_name?: string;
  priest_location?: string;
}

interface FamilyMember {
  name?: string;
  relation?: string;
  gender?: string;
  dob?: string;
  age?: string | number;
  status?: string;
  disability?: string;
}

interface Address {
  address_type?: string;
  flat_no?: string;
  building?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface EducationRow {
  member_name?: string;
  member_relation?: string;
  highest_education?: string;
  profession_type?: string;
  industry?: string;
  is_currently_studying?: boolean;
}

interface EconomicDetails {
  self_income?: string;
  family_income?: string;
}

interface InsuranceRow {
  member_name?: string;
  member_relation?: string;
  health_coverage?: string[];
  life_coverage?: string[];
  term_coverage?: string[];
  konkani_card_coverage?: string[];
  [key: string]: unknown;
}

interface DocumentRow {
  member_name?: string;
  member_relation?: string;
  aadhaar_coverage?: string[];
  pan_coverage?: string[];
  voter_id_coverage?: string[];
  land_doc_coverage?: string[];
  dl_coverage?: string[];
  [key: string]: unknown;
}

interface ProfileData {
  user: { id: string; email: string; phone: string };
  profile: { id: string; status: string };
  step1: ProfileStep1 | null;
  step2: ProfileStep2 | null;
  step3: { family_info: Record<string, unknown> | null; members: FamilyMember[] };
  step4: Address[];
  step5: EducationRow[];
  step6: {
    economic: EconomicDetails | null;
    insurance: InsuranceRow[];
    documents: DocumentRow[];
  };
}

function formatDate(raw?: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function hasCoverage(arr?: string[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function findMemberRow<T extends { member_name?: string; member_relation?: string }>(
  rows: T[],
  name: string,
  relation: string
): T | undefined {
  return rows.find(r => r.member_name === name && r.member_relation === relation);
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {children}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 13, fontWeight: 700, marginBottom: 10,
      color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-200)', paddingBottom: 6,
    }}>
      {children}
    </h3>
  );
}

function CoverageItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', fontSize: 12,
    }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ color: value ? 'green' : 'var(--gray-400)', fontWeight: 600 }}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function CoverageBox({ items }: { items: Array<{ label: string; value: boolean }> }) {
  return (
    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 6, overflow: 'hidden' }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--gray-200)' : 'none' }}>
          <CoverageItem label={item.label} value={item.value} />
        </div>
      ))}
    </div>
  );
}

function ProfileDetail({ data, userId }: { data: ProfileData; userId: string }) {
  const s1      = data.step1;
  const s2      = data.step2;
  const s4      = data.step4;
  const s5      = data.step5;
  const s6eco   = data.step6?.economic;
  const s6ins   = data.step6?.insurance ?? [];
  const s6doc   = data.step6?.documents ?? [];
  const members = data.step3?.members ?? [];

  const currentAddr  = s4.find(a => a.address_type === 'current');
  const hometownAddr = s4.find(a => a.address_type === 'hometown');

  const selfName = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(' ') : '';
  const userIns  = findMemberRow(s6ins, selfName, 'Self') ?? s6ins.find(r => r.member_relation === 'Self');
  const userDoc  = findMemberRow(s6doc, selfName, 'Self') ?? s6doc.find(r => r.member_relation === 'Self');

  const handleDownload = () => {
    const el = document.getElementById(`admin-print-section-${userId}`);
    if (!el) return;
    import('html2pdf.js').then((mod) => {
      const html2pdf = (mod as any).default ?? mod;
      html2pdf().from(el).set({
        margin: 10,
        filename: `user-profile-${userId}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).save();
    }).catch(console.error);
  };

  return (
    <div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleDownload}
        >
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.download}</span>
          Download PDF
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.open(`/admin/edit-user?id=${userId}`, '_blank')}
        >
          Edit
        </button>
      </div>

      <div id={`admin-print-section-${userId}`}>

        {/* Personal Details */}
        <section style={{ marginBottom: 20 }}>
          <SectionTitle>👤 Personal Details</SectionTitle>
          {s1 ? (
            <InfoGrid>
              <InfoCell label="Full Name"
                value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(' ') || null}
              />
              <InfoCell label="Gender"        value={s1.gender} />
              <InfoCell label="Date of Birth" value={formatDate(s1.date_of_birth)} />
              <InfoCell label="Marital Status" value={s1.is_married ? 'Married' : 'Single'} />
              {s1.is_married && (
                <InfoCell label="Spouse" value={s1.wife_name || s1.husbands_name} />
              )}
              <InfoCell label="Father's Name" value={s1.fathers_name} />
              <InfoCell label="Mother's Name" value={s1.mothers_name} />
              <InfoCell label="Phone"         value={data.user?.phone} />
              <InfoCell label="Email"         value={data.user?.email} />
              <InfoCell label="Disability"
                value={s1.has_disability === 'yes' ? 'Yes' : s1.has_disability === 'no' ? 'No' : null}
              />
              {s1.is_part_of_sangha === 'yes' && (
                <>
                  <InfoCell label="Sangha Name" value={s1.sangha_name} />
                  <InfoCell label="Sangha Role" value={s1.sangha_role} />
                </>
              )}
            </InfoGrid>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Not filled yet.</p>
          )}
        </section>

        {/* Religious Details */}
        {s2 && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>🕉 Religious Details</SectionTitle>
            <InfoGrid>
              <InfoCell label="Gotra"           value={s2.gotra} />
              <InfoCell label="Pravara"         value={s2.pravara} />
              <InfoCell label="Kuladevata"      value={s2.kuladevata_other || s2.kuladevata} />
              <InfoCell label="Family Priest"   value={s2.priest_name} />
              <InfoCell label="Priest Location" value={s2.priest_location} />
            </InfoGrid>
          </section>
        )}

        {/* Family Members */}
        {members.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>👨‍👩‍👧 Family Members</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 8, fontSize: 12, border: '1px solid var(--gray-200)',
                  borderRadius: 6, padding: '8px 12px',
                }}>
                  <span style={{ fontWeight: 600 }}>{m.relation || '—'}</span>
                  <span>{m.name || '—'}</span>
                  <span style={{ color: 'var(--gray-500)', textTransform: 'capitalize' }}>{m.gender || '—'}</span>
                  <span style={{ color: 'var(--gray-500)' }}>
                    {m.dob ? formatDate(m.dob) : m.age ? `Age ${m.age}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Addresses */}
        {s4.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>📍 Addresses</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {currentAddr && (
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Current Address</p>
                  <p style={{ color: 'var(--gray-500)' }}>
                    {[currentAddr.flat_no, currentAddr.building, currentAddr.street,
                      currentAddr.area, currentAddr.city, currentAddr.state,
                      currentAddr.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {hometownAddr && (
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Hometown</p>
                  <p style={{ color: 'var(--gray-500)' }}>
                    {[hometownAddr.city, hometownAddr.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Education & Profession */}
        {s5.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>🎓 Education &amp; Profession</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s5.map((m, i) => (
                <div key={i} style={{
                  border: '1px solid var(--gray-200)', borderRadius: 6,
                  padding: '10px 12px', fontSize: 12,
                }}>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>
                    {i === 0 ? 'Self' : m.member_name || `Member ${i}`}
                    {m.member_relation && i !== 0 && (
                      <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}> ({m.member_relation})</span>
                    )}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <InfoCell label="Education"  value={m.highest_education} />
                    <InfoCell label="Profession" value={m.is_currently_studying ? 'Currently Studying' : m.profession_type} />
                    <InfoCell label="Industry"   value={m.industry} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Economic Details */}
        {s6eco && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>💼 Economic Details</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-400)', display: 'block', fontSize: 11 }}>Self Income</span>
                <span style={{ fontWeight: 600 }}>{s6eco.self_income || '—'}</span>
              </div>
              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: '10px 12px', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-400)', display: 'block', fontSize: 11 }}>Family Income</span>
                <span style={{ fontWeight: 600 }}>{s6eco.family_income || '—'}</span>
              </div>
            </div>

            {userIns && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>Insurance</p>
                <CoverageBox items={[
                  { label: 'Health Insurance', value: hasCoverage(userIns.health_coverage) },
                  { label: 'Life Insurance',   value: hasCoverage(userIns.life_coverage) },
                  { label: 'Term Insurance',   value: hasCoverage(userIns.term_coverage) },
                  { label: 'Konkani Card',     value: hasCoverage(userIns.konkani_card_coverage) },
                ]} />
              </div>
            )}

            {userDoc && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>Documents</p>
                <CoverageBox items={[
                  { label: 'Aadhaar',   value: hasCoverage(userDoc.aadhaar_coverage) },
                  { label: 'PAN',       value: hasCoverage(userDoc.pan_coverage) },
                  { label: 'Voter ID',  value: hasCoverage(userDoc.voter_id_coverage) },
                  { label: 'Land Docs', value: hasCoverage(userDoc.land_doc_coverage) },
                  { label: 'DL',        value: hasCoverage(userDoc.dl_coverage) },
                ]} />
              </div>
            )}
          </section>
        )}

        {/* Family Member Details */}
        {members.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <SectionTitle>👥 Family Member Details</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {members.map((member, idx) => {
                const memberEdu = s5[idx + 1];
                const mName     = member.name ?? '';
                const mRelation = member.relation ?? '';
                const memberIns = findMemberRow(s6ins, mName, mRelation);
                const memberDoc = findMemberRow(s6doc, mName, mRelation);

                return (
                  <div key={idx} style={{
                    border: '1px solid var(--gray-200)', borderRadius: 8,
                    padding: '12px 14px', fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--primary-50, #eff6ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, color: 'var(--primary-600, #2563eb)',
                        flexShrink: 0,
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>{member.name || '—'}</p>
                        <p style={{ color: 'var(--gray-400)', margin: 0, fontSize: 11 }}>{member.relation || '—'}</p>
                      </div>
                    </div>

                    {memberEdu && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>Education</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          <InfoCell label="Education"  value={memberEdu.highest_education} />
                          <InfoCell label="Profession" value={memberEdu.profession_type} />
                          <InfoCell label="Industry"   value={memberEdu.industry} />
                        </div>
                      </div>
                    )}

                    {memberIns && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>Insurance</p>
                        <CoverageBox items={[
                          { label: 'Health Insurance', value: hasCoverage(memberIns.health_coverage) },
                          { label: 'Life Insurance',   value: hasCoverage(memberIns.life_coverage) },
                          { label: 'Term Insurance',   value: hasCoverage(memberIns.term_coverage) },
                        ]} />
                      </div>
                    )}

                    {memberDoc && (
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4 }}>Documents</p>
                        <CoverageBox items={[
                          { label: 'Aadhaar',  value: hasCoverage(memberDoc.aadhaar_coverage) },
                          { label: 'PAN',      value: hasCoverage(memberDoc.pan_coverage) },
                          { label: 'Voter ID', value: hasCoverage(memberDoc.voter_id_coverage) },
                        ]} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch]                     = useState('');
  const [list, setList]                         = useState<UserItem[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [modal, setModal]                       = useState<UserItem | null>(null);
  const [profileData, setProfileData]           = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading]     = useState(false);

  const getToken = useCallback(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const openModal = async (u: UserItem) => {
    setModal(u);
    setProfileData(null);
    setProfileLoading(true);
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${u.id}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ProfileData = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setProfileData(null);
  };

  const filtered = list.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.id ?? '').toString().includes(q) ||
      (u.sangha_name ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
      Loading...
    </div>
  );

  return (
    <div className="page">
      <div className="action-bar">
        <div className="search-box">
          <span style={{ width: 14, height: 14, display: 'inline-flex' }}>{IC.search}</span>
          <input
            placeholder="Search by name, email, sangha or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm">Export</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Sangha</th>
              <th>Status</th>
              <th>Completion</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
              return (
                <tr key={u.id}>
                  <td><span className="chip">{u.id}</span></td>
                  <td>
                    <div className="avatar-cell">
                      <div className="avatar-sm">{displayName[0]?.toUpperCase() ?? '?'}</div>
                      {displayName}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.phone || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.sangha_name || '—'}</td>
                  <td>
                    <span className="status-chip status-approved">{u.status || '—'}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {u.overall_completion_pct != null ? `${u.overall_completion_pct}%` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="icon-btn" title="View Profile" onClick={() => openModal(u)}>
                        <span style={{ width: 15, height: 15, display: 'inline-flex' }}>{IC.eye}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          open
          title={`User Profile — ${`${modal.first_name || ''} ${modal.last_name || ''}`.trim() || modal.id}`}
          onClose={closeModal}
          footer={
            <button className="btn btn-secondary" onClick={closeModal}>Close</button>
          }
        >
          {profileLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              Loading profile...
            </div>
          ) : profileData ? (
            <ProfileDetail data={profileData} userId={modal.id} />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              Could not load profile.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
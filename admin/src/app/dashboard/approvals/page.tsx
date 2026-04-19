/*harshi*/
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { IC } from '@/components/Icons';
import { useSearchParams } from 'next/navigation';

const BASE_URL = 'http://localhost:8000';

type Tab = 'sangha' | 'user';

interface SanghaItem {
  id: string;
  sangha_auth_id: string;
  name: string;
  email: string;
  reg_email: string;
  phone: string;
  reg_phone: string;
  location: string;
  address_line: string;
  state: string;
  description: string;
  status: string;
  created_at: string;
}

interface SanghaMember {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: string;
  phone?: string;
  email?: string;
  dob?: string;
  role?: string;
  member_type?: string;
  [key: string]: any;
}

interface SanghaDetail extends SanghaItem {
  logo_url?: string;
  village_town?: string;
  taluk?: string;
  pincode?: string;
  sangha_contact_same?: boolean;
  sangha_email?: string;
  sangha_phone?: string;
  rejection_reason?: string;
  members: SanghaMember[];
  updated_at?: string;
}

interface UserItem {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  sangha_name: string;
  sangha_id: string;
  overall_completion_pct?: number;
}

interface UserDetail {
  user: { id: string; email: string; phone: string; is_blocked: boolean; created_at: string };
  profile: {
    id: string; status: string; photo_url?: string;
    submitted_at?: string; reviewed_at?: string; review_comment?: string;
    overall_completion_pct?: number;
    step1_completed?: boolean; step2_completed?: boolean; step3_completed?: boolean;
    step4_completed?: boolean; step5_completed?: boolean; step6_completed?: boolean;
    sangha_id?: string;
  } | null;
  step1: Record<string, any> | null;
  step2: Record<string, any> | null;
  step3: { family_info: Record<string, any> | null; members: Record<string, any>[] };
  step4: Record<string, any>[];
  step5: Record<string, any>[];
  step6: {
    economic: Record<string, any> | null;
    insurance: Record<string, any>[];
    documents: Record<string, any>[];
    family_history: Record<string, any> | null;
  };
  sangha: { id: string; name: string; location: string; state: string; email: string; phone: string } | null;
}

/* ─── Shared sub-components ─── */
const ViewField = ({ label, value }: { label: string; value?: string | null | boolean | number }) => {
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : typeof value === 'boolean'
      ? value ? 'Yes' : 'No'
      : String(value);
  const isEmpty = display === '—';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: isEmpty ? '#fed7aa' : '#7c2d12' }}>
        {display}
      </span>
    </div>
  );
};

const SectionHeading = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, fontWeight: 700, color: '#9a3412',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    paddingBottom: 8, marginBottom: 14, marginTop: 22,
    borderBottom: '2px solid #fed7aa',
  }}>
    {icon && <span style={{ width: 14, height: 14, display: 'inline-flex', opacity: 0.6 }}>{icon}</span>}
    {title}
  </div>
);

const FieldGrid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '14px 20px' }}>
    {children}
  </div>
);

const statusBadgeStyle = (status: string): React.CSSProperties => {
  if (status === 'approved') return { background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' };
  if (status === 'submitted' || status === 'under_review') return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  if (status === 'rejected') return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
  if (status === 'pending_approval') return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
  return { background: '#fff7ed', color: '#9a3412', border: '1px solid #fb923c' };
};

const fmtStatus = (s?: string | null) =>
  (s ?? 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// AFTER — force UTC parsing by appending Z if missing
const toUtcDate = (d: string): Date => {
  // If the string has no timezone info (no Z, no +/-), treat it as UTC
  const hasOffset = /Z$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(d);
  return new Date(hasOffset ? d : d + 'Z');
};

const fmtDate = (d?: string | null) =>
  d ? toUtcDate(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

const fmtDateOnly = (d?: string | null) =>
  d ? toUtcDate(d).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : null;


const StepPill = ({ label, done }: { label: string; done?: boolean }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: done ? '#dcfce7' : '#fff7ed',
    color: done ? '#065f46' : '#c2410c',
    border: `1px solid ${done ? '#86efac' : '#fb923c'}`,
  }}>
    {done ? '✓' : '○'} {label}
  </span>
);

const BoolPill = ({ value }: { value: boolean }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: value ? '#dcfce7' : '#fff7ed',
    color: value ? '#065f46' : '#c2410c',
    border: `1px solid ${value ? '#86efac' : '#fb923c'}`,
  }}>
    {value ? '✓ Yes' : '✗ No'}
  </span>
);

/* ─── Boolean checkbox grid for investments / facilities ─── */
const BoolGrid = ({ items }: { items: { label: string; value: boolean }[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 6 }}>
    {items.map(({ label, value }) => (
      <span key={label} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
        background: value ? '#ecfdf5' : '#fff7ed',
        color: value ? '#065f46' : '#c2410c',
        border: `1px solid ${value ? '#6ee7b7' : '#fb923c'}`,
      }}>
        <span>{value ? '✓' : '○'}</span> {label}
      </span>
    ))}
  </div>
);

/* ─── Array badge list ─── */
const toStringArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string') {
    // Postgres may return '{a,b,c}' formatted strings
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    return [trimmed].filter(Boolean);
  }
  return [];
};

const ArrayBadges = ({ items, color = '#7c3aed', bg = '#ede9fe' }: { items?: any; color?: string; bg?: string }) => {
  const arr = toStringArray(items);
  if (arr.length === 0) return <span style={{ fontSize: 13, color: '#fb923c' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {arr.map((item, i) => (
        <span key={i} style={{
          padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: bg, color,
        }}>{item}</span>
      ))}
    </div>
  );
};

const ProfileCompletionBar = ({ pct }: { pct?: number }) => {
  const value = pct ?? 0;
  const getColor = (v: number) => v >= 80 ? '#16a34a' : v >= 50 ? '#f97316' : '#dc2626';
  const color = getColor(value);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 500 }}>Profile Completion</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ width: '100%', height: 5, borderRadius: 99, background: '#fed7aa', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${value}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

const memberDisplayName = (m: SanghaMember) => {
  if (m.first_name || m.last_name) return [m.first_name, m.last_name].filter(Boolean).join(' ');
  if (m.full_name) return m.full_name;
  return '—';
};

/* ══════════════════════════════════════════════════════════════
   USER DETAIL MODAL CONTENT — all steps fully rendered
══════════════════════════════════════════════════════════════ */
function UserDetailContent({ d }: { d: UserDetail }) {
  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Header band ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Profile photo */}
          {d.profile?.photo_url ? (
            <img
              src={d.profile.photo_url}
              alt="Profile"
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '2px solid #fdba74', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#fff7ed,#fed7aa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22, color: '#ea580c',
              border: '2px solid #fed7aa',
            }}>
              {(d.step1?.first_name?.[0] ?? d.user.email[0])?.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#7c2d12' }}>
              {[d.step1?.first_name, d.step1?.middle_name, d.step1?.last_name].filter(Boolean).join(' ') || d.user.email}
            </div>
            <div style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>{d.user.email} · {d.user.phone}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            ...statusBadgeStyle(d.profile?.status ?? ''),
          }}>
            {fmtStatus(d.profile?.status)}
          </div>
          {d.profile?.overall_completion_pct !== undefined && (
            <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 600 }}>
              Completion: <span style={{ color: '#7c2d12' }}>{d.profile.overall_completion_pct}%</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Step pills ── */}
      {d.profile && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {(['step1_completed','step2_completed','step3_completed','step4_completed','step5_completed','step6_completed'] as const).map((k, i) => (
            <StepPill key={k} label={`Step ${i + 1}`} done={d.profile?.[k]} />
          ))}
        </div>
      )}

      {/* ── MAIN CARD ── */}
      <div style={{ background: '#fff', border: '1px solid #fdba74', borderRadius: 12, padding: 24, borderLeft: '4px solid #f97316' }}>

        {/* ══ ACCOUNT ══ */}
        <SectionHeading title="Account" />
        <FieldGrid cols={2}>
          <ViewField label="Email" value={d.user.email} />
          <ViewField label="Phone" value={d.user.phone} />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <FieldGrid cols={3}>
            <ViewField label="Registered At" value={fmtDate(d.user.created_at)} />
            <ViewField label="Submitted At" value={fmtDate(d.profile?.submitted_at)} />
            <ViewField label="Reviewed At" value={fmtDate(d.profile?.reviewed_at)} />
          </FieldGrid>
        </div>
        <div style={{ marginTop: 14 }}>
          <FieldGrid cols={2}>
            <ViewField label="Blocked" value={d.user.is_blocked} />
            <ViewField label="Profile Status" value={fmtStatus(d.profile?.status)} />
          </FieldGrid>
        </div>

        {/* ══ STEP 1 — PERSONAL DETAILS ══ */}
        {d.step1 && (
          <>
            <SectionHeading title="Personal Details" />
            <FieldGrid cols={3}>
              <ViewField label="First Name" value={d.step1.first_name} />
              <ViewField label="Middle Name" value={d.step1.middle_name} />
              <ViewField label="Last Name" value={d.step1.last_name} />
            </FieldGrid>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={3}>
                <ViewField label="Gender" value={d.step1.gender} />
                <ViewField label="Date of Birth" value={fmtDateOnly(d.step1.date_of_birth)} />
                <ViewField label="Married" value={d.step1.is_married ? 'Yes' : 'No'} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Father's Name" value={d.step1.fathers_name} />
                <ViewField label="Mother's Name" value={d.step1.mothers_name} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Mother's Maiden Name" value={d.step1.mothers_maiden_name} />
                <ViewField label="Surname In Use" value={d.step1.surname_in_use} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Surname as per Gotra" value={d.step1.surname_as_per_gotra} />
                <ViewField label="Has Disability" value={d.step1.has_disability} />
              </FieldGrid>
            </div>
            {d.step1.is_married && (
              <div style={{ marginTop: 14 }}>
                <FieldGrid cols={2}>
                  <ViewField label="Wife's Name" value={d.step1.wife_name} />
                  <ViewField label="Wife's Maiden Name" value={d.step1.wife_maiden_name} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}>
                  <ViewField label="Husband's Name" value={d.step1.husbands_name} />
                </div>
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Part of Sangha" value={d.step1.is_part_of_sangha} />
              </FieldGrid>
            </div>
            {d.step1.is_part_of_sangha === 'yes' && (
              <div style={{ marginTop: 14 }}>
                <FieldGrid cols={3}>
                  <ViewField label="Sangha Name" value={d.step1.sangha_name} />
                  <ViewField label="Sangha Role" value={d.step1.sangha_role} />
                  <ViewField label="Sangha Tenure" value={d.step1.sangha_tenure} />
                </FieldGrid>
              </div>
            )}
          </>
        )}

        {/* ══ STEP 2 — RELIGIOUS DETAILS ══ */}
        {d.step2 && (
          <>
            <SectionHeading title="Religious Details" />
            <FieldGrid cols={2}>
              <ViewField label="Gotra" value={d.step2.gotra} />
              <ViewField label="Pravara" value={d.step2.pravara} />
            </FieldGrid>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Upanama (General)" value={d.step2.upanama_general} />
                <ViewField label="Upanama (Proper)" value={d.step2.upanama_proper} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Kuladevata" value={d.step2.kuladevata} />
                <ViewField label="Kuladevata (Other)" value={d.step2.kuladevata_other} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Surname In Use" value={d.step2.surname_in_use} />
                <ViewField label="Surname as per Gotra" value={d.step2.surname_as_per_gotra} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Priest Name" value={d.step2.priest_name} />
                <ViewField label="Priest Location" value={d.step2.priest_location} />
              </FieldGrid>
            </div>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={2}>
                <ViewField label="Ancestral Challenge" value={d.step2.ancestral_challenge} />
                <ViewField label="Demi God Challenge" value={d.step2.demi_god_challenge} />
              </FieldGrid>
            </div>
            {d.step2.demi_gods && d.step2.demi_gods.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Demi Gods</span>
                <ArrayBadges items={d.step2.demi_gods} color="#7c3aed" bg="#ede9fe" />
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <ViewField label="Demi God (Other)" value={d.step2.demi_god_other} />
            </div>
            <div style={{ marginTop: 14 }}>
              <ViewField label="Ancestral Challenge Notes" value={d.step2.ancestral_challenge_notes} />
            </div>
          </>
        )}

        {/* ══ STEP 3 — FAMILY ══ */}
        {d.step3?.family_info && (
          <>
            <SectionHeading title={`Family (${d.step3.members.length} member${d.step3.members.length !== 1 ? 's' : ''})`} />
            <ViewField label="Family Type" value={d.step3.family_info.family_type} />
            {d.step3.members.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #fdba74', marginTop: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fff7ed' }}>
                      {['#', 'Relation', 'Name', 'Gender', 'Age / DOB', 'Disability', 'Status'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '10px 10px',
                          color: '#9a3412', fontWeight: 600, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.step3.members.map((m, i) => (
                      <tr key={m.id || i} style={{ borderBottom: '1px solid #fff7ed', background: i % 2 === 0 ? '#fff' : '#fff3e8' }}>
                        <td style={{ padding: '8px 10px', color: '#c2410c', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', color: '#9a3412' }}>{m.relation || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#7c2d12', fontWeight: 600 }}>{m.name || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#9a3412' }}>{m.gender || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#9a3412', whiteSpace: 'nowrap' }}>
                          {m.dob ? fmtDateOnly(m.dob) : m.age ? `${m.age} yrs` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#9a3412' }}>{m.disability || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: m.status === 'active' ? '#dcfce7' : '#fff7ed',
                            color: m.status === 'active' ? '#065f46' : '#9a3412',
                          }}>{m.status || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══ STEP 4 — ADDRESSES ══ */}
        {d.step4 && d.step4.length > 0 && (
          <>
            <SectionHeading title={`Addresses (${d.step4.length})`} />
            {d.step4.map((addr, i) => (
              <div key={addr.id || i} style={{
                marginBottom: 12, padding: '12px 14px',
                background: '#fff7ed', borderRadius: 8, border: '1px solid #fdba74',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textTransform: 'uppercase' }}>
                  {addr.address_type || `Address ${i + 1}`}
                </div>
                <FieldGrid cols={3}>
                  <ViewField label="Flat / Door No." value={addr.flat_no} />
                  <ViewField label="Building" value={addr.building} />
                  <ViewField label="Street" value={addr.street} />
                </FieldGrid>
                <div style={{ marginTop: 10 }}>
                  <FieldGrid cols={3}>
                    <ViewField label="Landmark" value={addr.landmark} />
                    <ViewField label="Area" value={addr.area} />
                    <ViewField label="City" value={addr.city} />
                  </FieldGrid>
                </div>
                <div style={{ marginTop: 10 }}>
                  <FieldGrid cols={4}>
                    <ViewField label="Taluk" value={addr.taluk} />
                    <ViewField label="District" value={addr.district} />
                    <ViewField label="State" value={addr.state} />
                    <ViewField label="Pincode" value={addr.pincode} />
                  </FieldGrid>
                </div>
                <div style={{ marginTop: 10 }}>
                  <FieldGrid cols={2}>
                    <ViewField label="Country" value={addr.country} />
                  </FieldGrid>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ══ STEP 5 — EDUCATION & PROFESSION ══ */}
        {d.step5 && d.step5.length > 0 && (
          <>
            <SectionHeading title={`Education & Profession (${d.step5.length} member${d.step5.length !== 1 ? 's' : ''})`} />
            {d.step5.map((edu, i) => (
              <div key={edu.id || i} style={{
                marginBottom: 14, padding: '14px 16px',
                background: '#fff7ed', borderRadius: 8, border: '1px solid #fdba74',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 10 }}>
                  {edu.member_name || `Member ${i + 1}`}
                  {edu.member_relation ? <span style={{ fontWeight: 500, color: '#c2410c' }}> ({edu.member_relation})</span> : ''}
                </div>
                <FieldGrid cols={3}>
                  <ViewField label="Highest Education" value={edu.highest_education} />
                  <ViewField label="Profession Type" value={edu.profession_type} />
                  <ViewField label="Profession (Other)" value={edu.profession_other} />
                </FieldGrid>
                <div style={{ marginTop: 10 }}>
                  <FieldGrid cols={3}>
                    <ViewField label="Self-Employed Type" value={edu.self_employed_type} />
                    <ViewField label="Self-Employed (Other)" value={edu.self_employed_other} />
                    <ViewField label="Industry" value={edu.industry} />
                  </FieldGrid>
                </div>
                <div style={{ marginTop: 10 }}>
                  <FieldGrid cols={2}>
                    <ViewField label="Currently Studying" value={edu.is_currently_studying} />
                    <ViewField label="Currently Working" value={edu.is_currently_working} />
                  </FieldGrid>
                </div>
                {edu.brief_profile && (
                  <div style={{ marginTop: 10 }}>
                    <ViewField label="Brief Profile" value={edu.brief_profile} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ══ STEP 6A — ECONOMIC DETAILS ══ */}
        {d.step6?.economic && (
          <>
            <SectionHeading title="Economic Details" />
            <FieldGrid cols={2}>
              <ViewField label="Self Income" value={d.step6.economic.self_income} />
              <ViewField label="Family Income" value={d.step6.economic.family_income} />
            </FieldGrid>

            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Investments
              </span>
              <BoolGrid items={[
                { label: 'Fixed Deposits', value: !!d.step6.economic.inv_fixed_deposits },
                { label: 'Mutual Funds / SIP', value: !!d.step6.economic.inv_mutual_funds_sip },
                { label: 'Shares / Demat', value: !!d.step6.economic.inv_shares_demat },
                { label: 'Others', value: !!d.step6.economic.inv_others },
              ]} />
            </div>

            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Facilities / Assets
              </span>
              <BoolGrid items={[
                { label: 'Rented House', value: !!d.step6.economic.fac_rented_house },
                { label: 'Own House', value: !!d.step6.economic.fac_own_house },
                { label: 'Agricultural Land', value: !!d.step6.economic.fac_agricultural_land },
                { label: 'Two Wheeler', value: !!d.step6.economic.fac_two_wheeler },
                { label: 'Car', value: !!d.step6.economic.fac_car },
              ]} />
            </div>
          </>
        )}

        {/* ══ STEP 6B — INSURANCE ══ */}
        {d.step6?.insurance && d.step6.insurance.length > 0 && (
          <>
            <SectionHeading title={`Insurance (${d.step6.insurance.length} member${d.step6.insurance.length !== 1 ? 's' : ''})`} />
            {d.step6.insurance.map((ins, i) => (
              <div key={ins.id || i} style={{
                marginBottom: 12, padding: '12px 14px',
                background: '#fff7ed', borderRadius: 8, border: '1px solid #fdba74',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', marginBottom: 10 }}>
                  {ins.member_name || `Member ${i + 1}`}
                  {ins.member_relation ? <span style={{ fontWeight: 400, color: '#c2410c' }}> ({ins.member_relation})</span> : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Health Coverage</span>
                    <ArrayBadges items={ins.health_coverage} color="#065f46" bg="#dcfce7" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Life Coverage</span>
                    <ArrayBadges items={ins.life_coverage} color="#1e40af" bg="#dbeafe" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Term Coverage</span>
                    <ArrayBadges items={ins.term_coverage} color="#7c3aed" bg="#ede9fe" />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Konkani Card Coverage</span>
                    <ArrayBadges items={ins.konkani_card_coverage} color="#92400e" bg="#fef3c7" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ══ STEP 6C — DOCUMENTS ══ */}
        {d.step6?.documents && d.step6.documents.length > 0 && (
          <>
            <SectionHeading title={`Documents (${d.step6.documents.length} member${d.step6.documents.length !== 1 ? 's' : ''})`} />
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #fdba74' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#fff7ed' }}>
                    {['#', 'Member', 'Relation', 'Aadhaar', 'PAN', 'Voter ID', 'Land Doc', 'DL'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 10px',
                        color: '#9a3412', fontWeight: 600, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.step6.documents.map((doc, i) => {
                    const DocBadge = ({ val }: { val?: string }) =>
                      val ? (
                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: '#dcfce7', color: '#065f46' }}>{val}</span>
                      ) : <span style={{ color: '#fed7aa' }}>—</span>;
                    return (
                      <tr key={doc.id || i} style={{ borderBottom: '1px solid #fff7ed', background: i % 2 === 0 ? '#fff' : '#fff3e8' }}>
                        <td style={{ padding: '8px 10px', color: '#c2410c', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', color: '#7c2d12', fontWeight: 600 }}>{doc.member_name || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#9a3412' }}>{doc.member_relation || '—'}</td>
                        <td style={{ padding: '8px 10px' }}><DocBadge val={doc.aadhaar_coverage} /></td>
                        <td style={{ padding: '8px 10px' }}><DocBadge val={doc.pan_coverage} /></td>
                        <td style={{ padding: '8px 10px' }}><DocBadge val={doc.voter_id_coverage} /></td>
                        <td style={{ padding: '8px 10px' }}><DocBadge val={doc.land_doc_coverage} /></td>
                        <td style={{ padding: '8px 10px' }}><DocBadge val={doc.dl_coverage} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ STEP 6D — FAMILY HISTORY ══ */}
        {d.step6?.family_history && (
          <>
            <SectionHeading title="Family History" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ViewField label="Ancestral Challenge Notes" value={d.step6.family_history.ancestral_challenge_notes} />
              <ViewField label="Demigods Info" value={d.step6.family_history.demigods_info} />
              <ViewField label="Snake God / Naga Info" value={d.step6.family_history.snake_god_naga_info} />
              <ViewField label="Common Relative Names" value={d.step6.family_history.common_relative_names} />
            </div>
          </>
        )}

        {/* ══ REQUESTED SANGHA ══ */}
        {d.sangha && (
          <>
            <SectionHeading title="Requested Sangha" />
            <FieldGrid cols={2}>
              <ViewField label="Sangha Name" value={d.sangha.name} />
              <ViewField label="Location" value={d.sangha.location} />
            </FieldGrid>
            <div style={{ marginTop: 14 }}>
              <FieldGrid cols={3}>
                <ViewField label="State" value={d.sangha.state} />
                <ViewField label="Email" value={d.sangha.email} />
                <ViewField label="Phone" value={d.sangha.phone} />
              </FieldGrid>
            </div>
          </>
        )}

        {/* ══ REVIEW COMMENT ══ */}
        {d.profile?.review_comment && (
          <>
            <SectionHeading title="Review Comment" />
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <span style={{ fontSize: 13, color: '#9a3412' }}>{d.profile.review_comment}</span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as Tab) || 'sangha';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [pendingUsers, setPendingUsers] = useState<UserItem[]>([]);
  const [pendingSanghas, setPendingSanghas] = useState<SanghaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; sangha_auth_id?: string; name: string; kind: Tab } | null>(null);

  const [viewModal, setViewModal] = useState<SanghaDetail | null>(null);
  const [userDetailModal, setUserDetailModal] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = useCallback((): string | null => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  const authHeaders = useCallback((token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE_URL}/api/admin/sangha/pending`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${BASE_URL}/api/admin/users/pending`,  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([sanghas, users]) => {
        setPendingSanghas(Array.isArray(sanghas) ? sanghas : []);
        setPendingUsers(Array.isArray(users) ? users : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const approveSangha = async (item: SanghaItem) => {
    const token = getToken(); if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/sangha/approve/${item.sangha_auth_id}`, { method: 'POST', headers: authHeaders(token) });
      if (res.ok) { setPendingSanghas(p => p.filter(s => s.id !== item.id)); setViewModal(null); }
      else { const err = await res.json(); alert(err.message || 'Failed to approve sangha'); }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const approveUser = async (item: UserItem) => {
    const token = getToken(); if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/approve`, {
        method: 'POST', headers: authHeaders(token), body: JSON.stringify({ userId: item.id }),
      });
      if (res.ok) {
        setPendingUsers(p => p.filter(u => u.id !== item.id));
        if (userDetailModal?.user?.id === item.id) setUserDetailModal(null);
      } else { const err = await res.json(); alert(err.message || 'Failed to approve user'); }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const token = getToken(); if (!token) return;
    setActionLoading(true);
    try {
      if (rejectModal.kind === 'sangha') {
        await fetch(`${BASE_URL}/api/admin/sangha/reject/${rejectModal.sangha_auth_id}`, {
          method: 'POST', headers: authHeaders(token), body: JSON.stringify({ reason }),
        });
        setPendingSanghas(p => p.filter(s => s.id !== rejectModal.id));
        setViewModal(null);
      } else {
        await fetch(`${BASE_URL}/api/admin/users/reject`, {
          method: 'POST', headers: authHeaders(token), body: JSON.stringify({ userId: rejectModal.id, comment: reason }),
        });
        setPendingUsers(p => p.filter(u => u.id !== rejectModal.id));
        if (userDetailModal?.user?.id === rejectModal.id) setUserDetailModal(null);
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); setRejectModal(null); setReason(''); }
  };

  const openUserDetail = async (u: UserItem) => {
    setUserDetailModal(null);
    setUserDetailLoading(true);
    const token = getToken(); if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/${u.id}/pending-detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        
        if (data && data.user && data.user.id) {
          setUserDetailModal(data as UserDetail);
        } else {
          console.error('Unexpected response shape:', data);
        }
      } else {
        console.error('Failed to load user detail:', res.status);
      }
    } catch (err) { console.error(err); }
    finally { setUserDetailLoading(false); }
  };

  const openSanghaDetail = async (s: SanghaItem) => {
    const token = getToken(); if (!token) return;
    setDetailLoading(true); setViewModal(null); setLogoError(false);
    try {
      const r = await fetch(`${BASE_URL}/api/admin/sangha/${s.id}/detail`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setViewModal(await r.json());
      else setViewModal({ ...s, members: [] } as any);
    } catch { setViewModal({ ...s, members: [] } as any); }
    setDetailLoading(false);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'sangha', label: 'Sangha Request', count: pendingSanghas.length },
    { id: 'user',   label: 'User Request',   count: pendingUsers.length },
  ];

  const findUserItem = (id: string) => pendingUsers.find(u => u.id === id);

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>
  );

  return (
    <div className="page">
      <div className="radio-tab-group">
        {tabs.map(t => (
          <label key={t.id} className={`radio-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); router.push(`/dashboard/approvals?tab=${t.id}`); }}>
            <input type="radio" name="apTab" checked={tab === t.id} onChange={() => setTab(t.id)} />
            {t.label}
            <span className={`cnt-badge ${tab === t.id ? 'cnt-active' : 'cnt-idle'}`}>{t.count}</span>
          </label>
        ))}
      </div>

      {/* ── Sangha Requests ── */}
      {tab === 'sangha' && (
        pendingSanghas.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>All Sangha requests processed</div>
          : pendingSanghas.map(s => (
            <div className="approval-card ac-purple" key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--purple-pale)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>
                    {s.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                      {s.name} <span className="chip">{s.id}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{s.reg_email || s.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{s.reg_phone || s.phone}</span>
                    </div>
                    {s.location && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>📍 {s.location}{s.state ? `, ${s.state}` : ''}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => approveSangha(s)}>Approve</button>
                  <button className="btn btn-danger btn-sm" disabled={actionLoading} onClick={() => setRejectModal({ id: s.id, sangha_auth_id: s.sangha_auth_id, name: s.name, kind: 'sangha' })}>Reject</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openSanghaDetail(s)}>See</button>
                </div>
              </div>
            </div>
          ))
      )}

      {/* ── User Requests ── */}
      {tab === 'user' && (
        pendingUsers.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>All user requests processed</div>
          : pendingUsers.map(u => {
            const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
            return (
              <div className="approval-card" key={u.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'var(--orange-pale)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>
                      {displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.mail}</span>{u.email}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13, display: 'inline-flex' }}>{IC.phone}</span>{u.phone}</span>
                      </div>
                      {u.sangha_name && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--purple-pale)', color: 'var(--purple)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            {u.sangha_name}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: 10, maxWidth: 280 }}>
                        <ProfileCompletionBar pct={u.overall_completion_pct} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                    <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => approveUser(u)}>Approve</button>
                    <button className="btn btn-danger btn-sm" disabled={actionLoading} onClick={() => setRejectModal({ id: u.id, name: displayName, kind: 'user' })}>Reject</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openUserDetail(u)}>See</button>
                  </div>
                </div>
              </div>
            );
          })
      )}

      {/* ═══════════ SANGHA DETAIL MODAL ═══════════ */}
      {(viewModal || detailLoading) && (
        <Modal open title={detailLoading ? 'Loading...' : `Sangha Profile — ${viewModal!.name}`}
          onClose={() => { setViewModal(null); setLogoError(false); }} maxWidth="960px">
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading details...</div>
          ) : viewModal ? (
            <div style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, ...statusBadgeStyle(viewModal.status) }}>
                  {fmtStatus(viewModal.status)}
                </div>
                <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, border: '1px solid #fdba74', overflow: 'hidden', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewModal.logo_url && !logoError ? (
                    <img src={viewModal.logo_url} alt="logo" onError={() => setLogoError(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#fff7ed,#fdba74)' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: '#c2410c' }}>{viewModal.name?.[0]?.toUpperCase() ?? '?'}</span>
                      <span style={{ fontSize: 9, color: '#fed7aa', marginTop: 2 }}>No Logo</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fdba74', borderRadius: 12, padding: 24, borderLeft: '4px solid #7c3aed' }}>
                <SectionHeading title="Basic Information" />
                <FieldGrid cols={2}><ViewField label="Sangha Name" value={viewModal.name} /></FieldGrid>
                <div style={{ marginTop: 14 }}><ViewField label="Description" value={viewModal.description} /></div>

                <SectionHeading title="Registration Contact" />
                <FieldGrid cols={2}>
                  <ViewField label="Registered Email" value={viewModal.reg_email} />
                  <ViewField label="Registered Phone" value={viewModal.reg_phone} />
                </FieldGrid>

                <SectionHeading title="Sangha Contact" />
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9a3412' }}>Same as Registration Contact:</span>
                  <BoolPill value={!!viewModal.sangha_contact_same} />
                </div>
                <FieldGrid cols={2}>
                  <ViewField label="Sangha Email" value={viewModal.sangha_contact_same ? viewModal.reg_email : (viewModal.sangha_email || viewModal.reg_email)} />
                  <ViewField label="Sangha Phone" value={viewModal.sangha_contact_same ? viewModal.reg_phone : (viewModal.sangha_phone || viewModal.reg_phone)} />
                </FieldGrid>

                <SectionHeading title="Address" />
                <FieldGrid cols={2}>
                  <ViewField label="Address Line" value={viewModal.address_line} />
                  <ViewField label="Village / Town" value={viewModal.village_town} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}>
                  <FieldGrid cols={4}>
                    <ViewField label="Taluk" value={viewModal.taluk} />
                    <ViewField label="District" value={viewModal.location} />
                    <ViewField label="State" value={viewModal.state} />
                    <ViewField label="Pincode" value={viewModal.pincode} />
                  </FieldGrid>
                </div>

                <SectionHeading title="Status & Timeline" />
                <FieldGrid cols={2}>
                  <ViewField label="Current Status" value={fmtStatus(viewModal.status)} />
                  <ViewField label="Created At" value={fmtDate(viewModal.created_at)} />
                </FieldGrid>
                <div style={{ marginTop: 14 }}><ViewField label="Last Updated" value={fmtDate(viewModal.updated_at)} /></div>

                {(viewModal.status === 'rejected' || viewModal.status === 'suspended') && (
                  <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Rejection / Suspension Reason</span>
                    <span style={{ fontSize: 13, color: '#881337' }}>{viewModal.rejection_reason || 'No reason provided'}</span>
                  </div>
                )}

                <SectionHeading title={`Sangha Members (${viewModal.members?.length ?? 0})`} />
                {viewModal.members && viewModal.members.length > 0 ? (
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #fdba74' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#fff7ed' }}>
                          {['#', 'Name', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Role', 'Member Type'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '10px 10px', color: '#9a3412', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #fdba74', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewModal.members.map((m, i) => (
                          <tr key={m.id || i} style={{ borderBottom: '1px solid #fff7ed', background: i % 2 === 0 ? '#fff' : '#fff3e8' }}>
                            <td style={{ padding: '10px 10px', color: '#c2410c', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '10px 10px', color: '#7c2d12', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                                  {memberDisplayName(m)[0]?.toUpperCase() ?? '?'}
                                </div>
                                {memberDisplayName(m)}
                              </div>
                            </td>
                            <td style={{ padding: '10px 10px', color: '#9a3412' }}>{m.gender ? m.gender.charAt(0).toUpperCase() + m.gender.slice(1) : '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#9a3412', whiteSpace: 'nowrap' }}>{fmtDateOnly(m.dob) || '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#9a3412' }}>{m.phone || '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#9a3412' }}>{m.email || '—'}</td>
                            <td style={{ padding: '10px 10px', color: '#9a3412' }}>
                              {m.role ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#ede9fe', color: '#5b21b6', fontWeight: 600 }}>{m.role}</span> : '—'}
                            </td>
                            <td style={{ padding: '10px 10px', color: '#9a3412' }}>
                              {m.member_type ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#f0fdf4', color: '#065f46', fontWeight: 600 }}>{m.member_type}</span> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#c2410c', border: '1px dashed #fdba74', borderRadius: 8 }}>
                    No members found for this Sangha
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-success" disabled={actionLoading} onClick={() => { const s = pendingSanghas.find(i => i.id === viewModal.id); if (s) approveSangha(s); }}>Approve</button>
                <button className="btn btn-danger" disabled={actionLoading} onClick={() => { const s = pendingSanghas.find(i => i.id === viewModal.id); if (s) setRejectModal({ id: s.id, sangha_auth_id: s.sangha_auth_id, name: s.name, kind: 'sangha' }); }}>Reject</button>
                <button className="btn btn-secondary" onClick={() => setViewModal(null)}>Close</button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      {/* ═══════════ USER DETAIL MODAL ═══════════ */}
      {(userDetailModal || userDetailLoading) && (
        <Modal
          open
          title={userDetailLoading
            ? 'Loading...'
            : `User Profile — ${[userDetailModal?.step1?.first_name, userDetailModal?.step1?.last_name].filter(Boolean).join(' ') || userDetailModal?.user?.email || ''}`
          }
          onClose={() => setUserDetailModal(null)}
          maxWidth="1000px"
        >
          {userDetailLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading details...</div>
          ) : userDetailModal ? (
            <>
              <UserDetailContent d={userDetailModal} />

              {/* Action buttons */}
              {findUserItem(userDetailModal.user.id) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="btn btn-success" disabled={actionLoading}
                    onClick={() => { const u = findUserItem(userDetailModal.user.id); if (u) approveUser(u); }}>
                    Approve
                  </button>
                  <button className="btn btn-danger" disabled={actionLoading}
                    onClick={() => {
                      const displayName = `${userDetailModal.step1?.first_name ?? ''} ${userDetailModal.step1?.last_name ?? ''}`.trim() || userDetailModal.user.email;
                      setRejectModal({ id: userDetailModal.user.id, name: displayName, kind: 'user' });
                    }}>
                    Reject
                  </button>
                  <button className="btn btn-secondary" onClick={() => setUserDetailModal(null)}>Close</button>
                </div>
              )}
            </>
          ) : null}
        </Modal>
      )}

      {/* ═══════════ REJECT MODAL ═══════════ */}
      {rejectModal && (
        <Modal open title="Confirm Rejection"
          onClose={() => { setRejectModal(null); setReason(''); }} maxWidth="420px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setReason(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={actionLoading} onClick={confirmReject}>Confirm Rejection</button>
            </>
          }
        >
          <div className="alert alert-warning">
            You are about to reject <strong>{rejectModal.name}</strong>.
          </div>
          <label className="form-label">Reason</label>
          <textarea className="form-input form-textarea" placeholder="State a reason..." value={reason} onChange={e => setReason(e.target.value)} />
        </Modal>
      )}
    </div>
  );
}
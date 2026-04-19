/*harshi*/
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { useSearchParams } from 'next/navigation';


const BASE_URL = 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  review_comment?: string;
}

interface ProfileStep1 {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  fathers_name?: string;
  mothers_name?: string;
  mothers_maiden_name?: string;
  wife_name?: string;
  wife_maiden_name?: string;
  husbands_name?: string;
  is_married?: boolean;
  surname_in_use?: string;
  surname_as_per_gotra?: string;
  has_disability?: string;
  is_part_of_sangha?: string;
  sangha_name?: string;
  sangha_tenure?: string;
  sangha_role?: string;
}

interface ProfileStep2 {
  gotra?: string;
  pravara?: string;
  upanama?: string;
  upanama_general?: string;
  upanama_proper?: string;
  kuladevata?: string;
  kuladevata_other?: string;
  demi_god?: string;
  demi_god_notes?: string;
  demi_god_challenge?: string;
  priest_name?: string;
  priest_location?: string;
  surname_in_use?: string;
  surname_as_per_gotra?: string;
}

interface FamilyMember {
  id?: string;
  name?: string;
  relation?: string;
  gender?: string;
  dob?: string;
  age?: string | number;
  status?: string;
  disability?: string;
  photo_url?: string;
  sort_order?: number;
}

interface FamilyInfo {
  family_type?: string;
}

interface Address {
  id?: string;
  address_type?: string;
  flat_no?: string;
  building?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  taluk?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

interface Certification {
  edu_id: string;
  certification?: string;
  sort_order?: number;
}

interface Language {
  edu_id: string;
  language?: string;
  language_other?: string;
}

interface EducationRow {
  id?: string;
  member_name?: string;
  member_relation?: string;
  sort_order?: number;
  highest_education?: string;
  brief_profile?: string;
  profession_type?: string;
  profession_other?: string;
  self_employed_type?: string;
  self_employed_other?: string;
  industry?: string;
  is_currently_studying?: boolean;
}

interface EconomicDetails {
  self_income?: string;
  family_income?: string;
  inv_fixed_deposits?: boolean;
  inv_mutual_funds_sip?: boolean;
  inv_shares_demat?: boolean;
  inv_others?: boolean;
  fac_rented_house?: boolean;
  fac_own_house?: boolean;
  fac_agricultural_land?: boolean;
  fac_two_wheeler?: boolean;
  fac_car?: boolean;
}

interface InsuranceRow {
  member_name?: string;
  member_relation?: string;
  health_coverage?: string[];
  life_coverage?: string[];
  term_coverage?: string[];
  konkani_card_coverage?: string[];
}

interface DocumentRow {
  member_name?: string;
  member_relation?: string;
  aadhaar_coverage?: string[];
  pan_coverage?: string[];
  voter_id_coverage?: string[];
  land_doc_coverage?: string[];
  dl_coverage?: string[];
  all_records_coverage?: string[];
}

interface FamilyHistory {
  ancestral_challenge_notes?: string;
  demigods_info?: string;
  snake_god_naga_info?: string;
  common_relative_names?: string;
}

interface SanghaInfo {
  id?: string;
  name?: string;
  sangha_name?: string;
  district?: string;
  state?: string;
  village_town?: string;
  taluk?: string;
  address_line?: string;
  pincode?: string;
  sangha_email?: string;
  sangha_phone?: string;
  email?: string;
  phone?: string;
  status?: string;
  description?: string;
}

interface ProfileData {
  user: { id: string; email: string; phone: string };
  profile: {
    id: string;
    status: string;
    photo_url?: string;
    photo_uploaded_at?: string;
    submitted_at?: string;
    reviewed_at?: string;
    review_comment?: string;
    overall_completion_pct?: number;
    step1_personal_pct?: number;
    step2_religious_pct?: number;
    step3_family_pct?: number;
    step4_location_pct?: number;
    step5_education_pct?: number;
    step6_economic_pct?: number;
    step1_completed?: boolean;
    step2_completed?: boolean;
    step3_completed?: boolean;
    step4_completed?: boolean;
    step5_completed?: boolean;
    step6_completed?: boolean;
    sangha_id?: string;
  };
  step1: ProfileStep1 | null;
  step2: ProfileStep2 | null;
  step3: { family_info: FamilyInfo | null; members: FamilyMember[] };
  step4: Address[];
  step5: EducationRow[];
  step5_certifications: Certification[];
  step5_languages: Language[];
  step6: {
    economic: EconomicDetails | null;
    insurance: InsuranceRow[];
    documents: DocumentRow[];
    family_history: FamilyHistory | null;
  };
  sangha?: SanghaInfo | null;
}

type Tab = 'approved'  | 'rejected';

const STATUS_TABS: { key: Tab; label: string }[] = [
  { key: 'approved', label: 'Approved' },
  
  { key: 'rejected', label: 'Rejected' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw?: string | null): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function hasCoverage(arr?: string[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function coverageLabel(arr?: string[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ');
}

function findMemberRow<T extends { member_name?: string; member_relation?: string }>(
  rows: T[], name: string, relation: string
): T | undefined {
  return rows.find(r => r.member_name === name && r.member_relation === relation);
}

const normalizeStatus = (status?: string): Tab | null => {
  const s = status?.toLowerCase().trim();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return null;
};

const getStatusLabel = (status?: string): string => {
  if (!status) return '—';
  const s = status.toLowerCase().trim();
  const map: Record<string, string> = {
    approved: 'Approved', rejected: 'Rejected', submitted: 'Submitted',
    under_review: 'Under Review', changes_requested: 'Changes Requested', draft: 'Draft',
  };
  return map[s] ?? (status.charAt(0).toUpperCase() + status.slice(1));
};

const getStatusBadgeStyles = (status?: string) => {
  const s = status?.toLowerCase().trim();
  if (s === 'approved') return { background: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' };
  if (s === 'rejected') return { background: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
  return { background: '#fef3c7', color: '#92400e', border: '#fde68a' };
};

const INCOME_SLAB_LABELS: Record<string, string> = {
  below_1l: 'Less than 1 Lakh', '1_2l': '₹1 – 2 Lakh', '2_3l': '₹2 – 3 Lakh',
  '3_5l': '₹3 – 5 Lakh', '5_10l': '₹5 – 10 Lakh', '10_25l': '₹10 – 25 Lakh', '25l_plus': '₹25 Lakh+',
};
const getIncomeLabel = (val?: string) => val ? (INCOME_SLAB_LABELS[val] ?? val) : '—';

// ─── PDF Download Helper ──────────────────────────────────────────────────────

function downloadAsPdf(data: object, filename: string) {
  const loadAndDownload = () => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(JSON.stringify(data, null, 2), 180);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(10);
    doc.text(lines, 14, 20);
    doc.save(`${filename}.pdf`);
  };
  // @ts-ignore
  if (window.jspdf) {
    loadAndDownload();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = loadAndDownload;
    document.head.appendChild(script);
  }
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const tabColor = (key: Tab) => {
  if (key === 'approved') return { active: '#7c3aed', badge: '#7c3aed', badgeText: '#fff', inactiveBadge: '#ede9fe', inactiveBadgeText: '#5b21b6' };
  
  return                         { active: '#374151', badge: '#374151', badgeText: '#fff', inactiveBadge: '#f3f4f6', inactiveBadgeText: '#374151' };
};

const summaryAccent = (key: Tab) => key === 'approved' ? '#7c3aed' : '#374151';
const summaryBg     = (key: Tab) => key === 'approved' ? '#ede9fe' : '#f3f4f6';

// ─── UI Primitives ────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <div style={{ paddingBottom: 8, borderBottom: '2px solid #ede9fe', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#4c1d95', margin: 0, letterSpacing: '0.01em' }}>{title}</h3>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />;
}

function EmptyNote({ text = 'Not filled yet.' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px dashed #e5e7eb' }}>
      <span style={{ fontSize: 14, color: '#9ca3af' }}>—</span>
      <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>{text}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </span>
    </div>
  );
}

function FieldGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600, border: '1px solid',
      background: value ? '#dcfce7' : '#f3f4f6',
      color: value ? '#064e3b' : '#6b7280',
      borderColor: value ? '#86efac' : '#e5e7eb',
    }}>
      {value ? '✓ Yes' : 'No'}
    </span>
  );
}

function CoverageRow({ label, arr }: { label: string; arr?: string[] }) {
  const covered = hasCoverage(arr);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px', borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
        {covered && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>({coverageLabel(arr)})</span>
        )}
      </div>
      <YesNoBadge value={covered} />
    </div>
  );
}

function BoolChip({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 10px', borderRadius: 6, fontSize: 11,
      background: value ? '#f0fdf4' : '#f9fafb',
      border: `1px solid ${value ? '#86efac' : '#e5e7eb'}`,
    }}>
      <span style={{ color: '#374151', fontWeight: 500 }}>{label}</span>
      <span style={{ color: value ? '#064e3b' : '#9ca3af', fontWeight: 700 }}>{value ? '✓' : '—'}</span>
    </div>
  );
}

function IncomeCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 2 }}>{label}</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{value}</p>
    </div>
  );
}

function AddressCard({ addr }: { addr: Address }) {
  const line1 = [addr.flat_no, addr.building, addr.street, addr.area].filter(Boolean).join(', ');
  const line2 = [addr.taluk, addr.district, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  //google maps location not enetred also is handled
  const hasCoords = addr.latitude != null && addr.longitude != null && addr?.latitude !== undefined &&
  addr?.longitude !== undefined;;

  const addrTypeLabel: Record<string, string> = {
    current: '🏠 Current Address',
    hometown: '🏡 Home Town',
    permanent: '📍 Permanent Address',
    office: '🏢 Office Address',
  };
  const title = addr.address_type
    ? (addrTypeLabel[addr.address_type] ?? `📌 ${addr.address_type.charAt(0).toUpperCase() + addr.address_type.slice(1)}`)
    : '📌 Address';

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontSize: 12, background: '#fafafa' }}>
      <p style={{ fontWeight: 700, color: '#111827', fontSize: 12, margin: '0 0 8px' }}>{title}</p>
      {line1 && <p style={{ color: '#374151', margin: '0 0 2px', fontSize: 13 }}>{line1}</p>}
      {line2 && <p style={{ color: '#6b7280', margin: 0, fontSize: 12 }}>{line2}</p>}
      {!line1 && !line2 && <p style={{ color: '#9ca3af', margin: 0 }}>—</p>}
      //view on map 
      {hasCoords && (
        <a
          href={`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: '#7c3aed', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
        >
          📍 View on Map
        </a>
      )}
    </div>
  );
}

// ─── Profile Photo ────────────────────────────────────────────────────────────

function ProfilePhoto({ photoUrl, name }: { photoUrl?: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  if (photoUrl && !imgError) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={photoUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{
            width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
            border: '3px solid rgba(255,255,255,0.4)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            display: 'block',
          }}
        />
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: '#22c55e', border: '2px solid #fff',
        }} />
      </div>
    );
  }

  return (
    <div style={{
      width: 88, height: 88, borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      border: '3px solid rgba(255,255,255,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 28, fontWeight: 800,
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      letterSpacing: '0.05em', flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

// ─── Completion Overview ──────────────────────────────────────────────────────

function CompletionOverview({ profile }: { profile: ProfileData['profile'] }) {
  const steps = [
    { label: 'Personal',  pct: profile.step1_personal_pct  ?? 0, done: profile.step1_completed },
    { label: 'Religious', pct: profile.step2_religious_pct ?? 0, done: profile.step2_completed },
    { label: 'Family',    pct: profile.step3_family_pct    ?? 0, done: profile.step3_completed },
    { label: 'Location',  pct: profile.step4_location_pct  ?? 0, done: profile.step4_completed },
    { label: 'Education', pct: profile.step5_education_pct ?? 0, done: profile.step5_completed },
    { label: 'Economic',  pct: profile.step6_economic_pct  ?? 0, done: profile.step6_completed },
  ];
  const overall = profile.overall_completion_pct ?? 0;
  const overallColor = overall >= 80 ? '#22c55e' : overall >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10,
      padding: '14px 16px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📊 Profile Completion
        </span>
        <span style={{
          fontSize: 15, fontWeight: 800, color: overallColor,
          background: '#fff', padding: '2px 12px', borderRadius: 99,
          border: `2px solid ${overallColor}`,
        }}>
          {overall}%
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {steps.map(s => (
          <div key={s.label} style={{ flex: '1 1 100px', minWidth: 90 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>
                {s.done ? '✓ ' : ''}{s.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                {s.pct}%
              </span>
            </div>
            <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${s.pct}%`, height: '100%', borderRadius: 99,
                background: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444',
              }} />
            </div>
          </div>
        ))}
      </div>
      {(profile.submitted_at || profile.reviewed_at) && (
        <p style={{ fontSize: 11, color: '#7c3aed', margin: '10px 0 0', fontWeight: 500 }}>
          {profile.submitted_at && `Submitted: ${formatDate(profile.submitted_at)}`}
          {profile.submitted_at && profile.reviewed_at && '  ·  '}
          {profile.reviewed_at && `Reviewed: ${formatDate(profile.reviewed_at)}`}
        </p>
      )}
      {profile.review_comment && (
        <div style={{
          marginTop: 8, padding: '6px 10px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 6,
        }}>
          
        </div>
      )}
    </div>
  );
}

// ─── Sangha Card ──────────────────────────────────────────────────────────────

function SanghaCard({ sangha, sanghaId }: { sangha?: SanghaInfo | null; sanghaId?: string }) {
  if (!sanghaId && !sangha) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 8,
      }}>
        <span style={{ fontSize: 22 }}>🏛️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', margin: 0 }}>Not associated with any Sangha</p>
          <p style={{ fontSize: 11, color: '#d1d5db', margin: '2px 0 0' }}>This user has not joined a Sangha</p>
        </div>
      </div>
    );
  }

  if (sanghaId && !sangha) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
      }}>
        <span style={{ fontSize: 22 }}>🏛️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>Sangha assigned but details unavailable</p>
          <p style={{ fontSize: 11, color: '#b45309', margin: '2px 0 0' }}>ID: {sanghaId}</p>
        </div>
      </div>
    );
  }

  const displayName = sangha!.name || sangha!.sangha_name || 'Unknown Sangha';
  const location = [sangha!.village_town, sangha!.taluk, sangha!.district, sangha!.state]
    .filter(Boolean).join(', ') || sangha!.address_line || null;
  const contactEmail = sangha!.sangha_email || sangha!.email;
  const contactPhone = sangha!.sangha_phone || sangha!.phone;
  const statusBadge = sangha!.status === 'approved'
    ? { bg: '#dcfce7', color: '#064e3b', border: '#86efac' }
    : { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };

  return (
    <div style={{
      padding: '14px 16px', background: '#faf5ff',
      border: '1px solid #e9d5ff', borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: '#ede9fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          🏛️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', margin: 0 }}>{displayName}</p>
            {sangha!.status && (
              <span style={{
                padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
              }}>
                {sangha!.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
          </div>
          {location && <p style={{ fontSize: 12, color: '#7c3aed', margin: '0 0 6px' }}>📍 {location}</p>}
          {sangha!.description && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontStyle: 'italic' }}>{sangha!.description}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {contactEmail && <span style={{ fontSize: 11, color: '#6b7280' }}>✉️ {contactEmail}</span>}
            {contactPhone && <span style={{ fontSize: 11, color: '#6b7280' }}>📞 {contactPhone}</span>}
            {sangha!.pincode && <span style={{ fontSize: 11, color: '#6b7280' }}>📮 {sangha!.pincode}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Education Card ───────────────────────────────────────────────────────────

function EduCard({ edu, certs, langs, label }: {
  edu: EducationRow;
  certs: Certification[];
  langs: Language[];
  label: string;
}) {
  const profLabel = edu.is_currently_studying
    ? 'Currently Studying'
    : [edu.profession_type, edu.profession_other].filter(Boolean).join(' — ') || undefined;

  const selfEmpLabel = edu.self_employed_type
    ? [edu.self_employed_type, edu.self_employed_other].filter(Boolean).join(' — ')
    : undefined;

  const hasAnyData = edu.highest_education || profLabel || edu.industry || selfEmpLabel
    || edu.brief_profile || certs.length > 0 || langs.length > 0;

  if (!hasAnyData) return null;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontSize: 12, background: '#fafafa' }}>
      <p style={{ fontWeight: 700, color: '#111827', fontSize: 13, margin: '0 0 12px' }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: certs.length || langs.length ? 12 : 0 }}>
        <Field label="Highest Education"   value={edu.highest_education} />
        <Field label="Profession"          value={profLabel} />
        <Field label="Industry"            value={edu.industry} />
        {selfEmpLabel && <Field label="Self-Employed Type" value={selfEmpLabel} />}
        {edu.brief_profile && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Brief Profile" value={edu.brief_profile} />
          </div>
        )}
      </div>
      {certs.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Certifications
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {certs.map((c, i) => (
              <span key={i} style={{
                padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd',
              }}>
                {c.certification}
              </span>
            ))}
          </div>
        </div>
      )}
      {langs.length > 0 && (
        <div>
          <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Languages
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {langs.map((l, i) => (
              <span key={i} style={{
                padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb',
              }}>
                {l.language_other || l.language}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Insurance / Documents boxes ─────────────────────────────────────────────

function InsuranceBox({ row }: { row: InsuranceRow }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <CoverageRow label="Health Insurance" arr={row.health_coverage} />
      <CoverageRow label="Life Insurance"   arr={row.life_coverage} />
      <CoverageRow label="Term Insurance"   arr={row.term_coverage} />
      <CoverageRow label="Konkani Card"     arr={row.konkani_card_coverage} />
    </div>
  );
}

function DocumentsBox({ row }: { row: DocumentRow }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <CoverageRow label="Aadhaar"         arr={row.aadhaar_coverage} />
      <CoverageRow label="PAN"             arr={row.pan_coverage} />
      <CoverageRow label="Voter ID"        arr={row.voter_id_coverage} />
      <CoverageRow label="Land Docs"       arr={row.land_doc_coverage} />
      <CoverageRow label="Driving License" arr={row.dl_coverage} />
      <CoverageRow label="All Records"     arr={row.all_records_coverage} />
    </div>
  );
}

// ─── ProfileDetail ────────────────────────────────────────────────────────────

function ProfileDetail({
  data, onApprove, onReject, isMutating,
}: {
  data: ProfileData;
  onApprove: () => void;
  onReject: () => void;
  isMutating: boolean;
}) {
  const s1      = data.step1;
  const s2      = data.step2;
  const members = data.step3?.members ?? [];
  const famInfo = data.step3?.family_info;
  const s4      = data.step4 ?? [];
  const s5      = data.step5 ?? [];
  const s5cert  = data.step5_certifications ?? [];
  const s5lang  = data.step5_languages ?? [];
  const s6eco   = data.step6?.economic;
  const s6ins   = data.step6?.insurance ?? [];
  const s6doc   = data.step6?.documents ?? [];
  const famHist = data.step6?.family_history;

  const profileStatus = data.profile?.status ?? '';
  const photoUrl      = data.profile?.photo_url;

  const certsByEduId: Record<string, Certification[]> = {};
  s5cert.forEach(c => {
    if (!certsByEduId[c.edu_id]) certsByEduId[c.edu_id] = [];
    certsByEduId[c.edu_id].push(c);
  });
  const langsByEduId: Record<string, Language[]> = {};
  s5lang.forEach(l => {
    if (!langsByEduId[l.edu_id]) langsByEduId[l.edu_id] = [];
    langsByEduId[l.edu_id].push(l);
  });

  const fullName  = s1
    ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(' ')
    : (data.user?.email ?? '?');
  const selfName  = s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(' ') : '';
  const selfIns   = findMemberRow(s6ins, selfName, 'Self') ?? s6ins.find(r => r.member_relation === 'Self');
  const selfDoc   = findMemberRow(s6doc, selfName, 'Self') ?? s6doc.find(r => r.member_relation === 'Self');

  const currentAddr  = s4.find(a => a.address_type === 'current');
  const hometownAddr = s4.find(a => a.address_type === 'hometown');
  const otherAddrs   = s4.filter(a => a.address_type !== 'current' && a.address_type !== 'hometown');

  const hasAnyFamHist = famHist && (
    famHist.ancestral_challenge_notes || famHist.demigods_info ||
    famHist.snake_god_naga_info || famHist.common_relative_names
  );

  const isPartOfSangha = s1?.is_part_of_sangha === 'yes';

  return (
    <div>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)',
        borderRadius: 12, padding: '22px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ flex: 1, zIndex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {fullName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            {s1?.gender && (
              <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 500 }}>
                {s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1)}
              </span>
            )}
            {s1?.date_of_birth && (
              <span style={{ fontSize: 12, color: '#c4b5fd' }}>🎂 {formatDate(s1.date_of_birth)}</span>
            )}
            {s1?.is_married !== undefined && (
              <span style={{
                padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: '#e9d5ff',
              }}>
                {s1.is_married ? 'Married' : 'Single'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {data.user?.phone && (
              <span style={{ fontSize: 12, color: '#e9d5ff' }}>📞 {data.user.phone}</span>
            )}
            {data.user?.email && (
              <span style={{ fontSize: 12, color: '#e9d5ff' }}>✉️ {data.user.email}</span>
            )}
          </div>

          {/* Status + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', padding: '4px 14px',
              borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              {getStatusLabel(profileStatus)}
            </div>
            {normalizeStatus(profileStatus) === null && (
  <>
    <button onClick={onApprove} disabled={isMutating} style={{
      background: '#dcfce7', color: '#064e3b', border: '1px solid #86efac',
      borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: 12,
      cursor: isMutating ? 'not-allowed' : 'pointer', opacity: isMutating ? 0.6 : 1,
    }}>✓ Approve</button>
    <button onClick={onReject} disabled={isMutating} style={{
      background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
      borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: 12,
      cursor: isMutating ? 'not-allowed' : 'pointer', opacity: isMutating ? 0.6 : 1,
    }}>✕ Reject</button>
  </>
)}
               
          
          </div>
        </div>

        {/* Profile Photo — top right */}
        <div style={{ zIndex: 1, flexShrink: 0, textAlign: 'center' }}>
          <ProfilePhoto photoUrl={photoUrl} name={fullName} />
          {photoUrl && data.profile.photo_uploaded_at && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>
              {formatDate(data.profile.photo_uploaded_at)}
            </p>
          )}
          {!photoUrl && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontStyle: 'italic' }}>
              No photo
            </p>
          )}
        </div>
      </div>
{data.profile?.status === 'rejected' && data.profile?.review_comment && (
  <div style={{
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 12,
    fontWeight: 600,
  }}>
    💬 Rejection Reason: {data.profile.review_comment}
  </div>
)}
      {/* ══ COMPLETION OVERVIEW ══ */}
      <CompletionOverview profile={data.profile} />

      {/* ══ SANGHA AFFILIATION ══ */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <SectionHeader title="Sangha Affiliation" icon="🏛️" />
        <SanghaCard sangha={data.sangha} sanghaId={data.profile?.sangha_id} />
        {isPartOfSangha && (s1?.sangha_name || s1?.sangha_role || s1?.sangha_tenure) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
              Member's Self-Reported Sangha Info
            </p>
            <FieldGrid cols={3}>
              <Field label="Sangha Name"    value={s1.sangha_name} />
              <Field label="Role in Sangha" value={s1.sangha_role} />
              <Field label="Tenure"         value={s1.sangha_tenure} />
            </FieldGrid>
          </div>
        )}
      </div>

      {/* ══ MAIN INFO CARD ══ */}
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
        padding: 20, marginBottom: 16, borderLeft: '4px solid #7c3aed',
      }}>

        {/* ── Personal Details ── */}
        <SectionHeader title="Personal Details" icon="👤" />
        {s1 ? (
          <FieldGrid cols={3}>
            <Field label="First Name"           value={s1.first_name} />
            <Field label="Middle Name"          value={s1.middle_name} />
            <Field label="Last Name"            value={s1.last_name} />
            <Field label="Gender"
              value={s1.gender ? (s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1)) : undefined}
            />
            <Field label="Date of Birth"        value={formatDate(s1.date_of_birth)} />
            <Field label="Marital Status"       value={s1.is_married ? 'Married' : 'Single / Unmarried'} />
            <Field label="Father's Name"        value={s1.fathers_name} />
            <Field label="Mother's Name"        value={s1.mothers_name} />
            <Field label="Mother's Maiden Name" value={s1.mothers_maiden_name} />
            {s1.is_married && s1.gender?.toLowerCase() === 'male' && (
              <>
                <Field label="Wife's Name"        value={s1.wife_name} />
                <Field label="Wife's Maiden Name" value={s1.wife_maiden_name} />
              </>
            )}
            {s1.is_married && s1.gender?.toLowerCase() === 'female' && (
              <Field label="Husband's Name" value={s1.husbands_name} />
            )}
            <Field label="Surname in Use"    value={s1.surname_in_use} />
            <Field label="Surname (Gotra)"   value={s1.surname_as_per_gotra} />
            <Field label="Has Disability"
              value={s1.has_disability === 'yes' ? 'Yes' : s1.has_disability === 'no' ? 'No' : s1.has_disability}
            />
            <Field label="Part of Sangha"
              value={s1.is_part_of_sangha === 'yes' ? 'Yes' : s1.is_part_of_sangha === 'no' ? 'No' : s1.is_part_of_sangha}
            />
            <Field label="Phone"  value={data.user?.phone} />
            <Field label="Email"  value={data.user?.email} />
          </FieldGrid>
        ) : <EmptyNote text="Personal details not filled yet." />}

        <Divider />

        {/* ── Religious Details ── */}
        <SectionHeader title="Religious Details" icon="🕉️" />
        {s2 ? (
          <FieldGrid cols={3}>
            <Field label="Gotra"               value={s2.gotra} />
            <Field label="Pravara"             value={s2.pravara} />
            <Field label="Upanama"             value={s2.upanama} />
            <Field label="Upanama (General)"   value={s2.upanama_general} />
            <Field label="Upanama (Proper)"    value={s2.upanama_proper} />
            <Field label="Kuladevata"          value={s2.kuladevata_other || s2.kuladevata} />
            <Field label="Demi God"            value={s2.demi_god} />
            <Field label="Demi God Notes"      value={s2.demi_god_notes} />
            <Field label="Demi God Challenge"  value={s2.demi_god_challenge} />
            <Field label="Family Priest"       value={s2.priest_name} />
            <Field label="Priest Location"     value={s2.priest_location} />
            <Field label="Surname in Use"      value={s2.surname_in_use} />
            <Field label="Surname (Gotra)"     value={s2.surname_as_per_gotra} />
          </FieldGrid>
        ) : <EmptyNote text="Religious details not filled yet." />}

        <Divider />

        {/* ── Addresses ── */}
        <SectionHeader title="Addresses" icon="📍" />
        {s4.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {currentAddr  && <AddressCard addr={currentAddr} />}
            {hometownAddr && <AddressCard addr={hometownAddr} />}
            {otherAddrs.map((a, i) => <AddressCard key={i} addr={a} />)}
          </div>
        ) : <EmptyNote text="No addresses added yet." />}

        <Divider />

        {/* ── Education & Profession ── */}
        <SectionHeader title="Education & Profession" icon="🎓" />
        {s5.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s5.map((edu, i) => {
              const certs = edu.id ? (certsByEduId[edu.id] ?? []) : [];
              const langs = edu.id ? (langsByEduId[edu.id] ?? []) : [];
              const lbl = i === 0
                ? 'Self'
                : `${edu.member_name || `Member ${i}`}${edu.member_relation ? ` (${edu.member_relation})` : ''}`;
              return <EduCard key={i} edu={edu} certs={certs} langs={langs} label={lbl} />;
            })}
          </div>
        ) : <EmptyNote text="Education & profession details not filled yet." />}

        <Divider />

        {/* ── Economic Details ── */}
        <SectionHeader title="Economic Details" icon="💰" />
        {s6eco ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <IncomeCard label="Self Income"   value={getIncomeLabel(s6eco.self_income)} />
              <IncomeCard label="Family Income" value={getIncomeLabel(s6eco.family_income)} />
            </div>

            <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Investments
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              <BoolChip label="Fixed Deposits"     value={!!s6eco.inv_fixed_deposits} />
              <BoolChip label="Mutual Funds / SIP" value={!!s6eco.inv_mutual_funds_sip} />
              <BoolChip label="Shares / Demat"     value={!!s6eco.inv_shares_demat} />
              <BoolChip label="Others"             value={!!s6eco.inv_others} />
            </div>

            <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assets & Facilities
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              <BoolChip label="Own House"         value={!!s6eco.fac_own_house} />
              <BoolChip label="Rented House"      value={!!s6eco.fac_rented_house} />
              <BoolChip label="Agricultural Land" value={!!s6eco.fac_agricultural_land} />
              <BoolChip label="Two Wheeler"       value={!!s6eco.fac_two_wheeler} />
              <BoolChip label="Car"               value={!!s6eco.fac_car} />
            </div>

            {(selfIns || selfDoc) && (
              <div style={{ display: 'grid', gridTemplateColumns: selfDoc ? '1fr 1fr' : '1fr', gap: 12 }}>
                {selfIns && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', margin: '0 0 6px', textTransform: 'uppercase' }}>
                      Insurance
                    </p>
                    <InsuranceBox row={selfIns} />
                  </div>
                )}
                {selfDoc && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', margin: '0 0 6px', textTransform: 'uppercase' }}>
                      Documents
                    </p>
                    <DocumentsBox row={selfDoc} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : <EmptyNote text="Economic details not filled yet." />}

      </div>

      {/* ══ FAMILY MEMBERS CARD ══ */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <SectionHeader title="Family Members" icon="👨‍👩‍👧‍👦" />

        {famInfo?.family_type && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
            background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 20,
            padding: '4px 14px',
          }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Family Type:</span>
            <strong style={{ fontSize: 12, color: '#4c1d95' }}>
              {famInfo.family_type.charAt(0).toUpperCase() + famInfo.family_type.slice(1)}
            </strong>
          </div>
        )}

        {members.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {members.map((member, idx) => {
              const memberEdu = s5[idx + 1];
              const mName     = member.name ?? '';
              const mRelation = member.relation ?? '';
              const memberIns = findMemberRow(s6ins, mName, mRelation);
              const memberDoc = findMemberRow(s6doc, mName, mRelation);
              const mCerts    = memberEdu?.id ? (certsByEduId[memberEdu.id] ?? []) : [];
              const mLangs    = memberEdu?.id ? (langsByEduId[memberEdu.id] ?? []) : [];

              const memberStatusStyle = {
                active:       { bg: '#dcfce7', color: '#064e3b', border: '#86efac' },
                passed_away:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
                unknown:      { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
              }[member.status ?? 'unknown'] ?? { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };

              return (
                <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Member header */}
                  <div style={{
                    background: '#f9fafb', padding: '12px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name ?? ''} style={{
                        width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
                        border: '2px solid #ede9fe', flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: '#ede9fe', color: '#5b21b6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14, flexShrink: 0,
                      }}>
                        {member.name?.[0]?.toUpperCase() ?? String(idx + 1)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: 14, color: '#111827' }}>
                        {member.name || '—'}
                      </p>
                      <p style={{ color: '#7c3aed', margin: 0, fontSize: 12, fontWeight: 500 }}>
                        {member.relation || '—'}
                      </p>
                    </div>
                    {member.status && (
                      <span style={{
                        padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: memberStatusStyle.bg, color: memberStatusStyle.color,
                        border: `1px solid ${memberStatusStyle.border}`,
                      }}>
                        {member.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    )}
                  </div>

                  {/* Member body */}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
                      <Field label="Gender"
                        value={member.gender ? (member.gender.charAt(0).toUpperCase() + member.gender.slice(1)) : undefined}
                      />
                      <Field label="Date of Birth" value={formatDate(member.dob)} />
                      <Field label="Age"           value={member.age != null ? String(member.age) : undefined} />
                      <Field label="Disability"
                        value={member.disability === 'yes' ? 'Yes' : member.disability === 'no' ? 'No' : member.disability}
                      />
                    </div>

                    {memberEdu && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{
                          fontSize: 11, fontWeight: 700, color: '#6b7280',
                          letterSpacing: '0.05em', margin: '0 0 8px', textTransform: 'uppercase',
                        }}>
                          Education & Profession
                        </p>
                        <EduCard
                          edu={memberEdu}
                          certs={mCerts}
                          langs={mLangs}
                          label={`${member.name || 'Member'}${member.relation ? ` (${member.relation})` : ''}`}
                        />
                      </div>
                    )}

                    {(memberIns || memberDoc) && (
                      <div style={{ display: 'grid', gridTemplateColumns: memberDoc ? '1fr 1fr' : '1fr', gap: 12 }}>
                        {memberIns && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', margin: '0 0 6px', textTransform: 'uppercase' }}>
                              Insurance
                            </p>
                            <InsuranceBox row={memberIns} />
                          </div>
                        )}
                        {memberDoc && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', margin: '0 0 6px', textTransform: 'uppercase' }}>
                              Documents
                            </p>
                            <DocumentsBox row={memberDoc} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyNote text="No family members added." />
        )}
      </div>

      {/* ══ FAMILY HISTORY CARD ══ */}
      {hasAnyFamHist && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Family History" icon="📜" />
          <FieldGrid cols={2}>
            <Field label="Ancestral Challenge Notes" value={famHist!.ancestral_challenge_notes} />
            <Field label="Demigods Info"             value={famHist!.demigods_info} />
            <Field label="Snake God / Naga Info"     value={famHist!.snake_god_naga_info} />
            <Field label="Common Relative Names"     value={famHist!.common_relative_names} />
          </FieldGrid>
        </div>
      )}

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

const [statusTab, setStatusTab] = useState<Tab>('approved');


useEffect(() => {
  const status = searchParams.get('status');

  if (status === 'approved' || status === 'rejected') {
    setStatusTab(status);
  }
}, [searchParams]);
  const [search, setSearch]                 = useState('');
  const [list, setList]                     = useState<UserItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [isFocused, setIsFocused]           = useState(false);

  const [modal, setModal]                   = useState<UserItem | null>(null);
  const [profileData, setProfileData]       = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isMutating, setIsMutating]         = useState(false);

  const getToken = useCallback(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return null; }
    return token;
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/admin/users/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : data.users ?? []))
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

        if (data.profile?.sangha_id) {
          try {
            const sanghaRes = await fetch(
              `${BASE_URL}/api/admin/sangha/${data.profile.sangha_id}/detail`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            data.sangha = sanghaRes.ok ? await sanghaRes.json() : null;
          } catch {
            data.sangha = null;
          }
        } else {
          data.sangha = null;
        }

        setProfileData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeModal = () => { setModal(null); setProfileData(null); };

  const handleApprove = async () => {
    if (!modal) return;
    if (!confirm(`Approve profile for ${modal.first_name || modal.email}?`)) return;
    setIsMutating(true);
    const token = getToken();
    if (!token) { setIsMutating(false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: modal.id }),
      });
      if (res.ok) {
        setList(prev => prev.map(u => u.id === modal.id ? { ...u, status: 'approved' } : u));
        setModal(prev => prev ? { ...prev, status: 'approved' } : prev);
        setProfileData(prev => prev ? { ...prev, profile: { ...prev.profile, status: 'approved' } } : prev);
        alert('User approved ✅');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    } finally {
      setIsMutating(false);
    }
  };

  const handleReject = async () => {
    if (!modal) return;
    const comment = prompt('Reason for rejection (optional):') ?? '';
    setIsMutating(true);
    const token = getToken();
    if (!token) { setIsMutating(false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: modal.id, comment }),
      });
      if (res.ok) {
        setList(prev => prev.map(u => u.id === modal.id ? { ...u, status: 'rejected' } : u));
        setModal(prev => prev ? { ...prev, status: 'rejected' } : prev);
        setProfileData(prev => prev ? { ...prev, profile: { ...prev.profile, status: 'rejected' } } : prev);
        alert('User rejected ✅');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    } finally {
      setIsMutating(false);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Sangha', 'Status', 'Completion'];
    const rows = filtered.map(u => [
      u.id,
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      u.email, u.phone, u.sangha_name || 'Not in Sangha', u.status,
      u.overall_completion_pct != null ? `${u.overall_completion_pct}%` : '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${statusTab}_users_export.csv`;
    a.click();
  };

const countFor = (t: Tab) => list.filter(u => normalizeStatus(u.status) === t).length;
 const filtered = list
  .filter(u => normalizeStatus(u.status) === statusTab)
  .filter(u => {
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
    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading...</div>
  );

  return (
    <div style={{ padding: '24px 28px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        {STATUS_TABS.map(({ key, label }) => (
          <div key={key} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '14px 22px', minWidth: 150, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: summaryBg(key),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: summaryAccent(key),
            }}>
              {countFor(key)}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label} Users</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        {STATUS_TABS.map(({ key, label }) => {
          const cfg = tabColor(key);
          const isActive = statusTab === key;
          return (
            <button key={key} onClick={() => { setStatusTab(key); setSearch(''); }} style={{
              padding: '10px 22px', fontWeight: isActive ? 700 : 400, fontSize: 14,
              background: 'none', border: 'none',
              borderBottom: isActive ? `2px solid ${cfg.active}` : '2px solid transparent',
              color: isActive ? cfg.active : '#6b7280', cursor: 'pointer',
              transition: 'all .15s', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {label}
              <span style={{
                background: isActive ? cfg.badge : cfg.inactiveBadge,
                color: isActive ? cfg.badgeText : cfg.inactiveBadgeText,
                borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 8px',
              }}>
                {countFor(key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Export ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
          border: `1.5px solid ${isFocused ? '#7c3aed' : '#e5e7eb'}`, borderRadius: 6,
          padding: '8px 12px', flex: 1, maxWidth: 380, minWidth: 200, transition: 'border-color 0.2s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={`Search ${statusTab} users...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              fontSize: 13, fontFamily: 'inherit', color: '#374151',
            }}
          />
        </div>
        <button onClick={handleExport} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: '#fff',
          border: '1.5px solid #e5e7eb', borderRadius: 6, padding: '8px 16px',
          fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer',
          whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}>
          ⬇ Export CSV
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['ID', 'Name', 'Email', 'Phone', 'Sangha', 'Status', 'Completion', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
              const badge = getStatusBadgeStyles(u.status);
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: '#ede9fe', color: '#5b21b6', borderRadius: 6,
                      padding: '2px 8px', fontSize: 12, fontWeight: 700,
                    }}>
                      {u.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: '#ede9fe', color: '#5b21b6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span style={{ fontWeight: 500, fontSize: 13, color: '#111827' }}>{displayName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>
                    {u.sangha_name
                      ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>{u.sangha_name}</span>
                      : <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: 12 }}>Not in Sangha</span>
                    }
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                      borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: badge.background, color: badge.color, border: `1px solid ${badge.border}`,
                    }}>
                      {getStatusLabel(u.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {u.overall_completion_pct != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
                        <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            width: `${u.overall_completion_pct}%`, height: '100%', borderRadius: 99,
                            background: u.overall_completion_pct >= 80 ? '#22c55e'
                              : u.overall_completion_pct >= 50 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 32 }}>
                          {u.overall_completion_pct}%
                        </span>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* View button */}
                      <button
                        onClick={() => openModal(u)}
                        title="View Profile"
                        style={{
                          background: '#f9fafb', border: '1px solid #e5e7eb',
                          borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                          fontSize: 13, lineHeight: 1,
                        }}
                      >
                        👁
                      </button>

                      {/* ── Download PDF button ── */}
                      <button
                        title="Download PDF"
                        onClick={() => downloadAsPdf(u, displayName)}
                        style={{
                          background: '#f9fafb', border: '1px solid #e5e7eb',
                          borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                          fontSize: 13, lineHeight: 1,
                        }}
                      >
                        ⬇️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 }}>
                  No {statusTab} users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <Modal
          open
          title={`User Profile — ${`${modal.first_name || ''} ${modal.last_name || ''}`.trim() || modal.id}`}
          onClose={closeModal}
          footer={
            <button onClick={closeModal} style={{
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
            }}>
              Close
            </button>
          }
        >
          <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 }}>
            {profileLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <p style={{ margin: 0, fontSize: 14 }}>Loading profile…</p>
              </div>
            ) : profileData ? (
              <ProfileDetail
                data={profileData}
                onApprove={handleApprove}
                onReject={handleReject}
                isMutating={isMutating}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
                <p style={{ margin: 0, fontSize: 14 }}>Could not load profile.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
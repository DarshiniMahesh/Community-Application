//Community-Application\admin\src\app\dashboard\reports\customreport.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : ''}`,
});

// ─── Types ────────────────────────────────────────────────────
type ColDef = { key: string; label: string; filterable?: boolean };
type RowData = Record<string, string | number | boolean | null>;

type SectionKey = 'personal' | 'economic' | 'education' | 'family' | 'documents' | 'insurance';

interface SectionConfig {
  key: SectionKey;
  label: string;
  icon: string;
  color: string;
  columns: ColDef[];
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'personal',
    label: 'Personal Details',
    icon: '👤',
    color: '#ff6b00',
    columns: [
      { key: 'full_name',       label: 'Full Name',       filterable: true },
      { key: 'email',           label: 'Email',           filterable: true },
      { key: 'phone',           label: 'Phone',           filterable: true },
      { key: 'gender',          label: 'Gender',          filterable: true },
      { key: 'date_of_birth',   label: 'Date of Birth',   filterable: true },
      { key: 'status',          label: 'Status',          filterable: true },
      { key: 'submitted_at',    label: 'Submitted At',    filterable: false },
      { key: 'reviewed_at',     label: 'Reviewed At',     filterable: false },
    ],
  },
  {
    key: 'economic',
    label: 'Economic Details',
    icon: '💰',
    color: '#16a34a',
    columns: [
      { key: 'self_income',          label: 'Self Income (Annual)',  filterable: true },
      { key: 'family_income',        label: 'Family Income',        filterable: true },
      { key: 'fac_own_house',        label: 'Owns House',           filterable: true },
      { key: 'fac_agricultural_land',label: 'Agri Land',            filterable: true },
      { key: 'fac_two_wheeler',      label: '2-Wheeler',            filterable: true },
      { key: 'fac_car',              label: '4-Wheeler (Car)',       filterable: true },
      { key: 'fac_rented_house',     label: 'Renting',              filterable: true },
      { key: 'inv_fixed_deposits',   label: 'Fixed Deposits',       filterable: true },
      { key: 'inv_mutual_funds_sip', label: 'Mutual Funds/SIP',     filterable: true },
      { key: 'inv_shares_demat',     label: 'Shares/Demat',         filterable: true },
    ],
  },
  {
    key: 'education',
    label: 'Education & Profession',
    icon: '🎓',
    color: '#2563eb',
    columns: [
      { key: 'member_name',            label: 'Member Name',         filterable: true },
      { key: 'member_relation',        label: 'Relation',            filterable: true },
      { key: 'highest_education',      label: 'Highest Education',   filterable: true },
      { key: 'profession_type',        label: 'Profession Type',     filterable: true },
      { key: 'self_employed_type',     label: 'Self-Employed Type',  filterable: true },
      { key: 'industry',              label: 'Industry',            filterable: true },
      { key: 'is_currently_studying', label: 'Studying',            filterable: true },
      { key: 'is_currently_working',  label: 'Working',             filterable: true },
    ],
  },
  {
    key: 'family',
    label: 'Family Information',
    icon: '👨‍👩‍👧‍👦',
    color: '#7c3aed',
    columns: [
      { key: 'relation',    label: 'Relation',     filterable: true },
      { key: 'name',        label: 'Name',         filterable: true },
      { key: 'gender',      label: 'Gender',       filterable: true },
      { key: 'age',         label: 'Age',          filterable: true },
      { key: 'dob',         label: 'Date of Birth',filterable: false },
      { key: 'disability',  label: 'Disability',   filterable: true },
    ],
  },
  {
    key: 'documents',
    label: 'Document Details',
    icon: '📄',
    color: '#d97706',
    columns: [
      { key: 'member_name',         label: 'Member Name',    filterable: true },
      { key: 'member_relation',     label: 'Relation',       filterable: true },
      { key: 'aadhaar_coverage',    label: 'Aadhaar',        filterable: true },
      { key: 'pan_coverage',        label: 'PAN Card',       filterable: true },
      { key: 'voter_id_coverage',   label: 'Voter ID',       filterable: true },
      { key: 'land_doc_coverage',   label: 'Land Records',   filterable: true },
      { key: 'dl_coverage',         label: "Driver's Lic.",  filterable: true },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance Details',
    icon: '🛡️',
    color: '#dc2626',
    columns: [
      { key: 'member_name',          label: 'Member Name',      filterable: true },
      { key: 'member_relation',      label: 'Relation',         filterable: true },
      { key: 'health_coverage',      label: 'Health Insurance', filterable: true },
      { key: 'life_coverage',        label: 'Life Insurance',   filterable: true },
      { key: 'term_coverage',        label: 'Term Insurance',   filterable: true },
      { key: 'konkani_card_coverage',label: 'Konkani Card',     filterable: true },
    ],
  },
];

// Always-included base columns
const BASE_COLS: ColDef[] = [
  { key: 'full_name', label: 'Full Name',  filterable: true },
  { key: 'email',     label: 'Email',      filterable: true },
  { key: 'phone',     label: 'Phone',      filterable: true },
  { key: 'gender',    label: 'Gender',     filterable: true },
  { key: 'status',    label: 'Status',     filterable: true },
];

// ─── Filter Popup ─────────────────────────────────────────────
function FilterPopup({
  colKey, colLabel, rows, value, onChange, onClose,
}: {
  colKey: string;
  colLabel: string;
  rows: RowData[];
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const unique = [...new Set(rows.map(r => String(r[colKey] ?? '')))].filter(Boolean).slice(0, 20);
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 10, minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>
        Filter: {colLabel}
      </div>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Type to filter..."
        style={{
          width: '100%', padding: '5px 8px', fontSize: 12,
          border: '1px solid var(--border)', borderRadius: 5, marginBottom: 6,
          background: 'var(--bg)', color: 'var(--text)',
        }}
      />
      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
        {unique.filter(u => u.toLowerCase().includes(value.toLowerCase())).map(u => (
          <div
            key={u}
            onClick={() => { onChange(u); onClose(); }}
            style={{
              padding: '4px 6px', fontSize: 11, cursor: 'pointer',
              borderRadius: 4, color: 'var(--gray-600)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {u}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 6 }}>
        <button className="btn btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }}
          onClick={() => { onChange(''); onClose(); }}>Clear</button>
        <button className="btn btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }}
          onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
interface Props {
  initialCategory?: string; // e.g. 'economic', 'documents' etc. from other tabs
}

export default function CustomReport({ initialCategory }: Props) {
  // Active section toggles
  const [activeSections, setActiveSections] = useState<SectionKey[]>(['personal']);
  // Visible columns per section (keys)
  const [visibleCols, setVisibleCols] = useState<Record<SectionKey, string[]>>({
    personal:  BASE_COLS.map(c => c.key),
    economic:  [],
    education: [],
    family:    [],
    documents: [],
    insurance: [],
  });
  // Raw fetched data
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  // Filters: colKey → filterValue
  const [filters, setFilters] = useState<Record<string, string>>({});
  // Which filter popup is open
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  // Status filter toggle (include all / approved only)
  const [allStatuses, setAllStatuses] = useState(true);
  // Search
  const [search, setSearch] = useState('');

  // On mount: if initialCategory provided, auto-add that section
  useEffect(() => {
    if (initialCategory) {
      const matched = SECTIONS.find(s => s.key === initialCategory || s.label.toLowerCase().includes(initialCategory.toLowerCase()));
      if (matched && !activeSections.includes(matched.key)) {
        setActiveSections(prev => [...prev, matched.key]);
        setVisibleCols(prev => ({
          ...prev,
          [matched.key]: matched.columns.map(c => c.key),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  // Fetch data whenever active sections change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSections, allStatuses]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always fetch personal (base) + any other active sections
      const params = new URLSearchParams();
      if (!allStatuses) params.set('status', 'approved');
      activeSections.forEach(s => params.append('sections', s));

      const res = await fetch(`${API_BASE}/admin/reports/custom?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        setRawData(json.data ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle a section on/off
  const toggleSection = (key: SectionKey) => {
    const section = SECTIONS.find(s => s.key === key)!;
    if (activeSections.includes(key)) {
      if (key === 'personal') return; // personal always required
      setActiveSections(prev => prev.filter(k => k !== key));
    } else {
      setActiveSections(prev => [...prev, key]);
      // Auto-add all columns for that section
      setVisibleCols(prev => ({
        ...prev,
        [key]: section.columns.map(c => c.key),
      }));
    }
  };

  // Toggle individual column within a section
  const toggleCol = (sectionKey: SectionKey, colKey: string) => {
    setVisibleCols(prev => {
      const current = prev[sectionKey];
      if (current.includes(colKey)) {
        return { ...prev, [sectionKey]: current.filter(k => k !== colKey) };
      } else {
        return { ...prev, [sectionKey]: [...current, colKey] };
      }
    });
  };

  // Compute final column list in order
  const computeCols = (): ColDef[] => {
    const cols: ColDef[] = [];
    const added = new Set<string>();
    activeSections.forEach(sk => {
      const section = SECTIONS.find(s => s.key === sk)!;
      section.columns.forEach(c => {
        if (visibleCols[sk].includes(c.key) && !added.has(c.key)) {
          cols.push(c);
          added.add(c.key);
        }
      });
    });
    return cols;
  };

  const allCols = computeCols();

  // Apply filters + search
  const filteredRows = rawData.filter(row => {
    // Column filters
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      const cellVal = String(row[k] ?? '').toLowerCase();
      if (!cellVal.includes(v.toLowerCase())) return false;
    }
    // Global search
    if (search) {
      const s = search.toLowerCase();
      const matches = allCols.some(c => String(row[c.key] ?? '').toLowerCase().includes(s));
      if (!matches) return false;
    }
    return true;
  });

  // Export to Excel (CSV)
  const downloadExcel = () => {
    const headers = allCols.map(c => c.label).join(',');
    const csvRows = filteredRows.map(row =>
      allCols.map(c => {
        const v = row[c.key];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCell = (val: string | number | boolean | null) => {
    if (val === null || val === undefined) return <span style={{ color: 'var(--gray-300)' }}>—</span>;
    if (typeof val === 'boolean') return val ? <span style={{ color: '#16a34a' }}>✓ Yes</span> : <span style={{ color: '#dc2626' }}>✗ No</span>;
    const s = String(val);
    if (s === 'true') return <span style={{ color: '#16a34a' }}>✓ Yes</span>;
    if (s === 'false') return <span style={{ color: '#dc2626' }}>✗ No</span>;
    if (s === 'approved') return <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 11 }}>approved</span>;
    if (s === 'rejected') return <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>rejected</span>;
    if (s === 'pending') return <span style={{ color: '#d97706', fontWeight: 700, fontSize: 11 }}>pending</span>;
    if (s === 'male') return <span style={{ color: '#2563eb' }}>male</span>;
    if (s === 'female') return <span style={{ color: '#db2777' }}>female</span>;
    return s;
  };

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minHeight: 500 }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, marginRight: 18, overflow: 'hidden',
      }}>
        {/* Status toggle */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)' }}>ALL STATUSES</span>
            <div
              onClick={() => setAllStatuses(v => !v)}
              style={{
                width: 32, height: 18, borderRadius: 9, cursor: 'pointer', transition: 'background .2s',
                background: allStatuses ? 'var(--orange)' : 'var(--border)', position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: allStatuses ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
            {allStatuses ? 'Include rejected, pending, drafts' : 'Approved only'}
          </div>
        </div>

        {/* Section list */}
        {SECTIONS.map(sec => {
          const isActive = activeSections.includes(sec.key);
          return (
            <div key={sec.key} style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Section header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', cursor: 'pointer',
                  background: isActive ? `${sec.color}10` : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{sec.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? sec.color : 'var(--gray-600)' }}>
                    {sec.label}
                  </span>
                </div>
                <button
                  onClick={() => toggleSection(sec.key)}
                  style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${isActive ? sec.color : 'var(--border)'}`,
                    background: isActive ? sec.color : 'transparent',
                    color: isActive ? '#fff' : 'var(--gray-500)',
                    fontWeight: 600,
                  }}
                >
                  {isActive ? '✓ Added' : '+ Add'}
                </button>
              </div>

              {/* Column toggles when active */}
              {isActive && (
                <div style={{ padding: '4px 10px 10px', background: `${sec.color}05` }}>
                  {sec.columns.map(col => {
                    const isColVisible = visibleCols[sec.key].includes(col.key);
                    return (
                      <div
                        key={col.key}
                        onClick={() => toggleCol(sec.key, col.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '3px 4px', cursor: 'pointer', borderRadius: 4,
                          marginBottom: 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                          border: `1.5px solid ${isColVisible ? sec.color : 'var(--border)'}`,
                          background: isColVisible ? sec.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isColVisible && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 11, color: isColVisible ? 'var(--text)' : 'var(--gray-400)' }}>
                          {col.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MAIN TABLE AREA ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search table..."
              style={{
                padding: '7px 12px', fontSize: 12, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', width: 200,
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {filteredRows.length} rows
            </span>
            {Object.values(filters).some(Boolean) && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={() => setFilters({})}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            onClick={downloadExcel}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download Excel
          </button>
        </div>

        {/* Table */}
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
              Loading data…
            </div>
          ) : rawData.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
              Select sections from the sidebar to view data.
            </div>
          ) : (
            <table style={{ minWidth: allCols.length * 130 }}>
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center', fontSize: 11 }}>#</th>
                  {allCols.map(col => (
                    <th key={col.key} style={{ position: 'relative', minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{col.label}</span>
                        {col.filterable && (
                          <button
                            onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}
                            title="Filter"
                            style={{
                              background: filters[col.key] ? 'var(--orange)' : 'var(--border)',
                              border: 'none', borderRadius: 3, padding: '1px 4px',
                              cursor: 'pointer', fontSize: 9, color: filters[col.key] ? '#fff' : 'var(--gray-500)',
                            }}
                          >
                            ▼
                          </button>
                        )}
                      </div>
                      {openFilter === col.key && (
                        <FilterPopup
                          colKey={col.key}
                          colLabel={col.label}
                          rows={rawData}
                          value={filters[col.key] ?? ''}
                          onChange={v => setFilters(prev => ({ ...prev, [col.key]: v }))}
                          onClose={() => setOpenFilter(null)}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 11 }}>{i + 1}</td>
                    {allCols.map(col => (
                      <td key={col.key} style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatCell(row[col.key] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
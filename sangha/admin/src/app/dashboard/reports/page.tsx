'use client';
import { useState } from 'react';
import { USERS, SANGHA_LIST } from '@/data/mockData';

type ReportType = 'overview' | 'population' | 'income' | 'assets' | 'sangha' | 'workflow';

const TABS: { id: ReportType; label: string }[] = [
  { id: 'overview',   label: 'Overview'           },
  { id: 'population', label: 'Population'         },
  { id: 'income',     label: 'Income'             },
  { id: 'assets',     label: 'Assets'             },
  { id: 'sangha',     label: 'Sangha Performance' },
  { id: 'workflow',   label: 'Workflow'            },
];

const KPI_COLORS = ['var(--orange)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--yellow)', 'var(--red)'];

function KPIGrid({ items }: { items: [string, string | number, string][] }) {
  return (
    <div className="report-kpi-grid">
      {items.map(([label, value, sub], i) => (
        <div key={label} className={`report-kpi kpi-c${(i % 6) + 1}`}>
          <div className="report-kpi-val">{value}</div>
          <div className="report-kpi-label">{label}</div>
          <div className="report-kpi-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, labelWidth = 105 }: { data: { label: string; value: number; color?: string }[]; labelWidth?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-bar-group">
      {data.map(d => (
        <div className="chart-bar-item" key={d.label}>
          <div className="chart-bar-label" style={{ width: labelWidth }}>{d.label}</div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill"
              style={{ width: `${Math.max(d.value / max * 100, 5)}%`, background: d.color ?? 'var(--orange)' }}>
              {d.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-wrap">
      <div className="chart-title">{title}</div>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('overview');

  const approved   = USERS.filter(u => u.status === 'approved').length;
  const rejected   = USERS.filter(u => u.status === 'rejected').length;
  const pending    = USERS.filter(u => u.status === 'pending').length;
  const bpl        = USERS.filter(u => u.bpl).length;
  const totalInc   = USERS.reduce((a, u) => a + u.income, 0);
  const avgInc     = Math.round(totalInc / USERS.length);
  const totalFam   = USERS.reduce((a, u) => a + u.family, 0);

  return (
    <div className="page">
      <div className="page-header"><h1>Reports &amp; Analytics</h1></div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 22, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`btn ${type === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '7px 13px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {type === 'overview' && (
        <>
          <KPIGrid items={[
            ['Total Citizens',  USERS.length,    'Registered'],
            ['Total Sangha',    SANGHA_LIST.length, 'Verifiers'],
            ['Approved',        approved,        'Final count'],
            ['In Pipeline',     pending,         'Active'],
            ['Avg Family Size', (totalFam / USERS.length).toFixed(1), 'Per household'],
            ['BPL Households',  bpl,             'Below poverty'],
          ]} />
          <div className="two-col">
            <ChartWrap title="Approval Funnel">
              <BarChart data={[
                { label: 'Submitted', value: USERS.length, color: 'var(--orange)' },
                { label: 'Reviewed',  value: approved + rejected, color: 'var(--purple)' },
                { label: 'Approved',  value: approved, color: 'var(--green)' },
              ]} />
            </ChartWrap>
            <ChartWrap title="Records by State">
              <BarChart data={[...new Set(USERS.map(u => u.state))].map(s => ({
                label: s.slice(0, 12), value: USERS.filter(u => u.state === s).length
              }))} />
            </ChartWrap>
          </div>
        </>
      )}

      {type === 'population' && (
        <>
          <KPIGrid items={[
            ['Total Population',  totalFam,                      'Registered persons'],
            ['Households',        USERS.length,                  'Registered'],
            ['Male-headed',       Math.round(USERS.length * .62), '~62%'],
            ['Female-headed',     Math.round(USERS.length * .38), '~38%'],
            ['Urban',             Math.round(USERS.length * .72), '72%'],
            ['Rural',             Math.round(USERS.length * .28), '28%'],
          ]} />
          <div className="two-col">
            <ChartWrap title="Family Size Distribution">
              <BarChart data={[
                { label: '1-2 members', value: USERS.filter(u => u.family <= 2).length },
                { label: '3 members',   value: USERS.filter(u => u.family === 3).length },
                { label: '4 members',   value: USERS.filter(u => u.family === 4).length },
                { label: '5+ members',  value: USERS.filter(u => u.family >= 5).length },
              ]} />
            </ChartWrap>
            <ChartWrap title="Urban vs Rural">
              <BarChart data={[
                { label: 'Urban', value: Math.round(USERS.length * .72), color: 'var(--blue)' },
                { label: 'Rural', value: Math.round(USERS.length * .28), color: 'var(--green)' },
              ]} />
            </ChartWrap>
          </div>
        </>
      )}

      {type === 'income' && (
        <>
          <KPIGrid items={[
            ['Avg Annual Income', `Rs.${Math.round(avgInc / 1000)}K`, 'Per household'],
            ['Total Pool',        `Rs.${(totalInc / 10_000_000).toFixed(1)}Cr`, 'Collective'],
            ['BPL Count',         bpl,  'Below poverty line'],
            ['High Income',       USERS.filter(u => u.income > 600000).length,  'Above Rs.6L'],
            ['Middle Income',     USERS.filter(u => u.income >= 300000 && u.income <= 600000).length, 'Rs.3L-Rs.6L'],
            ['Low Income',        USERS.filter(u => u.income < 300000).length,  'Below Rs.3L'],
          ]} />
          <div className="two-col">
            <ChartWrap title="Income Bracket Distribution">
              <BarChart labelWidth={115} data={[
                { label: 'Below Rs.2L', value: USERS.filter(u => u.income < 200000).length,                           color: '#dc2626' },
                { label: 'Rs.2L-Rs.3L', value: USERS.filter(u => u.income >= 200000 && u.income < 300000).length,     color: '#d97706' },
                { label: 'Rs.3L-Rs.5L', value: USERS.filter(u => u.income >= 300000 && u.income < 500000).length,     color: '#ff6b00' },
                { label: 'Rs.5L-Rs.7L', value: USERS.filter(u => u.income >= 500000 && u.income < 700000).length,     color: '#2563eb' },
                { label: 'Above Rs.7L', value: USERS.filter(u => u.income >= 700000).length,                          color: '#16a34a' },
              ]} />
            </ChartWrap>
            <ChartWrap title="Avg Income by State">
              <BarChart labelWidth={110} data={[...new Set(USERS.map(u => u.state))].map(s => {
                const us = USERS.filter(u => u.state === s);
                return { label: s.slice(0, 11), value: Math.round(us.reduce((a, u) => a + u.income, 0) / us.length / 1000), color: '#16a34a' };
              })} />
            </ChartWrap>
          </div>
        </>
      )}

      {type === 'assets' && (
        <>
          <KPIGrid items={[
            ['Own Home',    USERS.filter(u => u.assets.includes('Own Home')).length, 'Homeowners'],
            ['Vehicles',    USERS.filter(u => u.assets.includes('Vehicle')).length,  'Vehicle owners'],
            ['Land Owners', USERS.filter(u => u.assets.includes('Land')).length,     'Agricultural land'],
            ['BPL Holders', bpl,                                                     'BPL card holders'],
            ['Renters',     USERS.filter(u => u.assets.includes('Rented')).length,   'Rented homes'],
            ['Multi-Asset', USERS.filter(u => u.assets.split(',').length >= 3).length, '3+ asset types'],
          ]} />
          <ChartWrap title="Asset Ownership Breakdown">
            <BarChart labelWidth={165} data={[
              { label: 'Own Home',              value: USERS.filter(u => u.assets.includes('Own Home')).length, color: '#ff6b00' },
              { label: 'Vehicle',               value: USERS.filter(u => u.assets.includes('Vehicle')).length,  color: '#2563eb' },
              { label: 'Agricultural Land',     value: USERS.filter(u => u.assets.includes('Land')).length,     color: '#16a34a' },
              { label: 'BPL Card',              value: bpl,                                                      color: '#d97706' },
              { label: 'Rented Accommodation',  value: USERS.filter(u => u.assets.includes('Rented')).length,   color: '#7c3aed' },
            ]} />
          </ChartWrap>
        </>
      )}

      {type === 'sangha' && (
        <>
          <KPIGrid items={[
            ['Total Sangha',   SANGHA_LIST.length,               'Registered'],
            ['Active',         SANGHA_LIST.length,               'Operational'],
            ['Total Verified', 96,                               'All time'],
            ['Total Pending',  18,                               'Awaiting'],
            ['Avg per Sangha', Math.round(96 / SANGHA_LIST.length), 'Verifications'],
            ['Total Rejected', 7,                                'Returned'],
          ]} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sangha</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
              <tbody>
                {SANGHA_LIST.map(s => (
                  <tr key={s.id}>
                    <td><div className="avatar-cell"><div className="avatar-sm avatar-purple">{s.name[0]}</div>{s.name}</div></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.email}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.phone}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {type === 'workflow' && (
        <>
          <KPIGrid items={[
            ['Total Submitted', USERS.length,   'All time'],
            ['In Pipeline',     pending,         'Active'],
            ['Approved',        approved,        'Final'],
            ['Rejected',        rejected,        'Declined'],
            ['Approval Rate',   `${Math.round(approved / (approved + rejected) * 100)}%`, 'Success rate'],
            ['Avg Processing',  '4.2 days',      'End-to-end'],
          ]} />
          <div className="two-col">
            <ChartWrap title="Processing Funnel">
              <BarChart data={[
                { label: 'Submitted', value: USERS.length,        color: '#ff6b00' },
                { label: 'Reviewed',  value: approved + rejected, color: '#7c3aed' },
                { label: 'Approved',  value: approved,            color: '#16a34a' },
              ]} />
            </ChartWrap>
            <ChartWrap title="Processing Time (Days)">
              <BarChart labelWidth={150} data={[
                { label: 'Submission to Admin', value: 2.4, color: '#d97706' },
                { label: 'Admin to Decision',   value: 0.9, color: '#7c3aed' },
                { label: 'Total Cycle',         value: 5.1, color: '#ff6b00' },
              ]} />
            </ChartWrap>
          </div>
        </>
      )}
    </div>
  );
}

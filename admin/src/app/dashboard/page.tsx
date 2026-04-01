'use client';
import { useRouter } from 'next/navigation';
import { USERS, SANGHA_LIST, PENDING_SANGHA } from '../../data/mockData';

export default function DashboardPage() {
  const router = useRouter();

  const approvedUsers  = USERS.filter(u => u.status === 'approved').length;
  const rejectedUsers  = USERS.filter(u => u.status === 'rejected').length;
  const pendingUsers   = USERS.filter(u => u.status === 'pending').length;
  const pendingSangha  = PENDING_SANGHA.length;

  const userStats = [
    { label: 'Total Registered', value: USERS.length,  color: 'var(--blue)',   href: null },
    { label: 'Approved',         value: approvedUsers, color: 'var(--green)',  href: '/dashboard/history?tab=users&status=approved'   },
    { label: 'Rejected',         value: rejectedUsers, color: 'var(--red)',    href: '/dashboard/history?tab=users&status=rejected'   },
    { label: 'Pending Approval', value: pendingUsers,  color: 'var(--yellow)', href: '/dashboard/approvals?tab=user'                  },
  ];

  const sanghaStats = [
    { label: 'Total Registered', value: SANGHA_LIST.length, color: 'var(--blue)',   href: null },
    { label: 'Approved',         value: SANGHA_LIST.length, color: 'var(--green)',  href: '/dashboard/history?tab=sangha&status=approved'   },
    { label: 'Rejected',         value: 0,                  color: 'var(--red)',    href: '/dashboard/history?tab=sangha&status=rejected'   },
    { label: 'Pending Approval', value: pendingSangha,      color: 'var(--yellow)', href: '/dashboard/approvals?tab=sangha'                 },
  ];

  const handleClick = (href: string | null) => {
    if (href) router.push(href);
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 32, background: 'var(--orange)', borderRadius: 99 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
            Census Management
          </h1>
        </div>
      </div>

      {/* Users Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 20, background: 'var(--blue)', borderRadius: 99 }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            Users
          </h2>
        </div>
        <div className="dash-grid">
          {userStats.map((s, i) => (
            <div
              className="dash-card"
              key={i}
              onClick={() => handleClick(s.href)}
              style={{ cursor: s.href ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (s.href) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div className="dash-val" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-label">{s.label}</div>
              {s.href && (
                <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4, letterSpacing: '0.03em' }}>
                  VIEW →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sangha Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 20, background: 'var(--purple)', borderRadius: 99 }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-700)', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            Sangha
          </h2>
        </div>
        <div className="dash-grid">
          {sanghaStats.map((s, i) => (
            <div
              className="dash-card"
              key={i}
              onClick={() => handleClick(s.href)}
              style={{ cursor: s.href ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (s.href) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div className="dash-val" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-label">{s.label}</div>
              {s.href && (
                <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4, letterSpacing: '0.03em' }}>
                  VIEW →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
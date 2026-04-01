'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BASE_URL = 'http://localhost:8000';

interface DashboardStats {
  totalUsers: number;
  totalSangha: number;
  approvedUsers: number;
  rejectedUsers: number;
  pendingUsers: number;
  changesRequested: number;
  pendingSangha: number;
  approvedSangha: number;
  rejectedSangha: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) { router.push('/signup/login'); return; }

    fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.message) throw new Error(data.message);
        setStats(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const handleClick = (href: string | null) => { if (href) router.push(href); };

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!stats)  return null;

  const userStats = [
    { label: 'Total Registered', value: stats.totalUsers,    color: 'var(--blue)',   href: null },
    { label: 'Approved',         value: stats.approvedUsers, color: 'var(--green)',  href: '/dashboard/users?status=approved' },
    { label: 'Rejected',         value: stats.rejectedUsers, color: 'var(--red)',    href: '/dashboard/history?tab=users&status=rejected' },
    { label: 'Pending Approval', value: stats.pendingUsers,  color: 'var(--yellow)', href: '/dashboard/approvals?tab=user' },
  ];

  const sanghaStats = [
    { label: 'Total Registered', value: stats.totalSangha,    color: 'var(--blue)',   href: null },
    { label: 'Approved',         value: stats.approvedSangha, color: 'var(--green)',  href: '/dashboard/sangha' },
    { label: 'Rejected',         value: stats.rejectedSangha, color: 'var(--red)',    href: '/dashboard/history?tab=sangha&status=rejected' },
    { label: 'Pending Approval', value: stats.pendingSangha,  color: 'var(--yellow)', href: '/dashboard/approvals?tab=sangha' },
  ];

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
              key={i}
              className="dash-card"
              onClick={() => handleClick(s.href)}
              style={{ cursor: s.href ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (s.href) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div className="dash-val" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-label">{s.label}</div>
              {s.href && <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4, letterSpacing: '0.03em' }}>VIEW →</div>}
            </div>
          ))}
        </div>
      </div>

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
              key={i}
              className="dash-card"
              onClick={() => handleClick(s.href)}
              style={{ cursor: s.href ? 'pointer' : 'default', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (s.href) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
            >
              <div className="dash-val" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-label">{s.label}</div>
              {s.href && <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4, letterSpacing: '0.03em' }}>VIEW →</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
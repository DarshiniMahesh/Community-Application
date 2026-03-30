'use client';
import { usePathname, useRouter } from 'next/navigation';
import { IC } from './Icons';
import { USERS, PENDING_SANGHA } from '@/data/mockData';

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard',           label: 'Dashboard',         icon: 'home'    },
    { href: '/dashboard/users',     label: 'User Management',   icon: 'users'   },
    { href: '/dashboard/sangha',    label: 'Sangha Management', icon: 'shield'  },
  ]},
  { section: 'Workflow', items: [
    { href: '/dashboard/approvals', label: 'Approvals',         icon: 'check',  badge: true },
    { href: '/dashboard/history',   label: 'Approval History',  icon: 'clock'   },
    { href: '/dashboard/reports',   label: 'Reports',           icon: 'chart'   },
  ]},
];

const ICONS: Record<string, React.ReactNode> = {
  home: IC.home, users: IC.users, shield: IC.shield,
  check: IC.check, clock: IC.clock, chart: IC.chart,
};

const pendingCount = PENDING_SANGHA.length + USERS.filter(u => u.status === 'pending').length;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => { router.push('/signup/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="sidebar-logo-mark">{IC.building}</div>
          <div><div className="sidebar-logo-text">Community Portal</div></div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(g => (
          <div key={g.section}>
            <div className="sidebar-section">
              <span className="sidebar-section-label">{g.section}</span>
            </div>
            {g.items.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <div key={item.href}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => router.push(item.href)}>
                  <span className="nav-icon">{ICONS[item.icon]}</span>
                  {item.label}
                  {item.badge && !active && pendingCount > 0 && (
                    <span className="nav-badge">{pendingCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="u-name">Admin Kumar</div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </aside>
  );
}

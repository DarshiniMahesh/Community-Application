'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IC } from './Icons';

const BASE_URL = 'http://localhost:8000';

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard',           label: 'Dashboard',         icon: 'home'   },
    { href: '/dashboard/users',     label: 'User Management',   icon: 'users'  },
    { href: '/dashboard/sangha',    label: 'Sangha Management', icon: 'shield' },
  ]},
  { section: 'Workflow', items: [
    { href: '/dashboard/approvals', label: 'Approvals',         icon: 'check', badge: true },
    { href: '/dashboard/history',   label: 'Activity Log',      icon: 'clock'  },
    { href: '/dashboard/reports',   label: 'Reports',           icon: 'chart'  },
    { href: '/dashboard/blocklist', label: 'Block',             icon: 'block'  },
  ]},
];

const ICONS: Record<string, React.ReactNode> = {
  home: IC.home, users: IC.users, shield: IC.shield,
  check: IC.check, clock: IC.clock, chart: IC.chart,
  block: IC.block,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState('Admin');

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    const email = sessionStorage.getItem('admin_email');
    if (email) setAdminEmail(email);
    if (!token) return;

    fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const count = (data.pendingUsers || 0) + (data.pendingSangha || 0);
        setPendingCount(count);
      })
      .catch(() => setPendingCount(0));
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    router.push('/signup/login');
  };

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
                <div
                  key={item.href}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <span className="nav-icon">{ICONS[item.icon]}</span>
                  {item.label}
                  
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-pill">
          
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </aside>
  );
}
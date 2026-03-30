'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/dashboard/users':     'User Management',
  '/dashboard/sangha':    'Sangha Management',
  '/dashboard/approvals': 'Approve requests',
  '/dashboard/history':   'Approval History',
  '/dashboard/reports':   'Reports & Analytics',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Topbar() {
  const pathname = usePathname();
  const clock = useClock();
  const title = PAGE_TITLES[pathname] ?? 'Dashboard';
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-page-title">{title}</div>
      </div>
      <div className="topbar-date">{clock}</div>
    </header>
  );
}

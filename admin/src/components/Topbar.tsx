'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { formatIndiaDateTime } from '@/lib/dateTime';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/dashboard/users':     'User Management',
  '/dashboard/sangha':    'Sangha Management',
  '/dashboard/approvals': 'Approvals',
  '/dashboard/history':   'Activity Log',
  '/dashboard/reports':   'Reports & Analytics',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return formatIndiaDateTime(now, { weekday: 'short' });
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

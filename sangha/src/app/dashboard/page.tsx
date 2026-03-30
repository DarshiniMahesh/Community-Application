import { USERS, SANGHA_LIST, PENDING_SANGHA } from '@/data/mockData';

export default function DashboardPage() {
  const approvedUsers  = USERS.filter(u => u.status === 'approved').length;
  const rejectedUsers  = USERS.filter(u => u.status === 'rejected').length;
  const pendingUsers   = USERS.filter(u => u.status === 'pending').length;
  const pendingSangha  = PENDING_SANGHA.length;

  const stats = [
    { label: 'Users Registered',         value: USERS.length,       color: 'var(--blue)'   },
    { label: 'Sangha Registered',        value: SANGHA_LIST.length, color: 'var(--purple)' },
    { label: 'Approved Users',           value: approvedUsers,      color: 'var(--green)'  },
    { label: 'Approved Sanghas',         value: SANGHA_LIST.length, color: 'var(--green)'  },
    { label: 'Rejected Users',           value: rejectedUsers,      color: 'var(--red)'    },
    { label: 'Rejected Sanghas',         value: 0,                  color: 'var(--red)'    },
    { label: 'Pending Approval Users',   value: pendingUsers,       color: 'var(--yellow)' },
    { label: 'Pending Approval Sanghas', value: pendingSangha,      color: 'var(--yellow)' },
    { label: 'Blocklisted Users',        value: USERS.filter(u => u.status === 'blocked').length, color: 'var(--red)' },
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
      <div className="dash-grid">
        {stats.map((s, i) => (
          <div className="dash-card" key={i}>
            <div className="dash-val" style={{ color: s.color }}>{s.value}</div>
            <div className="dash-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
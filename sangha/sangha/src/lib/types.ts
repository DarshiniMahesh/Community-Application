export interface PendingUser {
  id: string | number;
  name: string;
  village?: string;
  phone?: string;
  email?: string;
  applicationDate?: string;
  createdAt?: string;
  created_at?: string;
  sanghaId?: string | number;
  sangha_id?: string | number;
}

export interface DashboardStats {
  pendingApplications: number;
  approvedUsers: number;
  rejectedUsers: number;
  totalUsers: number;
}

export type SanghaStatus = 'profile_pending' | 'pending_approval' | 'approved' | 'unknown';

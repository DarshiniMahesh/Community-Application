"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, clearCompanyAuth, getCompanyToken } from "@/lib/api";
import {
  LayoutDashboard, Briefcase, Users, FileText,
  Building2, LogOut, Plus, ChevronRight, Lock,
} from "lucide-react";
import Link from "next/link";

interface CompanyInfo {
  company_name: string;
  company_category: string;
  company_subcategory: string;
  company_size: number;
  status: string;
}

const NAV = [
  { label: "Dashboard",    href: "/dashboard",                  icon: LayoutDashboard, approvedOnly: true },
  { label: "Profile",      href: "/dashboard/profile",          icon: Building2,       approvedOnly: false },
  { label: "Employees",    href: "/dashboard/employees",        icon: Users,           approvedOnly: true },
  { label: "Job Postings", href: "/dashboard/job-postings",     icon: Briefcase,       approvedOnly: true },
  { label: "Applicants",   href: "/dashboard/applications",     icon: FileText,        approvedOnly: true },
  { label: "Post a Job",   href: "/dashboard/job-postings/new", icon: Plus,            approvedOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    if (!getCompanyToken()) {
      router.push("/auth/login");
      return;
    }
    api.get("/company/profile")
      .then((d) => {
        setCompany(d);
        setStatusLoaded(true);
        const isApproved = d.status === "approved";
        if (!isApproved && !pathname.startsWith("/dashboard/profile")) {
          router.push("/dashboard/profile");
        }
      })
      .catch(() => {
        setStatusLoaded(true);
        if (!pathname.includes("/dashboard/profile")) {
          router.push("/dashboard/profile?setup=true");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearCompanyAuth();
    router.push("/auth/login");
  };

  const isApproved = company?.status === "approved";
  const isPending = company?.status === "pending";
  const isRejected = company?.status === "rejected";

  const initials = company?.company_name
    ? company.company_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "CO";

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#1a56db" }}>CC</span>
          </div>
          <div>
            <p style={styles.brandName}>community-company</p>
            <p style={styles.brandTag}>HIRING · TOGETHER</p>
          </div>
        </div>

        {/* Company info */}
        {company && (
          <div style={styles.companyBox}>
            <p style={styles.signedAs}>SIGNED IN AS</p>
            <div style={styles.companyRow}>
              <div style={styles.companyAvatar}>{initials}</div>
              <div>
                <p style={styles.companyName}>{company.company_name}</p>
                <p style={styles.companyRole}>Company View</p>
              </div>
            </div>
            <div style={{
              ...styles.statusBadge,
              ...(isApproved ? styles.badgeApproved : isPending ? styles.badgePending : styles.badgeRejected),
            }}>
              {isApproved ? "● Approved" : isPending ? "⏳ Pending Approval" : "❌ Rejected"}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map(({ label, href, icon: Icon, approvedOnly }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const locked = approvedOnly && !isApproved;

            if (locked) {
              return (
                <div key={href} style={styles.navItemLocked} title="Available after approval">
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{label}</span>
                  <Lock size={12} />
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                style={{ ...styles.navItem, ...(active ? styles.navActive : {}) }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {statusLoaded && isPending && (
          <div style={styles.pendingBanner}>
            ⏳ <strong>Pending Approval</strong> — Your company profile has been submitted and is awaiting admin review. You will get full access once approved.
          </div>
        )}
        {statusLoaded && isRejected && (
          <div style={styles.rejectedBannerTop}>
            ❌ <strong>Registration Rejected</strong> — Please update your profile and reapply for approval.{" "}
            <Link href="/dashboard/profile" style={{ color: "#991b1b", fontWeight: 700, textDecoration: "underline" }}>
              Go to Profile →
            </Link>
          </div>
        )}

        <div style={styles.content}>
          {statusLoaded && !isApproved && !pathname.startsWith("/dashboard/profile") ? (
            <div style={styles.frozenState}>
              <Lock size={40} color="#d1d5db" />
              <p style={{ color: "#6b7280", fontWeight: 600, margin: "12px 0 4px" }}>
                Access Restricted
              </p>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                {isPending
                  ? "Your company is pending admin approval."
                  : "Your company registration was rejected."}
              </p>
              <Link href="/dashboard/profile" style={styles.goProfileBtn}>
                {isRejected ? "Update Profile & Reapply →" : "View Profile →"}
              </Link>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex", minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f3f4f6",
  },
  sidebar: {
    width: 240, background: "#fff",
    borderRight: "1px solid #f3f4f6",
    display: "flex", flexDirection: "column",
    padding: "0 0 16px", flexShrink: 0,
    position: "sticky", top: 0, height: "100vh",
    overflowY: "auto",
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6",
  },
  brandIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: "#eff6ff", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  brandName: { fontSize: 13, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  brandTag: { fontSize: 9, color: "#9ca3af", margin: 0, letterSpacing: 1 },
  companyBox: {
    padding: "14px 16px", borderBottom: "1px solid #f3f4f6",
  },
  signedAs: { fontSize: 9, color: "#9ca3af", fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" },
  companyRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  companyAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "#1a56db", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  companyName: { fontSize: 13, fontWeight: 600, color: "#1a1a2e", margin: 0 },
  companyRole: { fontSize: 11, color: "#6b7280", margin: 0 },
  statusBadge: {
    fontSize: 11, fontWeight: 600, padding: "4px 10px",
    borderRadius: 20, display: "inline-block",
  },
  badgeApproved: { background: "#d1fae5", color: "#065f46" },
  badgePending:  { background: "#fef3c7", color: "#92400e" },
  badgeRejected: { background: "#fee2e2", color: "#991b1b" },
  nav: {
    display: "flex", flexDirection: "column",
    padding: "12px 8px", gap: 2, flex: 1,
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8,
    fontSize: 13, fontWeight: 500, color: "#6b7280",
    textDecoration: "none", transition: "all 0.15s",
  },
  navActive: {
    background: "#1a1a2e", color: "#fff", fontWeight: 600,
  },
  navItemLocked: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8,
    fontSize: 13, fontWeight: 500,
    color: "#d1d5db", cursor: "not-allowed",
    userSelect: "none",
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 8,
    margin: "0 8px", padding: "10px 12px",
    background: "none", border: "none", borderRadius: 8,
    fontSize: 13, color: "#6b7280", cursor: "pointer",
    width: "calc(100% - 16px)",
  },
  main: {
    flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
  },
  pendingBanner: {
    background: "#fef3c7", borderBottom: "1px solid #fde68a",
    padding: "12px 24px", fontSize: 13, color: "#92400e",
  },
  rejectedBannerTop: {
    background: "#fee2e2", borderBottom: "1px solid #fecaca",
    padding: "12px 24px", fontSize: 13, color: "#991b1b",
  },
  content: { padding: 24, flex: 1 },
  frozenState: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: 400, textAlign: "center",
  },
  goProfileBtn: {
    marginTop: 16, padding: "10px 24px",
    background: "#1a56db", color: "#fff",
    borderRadius: 8, textDecoration: "none",
    fontSize: 13, fontWeight: 600,
  },
};
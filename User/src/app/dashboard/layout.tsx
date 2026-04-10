"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, User, Users, CheckCircle, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearAuth, getToken, api } from "@/lib/api";

type ProfileStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested";

const baseNavigation = [
  { name: "Dashboard",  href: "/dashboard",        icon: LayoutDashboard },
  { name: "My Profile", href: "/dashboard/profile", icon: User },
  { name: "Status",     href: "/dashboard/status",  icon: CheckCircle },
];

const sanghaNav = {
  name: "Sangha Membership",
  href: "/dashboard/sangha-membership",
  icon: Users,
};

const statusBadge = (status: ProfileStatus) => {
  switch (status) {
    case "draft":             return <Badge variant="secondary" className="text-xs">Draft</Badge>;
    case "submitted":         return <Badge className="text-xs bg-blue-100 text-blue-800">Submitted</Badge>;
    case "under_review":      return <Badge className="text-xs bg-yellow-100 text-yellow-800">Under Review</Badge>;
    case "approved":          return <Badge className="text-xs bg-green-100 text-green-800">Approved</Badge>;
    case "rejected":          return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    case "changes_requested": return <Badge className="text-xs bg-orange-100 text-orange-800">Changes Requested</Badge>;
    default:                  return null;
  }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/auth/login"); return; }
    api.get("/users/profile")
      .then(data => setProfileStatus(data.status as ProfileStatus))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.get("/users/profile")
        .then(data => setProfileStatus(data.status as ProfileStatus))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  // Build navigation: show Sangha Membership tab only when profile is approved
  const navigation = [...baseNavigation, sanghaNav];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-accent rounded-md">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Community Portal</h1>
                <p className="text-xs text-muted-foreground">Community Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profileStatus && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md">
                <span className="text-sm text-secondary-foreground">Status:</span>
                {statusBadge(profileStatus)}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-border transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                  {/* Green dot indicator for newly unlocked Sangha tab */}
                  {item.href === "/dashboard/sangha-membership" && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-secondary/50">
            <div className="text-xs text-muted-foreground text-center">
              <p className="font-medium">Community Portal</p>
              <p className="mt-1">Version 1.0</p>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
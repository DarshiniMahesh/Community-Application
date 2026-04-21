"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, LogOut, Users, UserCog,
  FileText, Activity, UserCircle2, Clock, ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/api";

const navigation = [
  { name: "Dashboard",       href: "/sangha/dashboard",       icon: Users },
  { name: "User Management", href: "/sangha/user-management", icon: UserCog },
  { name: "Pending Users",   href: "/sangha/pending-users",   icon: Clock },
  { name: "Member Requests", href: "/sangha/member-requests", icon: Users },
  { name: "Sangha Members",  href: "/sangha/members",         icon: Users },
  { name: "Analytics",         href: "/sangha/reports",         icon: FileText },
  { name: "Activity Logs",   href: "/sangha/activity-logs",   icon: Activity },
  { name: "Block Users",     href: "/sangha/block",           icon: ShieldOff },
  { name: "Profile",         href: "/sangha/profile",         icon: UserCircle2 },
];

// Auth routes — no sidebar, no guard
const AUTH_ROUTES = [
  "/sangha/login",
  "/sangha/register",
  "/sangha/verify-otp",
];

export default function SanghaLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sanghaName, setSanghaName]   = useState("");

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (isAuthRoute) return;
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role"); // stored as "sangha" (lowercase)

    // ✅ compare lowercase — backend returns "sangha" not "SANGHA"
    if (!token || (role !== "sangha" && role !== "admin")) {
      router.replace("/sangha/login");
      return;
    }

    setSanghaName(localStorage.getItem("sanghaName") ?? "");
  }, [isAuthRoute, pathname, router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/sangha/login");
  };

  // Render auth pages without layout
  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-accent rounded-md"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {sanghaName || "Sangha Panel"}
                </h1>
                <p className="text-xs text-muted-foreground">Sangha Administration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className={`
          fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64
          bg-white border-r border-border transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"}
                  `}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-secondary/50">
            <div className="text-xs text-muted-foreground text-center">
              <p className="font-medium">Community Portal</p>
              <p className="mt-1">Sangha Module</p>
            </div>
          </div>
        </aside>

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main content ── */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
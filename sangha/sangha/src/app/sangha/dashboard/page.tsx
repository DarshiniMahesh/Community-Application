"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

interface DashboardStats {
  pendingApplications: number;
  approvedUsers: number;
  rejectedUsers: number;
  totalUsers: number;
}

type SanghaStatus = "profile_pending" | "pending_approval" | "approved" | "unknown";

export default function SanghaDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingApplications: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    totalUsers: 0,
  });
  const [status, setStatus] = useState<SanghaStatus>("unknown");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("sanghaStatus") as SanghaStatus | null;
      setStatus(stored || "unknown");
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/sangha/dashboard");
        if (!res.ok) return;
        const data = await res.json();
        setStats({
          pendingApplications: data.pendingApplications ?? data.pending ?? 0,
          approvedUsers: data.approvedUsers ?? data.approved ?? 0,
          rejectedUsers: data.rejectedUsers ?? data.rejected ?? 0,
          totalUsers: data.totalUsers ?? data.total ?? 0,
        });
      } catch {
        // keep defaults
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Pending Applications", value: stats.pendingApplications, icon: Clock, description: "Applications waiting for review", tone: "text-yellow-700 bg-yellow-50" },
    { title: "Approved Users", value: stats.approvedUsers, icon: UserCheck, description: "Users approved by this Sangha", tone: "text-green-700 bg-green-50" },
    { title: "Rejected Users", value: stats.rejectedUsers, icon: UserX, description: "Applications rejected after review", tone: "text-red-700 bg-red-50" },
    { title: "Total Users", value: stats.totalUsers, icon: Users, description: "Total applications handled", tone: "text-primary bg-primary/5" },
  ];

  const renderStatusCard = () => {
    if (status === "profile_pending" || status === "unknown") {
      return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader>
            <CardTitle>Sangha Profile Incomplete</CardTitle>
            <CardDescription>Please complete your Sangha profile so it can be submitted for approval.</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (status === "pending_approval") {
      return (
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader>
            <CardTitle>Sangha Registration Pending</CardTitle>
            <CardDescription>Your Sangha details have been submitted and are awaiting admin approval.</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (status === "approved") {
      return (
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader>
            <CardTitle>Sangha Approved</CardTitle>
            <CardDescription>Your Sangha has been approved. You can now manage member applications.</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Sangha Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of applications managed by your Sangha</p>
      </div>
      {renderStatusCard()}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.tone}`}><card.icon className="h-5 w-5" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <CardDescription>{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

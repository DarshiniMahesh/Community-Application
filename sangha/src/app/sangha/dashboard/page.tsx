"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getSanghaStatus } from "@/lib/api";

interface DashboardStats {
  pendingApplications: number;
  approvedUsers: number;
  rejectedUsers: number;
  changesRequested: number;
  totalUsers: number;
}

export default function SanghaDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingApplications: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    changesRequested: 0,
    totalUsers: 0,
  });
  const [sanghaStatus, setSanghaStatus] = useState<string | null>(null);
  const [sanghaName, setSanghaName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSanghaStatus(getSanghaStatus());
    setSanghaName(localStorage.getItem("sanghaName") ?? "");

    const fetchStats = async () => {
      try {
        const data = await api.get("/sangha/dashboard");
        setStats({
          pendingApplications: data.pendingApplications ?? 0,
          approvedUsers:       data.approvedUsers       ?? 0,
          rejectedUsers:       data.rejectedUsers       ?? 0,
          changesRequested:    data.changesRequested     ?? 0,
          totalUsers:          data.totalUsers           ?? 0,
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Pending Applications", value: stats.pendingApplications, icon: Clock,     tone: "text-yellow-700 bg-yellow-50",  desc: "Awaiting review" },
    { title: "Approved Users",       value: stats.approvedUsers,       icon: UserCheck,  tone: "text-green-700 bg-green-50",   desc: "Approved by this Sangha" },
    { title: "Rejected",             value: stats.rejectedUsers,       icon: UserX,      tone: "text-red-700 bg-red-50",       desc: "Applications rejected" },
    { title: "Changes Requested",    value: stats.changesRequested,    icon: AlertCircle,tone: "text-orange-700 bg-orange-50", desc: "Pending corrections" },
    { title: "Total Users",          value: stats.totalUsers,          icon: Users,      tone: "text-primary bg-primary/5",    desc: "All applications handled" },
  ];

  const renderStatusBanner = () => {
    if (sanghaStatus === "pending_approval") {
      return (
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader>
            <CardTitle>Sangha Pending Approval</CardTitle>
            <CardDescription>Your Sangha registration is awaiting admin approval. Some features may be limited.</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    if (sanghaStatus === "rejected") {
      return (
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader>
            <CardTitle>Sangha Registration Rejected</CardTitle>
            <CardDescription>Your registration was rejected. Please contact the admin for more information.</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          {sanghaName ? `${sanghaName} Dashboard` : "Sangha Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">Overview of applications managed by your Sangha</p>
      </div>

      {renderStatusBanner()}

      {loading ? (
        <p className="text-muted-foreground">Loading stats...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.title} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.tone}`}><card.icon className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <CardDescription>{card.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
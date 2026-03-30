"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const [reportData, setReportData] = useState({
    totalUsers: 42,
    approvedUsers: 28,
    pendingUsers: 10,
    totalSanghaMembers: 8,
  });

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    const membersKey = currentUser ? `sanghaMembers_${currentUser}` : "sanghaMembers";
    const totalSanghaMembers = JSON.parse(localStorage.getItem(membersKey) || "[]").length || 8;
    setReportData((prev) => ({ ...prev, totalSanghaMembers }));
  }, []);

  const handleDownloadCSV = () => {
    const rows = [
      ["Metric", "Count"],
      ["Total Users", String(reportData.totalUsers)],
      ["Approved Users", String(reportData.approvedUsers)],
      ["Pending Users", String(reportData.pendingUsers)],
      ["Total Sangha Members", String(reportData.totalSanghaMembers)],
    ];
    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sangha-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Overview of Sangha metrics.</p>
        </div>
        <Button onClick={handleDownloadCSV}>Download Report (CSV)</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Total Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{reportData.totalUsers}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Approved Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{reportData.approvedUsers}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Pending Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{reportData.pendingUsers}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Total Sangha Members</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{reportData.totalSanghaMembers}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}

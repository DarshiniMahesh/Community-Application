"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ReportData {
  approved_users: string;
  rejected_users: string;
  pending_users: string;
  changes_requested: string;
  total_users: string;
}

export default function ReportsPage() {
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.get("/sangha/reports");
        setData(result);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDownloadCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Count"],
      ["Total Users",        data.total_users],
      ["Approved Users",     data.approved_users],
      ["Rejected Users",     data.rejected_users],
      ["Pending Users",      data.pending_users],
      ["Changes Requested",  data.changes_requested],
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "sangha-report.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const cards = data ? [
    { label: "Total Users",       value: data.total_users },
    { label: "Approved",          value: data.approved_users },
    { label: "Pending",           value: data.pending_users },
    { label: "Rejected",          value: data.rejected_users },
    { label: "Changes Requested", value: data.changes_requested },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Overview of Sangha metrics from the database</p>
        </div>
        <Button onClick={handleDownloadCSV} disabled={!data}>Download CSV</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading report data...</p>
      ) : !data ? (
        <p className="text-muted-foreground">Could not load report data.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-sm">
              <CardHeader><CardTitle className="text-base">{c.label}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-semibold">{c.value}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
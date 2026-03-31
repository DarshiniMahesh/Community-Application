"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface ActivityLog {
  id: string;
  action: "approved" | "rejected" | "changes_requested";
  comment: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

const actionStyle: Record<string, string> = {
  approved:          "bg-green-100 text-green-800",
  rejected:          "bg-red-100 text-red-800",
  changes_requested: "bg-orange-100 text-orange-800",
};

const actionLabel: Record<string, string> = {
  approved:          "Approved",
  rejected:          "Rejected",
  changes_requested: "Changes Requested",
};

export default function ActivityLogsPage() {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get("/sangha/activity-logs");
        setLogs(data);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const displayName = (log: ActivityLog) =>
    log.first_name || log.last_name
      ? `${log.first_name ?? ""} ${log.last_name ?? ""}`.trim()
      : log.email || log.phone || "Unknown User";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">All review actions performed by your Sangha</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-md p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{displayName(log)}</span>
                    <Badge className={`${actionStyle[log.action] ?? ""} border-0`}>
                      {actionLabel[log.action] ?? log.action}
                    </Badge>
                  </div>
                  {log.comment && <p className="text-sm text-muted-foreground">Note: {log.comment}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
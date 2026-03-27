"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityLog {
  action: "Approved" | "Rejected" | "Added Member";
  by: "Admin" | "Sangha";
  userId?: string | number;
  date: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    const logsKey = currentUser ? `activityLogs_${currentUser}` : "activityLogs";
    const storedLogs = JSON.parse(localStorage.getItem(logsKey) || "[]");
    setLogs(storedLogs);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Track recent Sangha actions.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={`${log.date}-${index}`} className="border rounded-md p-3">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground">Done by: {log.by}</p>
                  <p className="text-sm text-muted-foreground">Date & Time: {new Date(log.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

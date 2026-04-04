"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

type SubTab = "all" | "approved" | "rejected" | "changes_requested";

interface ActivityLog {
  profile_id:     string;
  user_id:        string;
  email:          string | null;
  phone:          string | null;
  first_name:     string | null;
  last_name:      string | null;
  status:         string;
  submitted_at:   string | null;
  reviewed_at:    string | null;
  review_comment: string | null;
}

const TABS: { key: SubTab; label: string }[] = [
  { key: "all",               label: "All" },
  { key: "approved",          label: "Approved" },
  { key: "rejected",          label: "Rejected" },
  { key: "changes_requested", label: "Changes Requested" },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case "approved":          return "bg-green-100 text-green-800 border-0";
    case "rejected":          return "bg-red-100 text-red-800 border-0";
    case "changes_requested": return "bg-orange-100 text-orange-800 border-0";
    case "submitted":
    case "under_review":      return "bg-yellow-100 text-yellow-800 border-0";
    default:                  return "bg-gray-100 text-gray-800 border-0";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "approved":          return "Approved";
    case "rejected":          return "Rejected";
    case "changes_requested": return "Changes Requested";
    case "submitted":         return "Submitted";
    case "under_review":      return "Under Review";
    default:                  return status;
  }
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN") : "—";
}

export default function ActivityLogsPage() {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<SubTab>("all");

  useEffect(() => {
    api
      .get("/sangha/activity-logs")
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const displayName = (log: ActivityLog) =>
    log.first_name || log.last_name
      ? `${log.first_name ?? ""} ${log.last_name ?? ""}`.trim()
      : log.email || log.phone || "Unknown";

  const countFor = (t: SubTab) =>
    t === "all" ? logs.length : logs.filter((l) => l.status === t).length;

  const filtered =
    tab === "all" ? logs : logs.filter((l) => l.status === tab);

  const isReviewed = (status: string) =>
    status === "approved" || status === "rejected" || status === "changes_requested";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          All member profiles and their current review status
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle>Profile Activity</CardTitle>
          <div className="flex gap-0 border-b mt-4">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {countFor(key)}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.profile_id}>
                      <TableCell className="font-medium">{displayName(log)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.phone || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(log.submitted_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(log.status)}>
                          {statusLabel(log.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {isReviewed(log.status) ? fmt(log.reviewed_at) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.review_comment || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
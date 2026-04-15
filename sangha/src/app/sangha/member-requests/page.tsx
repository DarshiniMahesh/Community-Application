"use client";

import { useEffect, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Request {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  tenure: "part_time" | "full_time";
  status: "pending" | "approved" | "rejected";
}

const formatTenure = (t: string) => {
  if (t === "part_time") return "Part Time";
  if (t === "full_time") return "Full Time";
  return t;
};

export default function MemberRequestsPage() {

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const data = await api.get("/sangha/member-requests");
      setRequests(data);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.post("/sangha/approve-request", { entryId: id });
      toast.success("Request approved");
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "approved" } : r)
      );
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post("/sangha/reject-request", { entryId: id });
      toast.success("Request rejected");
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "rejected" } : r)
      );
    } catch {
      toast.error("Failed to reject");
    }
  };

  const displayName = (r: Request) =>
    `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Member Requests</h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject sangha membership requests
        </p>
      </div>

      {/* Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No pending requests
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((r) => (
                    <TableRow key={r.id}>

                      {/* Name */}
                      <TableCell className="font-medium">
                        {displayName(r)}
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        {r.phone || r.email}
                      </TableCell>

                      {/* Role */}
                      <TableCell>{r.role}</TableCell>

                      {/* Tenure */}
                      <TableCell>
                        <Badge variant="outline">{formatTenure(r.tenure)}</Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={
                            r.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : r.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(r.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(r.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
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
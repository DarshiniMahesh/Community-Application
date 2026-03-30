"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserRecord {
  id: string | number;
  name?: string;
  village?: string;
  phone?: string;
  email?: string;
  status?: string;
  sanghaId?: string | number;
  sangha_id?: string | number;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sanghaId, setSanghaId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = window.localStorage.getItem("currentUser");
    setCurrentUser(user);
    setSanghaId(window.localStorage.getItem("sanghaId"));
    if (user) {
      const savedOverrides = JSON.parse(window.localStorage.getItem(`userManagementStatus_${user}`) || "{}");
      setStatusOverrides(savedOverrides);
    }
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) {
          setUsers([]);
          return;
        }
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!sanghaId) return users;
    return users.filter((user) => {
      const userSanghaId = user.sanghaId ?? user.sangha_id;
      return userSanghaId != null && userSanghaId.toString() === sanghaId;
    });
  }, [users, sanghaId]);

  const handleAction = async (userId: string | number, action: "approve" | "reject") => {
    try {
      setProcessingId(userId);
      const res = await fetch(`/api/sangha/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data && (data.message || data.error)) || `Failed to ${action} user`;
        toast.error(message);
        return;
      }
      if (currentUser) {
        const updatedOverrides = {
          ...statusOverrides,
          [String(userId)]: action === "approve" ? "Approved" : "Rejected",
        };
        setStatusOverrides(updatedOverrides);
        window.localStorage.setItem(`userManagementStatus_${currentUser}`, JSON.stringify(updatedOverrides));
      }
      toast.success(`User ${action === "approve" ? "approved" : "rejected"} successfully`);
    } catch {
      toast.error(`Unable to ${action} user`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Review and manage users for this Sangha.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Users are fetched from API and filtered by Sangha.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[320px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>{user.village || "-"}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{statusOverrides[String(user.id)] || user.status || "Pending"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/sangha/review-user?id=${user.id}`)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(user.id, "approve")}
                              disabled={processingId === user.id}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAction(user.id, "reject")}
                              disabled={processingId === user.id}
                            >
                              Reject
                            </Button>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

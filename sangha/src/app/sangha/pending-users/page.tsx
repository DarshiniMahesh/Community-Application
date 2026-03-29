"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock } from "lucide-react";

interface PendingUser {
  id: string | number; name: string; village?: string; phone?: string;
  applicationDate?: string; createdAt?: string; created_at?: string;
  sanghaId?: string | number; sangha_id?: string | number;
}

export default function PendingUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [sanghaId, setSanghaId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRole(window.localStorage.getItem("role"));
    setSanghaId(window.localStorage.getItem("sanghaId"));
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users/pending");
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setUsers(data || []);
      } catch { setUsers([]); } finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!sanghaId || role === "ADMIN") return users;
    return users.filter((user) => {
      const userSanghaId = user.sanghaId ?? user.sangha_id;
      return userSanghaId != null && userSanghaId.toString() === sanghaId;
    });
  }, [users, sanghaId, role]);

  const formatDate = (user: PendingUser) => {
    const raw = user.applicationDate || user.createdAt || user.created_at;
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Pending Applications</h1>
          <p className="text-muted-foreground mt-1">Review and manage user applications awaiting Sangha approval</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{filteredUsers.length} pending</span>
        </Badge>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Applications Queue</CardTitle>
          <CardDescription>Only applications belonging to this Sangha are listed. Admins can see all applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Application Date</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading pending applications...</TableCell></TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No pending applications found.</TableCell></TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.village || "-"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{user.phone || "-"}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatDate(user)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/sangha/review-user?id=${user.id}`)}>
                            Review <ArrowRight className="h-4 w-4" />
                          </Button>
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

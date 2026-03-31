"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface PendingUser {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  submitted_at: string;
  overall_completion_pct: number;
  first_name: string | null;
  last_name: string | null;
}

export default function PendingUsersPage() {
  const router = useRouter();
  const [users, setUsers]   = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get("/sangha/pending-users");
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const displayName = (u: PendingUser) =>
    u.first_name || u.last_name
      ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
      : u.email || u.phone || "—";

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Pending Applications</h1>
          <p className="text-muted-foreground mt-1">Review applications awaiting your decision</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-4 w-4" />{users.length} pending
        </Badge>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Applications Queue</CardTitle>
          <CardDescription>Applications submitted by users assigned to your Sangha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No pending applications.</TableCell></TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{displayName(u)}</TableCell>
                        <TableCell>{u.phone || u.email || "—"}</TableCell>
                        <TableCell>{u.overall_completion_pct ?? 0}%</TableCell>
                        <TableCell>{formatDate(u.submitted_at)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="gap-1"
                            onClick={() => router.push(`/sangha/review-user?id=${u.id}`)}>
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
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Member {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  member_type: string | null;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const data = await api.get("/sangha/team-members");
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDelete = async (memberId: string) => {
    try {
      await api.delete(`/sangha/team-members/${memberId}`);
      toast.success("Member deleted");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete member");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Sangha Members</h1>
          <p className="text-muted-foreground mt-1">Internal Sangha team members</p>
        </div>
        <Button onClick={() => router.push("/sangha/members/add")}>
          <Plus className="h-4 w-4 mr-2" />Add Member
        </Button>
      </div>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Members List</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Member Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : members.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No members added yet.</TableCell></TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.full_name}</TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell>{m.member_type || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)}>Delete</Button>
                        </div>
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
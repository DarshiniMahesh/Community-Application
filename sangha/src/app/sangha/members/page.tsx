"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id?: string;
  fullName: string;
  role: string;
  phone: string;
  memberType: string;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersKey, setMembersKey] = useState("sanghaMembers");

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    const key = currentUser ? `sanghaMembers_${currentUser}` : "sanghaMembers";
    setMembersKey(key);
    const storedMembers = JSON.parse(localStorage.getItem(key) || "[]");
    setMembers(storedMembers);
  }, []);

  const handleDelete = (memberIndex: number) => {
    const updatedMembers = members.filter((_, index) => index !== memberIndex);
    setMembers(updatedMembers);
    localStorage.setItem(membersKey, JSON.stringify(updatedMembers));
    toast.success("Member deleted");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Sangha Members</h1>
          <p className="text-muted-foreground mt-1">Manage internally added Sangha team members.</p>
        </div>
        <Button onClick={() => router.push("/sangha/members/add")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Members List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Member Type</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No members added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member, index) => (
                      <TableRow key={member.id || `${member.fullName}-${index}`}>
                        <TableCell>{member.fullName}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.memberType}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(index)}>
                              Delete
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
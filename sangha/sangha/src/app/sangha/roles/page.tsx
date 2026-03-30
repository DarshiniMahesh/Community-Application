"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roles = [
  "Common Member",
  "Treasurer",
  "Accountant",
  "Secretary",
  "Honorary Secretary",
  "President",
  "Honorary President",
  "Legal Advisory",
  "Auditor"
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Sangha Roles</h1>
        <p className="text-muted-foreground mt-1">List of available roles in the Sangha.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{role}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role description for {role.toLowerCase()}.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
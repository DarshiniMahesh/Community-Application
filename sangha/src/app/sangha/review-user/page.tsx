"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Users, Briefcase, GraduationCap, FileText, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface UserDetails {
  id: string | number; name: string; village?: string; phone?: string; email?: string;
  personal?: Record<string, any>; family?: Record<string, any>;
  occupation?: Record<string, any>; education?: Record<string, any>;
  documents?: { name: string; url: string }[];
  [key: string]: any;
}

function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${id}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setUser(data);
      } catch { setUser(null); } finally { setLoading(false); }
    };
    fetchUser();
  }, [id]);

  const handleDecision = async (action: "approve" | "reject") => {
    if (!id) return;
    try {
      setSubmitting(action);
      const res = await fetch(`/api/sangha/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data && (data.message || data.error)) || `Failed to ${action} application`;
        toast.error(message); return;
      }
      toast.success(`Application ${action === "approve" ? "approved" : "rejected"} successfully`);
      router.push("/sangha/pending-users");
    } catch { toast.error("Something went wrong while updating application"); } finally { setSubmitting(null); }
  };

  if (!id) return <div className="max-w-4xl mx-auto py-8"><p className="text-muted-foreground">No application selected.</p></div>;
  if (loading) return <div className="max-w-4xl mx-auto py-8"><p className="text-muted-foreground">Loading application details...</p></div>;
  if (!user) return <div className="max-w-4xl mx-auto py-8"><p className="text-muted-foreground">Unable to load application details.</p></div>;

  const personal   = user.personal   || {};
  const family     = user.family     || {};
  const occupation = user.occupation || {};
  const education  = user.education  || {};
  const documents  = user.documents  || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/sangha/pending-users")}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Review Application</h1>
            <p className="text-muted-foreground mt-1">Verify the details before approving or rejecting this application</p>
          </div>
        </div>
        <Badge variant="secondary">Pending Review</Badge>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Personal Details</CardTitle>
          <CardDescription>Basic information of the applicant</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-2 gap-4">
            <div><dt className="text-sm text-muted-foreground">Full Name</dt><dd className="font-medium">{user.name}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Village</dt><dd className="font-medium">{user.village || "-"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Phone</dt><dd className="font-medium">{user.phone || personal.phone || "-"}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Email</dt><dd className="font-medium">{user.email || personal.email || "-"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Family Details</CardTitle>
          <CardDescription>Overview of family information</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(family).length === 0 ? (
            <p className="text-sm text-muted-foreground">No family details available.</p>
          ) : (
            <dl className="grid md:grid-cols-2 gap-4">
              {Object.entries(family).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Occupation</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(occupation).length === 0 ? <p className="text-sm text-muted-foreground">No occupation details available.</p> : (
              <dl className="space-y-2">
                {Object.entries(occupation).map(([key, value]) => (
                  <div key={key}><dt className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="font-medium">{String(value)}</dd></div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Education</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(education).length === 0 ? <p className="text-sm text-muted-foreground">No education details available.</p> : (
              <dl className="space-y-2">
                {Object.entries(education).map(([key, value]) => (
                  <div key={key}><dt className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="font-medium">{String(value)}</dd></div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Uploaded Documents</CardTitle></CardHeader>
        <CardContent>
          {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.url} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{doc.name}</span>
                  <Button asChild variant="outline" size="sm"><a href={doc.url} target="_blank" rel="noopener noreferrer">View</a></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm bg-secondary/30">
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>Approve if the details are correct and complete, otherwise reject with corrections.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button className="gap-2" onClick={() => handleDecision("approve")} disabled={submitting !== null}>
            <CheckCircle2 className="h-4 w-4" />{submitting === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button variant="destructive" className="gap-2" onClick={() => handleDecision("reject")} disabled={submitting !== null}>
            <XCircle className="h-4 w-4" />{submitting === "reject" ? "Rejecting..." : "Reject"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReviewUser() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-8"><p className="text-muted-foreground">Loading...</p></div>}>
      <ReviewContent />
    </Suspense>
  );
}

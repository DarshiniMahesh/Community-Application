"use client";

import { ProfileDetail } from "../user-management/page";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("id");

  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | "changes" | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const result = await api.get(`/sangha/review-user/${userId}`);
        setData(result);
      } catch (err: any) {
        toast.error(err.message || "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleDecision = async (action: "approve" | "reject" | "changes") => {
    if (action !== "approve" && !comment.trim()) {
      toast.error("Please add a comment before rejecting or requesting changes");
      return;
    }
    setSubmitting(action);
    try {
      const endpoint =
        action === "approve" ? "/sangha/approve"
        : action === "reject" ? "/sangha/reject"
        : "/sangha/request-changes";
      await api.post(endpoint, { userId, comment: comment.trim() || undefined });
      toast.success(
        action === "approve" ? "User approved!"
        : action === "reject" ? "User rejected"
        : "Changes requested"
      );
      router.push("/sangha/pending-users");
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setSubmitting(null);
    }
  };

  if (!userId) return <p className="text-muted-foreground p-8">No user selected.</p>;
  if (loading) return <p className="text-muted-foreground p-8">Loading application...</p>;
  if (!data)   return <p className="text-muted-foreground p-8">Could not load application.</p>;

  const { profile } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/sangha/pending-users")}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Review Application</h1>
            <p className="text-muted-foreground mt-1">Verify details before making a decision</p>
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">{profile?.status}</Badge>
      </div>

      {/* ── Sangha Warning ── */}
      {data?.step1?.is_part_of_sangha === "yes" && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded mt-4">
          ⚠ This user claims to be a Sangha member.
          Please verify role and tenure before approval.
        </div>
      )}

      {/* ── Profile Details ── */}
      <ProfileDetail data={data}/>

      {/* ── Decision ── */}
      <Card className="shadow-sm bg-secondary/30">
        <CardHeader>
          <CardTitle>Decision</CardTitle>
          <CardDescription>Add a comment (required for reject / request changes)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Add notes or reason for your decision..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" onClick={() => handleDecision("approve")} disabled={submitting !== null}>
              <CheckCircle2 className="h-4 w-4" />
              {submitting === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleDecision("changes")} disabled={submitting !== null}>
              <MessageSquare className="h-4 w-4" />
              {submitting === "changes" ? "Requesting..." : "Request Changes"}
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => handleDecision("reject")} disabled={submitting !== null}>
              <XCircle className="h-4 w-4" />
              {submitting === "reject" ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function ReviewUserPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading...</p>}>
      <ReviewContent />
    </Suspense>
  );
}
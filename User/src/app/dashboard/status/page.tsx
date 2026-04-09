"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Edit, FileText, Calendar, User, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

type StatusType = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested";

const getStatusConfig = (status: StatusType) => {
  switch (status) {
    case "draft":             return { badge: <Badge variant="secondary">Draft</Badge>, icon: <Edit className="h-12 w-12 text-gray-600" />, title: "Profile Not Submitted", description: "Your profile is in draft. Complete and submit for approval.", color: "bg-gray-100", borderColor: "border-l-gray-400" };
    case "submitted":         return { badge: <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>, icon: <Clock className="h-12 w-12 text-blue-600" />, title: "Submitted", description: "Your profile is submitted and awaiting Sangha review.", color: "bg-blue-50", borderColor: "border-l-blue-500" };
    case "under_review":      return { badge: <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>, icon: <Clock className="h-12 w-12 text-yellow-600" />, title: "Under Review", description: "Sangha is currently reviewing your profile.", color: "bg-yellow-50", borderColor: "border-l-yellow-500" };
    case "approved":          return { badge: <Badge className="bg-green-100 text-green-800">Approved</Badge>, icon: <CheckCircle2 className="h-12 w-12 text-green-600" />, title: "Profile Approved", description: "Your profile has been verified and approved!", color: "bg-green-50", borderColor: "border-l-green-500" };
    case "rejected":          return { badge: <Badge variant="destructive">Rejected</Badge>, icon: <XCircle className="h-12 w-12 text-destructive" />, title: "Profile Rejected", description: "Your profile requires corrections. Review the feedback and resubmit.", color: "bg-red-50", borderColor: "border-l-red-500" };
    case "changes_requested": return { badge: <Badge className="bg-orange-100 text-orange-800">Changes Requested</Badge>, icon: <AlertCircle className="h-12 w-12 text-orange-600" />, title: "Changes Requested", description: "Sangha has requested changes to your profile.", color: "bg-orange-50", borderColor: "border-l-orange-500" };
    default:                  return { badge: <Badge variant="secondary">Draft</Badge>, icon: <Edit className="h-12 w-12 text-gray-600" />, title: "Draft", description: "Complete your profile.", color: "bg-gray-100", borderColor: "border-l-gray-400" };
  }
};

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/profile")
      .then(data => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.get("/users/profile")
        .then(data => setProfile(data))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin mr-2 text-muted-foreground" /></div>;

  const status = (profile?.status as StatusType) || "draft";
  const config = getStatusConfig(status);
  const submittedAt = profile?.submitted_at as string | null;
  const reviewedAt = profile?.reviewed_at as string | null;
  const reviewComment = profile?.review_comment as string | null;

  const timeline = [];
  if (submittedAt) {
  timeline.push({
    date: new Date(submittedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    title: "Profile Submitted",
    description: "Your profile was successfully submitted for review.",
    icon: FileText,
  });
}
  if (["under_review", "approved", "rejected", "changes_requested"].includes(status)) {
    timeline.push({ date: reviewedAt ? new Date(reviewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "In progress", title: "Under Review", description: "Sangha administration is reviewing your profile.", icon: Clock });
  }
  if (status === "approved") timeline.push({ date: reviewedAt ? new Date(reviewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "", title: "Profile Approved", description: "Your profile has been verified and approved.", icon: CheckCircle2 });
  if (status === "rejected") timeline.push({ date: reviewedAt ? new Date(reviewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "", title: "Profile Rejected", description: reviewComment || "Please review feedback and resubmit.", icon: XCircle });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Application Status</h1>
        <p className="text-muted-foreground mt-1">Track the progress of your profile verification</p>
      </div>

      <Card className={`shadow-sm border-l-4 ${config.borderColor}`}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-full ${config.color}`}>{config.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{config.title}</CardTitle>
                {config.badge}
              </div>
              <CardDescription className="text-base">{config.description}</CardDescription>
              {reviewComment && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Feedback from Sangha:</p>
                  <p className="text-sm text-red-700 mt-1">{reviewComment}</p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {timeline.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Review Timeline</CardTitle>
            <CardDescription>Progress of your application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <div key={i} className="relative flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center z-10 shadow-sm">
                      <item.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <span className="text-xs text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{item.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
                {["submitted", "under_review"].includes(status) && (
                  <div className="relative flex gap-4 opacity-40">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center z-10">
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-muted-foreground">Awaiting Approval</h4>
                      <p className="text-sm text-muted-foreground">Final verification by Sangha</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Submission Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted On</p>
                <p className="font-medium">  {submittedAt    ? new Date(submittedAt).toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Not yet submitted"}
</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Profile Status</p>
                <p className="font-medium capitalize">{status.replace("_", " ")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm bg-secondary/30">
        <CardHeader><CardTitle>Next Steps</CardTitle></CardHeader>
        <CardContent>
          {status === "draft" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Complete your profile and submit for approval.</p>
              <Button onClick={() => router.push("/dashboard/profile")} className="gap-2"><Edit className="h-4 w-4" /> Continue Editing</Button>
            </div>
          )}
          {["submitted", "under_review"].includes(status) && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your profile is under review. This typically takes 2–3 business days.</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            </div>
          )}
          {status === "approved" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your profile is approved. You can now access all community features.</p>
              <div className="flex gap-3">
                <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/profile/review-submit")}>View Profile</Button>
              </div>
            </div>
          )}
          {["rejected", "changes_requested"].includes(status) && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Please review the feedback and update your profile.</p>
              <Button onClick={() => router.push("/dashboard/profile")} variant="destructive" className="gap-2"><Edit className="h-4 w-4" /> Edit & Resubmit</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
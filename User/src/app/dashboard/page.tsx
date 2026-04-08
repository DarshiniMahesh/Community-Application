"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Users, MapPin, GraduationCap, Wallet, FileText, Clock, CheckCircle2, Edit, ArrowRight, AlertCircle, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const profileSections = [
  { name: "Personal Details",       stepKey: "step1_completed", href: "/dashboard/profile/personal-details",   icon: User },
  { name: "Religious Details",      stepKey: "step2_completed", href: "/dashboard/profile/religious-details",  icon: FileText },
  { name: "Family Information",     stepKey: "step3_completed", href: "/dashboard/profile/family-information", icon: Users },
  { name: "Location Information",   stepKey: "step4_completed", href: "/dashboard/profile/location-information", icon: MapPin },
  { name: "Education & Profession", stepKey: "step5_completed", href: "/dashboard/profile/education-profession", icon: GraduationCap },
  { name: "Economic Details",       stepKey: "step6_completed", href: "/dashboard/profile/economic-details",   icon: Wallet },
  { name: "Review & Submit",        stepKey: null,              href: "/dashboard/profile/review-submit",      icon: CheckCircle2 },
];

type ProfileStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested";

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchProfile = () => {
    api.get("/users/profile")
      .then(data => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const status = (profile?.status as ProfileStatus) || "draft";
  const isLocked = ["submitted", "under_review"].includes(status);
  const canReset = status === "draft" || status === "changes_requested" || status === "approved";
  const completionPct =
  typeof profile?.overall_completion_pct === "number"
    ? profile.overall_completion_pct
    : 0;
  const completedCount = profileSections.filter(s => s.stepKey && profile?.[s.stepKey]).length;
  const nextStep = profileSections.find(s => s.stepKey && !profile?.[s.stepKey])?.href || "/dashboard/profile/review-submit";

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset", {});
      toast.success("Profile reset successfully. You can start fresh.");
      fetchProfile();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  const getStatusConfig = (status: ProfileStatus) => {
    switch (status) {
      case "draft":             return { badge: <Badge variant="secondary">Draft</Badge>, message: "Your profile is incomplete. Continue filling out your information.", icon: <Edit className="h-5 w-5 text-gray-600" /> };
      case "submitted":         return { badge: <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>, message: "Your application is submitted and awaiting Sangha review.", icon: <Clock className="h-5 w-5 text-blue-600" /> };
      case "under_review":      return { badge: <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>, message: "Your profile is currently being reviewed by the Sangha.", icon: <Clock className="h-5 w-5 text-yellow-600" /> };
      case "approved":          return { badge: <Badge className="bg-green-100 text-green-800">Approved</Badge>, message: "Your profile has been verified and approved!", icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> };
      case "rejected":          return { badge: <Badge variant="destructive">Rejected</Badge>, message: "Your profile was rejected. Please review feedback and resubmit.", icon: <AlertCircle className="h-5 w-5 text-destructive" /> };
      case "changes_requested": return { badge: <Badge className="bg-orange-100 text-orange-800">Changes Requested</Badge>, message: "Sangha has requested changes. Please update and resubmit.", icon: <AlertCircle className="h-5 w-5 text-orange-600" /> };
      default:                  return { badge: <Badge variant="secondary">Draft</Badge>, message: "Continue filling your profile.", icon: <Edit className="h-5 w-5" /> };
    }
  };

  const statusConfig = getStatusConfig(status);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  if (status === "approved") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Profile Approved!</h2>
                <p className="text-muted-foreground mt-2">Your community registration has been verified and approved by the Sangha.</p>
              </div>
              <div className="flex gap-3 mt-2 flex-wrap justify-center">
                <Button onClick={() => router.push("/dashboard/profile")}>View Profile</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/status")}>View Status</Button>
                {canReset && (
                  <Button variant="outline" className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setShowResetDialog(true)}>
                    <RotateCcw className="h-4 w-4" /> Reset & Re-apply
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all your profile data and let you start fresh. Your account will remain but all filled information will be deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-destructive hover:bg-destructive/90">
                {resetting ? "Resetting..." : "Yes, Reset Everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Welcome to Your Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your community profile and track your registration status</p>
        </div>
        {canReset && (
          <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4" /> Reset Profile
          </Button>
        )}
      </div>

      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">{statusConfig.icon} Current Status</CardTitle>
              <CardDescription>{statusConfig.message}</CardDescription>
            </div>
            {statusConfig.badge}
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile Completion</CardTitle>
              <CardDescription>Complete all sections to submit for approval</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{completionPct}%</div>
              <div className="text-xs text-muted-foreground">{completedCount} of 6 sections</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionPct} className="h-3" />
          <div className="grid gap-3">
            {profileSections.map((section) => {
              const completed = section.stepKey ? !!profile?.[section.stepKey] : false;
              return (
                <div key={section.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${completed ? "bg-green-100" : "bg-muted"}`}>
                      <section.icon className={`h-5 w-5 ${completed ? "text-green-700" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{section.name}</p>
                      <p className="text-xs text-muted-foreground">{completed ? "Completed" : "Not started"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {completed && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    <Button variant="ghost" size="sm"
                      disabled={isLocked && section.href !== "/dashboard/profile/review-submit"}
                      onClick={() => router.push(section.href)} className="gap-1">
                      {completed ? "Edit" : "Start"} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              disabled={isLocked}
              onClick={() => router.push(nextStep)}>
              <Edit className="h-6 w-6 text-primary" /><span>Continue Editing</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push("/dashboard/profile/review-submit")}>
              <FileText className="h-6 w-6 text-primary" /><span>Review Details</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push("/dashboard/status")}>
              <Clock className="h-6 w-6 text-primary" /><span>View Status</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your profile data and let you start fresh. Your account will remain but all filled information will be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-destructive hover:bg-destructive/90">
              {resetting ? "Resetting..." : "Yes, Reset Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { User, Users, Briefcase, GraduationCap, MapPin, CheckCircle2, XCircle, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("id");

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [comment, setComment]     = useState("");
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
      const endpoint = action === "approve" ? "/sangha/approve"
                     : action === "reject"  ? "/sangha/reject"
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

  if (!userId)  return <p className="text-muted-foreground p-8">No user selected.</p>;
  if (loading)  return <p className="text-muted-foreground p-8">Loading application...</p>;
  if (!data)    return <p className="text-muted-foreground p-8">Could not load application.</p>;

  const { user, profile, step1, step2, step3, step4, step5, step6 } = data;
  const isSanghaMemberClaim = step1?.is_part_of_sangha === "yes";

  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

      {/* Personal */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Personal Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-2 gap-4">
            <Row label="Full Name" value={step1 ? `${step1.first_name ?? ""} ${step1.middle_name ?? ""} ${step1.last_name ?? ""}`.trim() : null} />
            <Row label="Gender"    value={step1?.gender} />
            <Row label="DOB"       value={step1?.date_of_birth} />
            <Row label="Phone"     value={user?.phone} />
            <Row label="Email"     value={user?.email} />
            <Row label="Married"   value={step1?.is_married ? "Yes" : "No"} />
            <Row label="Father"    value={step1?.fathers_name} />
            <Row label="Mother"    value={step1?.mothers_name} />
            {step1?.is_married && <Row label="Spouse" value={step1?.wife_name || step1?.husbands_name} />}
          </dl>
        </CardContent>
      </Card>
      {isSanghaMemberClaim && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardHeader><CardTitle className="text-yellow-700">Sangha Membership claim</CardTitle></CardHeader>
          <CardContent className="text-sm text-yellow-800 space-y-2">
            <p><ul className="list-disc ml-5 space-y-1">
              <li>verify in Sangha Members list</li>
              <li>OR verify in physical register</li></ul>
              <p className="font-medium">Approve only if verfied</p></p></CardContent></Card>)}

      {/* Religious */}
      {step2 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><span className="text-primary">🕉</span>Religious Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid md:grid-cols-2 gap-4">
              <Row label="Gotra"       value={step2.gotra} />
              <Row label="Kuladevata"  value={step2.kuladevata} />
              <Row label="Priest"      value={step2.priest_name} />
              <Row label="Priest Location" value={step2.priest_location} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Family */}
      {step3?.members?.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Family Members</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {step3.members.map((m: any, i: number) => (
                <div key={i} className="flex gap-4 text-sm border rounded-md p-3">
                  <span className="font-medium w-32">{m.relation}</span>
                  <span>{m.name || "—"}</span>
                  <span className="text-muted-foreground">{m.age ? `Age ${m.age}` : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addresses */}
      {step4?.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Addresses</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {step4.map((addr: any, i: number) => (
                <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                  <p className="font-medium capitalize">{addr.address_type} Address</p>
                  <p>{[addr.flat_no, addr.building, addr.street, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {step5?.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Education & Profession</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {step5.map((m: any, i: number) => (
                <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                  <p className="font-medium">{m.member_name} <span className="text-muted-foreground font-normal">({m.member_relation})</span></p>
                  <p>Education: {m.highest_education || "—"}</p>
                  <p>Profession: {m.profession_type || "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Economic */}
      {step6?.economic && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Economic Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid md:grid-cols-2 gap-4">
              <Row label="Self Income"   value={step6.economic.self_income} />
              <Row label="Family Income" value={step6.economic.family_income} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Decision */}
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
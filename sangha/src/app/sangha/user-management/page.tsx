"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  User, Users, MapPin, GraduationCap,
  Briefcase, CheckCircle2, XCircle, MessageSquare, X,
} from "lucide-react";

interface Member {
  id: string;
  email: string;
  phone: string;
  profile_id: string;
  status: string;
  overall_completion_pct: number;
  submitted_at: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
}

const statusColor: Record<string, string> = {
  approved:          "bg-green-100 text-green-800",
  rejected:          "bg-red-100 text-red-800",
  submitted:         "bg-yellow-100 text-yellow-800",
  under_review:      "bg-blue-100 text-blue-800",
  changes_requested: "bg-orange-100 text-orange-800",
  draft:             "bg-gray-100 text-gray-800",
};

function formatDate(raw?: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-0.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium text-foreground">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function ProfileModal({
  userId,
  onClose,
  onAction,
}: {
  userId: string;
  onClose: () => void;
  onAction: () => void;
}) {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [comment, setComment]   = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | "changes" | null>(null);

  useEffect(() => {
    api.get(`/sangha/review-user/${userId}`)
      .then(setData)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDecision = async (action: "approve" | "reject" | "changes") => {
    if (action !== "approve" && !comment.trim()) {
      toast.error("Comment required for reject / request changes");
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
      onAction();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>User Profile Review</DialogTitle>
            {data?.profile?.status && (
              <Badge className={`${statusColor[data.profile.status] ?? ""} capitalize border-0 mr-6`}>
                {data.profile.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center">Loading profile...</p>
        ) : !data ? (
          <p className="text-muted-foreground py-8 text-center">Could not load profile.</p>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Personal */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Full Name"
                    value={data.step1
                      ? [data.step1.first_name, data.step1.middle_name, data.step1.last_name].filter(Boolean).join(" ")
                      : null}
                  />
                  <Field label="Gender"        value={data.step1?.gender} />
                  <Field label="Date of Birth" value={formatDate(data.step1?.date_of_birth)} />
                  <Field label="Phone"         value={data.user?.phone} />
                  <Field label="Email"         value={data.user?.email} />
                  <Field label="Married"       value={data.step1?.is_married ? "Yes" : "No"} />
                  <Field label="Father"        value={data.step1?.fathers_name} />
                  <Field label="Mother"        value={data.step1?.mothers_name} />
                  {data.step1?.is_married && (
                    <Field label="Spouse" value={data.step1?.wife_name || data.step1?.husbands_name} />
                  )}
                  <Field label="Disability"
                    value={data.step1?.has_disability === "yes" ? "Yes"
                         : data.step1?.has_disability === "no" ? "No" : null}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Religious */}
            {data.step2 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-primary">🕉</span>Religious Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Gotra"           value={data.step2.gotra} />
                    <Field label="Kuladevata"      value={data.step2.kuladevata_other || data.step2.kuladevata} />
                    <Field label="Priest"          value={data.step2.priest_name} />
                    <Field label="Priest Location" value={data.step2.priest_location} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family */}
            {data.step3?.members?.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />Family Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.step3.members.map((m: any, i: number) => (
                      <div key={i} className="grid grid-cols-4 gap-3 text-sm border rounded-md p-3">
                        <span className="font-medium">{m.relation}</span>
                        <span>{m.name || "—"}</span>
                        <span className="text-muted-foreground capitalize">{m.gender || "—"}</span>
                        <span className="text-muted-foreground">
                          {m.dob ? formatDate(m.dob) : m.age ? `Age ${m.age}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses */}
            {data.step4?.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />Addresses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.step4.map((addr: any, i: number) => (
                      <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                        <p className="font-medium capitalize">{addr.address_type} Address</p>
                        <p className="text-muted-foreground">
                          {[addr.flat_no, addr.building, addr.street, addr.area,
                            addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {data.step5?.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />Education & Profession
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.step5.map((m: any, i: number) => (
                      <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                        <p className="font-medium">
                          {m.member_name || "Self"}
                          {m.member_relation && (
                            <span className="text-muted-foreground font-normal"> ({m.member_relation})</span>
                          )}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Row label="Education"  value={m.highest_education} />
                          <Row label="Profession" value={m.profession_type} />
                          <Row label="Industry"   value={m.industry} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Economic */}
            {data.step6?.economic && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />Economic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="Self Income"   value={data.step6.economic.self_income} />
                    <Row label="Family Income" value={data.step6.economic.family_income} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Decision */}
            <div className="space-y-3">
              <Label className="font-medium">Decision</Label>
              <Textarea
                placeholder="Add a comment (required for reject / request changes)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="gap-2"
                  onClick={() => handleDecision("approve")}
                  disabled={submitting !== null}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting === "approve" ? "Approving..." : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDecision("changes")}
                  disabled={submitting !== null}
                >
                  <MessageSquare className="h-4 w-4" />
                  {submitting === "changes" ? "Requesting..." : "Request Changes"}
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => handleDecision("reject")}
                  disabled={submitting !== null}
                >
                  <XCircle className="h-4 w-4" />
                  {submitting === "reject" ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagementPage() {
  const [members, setMembers]       = useState<Member[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [processingId, setProcessingId]     = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const data = await api.get("/sangha/members");
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const displayName = (m: Member) =>
    m.first_name || m.last_name
      ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
      : m.email || m.phone || "—";

  const handleQuickAction = async (userId: string, action: "approve" | "reject") => {
    setProcessingId(userId);
    try {
      await api.post(`/sangha/${action}`, { userId });
      toast.success(`User ${action === "approve" ? "approved" : "rejected"}`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} user`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage all user profiles. Click View to see full details.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {members.length} user{members.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{displayName(m)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.phone || m.email || "—"}
                        </TableCell>
                        <TableCell>{m.overall_completion_pct ?? 0}%</TableCell>
                        <TableCell>
                          <Badge className={`${statusColor[m.status] ?? ""} capitalize border-0`}>
                            {m.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserId(m.id)}
                            >
                              View & Review
                            </Button>
                            {m.status !== "approved" && (
                              <Button
                                size="sm"
                                disabled={processingId === m.id}
                                onClick={() => handleQuickAction(m.id, "approve")}
                              >
                                Approve
                              </Button>
                            )}
                            {m.status !== "rejected" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={processingId === m.id}
                                onClick={() => handleQuickAction(m.id, "reject")}
                              >
                                Reject
                              </Button>
                            )}
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

      {/* Profile review modal */}
      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onAction={fetchMembers}
        />
      )}
    </div>
  );
}
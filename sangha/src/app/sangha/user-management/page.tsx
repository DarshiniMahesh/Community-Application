"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  User, Users, MapPin, GraduationCap, Briefcase, CheckCircle2, Download,
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

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      value
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {value ? <CheckCircle2 className="h-3 w-3" /> : null}
      {value ? "Yes" : "No"}
    </span>
  );
}

function CoverageRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <YesNoBadge value={value} />
    </div>
  );
}

function hasCoverage(obj: Record<string, unknown> | undefined, key: string): boolean {
  return Array.isArray(obj?.[key]) && (obj![key] as string[]).length > 0;
}

function findMemberRow(
  rows: Record<string, unknown>[],
  name: string,
  relation: string
): Record<string, unknown> | undefined {
  return rows.find(
    r =>
      (r.member_name as string) === name &&
      (r.member_relation as string) === relation
  );
}

function handleDownloadPdf(userId: string) {
  const el = document.getElementById(`print-section-${userId}`);
  if (!el) return;
  // @ts-ignore
  import("html2pdf.js").then((html2pdf) => {
    html2pdf.default().from(el).set({
      margin: 10,
      filename: `user-profile-${userId}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).save();
  });
}

function ProfileModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sangha/review-user/${userId}`)
      .then(setData)
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  const s1    = data?.step1 as Record<string, string> | null;
  const s2    = data?.step2 as Record<string, string> | null;
  const s3    = data?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const s4    = data?.step4 as Record<string, string>[] | null;
  const s5    = data?.step5 as Record<string, unknown>[] | null;
  const s6eco = (data?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = ((data?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || []);
  const s6doc = ((data?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || []);

  const currentAddr  = s4?.find((a) => a.address_type === "current");
  const hometownAddr = s4?.find((a) => a.address_type === "hometown");
  const familyMembers = s3?.members || [];

  const userIns = findMemberRow(s6ins, s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "", "Self")
    ?? s6ins.find(r => (r.member_relation as string) === "Self");
  const userDoc = findMemberRow(s6doc, s1 ? [s1.first_name, s1.last_name].filter(Boolean).join(" ") : "", "Self")
    ?? s6doc.find(r => (r.member_relation as string) === "Self");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>User Profile</DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              {data?.profile?.status && (
                <Badge className={`${statusColor[data.profile.status] ?? ""} capitalize border-0`}>
                  {data.profile.status.replace(/_/g, " ")}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleDownloadPdf(userId)}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/sangha/edit-user?id=${userId}`, "_blank")}
              >
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center">Loading profile...</p>
        ) : !data ? (
          <p className="text-muted-foreground py-8 text-center">Could not load profile.</p>
        ) : (
          <div id={`print-section-${userId}`} className="space-y-5 pt-2">

            {/* Personal Details */}
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {s1 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Full Name"
                      value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")}
                    />
                    <Field label="Gender"         value={s1.gender} />
                    <Field label="Date of Birth"  value={formatDate(s1.date_of_birth)} />
                    <Field label="Marital Status" value={s1.is_married ? "Married" : "Single"} />
                    {s1.is_married && <Field label="Spouse Name" value={s1.wife_name || s1.husbands_name} />}
                    <Field label="Father's Name"  value={s1.fathers_name} />
                    <Field label="Mother's Name"  value={s1.mothers_name} />
                    <Field label="Phone"          value={data.user?.phone} />
                    <Field label="Email"          value={data.user?.email} />
                    <Field label="Disability"
                      value={s1.has_disability === "yes" ? "Yes" : s1.has_disability === "no" ? "No" : null}
                    />
                    {s1.is_part_of_sangha === "yes" && (
                      <>
                        <Field label="Sangha Name"   value={s1.sangha_name} />
                        <Field label="Sangha Role"   value={s1.sangha_role} />
                      </>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
              </CardContent>
            </Card>

            {/* Religious Details */}
            {s2 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-primary">🕉</span> Religious Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Gotra"           value={s2.gotra} />
                    <Field label="Pravara"         value={s2.pravara} />
                    <Field label="Kuladevata"      value={s2.kuladevata_other || s2.kuladevata} />
                    <Field label="Family Priest"   value={s2.priest_name} />
                    <Field label="Priest Location" value={s2.priest_location} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family Members */}
            {familyMembers.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Family Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(familyMembers as any[]).map((m: any, i: number) => (
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
            {s4 && s4.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Addresses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentAddr && (
                      <div className="border rounded-md p-3 text-sm space-y-1">
                        <p className="font-medium">Current Address</p>
                        <p className="text-muted-foreground">
                          {[currentAddr.flat_no, currentAddr.building, currentAddr.street,
                            currentAddr.area, currentAddr.city, currentAddr.state,
                            currentAddr.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                    {hometownAddr && (
                      <div className="border rounded-md p-3 text-sm space-y-1">
                        <p className="font-medium">Hometown Address</p>
                        <p className="text-muted-foreground">
                          {[hometownAddr.city, hometownAddr.state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education & Profession */}
            {s5 && s5.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" /> Education &amp; Profession
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {s5.map((m: any, i: number) => (
                      <div key={i} className="border rounded-md p-3 text-sm space-y-2">
                        <p className="font-medium">
                          {i === 0 ? "Self" : m.member_name || `Member ${i}`}
                          {m.member_relation && i !== 0 && (
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

            {/* Economic Details */}
            {s6eco && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Economic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <Label className="text-xs text-muted-foreground">Self Income</Label>
                      <p className="text-sm font-semibold">{(s6eco as any).self_income || "—"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                      <Label className="text-xs text-muted-foreground">Family Income</Label>
                      <p className="text-sm font-semibold">{(s6eco as any).family_income || "—"}</p>
                    </div>
                  </div>

                  {userIns && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Insurance</Label>
                      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                        <CoverageRow label="Health Insurance" value={hasCoverage(userIns, "health_coverage")} />
                        <CoverageRow label="Life Insurance"   value={hasCoverage(userIns, "life_coverage")} />
                        <CoverageRow label="Term Insurance"   value={hasCoverage(userIns, "term_coverage")} />
                        <CoverageRow label="Konkani Card"     value={hasCoverage(userIns, "konkani_card_coverage")} />
                      </div>
                    </div>
                  )}

                  {userDoc && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                        <CoverageRow label="Aadhaar"   value={hasCoverage(userDoc, "aadhaar_coverage")} />
                        <CoverageRow label="PAN"       value={hasCoverage(userDoc, "pan_coverage")} />
                        <CoverageRow label="Voter ID"  value={hasCoverage(userDoc, "voter_id_coverage")} />
                        <CoverageRow label="Land Docs" value={hasCoverage(userDoc, "land_doc_coverage")} />
                        <CoverageRow label="DL"        value={hasCoverage(userDoc, "dl_coverage")} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Family Member Details (Education + Insurance + Docs) */}
            {familyMembers.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Family Member Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(familyMembers as any[]).map((member: any, idx: number) => {
                    const memberEdu = s5?.[idx + 1];
                    const memberIns = findMemberRow(s6ins, member.name, member.relation);
                    const memberDoc = findMemberRow(s6doc, member.name, member.relation);

                    return (
                      <div key={idx} className="space-y-3">
                        {idx > 0 && <Separator />}
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{idx + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.relation}</p>
                          </div>
                        </div>

                        {memberEdu && (
                          <div className="grid grid-cols-2 gap-2 pl-11">
                            <Row label="Education"  value={memberEdu.highest_education as string} />
                            <Row label="Profession" value={memberEdu.profession_type as string} />
                            <Row label="Industry"   value={memberEdu.industry as string} />
                          </div>
                        )}

                        {memberIns && (
                          <div className="pl-11">
                            <Label className="text-xs text-muted-foreground mb-1 block">Insurance</Label>
                            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                              <CoverageRow label="Health Insurance" value={hasCoverage(memberIns, "health_coverage")} />
                              <CoverageRow label="Life Insurance"   value={hasCoverage(memberIns, "life_coverage")} />
                              <CoverageRow label="Term Insurance"   value={hasCoverage(memberIns, "term_coverage")} />
                            </div>
                          </div>
                        )}

                        {memberDoc && (
                          <div className="pl-11">
                            <Label className="text-xs text-muted-foreground mb-1 block">Documents</Label>
                            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                              <CoverageRow label="Aadhaar"  value={hasCoverage(memberDoc, "aadhaar_coverage")} />
                              <CoverageRow label="PAN"      value={hasCoverage(memberDoc, "pan_coverage")} />
                              <CoverageRow label="Voter ID" value={hasCoverage(memberDoc, "voter_id_coverage")} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagementPage() {
  const [members, setMembers]                   = useState<Member[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedUserId, setSelectedUserId]     = useState<string | null>(null);

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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUserId(m.id)}
                          >
                            View
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

      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
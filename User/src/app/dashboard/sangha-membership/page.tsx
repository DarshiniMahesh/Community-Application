"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const sanghaRoles = [
  "Common Member",
  "Treasurer",
  "Accountant",
  "Secretary",
  "Auditor",
  "Hon. Secretary",
  "President",
  "Hon. President",
  "Advisor",
  "Legal Advisor",
];

interface SanghaEntry {
  id?: string;
  sangha_id: string;
  sangha_name: string;
  role: string;
  tenure: string;
  status?: string;
  isSaved?: boolean;
  isDirty?: boolean;
}

interface SanghaOption {
  id: string;
  sangha_name: string;
  location: string;
}

function MembershipStatusBadge({ status }: { status?: string }) {
  if (!status || status === "pending") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1.5 px-2.5 py-1">
        <Clock className="h-3.5 w-3.5" />
        Pending Approval
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1.5 px-2.5 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 gap-1.5 px-2.5 py-1">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </Badge>
    );
  }
  return null;
}

export default function Page() {
  const router = useRouter();
  const [profileStatus, setProfileStatus] = useState<string>("");
  const [sanghaList, setSanghaList]       = useState<SanghaOption[]>([]);
  const [entries, setEntries]             = useState<SanghaEntry[]>([]);
  const [loading, setLoading]             = useState(true);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteIndex, setDeleteIndex]           = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog]   = useState(false);
  const [resetIndex, setResetIndex]             = useState<number | null>(null);
  const [savingIndex, setSavingIndex]           = useState<number | null>(null);

  useEffect(() => {
    api
      .get("/users/profile")
      .then(async (meta) => {
        setProfileStatus(meta.status || "");

        // FIX: always fetch sangha list regardless of profile status
        // Only fetch existing entries if profile is approved
        try {
          const [sanghas, existingEntries] = await Promise.all([
            api.get("/sangha/approved-list"),
            meta.status === "approved"
              ? api.get("/users/profile/sangha")
              : Promise.resolve([]),
          ]);

          setSanghaList(Array.isArray(sanghas) ? sanghas : []);

          if (Array.isArray(existingEntries) && existingEntries.length > 0) {
            setEntries(
              existingEntries.map((e: SanghaEntry) => ({
                id:          e.id          || undefined,
                sangha_id:   e.sangha_id   || "",
                sangha_name: e.sangha_name || "",
                role:        e.role        || "",
                tenure:      e.tenure      || "",
                status:      e.status      || "pending",
                isSaved:     true,
                isDirty:     false,
              }))
            );
          }
        } catch {
          toast.error("Failed to load sangha data");
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  // UI access still restricted to approved only
  const isAccessAllowed = profileStatus === "approved";

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        sangha_id:   "",
        sangha_name: "",
        role:        "",
        tenure:      "",
        status:      "pending",
        isSaved:     false,
        isDirty:     true,
      },
    ]);
  };

  const updateEntry = (index: number, field: keyof SanghaEntry, value: string) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value, isDirty: true };
      if (field === "sangha_id") {
        const found = sanghaList.find((s) => s.id === value);
        if (found) copy[index].sangha_name = found.sangha_name;
      }
      return copy;
    });
  };

  const handleSaveEntry = async (index: number) => {
    const entry = entries[index];

    if (!entry.sangha_id) {
      toast.error("Please select a Sangha");
      return;
    }
    if (!entry.role) {
      toast.error("Please select a role");
      return;
    }

    setSavingIndex(index);
    try {
      await api.post("/users/profile/step7", {
        entries: entries.map((e) => ({
          sangha_id:   e.sangha_id,
          sangha_name: e.sangha_name,
          role:        e.role,
          tenure:      e.tenure,
        })),
      });

      setEntries((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          isSaved: true,
          isDirty: false,
          status:  copy[index].status || "pending",
        };
        return copy;
      });

      toast.success(`Membership submitted to ${entry.sangha_name} for approval`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingIndex(null);
    }
  };

  const confirmReset = async () => {
    if (resetIndex === null) return;
    const entry = entries[resetIndex];

    try {
      const remaining = entries.filter((_, i) => i !== resetIndex);
      await api.post("/users/profile/step7", {
        entries: remaining.map((e) => ({
          sangha_id:   e.sangha_id,
          sangha_name: e.sangha_name,
          role:        e.role,
          tenure:      e.tenure,
        })),
      });
      setEntries(remaining);
      toast.success(`Membership for ${entry.sangha_name || "entry"} has been reset`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetIndex(null);
      setShowResetDialog(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;

    try {
      if (entries[deleteIndex].isSaved) {
        const remaining = entries.filter((_, i) => i !== deleteIndex);
        await api.post("/users/profile/step7", {
          entries: remaining.map((e) => ({
            sangha_id:   e.sangha_id,
            sangha_name: e.sangha_name,
            role:        e.role,
            tenure:      e.tenure,
          })),
        });
        setEntries(remaining);
      } else {
        setEntries((prev) => prev.filter((_, i) => i !== deleteIndex));
      }
      toast.success("Entry removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteIndex(null);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="border-l-4 border-l-orange-400 shadow-sm">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Sangha Membership can only be filled after your profile has been{" "}
                  <strong>approved</strong> by the Sangha.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current status:{" "}
                  <span className="font-medium capitalize">
                    {profileStatus.replace(/_/g, " ") || "Draft"}
                  </span>
                </p>
              </div>
              <Button onClick={() => router.push("/dashboard")} className="mt-2">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl font-semibold">Sangha Membership</h1>
        <p className="text-muted-foreground mt-1">
          Add your Sangha memberships. Each entry is submitted to that specific Sangha for
          individual approval.
        </p>
      </div>

      {/* Empty State */}
      {entries.length === 0 ? (
        <Card className="shadow-sm border-dashed border-2">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No Sangha memberships added</p>
              <p className="text-sm text-muted-foreground">
                Click the button below to add a Sangha membership
              </p>
              <Button onClick={addRow} className="mt-2 gap-2">
                <Plus className="h-4 w-4" /> Add Sangha Membership
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <Card
              key={index}
              className={`shadow-sm border-l-4 ${
                entry.status === "approved"
                  ? "border-l-green-500"
                  : entry.status === "rejected"
                  ? "border-l-red-500"
                  : "border-l-primary"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Users className="h-4 w-4 text-primary" />
                    Membership {index + 1}
                    {entry.isSaved && <MembershipStatusBadge status={entry.status} />}
                    {entry.isDirty && entry.isSaved && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        Unsaved changes
                      </Badge>
                    )}
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    {entry.isSaved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          setResetIndex(index);
                          setShowResetDialog(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> Reset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteIndex(index);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">

                  {/* Sangha Name */}
                  <div className="space-y-2">
                    <Label>
                      Sangha Name <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.sangha_id}
                      onValueChange={(v) => updateEntry(index, "sangha_id", v)}
                      disabled={entry.status === "approved"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Sangha" />
                      </SelectTrigger>
                      <SelectContent>
                        {sanghaList.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No approved Sanghas available
                          </SelectItem>
                        ) : (
                          sanghaList.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.sangha_name} — {s.location}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label>
                      Your Role <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.role}
                      onValueChange={(v) => updateEntry(index, "role", v)}
                      disabled={entry.status === "approved"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {sanghaRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employment Type (field stays as tenure in DB) */}
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select
                      value={entry.tenure}
                      onValueChange={(v) => updateEntry(index, "tenure", v)}
                      disabled={entry.status === "approved"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="full_time">Full Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Per-entry submit button */}
                {entry.status !== "approved" && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEntry(index)}
                      disabled={savingIndex === index || (!entry.isDirty && entry.isSaved)}
                      className="gap-2"
                    >
                      {savingIndex === index ? (
                        "Submitting..."
                      ) : entry.isSaved && !entry.isDirty ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Submitted
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {entry.isSaved ? "Resubmit" : "Submit for Approval"}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Approved lock notice */}
                {entry.status === "approved" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    This membership has been approved and is locked. Use Reset to remove and re-add it.
                  </div>
                )}

                {/* Rejected notice */}
                {entry.status === "rejected" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    This membership was rejected. Update the details and resubmit for approval.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add Another */}
          <Button variant="outline" onClick={addRow} className="w-full gap-2 border-dashed">
            <Plus className="h-4 w-4" /> Add Another Sangha
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this Sangha membership entry. You can add it again if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this membership?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this entry from your profile. You can re-add it with fresh details afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Yes, Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
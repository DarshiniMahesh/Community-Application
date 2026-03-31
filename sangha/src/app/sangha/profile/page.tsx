"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, saveAuth, getSanghaStatus } from "@/lib/api";

interface SanghaProfile {
  sangha_name: string;
  location: string;
  contact_person: string;
  area_covered: string;
  status: string;
  email: string;
  phone: string;
}

const emptyProfile: SanghaProfile = {
  sangha_name: "", location: "", contact_person: "",
  area_covered: "", status: "", email: "", phone: "",
};

export default function SanghaProfilePage() {
  const router = useRouter();
  const [profile, setProfile]     = useState<SanghaProfile>(emptyProfile);
  const [formData, setFormData]   = useState<SanghaProfile>(emptyProfile);
  const [editing, setEditing]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Partial<SanghaProfile>>({});

  const fetchProfile = async () => {
    try {
      const data = await api.get("/sangha/profile");
      setProfile(data);
      setFormData(data);
      // Keep localStorage sanghaStatus in sync
      const token = localStorage.getItem("token") ?? "";
      const role  = localStorage.getItem("role")  ?? "sangha";
      saveAuth(token, role, data.status, data.sangha_name);
    } catch (err: any) {
      toast.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const validate = () => {
    const e: Partial<SanghaProfile> = {};
    if (!formData.sangha_name.trim())    e.sangha_name    = "Sangha name is required";
    if (!formData.location.trim())       e.location       = "Location is required";
    if (!formData.contact_person.trim()) e.contact_person = "Contact person is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put("/sangha/profile", {
        sangha_name:    formData.sangha_name,
        location:       formData.location,
        contact_person: formData.contact_person,
        area_covered:   formData.area_covered,
      });
      toast.success("Profile updated");
      setEditing(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof SanghaProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const statusColor: Record<string, string> = {
    approved:        "bg-green-100 text-green-800 border-green-200",
    pending_approval:"bg-yellow-100 text-yellow-800 border-yellow-200",
    rejected:        "bg-red-100 text-red-800 border-red-200",
    suspended:       "bg-gray-100 text-gray-800 border-gray-200",
  };

  if (loading) return <div className="max-w-3xl mx-auto py-10 text-muted-foreground">Loading profile...</div>;

  // Pending state — read-only with refresh
  if (profile.status === "pending_approval" && !editing) {
    return (
      <div className="max-w-3xl mx-auto min-h-[70vh] flex items-center justify-center">
        <Card className="w-full shadow-sm">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <Clock3 className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Profile Under Review</CardTitle>
            <CardDescription>Your Sangha profile is awaiting admin approval.</CardDescription>
            <Badge className={`${statusColor.pending_approval} border`}>Pending Approval</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p><span className="font-medium">Sangha Name:</span> {profile.sangha_name}</p>
              <p><span className="font-medium">Location:</span> {profile.location}</p>
              <p><span className="font-medium">Contact Person:</span> {profile.contact_person}</p>
              {profile.area_covered && <p><span className="font-medium">Area Covered:</span> {profile.area_covered}</p>}
              <p><span className="font-medium">Email:</span> {profile.email || "-"}</p>
              <p><span className="font-medium">Phone:</span> {profile.phone || "-"}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setEditing(true)}>Edit Profile</Button>
              <Button variant="secondary" className="gap-2" onClick={fetchProfile}>
                <RefreshCw className="h-4 w-4" /> Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View mode (approved/rejected/suspended)
  if (!editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Sangha Profile</h1>
            <p className="text-muted-foreground mt-1">Your Sangha details</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${statusColor[profile.status] ?? ""} border capitalize`}>
              {profile.status?.replace("_", " ")}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-3 text-sm">
            <p><span className="font-medium">Sangha Name:</span> {profile.sangha_name}</p>
            <p><span className="font-medium">Location:</span> {profile.location}</p>
            <p><span className="font-medium">Contact Person:</span> {profile.contact_person}</p>
            {profile.area_covered && <p><span className="font-medium">Area Covered:</span> {profile.area_covered}</p>}
            <p><span className="font-medium">Email:</span> {profile.email || "-"}</p>
            <p><span className="font-medium">Phone:</span> {profile.phone || "-"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Edit Sangha Profile</h1>
        <p className="text-muted-foreground mt-1">Update your Sangha details</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Sangha Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label>Sangha Name</Label>
              <Input value={formData.sangha_name} onChange={set("sangha_name")} className={errors.sangha_name ? "border-destructive" : ""} />
              {errors.sangha_name && <p className="text-xs text-destructive">{errors.sangha_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={formData.location} onChange={set("location")} className={errors.location ? "border-destructive" : ""} />
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>
            <div className="space-y-1">
              <Label>Contact Person</Label>
              <Input value={formData.contact_person} onChange={set("contact_person")} className={errors.contact_person ? "border-destructive" : ""} />
              {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
            </div>
            <div className="space-y-1">
              <Label>Area Covered <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={formData.area_covered} onChange={set("area_covered")} />
            </div>
            {/* Email & phone are read-only — managed via users table */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={profile.email || "-"} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={profile.phone || "-"} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditing(false); setFormData(profile); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
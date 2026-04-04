"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock3, RefreshCw, Camera, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api, saveAuth } from "@/lib/api";

interface SanghaProfile {
  sangha_name: string;
  logo_url?: string;
  address_line: string;
  pincode: string;
  village_town: string;
  taluk: string;
  district: string;
  state: string;
  email: string;
  phone: string;
  description: string;
  sangha_contact_same: boolean;
  sangha_phone: string;
  sangha_email: string;
  status: string;
}

const emptyProfile: SanghaProfile = {
  sangha_name: "",
  logo_url: "",
  address_line: "",
  pincode: "",
  village_town: "",
  taluk: "",
  district: "",
  state: "",
  email: "",
  phone: "",
  description: "",
  sangha_contact_same: true,
  sangha_phone: "",
  sangha_email: "",
  status: "",
};

async function fetchLocationByPincode(
  pincode: string
): Promise<{ village_town: string; taluk: string; district: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        village_town: po.Name ?? "",
        taluk: po.Block ?? po.Taluk ?? "",
        district: po.District ?? "",
        state: po.State ?? "",
      };
    }
  } catch {}
  return null;
}

export default function SanghaProfilePage() {
  const router = useRouter();
  const [profile, setProfile]   = useState<SanghaProfile>(emptyProfile);
  const [formData, setFormData] = useState<SanghaProfile>(emptyProfile);
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState<Partial<Record<keyof SanghaProfile, string>>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoFile, setLogoFile]       = useState<File | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await api.get("/sangha/profile");
      setProfile(data);
      setFormData(data);
      setLogoPreview(data.logo_url ?? "");
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

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData(prev => ({ ...prev, pincode: val }));
    setErrors(prev => ({ ...prev, pincode: "" }));
    if (val.length === 6) {
      setPincodeLoading(true);
      const loc = await fetchLocationByPincode(val);
      setPincodeLoading(false);
      if (loc) {
        setFormData(prev => ({
          ...prev,
          village_town: loc.village_town,
          taluk: loc.taluk,
          district: loc.district,
          state: loc.state,
        }));
        toast.success("Location auto-filled from pincode");
      } else {
        toast.error("Could not fetch location for this pincode");
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const set = (field: keyof SanghaProfile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value =
      (e.target as HTMLInputElement).type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Partial<Record<keyof SanghaProfile, string>> = {};
    if (!(formData.sangha_name ?? "").trim())  e.sangha_name  = "Sangha name is required";
    if (!(formData.address_line ?? "").trim()) e.address_line = "Address is required";
    if (!formData.pincode || formData.pincode.length !== 6)
      e.pincode = "Valid 6-digit pincode required";
    if (!(formData.district ?? "").trim()) e.district = "District is required";
    if (!(formData.state ?? "").trim())    e.state    = "State is required";
    if (!formData.sangha_contact_same) {
      if (!formData.sangha_phone && !formData.sangha_email)
        e.sangha_phone = "Provide at least one contact (phone or email)";
      if (formData.sangha_email && !formData.sangha_email.includes("@"))
        e.sangha_email = "Enter a valid email";
      if (formData.sangha_phone && !/^\d{10}$/.test(formData.sangha_phone))
        e.sangha_phone = "Enter a valid 10-digit phone";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitForApproval = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      let logo_url = formData.logo_url;

      if (logoFile) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const uploadRes = await api.postForm("/sangha/profile/logo", fd);
        logo_url = uploadRes.logo_url;
      }

      // Save first
      await api.put("/sangha/profile", {
        sangha_name:         formData.sangha_name,
        logo_url,
        address_line:        formData.address_line,
        pincode:             formData.pincode,
        village_town:        formData.village_town,
        taluk:               formData.taluk,
        district:            formData.district,
        state:               formData.state,
        description:         formData.description,
        sangha_contact_same: formData.sangha_contact_same,
        sangha_phone:        formData.sangha_contact_same ? undefined : formData.sangha_phone,
        sangha_email:        formData.sangha_contact_same ? undefined : formData.sangha_email,
      });

      // Then submit
      await api.post("/sangha/submit", {});

      toast.success("Profile submitted for approval!");
      setEditing(false);
      setLogoFile(null);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit for approval");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    approved:         "bg-green-100 text-green-800 border-green-200",
    pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
    rejected:         "bg-red-100 text-red-800 border-red-200",
    suspended:        "bg-gray-100 text-gray-800 border-gray-200",
    draft:            "bg-blue-100 text-blue-800 border-blue-200",
  };

  const fullAddress = [
    profile.address_line,
    profile.village_town,
    profile.taluk,
    profile.district,
    profile.state,
    profile.pincode,
  ].filter(Boolean).join(", ");

  const displaySanghaPhone = profile.sangha_contact_same ? profile.phone  : profile.sangha_phone;
  const displaySanghaEmail = profile.sangha_contact_same ? profile.email  : profile.sangha_email;

  if (loading)
    return <div className="max-w-3xl mx-auto py-10 text-muted-foreground">Loading profile...</div>;

  // ── Pending state ────────────────────────────────────────────
  if (profile.status === "pending_approval" && !editing) {
    return (
      <div className="max-w-3xl mx-auto min-h-[70vh] flex items-center justify-center">
        <Card className="w-full shadow-sm">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <Clock3 className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Profile Under Review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your Sangha profile is awaiting admin approval.
            </p>
            <Badge className={`${statusColor.pending_approval} border`}>Pending Approval</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted border flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={`${profile.sangha_name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground" aria-hidden="true">
                    {profile.sangha_name?.[0] ?? "S"}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{profile.sangha_name}</p>
                {fullAddress && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {fullAddress}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="text-sm space-y-1">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {profile.email || "-"}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {profile.phone || "-"}
              </p>
            </div>

            {profile.description && (
              <>
                <Separator />
                <p className="text-sm">{profile.description}</p>
              </>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="secondary" className="gap-2" onClick={fetchProfile}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────
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
              {profile.status?.replace(/_/g, " ")}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={`${profile.sangha_name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground" aria-hidden="true">
                    {profile.sangha_name?.[0] ?? "S"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-semibold">{profile.sangha_name}</p>
                {fullAddress && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {fullAddress}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Registered Contact
              </p>
              <div className="text-sm space-y-1">
                {profile.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {profile.email}
                  </p>
                )}
                {profile.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {profile.phone}
                  </p>
                )}
              </div>
            </div>

            {profile.description && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </p>
                  <p className="text-sm whitespace-pre-line">{profile.description}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sangha Contact
              </p>
              <div className="text-sm space-y-1">
                {displaySanghaPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {displaySanghaPhone}
                  </p>
                )}
                {displaySanghaEmail && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {displaySanghaEmail}
                  </p>
                )}
                {profile.sangha_contact_same && (
                  <p className="text-xs text-muted-foreground">(Same as registered contact)</p>
                )}
              </div>
            </div>

            {/* Draft state — prompt to submit */}
            {profile.status === "draft" && (
              <>
                <Separator />
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-3">
                  <p className="font-medium">Your profile is saved as a draft.</p>
                  <p>Complete your profile details and submit for admin approval to get started.</p>
                  <Button
                    onClick={handleSubmitForApproval}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </div>
              </>
            )}

            {/* Rejected state — allow resubmit */}
            {profile.status === "rejected" && (
              <>
                <Separator />
                <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800 space-y-3">
                  <p className="font-medium">Your profile was rejected.</p>
                  <p>Please edit your profile to address any issues, then resubmit for approval.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-semibold">Edit Sangha Profile</h1>
        <p className="text-muted-foreground mt-1">Update your Sangha details</p>
      </div>

      <form className="space-y-5">

        {/* Basic Info */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">

              {/* Logo upload */}
              <div className="relative h-20 w-20 flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Sangha logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground" aria-hidden="true">
                      {formData.sangha_name?.[0] ?? "S"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Upload Sangha logo"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                  ref={logoInputRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  aria-label="Upload Sangha logo image"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="sangha-name-input">Sangha Name</Label>
                <Input
                  id="sangha-name-input"
                  value={formData.sangha_name}
                  onChange={set("sangha_name")}
                  placeholder="Enter Sangha name"
                  className={errors.sangha_name ? "border-destructive" : ""}
                />
                {errors.sangha_name && (
                  <p className="text-xs text-destructive" role="alert">{errors.sangha_name}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1">
              <Label htmlFor="address-line-input">Address Line</Label>
              <Input
                id="address-line-input"
                placeholder="House / Building / Street"
                value={formData.address_line}
                onChange={set("address_line")}
                className={errors.address_line ? "border-destructive" : ""}
              />
              {errors.address_line && (
                <p className="text-xs text-destructive" role="alert">{errors.address_line}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="pincode-input">Pincode</Label>
              <div className="relative">
                <Input
                  id="pincode-input"
                  placeholder="6-digit pincode"
                  value={formData.pincode}
                  onChange={handlePincodeChange}
                  className={errors.pincode ? "border-destructive" : ""}
                  maxLength={6}
                />
                {pincodeLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                    Fetching...
                  </span>
                )}
              </div>
              {errors.pincode && (
                <p className="text-xs text-destructive" role="alert">{errors.pincode}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Location will be auto-filled from pincode
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="village-town-input">Village / Town</Label>
                <Input
                  id="village-town-input"
                  value={formData.village_town}
                  onChange={set("village_town")}
                  placeholder="Village or Town"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taluk-input">Taluk</Label>
                <Input
                  id="taluk-input"
                  value={formData.taluk}
                  onChange={set("taluk")}
                  placeholder="Taluk"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="district-input">District</Label>
                <Input
                  id="district-input"
                  value={formData.district}
                  onChange={set("district")}
                  placeholder="District"
                  className={errors.district ? "border-destructive" : ""}
                />
                {errors.district && (
                  <p className="text-xs text-destructive" role="alert">{errors.district}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="state-input">State</Label>
                <Input
                  id="state-input"
                  value={formData.state}
                  onChange={set("state")}
                  placeholder="State"
                  className={errors.state ? "border-destructive" : ""}
                />
                {errors.state && (
                  <p className="text-xs text-destructive" role="alert">{errors.state}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registered contact (read-only) */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Registered Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reg-email-input">Email</Label>
                <Input
                  id="reg-email-input"
                  value={profile.email || "-"}
                  readOnly
                  aria-readonly="true"
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg-phone-input">Phone</Label>
                <Input
                  id="reg-phone-input"
                  value={profile.phone || "-"}
                  readOnly
                  aria-readonly="true"
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="description-textarea" className="sr-only">
              Description
            </Label>
            <Textarea
              id="description-textarea"
              placeholder="Briefly describe your Sangha, its mission, or activities..."
              value={formData.description}
              onChange={set("description")}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Sangha Contact */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Sangha Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <input
                type="checkbox"
                checked={formData.sangha_contact_same}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, sangha_contact_same: e.target.checked }))
                }
                className="accent-primary h-4 w-4"
              />
              Same as registered contact
            </label>

            {!formData.sangha_contact_same && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sangha-phone-input">Sangha Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="sangha-phone-input"
                      placeholder="10-digit number"
                      value={formData.sangha_phone}
                      onChange={set("sangha_phone")}
                      className={`pl-9 ${errors.sangha_phone ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.sangha_phone && (
                    <p className="text-xs text-destructive" role="alert">{errors.sangha_phone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sangha-email-input">Sangha Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="sangha-email-input"
                      placeholder="sangha@example.com"
                      value={formData.sangha_email}
                      onChange={set("sangha_email")}
                      className={`pl-9 ${errors.sangha_email ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.sangha_email && (
                    <p className="text-xs text-destructive" role="alert">{errors.sangha_email}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setFormData(profile);
              setLogoPreview(profile.logo_url ?? "");
              setLogoFile(null);
            }}
          >
            Cancel
          </Button>
          {profile.status !== "pending_approval" && (
            <Button
              type="button"
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmitForApproval}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
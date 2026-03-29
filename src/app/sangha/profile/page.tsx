"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Phone, Mail, Upload, Clock3, RefreshCw } from "lucide-react";

interface SanghaProfileForm {
  name: string;
  primaryEmail: string;
  primaryPhone: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  taluk: string;
  floorNumber: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
  officePhone: string;
  officeEmail: string;
  description: string;
  logo?: string;
}

type ProfileStatus = "not_submitted" | "pending" | "approved";

export default function SanghaProfilePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProfileStatus>("not_submitted");
  const [formData, setFormData] = useState<SanghaProfileForm>({
    name: "",
    primaryEmail: "",
    primaryPhone: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    taluk: "",
    floorNumber: "",
    district: "",
    state: "",
    country: "",
    pinCode: "",
    officePhone: "",
    officeEmail: "",
    description: "",
    logo: "",
  });
  const [errors, setErrors] = useState<Record<keyof SanghaProfileForm, string>>({
    name: "",
    primaryEmail: "",
    primaryPhone: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    taluk: "",
    floorNumber: "",
    district: "",
    state: "",
    country: "",
    pinCode: "",
    officePhone: "",
    officeEmail: "",
    description: "",
    logo: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [loginPhone, setLoginPhone] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState<string>("");

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showOfficeOtp, setShowOfficeOtp] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = window.localStorage.getItem("role");
    if (role !== "SANGHA" && role !== "ADMIN") { router.replace("/sangha/login"); }
    const user = window.localStorage.getItem("currentUser");
    if (!user) return;
    const inferredEmail = user.includes("@") ? user : "";
    const inferredPhone = /^\d{10}$/.test(user) ? user : "";
    setLoginEmail(inferredEmail);
    setLoginPhone(inferredPhone);
    setFormData((prev) => ({
      ...prev,
      primaryEmail: inferredEmail,
      primaryPhone: inferredPhone,
    }));
    const saved = window.localStorage.getItem(`sanghaProfile_${user}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.data) setFormData((prev) => ({ ...prev, ...parsed.data }));
      if (parsed?.status === "pending" || parsed?.status === "approved" || parsed?.status === "not_submitted") {
        setStatus(parsed.status);
      } else {
        setStatus("not_submitted");
      }
    } else {
      setStatus("not_submitted");
    }
  }, [router]);

  const validate = () => {
    const newErrors: Record<keyof SanghaProfileForm, string> = {
  name: "",
  primaryEmail: "",
  primaryPhone: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  taluk: "",
  floorNumber: "",
  district: "",
  state: "",
  country: "",
  pinCode: "",
  officePhone: "",
  officeEmail: "",
  description: "",
  logo: "",
};
      
  
    if (!formData.name.trim()) newErrors.name = "Sangha name is required";
    if (!formData.primaryEmail.trim()) {
      newErrors.primaryEmail = "Email is required";
    } else if (!formData.primaryEmail.includes("@")) {
      newErrors.primaryEmail = "Please enter a valid email address";
    }
    if (!formData.primaryPhone.trim()) {
      newErrors.primaryPhone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.primaryPhone)) {
      newErrors.primaryPhone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address Line 1 is required";
    if (!formData.addressLine2.trim()) newErrors.addressLine2 = "Address Line 2 is required";
    if (!formData.floorNumber.trim()) newErrors.floorNumber = "Floor number is required";
    if (!formData.district.trim()) newErrors.district = "City / Town is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.officePhone.trim()) {
      newErrors.officePhone = "Office phone is required";
    } else if (formData.officePhone.length !== 10) {
      newErrors.officePhone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.officeEmail.trim()) {
      newErrors.officeEmail = "Office email is required";
    } else if (!formData.officeEmail.includes("@")) {
      newErrors.officeEmail = "Please enter a valid email address";
    }
    if (!formData.pinCode.trim()) newErrors.pinCode = "Pin Code / Zip Code is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    const officeNeedsVerification =
      !(formData.officePhone === formData.primaryPhone && formData.officeEmail === formData.primaryEmail);
    if (officeNeedsVerification && !isVerified) {
      toast.error("Please verify office contact details");
      return false;
    }
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (field: keyof SanghaProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleOfficePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsVerified(false);
    setShowOfficeOtp(false);
    handleChange("officePhone")(e);
  };

  const handleOfficeEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsVerified(false);
    setShowOfficeOtp(false);
    handleChange("officeEmail")(e);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const officeNeedsVerification =
    !(formData.officePhone === formData.primaryPhone && formData.officeEmail === formData.primaryEmail);

  const handleVerifyOfficeOtp = () => {
    if (otpInput === "1234") {
      setIsVerified(true);
      setShowOfficeOtp(false);
      toast.success("Office contact verified");
      return;
    }
    toast.error("Invalid OTP");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (typeof window !== "undefined") {
      const user = window.localStorage.getItem("currentUser");
      if (!user) {
        toast.error("Please login again");
        router.push("/sangha/login");
        return;
      }
      window.localStorage.setItem(
        `sanghaProfile_${user}`,
        JSON.stringify({
          status: "pending",
          data: formData,
        })
      );
      if (logoFile) {
        // Store logo name temporarily
        window.localStorage.setItem("sanghaLogo", logoFile.name);
      }
    }
    toast.success("Sangha profile submitted for approval");
    setStatus("pending");
  };

  const handleEditProfile = () => setStatus("not_submitted");
  const handleRefreshStatus = () => {
    if (typeof window === "undefined") return;
    const user = window.localStorage.getItem("currentUser");
    if (!user) return;
    const saved = window.localStorage.getItem(`sanghaProfile_${user}`);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed?.status === "pending" || parsed?.status === "approved" || parsed?.status === "not_submitted") {
      setStatus(parsed.status);
    }
  };

  if (status === "approved") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Sangha Profile</h1>
          <p className="text-muted-foreground mt-1">Your submitted Sangha profile details.</p>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Sangha Details</CardTitle>
              <Button variant="outline" size="sm" onClick={handleEditProfile}>Edit Profile</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Sangha Name:</span> {formData.name || "-"}</p>
            <p><span className="font-medium">Address:</span> {[formData.addressLine1, formData.addressLine2, formData.addressLine3, formData.taluk, formData.district, formData.state, formData.country].filter(Boolean).join(", ") || "-"}</p>
            <p><span className="font-medium">Office Phone:</span> {formData.officePhone || "-"}</p>
            <p><span className="font-medium">Email:</span> {formData.officeEmail || "-"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="max-w-3xl mx-auto min-h-[70vh] flex items-center justify-center">
        <Card className="w-full shadow-sm">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <Clock3 className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl">Profile Under Review</CardTitle>
              <CardDescription className="mt-1">
                Your Sangha profile has been submitted and is awaiting admin approval.
              </CardDescription>
            </div>
            <div>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
                Pending Approval
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p><span className="font-medium">Sangha Name:</span> {formData.name || "-"}</p>
              <p><span className="font-medium">Address:</span> {[formData.addressLine1, formData.addressLine2, formData.addressLine3, formData.taluk, formData.district, formData.state, formData.country].filter(Boolean).join(", ") || "-"}</p>
              <p><span className="font-medium">Office Phone:</span> {formData.officePhone || "-"}</p>
              <p><span className="font-medium">Email:</span> {formData.officeEmail || "-"}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={handleEditProfile}>Edit Profile</Button>
              <Button variant="secondary" className="gap-2" onClick={handleRefreshStatus}>
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              You will be notified once your profile is approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Sangha Profile</h1>
        <p className="text-muted-foreground mt-1">Provide basic details about your Sangha for admin approval.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Sangha Details</CardTitle>
              <CardDescription>These details will be used for managing members and applications.</CardDescription>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (logoPreview) window.open(logoPreview, "_blank", "noopener,noreferrer");
                }}
                className="focus:outline-none"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-full object-cover border" />
                ) : (
                  <div className="w-20 h-20 rounded-full border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    No Logo
                  </div>
                )}
              </button>
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label htmlFor="logo" className="cursor-pointer flex items-center space-x-2 border border-dashed border-muted-foreground rounded-md px-3 py-2 hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Label>
                <Button type="button" variant="outline" onClick={handleResetLogo}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
  <form onSubmit={handleSubmit} className="space-y-8">

    {/* ================= BASIC INFORMATION ================= */}
    <div className="space-y-4">
      <h3 className="text-orange-500 font-semibold">Basic Information</h3>

      <div>
        <Label>Sangha Name</Label>
        <Input
          value={formData.name}
          onChange={handleChange("name")}
        />
      </div>
       {/* ================= ADDRESS DETAILS ================= */}
    <div className="space-y-6">
      <h3 className="text-orange-500 font-semibold">Address Details</h3>

      {/* Address Line 1 */}
      <div className="space-y-4">
        <h4 className="text-sm text-muted-foreground">Address Line 1<span style={{ color: "red" }}>*</span> </h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Building Number & Name</Label>
            <Input
              value={formData.addressLine1}
              onChange={handleChange("addressLine1")}
            />
          </div>

          <div>
            <Label>Street Name / Area</Label>
            <Input
              value={formData.addressLine2}
              onChange={handleChange("addressLine2")}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>City / Town</Label>
            <Input
              value={formData.district}
              onChange={handleChange("district")}
            />
          </div>

          <div>
            <Label>State</Label>
            <Input
              value={formData.state}
              onChange={handleChange("state")}
            />
          </div>

          <div>
            <Label>PIN Code</Label>
            <Input
              value={formData.pinCode}
              onChange={handleChange("pinCode")}
              className="bg-yellow-50 border-yellow-300"
            />
          </div>
        </div>

        <div>
          <Label>Nearest Landmark</Label>
          <Input
            value={formData.addressLine3}
            onChange={handleChange("addressLine3")}
          />
        </div>
      </div>

      {/* Address Line 2 */}
      <div className="space-y-4">
        <h4 className="text-sm text-muted-foreground">Address Line 2<span style={{ color: "red" }}>*</span> </h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Block</Label>
            <Input
              value={formData.taluk}
              onChange={handleChange("taluk")}
            />
          </div>

          <div>
            <Label>Floor Number</Label>
            <Input
              value={formData.floorNumber}
              onChange={handleChange("floorNumber")}
              placeholder="Enter floor number"
            />
          </div>
        </div>
      </div>
    </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Registered Phone</Label>
          <Input value={formData.primaryPhone} readOnly />
        </div>

        <div>
          <Label>Registered Email</Label>
          <Input value={formData.primaryEmail} readOnly />
        </div>
      </div>
    </div>

   
                  {/* ================= DESCRIPTION ================= */}
    <div>
      <h3 className="text-orange-500 font-semibold">Description</h3>
      <Textarea
        value={formData.description}
        onChange={handleChange("description")}
      />
    </div>
    {/* ================= OFFICE CONTACT ================= */}
    <div className="space-y-4">
      <h3 className="text-orange-500 font-semibold">Office Contact</h3>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={
            formData.officePhone === formData.primaryPhone &&
            formData.officeEmail === formData.primaryEmail
          }
          onChange={(e) => {
            if (e.target.checked) {
              setFormData((prev) => ({
                ...prev,
                officePhone: prev.primaryPhone,
                officeEmail: prev.primaryEmail,
              }));
            } else {
              setFormData((prev) => ({
                ...prev,
                officePhone: "",
                officeEmail: "",
              }));
            }
          }}
        />
        <span className="text-sm text-muted-foreground">
          Same as registered contact
        </span>
      </div>

      {/* ✅ FIXED: Missing inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Office Phone</Label>
          <Input
            value={formData.officePhone}
            onChange={handleOfficePhoneChange}
          />
        </div>

        <div>
          <Label>Office Email</Label>
          <Input
            value={formData.officeEmail}
            onChange={handleOfficeEmailChange}
          />
        </div>
      </div>

      {officeNeedsVerification && (
        <div className="space-y-2">
          {!isVerified ? (
            <Button type="button" onClick={() => setShowOfficeOtp(true)}>
              Verify
            </Button>
          ) : (
            <p className="text-green-600 text-sm">Verified ✔</p>
          )}

          {showOfficeOtp && (
            <div className="space-y-2">
              <Input
                placeholder="Enter OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
              />
              <Button type="button" onClick={handleVerifyOfficeOtp}>
                Verify OTP
              </Button>
            </div>
          )}
        </div>
      )}
    </div>

  

    {/* ================= SUBMIT ================= */}
    <div className="flex justify-end">
      <Button type="submit">Submit for Approval</Button>
    </div>

  </form>
</CardContent>
      </Card>
    </div>
  );
}
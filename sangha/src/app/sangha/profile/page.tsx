"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [sameAsRegistered, setSameAsRegistered] = useState<boolean>(false);

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
    const officeNeedsVerification = !sameAsRegistered;
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

  const handleSameAsRegisteredChange = (checked: boolean) => {
    setSameAsRegistered(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        officePhone: prev.primaryPhone,
        officeEmail: prev.primaryEmail,
      }));
      setIsVerified(true);
      setShowOfficeOtp(false);
      setErrors((prev) => ({ ...prev, officePhone: "", officeEmail: "" }));
    } else {
      setFormData((prev) => ({
        ...prev,
        officePhone: "",
        officeEmail: "",
      }));
      setIsVerified(false);
    }
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
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo Upload - First */}
            <div className="space-y-3">
              <Label>Sangha Logo</Label>
              <div className="flex items-center gap-4">
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

            {/* Sangha Name */}
            {([
              ["name", "Sangha Name", "Enter Sangha name", Users],
            ] as [keyof SanghaProfileForm, string, string, any][]).map(([field, label, placeholder, Icon]) => (
              <div className="space-y-2" key={field}>
                <Label htmlFor={field}>{label}</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon className="h-4 w-4" /></div>
                  <Input id={field} placeholder={placeholder} value={formData[field] as string} onChange={handleChange(field)} className={`pl-10 ${errors[field] ? "border-destructive" : ""}`} />
                </div>
                {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
              </div>
            ))}

            {/* Address Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Address Details</h3>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input id="addressLine1" placeholder="Enter address line 1" value={formData.addressLine1} onChange={handleChange("addressLine1")} className={`rounded-md border px-3 py-2 ${errors.addressLine1 ? "border-destructive" : ""}`} />
                {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input id="addressLine2" placeholder="Enter address line 2" value={formData.addressLine2} onChange={handleChange("addressLine2")} className={`rounded-md border px-3 py-2 ${errors.addressLine2 ? "border-destructive" : ""}`} />
                {errors.addressLine2 && <p className="text-xs text-destructive">{errors.addressLine2}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine3">Address Line 3</Label>
                <Input id="addressLine3" placeholder="Enter address line 3" value={formData.addressLine3} onChange={handleChange("addressLine3")} className={`rounded-md border px-3 py-2 ${errors.addressLine3 ? "border-destructive" : ""}`} />
                {errors.addressLine3 && <p className="text-xs text-destructive">{errors.addressLine3}</p>}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taluk">Taluk</Label>
                <Input id="taluk" placeholder="Enter taluk" value={formData.taluk} onChange={handleChange("taluk")} className={`rounded-md border px-3 py-2 ${errors.taluk ? "border-destructive" : ""}`} />
                {errors.taluk && <p className="text-xs text-destructive">{errors.taluk}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" placeholder="Enter district" value={formData.district} onChange={handleChange("district")} className={`rounded-md border px-3 py-2 ${errors.district ? "border-destructive" : ""}`} />
                {errors.district && <p className="text-xs text-destructive">{errors.district}</p>}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="Enter state" value={formData.state} onChange={handleChange("state")} className={`rounded-md border px-3 py-2 ${errors.state ? "border-destructive" : ""}`} />
                {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" placeholder="Enter country" value={formData.country} onChange={handleChange("country")} className={`rounded-md border px-3 py-2 ${errors.country ? "border-destructive" : ""}`} />
                {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code / Zip Code</Label>
              <Input
                id="pinCode"
                placeholder="Enter pin code"
                value={formData.pinCode}
                onChange={handleChange("pinCode")}
                className={`rounded-md border px-3 py-2 bg-yellow-50/60 ${errors.pinCode ? "border-destructive" : "border-yellow-300"}`}
              />
              {errors.pinCode && <p className="text-xs text-destructive">{errors.pinCode}</p>}
            </div>

            <hr className="my-4" />

            {/* Registered Phone and Email */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Registered Contact</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loginPhone">Phone Number</Label>
                  <Input
                    id="loginPhone"
                    value={formData.primaryPhone}
                    onChange={handleChange("primaryPhone")}
                    readOnly={!!loginPhone}
                    placeholder="Enter phone number"
                  />
                  {errors.primaryPhone && <p className="text-xs text-destructive">{errors.primaryPhone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    value={formData.primaryEmail}
                    onChange={handleChange("primaryEmail")}
                    readOnly={!!loginEmail}
                    placeholder="Enter email"
                  />
                  {errors.primaryEmail && <p className="text-xs text-destructive">{errors.primaryEmail}</p>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Briefly describe your Sangha and its purpose" value={formData.description} onChange={handleChange("description")} className={errors.description ? "border-destructive" : ""} />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <hr className="my-4" />

            {/* Sangha Office Contact */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Sangha Office Contact</h3>
              
              {/* Checkbox for same as registered */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sameAsRegistered"
                  checked={sameAsRegistered}
                  onCheckedChange={(checked) => handleSameAsRegisteredChange(checked as boolean)}
                />
                <Label htmlFor="sameAsRegistered" className="text-sm font-normal cursor-pointer">
                  Same as registered contact
                </Label>
              </div>

              {!sameAsRegistered && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="officePhone">Phone Number</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone className="h-4 w-4" /></div>
                        <Input
                          id="officePhone"
                          type="tel"
                          placeholder="10-digit phone number"
                          value={formData.officePhone}
                          onChange={handleOfficePhoneChange}
                          className={`pl-10 ${errors.officePhone ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.officePhone && <p className="text-xs text-destructive">{errors.officePhone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="officeEmail">Email</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Mail className="h-4 w-4" /></div>
                        <Input
                          id="officeEmail"
                          type="email"
                          placeholder="name@example.com"
                          value={formData.officeEmail}
                          onChange={handleOfficeEmailChange}
                          className={`pl-10 ${errors.officeEmail ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.officeEmail && <p className="text-xs text-destructive">{errors.officeEmail}</p>}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {!isVerified ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowOfficeOtp(true);
                          setOtpInput("");
                        }}
                      >
                        Verify
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Office contact verified.</p>
                    )}

                    {showOfficeOtp && (
                      <div className="space-y-2">
                        <Label htmlFor="officeOtp">Enter OTP</Label>
                        <Input
                          id="officeOtp"
                          placeholder="OTP"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                        />
                        <Button type="button" onClick={handleVerifyOfficeOtp} disabled={otpInput.length === 0}>
                          Verify OTP
                        </Button>
                        <p className="text-xs text-muted-foreground">OTP is simulated as 1234.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {sameAsRegistered && (
                <div className="rounded-lg border p-3 bg-muted/50 text-sm">
                  <p><span className="font-medium">Phone:</span> {formData.officePhone || "-"}</p>
                  <p><span className="font-medium">Email:</span> {formData.officeEmail || "-"}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Submit for Approval</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

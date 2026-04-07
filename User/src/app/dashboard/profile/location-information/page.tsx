"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Plus, Trash2, MapPin, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAutoSave } from "@/lib/useAutoSave";

const steps = [
  { id: "1", name: "Personal",  href: "/dashboard/profile/personal-details" },
  { id: "2", name: "Religious", href: "/dashboard/profile/religious-details" },
  { id: "3", name: "Family",    href: "/dashboard/profile/family-information" },
  { id: "4", name: "Location",  href: "/dashboard/profile/location-information" },
  { id: "5", name: "Education", href: "/dashboard/profile/education-profession" },
  { id: "6", name: "Economic",  href: "/dashboard/profile/economic-details" },
  { id: "7", name: "Review",    href: "/dashboard/profile/review-submit" },
];

interface Address {
  flatNo: string;
  building: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  taluk: string;
  district: string;
  pincode: string;
  country: string;
}

interface OldAddress extends Address { id: string; }

const emptyAddress = (): Address => ({
  flatNo: "",
  building: "",
  street: "",
  landmark: "",
  area: "",
  city: "",
  taluk: "",
  district: "",
  pincode: "",
  country: "India",
});

export default function Page() {
  const router = useRouter();
  const [loading, setLoading]                 = useState(false);
  const [currentAddress, setCurrentAddress]   = useState<Address>(emptyAddress());
  const [hometownAddress, setHometownAddress] = useState<Address>(emptyAddress());
  const [oldAddresses, setOldAddresses]       = useState<OldAddress[]>([]);
  const [sameAsCurrent, setSameAsCurrent]     = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting]             = useState(false);
  const [canReset, setCanReset]               = useState(false);

  useEffect(() => {
    api.get("/users/profile").then(meta => {
      const s = (meta as Record<string, string>).status;
      setCanReset(s === "draft" || s === "changes_requested" || s === "approved");
    }).catch(() => {});

    api.get("/users/profile/full").then((data) => {
      const olds: OldAddress[] = [];
      (data.step4 || []).forEach((a: Record<string, string>) => {
        const mapped: Address = {
          flatNo:   a.flat_no   || "",
          building: a.building  || "",
          street:   a.street    || "",
          landmark: a.landmark  || "",
          area:     a.area      || "",
          city:     a.city      || "",
          taluk:    a.taluk     || "",
          district: a.district  || "",
          pincode:  a.pincode   || "",
          country:  a.country   || "India",
        };
        if (a.address_type === "current")       setCurrentAddress(mapped);
        else if (a.address_type === "hometown") setHometownAddress(mapped);
        else olds.push({ ...mapped, id: a.address_type });
      });
      if (olds.length > 0) setOldAddresses(olds);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sameAsCurrent) setHometownAddress({ ...currentAddress });
  }, [sameAsCurrent, currentAddress]);

  const buildPayload = () => {
    const toAddr = (a: Address, type: string) => ({
      address_type: type,
      flat_no:      a.flatNo   || null,
      building:     a.building || null,
      street:       a.street   || null,
      landmark:     a.landmark || null,
      area:         a.area     || null,
      city:         a.city     || null,
      taluk:        a.taluk    || null,
      district:     a.district || null,
      pincode:      a.pincode  || null,
      country:      a.country  || "India",
    });
    const addresses = [toAddr(currentAddress, "current")];
    if (!sameAsCurrent) addresses.push(toAddr(hometownAddress, "hometown"));
    else addresses.push(toAddr(currentAddress, "hometown"));
    oldAddresses.forEach((a, i) => addresses.push(toAddr(a, `old_${i + 1}`)));
    return { addresses };
  };

  useAutoSave("/users/profile/step4", buildPayload, [currentAddress, hometownAddress, oldAddresses, sameAsCurrent]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!currentAddress.flatNo.trim())  e.currentFlatNo  = "Flat/House No. is required";
    if (!currentAddress.street.trim())  e.currentStreet  = "Street is required";
    if (!currentAddress.area.trim())    e.currentArea    = "Area is required";
    if (!currentAddress.city.trim())    e.currentCity    = "City is required";
    if (!currentAddress.pincode.trim()) e.currentPincode = "Pincode is required";
    if (!sameAsCurrent) {
      if (!hometownAddress.city.trim()) e.hometownCity   = "City is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/users/profile/step4", buildPayload());
      toast.success("Location information saved!");
      router.push("/dashboard/profile/education-profession");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post("/users/profile/reset/step4", {});
      toast.success("Location information cleared.");
      setCurrentAddress(emptyAddress());
      setHometownAddress(emptyAddress());
      setOldAddresses([]);
      setSameAsCurrent(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  const setField = (
    setter: (a: Address) => void,
    address: Address,
    field: keyof Address,
    value: string,
    errorKey?: string
  ) => {
    setter({ ...address, [field]: value });
    if (errorKey) setErrors(ev => ({ ...ev, [errorKey]: "" }));
  };

  const renderAddressFields = (
    address: Address,
    setAddress: (a: Address) => void,
    prefix: string,
    readOnly = false
  ) => (
    <div className="space-y-5">

      {/* Row 1: Flat No + Building */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Flat / House No. {!readOnly && <span className="text-destructive">*</span>}</Label>
          <Input
            placeholder="e.g. 12A, Flat 3"
            value={address.flatNo}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "flatNo", e.target.value, `${prefix}FlatNo`)}
            className={errors[`${prefix}FlatNo`] ? "border-destructive" : ""}
          />
          {errors[`${prefix}FlatNo`] && <p className="text-xs text-destructive">{errors[`${prefix}FlatNo`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Building / Society</Label>
          <Input
            placeholder="e.g. Sunshine Apartments"
            value={address.building}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "building", e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Street + Landmark */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Street / Road {!readOnly && <span className="text-destructive">*</span>}</Label>
          <Input
            placeholder="e.g. MG Road, 2nd Cross"
            value={address.street}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "street", e.target.value, `${prefix}Street`)}
            className={errors[`${prefix}Street`] ? "border-destructive" : ""}
          />
          {errors[`${prefix}Street`] && <p className="text-xs text-destructive">{errors[`${prefix}Street`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Landmark</Label>
          <Input
            placeholder="e.g. Near City Mall, Opp. Hospital"
            value={address.landmark}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "landmark", e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Area + City */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Area / Locality {!readOnly && <span className="text-destructive">*</span>}</Label>
          <Input
            placeholder="e.g. Koramangala, Andheri West"
            value={address.area}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "area", e.target.value, `${prefix}Area`)}
            className={errors[`${prefix}Area`] ? "border-destructive" : ""}
          />
          {errors[`${prefix}Area`] && <p className="text-xs text-destructive">{errors[`${prefix}Area`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>City / Town {!readOnly && <span className="text-destructive">*</span>}</Label>
          <Input
            placeholder="e.g. Bengaluru"
            value={address.city}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "city", e.target.value, `${prefix}City`)}
            className={errors[`${prefix}City`] ? "border-destructive" : ""}
          />
          {errors[`${prefix}City`] && <p className="text-xs text-destructive">{errors[`${prefix}City`]}</p>}
        </div>
      </div>

      {/* Row 4: Taluk + District */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Taluk</Label>
          <Input
            placeholder="e.g. Bangalore South"
            value={address.taluk}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "taluk", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <Input
            placeholder="e.g. Bengaluru Urban"
            value={address.district}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "district", e.target.value)}
          />
        </div>
      </div>

      {/* Row 5: Pincode + Country */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pincode {!readOnly && <span className="text-destructive">*</span>}</Label>
          <Input
            placeholder="6-digit pincode"
            value={address.pincode}
            maxLength={6}
            disabled={readOnly}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "");
              setField(setAddress, address, "pincode", val, `${prefix}Pincode`);
            }}
            className={errors[`${prefix}Pincode`] ? "border-destructive" : ""}
          />
          {errors[`${prefix}Pincode`] && <p className="text-xs text-destructive">{errors[`${prefix}Pincode`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            placeholder="Country"
            value={address.country}
            disabled={readOnly}
            onChange={e => setField(setAddress, address, "country", e.target.value)}
          />
        </div>
      </div>

    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Location Information</h1>
          <p className="text-muted-foreground mt-1">Step 4 of 7: Provide your address details</p>
        </div>
        {canReset && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10 mt-4"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="h-4 w-4" /> Reset This Step
          </Button>
        )}
      </div>

      <Stepper steps={steps} currentStep={3} />

      {/* Current Address */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Current Address</CardTitle>
          </div>
          <CardDescription>Your present residential address</CardDescription>
        </CardHeader>
        <CardContent>
          {renderAddressFields(currentAddress, setCurrentAddress, "current")}
        </CardContent>
      </Card>

      {/* Hometown Address */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Home Town Address</CardTitle>
          </div>
          <CardDescription>Your native place or ancestral home</CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="sameAsCurrent"
              checked={sameAsCurrent}
              onCheckedChange={c => setSameAsCurrent(c as boolean)}
            />
            <Label htmlFor="sameAsCurrent" className="font-normal cursor-pointer text-sm">
              Home Town Address is same as Current Address
            </Label>
          </div>
        </CardHeader>
        {!sameAsCurrent && (
          <CardContent>
            {renderAddressFields(hometownAddress, setHometownAddress, "hometown")}
          </CardContent>
        )}
        {sameAsCurrent && (
          <CardContent>
            <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
              Using current address as hometown address.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Old Address History */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Old Location History</CardTitle>
              <CardDescription>Add up to 4 previous addresses (Optional)</CardDescription>
            </div>
            <Button
              onClick={() => {
                if (oldAddresses.length < 4)
                  setOldAddresses(prev => [...prev, { ...emptyAddress(), id: Date.now().toString() }]);
              }}
              size="sm"
              variant="outline"
              disabled={oldAddresses.length >= 4}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Previous Address
            </Button>
          </div>
        </CardHeader>
        {oldAddresses.length > 0 && (
          <CardContent className="space-y-6">
            {oldAddresses.map((address, index) => (
              <div key={address.id} className="p-4 border rounded-xl bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Previous Address {index + 1}</h4>
                  <Button
                    aria-label="Remove address"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOldAddresses(prev => prev.filter(a => a.id !== address.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Row 1 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Flat / House No.</Label>
                    <Input placeholder="e.g. 12A, Flat 3" value={address.flatNo}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, flatNo: e.target.value } : a))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Building / Society</Label>
                    <Input placeholder="e.g. Sunshine Apartments" value={address.building}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, building: e.target.value } : a))} />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Street / Road</Label>
                    <Input placeholder="e.g. MG Road" value={address.street}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, street: e.target.value } : a))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Landmark</Label>
                    <Input placeholder="e.g. Near City Mall" value={address.landmark}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, landmark: e.target.value } : a))} />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Area / Locality</Label>
                    <Input placeholder="e.g. Koramangala" value={address.area}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, area: e.target.value } : a))} />
                  </div>
                  <div className="space-y-2">
                    <Label>City / Town</Label>
                    <Input placeholder="e.g. Bengaluru" value={address.city}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, city: e.target.value } : a))} />
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Taluk</Label>
                    <Input placeholder="e.g. Bangalore South" value={address.taluk}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, taluk: e.target.value } : a))} />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input placeholder="e.g. Bengaluru Urban" value={address.district}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, district: e.target.value } : a))} />
                  </div>
                </div>

                {/* Row 5 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input placeholder="6-digit pincode" maxLength={6} value={address.pincode}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, pincode: val } : a));
                      }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input placeholder="Country" value={address.country}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, country: e.target.value } : a))} />
                  </div>
                </div>

              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" onClick={() => router.push("/dashboard/profile/family-information")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>
        <Button onClick={handleNext} disabled={loading} className="gap-2">
          {loading ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Location Information?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear only your location information. All other steps remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-destructive hover:bg-destructive/90">
              {resetting ? "Resetting..." : "Yes, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
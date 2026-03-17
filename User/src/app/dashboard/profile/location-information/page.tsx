"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "../Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Plus, Trash2, MapPin, Navigation, Loader2 } from "lucide-react";
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

interface Address { flatNo: string; building: string; street: string; area: string; city: string; state: string; pincode: string; lat: string; lng: string; }
interface OldAddress extends Address { id: string; }

const emptyAddress = (): Address => ({ flatNo: "", building: "", street: "", area: "", city: "", state: "", pincode: "", lat: "", lng: "" });

async function reverseGeocode(lat: number, lng: number): Promise<Partial<Address>> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  const addr = data.address || {};
  return { area: addr.suburb || addr.neighbourhood || addr.village || "", city: addr.city || addr.town || addr.district || "", state: addr.state || "", pincode: addr.postcode || "", street: addr.road || "", lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState<"current"|"hometown"|null>(null);
  const [currentAddress,  setCurrentAddress]  = useState<Address>(emptyAddress());
  const [hometownAddress, setHometownAddress] = useState<Address>(emptyAddress());
  const [oldAddresses, setOldAddresses] = useState<OldAddress[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/users/profile/full").then((data) => {
      const olds: OldAddress[] = [];
      (data.step4 || []).forEach((a: Record<string, string>) => {
        const mapped: Address = { flatNo: a.flat_no || "", building: a.building || "", street: a.street || "", area: a.area || "", city: a.city || "", state: a.state || "", pincode: a.pincode || "", lat: a.latitude || "", lng: a.longitude || "" };
        if (a.address_type === "current")       setCurrentAddress(mapped);
        else if (a.address_type === "hometown") setHometownAddress(mapped);
        else olds.push({ ...mapped, id: a.address_type });
      });
      if (olds.length > 0) setOldAddresses(olds);
    }).catch(() => {});
  }, []);

  const buildPayload = () => {
    const toAddr = (a: Address, type: string) => ({
      address_type: type, flat_no: a.flatNo || null, building: a.building || null,
      street: a.street || null, area: a.area || null, city: a.city || null,
      state: a.state || null, pincode: a.pincode || null,
      latitude: a.lat ? Number(a.lat) : null, longitude: a.lng ? Number(a.lng) : null,
    });
    return {
      addresses: [
        toAddr(currentAddress, "current"),
        toAddr(hometownAddress, "hometown"),
        ...oldAddresses.map((a, i) => toAddr(a, `old_${i + 1}`)),
      ],
    };
  };

  useAutoSave("/users/profile/step4", buildPayload, [currentAddress, hometownAddress, oldAddresses]);

  const detectLocation = async (target: "current"|"hometown") => {
    if (!navigator.geolocation) { toast.error("GPS not supported"); return; }
    setGpsLoading(target);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const filled = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          const setter = target === "current" ? setCurrentAddress : setHometownAddress;
          setter(prev => ({ ...prev, ...filled }));
          toast.success("Location detected!");
        } catch { toast.error("Could not fetch address. Fill manually."); }
        finally { setGpsLoading(null); }
      },
      () => { setGpsLoading(null); toast.error("Location denied. Fill manually."); },
      { timeout: 10000 }
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!currentAddress.city.trim())    e.currentCity    = "City is required";
    if (!currentAddress.state.trim())   e.currentState   = "State is required";
    if (!currentAddress.pincode.trim()) e.currentPincode = "Pincode is required";
    if (!hometownAddress.city.trim())   e.hometownCity   = "City is required";
    if (!hometownAddress.state.trim())  e.hometownState  = "State is required";
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

  const renderAddressFields = (address: Address, setAddress: (a: Address) => void, prefix: string, target: "current"|"hometown") => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Navigation className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-detect Location</p>
          <p className="text-xs text-muted-foreground">Fill address fields automatically using GPS</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => detectLocation(target)} disabled={gpsLoading !== null} className="gap-2 border-primary/30 text-primary">
          {gpsLoading === target ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</> : <><Navigation className="h-4 w-4" /> Detect GPS</>}
        </Button>
      </div>
      {address.lat && address.lng && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
          <MapPin className="h-3.5 w-3.5 text-primary" /><span>GPS: {address.lat}, {address.lng}</span>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {[["flatNo","Flat / House No."],["building","Building / Society"],["street","Street / Road"],["area","Area / Locality"]].map(([field, label]) => (
          <div key={field} className="space-y-2">
            <Label>{label}</Label>
            <Input placeholder={`Enter ${label.toLowerCase()}`} value={address[field as keyof Address]}
              onChange={e => setAddress({ ...address, [field]: e.target.value })} />
          </div>
        ))}
        <div className="space-y-2">
          <Label>City <span className="text-destructive">*</span></Label>
          <Input placeholder="Enter city" value={address.city}
            onChange={e => { setAddress({...address, city: e.target.value}); setErrors(ev => ({...ev, [`${prefix}City`]: ""})) }}
            className={errors[`${prefix}City`] ? "border-destructive" : ""} />
          {errors[`${prefix}City`] && <p className="text-xs text-destructive">{errors[`${prefix}City`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>State <span className="text-destructive">*</span></Label>
          <Input placeholder="Enter state" value={address.state}
            onChange={e => { setAddress({...address, state: e.target.value}); setErrors(ev => ({...ev, [`${prefix}State`]: ""})) }}
            className={errors[`${prefix}State`] ? "border-destructive" : ""} />
          {errors[`${prefix}State`] && <p className="text-xs text-destructive">{errors[`${prefix}State`]}</p>}
        </div>
        <div className="space-y-2">
          <Label>Pincode {prefix === "current" && <span className="text-destructive">*</span>}</Label>
          <Input placeholder="6-digit pincode" value={address.pincode} maxLength={6}
            onChange={e => { setAddress({...address, pincode: e.target.value}); setErrors(ev => ({...ev, [`${prefix}Pincode`]: ""})) }}
            className={errors[`${prefix}Pincode`] ? "border-destructive" : ""} />
          {errors[`${prefix}Pincode`] && <p className="text-xs text-destructive">{errors[`${prefix}Pincode`]}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/profile")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Button>
        <h1 className="text-3xl font-semibold text-foreground">Location Information</h1>
        <p className="text-muted-foreground mt-1">Step 4 of 7: Provide your address details</p>
      </div>

      <Stepper steps={steps} currentStep={3} />

      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardHeader><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><CardTitle>Current Address</CardTitle></div><CardDescription>Your present residential address</CardDescription></CardHeader>
        <CardContent>{renderAddressFields(currentAddress, setCurrentAddress, "current", "current")}</CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" /><CardTitle>Home Town Address</CardTitle></div><CardDescription>Your native place or ancestral home</CardDescription></CardHeader>
        <CardContent>{renderAddressFields(hometownAddress, setHometownAddress, "hometown", "hometown")}</CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Old Location History</CardTitle><CardDescription>Add up to 4 previous addresses (Optional)</CardDescription></div>
            <Button onClick={() => { if (oldAddresses.length < 4) setOldAddresses(prev => [...prev, { ...emptyAddress(), id: Date.now().toString() }]); }} size="sm" variant="outline" disabled={oldAddresses.length >= 4} className="gap-2">
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
                  <Button aria-label="Remove address" variant="ghost" size="sm" onClick={() => setOldAddresses(prev => prev.filter(a => a.id !== address.id))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {(["flatNo","building","street","area","city","state","pincode"] as (keyof Address)[]).map(field => (
                    <Input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={address[field]}
                      onChange={e => setOldAddresses(prev => prev.map(a => a.id === address.id ? { ...a, [field]: e.target.value } : a))} />
                  ))}
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
    </div>
  );
}
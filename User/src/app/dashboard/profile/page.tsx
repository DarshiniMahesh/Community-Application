"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User, Calendar, FileText, Users, MapPin, GraduationCap, Wallet, Edit, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { INCOME_SLAB_REVERSE } from "@/lib/constants";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format any ISO/DB date string to "DD MMM YYYY" — no time */
function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Convert a raw DB income key (e.g. "5_10l") to a human-readable label */
function formatIncome(raw?: string | null): string | null {
  if (!raw) return null;
  if (INCOME_SLAB_REVERSE[raw]) return INCOME_SLAB_REVERSE[raw];
  return raw.replace(/_/g, " – ").replace(/l$/, " Lakh");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /><span>{label}</span>
      </div>
      <p className="font-semibold text-foreground text-sm">
        {value || <span className="text-muted-foreground font-normal italic">Not provided</span>}
      </p>
    </div>
  );
}

function Section({ title, href, filled, isLocked, children }: {
  title: string; href: string; filled: boolean; isLocked: boolean; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {!isLocked && (
          <Button variant="ghost" size="sm" onClick={() => router.push(href)} className="gap-1.5 text-primary hover:text-primary">
            <Edit className="h-3.5 w-3.5" />{filled ? "Edit" : "Fill"}
          </Button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const [data, setData]       = useState<Record<string, unknown> | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users/profile/full"),
      api.get("/users/profile"),
    ]).then(([full, prof]) => {
      setData(full);
      setProfile(prof);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  const s1    = data?.step1 as Record<string, string> | null;
  const s2    = data?.step2 as Record<string, string> | null;
  const s3    = data?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const s4    = data?.step4 as Record<string, string>[] | null;
  const s5    = data?.step5 as Record<string, string>[] | null;
  const s6eco = (data?.step6 as { economic?: Record<string, unknown> } | null)?.economic;

  const status        = profile?.status as string;
  const isLocked      = ["submitted", "under_review", "approved"].includes(status);
  const completionPct = (profile?.overall_completion_pct as number) || 0;

  const fullName    = s1 ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ") : "Your Name";
  const initials    = s1 ? `${s1.first_name?.[0] || ""}${s1.last_name?.[0] || ""}`.toUpperCase() : "?";
  const currentAddr = s4?.find(a => a.address_type === "current");

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        {!isLocked && (
          <Button onClick={() => router.push("/dashboard/profile/personal-details")} className="gap-2">
            <Edit className="h-4 w-4" />Edit Profile
          </Button>
        )}
      </div>

      {/* Avatar + completion */}
      <div className="bg-white rounded-2xl border border-border shadow-sm px-6 py-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-lg text-foreground">{fullName}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[160px] overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{completionPct}% completed</span>
          </div>
        </div>
        {completionPct === 100 && <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />}
      </div>

      {/* Personal Details */}
      <Section title="Personal Details" href="/dashboard/profile/personal-details" filled={!!s1} isLocked={isLocked}>
        {s1 ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <InfoField icon={User}     label="Full Name"      value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")} />
            {/* ✅ FIX: Date formatted cleanly — no time */}
            <InfoField icon={Calendar} label="Date of Birth"  value={formatDate(s1.date_of_birth)} />
            <InfoField icon={User}     label="Gender"         value={s1.gender} />
            <InfoField icon={Users}    label="Marital Status" value={s1.is_married ? "Married" : "Single"} />
            {s1.fathers_name && <InfoField icon={User} label="Father's Name" value={s1.fathers_name} />}
            {s1.mothers_name && <InfoField icon={User} label="Mother's Name" value={s1.mothers_name} />}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Religious Details */}
      <Section title="Religious Details" href="/dashboard/profile/religious-details" filled={!!s2} isLocked={isLocked}>
        {s2 ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <InfoField icon={FileText} label="Gotra"         value={s2.gotra} />
            <InfoField icon={FileText} label="Pravara"       value={s2.pravara} />
            <InfoField icon={FileText} label="Upanama"       value={s2.upanama} />
            <InfoField icon={FileText} label="Kuladevata"    value={s2.kuladevata_other || s2.kuladevata} />
            <InfoField icon={User}     label="Surname"       value={s2.surname_in_use} />
            <InfoField icon={User}     label="Family Priest" value={s2.priest_name} />
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Family Information */}
      <Section title="Family Information" href="/dashboard/profile/family-information" filled={!!s3} isLocked={isLocked}>
        {s3?.family_info ? (
          <div className="space-y-3">
            <InfoField icon={Users} label="Family Type" value={s3.family_info.family_type} />
            {s3.members && s3.members.length > 0 && (
              <div className="space-y-2 mt-2">
                {s3.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">
                      {m.relation}
                      {/* ✅ FIX: DOB shown cleanly without time */}
                      {m.dob
                        ? `, DOB: ${formatDate(m.dob)}`
                        : m.age
                          ? `, Age ${m.age}`
                          : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Location */}
      <Section title="Location" href="/dashboard/profile/location-information" filled={!!currentAddr} isLocked={isLocked}>
        {currentAddr ? (
          <InfoField icon={MapPin} label="Current Address"
            value={[currentAddr.flat_no, currentAddr.building, currentAddr.street, currentAddr.area,
              currentAddr.city, currentAddr.state, currentAddr.pincode].filter(Boolean).join(", ")} />
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Education & Profession */}
      <Section title="Education &amp; Profession" href="/dashboard/profile/education-profession" filled={!!s5?.length} isLocked={isLocked}>
        {s5 && s5.length > 0 ? (
          <div className="space-y-2">
            {s5.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <span className="font-medium">{m.member_name || `Member ${i + 1}`}</span>
                <span className="text-muted-foreground">
                  {m.highest_education}
                  {/* ✅ Show "Currently Studying" if applicable, else show profession */}
                  {(m as unknown as Record<string, unknown>).is_currently_studying
                    ? " · Currently Studying"
                    : m.profession_type
                      ? ` · ${m.profession_type}`
                      : ""}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Economic Details */}
      <Section title="Economic Details" href="/dashboard/profile/economic-details" filled={!!s6eco} isLocked={isLocked}>
        {s6eco ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {/* ✅ FIX: Income slabs display as "₹5 – 10 Lakh" not "5_10l" */}
            <InfoField icon={Wallet} label="Self Income"   value={formatIncome(s6eco.self_income as string)} />
            <InfoField icon={Wallet} label="Family Income" value={formatIncome(s6eco.family_income as string)} />
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>
    </div>
  );
}
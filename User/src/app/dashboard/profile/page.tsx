"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Calendar, FileText, Users, MapPin, Wallet, Edit, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { INCOME_SLAB_REVERSE } from "@/lib/constants";

function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatIncome(raw?: string | null): string | null {
  if (!raw) return null;
  if (INCOME_SLAB_REVERSE[raw]) return INCOME_SLAB_REVERSE[raw];
  return raw.replace(/_/g, " – ").replace(/l$/, " Lakh");
}

function hasCov(arr: unknown): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

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

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
      value
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {value ? <CheckCircle2 className="h-3 w-3" /> : null}
      {value ? "Yes" : "No"}
    </span>
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

  const s1  = data?.step1 as Record<string, string> | null;
  const s2  = data?.step2 as Record<string, string> | null;
  const s3  = data?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const s4  = data?.step4 as Record<string, string>[] | null;
  const s5  = data?.step5 as Record<string, unknown>[] | null;
  const s6eco = (data?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = ((data?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || []);
  const s6doc = ((data?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || []);

  const status        = profile?.status as string;
  const isLocked      = ["submitted", "under_review", "approved"].includes(status);
  const completionPct = (profile?.overall_completion_pct as number) || 0;

  const fullName    = s1 ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ") : "Your Name";
  const initials    = s1 ? `${s1.first_name?.[0] || ""}${s1.last_name?.[0] || ""}`.toUpperCase() : "?";
  const currentAddr = s4?.find(a => a.address_type === "current");

  const userEduRow  = s5?.[0] ?? null;
  const familyMembers = s3?.members || [];

  // Match insurance/doc row by relation for self, by name+relation for family
  const userIns = s6ins.find(r => (r.member_relation as string) === "Self");
  const userDoc = s6doc.find(r => (r.member_relation as string) === "Self");

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
            {familyMembers.length > 0 && (
              <div className="space-y-2 mt-2">
                {familyMembers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">
                      {m.relation}
                      {m.dob ? `, DOB: ${formatDate(m.dob)}` : m.age ? `, Age ${m.age}` : ""}
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

      {/* Education & Profession — user row + all family member rows */}
      <Section title="Education & Profession" href="/dashboard/profile/education-profession" filled={!!userEduRow} isLocked={isLocked}>
        {userEduRow ? (
          <div className="space-y-2">
            {/* User's own row */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
              <span className="font-medium">{userEduRow.member_name as string || fullName}</span>
              <span className="text-muted-foreground">
                {userEduRow.highest_education as string}
                {userEduRow.is_currently_studying
                  ? " · Currently Studying"
                  : userEduRow.profession_type
                    ? ` · ${userEduRow.profession_type as string}`
                    : ""}
              </span>
            </div>
            {/* Family member rows — s5[1], s5[2], ... */}
            {(s5 ?? []).slice(1).map((edu, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                <span className="font-medium">{edu.member_name as string || `Member ${i + 1}`}</span>
                <span className="text-muted-foreground">
                  {edu.highest_education as string}
                  {edu.is_currently_studying
                    ? " · Currently Studying"
                    : edu.profession_type
                      ? ` · ${edu.profession_type as string}`
                      : ""}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* Economic Details — income + insurance + documents */}
      <Section title="Economic Details" href="/dashboard/profile/economic-details" filled={!!s6eco} isLocked={isLocked}>
        {s6eco ? (
          <div className="space-y-5">
            {/* Income */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoField icon={Wallet} label="Self Income"   value={formatIncome(s6eco.self_income as string)} />
              <InfoField icon={Wallet} label="Family Income" value={formatIncome(s6eco.family_income as string)} />
            </div>

            {/* Insurance per member */}
            {s6ins.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Insurance Coverage</Label>
                <div className="space-y-3">
                  {s6ins.map((ins, i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-foreground">
                        {ins.member_name as string} — {ins.member_relation as string}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border">
                        {[
                          { label: "Health", key: "health_coverage" },
                          { label: "Life",   key: "life_coverage" },
                          { label: "Term",   key: "term_coverage" },
                          { label: "Konkani Card", key: "konkani_card_coverage" },
                        ].map(({ label, key }) => (
                          <div key={key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <YesNoBadge value={hasCov(ins[key])} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents per member */}
            {s6doc.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                <div className="space-y-3">
                  {s6doc.map((doc, i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-foreground">
                        {doc.member_name as string} — {doc.member_relation as string}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border">
                        {[
                          { label: "Aadhaar",    key: "aadhaar_coverage" },
                          { label: "PAN",        key: "pan_coverage" },
                          { label: "Voter ID",   key: "voter_id_coverage" },
                          { label: "Land Docs",  key: "land_doc_coverage" },
                          { label: "DL",         key: "dl_coverage" },
                        ].map(({ label, key }) => (
                          <div key={key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <YesNoBadge value={hasCov(doc[key])} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>
    </div>
  );
}
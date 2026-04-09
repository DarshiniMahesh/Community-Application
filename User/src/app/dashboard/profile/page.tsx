"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

function formatTenure(t: string): string {
  if (t === "part_time") return "Part Time";
  if (t === "full_time") return "Full Time";
  return t || "";
}

function formatStatus(s: string): string {
  if (s === "active") return "Active";
  if (s === "passed_away") return "Passed Away";
  if (s === "unknown") return "Unknown";
  return s || "";
}

function formatProfession(p: string): string {
  const map: Record<string, string> = {
    self_employed: "Self Employed or Business",
    stem: "Science, Technology, Engineering & Mathematics",
    healthcare: "Healthcare & Medicine",
    business: "Business & Management",
    law: "Law & Governance",
    education: "Education & Research",
    arts_media: "Arts, Media & Communication",
    trades: "Trades & Vocational Professions",
    agriculture: "Agriculture & Others",
  };
  return map[p] || p || "";
}

function formatAddress(a: Record<string, string>): string {
  return [a.flat_no, a.building, a.street, a.landmark, a.area, a.city, a.taluk, a.district, a.pincode, a.country]
    .filter(Boolean).join(", ");
}

function getLangLabel(l: { language: string; language_other?: string }): string {
  return l.language === "Other"
    ? String(l.language_other ?? "")
    : String(l.language ?? "");
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

  const s1    = data?.step1 as Record<string, string> | null;
  const s2    = data?.step2 as Record<string, unknown> | null;
  const s4    = data?.step4 as Record<string, string>[] | null;
  const s5 = Array.isArray(data?.step5)
  ? data.step5 as Record<string, unknown>[]
  : [];
  const s6eco = (data?.step6 as { economic?: Record<string, unknown> } | null)?.economic;
  const s6ins = ((data?.step6 as { insurance?: Record<string, unknown>[] } | null)?.insurance || []);
  const s6doc = ((data?.step6 as { documents?: Record<string, unknown>[] } | null)?.documents || []);

  const s3typed = data?.step3 as { family_info?: Record<string, string>; members?: Record<string, string>[] } | null;
  const familyType    = s3typed?.family_info?.family_type || "";
  const familyMembers = s3typed?.members || [];

  const status        = typeof profile?.status === "string" ? profile.status : "";
  const isLocked      = ["submitted", "under_review"].includes(status);
  const completionPct = typeof profile?.overall_completion_pct === "number" ? profile.overall_completion_pct : 0;

  const fullName     = s1 ? [s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ") : "Your Name";
  const initials     = s1 ? `${s1.first_name?.[0] || ""}${s1.last_name?.[0] || ""}`.toUpperCase() : "?";
  const currentAddr = (s4 || []).find(a => a.address_type === "current");
  const hometownAddr = (s4 || []).find(a => a.address_type === "hometown");
  const oldAddresses = (s4 || []).filter(a => a.address_type?.startsWith("old_"));

  const userEduRow =
  Array.isArray(s5) &&
  Array.isArray((s5[0] as any)?.educations) &&
  (s5[0] as any).educations.length > 0
    ? s5[0]
    : null;

  const demiGodsRaw = s2?.demi_gods;
  const demiGodsList: string[] = Array.isArray(demiGodsRaw)
    ? demiGodsRaw as string[]
    : typeof demiGodsRaw === "string"
      ? demiGodsRaw.split(",").map(d => d.trim()).filter(Boolean)
      : [];
  const demiGodOther = typeof s2?.demi_god_other === "string" ? s2.demi_god_other : null;
  const allDemiGods = [
    ...demiGodsList.filter(d => d !== "Other"),
    ...(demiGodOther ? demiGodOther.split(",").map(t => t.trim()).filter(Boolean) : []),
  ];

  const fac: string[] = [];
  if (s6eco?.fac_rented_house)      fac.push("Staying in Rented House");
  if (s6eco?.fac_own_house)         fac.push("Own a House");
  if (s6eco?.fac_agricultural_land) fac.push("Own Agricultural Land");
  if (s6eco?.fac_two_wheeler)       fac.push("Own a Two Wheeler");
  if (s6eco?.fac_car)               fac.push("Own a Car");

  const inv: string[] = [];
  if (s6eco?.inv_fixed_deposits)   inv.push("Fixed Deposits");
  if (s6eco?.inv_mutual_funds_sip) inv.push("Mutual Funds / SIP");
  if (s6eco?.inv_shares_demat)     inv.push("Trading in Shares / Demat Account");
  if (s6eco?.inv_others)           inv.push("Investment - Others");

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

      <div className="bg-white rounded-2xl border border-border shadow-sm px-6 py-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-lg text-foreground">{fullName}</p>
          {s1?.gender && <p className="text-sm text-muted-foreground capitalize">{s1.gender}</p>}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[160px] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completionPct}% completed</span>
          </div>
        </div>
        {completionPct === 100 && <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />}
      </div>

      {/* ── Personal Details ── */}
      <Section title="Personal Details" href="/dashboard/profile/personal-details" filled={!!s1} isLocked={isLocked}>
        {s1 ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <InfoField icon={User}     label="Full Name"            value={[s1.first_name, s1.middle_name, s1.last_name].filter(Boolean).join(" ")} />
            <InfoField icon={Calendar} label="Date of Birth"        value={formatDate(s1.date_of_birth)} />
            <InfoField icon={User}     label="Gender"               value={s1.gender ? s1.gender.charAt(0).toUpperCase() + s1.gender.slice(1) : null} />
            <InfoField icon={Users}    label="Marital Status"       value={s1.is_married ? "Married" : "Single"} />
            <InfoField icon={User}     label="Surname in Use"       value={s1.surname_in_use} />
            <InfoField icon={User}     label="Surname as per Gotra" value={s1.surname_as_per_gotra} />
            {s1.fathers_name && <InfoField icon={User} label="Father's Name" value={s1.fathers_name} />}
            {s1.mothers_name && <InfoField icon={User} label="Mother's Name" value={s1.mothers_name} />}
            <InfoField icon={User} label="Disability" value={s1.has_disability === "yes" || s1.has_disability === "true" ? "Yes" : "No"} />
            {(s1.is_part_of_sangha === "yes" || s1.is_part_of_sangha === "true") && (
              <>
                <InfoField icon={Users} label="Sangha Name"   value={s1.sangha_name} />
                <InfoField icon={Users} label="Sangha Role"   value={s1.sangha_role} />
                <InfoField icon={Users} label="Sangha Tenure" value={formatTenure(s1.sangha_tenure)} />
              </>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* ── Religious Details ── */}
      <Section title="Religious Details" href="/dashboard/profile/religious-details" filled={!!s2} isLocked={isLocked}>
        {s2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoField icon={FileText} label="Surname in Use"       value={typeof s2.surname_in_use === "string" ? s2.surname_in_use : null} />
              <InfoField icon={FileText} label="Surname as per Gotra" value={typeof s2.surname_as_per_gotra === "string" ? s2.surname_as_per_gotra : null} />
              <InfoField icon={User}     label="Family Priest"        value={typeof s2.priest_name === "string" ? s2.priest_name : null} />
              <InfoField icon={MapPin}   label="Priest Location"      value={typeof s2.priest_location === "string" ? s2.priest_location : null} />
              <InfoField icon={FileText} label="Gotra"                value={typeof s2.gotra === "string" ? s2.gotra : null} />
              <InfoField icon={FileText} label="Pravara"              value={typeof s2.pravara === "string" ? s2.pravara : null} />
              <InfoField icon={FileText} label="Upanama (General)"    value={typeof s2.upanama_general === "string" ? s2.upanama_general : null} />
              <InfoField icon={FileText} label="Upanama (Proper)"     value={typeof s2.upanama_proper === "string" ? s2.upanama_proper : null} />
              <InfoField icon={FileText} label="Kuladevata"           value={
                typeof s2.kuladevata_other === "string" && s2.kuladevata_other
                  ? s2.kuladevata_other
                  : typeof s2.kuladevata === "string" ? s2.kuladevata : null
              } />
              <InfoField
                icon={FileText}
                label="Ancestral Tracing Challenge"
                value={s2.ancestral_challenge === "yes" ? "Yes" : s2.ancestral_challenge === "no" ? "No" : null}
              />
              {s2.ancestral_challenge === "yes" && (
                <InfoField icon={FileText} label="Common Relative Names" value={typeof s2.ancestral_challenge_notes === "string" ? s2.ancestral_challenge_notes : null} />
              )}
            </div>
            {allDemiGods.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Demi God(s)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allDemiGods.map((god, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{god}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* ── Family Information ── */}
      <Section title="Family Information" href="/dashboard/profile/family-information" filled={!!s3typed} isLocked={isLocked}>
        {familyMembers.length > 0 ? (
          <div className="space-y-3">
            {familyType && (
              <InfoField icon={Users} label="Family Type" value={familyType === "nuclear" ? "Nuclear Family" : familyType === "joint" ? "Joint Family" : familyType} />
            )}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    {["Relation","Name","Date of Birth","Gender","Status","Disability"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {familyMembers.map((m, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-3 py-2 font-medium">{m.relation}</td>
                      <td className="px-3 py-2">{m.name || "—"}</td>
                      <td className="px-3 py-2">{m.dob ? formatDate(m.dob) : m.age ? `Age ${m.age}` : "—"}</td>
                      <td className="px-3 py-2 capitalize">{m.gender || "—"}</td>
                      <td className="px-3 py-2">{m.status ? formatStatus(m.status) : "—"}</td>
                      <td className="px-3 py-2">{m.disability === "yes" ? "Yes" : m.disability === "no" ? "No" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* ── Location ── */}
      <Section title="Location" href="/dashboard/profile/location-information" filled={!!(currentAddr?.city && currentAddr?.district)} isLocked={isLocked}>
        {currentAddr ? (
          <div className="space-y-3">
            <InfoField icon={MapPin} label="Current Address" value={formatAddress(currentAddr)} />
            {hometownAddr && (
              <InfoField icon={MapPin} label="Home Town Address" value={formatAddress(hometownAddr)} />
            )}
            {oldAddresses.map((a, i) => (
              <InfoField key={i} icon={MapPin} label={`Previous Address ${i + 1}`} value={formatAddress(a)} />
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* ── Education & Profession ── */}
          <Section title="Education & Profession" href="/dashboard/profile/education-profession" filled={
          Array.isArray(s5) &&
          s5.some(e => Array.isArray((e as any).educations) && (e as any).educations.length > 0)
          } isLocked={isLocked}>
        {(s5 ?? []).length > 0 ? (
          <div className="space-y-4">
            {(s5 ?? []).map((edu, i) => {
              const memberName     = typeof edu.member_name === "string" ? edu.member_name : (i === 0 ? fullName : `Member ${i + 1}`);
              const memberRelation = typeof edu.member_relation === "string" ? edu.member_relation : "";
              const profType       = typeof edu.profession_type === "string" ? edu.profession_type : "";
              const industry       = typeof edu.industry === "string" ? edu.industry : "";
              const briefProfile   = typeof edu.brief_profile === "string" ? edu.brief_profile : "";
              const educations     = (edu.educations as Record<string, string>[]) ?? [];
              const languages      = (edu.languages as { language: string; language_other?: string }[]) ?? [];
              const isCurrentlyStudying = edu.is_currently_studying === true || edu.is_currently_studying === "true";
              const isCurrentlyWorking  = edu.is_currently_working === true || edu.is_currently_working === "true";

              return (
                <div key={i} className="space-y-3">
                  {i > 0 && <div className="border-t border-border pt-3" />}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">{memberName}</span>
                    <span className="text-xs text-muted-foreground">— {memberRelation}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <InfoField icon={FileText} label="Currently Studying" value={isCurrentlyStudying ? "Yes" : "No"} />
                    {isCurrentlyStudying && (
                      <InfoField
                        icon={FileText}
                        label="Currently Working"
                        value={
                          typeof edu.is_currently_working === "boolean"
                            ? edu.is_currently_working ? "Yes" : "No"
                            : typeof edu.is_currently_working === "string"
                              ? edu.is_currently_working === "true" ? "Yes" : "No"
                              : null
                        }
                      />
                    )}
                    {profType && <InfoField icon={Wallet} label="Profession" value={formatProfession(profType)} />}
                    {industry && <InfoField icon={FileText} label="Industry / Field" value={industry} />}
                    {briefProfile && <InfoField icon={FileText} label="Brief Profile" value={briefProfile} />}
                  </div>

                  {educations.filter(e => e.degree_type).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Education</p>
                      <div className="space-y-1.5">
                        {educations.filter(e => e.degree_type).map((e, ei) => (
                          <div key={ei} className="flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-lg bg-muted/30 border border-border text-sm">
                            <span className="font-medium">{e.degree_type}</span>
                            {e.degree_name && <span className="text-muted-foreground">{e.degree_name}</span>}
                            {e.university && <span className="text-muted-foreground">{e.university}</span>}
                            {e.start_date && e.end_date && (
                              <span className="text-muted-foreground text-xs">{formatDate(e.start_date)} – {formatDate(e.end_date)}</span>
                            )}
                            {e.certificate && <span className="text-muted-foreground text-xs">Cert: {e.certificate}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {languages.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Languages Known</p>
                      <div className="flex flex-wrap gap-1">
                        {languages.map((l, li) => (
                          <Badge key={li} variant="secondary" className="text-xs">
                            {getLangLabel(l)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>

      {/* ── Economic Details ── */}
      <Section title="Economic Details" href="/dashboard/profile/economic-details" filled={!!s6eco} isLocked={isLocked}>
        {s6eco ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <InfoField icon={Wallet} label="Self Income"   value={formatIncome(typeof s6eco.self_income === "string" ? s6eco.self_income : null)} />
              <InfoField icon={Wallet} label="Family Income" value={formatIncome(typeof s6eco.family_income === "string" ? s6eco.family_income : null)} />
            </div>

            {fac.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Family Facilities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {fac.map(f => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
                </div>
              </div>
            )}

            {inv.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Investments
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inv.map(iv => <Badge key={iv} variant="secondary" className="text-xs">{iv}</Badge>)}
                </div>
              </div>
            )}

            {s6ins.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Insurance Coverage</Label>
                <div className="space-y-3">
                  {s6ins.map((ins, i) => {
                    const insName     = typeof ins.member_name === "string" ? ins.member_name : "";
                    const insRelation = typeof ins.member_relation === "string" ? ins.member_relation : "";
                    return (
                      <div key={i} className="rounded-xl border border-border overflow-hidden">
                        <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-foreground">
                          {insName} — {insRelation}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border">
                          {[
                            { label: "Health",       key: "health_coverage" },
                            { label: "Life",         key: "life_coverage" },
                            { label: "Term",         key: "term_coverage" },
                            { label: "Konkani Card", key: "konkani_card_coverage" },
                          ].map(({ label, key }) => (
                            <div key={key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <YesNoBadge value={hasCov(ins[key])} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {s6doc.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Documents</Label>
                <div className="space-y-3">
                  {s6doc.map((doc, i) => {
                    const docName     = typeof doc.member_name === "string" ? doc.member_name : "";
                    const docRelation = typeof doc.member_relation === "string" ? doc.member_relation : "";
                    return (
                      <div key={i} className="rounded-xl border border-border overflow-hidden">
                        <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-foreground">
                          {docName} — {docRelation}
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-border">
                          {[
                            { label: "Aadhaar",   key: "aadhaar_coverage" },
                            { label: "PAN",       key: "pan_coverage" },
                            { label: "Voter ID",  key: "voter_id_coverage" },
                            { label: "Land Docs", key: "land_doc_coverage" },
                            { label: "DL",        key: "dl_coverage" },
                          ].map(({ label, key }) => (
                            <div key={key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <YesNoBadge value={hasCov(doc[key])} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground italic">Not filled yet.</p>}
      </Section>
    </div>
  );
}
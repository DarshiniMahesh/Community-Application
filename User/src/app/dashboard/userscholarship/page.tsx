//Community-Application\User\src\app\dashboard\userscholarship\page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";

// ─── API Base ─────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ScholarshipStatus = "open" | "closing_soon" | "closed";
type ApplicationStatus = "not_applied" | "applied" | "approved" | "rejected";

interface RawEligibility {
  age_min?: number | null;
  age_max?: number | null;
  gender?: string | null;
  disability_required?: boolean | null;
  marital_status?: string | null;
  single_parent_only?: boolean | null;
  disabled_family_member?: boolean | null;
  orphan?: boolean | null;
  minority_community?: boolean | null;
  rural_background?: boolean | null;
  sports_quota?: boolean | null;
  merit_based?: boolean | null;
  currently_studying?: boolean | null;
  employment_status?: string | null;
  annual_family_income_max?: number | null;
  self_income_max?: number | null;
  ews_only?: boolean | null;
  education_levels?: string[];
  states?: string[];
  cgpa_min?: number | null;
  percentage_min?: number | null;
}

// Custom criteria created by the sangha admin
interface CustomCriterion {
  label: string;
  description: string;
}

interface MemberApplication {
  memberId: string;
  memberName: string;
  relation: string;
  status: "applied" | "approved" | "rejected";
}

interface Scholarship {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  baseAmount: number;
  tieredAmounts: { label: string; amount: number; condition: string }[];
  eligibility: string[];
  // Sangha-defined custom criteria (label + description)
  customCriteria: CustomCriterion[];
  status: ScholarshipStatus;
  applicationStatus: ApplicationStatus;
  applications: MemberApplication[];
  applicationStart: string;
  applicationEnd: string;
  disbursementDate: string;
  visibility: "all_users" | "primary_sangha_only";
  sanghaName?: string;
  maxApprovals?: number;
  currentApprovals?: number;
  raw?: RawEligibility;
}

interface FamilyMember {
  id: string;
  label: string;
  name: string;
  relation: string;
  age: number | null;
  gender: string | null;
  disability: string;
  maritalStatus: string | null;
  applicationStatus: ApplicationStatus;
}

// ─── Filter constants ─────────────────────────────────────────────────────────
const STATUS_FILTERS = ["All", "Open", "Closing Soon", "Closed"];

// ─── Global Styles ────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes drawerIn { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
  @keyframes filterPanelIn { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .schol-card { animation:fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; transition:transform 0.22s ease,box-shadow 0.22s ease,border-color 0.18s ease; cursor:pointer; }
  .schol-card:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.06); }
  .apply-btn { transition:all 0.18s ease; position:relative; overflow:hidden; }
  .apply-btn::after { content:''; position:absolute; inset:0; background:rgba(255,255,255,0); transition:background 0.15s; }
  .apply-btn:hover:not(:disabled)::after { background:rgba(255,255,255,0.12); }
  .apply-btn:active:not(:disabled) { transform:scale(0.97); }
  .filter-chip { transition:all 0.15s ease; cursor:pointer; white-space:nowrap; }
  .filter-chip:hover { transform:translateY(-1px); }
  .search-input:focus { outline:none; box-shadow:0 0 0 3px rgba(83,74,183,0.18); }
  .drawer-section-label { font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px; }
  .member-card { transition:all 0.18s ease; cursor:pointer; }
  .member-card:hover { border-color:#534AB7 !important; }
  .criteria-row { transition:background 0.12s ease; }
  .criteria-row:hover { background:rgba(83,74,183,0.04) !important; }
  .filter-panel-chip { transition:all 0.13s ease; cursor:pointer; user-select:none; }
  .filter-panel-chip:hover { background:#f5f5fa !important; }
  input,textarea,select,button { font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(100,116,139,0.25); border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(100,116,139,0.4); }

  /* Persistent sidebar */
  .page-layout { display:flex; gap:0; align-items:flex-start; }
  .filter-sidebar-persistent {
    width:240px;
    flex-shrink:0;
    position:sticky;
    top:0;
    height:100vh;
    overflow-y:auto;
    border-right:1px solid #ebebf0;
    background:#fff;
    display:flex;
    flex-direction:column;
  }
  .main-content { flex:1; min-width:0; padding:2rem 1.5rem; }

  /* Mobile: hide persistent sidebar, show overlay trigger */
  @media (max-width: 768px) {
    .filter-sidebar-persistent { display:none !important; }
    .mobile-filter-btn { display:flex !important; }
    .main-content { padding:1.25rem 1rem; }
  }
  @media (min-width: 769px) {
    .mobile-filter-btn { display:none !important; }
  }
`;

// ─── Utility ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Application Status Pill ──────────────────────────────────────────────────

function AppStatusPill({ status, partialCount }: { status: ApplicationStatus; partialCount?: number }) {
  if (status === "not_applied" && partialCount && partialCount > 0) {
    return (
      <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:600,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.2)" }}>
        <span style={{ fontSize:10 }}>⏳</span>{partialCount} member{partialCount !== 1 ? "s" : ""} applied
      </span>
    );
  }

  const map: Record<string, { label: string; bg: string; color: string; border: string; icon: string } | null> = {
    not_applied: null,
    applied:  { label:"Applied",  bg:"rgba(83,74,183,0.1)",  color:"#534AB7",  border:"rgba(83,74,183,0.25)",  icon:"⏳" },
    approved: { label:"Approved", bg:"rgba(15,110,86,0.1)",  color:"#0F6E56",  border:"rgba(15,110,86,0.25)",  icon:"✓" },
    rejected: { label:"Rejected", bg:"rgba(192,57,43,0.08)", color:"#C0392B",  border:"rgba(192,57,43,0.22)",  icon:"✕" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:600,background:s.bg,color:s.color,border:`0.5px solid ${s.border}` }}>
      <span style={{ fontSize:10 }}>{s.icon}</span>{s.label}
    </span>
  );
}

// ─── Scholarship Status Tag ───────────────────────────────────────────────────

function StatusTag({ status, end }: { status: ScholarshipStatus; end: string }) {
  const days = daysUntil(end);
  if (status === "closed") return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:600,background:"rgba(100,116,139,0.1)",color:"var(--color-text-tertiary)",border:"0.5px solid var(--color-border-tertiary)" }}>
      🔒 Closed
    </span>
  );
  if (status === "closing_soon") return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:700,background:"rgba(220,100,0,0.1)",color:"#c96000",border:"0.5px solid rgba(220,100,0,0.25)",animation:"pulse 2.2s infinite" }}>
      ⏰ {days}d left
    </span>
  );
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:600,background:"rgba(15,110,86,0.1)",color:"var(--color-text-success)",border:"0.5px solid rgba(15,110,86,0.22)" }}>
      <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block",animation:"pulse 2s infinite" }} /> Open
    </span>
  );
}

// ─── Quota Bar ────────────────────────────────────────────────────────────────

function QuotaBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const isFull = current >= max;
  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11 }}>
        <span style={{ color:"#999",fontWeight:500 }}>Slots filled</span>
        <span style={{ fontWeight:700,color:isFull?"var(--color-text-danger)":"#666" }}>{current}/{max}{isFull&&" — Full"}</span>
      </div>
      <div style={{ height:5,borderRadius:3,background:"#f0f0f0",overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,borderRadius:3,background:isFull?"linear-gradient(90deg,#C0392B,#e05a4b)":"linear-gradient(90deg,#534AB7,#7B72D9)",transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
    </div>
  );
}

// ─── Member Application Status Badge ─────────────────────────────────────────

function MemberStatusBadge({ status }: { status: ApplicationStatus }) {
  if (status === "not_applied") return null;
  const cfg: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    applied:  { label:"Applied",  bg:"rgba(83,74,183,0.1)",  color:"#534AB7",  icon:"⏳" },
    approved: { label:"Approved", bg:"rgba(15,110,86,0.1)",  color:"#0F6E56",  icon:"✓" },
    rejected: { label:"Rejected", bg:"rgba(192,57,43,0.08)", color:"#C0392B",  icon:"✕" },
  };
  const c = cfg[status];
  if (!c) return null;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700,background:c.bg,color:c.color }}>
      <span style={{ fontSize:9 }}>{c.icon}</span>{c.label}
    </span>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  scholarship,
  onClose,
  onSubmit,
  submitting,
}: {
  scholarship: Scholarship;
  onClose: () => void;
  onSubmit: (applications: { memberId: string; checkedCriteria: string[] }[]) => Promise<void>;
  submitting: boolean;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [criteriaStates, setCriteriaStates] = useState<Record<string, Set<string>>>({});
  const [viewingMemberIdx, setViewingMemberIdx] = useState(0);

  const color = scholarship.categoryColor;

  // Combine standard eligibility criteria with custom sangha criteria labels
  // so the user confirms ALL requirements before submitting.
  const standardCriteria = scholarship.eligibility;
  const customCriteria   = scholarship.customCriteria ?? [];

  // Flat list of all criterion labels used for the checklist state
  const allCriteriaLabels = useMemo(() => [
    ...standardCriteria,
    ...customCriteria.map(cc => cc.label),
  ], [standardCriteria, customCriteria]);

  // Quick lookup: label → description (only custom criteria have descriptions)
  const customDescriptionMap = useMemo(() => {
    const m: Record<string, string> = {};
    customCriteria.forEach(cc => { if (cc.description) m[cc.label] = cc.description; });
    return m;
  }, [customCriteria]);

  useEffect(() => {
    setLoadingMembers(true);
    apiFetch<FamilyMember[]>(`/userschl/scholarships/${scholarship.id}/members`)
      .then(data => { setMembers(data); setLoadingMembers(false); })
      .catch(err => { setMembersError(err.message); setLoadingMembers(false); });
  }, [scholarship.id]);

  const toggleMember = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleCriteria = (memberId: string, criterion: string) => {
    setCriteriaStates(prev => {
      const memberSet = new Set(prev[memberId] ?? []);
      if (memberSet.has(criterion)) memberSet.delete(criterion); else memberSet.add(criterion);
      return { ...prev, [memberId]: memberSet };
    });
  };

  const selectableMembers = members.filter(m => m.applicationStatus === "not_applied");
  const selectedList = selectableMembers.filter(m => selectedIds.has(m.id));
  const currentMember = selectedList[viewingMemberIdx];
  const currentChecked = criteriaStates[currentMember?.id ?? ""] ?? new Set<string>();
  const allChecked = allCriteriaLabels.length === 0 || currentChecked.size === allCriteriaLabels.length;
  const canGoNextMember = viewingMemberIdx < selectedList.length - 1;
  const isLastMember = viewingMemberIdx === selectedList.length - 1;

  const handleStep2Next = () => {
    if (canGoNextMember) setViewingMemberIdx(v => v + 1);
    else setStep(3);
  };

  const handleSubmit = async () => {
    const apps = selectedList.map(m => ({
      memberId: m.id,
      checkedCriteria: Array.from(criteriaStates[m.id] ?? []),
    }));
    await onSubmit(apps);
  };

  const alreadyAppliedMembers = members.filter(m => m.applicationStatus !== "not_applied");

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(8,8,20,0.6)",zIndex:950,backdropFilter:"blur(6px)",animation:"overlayIn 0.2s ease" }} />
      <div style={{ position:"fixed",inset:0,zIndex:951,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",pointerEvents:"none" }}>
        <div style={{ pointerEvents:"auto",width:"100%",maxWidth:540,background:"#FFFFFF",borderRadius:20,boxShadow:"0 24px 80px rgba(0,0,0,0.22)",animation:"modalIn 0.28s cubic-bezier(0.16,1,0.3,1) both",display:"flex",flexDirection:"column",maxHeight:"90vh",overflow:"hidden" }}>
          <div style={{ padding:"20px 24px 16px",borderBottom:"1px solid #ebebf0",flexShrink:0,background:`linear-gradient(160deg,${color}14,${color}04)` }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10 }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                  {[1,2,3].map(s => (
                    <div key={s} style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",background:step>s?"#534AB7":step===s?color:"#e8e8ee",color:step>=s?"#fff":"#aaa",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s" }}>
                        {step>s?"✓":s}
                      </div>
                      {s < 3 && <div style={{ width:24,height:2,borderRadius:1,background:step>s?"#534AB7":"#e8e8ee",transition:"background 0.2s" }} />}
                    </div>
                  ))}
                  <span style={{ fontSize:11,color:"#999",marginLeft:4,fontWeight:600 }}>
                    {step===1?"Select members":step===2?"Confirm eligibility":"Review & submit"}
                  </span>
                </div>
                <h3 style={{ fontSize:16,fontWeight:700,color:"#1a1a2e",margin:0,lineHeight:1.3,fontFamily:"'Lora',serif" }}>{scholarship.name} scholarship</h3>
                <div style={{ fontSize:12,color,fontWeight:600,marginTop:2 }}>₹{scholarship.baseAmount.toLocaleString("en-IN")} base award</div>
              </div>
              <button onClick={onClose} style={{ width:32,height:32,border:"1px solid rgba(0,0,0,0.1)",borderRadius:10,background:"rgba(255,255,255,0.8)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#666",flexShrink:0,fontSize:16 }}>✕</button>
            </div>
          </div>

          <div style={{ flex:1,overflowY:"auto",padding:"20px 24px" }}>
            {step === 1 && (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                <p style={{ fontSize:13,color:"#666",margin:0,lineHeight:1.6 }}>Select who you'd like to apply for. You'll confirm eligibility for each person in the next step.</p>
                {!loadingMembers && alreadyAppliedMembers.length > 0 && (
                  <div style={{ padding:"10px 14px",borderRadius:10,background:"rgba(83,74,183,0.05)",border:"1px solid rgba(83,74,183,0.15)",fontSize:12,color:"#534AB7",lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:8 }}>
                    <span style={{ flexShrink:0 }}>ℹ</span>
                    <span>
                      {alreadyAppliedMembers.length} member{alreadyAppliedMembers.length !== 1 ? "s have" : " has"} already applied and cannot be selected again. You can apply for the remaining members below.
                    </span>
                  </div>
                )}
                {loadingMembers && (
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ height:64,borderRadius:12,background:"linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",backgroundSize:"400px 100%",animation:"shimmer 1.4s infinite" }} />
                    ))}
                  </div>
                )}
                {membersError && (
                  <div style={{ padding:"12px 16px",borderRadius:12,background:"rgba(192,57,43,0.05)",border:"1px solid rgba(192,57,43,0.2)",fontSize:13,color:"#C0392B" }}>
                    ⚠ {membersError}
                  </div>
                )}
                {!loadingMembers && !membersError && members.map(member => {
                  const isSelected = selectedIds.has(member.id);
                  const alreadyApplied = member.applicationStatus !== "not_applied";
                  return (
                    <div key={member.id} className={alreadyApplied?"":"member-card"} onClick={() => { if (!alreadyApplied) toggleMember(member.id); }}
                      style={{ padding:"14px 16px",borderRadius:14,border:alreadyApplied?"1px solid #ebebf0":isSelected?`2px solid ${color}`:"1.5px solid #ebebf0",background:alreadyApplied?"#fafafa":isSelected?`${color}08`:"#fff",display:"flex",alignItems:"center",gap:14,opacity:alreadyApplied?0.6:1,cursor:alreadyApplied?"not-allowed":"pointer",transition:"all 0.15s" }}>
                      {!alreadyApplied && (
                        <div style={{ width:20,height:20,borderRadius:6,flexShrink:0,border:isSelected?"none":"1.5px solid #ccc",background:isSelected?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",color:"#fff",fontSize:11 }}>
                          {isSelected?"✓":""}
                        </div>
                      )}
                      <div style={{ width:38,height:38,borderRadius:"50%",flexShrink:0,background:member.id==="self"?`${color}22`:"rgba(100,116,139,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:member.id==="self"?color:"#666" }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                          <span style={{ fontSize:14,fontWeight:600,color:"#1a1a2e" }}>{member.name}</span>
                          {member.id==="self" && <span style={{ fontSize:10,padding:"1px 6px",borderRadius:4,background:`${color}18`,color,fontWeight:700 }}>You</span>}
                          <MemberStatusBadge status={member.applicationStatus} />
                        </div>
                        <div style={{ fontSize:12,color:"#888",marginTop:2,display:"flex",gap:8,flexWrap:"wrap" }}>
                          <span>{member.relation}</span>
                          {member.age!=null&&<span>· Age {member.age}</span>}
                          {member.gender&&<span>· {member.gender}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!loadingMembers && selectableMembers.length===0 && (
                  <div style={{ textAlign:"center",padding:"2rem",color:"#888",fontSize:13 }}>
                    <div style={{ fontSize:28,marginBottom:8,opacity:0.4 }}>👥</div>
                    All members have already applied for this scholarship.
                  </div>
                )}
              </div>
            )}

            {step === 2 && currentMember && (
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                {selectedList.length > 1 && (
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    {selectedList.map((m, idx) => {
                      const memberChecked = criteriaStates[m.id] ?? new Set();
                      const done = allCriteriaLabels.length===0 || memberChecked.size===allCriteriaLabels.length;
                      return (
                        <button key={m.id} onClick={() => setViewingMemberIdx(idx)}
                          style={{ padding:"5px 12px",fontSize:12,borderRadius:100,border:`1px solid ${viewingMemberIdx===idx?color:"#ebebf0"}`,background:viewingMemberIdx===idx?`${color}12`:"#fff",color:viewingMemberIdx===idx?color:"#666",fontWeight:viewingMemberIdx===idx?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
                          {done&&<span style={{ color:"#0F6E56",fontSize:11 }}>✓</span>}
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ padding:"12px 16px",borderRadius:12,background:`${color}08`,border:`1px solid ${color}22`,display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color,flexShrink:0 }}>
                    {currentMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#1a1a2e" }}>{currentMember.name}</div>
                    <div style={{ fontSize:11,color:"#888" }}>{currentMember.relation}{currentMember.age!=null?` · Age ${currentMember.age}`:""}</div>
                  </div>
                  <div style={{ marginLeft:"auto",fontSize:11,color:"#888" }}>{currentChecked.size}/{allCriteriaLabels.length} confirmed</div>
                </div>
                <p style={{ fontSize:13,color:"#666",margin:0,lineHeight:1.6 }}>Confirm that <strong style={{ color:"#1a1a2e" }}>{currentMember.name}</strong> meets each eligibility criterion.</p>

                {allCriteriaLabels.length === 0 ? (
                  <div style={{ padding:"16px",textAlign:"center",color:"#888",fontSize:13,borderRadius:12,background:"#f8f8f8" }}>
                    <div style={{ fontSize:20,marginBottom:6,color:"#0F6E56" }}>✓</div>
                    No specific eligibility criteria for this scholarship.
                  </div>
                ) : (
                  <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                    {/* ── Standard eligibility criteria ── */}
                    {standardCriteria.length > 0 && (
                      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                        {standardCriteria.map((criterion, i) => {
                          const checked = currentChecked.has(criterion);
                          return (
                            <div key={i} className="criteria-row" onClick={() => toggleCriteria(currentMember.id, criterion)}
                              style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:`1px solid ${checked?"rgba(15,110,86,0.3)":"#ebebf0"}`,background:checked?"rgba(15,110,86,0.04)":"#fff",cursor:"pointer" }}>
                              <div style={{ width:20,height:20,borderRadius:6,flexShrink:0,border:checked?"none":"1.5px solid #ccc",background:checked?"#0F6E56":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",color:"#fff",fontSize:11 }}>
                                {checked?"✓":""}
                              </div>
                              <span style={{ fontSize:13,color:checked?"#1a1a2e":"#444",lineHeight:1.5,flex:1 }}>{criterion}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Custom criteria set by the sangha ── */}
                    {customCriteria.length > 0 && (
                      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                        {standardCriteria.length > 0 && (
                          <div style={{ fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em",margin:"4px 0 2px",paddingLeft:2 }}>
                            Additional requirements
                          </div>
                        )}
                        {customCriteria.map((cc, i) => {
                          const checked = currentChecked.has(cc.label);
                          return (
                            <div key={i} className="criteria-row" onClick={() => toggleCriteria(currentMember.id, cc.label)}
                              style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderRadius:10,border:`1px solid ${checked?"rgba(15,110,86,0.3)":"rgba(83,74,183,0.15)"}`,background:checked?"rgba(15,110,86,0.04)":"rgba(83,74,183,0.02)",cursor:"pointer" }}>
                              <div style={{ width:20,height:20,borderRadius:6,flexShrink:0,border:checked?"none":"1.5px solid rgba(83,74,183,0.3)",background:checked?"#0F6E56":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",color:"#fff",fontSize:11,marginTop:1 }}>
                                {checked?"✓":""}
                              </div>
                              <div style={{ flex:1,minWidth:0 }}>
                                <span style={{ fontSize:13,color:checked?"#1a1a2e":"#444",lineHeight:1.5,display:"block",fontWeight:500 }}>{cc.label}</span>
                                {cc.description && (
                                  <span style={{ fontSize:11,color:"#888",lineHeight:1.55,display:"block",marginTop:3 }}>{cc.description}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!allChecked && (
                  <div style={{ padding:"10px 14px",borderRadius:10,background:"rgba(220,100,0,0.06)",border:"1px solid rgba(220,100,0,0.2)",fontSize:12,color:"#c96000",display:"flex",alignItems:"center",gap:8 }}>
                    ⚠ If you do not satisfy all {allCriteriaLabels.length} eligibility criteria then this individual is not eligible for this scholarship.
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                <p style={{ fontSize:13,color:"#666",margin:0,lineHeight:1.6 }}>Review your applications before submitting.</p>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {selectedList.map(member => {
                    const memberCriteria = Array.from(criteriaStates[member.id] ?? []);
                    return (
                      <div key={member.id} style={{ padding:"14px 16px",borderRadius:14,border:"1px solid #ebebf0",background:"#fff" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:memberCriteria.length>0?10:0 }}>
                          <div style={{ width:32,height:32,borderRadius:"50%",background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color,flexShrink:0 }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13,fontWeight:700,color:"#1a1a2e" }}>{member.name}</div>
                            <div style={{ fontSize:11,color:"#888" }}>{member.relation}</div>
                          </div>
                          <div style={{ fontSize:11,color:"#0F6E56",fontWeight:600 }}>✓ {memberCriteria.length} criteria</div>
                        </div>
                        {memberCriteria.length>0 && (
                          <div style={{ display:"flex",flexWrap:"wrap",gap:5,paddingTop:8,borderTop:"1px solid #f0f0f0" }}>
                            {memberCriteria.map((c, i) => (
                              <span key={i} style={{ fontSize:10,padding:"2px 7px",borderRadius:5,background:"rgba(15,110,86,0.08)",color:"#0F6E56",border:"1px solid rgba(15,110,86,0.15)",fontWeight:500 }}>✓ {c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding:"10px 14px",borderRadius:10,background:"rgba(83,74,183,0.05)",border:"1px solid rgba(83,74,183,0.15)",fontSize:12,color:"#534AB7",lineHeight:1.6 }}>
                  ℹ Submitting confirms that {selectedList.length>1?"all selected members":selectedList[0]?.name} meet the stated eligibility criteria.
                </div>
              </div>
            )}
          </div>

          <div style={{ padding:"16px 24px",borderTop:"1px solid #ebebf0",background:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
            <button onClick={() => { if(step===1)onClose(); else if(step===2){setStep(1);setViewingMemberIdx(0);} else setStep(2); }}
              style={{ padding:"9px 18px",fontSize:13,fontWeight:600,border:"1px solid #e0e0e8",borderRadius:10,background:"none",cursor:"pointer",color:"#666",display:"flex",alignItems:"center",gap:6 }}>
              ← {step===1?"Cancel":"Back"}
            </button>
            <div style={{ display:"flex",gap:8 }}>
              {step===1 && (
                <button disabled={selectedIds.size===0} onClick={() => { setStep(2); setViewingMemberIdx(0); }}
                  style={{ padding:"9px 22px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:selectedIds.size>0?`linear-gradient(135deg,${color},${color}cc)`:"#e0e0e8",color:selectedIds.size>0?"#fff":"#aaa",cursor:selectedIds.size>0?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6,boxShadow:selectedIds.size>0?`0 3px 14px ${color}55`:"none" }}>
                  Next — Confirm eligibility →
                </button>
              )}
              {step===2 && (
                <button disabled={!allChecked} onClick={handleStep2Next}
                  style={{ padding:"9px 22px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:allChecked?`linear-gradient(135deg,${color},${color}cc)`:"#e0e0e8",color:allChecked?"#fff":"#aaa",cursor:allChecked?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:6,boxShadow:allChecked?`0 3px 14px ${color}55`:"none" }}>
                  {isLastMember?"Review application":`Next — ${selectedList[viewingMemberIdx+1]?.name??"Next"}`} →
                </button>
              )}
              {step===3 && (
                <button onClick={handleSubmit} disabled={submitting} className="apply-btn"
                  style={{ padding:"9px 24px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:submitting?"wait":"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 3px 14px rgba(83,74,183,0.4)" }}>
                  {submitting?"⏳ Submitting…":`✈ Submit ${selectedList.length>1?`${selectedList.length} applications`:"application"}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Scholarship Drawer (View Details) ───────────────────────────────────────

function ScholarshipDrawer({
  scholarship, onClose, onOpenApply,
}: {
  scholarship: Scholarship;
  onClose: () => void;
  onOpenApply: () => void;
}) {
  const days = daysUntil(scholarship.applicationEnd);
  const color = scholarship.categoryColor;

  const { applicationStatus, status, maxApprovals, currentApprovals, applications } = scholarship;
  const isFull = maxApprovals !== undefined && currentApprovals !== undefined && currentApprovals >= maxApprovals;

  const hasPartialApplications = applicationStatus === "not_applied" && applications && applications.length > 0;
  const allMembersApplied = applicationStatus !== "not_applied";

  const customCriteria = scholarship.customCriteria ?? [];

  const renderApplyButton = () => {
    if (status === "closed") return (
      <button disabled style={{ padding:"10px 22px",fontSize:13,fontWeight:600,border:"0.5px solid var(--color-border-tertiary)",borderRadius:10,background:"none",color:"var(--color-text-tertiary)",cursor:"not-allowed",display:"flex",alignItems:"center",gap:6 }}>
        🔒 Closed
      </button>
    );

    if (allMembersApplied) {
      if (applicationStatus === "applied") return (
        <button disabled style={{ padding:"10px 22px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(83,74,183,0.3)",borderRadius:10,background:"rgba(83,74,183,0.07)",color:"#534AB7",cursor:"not-allowed",display:"flex",alignItems:"center",gap:6 }}>
          ⏳ All applied
        </button>
      );
      if (applicationStatus === "approved") return (
        <button disabled style={{ padding:"10px 22px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(15,110,86,0.3)",borderRadius:10,background:"rgba(15,110,86,0.08)",color:"#0F6E56",cursor:"not-allowed",display:"flex",alignItems:"center",gap:6 }}>
          ✓ Approved
        </button>
      );
      if (applicationStatus === "rejected") return (
        <button disabled style={{ padding:"10px 22px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(192,57,43,0.25)",borderRadius:10,background:"rgba(192,57,43,0.06)",color:"#C0392B",cursor:"not-allowed",display:"flex",alignItems:"center",gap:6 }}>
          ✕ Not selected
        </button>
      );
    }

    if (isFull) return (
      <button disabled style={{ padding:"10px 22px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(192,57,43,0.25)",borderRadius:10,background:"rgba(192,57,43,0.06)",color:"#C0392B",cursor:"not-allowed",display:"flex",alignItems:"center",gap:6 }}>
        👥 Quota full
      </button>
    );

    if (hasPartialApplications) return (
      <button onClick={(e) => { e.stopPropagation(); onOpenApply(); }} className="apply-btn"
        style={{ padding:"10px 24px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 3px 14px rgba(83,74,183,0.4)" }}>
        ✈ Apply for more members
      </button>
    );

    return (
      <button onClick={(e) => { e.stopPropagation(); onOpenApply(); }} className="apply-btn"
        style={{ padding:"10px 24px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 3px 14px rgba(83,74,183,0.4)" }}>
        ✈ Apply now
      </button>
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(8,8,20,0.65)",zIndex:900,backdropFilter:"blur(6px)",animation:"overlayIn 0.22s ease" }} />
      <div style={{ position:"fixed",top:0,right:0,bottom:0,width:"min(540px, 100vw)",background:"#FFFFFF",zIndex:901,display:"flex",flexDirection:"column",boxShadow:"-20px 0 80px rgba(0,0,0,0.18), -1px 0 0 rgba(0,0,0,0.06)",animation:"drawerIn 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ padding:"0",background:`linear-gradient(160deg,${color}18,${color}06)`,borderBottom:`1px solid ${color}30`,flexShrink:0,position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:`${color}10`,pointerEvents:"none" }} />
          <div style={{ display:"flex",justifyContent:"flex-end",padding:"16px 20px 0" }}>
            <button onClick={onClose} style={{ width:34,height:34,border:"1.5px solid rgba(0,0,0,0.15)",borderRadius:10,background:"rgba(255,255,255,0.95)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#333",fontSize:16,fontWeight:700,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",flexShrink:0,lineHeight:1 }} title="Close">✕</button>
          </div>
          <div style={{ padding:"8px 28px 24px" }}>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
              <span style={{ padding:"4px 11px",borderRadius:100,fontSize:11,fontWeight:700,background:`${color}22`,color,border:`1px solid ${color}44` }}>{scholarship.category}</span>
              <StatusTag status={scholarship.status} end={scholarship.applicationEnd} />
              <AppStatusPill
                status={scholarship.applicationStatus}
                partialCount={hasPartialApplications ? applications.length : undefined}
              />
            </div>
            <h2 style={{ fontSize:22,fontWeight:700,color:"#1a1a2e",margin:"0 0 6px",lineHeight:1.25,fontFamily:"'Lora',serif",letterSpacing:"-0.02em" }}>{scholarship.name} scholarship</h2>
            {scholarship.sanghaName && (
              <div style={{ fontSize:12,color:"#666",marginBottom:16,display:"flex",alignItems:"center",gap:5 }}>
                🏛 Offered by the sangha : <strong style={{ color:"#CC5500",fontWeight:600 }}>{scholarship.sanghaName} </strong>
              </div>
            )}
            <div style={{ display:"flex",alignItems:"baseline",gap:8,marginTop:scholarship.sanghaName?0:12 }}>
              <span style={{ fontSize:40,fontWeight:800,fontFamily:"'Lora',serif",color,lineHeight:1,letterSpacing:"-0.02em" }}>₹{scholarship.baseAmount.toLocaleString("en-IN")}</span>
              <div>
                <div style={{ fontSize:12,color:"#888",fontWeight:500 }}>base award</div>
                {scholarship.tieredAmounts.length>0&&<div style={{ fontSize:11,color,fontWeight:600 }}>+{scholarship.tieredAmounts.length} tiers available</div>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex:1,overflowY:"auto",background:"#fafafa" }}>
          <div style={{ padding:"24px 28px",display:"flex",flexDirection:"column",gap:24 }}>
            <p style={{ fontSize:14,color:"#4a4a5a",lineHeight:1.75,margin:0 }}>{scholarship.description}</p>

            {scholarship.tieredAmounts.length>0 && (
              <div>
                <div className="drawer-section-label">Award tiers</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {scholarship.tieredAmounts.map((tier, i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:12,background:"#fff",border:"1px solid #ebebf0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#1a1a2e" }}>{tier.label}</div>
                        <div style={{ fontSize:11,color:"#888",marginTop:2 }}>{tier.condition}</div>
                      </div>
                      <div style={{ fontSize:17,fontWeight:700,fontFamily:"'Lora',serif",color }}>₹{tier.amount.toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Standard eligibility criteria ── */}
            {scholarship.eligibility.length>0 && (
              <div>
                <div className="drawer-section-label">Eligibility criteria</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {scholarship.eligibility.map((e, i) => (
                    <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,background:"#fff",border:"1px solid #ebebf0",fontSize:13,color:"#333",lineHeight:1.5 }}>
                      <div style={{ width:18,height:18,borderRadius:"50%",background:`${color}18`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,fontSize:9,color }}>✓</div>
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Custom criteria defined by the sangha ── */}
            {customCriteria.length > 0 && (
              <div>
                <div className="drawer-section-label" style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <span>Sangha requirements</span>
                  <span style={{ fontSize:9,fontWeight:700,color:"#fff",background:"#534AB7",padding:"1px 6px",borderRadius:4,letterSpacing:"0.04em",textTransform:"none" }}>
                    {customCriteria.length}
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {customCriteria.map((cc, i) => (
                    <div key={i} style={{ padding:"13px 16px",borderRadius:12,background:"#fff",border:"1px solid rgba(83,74,183,0.15)",boxShadow:"0 1px 3px rgba(83,74,183,0.05)" }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                        {/* Diamond-style icon to distinguish from standard ✓ criteria */}
                        <div style={{ width:18,height:18,borderRadius:5,background:"rgba(83,74,183,0.12)",border:"1px solid rgba(83,74,183,0.28)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,fontSize:9,color:"#534AB7",fontWeight:700 }}>
                          ✦
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:"#1a1a2e",lineHeight:1.4 }}>
                            {cc.label}
                          </div>
                          {cc.description && (
                            <div style={{ fontSize:12,color:"#666",lineHeight:1.6,marginTop:5,paddingTop:5,borderTop:"1px dashed #ebebf0" }}>
                              {cc.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Explanatory note */}
                <div style={{ marginTop:8,fontSize:11,color:"#999",display:"flex",alignItems:"center",gap:5,paddingLeft:2 }}>
                  <span style={{ color:"#534AB7",fontSize:10 }}>ℹ</span>
                  These requirements are specific to {scholarship.sanghaName || "this sangha"}.
                </div>
              </div>
            )}

            {scholarship.applications && scholarship.applications.length > 0 && (
              <div>
                <div className="drawer-section-label">Application status by member</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {scholarship.applications.map((app, i) => {
                    const statusCfg: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
                      applied:  { label:"Under Review", bg:"rgba(83,74,183,0.08)", color:"#534AB7", border:"rgba(83,74,183,0.2)",  icon:"⏳" },
                      approved: { label:"Approved",     bg:"rgba(15,110,86,0.08)", color:"#0F6E56", border:"rgba(15,110,86,0.2)",  icon:"✓" },
                      rejected: { label:"Rejected",     bg:"rgba(192,57,43,0.07)", color:"#C0392B", border:"rgba(192,57,43,0.2)", icon:"✕" },
                    };
                    const cfg = statusCfg[app.status];
                    return (
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"#fff",border:"1px solid #ebebf0" }}>
                        <div style={{ width:32,height:32,borderRadius:"50%",background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color,flexShrink:0 }}>
                          {(app.memberName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:"#1a1a2e" }}>{app.memberName}</div>
                          <div style={{ fontSize:11,color:"#888" }}>{app.relation}</div>
                        </div>
                        {cfg && (
                          <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:700,background:cfg.bg,color:cfg.color,border:`0.5px solid ${cfg.border}`,flexShrink:0 }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {scholarship.maxApprovals!==undefined&&scholarship.currentApprovals!==undefined && (
              <div style={{ padding:"16px 18px",borderRadius:14,background:"#fff",border:"1px solid #ebebf0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                <QuotaBar current={scholarship.currentApprovals} max={scholarship.maxApprovals} />
              </div>
            )}

            {(scholarship.applicationStart||scholarship.applicationEnd||scholarship.disbursementDate) && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {[
                  { label:"Opens",  value:formatDate(scholarship.applicationStart), icon:"📅", highlight:false },
                  { label:"Closes", value:formatDate(scholarship.applicationEnd),   icon:"📅", highlight:scholarship.status==="closing_soon" },
                ].filter(d => d.value !== "—").map(d => (
                  <div key={d.label} style={{ padding:"14px 16px",borderRadius:12,background:"#fff",border:`1px solid ${d.highlight?"rgba(220,100,0,0.35)":"#ebebf0"}`,boxShadow:d.highlight?"0 0 0 3px rgba(220,100,0,0.1)":"0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:10,color:d.highlight?"#c96000":"#999",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>{d.icon} {d.label}</div>
                    <div style={{ fontSize:14,fontWeight:700,color:d.highlight?"#c96000":"#1a1a2e" }}>{d.value}</div>
                    {d.highlight&&days>0&&<div style={{ fontSize:11,color:"#c96000",marginTop:3,fontWeight:600 }}>{days} days remaining</div>}
                  </div>
                ))}
                {scholarship.disbursementDate && (
                  <div style={{ gridColumn:"1 / -1",padding:"14px 16px",borderRadius:12,background:"rgba(139,69,19,0.04)",border:"1.5px solid rgba(139,69,19,0.35)",boxShadow:"0 0 0 3px rgba(139,69,19,0.07)" }}>
                    <div style={{ fontSize:10,color:"#7a3b10",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>💰 Disbursement date</div>
                    <div style={{ fontSize:14,fontWeight:700,color:"#7a3b10" }}>funds will be released on {formatDate(scholarship.disbursementDate)}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding:"12px 16px",borderRadius:12,background:scholarship.visibility==="primary_sangha_only"?"rgba(83,74,183,0.06)":"rgba(15,110,86,0.06)",border:`1px solid ${scholarship.visibility==="primary_sangha_only"?"rgba(83,74,183,0.18)":"rgba(15,110,86,0.18)"}`,fontSize:12,color:scholarship.visibility==="primary_sangha_only"?"#534AB7":"#0f6e56",display:"flex",alignItems:"flex-start",gap:8,lineHeight:1.6 }}>
              {scholarship.visibility==="primary_sangha_only"?"🔒":"🌐"}
              {scholarship.visibility==="primary_sangha_only"?`Exclusive to members of ${scholarship.sanghaName||"this sangha"}.`:"Open to all eligible users on the platform."}
            </div>
          </div>
        </div>

        <div style={{ padding:"16px 28px",borderTop:"1px solid #ebebf0",background:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
          <div style={{ fontSize:12,color:"#999",lineHeight:1.5,maxWidth:220 }}>
            {status!=="closed" && !allMembersApplied && !isFull && (
              hasPartialApplications
                ? "Some members have applied. You can apply for the remaining members."
                : "Select members & confirm eligibility to apply."
            )}
          </div>
          {renderApplyButton()}
        </div>
      </div>
    </>
  );
}

// ─── Persistent Filter Sidebar ────────────────────────────────────────────────

interface CategoryWithColor {
  name: string;
  color: string;
}

function PersistentFilterSidebar({
  categoriesWithColor,
  allEligibilityLabels,
  selectedCategories,
  selectedEligibilities,
  statusFilter,
  onToggleCategory,
  onToggleEligibility,
  onSetStatus,
  onClearAll,
}: {
  categoriesWithColor: CategoryWithColor[];
  allEligibilityLabels: string[];
  selectedCategories: Set<string>;
  selectedEligibilities: Set<string>;
  statusFilter: string;
  onToggleCategory: (cat: string) => void;
  onToggleEligibility: (e: string) => void;
  onSetStatus: (s: string) => void;
  onClearAll: () => void;
}) {
  const totalActive = selectedCategories.size + selectedEligibilities.size + (statusFilter !== "All" ? 1 : 0);

  return (
    <aside className="filter-sidebar-persistent">
      {/* Header */}
      <div style={{ padding:"20px 18px 14px", borderBottom:"1px solid #f0f0f5", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:14, color:"#534AB7" }}>▼</span>
            <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>Filters</span>
            {totalActive > 0 && (
              <span style={{ fontSize:10, color:"#fff", fontWeight:700, background:"#534AB7", padding:"1px 7px", borderRadius:100 }}>
                {totalActive}
              </span>
            )}
          </div>
          {totalActive > 0 && (
            <button onClick={onClearAll} style={{ fontSize:11, color:"#C0392B", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:"3px 6px", borderRadius:6 }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 0 24px" }}>

        {/* Status section */}
        <div style={{ marginBottom:4 }}>
          <div style={{ padding:"0 18px 8px", fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.12em" }}>
            Status
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f;
              return (
                <button
                  key={f}
                  className="filter-panel-chip"
                  onClick={() => onSetStatus(f)}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"8px 18px", border:"none",
                    background:active ? "rgba(83,74,183,0.06)" : "transparent",
                    cursor:"pointer", textAlign:"left", width:"100%",
                    borderLeft:active ? "3px solid #534AB7" : "3px solid transparent",
                  }}
                >
                  <span style={{
                    width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background:active ? "#534AB7" : "#d0d0d8",
                    transition:"background 0.13s",
                  }} />
                  <span style={{ fontSize:13, fontWeight:active?600:400, color:active?"#1a1a2e":"#555", flex:1 }}>
                    {f}
                  </span>
                  {active && <span style={{ color:"#534AB7", fontSize:11, fontWeight:700 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories section */}
        {categoriesWithColor.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ padding:"0 18px 8px", fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.12em", display:"flex", alignItems:"center", gap:5 }}>
              Categories
              {selectedCategories.size > 0 && (
                <span style={{ color:"#534AB7", fontWeight:700 }}>({selectedCategories.size})</span>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {categoriesWithColor.map(({ name: cat, color }) => {
                const active = selectedCategories.has(cat);
                return (
                  <button
                    key={cat}
                    className="filter-panel-chip"
                    onClick={() => onToggleCategory(cat)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"8px 18px", border:"none",
                      background:active ? "rgba(83,74,183,0.06)" : "transparent",
                      cursor:"pointer", textAlign:"left", width:"100%",
                      borderLeft:active ? "3px solid #534AB7" : "3px solid transparent",
                    }}
                  >
                    <span style={{
                      width:9, height:9, borderRadius:"50%",
                      background:color, flexShrink:0,
                      boxShadow:active ? `0 0 0 3px ${color}30` : "none",
                      transition:"box-shadow 0.15s",
                    }} />
                    <span style={{ fontSize:13, fontWeight:active?600:400, color:active?"#1a1a2e":"#555", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {cat}
                    </span>
                    {active && <span style={{ color:"#534AB7", fontSize:11, fontWeight:700 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Eligibility section */}
        {allEligibilityLabels.length > 0 && (
          <div style={{ marginTop:16, borderTop:"1px solid #f0f0f5", paddingTop:16 }}>
            <div style={{ padding:"0 18px 8px", fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.12em", display:"flex", alignItems:"center", gap:5 }}>
              Eligibility
              {selectedEligibilities.size > 0 && (
                <span style={{ color:"#534AB7", fontWeight:700 }}>({selectedEligibilities.size})</span>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {allEligibilityLabels.map(e => {
                const active = selectedEligibilities.has(e);
                return (
                  <button
                    key={e}
                    className="filter-panel-chip"
                    onClick={() => onToggleEligibility(e)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"8px 18px", border:"none",
                      background:active ? "rgba(83,74,183,0.06)" : "transparent",
                      cursor:"pointer", textAlign:"left", width:"100%",
                      borderLeft:active ? "3px solid #534AB7" : "3px solid transparent",
                    }}
                  >
                    <span style={{
                      width:14, height:14, borderRadius:4, flexShrink:0,
                      border:active ? "none" : "1.5px solid #ccc",
                      background:active ? "#534AB7" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:"#fff", fontSize:8, fontWeight:700,
                      transition:"all 0.13s",
                    }}>
                      {active ? "✓" : ""}
                    </span>
                    <span style={{ fontSize:12, fontWeight:active?600:400, color:active?"#1a1a2e":"#555", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {e}
                    </span>
                    {active && <span style={{ color:"#534AB7", fontSize:11, fontWeight:700, flexShrink:0 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Mobile overlay filter panel ─────────────────────────────────────────────

function MobileFilterPanel({
  categoriesWithColor,
  allEligibilityLabels,
  selectedCategories,
  selectedEligibilities,
  statusFilter,
  onToggleCategory,
  onToggleEligibility,
  onSetStatus,
  onClearAll,
  onClose,
}: {
  categoriesWithColor: CategoryWithColor[];
  allEligibilityLabels: string[];
  selectedCategories: Set<string>;
  selectedEligibilities: Set<string>;
  statusFilter: string;
  onToggleCategory: (cat: string) => void;
  onToggleEligibility: (e: string) => void;
  onSetStatus: (s: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const totalActive = selectedCategories.size + selectedEligibilities.size + (statusFilter !== "All" ? 1 : 0);

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(8,8,20,0.4)",zIndex:800,backdropFilter:"blur(4px)",animation:"overlayIn 0.2s ease" }} />
      <div style={{ position:"fixed",top:0,left:0,bottom:0,width:"min(300px,90vw)",background:"#fff",zIndex:801,display:"flex",flexDirection:"column",boxShadow:"20px 0 80px rgba(0,0,0,0.14)",animation:"filterPanelIn 0.28s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ padding:"18px 20px 14px",borderBottom:"1px solid #ebebf0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:15 }}>▼</span>
            <h3 style={{ margin:0,fontSize:15,fontWeight:700,color:"#1a1a2e" }}>Filters</h3>
            {totalActive > 0 && (
              <span style={{ fontSize:11,color:"#534AB7",fontWeight:700,background:"rgba(83,74,183,0.1)",padding:"1px 8px",borderRadius:100,border:"0.5px solid rgba(83,74,183,0.2)" }}>
                {totalActive}
              </span>
            )}
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {totalActive > 0 && (
              <button onClick={onClearAll} style={{ fontSize:12,color:"#C0392B",background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:"4px 8px",borderRadius:6 }}>
                Clear all
              </button>
            )}
            <button onClick={onClose} style={{ width:30,height:30,border:"1.5px solid #e0e0e8",borderRadius:8,background:"#fafafa",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#444",fontSize:15,fontWeight:700 }}>✕</button>
          </div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 0" }}>
          {/* Status */}
          <div style={{ marginBottom:8 }}>
            <div style={{ padding:"0 20px 8px",fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:"0.1em" }}>Status</div>
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f;
              return (
                <button key={f} className="filter-panel-chip" onClick={() => onSetStatus(f)}
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 20px",border:"none",background:active?"rgba(83,74,183,0.06)":"transparent",cursor:"pointer",textAlign:"left",width:"100%",borderLeft:active?"3px solid #534AB7":"3px solid transparent" }}>
                  <span style={{ width:7,height:7,borderRadius:"50%",flexShrink:0,background:active?"#534AB7":"#d0d0d8" }} />
                  <span style={{ fontSize:13,fontWeight:active?600:400,color:active?"#1a1a2e":"#444",flex:1 }}>{f}</span>
                  {active && <span style={{ color:"#534AB7",fontSize:12,fontWeight:700 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Categories */}
          <div style={{ borderTop:"1px solid #f0f0f5",paddingTop:12,marginTop:4 }}>
            <div style={{ padding:"0 20px 8px",fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6 }}>
              Categories {selectedCategories.size > 0 && <span style={{ color:"#534AB7",fontWeight:700 }}>({selectedCategories.size})</span>}
            </div>
            {categoriesWithColor.map(({ name: cat, color }) => {
              const active = selectedCategories.has(cat);
              return (
                <button key={cat} className="filter-panel-chip" onClick={() => onToggleCategory(cat)}
                  style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 20px",border:"none",background:active?"rgba(83,74,183,0.06)":"transparent",cursor:"pointer",textAlign:"left",width:"100%",borderLeft:active?"3px solid #534AB7":"3px solid transparent" }}>
                  <span style={{ width:9,height:9,borderRadius:"50%",background:color,flexShrink:0,boxShadow:active?`0 0 0 3px ${color}30`:"none" }} />
                  <span style={{ fontSize:13,fontWeight:active?600:400,color:active?"#1a1a2e":"#444",flex:1 }}>{cat}</span>
                  {active && <span style={{ color:"#534AB7",fontSize:12,fontWeight:700 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Eligibility */}
          {allEligibilityLabels.length > 0 && (
            <div style={{ borderTop:"1px solid #f0f0f5",paddingTop:12,marginTop:4 }}>
              <div style={{ padding:"0 20px 8px",fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6 }}>
                Eligibility {selectedEligibilities.size > 0 && <span style={{ color:"#534AB7",fontWeight:700 }}>({selectedEligibilities.size})</span>}
              </div>
              {allEligibilityLabels.map(e => {
                const active = selectedEligibilities.has(e);
                return (
                  <button key={e} className="filter-panel-chip" onClick={() => onToggleEligibility(e)}
                    style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 20px",border:"none",background:active?"rgba(83,74,183,0.06)":"transparent",cursor:"pointer",textAlign:"left",width:"100%",borderLeft:active?"3px solid #534AB7":"3px solid transparent" }}>
                    <span style={{ width:14,height:14,borderRadius:4,flexShrink:0,border:active?"none":"1.5px solid #ccc",background:active?"#534AB7":"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:8,fontWeight:700 }}>{active?"✓":""}</span>
                    <span style={{ fontSize:12,fontWeight:active?600:400,color:active?"#1a1a2e":"#444",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e}</span>
                    {active && <span style={{ color:"#534AB7",fontSize:12,fontWeight:700,flexShrink:0 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding:"14px 20px",borderTop:"1px solid #ebebf0",background:"#fafafa",flexShrink:0 }}>
          <button onClick={onClose} style={{ width:"100%",padding:"11px",fontSize:13,fontWeight:600,border:"none",borderRadius:10,background:"linear-gradient(135deg,#534AB7,#7B72D9)",color:"#fff",cursor:"pointer",boxShadow:"0 3px 14px rgba(83,74,183,0.35)" }}>
            Apply filters{totalActive>0?` (${totalActive})`:""} →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const shimmer = { background:"linear-gradient(90deg,var(--color-background-secondary) 25%,var(--color-border-tertiary) 50%,var(--color-background-secondary) 75%)",backgroundSize:"400px 100%",animation:"shimmer 1.4s infinite" };
  return (
    <div style={{ background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:18,padding:"22px",display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",gap:8 }}><div style={{ width:72,height:20,borderRadius:6,...shimmer }} /><div style={{ width:50,height:20,borderRadius:6,...shimmer }} /></div>
      <div style={{ height:22,borderRadius:6,...shimmer }} />
      <div style={{ height:22,width:"70%",borderRadius:6,...shimmer }} />
      <div style={{ height:14,borderRadius:6,...shimmer }} />
      <div style={{ height:14,width:"80%",borderRadius:6,...shimmer }} />
      <div style={{ display:"flex",gap:8,marginTop:4 }}><div style={{ width:90,height:34,borderRadius:10,...shimmer }} /><div style={{ width:70,height:34,borderRadius:10,...shimmer }} /></div>
    </div>
  );
}

// ─── Scholarship Card ─────────────────────────────────────────────────────────

function ScholarshipCard({ scholarship, index, onSelect }: {
  scholarship: Scholarship;
  index: number;
  onSelect: () => void;
}) {
  const color = scholarship.categoryColor;
  const hasPartialApplications = scholarship.applicationStatus === "not_applied" && scholarship.applications && scholarship.applications.length > 0;

  // Combine standard eligibility and custom criteria labels for the card tag display
  const allEligibilityTags = useMemo(() => [
    ...scholarship.eligibility,
    ...(scholarship.customCriteria ?? []).map(cc => cc.label),
  ], [scholarship.eligibility, scholarship.customCriteria]);

  return (
    <div className="schol-card" onClick={onSelect}
      style={{ background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:18,padding:"22px",display:"flex",flexDirection:"column",gap:0,animationDelay:`${index*0.07}s`,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}66)`,borderRadius:"18px 18px 0 0" }} />
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:12 }}>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,flex:1 }}>
          <span style={{ padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:700,background:`${color}18`,color,border:`0.5px solid ${color}40` }}>{scholarship.category}</span>
          <StatusTag status={scholarship.status} end={scholarship.applicationEnd} />
          <AppStatusPill
            status={scholarship.applicationStatus}
            partialCount={hasPartialApplications ? scholarship.applications.length : undefined}
          />
        </div>
        {scholarship.visibility==="primary_sangha_only" && (
          <span style={{ padding:"3px 9px",borderRadius:100,fontSize:10,fontWeight:700,background:"rgba(83,74,183,0.1)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.3)",flexShrink:0 }}>
            Exclusive for {scholarship.sanghaName} users
          </span>
        )}
      </div>

      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:10 }}>
        <div style={{ flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:2 }}>
          {scholarship.sanghaName && (
            <h5 style={{ fontSize:13,fontWeight:500,color:"#CC5500",margin:0,lineHeight:1.3,fontFamily:"'Lora',serif" }}>
              {scholarship.sanghaName}
            </h5>
          )}
          <h3 style={{ fontSize:16,fontWeight:600,color:"#1a1a2e",margin:0,lineHeight:1.35,fontFamily:"'Lora',serif" }}>
            {scholarship.name} Scholarship
          </h3>
        </div>
        <div style={{ textAlign:"right",flexShrink:0 }}>
          <div style={{ fontSize:20,fontWeight:700,fontFamily:"'Lora',serif",color,lineHeight:1 }}>
            ₹{scholarship.baseAmount.toLocaleString("en-IN")}
          </div>
          {scholarship.tieredAmounts.length>0 && (
            <div style={{ fontSize:10,color:"var(--color-text-tertiary)",marginTop:2 }}>
              +{scholarship.tieredAmounts.length} tiers
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 14px",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{scholarship.description}</p>

      {/* Eligibility tags: standard + custom criteria labels combined */}
      <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:14 }}>
        {allEligibilityTags.slice(0,4).map((e, i) => {
          const isCustom = i >= scholarship.eligibility.length;
          return (
            <span key={i} style={{ fontSize:11,padding:"3px 8px",borderRadius:6,background:isCustom?"rgba(83,74,183,0.06)":"var(--color-background-secondary)",color:isCustom?"#534AB7":"var(--color-text-secondary)",border:isCustom?"0.5px solid rgba(83,74,183,0.2)":"0.5px solid var(--color-border-tertiary)",display:"inline-flex",alignItems:"center",gap:3 }}>
              <span style={{ fontSize:9,color:isCustom?"#534AB7":color }}>{isCustom?"✦":"✓"}</span>{e}
            </span>
          );
        })}
        {allEligibilityTags.length>4&&<span style={{ fontSize:11,padding:"3px 8px",borderRadius:6,background:"var(--color-background-secondary)",color:"var(--color-text-tertiary)",border:"0.5px solid var(--color-border-tertiary)" }}>+{allEligibilityTags.length-4} more</span>}
      </div>

      {scholarship.maxApprovals!==undefined&&scholarship.currentApprovals!==undefined && (
        <div style={{ marginBottom:14 }}><QuotaBar current={scholarship.currentApprovals} max={scholarship.maxApprovals} /></div>
      )}
      {scholarship.applicationEnd && (
        <div style={{ fontSize:11,color:scholarship.status==="closing_soon"?"#c96000":"var(--color-text-tertiary)",marginBottom:14,display:"flex",alignItems:"center",gap:4 }}>
          📅 {scholarship.status==="closed"?"Closed on":"Apply by"} {formatDate(scholarship.applicationEnd)}
        </div>
      )}
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <button onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{ padding:"9px 18px",fontSize:13,fontWeight:600,border:"0.5px solid #534AB7",borderRadius:10,background:"rgba(83,74,183,0.06)",color:"#534AB7",cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
          {hasPartialApplications ? "Apply for more →" : "View details →"}
        </button>
      </div>
    </div>
  );
}

// ─── Types for MyApplicationsTabs ────────────────────────────────────────────

interface ApplicationRow {
  key: string;
  scholarship: Scholarship;
  memberId: string;
  memberName: string;
  relation: string;
  memberStatus: "applied" | "approved" | "rejected";
}

type AppTab = "approved" | "under_review" | "rejected";

// ─── My Applications Tabs ─────────────────────────────────────────────────────

function MyApplicationsTabs({
  scholarships,
  onSelect,
  search,
  statusFilter,
  selectedCategories,
  selectedEligibilities,
}: {
  scholarships: Scholarship[];
  onSelect: (s: Scholarship) => void;
  search: string;
  statusFilter: string;
  selectedCategories: Set<string>;
  selectedEligibilities: Set<string>;
}) {
  const [activeTab, setActiveTab] = useState<AppTab>("approved");

  const filteredScholarships = useMemo(() => {
    return scholarships.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Open" && s.status === "open") ||
        (statusFilter === "Closing Soon" && s.status === "closing_soon") ||
        (statusFilter === "Closed" && s.status === "closed");
      const matchCat = selectedCategories.size === 0 || selectedCategories.has(s.category);
      const matchElig = selectedEligibilities.size === 0 || s.eligibility.some(e => selectedEligibilities.has(e));
      return matchSearch && matchStatus && matchCat && matchElig;
    });
  }, [scholarships, search, statusFilter, selectedCategories, selectedEligibilities]);

  const { approved, underReview, rejected } = useMemo(() => {
    const approved: ApplicationRow[] = [];
    const underReview: ApplicationRow[] = [];
    const rejected: ApplicationRow[] = [];

    for (const s of filteredScholarships) {
      if (!s.applications || s.applications.length === 0) continue;
      for (const app of s.applications) {
        const row: ApplicationRow = {
          key: `${s.id}::${app.memberId}`,
          scholarship: s,
          memberId: app.memberId,
          memberName: app.memberName,
          relation: app.relation,
          memberStatus: app.status,
        };
        if (app.status === "approved") approved.push(row);
        else if (app.status === "rejected") rejected.push(row);
        else underReview.push(row);
      }
    }

    return { approved, underReview, rejected };
  }, [filteredScholarships]);

  const tabs: { key: AppTab; label: string; count: number }[] = [
    { key:"approved",     label:"Approved",     count:approved.length },
    { key:"under_review", label:"Under Review", count:underReview.length },
    { key:"rejected",     label:"Rejected",     count:rejected.length },
  ];

  const lists: Record<AppTab, ApplicationRow[]> = {
    approved,
    under_review: underReview,
    rejected,
  };

  const currentList = lists[activeTab];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex",borderBottom:"2px solid #ebebf0",marginBottom:20,gap:0 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding:"10px 20px",fontSize:14,fontWeight:isActive?700:500,color:isActive?"#534AB7":"#888",background:"none",border:"none",borderBottom:isActive?"2.5px solid #534AB7":"2.5px solid transparent",marginBottom:"-2px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s ease",whiteSpace:"nowrap" }}>
              {tab.label}
              <span style={{ minWidth:22,height:22,borderRadius:100,padding:"0 6px",fontSize:12,fontWeight:700,background:isActive?"#534AB7":"#e8e8f0",color:isActive?"#fff":"#888",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s ease" }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:10,animation:"fadeIn 0.2s ease" }} key={activeTab}>
        {currentList.length === 0 ? (
          <div style={{ textAlign:"center",padding:"3rem 1rem",color:"#aaa",fontSize:13 }}>
            <div style={{ fontSize:32,marginBottom:10,opacity:0.4 }}>
              {activeTab==="approved"?"✓":activeTab==="rejected"?"✕":"⏳"}
            </div>
            {(search || statusFilter !== "All" || selectedCategories.size > 0 || selectedEligibilities.size > 0)
              ? "No applications match your current filters."
              : `No ${tabs.find(t=>t.key===activeTab)?.label.toLowerCase()} applications yet.`
            }
          </div>
        ) : (
          currentList.map(row => (
            <MyAppCard
              key={row.key}
              scholarship={row.scholarship}
              memberName={row.memberName}
              relation={row.relation}
              memberStatus={row.memberStatus}
              onSelect={() => onSelect(row.scholarship)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── My Applications Card ─────────────────────────────────────────────────────

function MyAppCard({
  scholarship,
  memberName,
  relation,
  memberStatus,
  onSelect,
}: {
  scholarship: Scholarship;
  memberName: string;
  relation: string;
  memberStatus: "applied" | "approved" | "rejected";
  onSelect: () => void;
}) {
  const color = scholarship.categoryColor;
  const statusCfg: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
    applied:  { label:"Under Review", bg:"rgba(83,74,183,0.08)", color:"#534AB7", border:"rgba(83,74,183,0.2)",  icon:"⏳" },
    approved: { label:"Approved",     bg:"rgba(15,110,86,0.08)", color:"#0F6E56", border:"rgba(15,110,86,0.2)",  icon:"✓" },
    rejected: { label:"Rejected",     bg:"rgba(192,57,43,0.07)", color:"#C0392B", border:"rgba(192,57,43,0.2)", icon:"✕" },
  };
  const cfg = statusCfg[memberStatus];
  if (!cfg) return null;

  const highestTier = scholarship.tieredAmounts.length > 0
    ? scholarship.tieredAmounts.reduce((max, t) => t.amount > max.amount ? t : max, scholarship.tieredAmounts[0])
    : null;

  return (
    <div className="schol-card" onClick={onSelect}
      style={{ background:"#fff", border:`1.5px solid ${cfg.border}`, borderRadius:18, padding:"0", display:"flex", gap:0, alignItems:"stretch", animationDelay:"0s", cursor:"pointer", overflow:"hidden", boxShadow:`0 2px 12px ${cfg.border}55` }}>

      <div style={{ width:5, flexShrink:0, background:`linear-gradient(180deg,${color},${color}55)` }} />

      <div style={{ flex:1, minWidth:0, padding:"16px 14px 16px 18px", display:"flex", gap:14, alignItems:"stretch" }}>

        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:0 }}>

          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:9 }}>
            <span style={{ padding:"2px 9px", borderRadius:100, fontSize:10, fontWeight:700, background:`${color}18`, color, border:`0.5px solid ${color}40`, letterSpacing:"0.01em" }}>
              {scholarship.category}
            </span>
            <span style={{ padding:"2px 9px", borderRadius:100, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color, border:`0.5px solid ${cfg.border}`, display:"inline-flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:9 }}>{cfg.icon}</span>{cfg.label}
            </span>
          </div>

          {scholarship.sanghaName && (
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
              <span style={{ fontSize:10, color:"#aaa", letterSpacing:"0.04em", fontWeight:600, textTransform:"uppercase" }}>🏛</span>
              <span style={{ fontSize:15, color:"#CC5500", fontWeight:500, letterSpacing:"0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {scholarship.sanghaName}
              </span>
            </div>
          )}

          <div style={{ fontSize:14, fontWeight:700, color:"#1a1a2e", fontFamily:"'Lora',serif", lineHeight:1.35, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {scholarship.name} scholarship
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:"auto", paddingTop:4, borderTop:"1px dashed #f0f0f4" }}>
            <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${color}33,${color}11)`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color }}>
              {memberName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#333" }}>{memberName}</span>
              <span style={{ fontSize:11, color:"#bbb", marginLeft:5, fontWeight:400 }}>{relation}</span>
            </div>
          </div>
        </div>

        <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"space-between", paddingLeft:12, borderLeft:"1px solid #f0f0f4", minWidth:80 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#bbb", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Award</div>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Lora',serif", color, lineHeight:1, letterSpacing:"-0.01em" }}>
              ₹{scholarship.baseAmount.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize:10, color:"#aaa", fontWeight:500, marginTop:2 }}>base</div>
          </div>

          {highestTier && (
            <div style={{ textAlign:"right", marginTop:10, padding:"5px 8px", borderRadius:8, background:`${color}0c`, border:`1px solid ${color}25` }}>
              <div style={{ fontSize:9, color, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>
                {highestTier.label || "Top tier"}
              </div>
              <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Lora',serif", color, letterSpacing:"-0.01em" }}>
                ₹{highestTier.amount.toLocaleString("en-IN")}
              </div>
            </div>
          )}

          {!highestTier && (
            <div style={{ fontSize:18, color:"#e0e0e8", marginTop:"auto" }}>›</div>
          )}
          {highestTier && (
            <div style={{ fontSize:16, color:"#e0e0e8", marginTop:8 }}>›</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: string; type: "success"|"error"|"info"; message: string; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position:"fixed",bottom:24,right:24,display:"flex",flexDirection:"column",gap:10,zIndex:9999,pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents:"auto",borderRadius:14,fontSize:13,fontWeight:500,color:"#fff",background:t.type==="success"?"linear-gradient(135deg,#0F6E56,#1a9e7d)":t.type==="error"?"linear-gradient(135deg,#C0392B,#e05a4b)":"linear-gradient(135deg,#534AB7,#7B72D9)",boxShadow:"0 8px 32px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:10,padding:"12px 16px",maxWidth:340,animation:"toastIn 0.25s cubic-bezier(0.16,1,0.3,1) both" }}>
          <span style={{ fontSize:16 }}>{t.type==="success"?"✓":t.type==="error"?"✕":"ℹ"}</span>
          <span style={{ flex:1,lineHeight:1.4 }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",padding:0,flexShrink:0,fontSize:14 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4200);
  }, []);
  const dismiss = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, push, dismiss };
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ query, isMyApps }: { query: string; isMyApps: boolean }) {
  return (
    <div style={{ gridColumn:"1 / -1",padding:"5rem 2rem",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12,animation:"fadeIn 0.3s ease" }}>
      <div style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,rgba(83,74,183,0.1),rgba(83,74,183,0.04))",display:"flex",alignItems:"center",justifyContent:"center",border:"0.5px solid rgba(83,74,183,0.15)",marginBottom:4,fontSize:30 }}>
        {isMyApps?"📄":"🔍"}
      </div>
      <p style={{ fontSize:16,fontWeight:600,color:"var(--color-text-secondary)",margin:0,fontFamily:"'Lora',serif" }}>
        {isMyApps?"No applications yet":query?`No results for "${query}"`:"No scholarships found"}
      </p>
      <p style={{ fontSize:13,color:"var(--color-text-tertiary)",margin:0 }}>
        {isMyApps?"Apply to a scholarship and it will appear here.":"Try adjusting your filters or search term."}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserScholarshipPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [myApplications, setMyApplications] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedEligibilities, setSelectedEligibilities] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Scholarship | null>(null);
  const [applyTarget, setApplyTarget] = useState<Scholarship | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toasts, push: pushToast, dismiss } = useToasts();

  const fetchScholarships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Scholarship[]>("/userschl/scholarships");
      setScholarships(data);
    } catch (err) {
      setError((err as Error).message || "Failed to load scholarships");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScholarships(); }, [fetchScholarships]);

  const handleOpenApply = useCallback((scholarship: Scholarship) => {
    setApplyTarget(scholarship);
  }, []);

  const handleSubmitApplications = useCallback(async (
    applications: { memberId: string; checkedCriteria: string[] }[]
  ) => {
    if (!applyTarget) return;
    setSubmitting(true);
    try {
      const result = await apiFetch<{
        applications: { memberId: string; status: string }[];
        errors: { memberId: string; error: string }[];
      }>(`/userschl/scholarships/${applyTarget.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ applications }),
      });

      const successCount = result.applications?.length ?? 0;
      const errorCount   = result.errors?.length ?? 0;

      if (successCount > 0) {
        setScholarships(prev =>
          prev.map(s => {
            if (s.id !== applyTarget.id) return s;
            const newApps: MemberApplication[] = (result.applications ?? []).map(r => ({
              memberId:   r.memberId,
              memberName: r.memberId === "self" ? "You" : r.memberId,
              relation:   r.memberId === "self" ? "Self" : "Member",
              status:     "applied" as const,
            }));
            const mergedApplications = [...(s.applications ?? []), ...newApps];
            return { ...s, applications: mergedApplications };
          })
        );

        if (selected?.id === applyTarget.id) {
          setSelected(prev => {
            if (!prev) return null;
            const newApps: MemberApplication[] = (result.applications ?? []).map(r => ({
              memberId:   r.memberId,
              memberName: r.memberId === "self" ? "You" : r.memberId,
              relation:   r.memberId === "self" ? "Self" : "Member",
              status:     "applied" as const,
            }));
            return { ...prev, applications: [...(prev.applications ?? []), ...newApps] };
          });
        }

        pushToast("success", successCount > 1
          ? `${successCount} applications submitted! The sangha will review them.`
          : "Application submitted! The sangha will review your details.");
        if (errorCount > 0) pushToast("info", `${errorCount} member(s) already had existing applications and were skipped.`);

        fetchScholarships();
      } else {
        pushToast("error", result.errors?.[0]?.error ?? "No new applications were submitted.");
      }

      setApplyTarget(null);
    } catch (err) {
      pushToast("error", (err as Error).message || "Failed to submit applications");
    } finally {
      setSubmitting(false);
    }
  }, [applyTarget, selected, pushToast, fetchScholarships]);

  // ── Derived filter data ────────────────────────────────────────────────────

  const categoriesWithColor = useMemo((): CategoryWithColor[] => {
    const map = new Map<string, string>();
    scholarships.forEach(s => {
      if (s.category && !map.has(s.category)) {
        map.set(s.category, s.categoryColor || "#534AB7");
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, color]) => ({ name, color }));
  }, [scholarships]);

  const allEligibilityLabels = useMemo(() => {
    const set = new Set<string>();
    scholarships.forEach(s => s.eligibility.forEach(e => set.add(e)));
    return Array.from(set).sort();
  }, [scholarships]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev => { const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; });
  }, []);

  const toggleEligibility = useCallback((e: string) => {
    setSelectedEligibilities(prev => { const n = new Set(prev); if (n.has(e)) n.delete(e); else n.add(e); return n; });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories(new Set());
    setSelectedEligibilities(new Set());
    setStatusFilter("All");
  }, []);

  const totalSidebarFilters = selectedCategories.size + selectedEligibilities.size + (statusFilter !== "All" ? 1 : 0);

  // ── Main filtered list ─────────────────────────────────────────────────────
  const availableScholarships = useMemo(() =>
    scholarships.filter(s => s.applicationStatus === "not_applied"),
    [scholarships]
  );

  const filtered = useMemo(() => {
    return availableScholarships.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      const matchStatus = statusFilter==="All"
        ||(statusFilter==="Open"&&s.status==="open")
        ||(statusFilter==="Closing Soon"&&s.status==="closing_soon")
        ||(statusFilter==="Closed"&&s.status==="closed");
      const matchCat = selectedCategories.size===0 || selectedCategories.has(s.category);
      const matchElig = selectedEligibilities.size===0 || s.eligibility.some(e => selectedEligibilities.has(e));
      return matchSearch && matchStatus && matchCat && matchElig;
    });
  }, [availableScholarships, search, statusFilter, selectedCategories, selectedEligibilities]);

  // ── My Applications pool ───────────────────────────────────────────────────
  const myAppliedScholarships = useMemo(() =>
    scholarships.filter(s => s.applications && s.applications.length > 0),
    [scholarships]
  );

  const myAppliedCount = useMemo(() =>
    myAppliedScholarships.reduce((sum, s) => sum + (s.applications?.length ?? 0), 0),
    [myAppliedScholarships]
  );

  const approvedCount  = useMemo(() => myAppliedScholarships.reduce((sum, s) => sum + (s.applications?.filter(a => a.status === "approved").length ?? 0), 0), [myAppliedScholarships]);
  const reviewCount    = useMemo(() => myAppliedScholarships.reduce((sum, s) => sum + (s.applications?.filter(a => a.status === "applied").length ?? 0), 0), [myAppliedScholarships]);
  const rejectedCount  = useMemo(() => myAppliedScholarships.reduce((sum, s) => sum + (s.applications?.filter(a => a.status === "rejected").length ?? 0), 0), [myAppliedScholarships]);

  const hasActiveFilters = search || totalSidebarFilters > 0;

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* Full-width page wrapper — sidebar + content side by side */}
      <div className="page-layout" style={{ minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>

        {/* ── Persistent filter sidebar (desktop only) ──────────────────── */}
        <PersistentFilterSidebar
          categoriesWithColor={categoriesWithColor}
          allEligibilityLabels={allEligibilityLabels}
          selectedCategories={selectedCategories}
          selectedEligibilities={selectedEligibilities}
          statusFilter={statusFilter}
          onToggleCategory={toggleCategory}
          onToggleEligibility={toggleEligibility}
          onSetStatus={setStatusFilter}
          onClearAll={clearAllFilters}
        />

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="main-content">

          {/* Hero */}
          <div style={{ marginBottom:"1.75rem",animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#2D2870,#534AB7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(83,74,183,0.35)",fontSize:20 }}>
                  🏆
                </div>
                <div>
                  <h1 style={{ fontSize:24,fontWeight:600,color:"var(--color-text-primary)",margin:0,fontFamily:"'Lora',serif",letterSpacing:"-0.02em" }}>
                    {myApplications ? "My Applications" : "Scholarships"}
                  </h1>
                  <p style={{ fontSize:13,color:"var(--color-text-secondary)",margin:0 }}>
                    {myApplications
                      ? `${myAppliedCount} application${myAppliedCount!==1?"s":""} · ${approvedCount} approved · ${reviewCount} under review · ${rejectedCount} rejected`
                      : "Discover and apply for scholarships you qualify for"}
                  </p>
                </div>
              </div>
              {myAppliedCount > 0 && (
                <button onClick={() => setMyApplications(v => !v)}
                  style={{ padding:"9px 18px",fontSize:13,fontWeight:600,border:`0.5px solid ${myApplications?"#534AB7":"var(--color-border-secondary)"}`,borderRadius:12,background:myApplications?"linear-gradient(135deg,rgba(83,74,183,0.12),rgba(83,74,183,0.06))":"var(--color-background-secondary)",color:myApplications?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all 0.15s" }}>
                  📋 My applications
                  <span style={{ width:20,height:20,borderRadius:6,background:"#534AB7",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{myAppliedCount}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Search row ───────────────────────────────────────────────── */}
          <div style={{ marginBottom:"1.25rem",display:"flex",flexDirection:"column",gap:12,animation:"fadeUp 0.4s 0.06s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}>
              <div style={{ position:"relative",flex:1 }}>
                <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"var(--color-text-tertiary)",pointerEvents:"none" }}>🔍</span>
                <input
                  className="search-input"
                  type="text"
                  placeholder={myApplications ? "Search applications by name or category…" : "Search by name or category…"}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%",padding:"12px 40px 12px 42px",fontSize:14,borderRadius:14,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif",transition:"box-shadow 0.2s" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:24,height:24,border:"none",background:"var(--color-background-secondary)",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)",fontSize:14 }}>✕</button>
                )}
              </div>

              {/* Mobile-only filter button */}
              <button
                className="mobile-filter-btn"
                onClick={() => setMobileFilterOpen(true)}
                style={{ padding:"11px 16px",fontSize:13,fontWeight:600,borderRadius:14,border:`1.5px solid ${totalSidebarFilters>0?"#534AB7":"var(--color-border-secondary)"}`,background:totalSidebarFilters>0?"rgba(83,74,183,0.08)":"var(--color-background-primary)",color:totalSidebarFilters>0?"#534AB7":"var(--color-text-secondary)",cursor:"pointer",alignItems:"center",gap:6,flexShrink:0,whiteSpace:"nowrap",transition:"all 0.15s" }}>
                ☰ Filters
                {totalSidebarFilters > 0 && (
                  <span style={{ width:20,height:20,borderRadius:6,background:"#534AB7",color:"#fff",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",marginLeft:4 }}>{totalSidebarFilters}</span>
                )}
              </button>
            </div>

            {/* Active filter pills row */}
            {hasActiveFilters && (
              <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
                {statusFilter !== "All" && (
                  <span style={{ padding:"5px 10px",fontSize:12,borderRadius:100,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.2)",fontWeight:600,display:"inline-flex",alignItems:"center",gap:5 }}>
                    {statusFilter}
                    <button onClick={() => setStatusFilter("All")} style={{ background:"none",border:"none",cursor:"pointer",color:"#534AB7",padding:0,fontSize:12,lineHeight:1 }}>✕</button>
                  </span>
                )}
                {Array.from(selectedCategories).map(cat => {
                  const catColor = categoriesWithColor.find(c => c.name === cat)?.color ?? "#534AB7";
                  return (
                    <span key={`cat-${cat}`} style={{ padding:"5px 10px",fontSize:12,borderRadius:100,background:`${catColor}18`,color:catColor,border:`0.5px solid ${catColor}44`,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5 }}>
                      <span style={{ width:7,height:7,borderRadius:"50%",background:catColor,display:"inline-block",flexShrink:0 }} />
                      {cat}
                      <button onClick={() => toggleCategory(cat)} style={{ background:"none",border:"none",cursor:"pointer",color:catColor,padding:0,fontSize:12,lineHeight:1 }}>✕</button>
                    </span>
                  );
                })}
                {Array.from(selectedEligibilities).map(e => (
                  <span key={`elig-${e}`} style={{ padding:"5px 10px",fontSize:12,borderRadius:100,background:"rgba(83,74,183,0.08)",color:"#534AB7",border:"0.5px solid rgba(83,74,183,0.2)",fontWeight:500,display:"inline-flex",alignItems:"center",gap:5,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {e}
                    <button onClick={() => toggleEligibility(e)} style={{ background:"none",border:"none",cursor:"pointer",color:"#534AB7",padding:0,fontSize:12,lineHeight:1,flexShrink:0 }}>✕</button>
                  </span>
                ))}
                <button onClick={clearAllFilters}
                  style={{ padding:"5px 10px",fontSize:12,borderRadius:100,background:"none",border:"none",color:"#C0392B",cursor:"pointer",fontWeight:600,display:"inline-flex",alignItems:"center",gap:3 }}>
                  ✕ Clear all
                </button>
              </div>
            )}
          </div>

          {/* Error state */}
          {error && !loading && (
            <div style={{ padding:"2rem",textAlign:"center",border:"0.5px solid rgba(192,57,43,0.25)",borderRadius:16,background:"rgba(192,57,43,0.04)",marginBottom:"1.5rem" }}>
              <div style={{ fontSize:28,marginBottom:8 }}>⚠</div>
              <p style={{ fontSize:14,color:"var(--color-text-danger)",margin:"0 0 12px",fontWeight:500 }}>{error}</p>
              <button onClick={fetchScholarships} style={{ padding:"8px 20px",fontSize:13,fontWeight:600,border:"0.5px solid rgba(192,57,43,0.3)",borderRadius:10,background:"none",cursor:"pointer",color:"var(--color-text-danger)",display:"inline-flex",alignItems:"center",gap:6 }}>
                ↻ Retry
              </button>
            </div>
          )}

          {/* My Applications View */}
          {myApplications && !loading && (
            <MyApplicationsTabs
              scholarships={myAppliedScholarships}
              onSelect={(s) => setSelected(s)}
              search={search}
              statusFilter={statusFilter}
              selectedCategories={selectedCategories}
              selectedEligibilities={selectedEligibilities}
            />
          )}

          {/* Main Scholarships Grid */}
          {!myApplications && (
            <>
              {!loading && !error && (
                <div style={{ fontSize:12,color:"var(--color-text-tertiary)",marginBottom:"1.25rem",fontWeight:500 }}>
                  {filtered.length} scholarship{filtered.length!==1?"s":""} available
                  {hasActiveFilters && <span style={{ marginLeft:6,color:"#999" }}>· filtered</span>}
                </div>
              )}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:"1.25rem" }}>
                {loading
                  ? Array.from({ length:6 }).map((_, i) => <SkeletonCard key={i} />)
                  : filtered.length===0
                  ? <EmptyState query={search} isMyApps={false} />
                  : filtered.map((s, i) => (
                    <ScholarshipCard key={s.id} scholarship={s} index={i} onSelect={() => setSelected(s)} />
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile overlay filter panel */}
      {mobileFilterOpen && (
        <MobileFilterPanel
          categoriesWithColor={categoriesWithColor}
          allEligibilityLabels={allEligibilityLabels}
          selectedCategories={selectedCategories}
          selectedEligibilities={selectedEligibilities}
          statusFilter={statusFilter}
          onToggleCategory={toggleCategory}
          onToggleEligibility={toggleEligibility}
          onSetStatus={setStatusFilter}
          onClearAll={clearAllFilters}
          onClose={() => setMobileFilterOpen(false)}
        />
      )}

      {/* Scholarship Drawer */}
      {selected && (
        <ScholarshipDrawer
          scholarship={selected}
          onClose={() => setSelected(null)}
          onOpenApply={() => { handleOpenApply(selected); }}
        />
      )}

      {/* Apply modal */}
      {applyTarget && (
        <ApplyModal
          scholarship={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSubmit={handleSubmitApplications}
          submitting={submitting}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bookmark, MapPin, Briefcase, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface SavedJob {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  location: string;
  work_setting: string;
  employment_type: string;
  saved_at: string;
}

export default function SavedJobsPage() {
  const router = useRouter();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    api.get("/jobs/saved")
      .then((d) => setSavedJobs(d.saved_jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemovingId(jobId);
    try {
      await api.post(`/jobs/save/${jobId}`, {});
      setSavedJobs((prev) => prev.filter((s) => s.job_id !== jobId));
      showToast("Removed from saved jobs.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div style={styles.root}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={() => router.push("/dashboard/my-career")}>
          <ArrowLeft size={15} /> Back to Job Search
        </button>
        <h1 style={styles.pageTitle}>Saved Jobs</h1>
        <p style={styles.pageSub}>Jobs you saved to review later</p>
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading saved jobs...</p>
      ) : savedJobs.length === 0 ? (
        <div style={styles.emptyState}>
          <Bookmark size={40} color="#d1d5db" />
          <p style={{ color: "#6b7280", margin: "8px 0 4px" }}>No saved jobs yet.</p>
          <button style={styles.browseBtn} onClick={() => router.push("/dashboard/my-career")}>
            Browse Jobs
          </button>
        </div>
      ) : (
        <>
          <p style={styles.count}>{savedJobs.length} saved job(s)</p>
          <div style={styles.jobList}>
            {savedJobs.map((sj) => (
              <div
                key={sj.id}
                style={styles.jobCard}
                onClick={() => router.push(`/dashboard/my-career/${sj.job_id}`)}
              >
                <div style={styles.companyAvatar}>{sj.company_name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={styles.jobTitle}>{sj.job_title}</h3>
                  <p style={styles.companyName}>{sj.company_name}</p>
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}><MapPin size={12} /> {sj.location}</span>
                    <span style={styles.metaItem}><Briefcase size={12} /> {sj.employment_type}</span>
                    <span style={styles.metaItem}>{sj.work_setting}</span>
                  </div>
                  <p style={styles.savedDate}>Saved on {new Date(sj.saved_at).toLocaleDateString()}</p>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.applyBtn}
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/my-career/${sj.job_id}`); }}
                  >
                    Apply
                  </button>
                  <button
                    style={styles.removeBtn}
                    onClick={(e) => handleRemove(sj.job_id, e)}
                    disabled={removingId === sj.job_id}
                    title="Remove from saved"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Segoe UI', sans-serif" },
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 100,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 20px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  pageHeader: { marginBottom: 20 },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: 13, padding: "0 0 10px", fontWeight: 500,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 40, fontSize: 14 },
  emptyState: { textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  browseBtn: {
    padding: "9px 20px", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4,
  },
  count: { fontSize: 13, color: "#6b7280", margin: "0 0 12px" },
  jobList: { display: "flex", flexDirection: "column", gap: 10 },
  jobCard: {
    background: "#fff", borderRadius: 10, padding: "16px 18px",
    display: "flex", gap: 14, alignItems: "flex-start",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer",
    border: "1.5px solid transparent", transition: "border-color 0.15s",
  },
  companyAvatar: {
    width: 44, height: 44, borderRadius: 10,
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  jobTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: "0 0 3px" },
  companyName: { fontSize: 13, color: "#6b7280", margin: "0 0 6px" },
  metaRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" },
  savedDate: { fontSize: 11, color: "#9ca3af", margin: "6px 0 0" },
  actions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  applyBtn: {
    padding: "8px 16px", background: "#eff6ff",
    color: "#1a56db", border: "1.5px solid #bfdbfe",
    borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  removeBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, background: "#fee2e2",
    color: "#ef4444", border: "none", borderRadius: 7, cursor: "pointer",
  },
};
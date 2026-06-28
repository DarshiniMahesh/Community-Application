"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Briefcase, Plus, Eye, Edit2, Trash2, Search, Filter } from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  location: string;
  work_setting: string;
  employment_type: string;
  experience_level_min: string;
  experience_level_max: string;
  number_of_openings: number;
  applicant_count: number;
  posted_at: string;
  expiry_date: string | null;
  status: string;
}

export default function JobPostingsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchJobs = () => {
    setLoading(true);
    api.get("/company/jobs")
      .then((d: { jobs?: Job[] }) => setJobs(d.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchJobs, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/company/jobs/${id}`);
      fetchJobs();
      showToast("Job posting removed.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const filtered = jobs.filter((j: Job) => {
    const matchSearch =
      j.job_title.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      active:  { background: "#d1fae5", color: "#065f46" },
      expired: { background: "#f3f4f6", color: "#6b7280" },
      draft:   { background: "#fef3c7", color: "#92400e" },
    };
    return map[s] ?? { background: "#f3f4f6", color: "#6b7280" };
  };

  return (
    <div>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Job Postings</h1>
          <p style={styles.pageSub}>Manage all your job listings</p>
        </div>
        <Link href="/dashboard/job-postings/new" style={styles.addBtn}>
          <Plus size={16} /> Post a Job
        </Link>
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Search by title or location..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.filterWrap}>
          <Filter size={14} color="#6b7280" />
          <select
            title="Filter by status"
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <p style={styles.resultCount}>{filtered.length} job(s) found</p>

      <div style={styles.card}>
        {loading ? (
          <p style={styles.loadingText}>Loading jobs...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <Briefcase size={40} color="#d1d5db" />
            <p style={{ color: "#6b7280", margin: "8px 0 0" }}>
              {jobs.length === 0 ? "No jobs posted yet." : "No jobs match your filters."}
            </p>
            {jobs.length === 0 && (
              <Link href="/dashboard/job-postings/new" style={styles.emptyLink}>
                <Plus size={14} /> Post your first job
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Job Title", "Work Setting", "Type", "Openings", "Applicants", "Posted", "Expires", "Status", "Actions"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((job: Job) => (
                  <tr key={job.id} style={styles.tr}>
                    <td style={styles.td}>
                      <Link href={`/dashboard/job-postings/${job.id}`} style={styles.jobLink}>
                        {job.job_title}
                      </Link>
                      <p style={styles.tdSub}>{job.location}</p>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.chip}>{job.work_setting}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.chip, background: "#ede9fe", color: "#5b21b6" }}>
                        {job.employment_type}
                      </span>
                    </td>
                    <td style={styles.td}>{job.number_of_openings || "—"}</td>
                    <td style={styles.td}>
                      <span style={styles.applicantCount}>
                        <Eye size={12} /> {job.applicant_count}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(job.posted_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      {job.expiry_date ? new Date(job.expiry_date).toLocaleDateString() : "—"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...statusStyle(job.status) }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionsCell}>
                        <Link href={`/dashboard/job-postings/${job.id}`} style={styles.iconBtn} title="View">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/dashboard/job-postings/${job.id}?edit=true`} style={{ ...styles.iconBtn, color: "#1a56db" }} title="Edit">
                          <Edit2 size={14} />
                        </Link>
                        {deleteConfirm === job.id ? (
                          <div style={styles.confirmRow}>
                            <span style={{ fontSize: 11, color: "#ef4444" }}>Delete?</span>
                            <button style={styles.confirmYes} onClick={() => handleDelete(job.id)} disabled={deleting}>Yes</button>
                            <button style={styles.confirmNo} onClick={() => setDeleteConfirm(null)}>No</button>
                          </div>
                        ) : (
                          <button
                            style={{ ...styles.iconBtn, color: "#ef4444", border: "none", cursor: "pointer", background: "none" }}
                            onClick={() => setDeleteConfirm(job.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 100,
    background: "#1a1a2e", color: "#fff", borderRadius: 8,
    padding: "12px 20px", fontSize: 13, fontWeight: 500,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  pageHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6b7280", margin: 0 },
  addBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 20px", background: "#1a56db",
    color: "#fff", borderRadius: 8,
    fontSize: 14, fontWeight: 600, textDecoration: "none",
  },
  filtersRow: { display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: 1, minWidth: 200 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  searchInput: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px 9px 34px",
    border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  filterWrap: { display: "flex", alignItems: "center", gap: 8 },
  filterSelect: {
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 8, fontSize: 13, color: "#374151",
    background: "#fff", outline: "none", cursor: "pointer",
  },
  resultCount: { fontSize: 13, color: "#6b7280", margin: "0 0 12px" },
  card: {
    background: "#fff", borderRadius: 10, padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: {
    textAlign: "center", padding: "48px 0",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
  emptyLink: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 18px", background: "#eff6ff",
    color: "#1a56db", borderRadius: 8,
    fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    padding: "10px 12px", textAlign: "left",
    borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f9fafb" },
  td: { padding: "12px 12px", fontSize: 13, color: "#374151", verticalAlign: "middle" },
  tdSub: { fontSize: 11, color: "#9ca3af", margin: "2px 0 0" },
  jobLink: { color: "#1a56db", fontWeight: 600, textDecoration: "none", fontSize: 13 },
  chip: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#eff6ff", color: "#1a56db", fontWeight: 500 },
  applicantCount: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" },
  statusBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, display: "inline-block" },
  actionsCell: { display: "flex", alignItems: "center", gap: 8 },
  iconBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6,
    background: "#f3f4f6", color: "#6b7280", textDecoration: "none",
  },
  confirmRow: { display: "flex", alignItems: "center", gap: 4 },
  confirmYes: {
    padding: "3px 8px", background: "#ef4444", color: "#fff",
    border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer",
  },
  confirmNo: {
    padding: "3px 8px", background: "#f3f4f6", color: "#374151",
    border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer",
  },
};
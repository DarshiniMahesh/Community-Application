"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GENDERS } from "@/lib/constants";
import { Users, Plus, Trash2, X, UserCheck } from "lucide-react";

interface Employee {
  id: string;
  employee_name: string;
  employee_age: number;
  employee_gender: string;
  employee_qualification: string;
  employee_role: string;
  created_at: string;
}

interface EmployeeForm {
  employee_name: string;
  employee_age: string;
  employee_gender: string;
  employee_qualification: string;
  employee_role: string;
}

const EMPTY_FORM: EmployeeForm = {
  employee_name: "",
  employee_age: "",
  employee_gender: "",
  employee_qualification: "",
  employee_role: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<EmployeeForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchEmployees = () => {
    setLoading(true);
    api.get("/company/employees")
      .then((d) => setEmployees(d.employees || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchEmployees, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const set = (key: keyof EmployeeForm, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Partial<EmployeeForm> = {};
    if (!form.employee_name.trim()) e.employee_name = "Name is required";
    const age = Number(form.employee_age);
    if (!form.employee_age || isNaN(age) || age < 18 || age > 80)
      e.employee_age = "Enter a valid age (18–80)";
    if (!form.employee_gender) e.employee_gender = "Gender is required";
    if (!form.employee_qualification.trim()) e.employee_qualification = "Qualification is required";
    if (!form.employee_role.trim()) e.employee_role = "Role is required";

    // Check duplicate name + role
    const dup = employees.find(
      (em) =>
        em.employee_name.toLowerCase() === form.employee_name.trim().toLowerCase() &&
        em.employee_role.toLowerCase() === form.employee_role.trim().toLowerCase()
    );
    if (dup) e.employee_name = "An employee with this name and role already exists";

    return e;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const body = { ...form, employee_age: Number(form.employee_age) };
      await api.post("/company/employees", body);
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchEmployees();
      showToast("Employee added successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add employee";
      setErrors({ employee_name: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (employees.length <= 1) {
      showToast("Cannot remove the only employee. At least one employee must remain.");
      setDeleteConfirm(null);
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/company/employees/${id}`);
      fetchEmployees();
      showToast("Employee removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove";
      showToast(msg);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Employee Management</h1>
          <p style={styles.pageSub}>Add and manage your company employees</p>
        </div>
        <button style={styles.addBtn} title="Add Employee" onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setErrors({}); }}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statChip}>
          <UserCheck size={14} color="#1a56db" />
          <span style={styles.statChipText}>{employees.length} Total Employees</span>
        </div>
      </div>

      {/* Table */}
      <div style={styles.card}>
        {loading ? (
          <p style={styles.loadingText}>Loading employees...</p>
        ) : employees.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={40} color="#d1d5db" />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 0" }}>No employees added yet.</p>
            <button style={styles.emptyAddBtn} onClick={() => setShowModal(true)}>
              <Plus size={14} /> Add First Employee
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["#", "Name", "Age", "Gender", "Qualification", "Role", "Added On", "Action"].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr key={emp.id} style={styles.tr}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{emp.employee_name.charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{emp.employee_name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{emp.employee_age}</td>
                    <td style={styles.td}>{emp.employee_gender}</td>
                    <td style={styles.td}>{emp.employee_qualification}</td>
                    <td style={styles.td}><span style={styles.roleBadge}>{emp.employee_role}</span></td>
                    <td style={styles.td}>{new Date(emp.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      {deleteConfirm === emp.id ? (
                        <div style={styles.confirmRow}>
                          <span style={{ fontSize: 12, color: "#ef4444" }}>Remove?</span>
                          <button
                            style={styles.confirmYes}
                            onClick={() => handleDelete(emp.id)}
                            disabled={deleting}
                          >Yes</button>
                          <button style={styles.confirmNo} onClick={() => setDeleteConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <button style={styles.deleteBtn} title="Delete employee" onClick={() => setDeleteConfirm(emp.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add Employee</h3>
              <button style={styles.closeBtn} title="Close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Employee Name <span style={styles.req}>*</span></label>
                <input
                  style={{ ...styles.input, ...(errors.employee_name ? styles.inputError : {}) }}
                  placeholder="Full name"
                  value={form.employee_name}
                  onChange={(e) => set("employee_name", e.target.value)}
                />
                {errors.employee_name && <p style={styles.errText}>{errors.employee_name}</p>}
              </div>

              <div style={styles.grid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Age <span style={styles.req}>*</span></label>
                  <input
                    style={{ ...styles.input, ...(errors.employee_age ? styles.inputError : {}) }}
                    type="number" min="18" max="80"
                    placeholder="e.g. 28"
                    value={form.employee_age}
                    onChange={(e) => set("employee_age", e.target.value)}
                  />
                  {errors.employee_age && <p style={styles.errText}>{errors.employee_age}</p>}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Gender <span style={styles.req}>*</span></label>
                  <select
  title="Employee gender"
  style={{ ...styles.select, ...(errors.employee_gender ? styles.inputError : {}) }}
  value={form.employee_gender}
  onChange={(e) => set("employee_gender", e.target.value)}
>
                    <option value="">Select gender</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {errors.employee_gender && <p style={styles.errText}>{errors.employee_gender}</p>}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Qualification <span style={styles.req}>*</span></label>
                <input
                  style={{ ...styles.input, ...(errors.employee_qualification ? styles.inputError : {}) }}
                  placeholder="e.g. B.Tech Computer Science"
                  value={form.employee_qualification}
                  onChange={(e) => set("employee_qualification", e.target.value)}
                />
                {errors.employee_qualification && <p style={styles.errText}>{errors.employee_qualification}</p>}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Role <span style={styles.req}>*</span></label>
                <input
                  style={{ ...styles.input, ...(errors.employee_role ? styles.inputError : {}) }}
                  placeholder="e.g. Software Engineer"
                  value={form.employee_role}
                  onChange={(e) => set("employee_role", e.target.value)}
                />
                {errors.employee_role && <p style={styles.errText}>{errors.employee_role}</p>}
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  statsRow: { display: "flex", gap: 12, marginBottom: 16 },
  statChip: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#eff6ff", borderRadius: 20,
    padding: "6px 14px",
  },
  statChipText: { fontSize: 13, color: "#1a56db", fontWeight: 600 },
  card: {
    background: "#fff", borderRadius: 10, padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  loadingText: { textAlign: "center", color: "#6b7280", padding: 32, fontSize: 13 },
  emptyState: {
    textAlign: "center", padding: "48px 0",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
  emptyAddBtn: {
    display: "flex", alignItems: "center", gap: 6,
    marginTop: 8, padding: "9px 18px",
    background: "#eff6ff", color: "#1a56db",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th: {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    padding: "10px 12px", textAlign: "left",
    borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f9fafb", transition: "background 0.1s" },
  td: { padding: "12px 12px", fontSize: 13, color: "#374151", verticalAlign: "middle" },
  nameCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "#eff6ff", color: "#1a56db",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  roleBadge: {
    fontSize: 11, padding: "3px 10px", borderRadius: 20,
    background: "#ede9fe", color: "#5b21b6", fontWeight: 600,
  },
  deleteBtn: {
    background: "#fee2e2", border: "none", borderRadius: 6,
    color: "#ef4444", cursor: "pointer",
    display: "flex", alignItems: "center", padding: "6px 8px",
  },
  confirmRow: { display: "flex", alignItems: "center", gap: 6 },
  confirmYes: {
    padding: "4px 10px", background: "#ef4444", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  confirmNo: {
    padding: "4px 10px", background: "#f3f4f6", color: "#374151",
    border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#fff", borderRadius: 12, padding: 28,
    width: "100%", maxWidth: 480,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)", fontFamily: "'Segoe UI', sans-serif",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#6b7280" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fieldGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 },
  req: { color: "#ef4444" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e", outline: "none",
  },
  select: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#1a1a2e",
    background: "#fff", outline: "none",
  },
  inputError: { borderColor: "#ef4444" },
  errText: { fontSize: 11, color: "#ef4444", margin: "3px 0 0" },
  modalActions: { display: "flex", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: "10px 0", background: "#f3f4f6",
    color: "#374151", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  submitBtn: {
    flex: 1, padding: "10px 0", background: "#1a56db",
    color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
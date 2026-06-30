const pool = require('../config/db');
const { signToken: generateToken } = require('../utils/jwt');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../config/mailer');
const bcrypt = require('bcrypt');

// ── Register ──────────────────────────────────────────────────
const register = async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password || password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (!email && !phone)
    return res.status(400).json({ message: 'Email or phone is required' });

  try {
    // Check duplicate in verified accounts only
    const existing = await pool.query(
      `SELECT id FROM company_auth WHERE (email=$1 OR phone=$2) AND is_verified=true`,
      [email || null, phone || null]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'Account already exists with this email/phone' });

    const password_hash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otp_expires_at = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);

    // Delete any previous unverified attempts with same contact
    await pool.query(
      `DELETE FROM company_auth WHERE (email=$1 OR phone=$2) AND is_verified=false`,
      [email || null, phone || null]
    );

    const result = await pool.query(
      `INSERT INTO company_auth (email, phone, password_hash, otp_code, otp_expires_at, is_verified)
       VALUES ($1,$2,$3,$4,$5,false) RETURNING id`,
      [email || null, phone || null, password_hash, otp, otp_expires_at]
    );

    if (email) await sendOtpEmail(email, otp);

    const token = generateToken({ id: result.rows[0].id, role: 'company' });
    return res.status(201).json({ message: 'OTP sent', token });
  } catch (err) {
    console.error('company register:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Verify OTP ─────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { email, phone, otp } = req.body;
  if (!otp) return res.status(400).json({ message: 'OTP is required' });

  try {
    const result = await pool.query(
      `SELECT id, otp_code, otp_expires_at FROM company_auth WHERE email=$1 OR phone=$2`,
      [email || null, phone || null]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Account not found' });

    const row = result.rows[0];
    if (row.otp_code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > new Date(row.otp_expires_at))
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });

    // Mark verified
    await pool.query(
      `UPDATE company_auth SET is_verified=true, otp_code=NULL, otp_expires_at=NULL WHERE id=$1`,
      [row.id]
    );

    // Check if profile exists
    const profile = await pool.query(
  `SELECT id, status FROM companies WHERE company_auth_id=$1`, [row.id]
);
const profileComplete = profile.rows.length > 0;
const companyStatus = profileComplete ? profile.rows[0].status : null;

const token = generateToken({ id: row.id, role: 'company' });
return res.json({ message: 'Verified', token, profileComplete, companyStatus });
  } catch (err) {
    console.error('company verifyOtp:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Resend OTP ─────────────────────────────────────────────────
const resendOtp = async (req, res) => {
  const { email, phone } = req.body;
  try {
    const result = await pool.query(
      `SELECT id FROM company_auth WHERE email=$1 OR phone=$2`,
      [email || null, phone || null]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Account not found' });

    const otp = generateOtp();
    const otp_expires_at = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);
    await pool.query(
      `UPDATE company_auth SET otp_code=$1, otp_expires_at=$2 WHERE id=$3`,
      [otp, otp_expires_at, result.rows[0].id]
    );

    if (email) await sendOtpEmail(email, otp);
    return res.json({ message: 'OTP resent' });
  } catch (err) {
    console.error('company resendOtp:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password) return res.status(400).json({ message: 'Password is required' });
  if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

  try {
    const result = await pool.query(
      `SELECT id, password_hash, is_verified FROM company_auth WHERE email=$1 OR phone=$2`,
      [email || null, phone || null]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const row = result.rows[0];
    if (!row.is_verified)
      return res.status(403).json({ message: 'Account not verified. Please register and verify OTP first.' });

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const otp = generateOtp();
    const otp_expires_at = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);
    await pool.query(
      `UPDATE company_auth SET otp_code=$1, otp_expires_at=$2 WHERE id=$3`,
      [otp, otp_expires_at, row.id]
    );

    if (email) await sendOtpEmail(email, otp);

    return res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('company login:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get Profile ────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, ca.email, ca.phone
       FROM companies c
       JOIN company_auth ca ON ca.id = c.company_auth_id
       WHERE c.company_auth_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getProfile:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Create Profile ─────────────────────────────────────────────
const createProfile = async (req, res) => {
  const {
    company_name, company_description,
    address_line1, address_line2,
    company_category, company_subcategory, company_size,
  } = req.body;

  if (!company_name || !company_description || !address_line1 || !company_category || !company_subcategory || !company_size)
    return res.status(400).json({ message: 'All mandatory fields are required' });

  try {
    // Check duplicate company name
    const dup = await pool.query(`SELECT id FROM companies WHERE company_name=$1`, [company_name]);
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'A company with this name already exists' });

    await pool.query(
      `INSERT INTO companies
         (company_auth_id, company_name, company_description, address_line1, address_line2,
          company_category, company_subcategory, company_size, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
      [req.user.id, company_name, company_description, address_line1, address_line2 || null,
       company_category, company_subcategory, company_size]
    );
    return res.status(201).json({ message: 'Profile created. Pending admin approval.' });
  } catch (err) {
    console.error('createProfile:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Update Profile ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const {
    company_name, company_description,
    address_line1, address_line2,
    company_category, company_subcategory, company_size,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE companies SET
         company_name=$1, company_description=$2, address_line1=$3, address_line2=$4,
         company_category=$5, company_subcategory=$6, company_size=$7,
         status='pending', rejection_reason=NULL, updated_at=now()
       WHERE company_auth_id=$8
       RETURNING status`,
      [company_name, company_description, address_line1, address_line2 || null,
       company_category, company_subcategory, company_size, req.user.id]
    );
    return res.json({ message: 'Profile updated. Sent for re-approval.', status: result.rows[0]?.status });
  } catch (err) {
    console.error('updateProfile:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Reapply ────────────────────────────────────────────────────
const reapply = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status FROM companies WHERE company_auth_id=$1`, [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });
    if (result.rows[0].status !== 'rejected')
      return res.status(400).json({ message: 'Only rejected companies can reapply' });

    await pool.query(
      `UPDATE companies SET status='pending', rejection_reason=NULL, updated_at=now() WHERE company_auth_id=$1`,
      [req.user.id]
    );
    return res.json({ message: 'Reapplication submitted' });
  } catch (err) {
    console.error('reapply:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Dashboard Stats ────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const company = await pool.query(
      `SELECT id FROM companies WHERE company_auth_id=$1`, [req.user.id]
    );
    if (company.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });
    const companyId = company.rows[0].id;

    const [jobs, employees, applications, recentJobs, recentApps] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM company_jobs WHERE company_id=$1`, [companyId]),
      pool.query(`SELECT COUNT(*) as total FROM company_employees WHERE company_id=$1`, [companyId]),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN ja.status='Submitted' THEN 1 END) as pending FROM job_applications ja JOIN company_jobs cj ON cj.id=ja.job_id WHERE cj.company_id=$1`, [companyId]),
      pool.query(`SELECT cj.id, cj.job_title, cj.employment_type, cj.location, cj.posted_at, cj.status, COUNT(ja.id) as applicant_count FROM company_jobs cj LEFT JOIN job_applications ja ON ja.job_id=cj.id WHERE cj.company_id=$1 GROUP BY cj.id ORDER BY cj.posted_at DESC LIMIT 5`, [companyId]),
      pool.query(`SELECT ja.id, u.email as applicant_name, cj.job_title, ja.status, ja.applied_at FROM job_applications ja JOIN company_jobs cj ON cj.id=ja.job_id JOIN users u ON u.id=ja.user_id WHERE cj.company_id=$1 ORDER BY ja.applied_at DESC LIMIT 5`, [companyId]),
    ]);

    return res.json({
      total_jobs: parseInt(jobs.rows[0].total),
      active_jobs: parseInt(jobs.rows[0].active),
      total_employees: parseInt(employees.rows[0].total),
      total_applications: parseInt(applications.rows[0].total),
      pending_applications: parseInt(applications.rows[0].pending),
      recent_jobs: recentJobs.rows,
      recent_applications: recentApps.rows,
      unread_notifications: 0,
    });
  } catch (err) {
    console.error('getDashboardStats:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Employees: List ─────────────────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const company = await pool.query(
      `SELECT id FROM companies WHERE company_auth_id=$1`, [req.user.id]
    );
    if (company.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });

    const result = await pool.query(
      `SELECT id, employee_name, employee_age, employee_gender,
              employee_qualification, employee_role, created_at
       FROM company_employees
       WHERE company_id=$1
       ORDER BY created_at DESC`,
      [company.rows[0].id]
    );
    return res.json({ employees: result.rows });
  } catch (err) {
    console.error('getEmployees:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Employees: Add ──────────────────────────────────────────────
const addEmployee = async (req, res) => {
  const { employee_name, employee_age, employee_gender, employee_qualification, employee_role } = req.body;

  if (!employee_name || !employee_age || !employee_gender || !employee_qualification || !employee_role)
    return res.status(400).json({ message: 'All employee fields are required' });

  try {
    const company = await pool.query(
      `SELECT id FROM companies WHERE company_auth_id=$1`, [req.user.id]
    );
    if (company.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });

    const result = await pool.query(
      `INSERT INTO company_employees
         (company_id, employee_name, employee_age, employee_gender, employee_qualification, employee_role)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, employee_name, employee_age, employee_gender, employee_qualification, employee_role, created_at`,
      [company.rows[0].id, employee_name, employee_age, employee_gender, employee_qualification, employee_role]
    );
    return res.status(201).json({ message: 'Employee added', employee: result.rows[0] });
  } catch (err) {
    console.error('addEmployee:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Employees: Delete ────────────────────────────────────────────
const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const company = await pool.query(
      `SELECT id FROM companies WHERE company_auth_id=$1`, [req.user.id]
    );
    if (company.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });

    const result = await pool.query(
      `DELETE FROM company_employees WHERE id=$1 AND company_id=$2 RETURNING id`,
      [id, company.rows[0].id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Employee not found' });

    return res.json({ message: 'Employee removed' });
  } catch (err) {
    console.error('deleteEmployee:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Admin: List Companies ──────────────────────────────────────
const adminListCompanies = async (req, res) => {
  const { status } = req.query;
  try {
    const result = await pool.query(
      `SELECT c.*, ca.email, ca.phone FROM companies c JOIN company_auth ca ON ca.id=c.company_auth_id
       WHERE ($1::text IS NULL OR c.status=$1) ORDER BY c.created_at DESC`,
      [status || null]
    );
    return res.json({ companies: result.rows });
  } catch (err) {
    console.error('adminListCompanies:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Admin: Approve Company ─────────────────────────────────────
const adminApproveCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE companies SET status='approved', rejection_reason=NULL, updated_at=now() WHERE id=$1 RETURNING id, status`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });
    return res.json({ message: 'Company approved', company: result.rows[0] });
  } catch (err) {
    console.error('adminApproveCompany:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Admin: Reject Company ──────────────────────────────────────
const adminRejectCompany = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || !reason.trim())
    return res.status(400).json({ message: 'Rejection reason is required' });

  try {
    const result = await pool.query(
      `UPDATE companies SET status='rejected', rejection_reason=$1, updated_at=now() WHERE id=$2 RETURNING id`,
      [reason, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Company not found' });
    return res.json({ message: 'Company rejected' });
  } catch (err) {
    console.error('adminRejectCompany:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  register, login, verifyOtp, resendOtp,
  getProfile, createProfile, updateProfile, reapply,
  getDashboardStats,
  getEmployees, addEmployee, deleteEmployee,
  adminListCompanies, adminApproveCompany, adminRejectCompany,
};
/*Community-Application\backend\src\controllers\adminController.js*/
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const { generateOtp }  = require('../utils/otp');
const { sendOtpEmail } = require('../config/mailer');

// ─── POST /admin/login/send-otp ───────────────────────────────────
const loginSendOtp = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // ── Check against .env credentials first ──
const envEmail    = process.env.ADMIN_EMAIL;
const envPassword = process.env.ADMIN_PASSWORD;

if (!envEmail || !envPassword)
  return res.status(500).json({ message: 'Admin credentials not configured' });

if (email !== envEmail)
  return res.status(401).json({ message: 'Invalid credentials' });

if (password !== envPassword)
  return res.status(401).json({ message: 'Invalid credentials' });

// ── Upsert admin user in DB (so OTP storage works) ──
let userRes = await pool.query(
  `SELECT id, email FROM users WHERE email = $1 AND role = 'admin'`,
  [email]
);

if (userRes.rows.length === 0) {
  const password_hash = await bcrypt.hash(password, 10);
  userRes = await pool.query(
    `INSERT INTO users (email, role, password_hash, is_active, is_email_verified)
     VALUES ($1, 'admin', $2, true, true) RETURNING id, email`,
    [email, password_hash]
  );
} else {
  // Keep DB password hash in sync with .env
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `UPDATE users SET password_hash=$1, is_active=true WHERE id=$2`,
    [password_hash, userRes.rows[0].id]
  );
}

const user = userRes.rows[0];

    const otp = generateOtp();
    const expiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES) || 10) * 60 * 1000
    );

    await pool.query(
      'UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3',
      [otp, expiresAt, user.id]
    );

    await sendOtpEmail(email, otp);

    res.json({ message: 'Credentials verified. OTP sent to your email.' });
  } catch (err) {
    console.error('loginSendOtp error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// ─── POST /admin/login/verify-otp ────────────────────────────────
const loginVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required' });

    const userRes = await pool.query(
      `SELECT id, email, role, otp_code, otp_expires_at
       FROM users WHERE email = $1 AND role = 'admin'`,
      [email]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'Account not found' });

    const user = userRes.rows[0];

    if (user.otp_code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    if (new Date() > new Date(user.otp_expires_at))
      return res.status(400).json({ message: 'OTP has expired' });

    await pool.query(
      'UPDATE users SET otp_code=NULL, otp_expires_at=NULL, last_login_at=NOW() WHERE id=$1',
      [user.id]
    );

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    console.error('loginVerifyOtp error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/dashboard ─────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers, totalSangha,
      approvedUsers, rejectedUsers, pendingUsers, changesRequested,
      pendingSangha, approvedSangha, rejectedSangha, draftUsers
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='user' AND is_deleted=FALSE"),
      pool.query("SELECT COUNT(*) FROM sanghas"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='rejected'"),
      pool.query("SELECT COUNT(*) FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.status IN ('submitted','under_review','draft') AND u.is_deleted = FALSE"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='changes_requested'"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='pending_approval'"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='rejected'"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='draft'")
    ]);

    res.json({
      totalUsers:       parseInt(totalUsers.rows[0].count),
      totalSangha:      parseInt(totalSangha.rows[0].count),
      approvedUsers:    parseInt(approvedUsers.rows[0].count),
      rejectedUsers:    parseInt(rejectedUsers.rows[0].count),
      pendingUsers:     parseInt(pendingUsers.rows[0].count),
      changesRequested: parseInt(changesRequested.rows[0].count),
      pendingSangha:    parseInt(pendingSangha.rows[0].count),
      approvedSangha:   parseInt(approvedSangha.rows[0].count),
      rejectedSangha:   parseInt(rejectedSangha.rows[0].count),
      draftUsers:       parseInt(draftUsers.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/sangha/pending ────────────────────────────────
const getPendingSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.sangha_auth_id, s.sangha_name AS name,
              s.district AS location, s.status, s.created_at, s.updated_at,
              s.address_line, s.state, s.email, s.phone,
              s.description, s.logo_url,
              u.email AS reg_email, u.phone AS reg_phone
       FROM sanghas s
       JOIN users u ON u.id = s.sangha_auth_id
       WHERE s.status = 'pending_approval'
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/sangha/all ────────────────────────────────────
const getAllSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.sangha_auth_id, s.sangha_name AS name,
              s.district AS location, s.status, s.created_at,
              s.address_line, s.state, s.email, s.phone,
              s.description, s.logo_url, s.is_blocked,
              u.email AS reg_email, u.phone AS reg_phone
       FROM sanghas s
       JOIN users u ON u.id = s.sangha_auth_id
       WHERE s.status = 'approved'
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/sangha/approve/:id ──────────────────────────
const approveSangha = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE sanghas SET status='approved', updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
       WHERE sangha_auth_id=$1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });
    res.json({ message: 'Sangha approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/sangha/reject/:id ───────────────────────────
const rejectSangha = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await pool.query(
      `UPDATE sanghas SET status='rejected', rejection_reason=$1, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
       WHERE sangha_auth_id=$2 RETURNING id`,
      [reason || null, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });
    res.json({ message: 'Sangha rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users ─────────────────────────────────────────
const getApprovedUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked,
              p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
              p.sangha_id,
              pd.first_name, pd.last_name, pd.gender,
              s.sangha_name
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sanghas s ON s.id = p.sangha_id
       WHERE p.status = 'approved' AND u.is_deleted = FALSE
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/pending ─────────────────────────────────
const getPendingUsers = async (req, res) => {
  try {
    const { sangha_id } = req.query;
    let query = `
      SELECT u.id, u.email, u.phone, u.is_blocked,
             p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
             p.sangha_id,
             pd.first_name, pd.last_name,
             s.sangha_name
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN sanghas s ON s.id = p.sangha_id
      WHERE p.status NOT IN ('approved','rejected') AND u.is_deleted = FALSE AND u.is_blocked=FALSE
    `;
    const params = [];
    if (sangha_id) {
      params.push(sangha_id);
      query += ` AND p.sangha_id = $${params.length}`;
    }
    query += ' ORDER BY p.submitted_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/users/approve ────────────────────────────────
const approveUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const adminId = req.user.id;
    if (!userId)
      return res.status(400).json({ message: 'userId is required' });

    const profileRes = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId, status } = profileRes.rows[0];
    if (status === 'approved')
      return res.status(409).json({ message: 'Profile already approved' });

    const reviewerId = adminId;
    await pool.query(
      `UPDATE profiles SET status='approved', reviewed_by=$1, reviewed_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
  `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'approved',$2,$3)`,
  [profileId, adminId, comment || null]
);
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/users/reject ─────────────────────────────────
const rejectUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const adminId = req.user.id;
    if (!userId)
      return res.status(400).json({ message: 'userId is required' });

    const profileRes = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId } = profileRes.rows[0];
    const reviewerId = adminId;
    await pool.query(
      `UPDATE profiles SET status='rejected', reviewed_by=$1, reviewed_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
  `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'rejected',$2,$3)`,
  [profileId, adminId, comment || null]
);
    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/all ─────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.created_at, u.is_blocked,
              p.id AS profile_id, p.status, p.submitted_at,
              p.overall_completion_pct, p.sangha_id, p.review_comment,
              pd.first_name, pd.last_name, pd.gender,
              s.sangha_name
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sanghas s ON s.id = p.sangha_id
       WHERE u.role = 'user' AND u.is_deleted = FALSE
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/activity-logs ─────────────────────────────────
const getActivityLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id              AS profile_id,
         u.id              AS user_id,
         u.email,
         u.phone,
         pd.first_name,
         pd.last_name,
         p.status,
         p.submitted_at,
         p.reviewed_at,
         p.review_comment,
         CASE
           WHEN ru.role = 'admin'  THEN 'Admin'
           WHEN ru.role = 'sangha' THEN COALESCE(sr.sangha_name, 'Sangha')
           ELSE NULL
         END AS reviewed_by_name
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN users ru ON ru.id = p.reviewed_by
       LEFT JOIN sanghas sr ON sr.sangha_auth_id = p.reviewed_by
       ORDER BY COALESCE(p.submitted_at, p.created_at) DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/sangha/history ────────────────────────────────
const getSanghaHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.id,
         s.sangha_auth_id,
         s.sangha_name AS name,
         u.email AS reg_email,
         u.phone AS reg_phone,
         s.email,
         s.phone,
         s.district  AS location,
         s.state,
         s.status,
         s.is_blocked,
         s.created_at  AS submitted_at,
         s.updated_at  AS reviewed_at
       FROM sanghas s
       JOIN users u ON u.id = s.sangha_auth_id
       ORDER BY s.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/blocklist/users ───────────────────────────────
const getBlocklistUsers = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || !search.trim()) {
      return res.json([]);
    }
    const param = `%${search.trim()}%`;
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked, u.created_at,
              pd.first_name, pd.last_name,
              s.sangha_name,
              p.status AS profile_status
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sanghas s ON s.id = p.sangha_id
       WHERE u.role = 'user'
         AND u.is_deleted = FALSE
         AND p.status = 'approved'
         AND (
           pd.first_name ILIKE $1 OR
           pd.last_name  ILIKE $1 OR
           u.email       ILIKE $1 OR
           u.phone       ILIKE $1 OR
           s.sangha_name ILIKE $1
         )
       ORDER BY u.is_blocked ASC, pd.first_name ASC`,
      [param]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/blocklist/sanghas ─────────────────────────────
const getBlocklistSanghas = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || !search.trim()) {
      return res.json([]);
    }
    const param = `%${search.trim()}%`;
    const result = await pool.query(
      `SELECT s.id, s.sangha_auth_id, s.sangha_name, s.email, s.phone,
              s.district AS location, s.status, s.is_blocked, s.created_at
       FROM sanghas s
       WHERE s.status = 'approved'
         AND (
           s.sangha_name ILIKE $1 OR
           s.email       ILIKE $1 OR
           s.phone       ILIKE $1 OR
           s.district    ILIKE $1
         )
       ORDER BY s.is_blocked ASC, s.sangha_name ASC`,
      [param]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/users/block ──────────────────────────────────
const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const result = await pool.query(
      `UPDATE users SET is_blocked=TRUE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1 AND role='user' RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/users/unblock ────────────────────────────────
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const result = await pool.query(
      `UPDATE users SET is_blocked=FALSE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1 AND role='user' RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /admin/users/delete ───────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const result = await pool.query(
      `DELETE FROM users WHERE id=$1 AND role='user' RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted permanently' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/sangha/block ─────────────────────────────────
const blockSangha = async (req, res) => {
  try {
    const { sanghaId } = req.body;
    if (!sanghaId) return res.status(400).json({ message: 'sanghaId is required' });

    const sanghaRes = await pool.query(
      `UPDATE sanghas SET is_blocked=TRUE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1 RETURNING sangha_auth_id`,
      [sanghaId]
    );
    if (sanghaRes.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });

    await pool.query(
      `UPDATE users SET is_blocked=TRUE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1`,
      [sanghaRes.rows[0].sangha_auth_id]
    );
    res.json({ message: 'Sangha blocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/sangha/unblock ───────────────────────────────
const unblockSangha = async (req, res) => {
  try {
    const { sanghaId } = req.body;
    if (!sanghaId) return res.status(400).json({ message: 'sanghaId is required' });

    const sanghaRes = await pool.query(
      `UPDATE sanghas SET is_blocked=FALSE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1 RETURNING sangha_auth_id`,
      [sanghaId]
    );
    if (sanghaRes.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });

    await pool.query(
      `UPDATE users SET is_blocked=FALSE, updated_at=((NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') WHERE id=$1`,
      [sanghaRes.rows[0].sangha_auth_id]
    );
    res.json({ message: 'Sangha unblocked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /admin/sangha/delete ──────────────────────────────
const deleteSangha = async (req, res) => {
  try {
    const { sanghaId } = req.body;
    if (!sanghaId) return res.status(400).json({ message: 'sanghaId is required' });

    const sanghaRes = await pool.query(
      `SELECT sangha_auth_id FROM sanghas WHERE id=$1`,
      [sanghaId]
    );
    if (sanghaRes.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });

    const authId = sanghaRes.rows[0].sangha_auth_id;

    await pool.query(`DELETE FROM sanghas WHERE id=$1`, [sanghaId]);
    await pool.query(`DELETE FROM users WHERE id=$1`, [authId]);

    res.json({ message: 'Sangha deleted permanently' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/sangha/counts ────────────────────────────────
const getSanghaCounts = async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM sanghas"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='pending_approval'"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM sanghas WHERE status='rejected'"),
    ]);

    res.json({
      total:    parseInt(total.rows[0].count),
      pending:  parseInt(pending.rows[0].count),
      approved: parseInt(approved.rows[0].count),
      rejected: parseInt(rejected.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/sangha/:id/detail ────────────────────────────
const getSanghaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const sanghaResult = await pool.query(
      `SELECT s.*,
              s.sangha_name  AS name,
              s.village_town AS village_town,
              s.district     AS location,
              u.email        AS reg_email,
              u.phone        AS reg_phone
       FROM sanghas s
       JOIN users u ON u.id = s.sangha_auth_id
       WHERE s.id = $1`,
      [id]
    );

    if (sanghaResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sangha not found' });
    }

    const sanghaData = sanghaResult.rows[0];

    const membersResult = await pool.query(
      `SELECT id, first_name, last_name, gender, phone, email, dob, role, member_type, created_at, updated_at
       FROM sangha_members
       WHERE sangha_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      ...sanghaData,
      members: membersResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/:id/profile ────────────────────────────
const getUserProfile = async (req, res) => {
  console.log('✅ getUserPendingDetail HIT - id:', req.params.id);
  console.log('✅ user from token:', req.user);
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked, u.created_at,
              p.id AS profile_id, p.status, p.photo_url, p.photo_uploaded_at,
              p.submitted_at, p.reviewed_at, p.review_comment,
              p.overall_completion_pct, p.step1_personal_pct, p.step2_religious_pct,
              p.step3_family_pct, p.step4_location_pct, p.step5_education_pct,
              p.step6_economic_pct, p.step1_completed, p.step2_completed,
              p.step3_completed, p.step4_completed, p.step5_completed,
              p.step6_completed, p.sangha_id
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user      = userRes.rows[0];
    const profileId = user.profile_id;

    if (!profileId) {
      return res.json({
        user, profile: null, step1: null, step2: null,
        step3: null, step4: [], step5: [], step5_certifications: [],
        step5_languages: [], step6: null, sangha: null,
      });
    }

    const [
      s1Res, s2Res, s3FamRes, s3MemRes, s4Res, s5Res,
      s5CertRes, s5LangRes, s6EcoRes, s6InsRes, s6DocRes, s6HistRes,
    ] = await Promise.all([
      pool.query('SELECT * FROM personal_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM religious_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_info WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_members WHERE profile_id = $1 ORDER BY sort_order ASC', [profileId]),
      pool.query('SELECT * FROM addresses WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_education WHERE profile_id = $1 ORDER BY sort_order ASC', [profileId]),
      pool.query(
        `SELECT c.id, c.certification, c.sort_order, c.member_education_id AS edu_id
         FROM member_certifications c
         JOIN member_education e ON c.member_education_id = e.id
         WHERE e.profile_id = $1`,
        [profileId]
      ),
      pool.query(
        `SELECT l.id, l.language, l.language_other, l.member_education_id AS edu_id
         FROM member_languages l
         JOIN member_education e ON l.member_education_id = e.id
         WHERE e.profile_id = $1`,
        [profileId]
      ),
      pool.query('SELECT * FROM economic_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_insurance WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_documents WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_history WHERE profile_id = $1', [profileId]),
    ]);

    const responseData = {
      user: {
        id:         user.id,
        email:      user.email,
        phone:      user.phone,
        is_blocked: user.is_blocked,
        created_at: user.created_at,
      },
      profile: {
        id:                     user.profile_id,
        status:                 user.status,
        photo_url:              user.photo_url,
        photo_uploaded_at:      user.photo_uploaded_at,
        submitted_at:           user.submitted_at,
        reviewed_at:            user.reviewed_at,
        review_comment:         user.review_comment,
        overall_completion_pct: user.overall_completion_pct,
        step1_personal_pct:     user.step1_personal_pct,
        step2_religious_pct:    user.step2_religious_pct,
        step3_family_pct:       user.step3_family_pct,
        step4_location_pct:     user.step4_location_pct,
        step5_education_pct:    user.step5_education_pct,
        step6_economic_pct:     user.step6_economic_pct,
        step1_completed:        user.step1_completed,
        step2_completed:        user.step2_completed,
        step3_completed:        user.step3_completed,
        step4_completed:        user.step4_completed,
        step5_completed:        user.step5_completed,
        step6_completed:        user.step6_completed,
        sangha_id:              user.sangha_id,
      },
      step1: s1Res.rows[0] || null,
      step2: s2Res.rows[0] || null,
      step3: {
        family_info: s3FamRes.rows[0] || null,
        members:     s3MemRes.rows,
      },
      step4:                s4Res.rows,
      step5:                s5Res.rows,
      step5_certifications: s5CertRes.rows,
      step5_languages:      s5LangRes.rows,
      step6: {
        economic:       s6EcoRes.rows[0] || null,
        insurance:      s6InsRes.rows,
        documents:      s6DocRes.rows,
        family_history: s6HistRes.rows[0] || null,
      },
      sangha: null,
    };

    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /admin/users/:id/profile ────────────────────────────
const updateUserProfile = async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

// ─── GET /admin/blocklist/users/all ──────────────────────────
const getAllBlocklistUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id,
              u.email,
              u.phone,
              u.is_blocked,
              u.created_at,
              pd.first_name,
              pd.last_name,
              s.sangha_name,
              p.status AS profile_status
       FROM users u
       JOIN   profiles p        ON p.user_id    = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sanghas s          ON s.id          = p.sangha_id
       WHERE u.role       = 'user'
         AND u.is_deleted = FALSE
         AND p.status     = 'approved'
       ORDER BY u.is_blocked DESC, pd.first_name ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/blocklist/sanghas/all ────────────────────────
const getAllBlocklistSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id,
              s.sangha_auth_id,
              s.sangha_name,
              s.email,
              s.phone,
              s.district  AS location,
              s.status,
              s.is_blocked,
              s.created_at
       FROM sanghas s
       WHERE s.status = 'approved'
       ORDER BY s.is_blocked DESC, s.sangha_name ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/:id/pending-detail ─────────────────────
const getUserPendingDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked, u.created_at,
              p.id AS profile_id, p.status, p.photo_url,
              p.submitted_at, p.reviewed_at, p.review_comment,
              p.overall_completion_pct,
              p.step1_completed, p.step2_completed, p.step3_completed,
              p.step4_completed, p.step5_completed, p.step6_completed,
              p.sangha_id
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = userRes.rows[0];
    const profileId = user.profile_id;

    if (!profileId) {
      return res.json({ user, profile: null, step1: null, step2: null, step3: null, step4: [], step5: [], step6: null, sangha: null });
    }

    const [s1Res, s2Res, s3FamRes, s3MemRes, s4Res, s5Res, s6EcoRes, s6InsRes, s6DocRes, s6HistRes, sanghaRes] = await Promise.all([
      pool.query('SELECT * FROM personal_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM religious_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_info WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_members WHERE profile_id = $1 ORDER BY sort_order ASC', [profileId]),
      pool.query('SELECT * FROM addresses WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_education WHERE profile_id = $1 ORDER BY sort_order ASC', [profileId]),
      pool.query('SELECT * FROM economic_details WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_insurance WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM member_documents WHERE profile_id = $1', [profileId]),
      pool.query('SELECT * FROM family_history WHERE profile_id = $1', [profileId]),
      user.sangha_id
        ? pool.query('SELECT id, sangha_name AS name, district AS location, state, email, phone FROM sanghas WHERE id = $1', [user.sangha_id])
        : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      user: {
        id: user.id, email: user.email, phone: user.phone,
        is_blocked: user.is_blocked, created_at: user.created_at,
      },
      profile: {
        id: profileId, status: user.status, photo_url: user.photo_url,
        submitted_at: user.submitted_at, reviewed_at: user.reviewed_at,
        review_comment: user.review_comment,
        overall_completion_pct: user.overall_completion_pct,
        step1_completed: user.step1_completed, step2_completed: user.step2_completed,
        step3_completed: user.step3_completed, step4_completed: user.step4_completed,
        step5_completed: user.step5_completed, step6_completed: user.step6_completed,
        sangha_id: user.sangha_id,
      },
      step1: s1Res.rows[0] || null,
      step2: s2Res.rows[0] || null,
      step3: { family_info: s3FamRes.rows[0] || null, members: s3MemRes.rows },
      step4: s4Res.rows,
      step5: s5Res.rows,
      step6: {
        economic: s6EcoRes.rows[0] || null,
        insurance: s6InsRes.rows,
        documents: s6DocRes.rows,
        family_history: s6HistRes.rows[0] || null,
      },
      sangha: sanghaRes.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  loginSendOtp,
  loginVerifyOtp,
  getDashboard,
  getPendingSanghas,
  getAllSanghas,
  approveSangha,
  rejectSangha,
  getApprovedUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getActivityLogs,
  getSanghaHistory,
  getBlocklistUsers,
  getBlocklistSanghas,
  blockUser,
  unblockUser,
  deleteUser,
  blockSangha,
  unblockSangha,
  deleteSangha,
  getSanghaCounts,
  getSanghaDetail,
  getUserPendingDetail,
  getUserProfile,
  updateUserProfile,
  getAllBlocklistUsers,
  getAllBlocklistSanghas,
};
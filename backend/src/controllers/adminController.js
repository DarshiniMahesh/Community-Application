const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');

// ─── POST /admin/login ────────────────────────────────────────
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // Hardcoded demo admin
    if (email === 'admin@gmail.com' && password === 'admin@123') {
      const token = signToken({ id: 'hardcoded-admin', role: 'admin' });
      return res.json({ token, role: 'admin', email });
    }

    const userRes = await pool.query(
      `SELECT id, email, phone, role, password_hash, is_active, is_deleted
       FROM users WHERE email = $1 AND role = 'admin'`,
      [email]
    );

    if (userRes.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = userRes.rows[0];

    if (!user.is_active || user.is_deleted)
      return res.status(401).json({ message: 'Account is disabled' });

    if (!user.password_hash)
      return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/dashboard ─────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSangha,
      approvedUsers,
      rejectedUsers,
      pendingUsers,
      changesRequested,
      pendingSangha,
      approvedSangha,
      rejectedSangha,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='user' AND is_deleted=FALSE"),
      pool.query("SELECT COUNT(*) FROM sangha_profiles"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='rejected'"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status IN ('submitted','under_review')"),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='changes_requested'"),
      pool.query("SELECT COUNT(*) FROM sangha_profiles WHERE status='pending_approval'"),
      pool.query("SELECT COUNT(*) FROM sangha_profiles WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM sangha_profiles WHERE status='rejected'"),
    ]);

    res.json({
      totalUsers:        parseInt(totalUsers.rows[0].count),
      totalSangha:       parseInt(totalSangha.rows[0].count),
      approvedUsers:     parseInt(approvedUsers.rows[0].count),
      rejectedUsers:     parseInt(rejectedUsers.rows[0].count),
      pendingUsers:      parseInt(pendingUsers.rows[0].count),
      changesRequested:  parseInt(changesRequested.rows[0].count),
      pendingSangha:     parseInt(pendingSangha.rows[0].count),
      approvedSangha:    parseInt(approvedSangha.rows[0].count),
      rejectedSangha:    parseInt(rejectedSangha.rows[0].count),
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
      `SELECT sp.id, sp.user_id, sp.sangha_name AS name, sp.location,
              sp.contact_person, sp.area_covered, sp.status, sp.created_at,
              u.email, u.phone
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.status = 'pending_approval'
       ORDER BY sp.created_at DESC`
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
      `SELECT sp.id, sp.user_id, sp.sangha_name AS name, sp.location,
              sp.contact_person, sp.area_covered, sp.status, sp.created_at,
              u.email, u.phone
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       ORDER BY sp.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/sangha/approve/:id ──────────────────────────
// :id here is sangha_profiles.user_id (the sangha's user id)
const approveSangha = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await pool.query(
      `UPDATE sangha_profiles
       SET status='approved', approved_at=NOW(), approved_by=$1
       WHERE user_id=$2
       RETURNING id`,
      [adminId === 'hardcoded-admin' ? null : adminId, id]
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
      `UPDATE sangha_profiles
       SET status='rejected', rejection_reason=$1
       WHERE user_id=$2
       RETURNING id`,
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
// All approved users across all sanghas
const getApprovedUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone,
              p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
              p.sangha_id,
              pd.first_name, pd.last_name, pd.gender,
              sp.sangha_name
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sangha_profiles sp ON sp.user_id = p.sangha_id
       WHERE p.status = 'approved'
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/pending ─────────────────────────────────
// Pending users — optionally filtered by ?sangha_id=xxx
const getPendingUsers = async (req, res) => {
  try {
    const { sangha_id } = req.query;

    let query = `
      SELECT u.id, u.email, u.phone,
             p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
             p.sangha_id,
             pd.first_name, pd.last_name,
             sp.sangha_name
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN sangha_profiles sp ON sp.user_id = p.sangha_id
      WHERE p.status IN ('submitted', 'under_review')
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
// Admin approves a user directly — sangha does NOT need to re-approve
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

    const reviewerId = adminId === 'hardcoded-admin' ? null : adminId;

    await pool.query(
      `UPDATE profiles
       SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2
       WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );

    // Only insert history if we have a real reviewer UUID
    if (reviewerId) {
      await pool.query(
        `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
         VALUES ($1, 'approved', $2, $3)`,
        [profileId, reviewerId, comment || null]
      );
    }

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
    const reviewerId = adminId === 'hardcoded-admin' ? null : adminId;

    await pool.query(
      `UPDATE profiles
       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2
       WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );

    if (reviewerId) {
      await pool.query(
        `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
         VALUES ($1, 'rejected', $2, $3)`,
        [profileId, reviewerId, comment || null]
      );
    }

    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/all ─────────────────────────────────────
// All users regardless of status (for full user management)
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.created_at,
              p.id AS profile_id, p.status, p.submitted_at,
              p.overall_completion_pct, p.sangha_id,
              pd.first_name, pd.last_name, pd.gender,
              sp.sangha_name
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       LEFT JOIN sangha_profiles sp ON sp.user_id = p.sangha_id
       WHERE u.role = 'user' AND u.is_deleted = FALSE
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  loginAdmin,
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
};
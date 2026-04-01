const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');

// ─── POST /sangha/register ───────────────────────────────────
const registerSangha = async (req, res) => {
  try {
    const { sangha_name, location, contact_person, area_covered, phone, email, password } = req.body;

    if (!sangha_name || !location || !contact_person || !password || (!phone && !email)) {
      return res.status(400).json({ message: 'sangha_name, location, contact_person, password and phone or email are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR phone=$2',
      [email || null, phone || null]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'An account with this email or phone already exists' });

    const password_hash = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      `INSERT INTO users (role, email, phone, password_hash, is_active)
       VALUES ('sangha', $1, $2, $3, true) RETURNING id`,
      [email || null, phone || null, password_hash]
    );
    const userId = userRes.rows[0].id;

    await pool.query(
      `INSERT INTO sangha_profiles (user_id, sangha_name, location, contact_person, area_covered, status)
       VALUES ($1, $2, $3, $4, $5, 'pending_approval')`,
      [userId, sangha_name, location, contact_person, area_covered || null]
    );

    res.status(201).json({ message: 'Sangha registered successfully. Awaiting admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/login ──────────────────────────────────────
const loginSangha = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ message: 'Identifier and password are required' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT u.id, u.role, u.email, u.phone, u.password_hash, u.is_active, u.is_deleted,
              sp.status AS sangha_status, sp.sangha_name, sp.id AS sangha_profile_id
       FROM users u
       LEFT JOIN sangha_profiles sp ON sp.user_id = u.id
       WHERE ${isEmail ? 'u.email' : 'u.phone'} = $1 AND u.role = 'sangha'`,
      [identifier]
    );

    if (userRes.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = userRes.rows[0];

    if (!user.is_active || user.is_deleted)
      return res.status(401).json({ message: 'Account is disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);

    const token = signToken({ id: user.id, role: user.role });

    res.json({
      token,
      role: user.role,
      sanghaStatus: user.sangha_status,
      sanghaName: user.sangha_name,
      email: user.email,
      phone: user.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/profile ─────────────────────────────────────
const getSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      `SELECT sp.*, u.email, u.phone
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PUT /sangha/profile ─────────────────────────────────────
const updateSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sangha_name, location, contact_person, area_covered } = req.body;

    const result = await pool.query(
      `UPDATE sangha_profiles
       SET sangha_name=$1, location=$2, contact_person=$3, area_covered=$4, updated_at=NOW()
       WHERE user_id=$5 RETURNING *`,
      [sangha_name, location, contact_person, area_covered || null, userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha profile not found' });
    res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/dashboard ───────────────────────────────────
// FIXED: now filters all counts by this sangha's sangha_id
const getDashboard = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;

    const [pending, approved, rejected, changesRequested, total] = await Promise.all([
      pool.query(
        "SELECT COUNT(*) FROM profiles WHERE status='submitted' AND sangha_id=$1",
        [sanghaId]
      ),
      pool.query(
        "SELECT COUNT(*) FROM profiles WHERE status='approved' AND sangha_id=$1",
        [sanghaId]
      ),
      pool.query(
        "SELECT COUNT(*) FROM profiles WHERE status='rejected' AND sangha_id=$1",
        [sanghaId]
      ),
      pool.query(
        "SELECT COUNT(*) FROM profiles WHERE status='changes_requested' AND sangha_id=$1",
        [sanghaId]
      ),
      pool.query(
        "SELECT COUNT(*) FROM profiles WHERE sangha_id=$1",
        [sanghaId]
      ),
    ]);

    res.json({
      pendingApplications: parseInt(pending.rows[0].count),
      approvedUsers:       parseInt(approved.rows[0].count),
      rejectedUsers:       parseInt(rejected.rows[0].count),
      changesRequested:    parseInt(changesRequested.rows[0].count),
      totalUsers:          parseInt(total.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/members ─────────────────────────────────────
const getMembers = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone,
              p.id AS profile_id, p.status, p.overall_completion_pct, p.submitted_at,
              pd.first_name, pd.last_name, pd.gender
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1
       ORDER BY p.updated_at DESC`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/pending-users ───────────────────────────────
const getPendingUsers = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone,
              p.id AS profile_id, p.status, p.submitted_at,
              p.overall_completion_pct,
              pd.first_name, pd.last_name
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.status IN ('submitted', 'under_review') AND p.sangha_id = $1
       ORDER BY p.submitted_at DESC`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/review-user/:id ─────────────────────────────
const getUserForReview = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const userRes = await pool.query(
      'SELECT id, email, phone FROM users WHERE id=$1 AND is_deleted=FALSE',
      [userId]
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const profileRes = await pool.query(
      'SELECT * FROM profiles WHERE user_id=$1',
      [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const profile = profileRes.rows[0];
    const pid = profile.id;

    const [s1, s2, s3fi, s3mem, s4, s5, s6eco, s6ins, s6doc] = await Promise.all([
      pool.query('SELECT * FROM personal_details  WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM religious_details WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM family_info        WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM family_members     WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM addresses          WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM member_education   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM economic_details   WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM member_insurance   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM member_documents   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
    ]);

    res.json({
      user:    userRes.rows[0],
      profile,
      step1:   s1.rows[0]  || null,
      step2:   s2.rows[0]  || null,
      step3: { family_info: s3fi.rows[0] || null, members: s3mem.rows },
      step4:   s4.rows,
      step5:   s5.rows,
      step6: { economic: s6eco.rows[0] || null, insurance: s6ins.rows, documents: s6doc.rows },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/approve ─────────────────────────────────────
const approveUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;

    const profileRes = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId, status } = profileRes.rows[0];

    // If admin already approved, sangha cannot override
    if (status === 'approved')
      return res.status(409).json({ message: 'Profile already approved' });

    await pool.query(
      `UPDATE profiles
       SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2
       WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );

    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1, 'approved', $2, $3)`,
      [profileId, reviewerId, comment || null]
    );

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/reject ──────────────────────────────────────
const rejectUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;

    const profileRes = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    // If admin already approved, sangha cannot reject
    const { id: profileId, status } = profileRes.rows[0];
    if (status === 'approved')
      return res.status(409).json({ message: 'Cannot reject an already approved profile' });

    await pool.query(
      `UPDATE profiles
       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2
       WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );

    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1, 'rejected', $2, $3)`,
      [profileId, reviewerId, comment || null]
    );

    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/request-changes ────────────────────────────
const requestChanges = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;

    if (!comment)
      return res.status(400).json({ message: 'Comment is required when requesting changes' });

    const profileRes = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId, status } = profileRes.rows[0];

    if (status === 'approved')
      return res.status(409).json({ message: 'Cannot request changes on an already approved profile' });

    await pool.query(
      `UPDATE profiles
       SET status='changes_requested', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2
       WHERE id=$3`,
      [reviewerId, comment, profileId]
    );

    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1, 'changes_requested', $2, $3)`,
      [profileId, reviewerId, comment]
    );

    res.json({ message: 'Changes requested successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/reports ──────────────────────────────────────
const getReports = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='approved')                       AS approved_users,
         COUNT(*) FILTER (WHERE status='rejected')                       AS rejected_users,
         COUNT(*) FILTER (WHERE status IN ('submitted','under_review'))  AS pending_users,
         COUNT(*) FILTER (WHERE status='changes_requested')              AS changes_requested,
         COUNT(*)                                                         AS total_users
       FROM profiles
       WHERE sangha_id = $1`,
      [sanghaId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/activity-logs ────────────────────────────────
const getActivityLogs = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT prh.id, prh.action, prh.comment, prh.created_at,
              pd.first_name, pd.last_name,
              u.email, u.phone
       FROM profile_review_history prh
       JOIN profiles p ON p.id = prh.profile_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE prh.performed_by = $1
       ORDER BY prh.created_at DESC
       LIMIT 100`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/all (admin only) ────────────────────────────
const getAllSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.id, sp.sangha_name, sp.location, sp.contact_person,
              sp.area_covered, sp.status, sp.created_at,
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

// ─── GET /sangha/:id (admin only) ────────────────────────────
const getSanghaById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, u.email, u.phone
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/team-members ────────────────────────────────
const getTeamMembers = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT * FROM sangha_members WHERE sangha_user_id=$1 ORDER BY created_at DESC`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/team-members ───────────────────────────────
const addTeamMember = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const { fullName, gender, phone, email, dob, role, memberType } = req.body;

    if (!fullName || !role)
      return res.status(400).json({ message: 'Full name and role are required' });

    const result = await pool.query(
      `INSERT INTO sangha_members
         (sangha_user_id, full_name, gender, phone, email, dob, role, member_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [sanghaId, fullName, gender || null, phone || null,
       email || null, dob || null, role, memberType || null]
    );
    res.status(201).json({ message: 'Member added', member: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /sangha/team-members/:memberId ───────────────────
const deleteTeamMember = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const { memberId } = req.params;

    const result = await pool.query(
      `DELETE FROM sangha_members WHERE id=$1 AND sangha_user_id=$2 RETURNING id`,
      [memberId, sanghaId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Member not found' });

    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /sangha/approved-list (public for user dropdown) ────
const getApprovedSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, sp.sangha_name, sp.location
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.status = 'approved'
       ORDER BY sp.sangha_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerSangha, loginSangha,
  getSanghaProfile, updateSanghaProfile,
  getDashboard,
  getMembers, getPendingUsers, getUserForReview,
  approveUser, rejectUser, requestChanges,
  getReports, getActivityLogs,
  getAllSanghas, getSanghaById,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getApprovedSanghas,
};
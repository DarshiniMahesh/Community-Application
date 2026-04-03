const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const path = require('path');
const fs = require('fs');

// ─── OTP helper — writes to users table columns ───────────────
// For register: user row created first with is_active=false, then activated on verify
// For login/forgot: user already exists, just update otp columns
const DEMO_OTP = '123456';

async function writeOtp(identifier) {
  const isEmail = identifier.includes('@');
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await pool.query(
    `UPDATE users SET otp_code=$1, otp_expires_at=$2
     WHERE ${isEmail ? 'email' : 'phone'} = $3`,
    [DEMO_OTP, expires, identifier]
  );
  console.log(`[DEV] OTP for ${identifier}: ${DEMO_OTP}`);
}

async function checkOtp(identifier, otp) {
  const isEmail = identifier.includes('@');
  const result = await pool.query(
    `SELECT id, otp_code, otp_expires_at FROM users
     WHERE ${isEmail ? 'email' : 'phone'} = $1`,
    [identifier]
  );
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  if (user.otp_code !== otp) return null;
  if (new Date() > new Date(user.otp_expires_at)) return null;
  // Clear OTP after use
  await pool.query(
    `UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE id=$1`,
    [user.id]
  );
  return user;
}

// ════════════════════════════════════════════════════════════
// REGISTER — Step 1: collect details + password → send OTP
// POST /sangha/register/send-otp
// ════════════════════════════════════════════════════════════
const registerSendOtp = async (req, res) => {
  try {
    const { sangha_name, location, contact_person, area_covered, email, phone, password } = req.body;

    if (!sangha_name || !location || !contact_person || !password || (!email && !phone)) {
      return res.status(400).json({
        message: 'sangha_name, location, contact_person, password and email or phone are required',
      });
    }
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    // Check duplicate
    const existing = await pool.query(
      'SELECT id, is_active FROM users WHERE email=$1 OR phone=$2',
      [email || null, phone || null]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      // If user exists but is_active=false, it's an incomplete registration — allow re-send OTP
      if (existingUser.is_active) {
        return res.status(409).json({ message: 'An account with this email or phone already exists' });
      }
      // Re-use existing inactive user row — update password and sangha details
      const password_hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET password_hash=$1, otp_code=NULL, otp_expires_at=NULL WHERE id=$2`,
        [password_hash, existingUser.id]
      );
      // Update or insert sangha_profiles
      await pool.query(
        `INSERT INTO sangha_profiles (user_id, sangha_name, location, contact_person, area_covered, status)
         VALUES ($1,$2,$3,$4,$5,'pending_approval')
         ON CONFLICT (user_id) DO UPDATE
         SET sangha_name=$2, location=$3, contact_person=$4, area_covered=$5`,
        [existingUser.id, sangha_name, location, contact_person, area_covered || null]
      );
    } else {
      // Fresh registration — create user row with is_active=false (pending OTP)
      const password_hash = await bcrypt.hash(password, 10);
      const userRes = await pool.query(
        `INSERT INTO users (role, email, phone, password_hash, is_active)
         VALUES ('sangha', $1, $2, $3, false) RETURNING id`,
        [email || null, phone || null, password_hash]
      );
      const userId = userRes.rows[0].id;
      await pool.query(
        `INSERT INTO sangha_profiles (user_id, sangha_name, location, contact_person, area_covered, status)
         VALUES ($1,$2,$3,$4,$5,'pending_approval')`,
        [userId, sangha_name, location, contact_person, area_covered || null]
      );
    }

    // Write OTP — identifier is email if provided, else phone
    const identifier = email || phone;
    await writeOtp(identifier);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// REGISTER — Step 2: verify OTP → activate account
// POST /sangha/register/verify-otp
// ════════════════════════════════════════════════════════════
const registerVerifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp)
      return res.status(400).json({ message: 'Identifier and OTP are required' });

    const otpUser = await checkOtp(identifier, otp);
    if (!otpUser)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    // Activate user
    await pool.query(
      `UPDATE users SET is_active=true, updated_at=NOW() WHERE id=$1`,
      [otpUser.id]
    );

    // Fetch sangha profile for response
    const profileRes = await pool.query(
      `SELECT sp.sangha_name, sp.status, u.role, u.email, u.phone
       FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1`,
      [otpUser.id]
    );
    const profile = profileRes.rows[0];

    const token = signToken({ id: otpUser.id, role: 'sangha' });
    res.status(201).json({
      token,
      role: 'sangha',
      sanghaStatus: profile?.status ?? 'pending_approval',
      sanghaName: profile?.sangha_name ?? '',
      message: 'Registration successful! Awaiting admin approval.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// LOGIN — Step 1: verify credentials → send OTP
// POST /sangha/login/send-otp
// ════════════════════════════════════════════════════════════
const loginSendOtp = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ message: 'Identifier and password are required' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT u.id, u.password_hash, u.is_active, u.is_deleted
       FROM users u
       WHERE ${isEmail ? 'u.email' : 'u.phone'} = $1 AND u.role = 'sangha'`,
      [identifier]
    );

    if (userRes.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = userRes.rows[0];

    if (user.is_deleted)
      return res.status(401).json({ message: 'Account has been deleted' });
    if (!user.is_active)
      return res.status(401).json({ message: 'Account is not active. Please complete registration.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Invalid credentials' });

    await writeOtp(identifier);
    res.json({ message: 'Credentials verified. OTP sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// LOGIN — Step 2: verify OTP → return token
// POST /sangha/login/verify-otp
// ════════════════════════════════════════════════════════════
const loginVerifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp)
      return res.status(400).json({ message: 'Identifier and OTP are required' });

    const otpUser = await checkOtp(identifier, otp);
    if (!otpUser)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT u.id, u.role, u.email, u.phone,
              sp.status AS sangha_status, sp.sangha_name
       FROM users u
       LEFT JOIN sangha_profiles sp ON sp.user_id = u.id
       WHERE ${isEmail ? 'u.email' : 'u.phone'} = $1 AND u.role = 'sangha'`,
      [identifier]
    );
    const user = userRes.rows[0];

    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      token,
      role: user.role,
      sanghaStatus: user.sangha_status,
      sanghaName:   user.sangha_name,
      email:        user.email,
      phone:        user.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD — Step 1: send OTP
// POST /sangha/forgot-password/send-otp
// ════════════════════════════════════════════════════════════
const forgotSendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier)
      return res.status(400).json({ message: 'Identifier is required' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT id FROM users WHERE ${isEmail ? 'email' : 'phone'} = $1 AND role='sangha' AND is_active=true`,
      [identifier]
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'No active Sangha account found with this email/phone' });

    await writeOtp(identifier);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD — Step 2: verify OTP
// POST /sangha/forgot-password/verify-otp
// ════════════════════════════════════════════════════════════
const forgotVerifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp)
      return res.status(400).json({ message: 'Identifier and OTP are required' });

    // We verify but DON'T clear otp yet — reset endpoint needs it
    // So do a read-only check here, then write a fresh verified marker OTP
    const isEmail = identifier.includes('@');
    const result = await pool.query(
      `SELECT id, otp_code, otp_expires_at FROM users
       WHERE ${isEmail ? 'email' : 'phone'} = $1 AND role='sangha'`,
      [identifier]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Account not found' });

    const user = result.rows[0];
    if (user.otp_code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expires_at))
      return res.status(400).json({ message: 'OTP has expired' });

    // Keep the OTP in DB but extend expiry by 15 min so reset can use it
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      `UPDATE users SET otp_expires_at=$1 WHERE id=$2`,
      [newExpiry, user.id]
    );

    res.json({ message: 'OTP verified. You may now reset your password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD — Step 3: reset password
// POST /sangha/forgot-password/reset
// ════════════════════════════════════════════════════════════
const forgotReset = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword)
      return res.status(400).json({ message: 'Identifier, OTP and new password are required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    // Final OTP check + clear
    const otpUser = await checkOtp(identifier, otp);
    if (!otpUser)
      return res.status(400).json({ message: 'Invalid or expired OTP. Please restart.' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`,
      [password_hash, otpUser.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════
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

const updateSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const {
      sangha_name, location, contact_person, area_covered,
      description, address_line, pincode, village_town,
      taluk, district, state,
      sangha_contact_same, sangha_phone, sangha_email, logo_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE sangha_profiles
       SET sangha_name=$1, location=$2, contact_person=$3, area_covered=$4,
           description=$5, address_line=$6, pincode=$7, village_town=$8,
           taluk=$9, district=$10, state=$11,
           sangha_contact_same=$12, sangha_phone=$13, sangha_email=$14,
           logo_url=$15, updated_at=NOW()
       WHERE user_id=$16 RETURNING *`,
      [
        sangha_name, location || district || '', contact_person, area_covered || null,
        description || null, address_line || null, pincode || null, village_town || null,
        taluk || null, district || null, state || null,
        sangha_contact_same ?? true,
        sangha_contact_same ? null : (sangha_phone || null),
        sangha_contact_same ? null : (sangha_email || null),
        logo_url || null,
        userId,
      ]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha profile not found' });
    res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /sangha/profile/logo ────────────────────────────────
const uploadSanghaLogo = async (req, res) => {
  try {
    const { id: userId } = req.user;
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' });

    const filename = `sangha_${userId}_${Date.now()}${path.extname(req.file.originalname)}`;
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const logo_url = `/uploads/logos/${filename}`;

    await pool.query(
      `UPDATE sangha_profiles SET logo_url=$1, updated_at=NOW() WHERE user_id=$2`,
      [logo_url, userId]
    );

    res.json({ logo_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
const getDashboard = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const [pending, approved, rejected, changesRequested, total] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='submitted' AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='approved' AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='rejected' AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='changes_requested' AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE sangha_id=$1", [sanghaId]),
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

// ════════════════════════════════════════════════════════════
// MEMBERS
// ════════════════════════════════════════════════════════════
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

const getPendingUsers = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone,
              p.id AS profile_id, p.status, p.submitted_at,
              p.overall_completion_pct, pd.first_name, pd.last_name
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

const getUserForReview = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const userRes = await pool.query(
      'SELECT id, email, phone FROM users WHERE id=$1 AND is_deleted=FALSE', [userId]
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
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
      user: userRes.rows[0], profile,
      step1: s1.rows[0] || null, step2: s2.rows[0] || null,
      step3: { family_info: s3fi.rows[0] || null, members: s3mem.rows },
      step4: s4.rows, step5: s5.rows,
      step6: { economic: s6eco.rows[0] || null, insurance: s6ins.rows, documents: s6doc.rows },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════
const approveUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;
    const profileRes = await pool.query('SELECT id, status FROM profiles WHERE user_id=$1', [userId]);
    if (profileRes.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    const { id: profileId, status } = profileRes.rows[0];
    if (status === 'approved') return res.status(409).json({ message: 'Profile already approved' });
    await pool.query(
      `UPDATE profiles SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'approved',$2,$3)`,
      [profileId, reviewerId, comment || null]
    );
    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectUser = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;
    const profileRes = await pool.query('SELECT id, status FROM profiles WHERE user_id=$1', [userId]);
    if (profileRes.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    const { id: profileId, status } = profileRes.rows[0];
    if (status === 'approved') return res.status(409).json({ message: 'Cannot reject an already approved profile' });
    await pool.query(
      `UPDATE profiles SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'rejected',$2,$3)`,
      [profileId, reviewerId, comment || null]
    );
    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const requestChanges = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { id: reviewerId } = req.user;
    if (!comment) return res.status(400).json({ message: 'Comment is required when requesting changes' });
    const profileRes = await pool.query('SELECT id, status FROM profiles WHERE user_id=$1', [userId]);
    if (profileRes.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    const { id: profileId, status } = profileRes.rows[0];
    if (status === 'approved') return res.status(409).json({ message: 'Cannot request changes on an already approved profile' });
    await pool.query(
      `UPDATE profiles SET status='changes_requested', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'changes_requested',$2,$3)`,
      [profileId, reviewerId, comment]
    );
    res.json({ message: 'Changes requested successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// REPORTS & LOGS
// ════════════════════════════════════════════════════════════
const getReports = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='approved')                      AS approved_users,
         COUNT(*) FILTER (WHERE status='rejected')                      AS rejected_users,
         COUNT(*) FILTER (WHERE status IN ('submitted','under_review')) AS pending_users,
         COUNT(*) FILTER (WHERE status='changes_requested')             AS changes_requested,
         COUNT(*)                                                        AS total_users
       FROM profiles WHERE sangha_id = $1`,
      [sanghaId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const result = await pool.query(
      `SELECT prh.id, prh.action, prh.comment, prh.created_at,
              pd.first_name, pd.last_name, u.email, u.phone
       FROM profile_review_history prh
       JOIN profiles p ON p.id = prh.profile_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE prh.performed_by = $1
       ORDER BY prh.created_at DESC LIMIT 100`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════
const getAllSanghas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.id, sp.sangha_name, sp.location, sp.contact_person,
              sp.area_covered, sp.status, sp.created_at, u.email, u.phone
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

const getSanghaById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, u.email, u.phone FROM sangha_profiles sp
       JOIN users u ON u.id = sp.user_id WHERE sp.user_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Sangha not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// TEAM MEMBERS
// ════════════════════════════════════════════════════════════
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

const addTeamMember = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const { fullName, gender, phone, email, dob, role, memberType } = req.body;
    if (!fullName || !role) return res.status(400).json({ message: 'Full name and role are required' });
    const result = await pool.query(
      `INSERT INTO sangha_members (sangha_user_id, full_name, gender, phone, email, dob, role, member_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [sanghaId, fullName, gender || null, phone || null, email || null, dob || null, role, memberType || null]
    );
    res.status(201).json({ message: 'Member added', member: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTeamMember = async (req, res) => {
  try {
    const { id: sanghaId } = req.user;
    const { memberId } = req.params;
    const result = await pool.query(
      `DELETE FROM sangha_members WHERE id=$1 AND sangha_user_id=$2 RETURNING id`,
      [memberId, sanghaId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// PUBLIC
// ════════════════════════════════════════════════════════════
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
  // Register OTP flow
  registerSendOtp, registerVerifyOtp,
  // Login OTP flow
  loginSendOtp, loginVerifyOtp,
  // Forgot password flow
  forgotSendOtp, forgotVerifyOtp, forgotReset,
  // Profile
  getSanghaProfile, updateSanghaProfile, uploadSanghaLogo,
  // Dashboard
  getDashboard,
  // Members
  getMembers, getPendingUsers, getUserForReview,
  // Actions
  approveUser, rejectUser, requestChanges,
  // Reports
  getReports, getActivityLogs,
  // Admin
  getAllSanghas, getSanghaById,
  // Team
  getTeamMembers, addTeamMember, deleteTeamMember,
  // Public
  getApprovedSanghas,
};
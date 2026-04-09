const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const path = require('path');
const fs = require('fs');

// ─── OTP helpers ──────────────────────────────────────────────
const DEMO_OTP = '123456';

async function writeOtp(identifier) {
  const isEmail = identifier.includes('@');
  const expires = new Date(Date.now() + 10 * 60 * 1000);
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
  await pool.query(
    `UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE id=$1`,
    [user.id]
  );
  return user;
}

async function getSanghaId(userId) {
  const res = await pool.query(
    'SELECT id FROM sanghas WHERE sangha_auth_id=$1', [userId]
  );
  return res.rows[0]?.id || null;
}

// ════════════════════════════════════════════════════════════
// REGISTER — Step 1
// POST /sangha/register/send-otp
// ════════════════════════════════════════════════════════════
const registerSendOtp = async (req, res) => {
  try {
    const { sangha_name, email, phone, password } = req.body;
    if (!sangha_name || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'sangha_name, password, and email or phone are required' });
    }
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const existing = await pool.query(
      'SELECT id, is_active FROM users WHERE email=$1 OR phone=$2',
      [email || null, phone || null]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.is_active) {
        return res.status(409).json({ message: 'An account with this email or phone already exists' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET password_hash=$1, otp_code=NULL, otp_expires_at=NULL WHERE id=$2`,
        [password_hash, existingUser.id]
      );
      await pool.query(
        `INSERT INTO sanghas (sangha_auth_id, sangha_name, email, phone, status)
         VALUES ($1,$2,$3,$4,'draft')
         ON CONFLICT (sangha_auth_id) DO UPDATE
         SET sangha_name=$2, status='draft'`,
        [existingUser.id, sangha_name, email || null, phone || null]
      );
    } else {
      const password_hash = await bcrypt.hash(password, 10);
      const userRes = await pool.query(
        `INSERT INTO users (role, email, phone, password_hash, is_active)
         VALUES ('sangha', $1, $2, $3, false) RETURNING id`,
        [email || null, phone || null, password_hash]
      );
      const userId = userRes.rows[0].id;
      await pool.query(
        `INSERT INTO sanghas (sangha_auth_id, sangha_name, email, phone, status)
         VALUES ($1,$2,$3,$4,'draft')`,
        [userId, sangha_name, email || null, phone || null]
      );
    }

    const identifier = email || phone;
    await writeOtp(identifier);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// REGISTER — Step 2
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

    await pool.query(
      `UPDATE users SET is_active=true, updated_at=NOW() WHERE id=$1`,
      [otpUser.id]
    );

    const sanghaRes = await pool.query(
      `SELECT sangha_name, status FROM sanghas WHERE sangha_auth_id=$1`,
      [otpUser.id]
    );
    const sangha = sanghaRes.rows[0];

    const token = signToken({ id: otpUser.id, role: 'sangha' });
    res.status(201).json({
      token,
      role: 'sangha',
      sanghaStatus: sangha?.status ?? 'draft',
      sanghaName:   sangha?.sangha_name ?? '',
      message: 'Registration successful! Please complete your profile.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// LOGIN — Step 1
// POST /sangha/login/send-otp
// ════════════════════════════════════════════════════════════
const loginSendOtp = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ message: 'Identifier and password are required' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT id, password_hash, is_active, is_deleted, is_blocked
       FROM users
       WHERE ${isEmail ? 'email' : 'phone'} = $1 AND role = 'sangha'`,
      [identifier]
    );

    if (userRes.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = userRes.rows[0];
    if (user.is_deleted)
      return res.status(401).json({ message: 'No account found with these details.' });
    if (!user.is_active)
      return res.status(401).json({ message: 'Account is not active. Please complete registration.' });
    if (user.is_blocked)
      return res.status(403).json({ message: 'Your account has been blocked. Please contact admin.' });

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
// LOGIN — Step 2
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
      `SELECT u.id, u.role, u.email, u.phone, u.is_blocked,
              s.status AS sangha_status, s.sangha_name
       FROM users u
       LEFT JOIN sanghas s ON s.sangha_auth_id = u.id
       WHERE ${isEmail ? 'u.email' : 'u.phone'} = $1 AND u.role = 'sangha'`,
      [identifier]
    );
    const user = userRes.rows[0];

    if (user.is_blocked)
      return res.status(403).json({ message: 'Your account has been blocked. Please contact admin.' });

    await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);

    const token = signToken({ id: user.id, role: user.role });
    res.json({
      token,
      role:         user.role,
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
// FORGOT PASSWORD — Step 1
// POST /sangha/forgot-password/send-otp
// ════════════════════════════════════════════════════════════
const forgotSendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier)
      return res.status(400).json({ message: 'Identifier is required' });

    const isEmail = identifier.includes('@');
    const userRes = await pool.query(
      `SELECT id FROM users
       WHERE ${isEmail ? 'email' : 'phone'} = $1 AND role='sangha' AND is_active=true`,
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
// FORGOT PASSWORD — Step 2
// POST /sangha/forgot-password/verify-otp
// ════════════════════════════════════════════════════════════
const forgotVerifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp)
      return res.status(400).json({ message: 'Identifier and OTP are required' });

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

    const newExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(`UPDATE users SET otp_expires_at=$1 WHERE id=$2`, [newExpiry, user.id]);

    res.json({ message: 'OTP verified. You may now reset your password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD — Step 3
// POST /sangha/forgot-password/reset
// ════════════════════════════════════════════════════════════
const forgotReset = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword)
      return res.status(400).json({ message: 'Identifier, OTP and new password are required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

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
// PROFILE — GET
// GET /sangha/profile
// ════════════════════════════════════════════════════════════
const getSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      `SELECT
         s.*,
         s.address_line  AS address_line_1,
         s.address_line2 AS address_line_2,
         s.address_line3 AS address_line_3,
         u.email AS reg_email,
         u.phone AS reg_phone
       FROM sanghas s
       JOIN users u ON u.id = s.sangha_auth_id
       WHERE s.sangha_auth_id = $1`,
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

// ════════════════════════════════════════════════════════════
// PROFILE — UPDATE
// PUT /sangha/profile
// ════════════════════════════════════════════════════════════
const updateSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const {
      sangha_name,
      description,
      address_line_1,
      address_line_2,
      address_line_3,
      city,
      pincode,
      village_town,
      taluk,
      district,
      state,
      sangha_contact_same,
      sangha_phone,
      sangha_email,
      logo_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE sanghas
       SET sangha_name=$1,
           description=$2,
           address_line=$3,
           address_line2=$4,
           address_line3=$5,
           city=$6,
           pincode=$7,
           village_town=$8,
           taluk=$9,
           district=$10,
           state=$11,
           sangha_contact_same=$12,
           sangha_phone=$13,
           sangha_email=$14,
           logo_url=$15,
           updated_at=NOW()
       WHERE sangha_auth_id=$16 RETURNING *`,
      [
        sangha_name,
        description        || null,
        address_line_1     || null,
        address_line_2     || null,
        address_line_3     || null,
        city               || null,
        pincode            || null,
        village_town       || null,
        taluk              || null,
        district           || null,
        state              || null,
        sangha_contact_same ?? true,
        sangha_contact_same ? null : (sangha_phone || null),
        sangha_contact_same ? null : (sangha_email || null),
        logo_url           || null,
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

// ════════════════════════════════════════════════════════════
// PROFILE — SUBMIT FOR APPROVAL
// POST /sangha/submit
// ════════════════════════════════════════════════════════════
const submitProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      `UPDATE sanghas
       SET status='pending_approval', updated_at=NOW()
       WHERE sangha_auth_id=$1
       RETURNING status`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Sangha not found' });
    res.json({ message: 'Profile submitted for approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// LOGO UPLOAD
// POST /sangha/profile/logo
// ════════════════════════════════════════════════════════════
const uploadSanghaLogo = async (req, res) => {
  try {
    const { id: userId } = req.user;
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' });

    const filename  = `sangha_${userId}_${Date.now()}${path.extname(req.file.originalname)}`;
    const uploadDir = path.join(__dirname, '../../../uploads/logos');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    const logo_url = `/uploads/logos/${filename}`;

    await pool.query(
      `UPDATE sanghas SET logo_url=$1, updated_at=NOW() WHERE sangha_auth_id=$2`,
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
// GET /sangha/dashboard
// ════════════════════════════════════════════════════════════
const getDashboard = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId)
      return res.status(404).json({ message: 'Sangha not found' });

    const [pending, approved, rejected, changesRequested, total] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='submitted'         AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='approved'          AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='rejected'          AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE status='changes_requested' AND sangha_id=$1", [sanghaId]),
      pool.query("SELECT COUNT(*) FROM profiles WHERE sangha_id=$1",                                [sanghaId]),
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
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked,
              p.id AS profile_id, p.status, p.overall_completion_pct, p.submitted_at,
              pd.first_name, pd.last_name, pd.gender
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1
       AND p.status = 'approved'
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
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.is_blocked,
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
      user: userRes.rows[0],
      profile,
      // FIX: ensure is_part_of_sangha is never null/undefined so UI logic works reliably
      step1: s1.rows.length > 0 ? {
        ...s1.rows[0],
        is_part_of_sangha: s1.rows[0].is_part_of_sangha || 'no',
      } : null,
      step2: s2.rows[0] || null,
      step3: { family_info: s3fi.rows[0] || null, members: s3mem.rows },
      step4: s4.rows,
      step5: s5.rows,
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

    const profileRes = await pool.query(
      'SELECT id, status, sangha_id FROM profiles WHERE user_id=$1',
      [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId, status, sangha_id } = profileRes.rows[0];
    if (status === 'approved')
      return res.status(409).json({ message: 'Profile already approved' });

    await pool.query(
      `UPDATE profiles SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment) VALUES ($1,'approved',$2,$3)`,
      [profileId, reviewerId, comment || null]
    );

    const personalRes = await pool.query(
      `SELECT first_name, middle_name, last_name, gender, date_of_birth,
              is_part_of_sangha, sangha_role, sangha_tenure
       FROM personal_details WHERE profile_id=$1`,
      [profileId]
    );

    if (personalRes.rows.length > 0) {
      const pd = personalRes.rows[0];
      if (pd.is_part_of_sangha === 'yes' && sangha_id) {
        const userRes = await pool.query(
          'SELECT email, phone FROM users WHERE id=$1', [userId]
        );
        const u = userRes.rows[0];

        const alreadyExists = await pool.query(
          `SELECT id FROM sangha_members
           WHERE sangha_id=$1
             AND (
               ($2::text IS NOT NULL AND email = $2)
               OR ($3::text IS NOT NULL AND phone = $3)
             )`,
          [sangha_id, u?.email || null, u?.phone || null]
        );

        if (alreadyExists.rows.length === 0) {
          let memberType = pd.sangha_tenure || null;
          if (memberType) {
            const t = memberType.toLowerCase().replace(/[_\s]/g, '');
            if (t === 'fulltime') memberType = 'Full Time';
            if (t === 'parttime') memberType = 'Part Time';
          }

          await pool.query(
            `INSERT INTO sangha_members
               (sangha_id, first_name, middle_name, last_name,
                gender, email, phone, dob, role, member_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              sangha_id,
              pd.first_name,
              pd.middle_name   || null,
              pd.last_name,
              pd.gender        || null,
              u?.email         || null,
              u?.phone         || null,
              pd.date_of_birth || null,
              pd.sangha_role   || null,
              memberType,
            ]
          );
        }
      }
    }

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
// BLOCK USER
// POST /sangha/block-user
// ════════════════════════════════════════════════════════════
const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id: sanghaUserId } = req.user;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const sanghaId = await getSanghaId(sanghaUserId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const profileCheck = await pool.query(
      `SELECT id FROM profiles WHERE user_id=$1 AND sangha_id=$2`,
      [userId, sanghaId]
    );
    if (profileCheck.rows.length === 0)
      return res.status(403).json({ message: 'User does not belong to your sangha' });

    const result = await pool.query(
      `UPDATE users SET is_blocked=TRUE, updated_at=NOW() WHERE id=$1 AND role='user' RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User blocked. They must contact admin to unblock.' });
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
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

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

// ════════════════════════════════════════════════════════════
// ACTIVITY LOGS
// GET /sangha/activity-logs
// ════════════════════════════════════════════════════════════
const getActivityLogs = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

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
         p.review_comment
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1
       ORDER BY COALESCE(p.submitted_at, p.created_at) DESC`,
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
      `SELECT s.id, s.sangha_name, s.district AS location,
              s.status, s.created_at, s.email, s.phone,
              s.address_line, s.state
       FROM sanghas s
       ORDER BY s.created_at DESC`
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
      `SELECT s.* FROM sanghas s WHERE s.sangha_auth_id = $1`,
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

// ════════════════════════════════════════════════════════════
// TEAM MEMBERS
// ════════════════════════════════════════════════════════════
const getTeamMembers = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT
         id,
         TRIM(CONCAT(first_name, ' ',
           COALESCE(middle_name || ' ', ''),
           last_name)) AS full_name,
         first_name,
         middle_name,
         last_name,
         gender,
         phone,
         email,
         dob,
         role,
         member_type,
         created_at
       FROM sangha_members
       WHERE sangha_id=$1
       ORDER BY created_at DESC`,
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
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const { firstName, middleName, lastName, gender, phone, email, dob, role, memberType } = req.body;

    if (!firstName || !lastName || !role) {
      return res.status(400).json({ message: 'First name, last name and role are required' });
    }
    if (!phone && !email) {
      return res.status(400).json({ message: 'At least one of phone or email is required' });
    }

    if (email || phone) {
      const existingUser = await pool.query(
        `SELECT id FROM users WHERE ($1::text IS NOT NULL AND email = $1) OR ($2::text IS NOT NULL AND phone = $2)`,
        [email || null, phone || null]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          message: 'A registered user with this email or phone already exists. They can apply directly through the app.',
        });
      }
    }

    if (email || phone) {
      const existingMember = await pool.query(
        `SELECT id FROM sangha_members
         WHERE sangha_id = $1
           AND (($2::text IS NOT NULL AND email = $2) OR ($3::text IS NOT NULL AND phone = $3))`,
        [sanghaId, email || null, phone || null]
      );
      if (existingMember.rows.length > 0) {
        return res.status(400).json({
          message: 'A member with this email or phone already exists in this Sangha.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO sangha_members
         (sangha_id, first_name, middle_name, last_name, gender, phone, email, dob, role, member_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        sanghaId,
        firstName,
        middleName || null,
        lastName,
        gender     || null,
        phone      || null,
        email      || null,
        dob        || null,
        role,
        memberType || null,
      ]
    );

    res.status(201).json({ message: 'Member added', member: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTeamMember = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const { memberId } = req.params;
    const result = await pool.query(
      `DELETE FROM sangha_members WHERE id=$1 AND sangha_id=$2 RETURNING id`,
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
      `SELECT s.id, s.sangha_name, s.district AS location
       FROM sanghas s
       WHERE s.status = 'approved'
       ORDER BY s.sangha_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerSendOtp, registerVerifyOtp,
  loginSendOtp, loginVerifyOtp,
  forgotSendOtp, forgotVerifyOtp, forgotReset,
  getSanghaProfile, updateSanghaProfile, uploadSanghaLogo,
  submitProfile,
  getDashboard,
  getMembers, getPendingUsers, getUserForReview,
  approveUser, rejectUser, requestChanges,
  blockUser,
  getReports, getActivityLogs,
  getAllSanghas, getSanghaById,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getApprovedSanghas,
};
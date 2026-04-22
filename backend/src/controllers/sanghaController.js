// Community-Application\backend\src\controllers\sanghaController.js
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
const getFullExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sections = [], includeAllStatuses = false } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });
 
    // Status filter
    const statusFilter = includeAllStatuses
      ? '' // no status restriction
      : `AND p.status = 'approved'`;
 
    // ── Base query: always include profile + user + personal details ──────────
    const baseRows = await pool.query(
      `SELECT
         p.id                                                                    AS profile_id,
         p.status                                                                AS "Status",
         u.id                                                                    AS user_id,
         u.email                                                                 AS "Email",
         u.phone                                                                 AS "Phone",
         TRIM(CONCAT(
           COALESCE(pd.first_name,''), ' ',
           COALESCE(pd.middle_name || ' ', ''),
           COALESCE(pd.last_name,'')
         ))                                                                      AS "Full Name",
         pd.gender::text                                                         AS "Gender",
         TO_CHAR(pd.date_of_birth,'DD-Mon-YYYY')                                AS "Date of Birth",
         TO_CHAR(p.submitted_at,'DD-Mon-YYYY')                                  AS "Submitted At",
         TO_CHAR(p.reviewed_at, 'DD-Mon-YYYY')                                  AS "Reviewed At"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1 ${statusFilter}
       ORDER BY "Full Name"
       LIMIT 5000`,
      [sanghaId]
    );
 
    // Build profile_id → row map
    const rowMap = new Map();
    for (const row of baseRows.rows) {
      rowMap.set(row.profile_id, { ...row });
    }
    const profileIds = baseRows.rows.map(r => r.profile_id);
 
    if (profileIds.length === 0) return res.json([]);
 
    // ── Economic Details ───────────────────────────────────────────────────────
    if (sections.includes('economic-details')) {
      const ecRows = await pool.query(
        `SELECT
           profile_id,
           self_income::text                                         AS "Self Income (Individual)",
           family_income::text                                       AS "Family Income (Annual)",
           fac_own_house                                             AS "Owns House",
           fac_agricultural_land                                     AS "Has Agricultural Land",
           fac_car                                                   AS "Has 4-Wheeler",
           fac_two_wheeler                                           AS "Has 2-Wheeler",
           fac_rented_house                                          AS "Renting"
         FROM economic_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const ec of ecRows.rows) {
        const r = rowMap.get(ec.profile_id);
        if (r) {
          r["Self Income (Individual)"]  = ec["Self Income (Individual)"];
          r["Family Income (Annual)"]    = ec["Family Income (Annual)"];
          r["Owns House"]               = ec["Owns House"];
          r["Has Agricultural Land"]    = ec["Has Agricultural Land"];
          r["Has 4-Wheeler"]            = ec["Has 4-Wheeler"];
          r["Has 2-Wheeler"]            = ec["Has 2-Wheeler"];
          r["Renting"]                  = ec["Renting"];
        }
      }
    }
 
    // ── Education & Profession ─────────────────────────────────────────────────
    if (sections.includes('education-profession')) {
      const eduRows = await pool.query(
        `SELECT
           me.profile_id,
           me.member_name                                            AS "Member Name",
           me.member_relation                                        AS "Relation",
           me.highest_education                                      AS "Education Level",
           me.profession_type::text                                  AS "Profession",
           me.is_currently_studying                                  AS "Currently Studying",
           me.is_currently_working                                   AS "Currently Working"
         FROM member_education me
         WHERE me.profile_id = ANY($1)
         ORDER BY me.sort_order`,
        [profileIds]
      );
      // Group by profile_id — use first record for single-row merge
      // For multi-member education, concatenate
      const eduMap = new Map();
      for (const edu of eduRows.rows) {
        if (!eduMap.has(edu.profile_id)) {
          eduMap.set(edu.profile_id, edu);
        } else {
          // Append additional members
          const existing = eduMap.get(edu.profile_id);
          existing["Member Name"] = `${existing["Member Name"] || ''} | ${edu["Member Name"] || ''}`.trim().replace(/^\|/, '');
          existing["Education Level"] = `${existing["Education Level"] || ''} | ${edu["Education Level"] || ''}`.trim().replace(/^\|/, '');
          existing["Profession"] = `${existing["Profession"] || ''} | ${edu["Profession"] || ''}`.trim().replace(/^\|/, '');
        }
      }
      for (const [pid, edu] of eduMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Member Name"]          = edu["Member Name"];
          r["Relation"]             = edu["Relation"];
          r["Education Level"]      = edu["Education Level"];
          r["Profession"]           = edu["Profession"];
          r["Currently Studying"]   = edu["Currently Studying"];
          r["Currently Working"]    = edu["Currently Working"];
        }
      }
    }
 
    // ── Family Information + Insurance ────────────────────────────────────────
    if (sections.includes('family-information')) {
      const fiRows = await pool.query(
        `SELECT profile_id, family_type::text AS "Family Type"
         FROM family_info WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const fi of fiRows.rows) {
        const r = rowMap.get(fi.profile_id);
        if (r) r["Family Type"] = fi["Family Type"];
      }
 
      const insRows = await pool.query(
        `SELECT
           profile_id,
           array_to_string(health_coverage,       ', ') AS "Health Coverage",
           array_to_string(life_coverage,         ', ') AS "Life Coverage",
           array_to_string(term_coverage,         ', ') AS "Term Coverage",
           array_to_string(konkani_card_coverage, ', ') AS "Konkani Card Coverage"
         FROM member_insurance
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      // Use first row per profile
      const insMap = new Map();
      for (const ins of insRows.rows) {
        if (!insMap.has(ins.profile_id)) insMap.set(ins.profile_id, ins);
      }
      for (const [pid, ins] of insMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Health Coverage"]       = ins["Health Coverage"];
          r["Life Coverage"]         = ins["Life Coverage"];
          r["Term Coverage"]         = ins["Term Coverage"];
          r["Konkani Card Coverage"] = ins["Konkani Card Coverage"];
        }
      }
    }
 
    // ── Location Information ───────────────────────────────────────────────────
    if (sections.includes('location-information')) {
      const addrRows = await pool.query(
        `SELECT profile_id, TRIM(city) AS "City", district AS "District", state AS "State", pincode AS "Pincode"
         FROM addresses
         WHERE profile_id = ANY($1)
         LIMIT 5000`,
        [profileIds]
      );
      // Use first address per profile
      const addrMap = new Map();
      for (const a of addrRows.rows) {
        if (!addrMap.has(a.profile_id)) addrMap.set(a.profile_id, a);
      }
      for (const [pid, addr] of addrMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["City"]     = addr["City"];
          r["District"] = addr["District"];
          r["State"]    = addr["State"];
          r["Pincode"]  = addr["Pincode"];
        }
      }
    }
 
    // ── Religious Details ──────────────────────────────────────────────────────
    if (sections.includes('religious-details')) {
      const relRows = await pool.query(
        `SELECT profile_id, gotra AS "Gotra", pravara AS "Pravara", kuladevata AS "Kuladevata"
         FROM religious_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const rel of relRows.rows) {
        const r = rowMap.get(rel.profile_id);
        if (r) {
          r["Gotra"]      = rel["Gotra"];
          r["Pravara"]    = rel["Pravara"];
          r["Kuladevata"] = rel["Kuladevata"];
        }
      }
    }
 
    // ── Document Status ────────────────────────────────────────────────────────
    if (sections.includes('personal-details')) {
      const docRows = await pool.query(
        `SELECT
           profile_id,
           aadhaar_coverage::text  AS "Aadhaar",
           pan_coverage::text      AS "PAN Card",
           voter_id_coverage::text AS "Voter ID",
           land_doc_coverage::text AS "Land Docs",
           dl_coverage::text       AS "DL"
         FROM member_documents
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      const docMap = new Map();
      for (const d of docRows.rows) {
        if (!docMap.has(d.profile_id)) docMap.set(d.profile_id, d);
      }
      for (const [pid, doc] of docMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Aadhaar"]   = doc["Aadhaar"];
          r["PAN Card"]  = doc["PAN Card"];
          r["Voter ID"]  = doc["Voter ID"];
          r["Land Docs"] = doc["Land Docs"];
          r["DL"]        = doc["DL"];
        }
      }
    }
 
    // ── Clean up internal keys before responding ───────────────────────────────
    const result = Array.from(rowMap.values()).map(row => {
      const { profile_id, user_id, ...rest } = row;
      return rest;
    });
 
    res.json(result);
 
  } catch (err) {
    console.error('[getFullExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};
 
// ─── Also update getEnhancedReports to include daily rejections ───────────────
// In getEnhancedReports, replace the dailyRegs query with:
//
//   pool.query(
//     `SELECT
//        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
//        COUNT(*) AS registrations,
//        COUNT(*) FILTER (WHERE status='approved') AS approvals,
//        COUNT(*) FILTER (WHERE status='rejected') AS rejections
//      FROM profiles
//      WHERE sangha_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
//      GROUP BY DATE(created_at)
//      ORDER BY DATE(created_at) ASC`,
//     [sanghaId]
//   ),

// ════════════════════════════════════════════════════════════
// LOGIN — Step 2
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
// FORGOT PASSWORD
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
// PROFILE
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

const updateSanghaProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const {
      sangha_name, description, address_line_1, address_line_2, address_line_3,
      city, pincode, village_town, taluk, district, state,
      sangha_contact_same, sangha_phone, sangha_email, logo_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE sanghas
       SET sangha_name=$1, description=$2, address_line=$3, address_line2=$4,
           address_line3=$5, city=$6, pincode=$7, village_town=$8, taluk=$9,
           district=$10, state=$11, sangha_contact_same=$12, sangha_phone=$13,
           sangha_email=$14, logo_url=$15, updated_at=NOW()
       WHERE sangha_auth_id=$16 RETURNING *`,
      [
        sangha_name, description || null, address_line_1 || null, address_line_2 || null,
        address_line_3 || null, city || null, pincode || null, village_town || null,
        taluk || null, district || null, state || null, sangha_contact_same ?? true,
        sangha_contact_same ? null : (sangha_phone || null),
        sangha_contact_same ? null : (sangha_email || null),
        logo_url || null, userId,
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

const submitProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      `UPDATE sanghas SET status='pending_approval', updated_at=NOW()
       WHERE sangha_auth_id=$1 RETURNING status`,
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
// ════════════════════════════════════════════════════════════
const getDashboard = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId)
      return res.status(404).json({ message: 'Sangha not found' });

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
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT
         u.id, u.email, u.phone,
         p.id AS profile_id, p.status, p.overall_completion_pct,
         p.submitted_at, p.reviewed_at,
         pd.first_name, pd.last_name
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1 AND p.status = 'approved'
       ORDER BY p.reviewed_at DESC`,
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
      step1: s1.rows.length > 0 ? {
        ...s1.rows[0],
        is_part_of_sangha:
          s1.rows[0].is_part_of_sangha === 'yes' || s1.rows[0].is_part_of_sangha === true
            ? 'yes' : 'no',
        sangha_role:   s1.rows[0].sangha_role   || '',
        sangha_tenure: s1.rows[0].sangha_tenure || '',
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
// MEMBER REQUESTS
// ════════════════════════════════════════════════════════════
const getMemberRequests = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);

    const result = await pool.query(
      `SELECT ms.id, ms.profile_id, ms.sangha_id, ms.sangha_name,
              ms.role, ms.tenure, ms.status,
              pd.first_name, pd.last_name,
              u.email, u.phone
       FROM member_sanghas ms
       JOIN profiles p ON p.id = ms.profile_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE ms.sangha_id = $1 AND ms.status = 'pending'
       ORDER BY ms.created_at DESC`,
      [sanghaId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const approveMemberRequest = async (req, res) => {
  try {
    const { entryId } = req.body;
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);

    const entryRes = await pool.query(
      `SELECT ms.*, p.user_id, pd.first_name, pd.last_name
       FROM member_sanghas ms
       JOIN profiles p ON p.id = ms.profile_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE ms.id = $1`,
      [entryId]
    );

    if (entryRes.rows.length === 0)
      return res.status(404).json({ message: 'Request not found' });

    const entry = entryRes.rows[0];

    await pool.query(`UPDATE member_sanghas SET status='approved' WHERE id=$1`, [entryId]);

    const userRes = await pool.query('SELECT email, phone FROM users WHERE id=$1', [entry.user_id]);
    const u = userRes.rows[0];

    await pool.query(
      `DELETE FROM sangha_members WHERE sangha_id=$1
       AND (($2::text IS NOT NULL AND email=$2) OR ($3::text IS NOT NULL AND phone=$3))`,
      [sanghaId, u?.email || null, u?.phone || null]
    );

    await pool.query(
      `INSERT INTO sangha_members (sangha_id, first_name, last_name, email, phone, role, member_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [sanghaId, entry.first_name || null, entry.last_name || null,
       u?.email || null, u?.phone || null, entry.role || null, entry.tenure || null]
    );

    res.json({ message: 'Member request approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectMemberRequest = async (req, res) => {
  try {
    const { entryId } = req.body;
    await pool.query(`UPDATE member_sanghas SET status='rejected' WHERE id=$1`, [entryId]);
    res.json({ message: 'Member request rejected' });
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
      'SELECT id, status, sangha_id FROM profiles WHERE user_id=$1', [userId]
    );
    if (profileRes.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: profileId, status, sangha_id } = profileRes.rows[0];
    if (status === 'approved')
      return res.status(409).json({ message: 'Profile already approved' });

    await pool.query(
      `UPDATE profiles SET status='approved', reviewed_by=$1,
       reviewed_at=(NOW() AT TIME ZONE 'UTC'), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1,'approved',$2,$3)`,
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
      if ((pd.is_part_of_sangha === 'yes' || pd.is_part_of_sangha === true) && sangha_id) {
        const userRes = await pool.query('SELECT email, phone FROM users WHERE id=$1', [userId]);
        const u = userRes.rows[0];

        await pool.query(
          `DELETE FROM sangha_members WHERE sangha_id=$1
           AND (($2::text IS NOT NULL AND email=$2) OR ($3::text IS NOT NULL AND phone=$3))`,
          [sangha_id, u?.email || null, u?.phone || null]
        );

        let memberType = pd.sangha_tenure || null;
        if (memberType) {
          const t = memberType.toLowerCase().replace(/[_\s]/g, '');
          if (t === 'fulltime') memberType = 'Full Time';
          if (t === 'parttime') memberType = 'Part Time';
        }

        await pool.query(
          `INSERT INTO sangha_members
             (sangha_id, first_name, middle_name, last_name, gender, email, phone, dob, role, member_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [sangha_id, pd.first_name, pd.middle_name || null, pd.last_name,
           pd.gender || null, u?.email || null, u?.phone || null,
           pd.date_of_birth || null, pd.sangha_role || null, memberType]
        );
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
      `UPDATE profiles SET status='rejected', reviewed_by=$1,
       reviewed_at=(NOW() AT TIME ZONE 'UTC'), review_comment=$2 WHERE id=$3`,
      [reviewerId, comment || null, profileId]
    );
    await pool.query(
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1,'rejected',$2,$3)`,
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
      `INSERT INTO profile_review_history (profile_id, action, performed_by, comment)
       VALUES ($1,'changes_requested',$2,$3)`,
      [profileId, reviewerId, comment]
    );
    res.json({ message: 'Changes requested successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

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

const getActivityLogs = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT
         p.id AS profile_id, u.id AS user_id, u.email, u.phone,
         pd.first_name, pd.last_name, p.status,
         p.submitted_at, p.reviewed_at, p.review_comment
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
              s.status, s.created_at, s.email, s.phone, s.address_line, s.state
       FROM sanghas s ORDER BY s.created_at DESC`
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
      `SELECT s.* FROM sanghas s WHERE s.sangha_auth_id = $1`, [req.params.id]
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
      `SELECT id,
         TRIM(CONCAT(first_name, ' ', COALESCE(middle_name || ' ', ''), last_name)) AS full_name,
         first_name, middle_name, last_name, gender, phone, email, dob, role, member_type, created_at
       FROM sangha_members WHERE sangha_id=$1 ORDER BY created_at DESC`,
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

    if (!firstName || !lastName || !role)
      return res.status(400).json({ message: 'First name, last name and role are required' });
    if (!phone && !email)
      return res.status(400).json({ message: 'At least one of phone or email is required' });

    if (email || phone) {
      const existingUser = await pool.query(
        `SELECT id FROM users WHERE ($1::text IS NOT NULL AND email=$1) OR ($2::text IS NOT NULL AND phone=$2)`,
        [email || null, phone || null]
      );
      if (existingUser.rows.length > 0)
        return res.status(400).json({
          message: 'A registered user with this email or phone already exists. They can apply directly through the app.',
        });

      const existingMember = await pool.query(
        `SELECT id FROM sangha_members WHERE sangha_id=$1
         AND (($2::text IS NOT NULL AND email=$2) OR ($3::text IS NOT NULL AND phone=$3))`,
        [sanghaId, email || null, phone || null]
      );
      if (existingMember.rows.length > 0)
        return res.status(400).json({
          message: 'A member with this email or phone already exists in this Sangha.',
        });
    }

    const result = await pool.query(
      `INSERT INTO sangha_members
         (sangha_id, first_name, middle_name, last_name, gender, phone, email, dob, role, member_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [sanghaId, firstName, middleName || null, lastName,
       gender || null, phone || null, email || null, dob || null, role, memberType || null]
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

    const memberRes = await pool.query(
      `SELECT email, phone FROM sangha_members WHERE id=$1 AND sangha_id=$2`,
      [memberId, sanghaId]
    );
    if (memberRes.rows.length === 0)
      return res.status(404).json({ message: 'Member not found' });

    const { email, phone } = memberRes.rows[0];

    await pool.query(`DELETE FROM sangha_members WHERE id=$1 AND sangha_id=$2`, [memberId, sanghaId]);

    if (email || phone) {
      await pool.query(
        `DELETE FROM member_sanghas WHERE sangha_id=$1
         AND profile_id IN (
           SELECT p.id FROM profiles p
           JOIN users u ON u.id = p.user_id
           WHERE ($2::text IS NOT NULL AND u.email=$2) OR ($3::text IS NOT NULL AND u.phone=$3)
         )`,
        [sanghaId, email || null, phone || null]
      );
    }

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
       FROM sanghas s WHERE s.status='approved' ORDER BY s.sangha_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ENHANCED REPORTS
// GET /sangha/reports/enhanced
// ════════════════════════════════════════════════════════════
const getEnhancedReports = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const [currentCounts, trendData, dailyRegs] = await Promise.all([

      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'approved')                       AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')                       AS rejected,
           COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review'))   AS pending,
           COUNT(*) FILTER (WHERE status = 'changes_requested')              AS changes_requested,
           COUNT(*) FILTER (WHERE status = 'draft')                          AS draft,
           COUNT(*)                                                           AS total
         FROM profiles WHERE sangha_id = $1`,
        [sanghaId]
      ),

      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='approved' AND reviewed_at >= NOW()-INTERVAL '30 days') AS approved_last30,
           COUNT(*) FILTER (WHERE status='approved' AND reviewed_at >= NOW()-INTERVAL '60 days'
                             AND reviewed_at < NOW()-INTERVAL '30 days')                         AS approved_prev30,
           COUNT(*) FILTER (WHERE submitted_at >= NOW()-INTERVAL '30 days')                      AS submitted_last30,
           COUNT(*) FILTER (WHERE submitted_at >= NOW()-INTERVAL '60 days'
                             AND submitted_at < NOW()-INTERVAL '30 days')                        AS submitted_prev30,
           COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days')                        AS total_last30,
           COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '60 days'
                             AND created_at < NOW()-INTERVAL '30 days')                          AS total_prev30
         FROM profiles WHERE sangha_id = $1`,
        [sanghaId]
      ),

      pool.query(
        `SELECT
           TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
           COUNT(*) AS registrations,
           COUNT(*) FILTER (WHERE status='approved') AS approvals
         FROM profiles
         WHERE sangha_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`,
        [sanghaId]
      ),
    ]);

    res.json({
      counts:             currentCounts.rows[0],
      trends:             trendData.rows[0],
      dailyRegistrations: dailyRegs.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ADVANCED REPORTS — FIXED & ENHANCED
// GET /sangha/reports/advanced
//
// FIX 1:  All data sourced from profiles table (sangha's registered users only,
//         NOT from sangha_members table which is manual team entries).
// FIX 2:  Insurance uses cardinality() for correct empty-array handling.
// FIX 3:  Gender "other" counted for any value not male/female.
// NEW 1:  totalPopulation = approved heads + all their family_members rows.
// NEW 2:  Income chart uses family_income (not self_income).
// NEW 3:  All cities returned (up to 100) to support frontend city filter.
// ════════════════════════════════════════════════════════════
const getAdvancedReports = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const safe = async (sql, params) => {
      try {
        return (await pool.query(sql, params)).rows;
      } catch (e) {
        console.warn('[AdvancedReports] Query skipped:', e.message);
        return [];
      }
    };

    // ── Total approved families ────────────────────────────
    const totalRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM profiles WHERE sangha_id=$1 AND status='approved'`,
      [sanghaId]
    );
    const totalApproved = parseInt(totalRes.rows[0]?.cnt || 0);

    // ── Total population = heads + all their family_members ─
    const populationRes = await pool.query(
      `SELECT
         COUNT(DISTINCT p.id) AS family_count,
         COALESCE((
           SELECT COUNT(*) FROM family_members fm
           JOIN profiles p2 ON p2.id = fm.profile_id
           WHERE p2.sangha_id=$1 AND p2.status='approved'
         ), 0) AS member_count
       FROM profiles p
       WHERE p.sangha_id=$1 AND p.status='approved'`,
      [sanghaId]
    );
    const popRow = populationRes.rows[0] || {};
    const totalPopulation = parseInt(popRow.family_count || 0) + parseInt(popRow.member_count || 0);

    const [
      genderRows,       // personal_details gender (head)
      memberGenderRows, // family_members gender (all dependents)
      ageRows,          // family_members dob
      pdAgeRows,        // personal_details date_of_birth (head)
      famTypeRows,
      maritalRows,
      degreeRows,
      professionRows,
      studyingRows,
      workingRows,
      cityRows,
      assetRows,
      healthInsRows,
      lifeInsRows,
      termInsRows,
      konkaniInsRows,
      aadhaarRows,
      panRows,
      voterRows,
      landRows,
      dlRows,
    ] = await Promise.all([

      // Gender — heads (personal_details)
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
          COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
          COUNT(*) FILTER (WHERE pd.gender IS NOT NULL
                             AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Gender — family members
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'male')   AS male,
          COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'female') AS female,
          COUNT(*) FILTER (WHERE fm.gender IS NOT NULL
                             AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
        FROM profiles p
        JOIN family_members fm ON fm.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Age — family_members.dob
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) < 19)             AS u18,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 19 AND 35) AS y35,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 36 AND 60) AS m60,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) > 60)             AS o60
        FROM profiles p
        JOIN family_members fm ON fm.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Age — personal_details.date_of_birth (head fallback)
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19)             AS u18,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 19 AND 35) AS y35,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 36 AND 60) AS m60,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) > 60)             AS o60
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Family type
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear,
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%')   AS joint
        FROM profiles p
        JOIN family_info fi ON fi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Marital status
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE pd.is_married = true)  AS married,
          COUNT(*) FILTER (WHERE pd.is_married = false) AS single
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Education degrees
      safe(`
        SELECT me.highest_education AS label, COUNT(*) AS count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.highest_education IS NOT NULL AND TRIM(me.highest_education) != ''
        GROUP BY me.highest_education ORDER BY count DESC LIMIT 10
      `, [sanghaId]),

      // Professions
      safe(`
        SELECT me.profession_type::text AS label, COUNT(*) AS count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.profession_type IS NOT NULL
        GROUP BY me.profession_type ORDER BY count DESC LIMIT 10
      `, [sanghaId]),

      // Currently studying
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE me.is_currently_studying = true)  AS yes_count,
          COUNT(*) FILTER (WHERE me.is_currently_studying = false) AS no_count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Currently working
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE me.is_currently_working = true)  AS yes_count,
          COUNT(*) FILTER (WHERE me.is_currently_working = false) AS no_count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.is_currently_working IS NOT NULL
      `, [sanghaId]),

      // Geographic — all cities (up to 100) so frontend can filter
      safe(`
        SELECT TRIM(a.city) AS city, COUNT(DISTINCT p.id) AS count
        FROM profiles p
        JOIN addresses a ON a.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND a.city IS NOT NULL AND TRIM(a.city) != ''
        GROUP BY TRIM(a.city)
        ORDER BY count DESC
        LIMIT 100
      `, [sanghaId]),

      // Assets
      safe(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ed.fac_own_house = true)        AS own_house,
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land = true) AS agri_land,
          COUNT(*) FILTER (WHERE ed.fac_car = true)              AS four_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler = true)      AS two_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_rented_house = true)     AS renting
        FROM profiles p
        JOIN economic_details ed ON ed.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // ── Insurance — FIX: use cardinality() for correct empty-array handling ──
      // Each row in member_insurance represents one person (head or family member).
      // cardinality(arr) returns 0 for empty arrays, unlike array_length which returns NULL.
      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.health_coverage IS NOT NULL
              AND cardinality(mi.health_coverage) > 0
              AND NOT (mi.health_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.health_coverage IS NULL
               OR cardinality(mi.health_coverage) = 0
               OR mi.health_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.life_coverage IS NOT NULL
              AND cardinality(mi.life_coverage) > 0
              AND NOT (mi.life_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.life_coverage IS NULL
               OR cardinality(mi.life_coverage) = 0
               OR mi.life_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.term_coverage IS NOT NULL
              AND cardinality(mi.term_coverage) > 0
              AND NOT (mi.term_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.term_coverage IS NULL
               OR cardinality(mi.term_coverage) = 0
               OR mi.term_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.konkani_card_coverage IS NOT NULL
              AND cardinality(mi.konkani_card_coverage) > 0
              AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.konkani_card_coverage IS NULL
               OR cardinality(mi.konkani_card_coverage) = 0
               OR mi.konkani_card_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Documents
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'yes')                   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'no')                    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'unknown'
                            OR md.aadhaar_coverage IS NULL)                                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'yes')     AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'no')      AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'unknown'
                            OR md.pan_coverage IS NULL)                      AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'yes')   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'no')    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'unknown'
                            OR md.voter_id_coverage IS NULL)                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'yes')   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'no')    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'unknown'
                            OR md.land_doc_coverage IS NULL)                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'yes')    AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'no')     AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'unknown'
                            OR md.dl_coverage IS NULL)                     AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),
    ]);

    // ── Merge age data ─────────────────────────────────────
    const fmAge = ageRows[0] || {};
    const pdAge = pdAgeRows[0] || {};
    const hasFmAge = (parseInt(fmAge.u18 || 0) + parseInt(fmAge.y35 || 0) +
                      parseInt(fmAge.m60 || 0) + parseInt(fmAge.o60 || 0)) > 0;
    const ageSource = hasFmAge ? fmAge : pdAge;

    // ── Merge gender: family_members (all) preferred over personal_details (head only) ──
    const fmG = memberGenderRows[0] || {};
    const pdG = genderRows[0] || {};
    const hasFmGender = (parseInt(fmG.male || 0) + parseInt(fmG.female || 0) + parseInt(fmG.other || 0)) > 0;
    const gSrc = hasFmGender ? fmG : pdG;

    const ft  = famTypeRows[0]  || {};
    const mar = maritalRows[0]  || {};
    const as  = assetRows[0]    || {};
    const st  = studyingRows[0] || {};
    const wk  = workingRows[0]  || {};

    const healthIns  = healthInsRows[0]  || {};
    const lifeIns    = lifeInsRows[0]    || {};
    const termIns    = termInsRows[0]    || {};
    const konkaniIns = konkaniInsRows[0] || {};

    const aadhaar = aadhaarRows[0] || {};
    const pan     = panRows[0]     || {};
    const voter   = voterRows[0]   || {};
    const land    = landRows[0]    || {};
    const dl      = dlRows[0]      || {};

    // ── Family income distribution (chart uses family_income) ──
    const familyIncomeSlabs = await (async () => {
      try {
        const rows = await pool.query(`
          SELECT ed.family_income::text AS label, COUNT(*) AS count
          FROM profiles p
          JOIN economic_details ed ON ed.profile_id = p.id
          WHERE p.sangha_id=$1 AND p.status='approved'
            AND ed.family_income IS NOT NULL
          GROUP BY ed.family_income ORDER BY count DESC
        `, [sanghaId]);
        return rows.rows.map(r => ({ label: r.label, count: parseInt(r.count || 0) }));
      } catch (e) {
        console.warn('[AdvancedReports] familyIncomeSlabs skipped:', e.message);
        return [];
      }
    })();

    // ── Employment breakdown ───────────────────────────────
    const employment = await (async () => {
      try {
        const rows = await pool.query(`
          SELECT me.profession_type::text AS label, COUNT(*) AS count
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id
          WHERE p.sangha_id=$1 AND p.status='approved'
            AND me.profession_type IS NOT NULL
          GROUP BY me.profession_type ORDER BY count DESC
        `, [sanghaId]);
        return rows.rows.map(r => ({ label: r.label, count: parseInt(r.count || 0) }));
      } catch (e) {
        console.warn('[AdvancedReports] employment skipped:', e.message);
        return [];
      }
    })();

    res.json({
      totalApproved,
      totalPopulation,  // NEW: includes heads + all family members

      demographics: {
        gender: {
          male:   parseInt(gSrc.male   || 0),
          female: parseInt(gSrc.female || 0),
          other:  parseInt(gSrc.other  || 0),  // FIX: counted from all members
        },
        ageGroups: [
          { label: '0–18',  count: parseInt(ageSource.u18 || 0) },
          { label: '19–35', count: parseInt(ageSource.y35 || 0) },
          { label: '36–60', count: parseInt(ageSource.m60 || 0) },
          { label: '60+',   count: parseInt(ageSource.o60 || 0) },
        ],
        familyType: {
          nuclear: parseInt(ft.nuclear || 0),
          joint:   parseInt(ft.joint   || 0),
        },
        maritalStatus: [
          { label: 'Married', count: parseInt(mar.married || 0) },
          { label: 'Single',  count: parseInt(mar.single  || 0) },
        ].filter(m => m.count > 0),
      },

      education: {
        degrees:    degreeRows.map(r => ({ label: r.label, count: parseInt(r.count || 0) })),
        studying:   { yes: parseInt(st.yes_count || 0), no: parseInt(st.no_count || 0) },
        working:    { yes: parseInt(wk.yes_count || 0), no: parseInt(wk.no_count || 0) },
        professions: professionRows.map(r => ({ label: r.label, count: parseInt(r.count || 0) })),
      },

      economic: {
        // FIX: Chart now uses family_income (annual household income)
        incomeSlabs: familyIncomeSlabs,

        assets: [
          { label: 'Own House',         owned: parseInt(as.own_house    || 0), total: parseInt(as.total || 0) },
          { label: 'Agricultural Land', owned: parseInt(as.agri_land    || 0), total: parseInt(as.total || 0) },
          { label: '4-Wheeler',         owned: parseInt(as.four_wheeler || 0), total: parseInt(as.total || 0) },
          { label: '2-Wheeler',         owned: parseInt(as.two_wheeler  || 0), total: parseInt(as.total || 0) },
          { label: 'Renting',           owned: parseInt(as.renting      || 0), total: parseInt(as.total || 0) },
        ],

        employment,
      },

      // FIX: Insurance counts all rows in member_insurance (head + dependents),
      // using cardinality() for correct empty-array detection.
      insurance: [
        { label: 'Health',       covered: parseInt(healthIns.covered  || 0), notCovered: parseInt(healthIns.not_covered  || 0) },
        { label: 'Life',         covered: parseInt(lifeIns.covered    || 0), notCovered: parseInt(lifeIns.not_covered    || 0) },
        { label: 'Term',         covered: parseInt(termIns.covered    || 0), notCovered: parseInt(termIns.not_covered    || 0) },
        { label: 'Konkani Card', covered: parseInt(konkaniIns.covered || 0), notCovered: parseInt(konkaniIns.not_covered || 0) },
      ],

      documents: [
        { label: 'Aadhaar',  yes: parseInt(aadhaar.yes_count || 0), no: parseInt(aadhaar.no_count || 0), unknown: parseInt(aadhaar.unknown_count || 0) },
        { label: 'PAN Card', yes: parseInt(pan.yes_count     || 0), no: parseInt(pan.no_count     || 0), unknown: parseInt(pan.unknown_count     || 0) },
        { label: 'Voter ID', yes: parseInt(voter.yes_count   || 0), no: parseInt(voter.no_count   || 0), unknown: parseInt(voter.unknown_count   || 0) },
        { label: 'Land Docs',yes: parseInt(land.yes_count    || 0), no: parseInt(land.no_count    || 0), unknown: parseInt(land.unknown_count    || 0) },
        { label: 'DL',       yes: parseInt(dl.yes_count      || 0), no: parseInt(dl.no_count      || 0), unknown: parseInt(dl.unknown_count      || 0) },
      ],

      // All cities returned — frontend handles display/filtering
      geographic: cityRows.map(r => ({ city: r.city, count: parseInt(r.count || 0) })),
    });

  } catch (err) {
    console.error('[getAdvancedReports]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// EXPORT DATA — FIXED
// POST /sangha/reports/export
//
// FIX 1: Empty filter no longer adds a WHERE clause that returns 0 rows.
// FIX 2: 'pending' status correctly maps to ('submitted','under_review').
// FIX 3: 'changes' correctly maps to 'changes_requested'.
// FIX 4: Income exports BOTH self_income AND family_income columns.
// FIX 5: All category exports properly join & return data.
// ════════════════════════════════════════════════════════════
const getExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { category, filter } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const BASE_SELECT = `
      SELECT DISTINCT
        TRIM(CONCAT(
          COALESCE(pd.first_name,''), ' ',
          COALESCE(pd.middle_name || ' ', ''),
          COALESCE(pd.last_name,'')
        ))                                    AS "Full Name",
        u.email                               AS "Email",
        u.phone                               AS "Phone",
        p.status                              AS "Status",
        TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At",
        TO_CHAR(p.reviewed_at, 'DD-Mon-YYYY') AS "Reviewed At"
    `;

    let extraCols  = '';
    let joinClause = '';
    // FIX: Default WHERE only targets this sangha's approved users from profiles
    let whereCond  = `WHERE p.sangha_id = $1 AND p.status = 'approved'`;
    let params     = [sanghaId];

    switch (category) {

      // ── Status filter ────────────────────────────────────
      case 'status': {
        // FIX: Map frontend filter values to actual DB status values
        const f = (filter || 'approved').toLowerCase();
        if (f === 'pending' || f === 'submitted') {
          // Pending = submitted + under_review
          whereCond = `WHERE p.sangha_id = $1 AND p.status IN ('submitted', 'under_review')`;
        } else if (f === 'changes' || f === 'changes_requested') {
          whereCond = `WHERE p.sangha_id = $1 AND p.status = 'changes_requested'`;
        } else {
          whereCond = `WHERE p.sangha_id = $1 AND p.status = $2`;
          params.push(f);
        }
        break;
      }

      // ── City ─────────────────────────────────────────────
      case 'city': {
        joinClause = `JOIN addresses a ON a.profile_id = p.id`;
        extraCols  = `, TRIM(a.city) AS "City", a.district AS "District", a.state AS "State", a.pincode AS "Pincode"`;
        if (filter) {
          whereCond += ` AND LOWER(TRIM(a.city)) = LOWER($2)`;
          params.push(filter);
        }
        break;
      }

      // ── Gender ───────────────────────────────────────────
      case 'gender': {
        extraCols = `, pd.gender::text AS "Gender", pd.date_of_birth AS "Date of Birth"`;
        if (filter) {
          whereCond += ` AND LOWER(pd.gender::text) = LOWER($2)`;
          params.push(filter);
        }
        break;
      }

      // ── Age group ────────────────────────────────────────
      case 'age_group': {
        extraCols = `, pd.gender::text AS "Gender",
                      pd.date_of_birth AS "Date of Birth",
                      EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth))::int AS "Age"`;
        whereCond += ` AND pd.date_of_birth IS NOT NULL`;
        const rangeMap = {
          '0–18':  `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19`,
          '19–35': `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 19 AND 35`,
          '36–60': `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 36 AND 60`,
          '60+':   `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) > 60`,
        };
        if (filter && rangeMap[filter]) whereCond += ` AND ${rangeMap[filter]}`;
        break;
      }

      // ── Income — exports BOTH self_income & family_income ─
      case 'income': {
        joinClause = `JOIN economic_details ed ON ed.profile_id = p.id`;
        extraCols  = `, ed.self_income::text AS "Self Income (Individual)",
                        ed.family_income::text AS "Family Income (Annual)"`;
        // FIX: Filter on family_income (which is what the chart shows)
        if (filter) {
          whereCond += ` AND ed.family_income::text = $2`;
          params.push(filter);
        }
        break;
      }

      // ── Asset ownership ───────────────────────────────────
      case 'asset': {
        joinClause = `JOIN economic_details ed ON ed.profile_id = p.id`;
        extraCols  = `, ed.self_income::text AS "Self Income",
                        ed.family_income::text AS "Family Income",
                        ed.fac_own_house AS "Owns House",
                        ed.fac_agricultural_land AS "Has Agricultural Land",
                        ed.fac_car AS "Has 4-Wheeler",
                        ed.fac_two_wheeler AS "Has 2-Wheeler",
                        ed.fac_rented_house AS "Renting"`;
        const assetMap = {
          'Own House':         `ed.fac_own_house = true`,
          'Agricultural Land': `ed.fac_agricultural_land = true`,
          '4-Wheeler':         `ed.fac_car = true`,
          '2-Wheeler':         `ed.fac_two_wheeler = true`,
          'Renting':           `ed.fac_rented_house = true`,
        };
        if (filter && assetMap[filter]) whereCond += ` AND ${assetMap[filter]}`;
        break;
      }

      // ── Insurance ─────────────────────────────────────────
      case 'insurance': {
        joinClause = `JOIN member_insurance mi ON mi.profile_id = p.id`;
        const insColMap = {
          'Health':       'mi.health_coverage',
          'Life':         'mi.life_coverage',
          'Term':         'mi.term_coverage',
          'Konkani Card': 'mi.konkani_card_coverage',
        };
        const col = insColMap[filter];
        if (col) {
          extraCols = `, mi.member_name AS "Member Name",
                         mi.member_relation AS "Relation",
                         array_to_string(${col}, ', ') AS "${filter} Coverage"`;
          whereCond += ` AND ${col} IS NOT NULL
                          AND cardinality(${col}) > 0
                          AND NOT (${col} @> ARRAY['none']::text[])`;
        } else {
          // Export all insurance columns
          extraCols = `, mi.member_name AS "Member Name",
                         mi.member_relation AS "Relation",
                         array_to_string(mi.health_coverage,        ', ') AS "Health Coverage",
                         array_to_string(mi.life_coverage,          ', ') AS "Life Coverage",
                         array_to_string(mi.term_coverage,          ', ') AS "Term Coverage",
                         array_to_string(mi.konkani_card_coverage,  ', ') AS "Konkani Card Coverage"`;
        }
        break;
      }

      // ── Documents ─────────────────────────────────────────
      case 'document': {
        joinClause = `JOIN member_documents md ON md.profile_id = p.id`;
        const docColMap = {
          'Aadhaar':   'md.aadhaar_coverage',
          'PAN Card':  'md.pan_coverage',
          'Voter ID':  'md.voter_id_coverage',
          'Land Docs': 'md.land_doc_coverage',
          'DL':        'md.dl_coverage',
        };
        const col = docColMap[filter];
        if (col) {
          extraCols = `, md.member_name AS "Member Name",
                         md.member_relation AS "Relation",
                         ${col}::text AS "${filter} Status"`;
          whereCond += ` AND LOWER(${col}::text) = 'yes'`;
        } else {
          extraCols = `, md.member_name AS "Member Name",
                         md.member_relation AS "Relation",
                         md.aadhaar_coverage::text  AS "Aadhaar",
                         md.pan_coverage::text      AS "PAN Card",
                         md.voter_id_coverage::text AS "Voter ID",
                         md.land_doc_coverage::text AS "Land Docs",
                         md.dl_coverage::text       AS "DL"`;
        }
        break;
      }

      // ── Education ─────────────────────────────────────────
      case 'education': {
        joinClause = `JOIN member_education me ON me.profile_id = p.id`;
        extraCols  = `, me.member_name AS "Member Name",
                        me.member_relation AS "Relation",
                        me.highest_education AS "Education Level",
                        me.profession_type::text AS "Profession",
                        me.is_currently_studying AS "Currently Studying",
                        me.is_currently_working AS "Currently Working"`;
        if (filter) {
          whereCond += ` AND LOWER(me.highest_education) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Occupation ────────────────────────────────────────
      case 'occupation': {
        joinClause = `JOIN member_education me ON me.profile_id = p.id`;
        extraCols  = `, me.member_name AS "Member Name",
                        me.member_relation AS "Relation",
                        me.profession_type::text AS "Profession",
                        me.highest_education AS "Education Level",
                        me.is_currently_working AS "Currently Working"`;
        if (filter) {
          whereCond += ` AND LOWER(me.profession_type::text) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Family type ───────────────────────────────────────
      case 'family_type': {
        joinClause = `JOIN family_info fi ON fi.profile_id = p.id`;
        extraCols  = `, fi.family_type::text AS "Family Type"`;
        if (filter) {
          whereCond += ` AND LOWER(fi.family_type::text) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Marital ───────────────────────────────────────────
      case 'marital': {
        extraCols = `, pd.is_married AS "Is Married", pd.date_of_birth AS "Date of Birth"`;
        const f = (filter || '').toLowerCase();
        if (f === 'married') {
          whereCond += ` AND pd.is_married = true`;
        } else if (f === 'single') {
          whereCond += ` AND pd.is_married = false`;
        }
        break;
      }

      default:
        // All approved — no extra filter
        break;
    }

    const sql = `
      ${BASE_SELECT}
      ${extraCols}
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      ${joinClause}
      ${whereCond}
      ORDER BY "Full Name"
      LIMIT 5000
    `;

    try {
      const result = await pool.query(sql, params);
      return res.json(result.rows);
    } catch (queryErr) {
      console.warn('[getExportData] Main query failed, using safe fallback:', queryErr.message);
      // Safe minimal fallback
      const fallback = await pool.query(
        `SELECT DISTINCT
           TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.last_name,''))) AS "Full Name",
           u.email AS "Email",
           u.phone AS "Phone",
           p.status AS "Status",
           TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At"
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.sangha_id=$1 AND p.status='approved'
         ORDER BY "Full Name" LIMIT 5000`,
        [sanghaId]
      );
      return res.json(fallback.rows);
    }

  } catch (err) {
    console.error('[getExportData]', err);
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
  getReports, getEnhancedReports,
  getActivityLogs,
  getAllSanghas, getSanghaById,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getApprovedSanghas,
  getMemberRequests, approveMemberRequest, rejectMemberRequest,
  getAdvancedReports,
  getExportData,
  getFullExportData
};
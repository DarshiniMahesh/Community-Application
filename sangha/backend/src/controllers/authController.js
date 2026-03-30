const pool = require('../config/db');
const { sendOtpEmail } = require('../config/mailer');
const { generateOtp } = require('../utils/otp');
const { signToken, verifyToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ─── USER REGISTER ─────────────────────────────────────────────
const userRegister = async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password || (!email && !phone)) {
    return res.status(400).json({ message: 'Password and email or phone are required' });
  }

  const existing = await pool.query(
    'SELECT id FROM users WHERE email=$1 OR phone=$2',
    [email || null, phone || null]
  );
  if (existing.rows.length > 0) return res.status(409).json({ message: 'Account already exists' });

  const password_hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    'INSERT INTO users (role, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, role, email, phone',
    ['user', email || null, phone || null, password_hash]
  );

  // Auto-create empty profile
  await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [result.rows[0].id]);

  const token = signToken({ id: result.rows[0].id, role: 'user' });
  res.status(201).json({ token, role: 'user', user: result.rows[0] });
};

// ─── USER LOGIN ────────────────────────────────────────────────
const userLogin = async (req, res) => {
  const { contact, password } = req.body;
  if (!contact || !password) return res.status(400).json({ message: 'Contact and password are required' });

  const result = await pool.query(
    `SELECT * FROM users WHERE (email=$1 OR phone=$1) AND role='user' AND is_deleted=FALSE`,
    [contact]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'No account found' });

  const user = result.rows[0];
  if (!user.is_active) return res.status(401).json({ message: 'Account is disabled' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Incorrect password' });

  // Block rejected users
  const profileCheck = await pool.query(
    'SELECT status FROM profiles WHERE user_id=$1',
    [user.id]
  );
  if (profileCheck.rows.length > 0 && profileCheck.rows[0].status === 'rejected') {
    return res.status(403).json({
      message: 'Your application has been rejected. You cannot access this portal. Please contact support.'
    });
  }

  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);

  const token = signToken({ id: user.id, role: 'user' });
  res.json({ token, role: 'user', user: { id: user.id, email: user.email, phone: user.phone } });
};

// ─── SEND OTP ──────────────────────────────────────────────────
const sendOtp = async (req, res) => {
  const { contact, role } = req.body;
  if (!contact || !role) return res.status(400).json({ message: 'Contact and role are required' });

  const result = await pool.query(
    `SELECT id FROM users WHERE (email=$1 OR phone=$1) AND role=$2 AND is_deleted=FALSE`,
    [contact, role]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'No account found' });

  // Sangha must be approved before login
  if (role === 'sangha') {
    const sp = await pool.query(
      'SELECT status FROM sangha_profiles WHERE user_id=$1',
      [result.rows[0].id]
    );
    if (!sp.rows.length || sp.rows[0].status !== 'approved') {
      return res.status(403).json({ message: 'Sangha account pending admin approval' });
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

  await pool.query(
    'UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3',
    [otp, expiresAt, result.rows[0].id]
  );

  if (contact.includes('@')) {
    try {
      await sendOtpEmail(contact, otp);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }
  }

  res.json({ message: 'OTP sent successfully' });
};

// ─── VERIFY OTP ────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { contact, otp, role } = req.body;
  if (!contact || !otp || !role) return res.status(400).json({ message: 'All fields are required' });

  const result = await pool.query(
    `SELECT * FROM users
     WHERE (email=$1 OR phone=$1) AND role=$2
     AND otp_code=$3 AND otp_expires_at > NOW() AND is_deleted=FALSE`,
    [contact, role, otp]
  );
  if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP' });

  const user = result.rows[0];

  // Clear OTP
  await pool.query('UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE id=$1', [user.id]);

  // User forgot password → short-lived reset token
  if (role === 'user') {
    const resetToken = signToken({ id: user.id, role: 'user', purpose: 'reset' }, '15m');
    return res.json({ message: 'OTP verified', resetToken });
  }

  // Sangha/Admin → full login JWT
  await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
  const token = signToken({ id: user.id, role });
  res.json({ token, role, user: { id: user.id, email: user.email, phone: user.phone } });
};

// ─── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ message: 'All fields are required' });

  let decoded;
  try {
    decoded = verifyToken(resetToken);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired reset token' });
  }

  if (decoded.purpose !== 'reset') return res.status(401).json({ message: 'Invalid reset token' });

  const password_hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, decoded.id]);

  res.json({ message: 'Password reset successfully' });
};

// ─── SANGHA REGISTER ───────────────────────────────────────────
const sanghaRegister = async (req, res) => {
  const { email, phone, password, sangha_name, location, contact_person, area_covered } = req.body;

  if (!email || !password || !sangha_name || !location || !contact_person) {
    return res.status(400).json({ message: 'email, password, sangha_name, location and contact_person are required' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rows.length > 0) return res.status(409).json({ message: 'Account already exists' });

  const password_hash = await bcrypt.hash(password, 10);

  const userResult = await pool.query(
    `INSERT INTO users (role, email, phone, password_hash) VALUES ('sangha',$1,$2,$3) RETURNING id`,
    [email, phone || null, password_hash]
  );

  await pool.query(
    `INSERT INTO sangha_profiles (user_id, sangha_name, location, contact_person, area_covered)
     VALUES ($1,$2,$3,$4,$5)`,
    [userResult.rows[0].id, sangha_name, location, contact_person, area_covered || null]
  );

  res.status(201).json({ message: 'Sangha registration submitted. Awaiting admin approval.' });
};

module.exports = { userRegister, userLogin, sendOtp, verifyOtp, resetPassword, sanghaRegister };
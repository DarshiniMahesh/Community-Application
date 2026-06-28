const pool = require('../config/db');
const { signToken: generateToken } = require('../utils/jwt');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../config/mailer');
const bcrypt = require('bcrypt');

// ── Login (send OTP) ──────────────────────────────────────────
const sendOtp = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const result = await pool.query(
      `SELECT id, password_hash, role FROM users WHERE email=$1 AND role='job_moderator'`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const otp = generateOtp();
    const otp_expires_at = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10') * 60000);
    await pool.query(
      `UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3`,
      [otp, otp_expires_at, user.id]
    );
    await sendOtpEmail(email, otp);

    return res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('moderator sendOtp:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Verify OTP ─────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await pool.query(
      `SELECT id, otp_code, otp_expires_at FROM users WHERE email=$1 AND role='job_moderator'`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    if (user.otp_code !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expires_at))
      return res.status(400).json({ message: 'OTP expired' });

    await pool.query(`UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE id=$1`, [user.id]);
    const token = generateToken({ id: user.id, role: 'job_moderator' });
    return res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('moderator verifyOtp:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { sendOtp, verifyOtp };
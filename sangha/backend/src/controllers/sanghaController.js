const pool = require('../config/db');
const bcrypt = require('bcrypt');

const registerSangha = async (req, res) => {
  const { name, location, contactPerson, phone, email, password } = req.body;
  if (!name || !location || !contactPerson || !phone || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existing = await pool.query('SELECT id FROM sanghas WHERE email=$1', [email]);
  if (existing.rows.length > 0) return res.status(409).json({ message: 'Sangha already registered with this email' });

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO sanghas (name, location, contact_person, phone, email, password_hash) VALUES ($1,$2,$3,$4,$5,$6)',
    [name, location, contactPerson, phone, email, password_hash]
  );
  res.status(201).json({ message: 'Sangha registered successfully. Awaiting admin approval.' });
};

const getDashboard = async (req, res) => {
  const { id: sanghaId } = req.user;
  const [pending, approved, rejected, total] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM applications WHERE sangha_id=$1 AND status='pending'",  [sanghaId]),
    pool.query("SELECT COUNT(*) FROM applications WHERE sangha_id=$1 AND status='approved'", [sanghaId]),
    pool.query("SELECT COUNT(*) FROM applications WHERE sangha_id=$1 AND status='rejected'", [sanghaId]),
    pool.query('SELECT COUNT(*) FROM applications WHERE sangha_id=$1',                       [sanghaId]),
  ]);
  res.json({
    pendingApplications: parseInt(pending.rows[0].count),
    approvedUsers:       parseInt(approved.rows[0].count),
    rejectedUsers:       parseInt(rejected.rows[0].count),
    totalUsers:          parseInt(total.rows[0].count),
  });
};

const getAllSanghas = async (req, res) => {
  const result = await pool.query('SELECT id, name, email, phone, location, status, created_at FROM sanghas ORDER BY created_at DESC');
  res.json(result.rows);
};

const getSanghaById = async (req, res) => {
  const result = await pool.query('SELECT id, name, email, phone, location, contact_person, status, created_at FROM sanghas WHERE id=$1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Sangha not found' });
  res.json(result.rows[0]);
};

const approveUser = async (req, res) => {
  const { userId } = req.body;
  const { id: sanghaId } = req.user;
  await pool.query(
    "UPDATE applications SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE user_id=$2",
    [sanghaId, userId]
  );
  await pool.query("UPDATE users SET status='approved' WHERE id=$1", [userId]);
  res.json({ message: 'User approved successfully' });
};

const rejectUser = async (req, res) => {
  const { userId, reason } = req.body;
  const { id: sanghaId } = req.user;
  await pool.query(
    "UPDATE applications SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), rejection_reason=$2 WHERE user_id=$3",
    [sanghaId, reason || null, userId]
  );
  await pool.query("UPDATE users SET status='rejected' WHERE id=$1", [userId]);
  res.json({ message: 'User rejected successfully' });
};

module.exports = { registerSangha, getDashboard, getAllSanghas, getSanghaById, approveUser, rejectUser };

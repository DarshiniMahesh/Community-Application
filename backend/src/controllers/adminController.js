const pool = require('../config/db');

const getDashboard = async (req, res) => {
  const [users, sanghas, approved, pendingSangha] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM sanghas WHERE status=$1', ['approved']),
    pool.query("SELECT COUNT(*) FROM users WHERE status='approved'"),
    pool.query("SELECT COUNT(*) FROM sanghas WHERE status='pending_approval'"),
  ]);
  res.json({
    totalUsers:       parseInt(users.rows[0].count),
    totalSangha:      parseInt(sanghas.rows[0].count),
    approvedUsers:    parseInt(approved.rows[0].count),
    pendingSangha:    parseInt(pendingSangha.rows[0].count),
  });
};

const getPendingSanghas = async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, email, phone, location, contact_person, created_at FROM sanghas WHERE status='pending_approval' ORDER BY created_at DESC"
  );
  res.json(result.rows);
};

const approveSangha = async (req, res) => {
  const { id } = req.params;
  const { id: adminId } = req.user;
  await pool.query(
    "UPDATE sanghas SET status='approved', approved_at=NOW(), approved_by=$1 WHERE id=$2",
    [adminId, id]
  );
  res.json({ message: 'Sangha approved successfully' });
};

const rejectSangha = async (req, res) => {
  const { id } = req.params;
  await pool.query("UPDATE sanghas SET status='rejected' WHERE id=$1", [id]);
  res.json({ message: 'Sangha rejected successfully' });
};

module.exports = { getDashboard, getPendingSanghas, approveSangha, rejectSangha };

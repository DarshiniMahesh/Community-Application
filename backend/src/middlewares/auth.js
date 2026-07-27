//Community-Application\backend\src\middlewares\auth.js
const { verifyToken } = require('../utils/jwt');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    if (decoded.id === 'hardcoded-admin') {
      req.user = {
        id:         'hardcoded-admin',
        role:       'admin',
        email:      'admin@gmail.com',
        phone:      null,
        is_active:  true,
        is_deleted: false,
        is_blocked: false,
      };
      return next();
    }

    const result = await pool.query(
      'SELECT id, role, email, phone, is_active, is_deleted, is_blocked FROM users WHERE id=$1',
      [decoded.id]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'User not found' });

    const user = result.rows[0];

    if (!user.is_active || user.is_deleted)
      return res.status(401).json({ message: 'Account disabled' });

    if (user.is_blocked)
      return res.status(403).json({ message: 'Account blocked. Please contact support.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// ─── NEW: gate scholarship / career features behind profile approval ──
// Must run AFTER `authenticate` (needs req.user.id) and typically after
// requireRole('user'). Blocks anyone whose profile status isn't 'approved'.
const requireApprovedProfile = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const result = await pool.query(
      'SELECT status FROM profiles WHERE user_id=$1',
      [userId]
    );
    if (result.rows.length === 0 || result.rows[0].status !== 'approved') {
      return res.status(403).json({
        message: 'This feature is available only after your profile is approved.',
      });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { authenticate, requireRole, requireApprovedProfile };
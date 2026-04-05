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

module.exports = { authenticate, requireRole };
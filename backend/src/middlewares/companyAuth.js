const { verifyToken } = require('../utils/jwt');
const pool = require('../config/db');

const companyAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'company')
      return res.status(403).json({ message: 'Access denied: not a company account' });

    // Verify company_auth record exists and is verified
    const result = await pool.query(
      `SELECT id, is_verified, is_active FROM company_auth WHERE id=$1`,
      [decoded.id]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Company account not found' });

    const ca = result.rows[0];
    if (!ca.is_verified)
      return res.status(401).json({ message: 'Account not verified. Please complete OTP verification.' });
    if (!ca.is_active)
      return res.status(401).json({ message: 'Account is disabled' });

    req.user = { id: decoded.id, role: 'company' };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = companyAuth;
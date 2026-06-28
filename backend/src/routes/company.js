const express = require('express');
const router = express.Router();
const {
  register, login, verifyOtp, resendOtp,
  getProfile, createProfile, updateProfile, reapply,
  getDashboardStats,
  adminListCompanies, adminApproveCompany, adminRejectCompany,
} = require('../controllers/companyController');
const { authenticate, requireRole } = require('../middlewares/auth');
const companyAuth = require('../middlewares/companyAuth');

// ── Public: Auth ──────────────────────────────────────────────
router.post('/auth/register',         register);
router.post('/auth/login',            login);
router.post('/auth/verify-otp',       verifyOtp);
router.post('/auth/verify-login-otp', verifyOtp);
router.post('/auth/resend-otp',       resendOtp);

// ── Company: Protected ────────────────────────────────────────
router.get('/profile',           companyAuth, getProfile);
router.post('/profile',          companyAuth, createProfile);
router.put('/profile',           companyAuth, updateProfile);
router.post('/reapply',          companyAuth, reapply);
router.get('/dashboard/stats',   companyAuth, getDashboardStats);

// ── Admin: Company management ─────────────────────────────────
router.get('/admin/companies',              authenticate, requireRole('admin'), adminListCompanies);
router.patch('/admin/companies/:id/approve', authenticate, requireRole('admin'), adminApproveCompany);
router.patch('/admin/companies/:id/reject',  authenticate, requireRole('admin'), adminRejectCompany);

module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  register, login, verifyOtp, resendOtp,
  getProfile, createProfile, updateProfile, reapply,
  uploadLogo,
  getDashboardStats,
  getEmployees, addEmployee, deleteEmployee,
  adminListCompanies, adminApproveCompany, adminRejectCompany,
} = require('../controllers/companyController');
const { authenticate, requireRole } = require('../middlewares/auth');
const companyAuth = require('../middlewares/companyAuth');

// ── Inline multer config for logo uploads ──────────────────────
const logoDir = path.join(__dirname, '../../uploads/logos');
fs.mkdirSync(logoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${req.user.id}_${Date.now()}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, or WEBP images are allowed'));
  },
});

// ── Public: Auth ──────────────────────────────────────────────
router.post('/auth/register',         register);
router.post('/auth/login',            login);
router.post('/auth/verify-otp',       verifyOtp);
router.post('/auth/verify-login-otp', verifyOtp);
router.post('/auth/resend-otp',       resendOtp);

// ── Company: Protected ────────────────────────────────────────
router.get('/profile',            companyAuth, getProfile);
router.post('/profile',           companyAuth, createProfile);
router.put('/profile',            companyAuth, updateProfile);
router.post('/profile/logo',      companyAuth, logoUpload.single('logo'), uploadLogo);
router.post('/reapply',           companyAuth, reapply);
router.get('/dashboard/stats',    companyAuth, getDashboardStats);

// ── Company: Employees ─────────────────────────────────────────
router.get('/employees',         companyAuth, getEmployees);
router.post('/employees',        companyAuth, addEmployee);
router.delete('/employees/:id',  companyAuth, deleteEmployee);

// ── Admin: Company management ─────────────────────────────────
router.get('/admin/companies',             authenticate, requireRole('admin'), adminListCompanies);
router.put('/admin/companies/:id/approve', authenticate, requireRole('admin'), adminApproveCompany);
router.put('/admin/companies/:id/reject',  authenticate, requireRole('admin'), adminRejectCompany);

module.exports = router;
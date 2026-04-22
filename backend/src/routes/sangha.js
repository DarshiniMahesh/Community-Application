// ─────────────────────────────────────────────────────────────────────────────
// ADD TO: Community-Application/backend/src/routes/sangha.js
//
// Add this route BEFORE the existing /reports/export route:
//
//   router.post('/reports/export/full', requireRole('sangha', 'admin'), sc.getFullExportData);
//
// And update the require at the top to include getFullExportData:
//   const sc = require('../controllers/sanghaController');
//   (no change needed — it will auto-include when you add to module.exports)
//
// ─────────────────────────────────────────────────────────────────────────────
//
// FULL sangha.js with the new route added:

const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const { authenticate, requireRole } = require('../middlewares/auth');
const sc        = require('../controllers/sanghaController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ── Public ───────────────────────────────────────────────────
router.post('/register/send-otp',    sc.registerSendOtp);
router.post('/register/verify-otp',  sc.registerVerifyOtp);
router.post('/login/send-otp',       sc.loginSendOtp);
router.post('/login/verify-otp',     sc.loginVerifyOtp);
router.post('/forgot-password/send-otp',   sc.forgotSendOtp);
router.post('/forgot-password/verify-otp', sc.forgotVerifyOtp);
router.post('/forgot-password/reset',      sc.forgotReset);
router.get('/approved-list', sc.getApprovedSanghas);

router.use(authenticate);

// Profile
router.get('/profile',             requireRole('sangha'),          sc.getSanghaProfile);
router.put('/profile',             requireRole('sangha'),          sc.updateSanghaProfile);
router.post('/profile/logo',       requireRole('sangha'),          upload.single('logo'), sc.uploadSanghaLogo);
router.post('/submit',             requireRole('sangha'),          sc.submitProfile);

// Dashboard & members
router.get('/dashboard',           requireRole('sangha', 'admin'), sc.getDashboard);
router.get('/members',             requireRole('sangha', 'admin'), sc.getMembers);
router.get('/pending-users',       requireRole('sangha', 'admin'), sc.getPendingUsers);
router.get('/review-user/:id',     requireRole('sangha', 'admin'), sc.getUserForReview);

// Member requests
router.get('/member-requests',     requireRole('sangha', 'admin'), sc.getMemberRequests);
router.post('/approve-request',    requireRole('sangha', 'admin'), sc.approveMemberRequest);
router.post('/reject-request',     requireRole('sangha', 'admin'), sc.rejectMemberRequest);

// Actions
router.post('/approve',            requireRole('sangha', 'admin'), sc.approveUser);
router.post('/reject',             requireRole('sangha', 'admin'), sc.rejectUser);
router.post('/request-changes',    requireRole('sangha', 'admin'), sc.requestChanges);
router.post('/block-user',         requireRole('sangha'), sc.blockUser);

// ── Reports ──────────────────────────────────────────────────
router.get('/reports/advanced',    requireRole('sangha', 'admin'), sc.getAdvancedReports);
router.get('/reports/enhanced',    requireRole('sangha', 'admin'), sc.getEnhancedReports);
router.get('/reports',             requireRole('sangha', 'admin'), sc.getReports);

// NEW: Full export for Custom Report tab (must come BEFORE /reports/export)
router.post('/reports/export/full', requireRole('sangha', 'admin'), sc.getFullExportData);
router.post('/reports/export',      requireRole('sangha', 'admin'), sc.getExportData);

router.get('/activity-logs',       requireRole('sangha', 'admin'), sc.getActivityLogs);

// Team members
router.get('/team-members',              requireRole('sangha', 'admin'), sc.getTeamMembers);
router.post('/team-members',             requireRole('sangha', 'admin'), sc.addTeamMember);
router.delete('/team-members/:memberId', requireRole('sangha', 'admin'), sc.deleteTeamMember);

// Admin only
router.get('/all',  requireRole('admin'), sc.getAllSanghas);
router.get('/:id',  requireRole('admin'), sc.getSanghaById);

module.exports = router;
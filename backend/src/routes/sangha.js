const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const sc = require('../controllers/sanghaController');

// ── Public ───────────────────────────────────────────────────
router.post('/register', sc.registerSangha);
router.post('/login',    sc.loginSangha);

// ── Authenticated ────────────────────────────────────────────
router.use(authenticate);

// Sangha profile
router.get('/profile',          requireRole('sangha'),           sc.getSanghaProfile);
router.put('/profile',          requireRole('sangha'),           sc.updateSanghaProfile);

// Dashboard & members
router.get('/dashboard',        requireRole('sangha', 'admin'),  sc.getDashboard);
router.get('/members',          requireRole('sangha', 'admin'),  sc.getMembers);
router.get('/pending-users',    requireRole('sangha', 'admin'),  sc.getPendingUsers);
router.get('/review-user/:id',  requireRole('sangha', 'admin'),  sc.getUserForReview);

// Actions
router.post('/approve',         requireRole('sangha', 'admin'),  sc.approveUser);
router.post('/reject',          requireRole('sangha', 'admin'),  sc.rejectUser);
router.post('/request-changes', requireRole('sangha', 'admin'),  sc.requestChanges);

// Reports & logs
router.get('/reports',          requireRole('sangha', 'admin'),  sc.getReports);
router.get('/activity-logs',    requireRole('sangha', 'admin'),  sc.getActivityLogs);

// Team members
router.get('/team-members',              requireRole('sangha', 'admin'), sc.getTeamMembers);
router.post('/team-members',             requireRole('sangha', 'admin'), sc.addTeamMember);
router.delete('/team-members/:memberId', requireRole('sangha', 'admin'), sc.deleteTeamMember);

// Admin only
router.get('/all',              requireRole('admin'),            sc.getAllSanghas);
router.get('/:id',              requireRole('admin'),            sc.getSanghaById);

module.exports = router;
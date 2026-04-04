const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const ac = require('../controllers/adminController');

// ── Public ───────────────────────────────────────────────────
router.post('/login', ac.loginAdmin);

// ── All routes below require admin auth ──────────────────────
router.use(authenticate);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard', ac.getDashboard);

// Sangha management
router.get('/sangha/pending',         ac.getPendingSanghas);
router.get('/sangha/all',             ac.getAllSanghas);
router.get('/sangha/history',         ac.getSanghaHistory);   // ← NEW
router.post('/sangha/approve/:id',    ac.approveSangha);
router.post('/sangha/reject/:id',     ac.rejectSangha);

// User management
router.get('/users',                  ac.getApprovedUsers);
router.get('/users/all',              ac.getAllUsers);
router.get('/users/pending',          ac.getPendingUsers);
router.post('/users/approve',         ac.approveUser);
router.post('/users/reject',          ac.rejectUser);

// Activity logs
router.get('/activity-logs',          ac.getActivityLogs);    // ← NEW

module.exports = router;
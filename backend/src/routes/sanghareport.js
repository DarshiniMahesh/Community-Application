// Community-Application\backend\src\routes\sanghareport.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const rc = require('../controllers/sanghareportscontroller');

// ── All report routes require authentication ────────────────
router.use(authenticate);

// ── Basic reports ─────────────────────────────────────────────
router.get('/', requireRole('sangha', 'admin'), rc.getReports);
router.get('/enhanced', requireRole('sangha', 'admin'), rc.getEnhancedReports);
router.get('/advanced', requireRole('sangha', 'admin'), rc.getAdvancedReports);

// ── Export data ───────────────────────────────────────────────
router.post('/export/full', requireRole('sangha', 'admin'), rc.getFullExportData);
router.post('/export', requireRole('sangha', 'admin'), rc.getExportData);

// ── Activity logs ─────────────────────────────────────────────
router.get('/activity-logs', requireRole('sangha', 'admin'), rc.getActivityLogs);

module.exports = router;
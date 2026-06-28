const express = require('express');
const router = express.Router();
const {
  createReferral, getMyReferrals, listApprovedReferrals,
  moderatorListReferrals, approveReferral, rejectReferral,
} = require('../controllers/referralController');
const { authenticate, requireRole } = require('../middlewares/auth');

// ── Public: Approved referrals ─────────────────────────────────
router.get('/public', listApprovedReferrals);

// ── User: Post and view own referrals ──────────────────────────
router.post('/',      authenticate, requireRole('user'), createReferral);
router.get('/mine',   authenticate, requireRole('user'), getMyReferrals);

// ── Job Moderator: Manage referrals ────────────────────────────
router.get('/',                    authenticate, requireRole('job_moderator'), moderatorListReferrals);
router.patch('/:id/approve',       authenticate, requireRole('job_moderator'), approveReferral);
router.patch('/:id/reject',        authenticate, requireRole('job_moderator'), rejectReferral);

module.exports = router;
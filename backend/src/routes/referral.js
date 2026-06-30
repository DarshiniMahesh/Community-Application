const express = require('express');
const router = express.Router();
const {
  createReferral, getMyReferrals, listApprovedReferrals,
  moderatorListReferrals, approveReferral, rejectReferral,
  applyToReferral, getReferralApplicants,
  updateReferralApplicantStatus, getMyReferralApplications,
} = require('../controllers/referralController');
const { authenticate, requireRole } = require('../middlewares/auth');

// ── Public: Approved referrals ─────────────────────────────────
router.get('/public', listApprovedReferrals);

// ── User: Post and view own referrals ──────────────────────────
router.post('/',      authenticate, requireRole('user'), createReferral);
router.get('/mine',   authenticate, requireRole('user'), getMyReferrals);

// ── User: Apply to a referral / view applicants ─────────────────
router.post('/:id/apply',        authenticate, requireRole('user'), applyToReferral);
router.get('/:id/applicants',    authenticate, requireRole('user'), getReferralApplicants);

// ── User: Track own referral applications & update applicant status ──
router.get('/my-applications',                       authenticate, requireRole('user'), getMyReferralApplications);
router.patch('/:id/applicants/:applicantId/status',  authenticate, requireRole('user'), updateReferralApplicantStatus);

// ── Job Moderator: Manage referrals ────────────────────────────
router.get('/admin', authenticate, requireRole('admin'), moderatorListReferrals);
router.patch('/:id/approve', authenticate, requireRole('admin', 'job_moderator'), approveReferral);
router.patch('/:id/reject',  authenticate, requireRole('admin', 'job_moderator'), rejectReferral);

module.exports = router;
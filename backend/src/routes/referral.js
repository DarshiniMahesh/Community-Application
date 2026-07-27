//Community-Application\backend\src\routes\referral.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createReferral, getMyReferrals, listApprovedReferrals,
  moderatorListReferrals, approveReferral, rejectReferral,
  applyToReferral, getReferralApplicants,
  updateReferralApplicantStatus, getMyReferralApplications,
  getReferralModeratorDetail,
} = require('../controllers/referralController');
const { authenticate, requireRole } = require('../middlewares/auth');

// to Supabase Storage in the controller (mirrors the jobs upload flow).
const upload = multer({ storage: multer.memoryStorage() });

// ── Public: Approved referrals ─────────────────────────────────
router.get('/public', listApprovedReferrals);

// ── User: Post and view own referrals ──────────────────────────
router.post('/',      authenticate, requireRole('user'), createReferral);
router.get('/mine',   authenticate, requireRole('user'), getMyReferrals);

// ── User: Apply to a referral / view applicants ─────────────────
// ✅ UPDATED: accepts multipart/form-data — fields: name, portfolio_link, resume (file)
router.post(
  '/:id/apply',
  authenticate,
  requireRole('user'),
  upload.fields([{ name: 'resume', maxCount: 1 }]),
  applyToReferral
);
router.get('/:id/applicants',    authenticate, requireRole('user'), getReferralApplicants);

// ── User: Track own referral applications & update applicant status ──
router.get('/my-applications',                       authenticate, requireRole('user'), getMyReferralApplications);
router.patch('/:id/applicants/:applicantId/status',  authenticate, requireRole('user'), updateReferralApplicantStatus);

// ── Job Moderator: Manage referrals ────────────────────────────
router.get('/admin', authenticate, requireRole('admin', 'job_moderator'), moderatorListReferrals);
router.get('/:id/moderator-detail', authenticate, requireRole('admin', 'job_moderator'), getReferralModeratorDetail);
router.patch('/:id/approve', authenticate, requireRole('admin', 'job_moderator'), approveReferral);
router.patch('/:id/reject',  authenticate, requireRole('admin', 'job_moderator'), rejectReferral);

module.exports = router;
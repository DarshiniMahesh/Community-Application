const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const uc = require('../controllers/userController');

router.use(authenticate);

// Profile
router.get('/profile',              requireRole('user'), uc.getProfile);
router.get('/profile/full',         requireRole('user'), uc.getFullProfile);

// Form steps
router.post('/profile/step1',       requireRole('user'), uc.saveStep1);
router.post('/profile/step2',       requireRole('user'), uc.saveStep2);
router.post('/profile/step3',       requireRole('user'), uc.saveStep3);
router.post('/profile/step4',       requireRole('user'), uc.saveStep4);
router.post('/profile/step5',       requireRole('user'), uc.saveStep5);
router.post('/profile/step6',       requireRole('user'), uc.saveStep6);

// Sangha Membership (step7) — only accessible after profile approved
router.get('/profile/sangha',       requireRole('user'), uc.getStep7);
router.post('/profile/step7',       requireRole('user'), uc.saveStep7);

// Submit
router.post('/profile/submit',      requireRole('user'), uc.submitApplication);

// Full reset (dashboard)
router.post('/profile/reset',       requireRole('user'), uc.resetProfile);

// Step-level resets (inside pages)
router.post('/profile/reset/step1', requireRole('user'), uc.resetStep1);
router.post('/profile/reset/step2', requireRole('user'), uc.resetStep2);
router.post('/profile/reset/step3', requireRole('user'), uc.resetStep3);
router.post('/profile/reset/step4', requireRole('user'), uc.resetStep4);
router.post('/profile/reset/step5', requireRole('user'), uc.resetStep5);
router.post('/profile/reset/step6', requireRole('user'), uc.resetStep6);

// Activity logs (user's own history)
router.get('/activity-logs',        requireRole('user'), uc.getUserActivityLogs);

// Sangha / Admin views
router.get('/pending',              requireRole('sangha', 'admin'), uc.getPendingUsers);
router.get('/:id',                  requireRole('sangha', 'admin'), uc.getUserById);

module.exports = router;
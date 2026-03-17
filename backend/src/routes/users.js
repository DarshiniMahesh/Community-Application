const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const uc = require('../controllers/userController');

router.use(authenticate);

// User's own profile
router.get('/profile',         requireRole('user'), uc.getProfile);
router.get('/profile/full',    requireRole('user'), uc.getFullProfile);

// Form steps (save as you go)
router.post('/profile/step1',  requireRole('user'), uc.saveStep1);
router.post('/profile/step2',  requireRole('user'), uc.saveStep2);
router.post('/profile/step3',  requireRole('user'), uc.saveStep3);
router.post('/profile/step4',  requireRole('user'), uc.saveStep4);
router.post('/profile/step5',  requireRole('user'), uc.saveStep5);
router.post('/profile/step6',  requireRole('user'), uc.saveStep6);

// Submit application
router.post('/profile/submit', requireRole('user'), uc.submitApplication);

// Sangha / Admin views
router.get('/pending',         requireRole('sangha', 'admin'), uc.getPendingUsers);
router.get('/:id',             requireRole('sangha', 'admin'), uc.getUserById);

module.exports = router;
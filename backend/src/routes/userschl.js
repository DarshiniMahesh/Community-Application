// Community-Application\backend\src\routes\userschl.js
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const sc = require('../controllers/userschlcontroller');

router.use(authenticate);

// List all eligible/visible scholarships for the logged-in user
router.get('/scholarships', requireRole('user'), sc.getScholarships);

// Get self + family members with per-member application status for a scholarship
router.get('/scholarships/:id/members', requireRole('user'), sc.getScholarshipMembers);

// Apply to a scholarship (supports multiple members per call)
router.post('/scholarships/:id/apply', requireRole('user'), sc.applyScholarship);

module.exports = router;
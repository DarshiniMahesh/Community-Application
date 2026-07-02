// Community-Application\backend\src\routes\userschl.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, requireRole } = require('../middlewares/auth');
const sc = require('../controllers/userschlcontroller');

// ─── Multer (memory storage — buffer goes straight to Supabase Storage) ──────
// Note: the Supabase client now lives inside the controller (userschlcontroller.js),
// so this route file no longer needs its own inline client or req.supabaseStorage
// middleware — it only needs multer to hand the controller a file buffer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG files are allowed.'));
  },
});

router.use(authenticate);

// ─── Scholarships ──────────────────────────────────────────────────────────
router.get('/scholarships', requireRole('user'), sc.getScholarships);
router.get('/scholarships/:id/members', requireRole('user'), sc.getScholarshipMembers);
router.post('/scholarships/:id/apply', requireRole('user'), sc.applyScholarship);

// ─── Persistent, reusable per-member details (auto-filled across all scholarships) ─
router.get('/members/:memberId/education', requireRole('user'), sc.getMemberEducation);
router.put('/members/:memberId/education', requireRole('user'), sc.saveMemberEducation);
router.get('/members/:memberId/bank',      requireRole('user'), sc.getMemberBank);
router.put('/members/:memberId/bank',      requireRole('user'), sc.saveMemberBank);

// Upload a single education document (SSLC / PU marks card / degree certificate)
// :docType must be one of: sslc | pu | degree
router.post(
  '/members/:memberId/education/documents/:docType',
  requireRole('user'),
  upload.single('file'),
  sc.uploadMemberEducationDocument
);

module.exports = router;
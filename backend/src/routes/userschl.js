// Community-Application\backend\src\routes\userschl.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, requireRole } = require('../middlewares/auth');
const sc = require('../controllers/userschlcontroller');

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

// Wraps multer so its errors return clean JSON instead of an unhandled exception
function handleUpload(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large. Max size is 5MB.'
          : err.message });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  };
}

router.use(authenticate);

router.get('/scholarships', requireRole('user'), sc.getScholarships);
router.get('/scholarships/:id/members', requireRole('user'), sc.getScholarshipMembers);
router.post('/scholarships/:id/apply', requireRole('user'), sc.applyScholarship);

router.get('/members/:memberId/education', requireRole('user'), sc.getMemberEducation);
router.put('/members/:memberId/education', requireRole('user'), sc.saveMemberEducation);
router.get('/members/:memberId/bank',      requireRole('user'), sc.getMemberBank);
router.put('/members/:memberId/bank',      requireRole('user'), sc.saveMemberBank);

router.post(
  '/members/:memberId/education/documents/:docType',
  requireRole('user'),
  handleUpload('file'),
  sc.uploadMemberEducationDocument
);

module.exports = router;
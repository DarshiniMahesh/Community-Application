//Community-Application\backend\src\routes\careerresume.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../middlewares/auth');
const { listResumes, uploadResume, deleteResume, setDefaultResume } = require('../controllers/careerresumecontroller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^application\/pdf$|^application\/msword$|^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or Word documents are allowed'));
    }
  },
});

router.get('/',            authenticate, requireRole('user'), listResumes);
router.post('/',            authenticate, requireRole('user'), upload.single('resume'), uploadResume);
router.delete('/:id',       authenticate, requireRole('user'), deleteResume);
router.patch('/:id/default', authenticate, requireRole('user'), setDefaultResume);

module.exports = router;
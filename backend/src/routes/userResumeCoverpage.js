const express = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middlewares/auth');
const {
  listResumes, uploadResume, deleteResume, setDefaultResume,
  listCoverLetters, uploadCoverLetter, deleteCoverLetter, setDefaultCoverLetter,
} = require('../controllers/userResumeCoverpagecontroller');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^application\/pdf$|^application\/msword$|^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or Word documents are allowed'));
    }
  },
});

router.get('/resumes', authenticate, requireRole('user'), listResumes);
router.post('/resumes', authenticate, requireRole('user'), upload.single('resume'), uploadResume);
router.delete('/resumes/:id', authenticate, requireRole('user'), deleteResume);
router.patch('/resumes/:id/default', authenticate, requireRole('user'), setDefaultResume);

router.get('/cover-letters', authenticate, requireRole('user'), listCoverLetters);
router.post('/cover-letters', authenticate, requireRole('user'), upload.single('coverLetter'), uploadCoverLetter);
router.delete('/cover-letters/:id', authenticate, requireRole('user'), deleteCoverLetter);
router.patch('/cover-letters/:id/default', authenticate, requireRole('user'), setDefaultCoverLetter);

module.exports = router;
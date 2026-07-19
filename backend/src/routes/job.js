const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createJob, listJobs, getJob, deleteJob, updateJob,
  getJobApplicants, updateApplicantStatus, setResumeScore, getAllApplications,
  publicListJobs, publicGetJob,
  applyToJob, getUserApplications, saveJob, getSavedJobs,
  adminListJobs,
} = require('../controllers/jobController');
const { authenticate, requireRole } = require('../middlewares/auth');
const companyAuth = require('../middlewares/companyAuth');

// ── Resume/cover-letter upload config ───────────────────────────
// Memory storage: file stays in a buffer (req.files[...][0].buffer)
// and is uploaded to Supabase Storage inside applyToJob, not written to local disk.
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

// ── Public: Job search (users) ────────────────────────────────
router.get('/public',          publicListJobs);
router.get('/public/:id',      publicGetJob);

// ── User: Apply, tracker, saved ───────────────────────────────
router.post('/apply/:id', authenticate, requireRole('user'),
  upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'cover_letter', maxCount: 1 }]),
  applyToJob);
router.get('/my-applications',       authenticate, requireRole('user'), getUserApplications);
router.post('/save/:id',             authenticate, requireRole('user'), saveJob);
router.get('/saved',                 authenticate, requireRole('user'), getSavedJobs);

// ── Company: Job management ───────────────────────────────────
router.post('/',                         companyAuth, createJob);
router.get('/',                          companyAuth, listJobs);
router.get('/applications',              companyAuth, getAllApplications);
router.get('/:id',                       companyAuth, getJob);
router.delete('/:id',                    companyAuth, deleteJob);
router.patch('/:id',                     companyAuth, updateJob);
router.get('/:id/applicants',            companyAuth, getJobApplicants);
router.patch('/:jobId/applicants/:applicantId/status',       companyAuth, updateApplicantStatus);
router.put('/:jobId/applicants/:applicantId/resume-score',   companyAuth, setResumeScore);

// ── Admin: View all jobs ──────────────────────────────────────
router.get('/admin/all',               authenticate, requireRole('admin'), adminListJobs);

module.exports = router;
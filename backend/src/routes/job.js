const express = require('express');
const router = express.Router();
const {
  createJob, listJobs, getJob, deleteJob,
  getJobApplicants, updateApplicantStatus, getAllApplications,
  publicListJobs, publicGetJob,
  applyToJob, getUserApplications, saveJob, getSavedJobs,
  adminListJobs,
} = require('../controllers/jobController');
const { authenticate, requireRole } = require('../middlewares/auth');
const companyAuth = require('../middlewares/companyAuth');

// ── Public: Job search (users) ────────────────────────────────
router.get('/public',          publicListJobs);
router.get('/public/:id',      publicGetJob);

// ── User: Apply, tracker, saved ───────────────────────────────
router.post('/apply/:id',            authenticate, requireRole('user'), applyToJob);
router.get('/my-applications',       authenticate, requireRole('user'), getUserApplications);
router.post('/save/:id',             authenticate, requireRole('user'), saveJob);
router.get('/saved',                 authenticate, requireRole('user'), getSavedJobs);

// ── Company: Job management ───────────────────────────────────
router.post('/',                         companyAuth, createJob);
router.get('/',                          companyAuth, listJobs);
router.get('/applications',              companyAuth, getAllApplications);
router.get('/:id',                       companyAuth, getJob);
router.delete('/:id',                    companyAuth, deleteJob);
router.get('/:id/applicants',            companyAuth, getJobApplicants);
router.patch('/:jobId/applicants/:applicantId/status', companyAuth, updateApplicantStatus);

// ── Admin: View all jobs ──────────────────────────────────────
router.get('/admin/all',               authenticate, requireRole('admin'), adminListJobs);

module.exports = router;
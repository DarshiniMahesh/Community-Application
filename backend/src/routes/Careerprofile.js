// Community-Application\backend\src\routes\careerProfile.js
//
// NOT mounted in server.js. It is mounted from routes/job.js:
//     router.use('/career-profile', require('./careerProfile'));
// and server.js already mounts job.js at /api/jobs, so the final URLs are:
//     GET  /api/jobs/career-profile
//     GET  /api/jobs/career-profile/education
//     POST /api/jobs/career-profile   (create-or-update)
//     PUT  /api/jobs/career-profile   (alias of POST)
const express = require('express');
const router = express.Router();
const {
  getCareerProfile, getCareerEducation, saveCareerProfile,
} = require('../controllers/careerprofilecontroller');
const { authenticate, requireRole } = require('../middlewares/auth');

// Same guard used by the user-side job routes (apply / my-applications / saved)
router.get('/',          authenticate, requireRole('user'), getCareerProfile);
router.get('/education', authenticate, requireRole('user'), getCareerEducation);
router.post('/',         authenticate, requireRole('user'), saveCareerProfile);
router.put('/',          authenticate, requireRole('user'), saveCareerProfile);

module.exports = router;
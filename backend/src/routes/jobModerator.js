const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/jobModeratorController');

// ── Job Moderator Auth ────────────────────────────────────────
router.post('/login/send-otp',    sendOtp);
router.post('/login/verify-otp',  verifyOtp);

module.exports = router;
const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, setPassword } = require('../controllers/jobModeratorController');

router.post('/set-password', setPassword);

// ── Job Moderator Auth ────────────────────────────────────────
router.post('/login/send-otp',    sendOtp);
router.post('/login/verify-otp',  verifyOtp);

module.exports = router;
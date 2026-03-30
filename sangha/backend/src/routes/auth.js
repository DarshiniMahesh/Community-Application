const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/user/register',   auth.userRegister);
router.post('/user/login',      auth.userLogin);
router.post('/send-otp',        auth.sendOtp);
router.post('/verify-otp',      auth.verifyOtp);
router.post('/reset-password',  auth.resetPassword);
router.post('/sangha/register', auth.sanghaRegister);

module.exports = router;
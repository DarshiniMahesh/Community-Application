const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Census App" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your OTP Code - Census App',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="color:#ff6b00">Census App</h2>
        <p>Your OTP code is:</p>
        <h1 style="letter-spacing:8px;color:#171717;font-size:36px">${otp}</h1>
        <p style="color:#737373">This code expires in ${process.env.OTP_EXPIRES_MINUTES} minutes.</p>
        <p style="color:#737373">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

const sendModeratorSetupEmail = async (to, name, setupLink) => {
  await transporter.sendMail({
    from: `"Census App" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'You have been added as a Job Moderator - Census App',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#ff6b00">Census App</h2>
        <p>Hi ${name},</p>
        <p>You have been added as a <b>Job Moderator</b> on Census App.</p>
        <p>Click the button below to set your password and get started:</p>
        <a href="${setupLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Set Up Your Account
        </a>
        <p style="color:#737373;font-size:13px">This link expires in 24 hours. If you did not expect this, please ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail, sendModeratorSetupEmail };

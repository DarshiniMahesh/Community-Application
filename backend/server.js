// Community-Application\backend\server.js
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') }); // no-op on Vercel; env vars come from dashboard there

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'loaded ✓' : 'MISSING ✗');

const express = require("express");
const cors = require("cors");

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────
// Allow local development and the deployed portal applications.
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://community-application-adimin.vercel.app',
  'https://community-application-admin.vercel.app',
  'https://community-application.vercel.app',
  'https://community-app-sangha.vercel.app',
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────
const adminRoutes        = require('./src/routes/admin');
const adminReportRoutes  = require('./src/routes/adminreport');
const authRoutes         = require("./src/routes/auth");
const userRoutes         = require("./src/routes/users");
const sanghaRoutes       = require("./src/routes/sangha");
const sanghaReportRoutes = require('./src/routes/sanghareport');
const userschlRoutes     = require('./src/routes/userschl');
const adminSchlRoutes    = require('./src/routes/adminschl');
const companyRoutes      = require('./src/routes/company');
const jobRoutes          = require('./src/routes/job');
const referralRoutes     = require('./src/routes/referral');
const jobModeratorRoutes = require('./src/routes/jobModerator');

console.log('userschl routes loaded ✓');

app.use('/api/admin',         adminRoutes);
// Backward-compatible alias for older deployed admin clients.
app.use('/admin/reports',     adminReportRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
// Register the specific reports path before the broader sangha router.
app.use('/api/sangha/reports', sanghaReportRoutes);
app.use("/api/sangha",        sanghaRoutes);
app.use('/api/userschl',      userschlRoutes);
app.use('/api/admin',         adminSchlRoutes);
app.use('/api/company',       companyRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/referrals',     referralRoutes);
app.use('/api/job-moderator', jobModeratorRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 HANDLER ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// ─── DATE TYPE FIX ────────────────────────────────────────────
const pg = require('pg');
pg.types.setTypeParser(1082, val => val);

// ─── START (local dev only — Vercel sets NODE_ENV=production and never runs this) ───
const PORT = process.env.PORT || 8000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Census API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
//Community-Application\backend\src\routes\adminreport.js
const express = require("express");
const router  = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth");

const {
  getGeneralReport,
  getEnhancedReport,
  getAdminAdvancedReportsuser,
  getAdminSanghaReports,
} = require("../controllers/adminreportController");

const { exportFull, exportSanghas, getFamilyMembers, getSanghaMemberships,getSanghaUsers } = require("../controllers/adminCustomReportController");

// ── Middleware aliases ────────────────────────────────────────
const auth      = authenticate;
const adminOnly = requireRole("admin");

// ── Dashboard endpoints ───────────────────────────────────────
router.get("/general",  auth, adminOnly, getGeneralReport);
router.get("/enhanced", auth, adminOnly, getEnhancedReport);
router.get("/advanced", auth, adminOnly, getAdminAdvancedReportsuser);
router.get("/sanghas",  auth, adminOnly, getAdminSanghaReports);

// ── Custom report endpoints ───────────────────────────────────
router.post("/custom/users",           auth, adminOnly, exportFull);
router.post("/custom/sanghas",         auth, adminOnly, exportSanghas);
router.post("/custom/family-members",      auth, adminOnly, getFamilyMembers);
router.post("/custom/sangha-memberships",  auth, adminOnly, getSanghaMemberships);
router.post("/custom/sangha-users", auth, adminOnly, getSanghaUsers);
module.exports = router;
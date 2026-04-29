// Community-Application\backend\src\routes\adminreport.js
//
// Mounts:
//   GET  /admin/reports/general              → adminreportController.getGeneralReport
//   GET  /admin/reports/advanced             → adminreportController.getAdvancedReport
//   POST /admin/reports/custom/users         → adminCustomReportController.exportFull
//   POST /admin/reports/custom/sanghas       → adminCustomReportController.exportFull
//   POST /admin/reports/custom/family-members → adminCustomReportController.getFamilyMembers
//
// Legacy compatibility when mounted at root:
//   POST /sangha/reports/export/full         → adminCustomReportController.exportFull
//   POST /sangha/reports/family-members      → adminCustomReportController.getFamilyMembers
//
// In app.js / server.js:
//   const adminReportRoutes = require("./routes/adminreport");
//   app.use("/admin/reports",  adminReportRoutes);
//   // OR mount at root for compatibility:
//   // app.use("/",  adminReportRoutes);

const express = require("express");
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');

const { getGeneralReport, getAdvancedReport, getAdminAdvancedReportsuser, getAdminSanghaReports } =
  require("../controllers/adminreportController");

const { exportFull, getFamilyMembers } =
  require("../controllers/adminCustomReportController");

// ── Middleware ────────────────────────────────────────────────────────────────
// Uncomment and attach your auth guard:
// const { verifyToken, requireAdmin } = require("../middleware/auth");
// router.use(verifyToken, requireAdmin);

const authMiddleware = authenticate;
const adminOnly = requireRole('admin');

// ── General & Advanced dashboard endpoints ────────────────────────────────────
router.get("/general",  getGeneralReport);
router.get("/advanced", authMiddleware, adminOnly, getAdminAdvancedReportsuser);
router.get('/sanghas',  authMiddleware, adminOnly, getAdminSanghaReports);


// ── Custom Report endpoints for admin frontend ───────────────────────────────
router.post("/custom/users",   exportFull);
router.post("/custom/sanghas", exportFull);
router.post("/custom/family-members", getFamilyMembers);

// ── Legacy compatibility endpoints (if route mounted at root) ───────────────
router.post("/sangha/reports/export/full",    exportFull);
router.post("/sangha/reports/family-members", getFamilyMembers);

module.exports = router;
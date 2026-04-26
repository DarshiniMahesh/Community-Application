// Community-Application\backend\src\routes\adminreport.js
//
// Register this router in server.js with:
//   const reportRoutes = require('./src/routes/adminreport');
//   app.use('/admin/reports', reportRoutes);
//
const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middlewares/auth');
const rc  = require('../controllers/adminreportController');
const acc = require('../controllers/adminCustomReportController');

// All report routes require admin auth
router.use(authenticate);
router.use(requireRole('admin'));

// ── General Dashboard ────────────────────────────────────────
// Main 6-KPI overview with optional date range filter
router.get('/general/overview',                 rc.getGeneralOverview);
// Date-wise registration sparkline data
router.get('/general/date-registration',        rc.getDateRegistration);
// Sidebar aggregate panels (no date filter)
router.get('/general/sidebar-user-analytics',   rc.getSidebarUserAnalytics);
router.get('/general/sidebar-sangha-analytics', rc.getSidebarSanghaAnalytics);

// ── Advanced Dashboard ───────────────────────────────────────
router.get('/advanced/population',              rc.getPopulationStats);
router.get('/advanced/age-groups',              rc.getAgeGroups);
router.get('/advanced/education',               rc.getEducationStats);
router.get('/advanced/geo',                     rc.getGeoStats);
router.get('/advanced/religious',               rc.getReligiousStats);
router.get('/advanced/income',                  rc.getIncomeStats);
router.get('/advanced/economic',                rc.getEconomicStats);
router.get('/advanced/insurance',               rc.getInsuranceStats);
router.get('/advanced/documents',               rc.getDocumentStats);
// Deep-linked from General dashboard's Details button (gender × status)
router.get('/advanced/gender-status-detail',    rc.getGenderStatusDetail);

// ── Export ───────────────────────────────────────────────────
// ?category=users|sangha|population|economic|education|insurance|documents|geo|gender_status
router.get('/export',                           rc.getExportData);

// ── Custom Report ────────────────────────────────────────────
// ?sections[]=personal&sections[]=economic&status=approved
router.get('/custom',                           acc.getCustomReport);

// ── Sangha Analytics ─────────────────────────────────────────
// ?towns[]=Mangalore&limit=3
router.get('/sangha-analytics',                 rc.getSanghaAnalytics);

module.exports = router;
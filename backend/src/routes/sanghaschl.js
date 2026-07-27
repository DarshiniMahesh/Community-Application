const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
  getCustomCriteria,
  createCustomCriterion,
  updateCustomCriterion,
  deleteCustomCriterion,
  getScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getApplicants,
  getAllApplicants,
  updateApplicantStatus,
  getApplicantStats,
  getApplicantProfile,
  // ── NEW ──
  getScholarshipApplicantsList,
  getSanghaApplicantDetails,
  getSanghaApplicantScholarshipHistory,
} = require("../controllers/sanghaschlcontroller");

const { requireRole } = require("../middlewares/auth");

router.use(requireRole("sangha"));

// ── Categories ────────────────────────────────────────────────
router.get("/categories",    getCategories);
router.post("/categories",   createCategory);

// ── Custom eligibility criteria (sangha-scoped) ───────────────
router.get("/custom-criteria",                   getCustomCriteria);
router.post("/custom-criteria",                  createCustomCriterion);
router.put("/custom-criteria/:criterionId",      updateCustomCriterion);
router.delete("/custom-criteria/:criterionId",   deleteCustomCriterion);

// ── All applicants across every scholarship (sangha-wide) ────
router.get("/applicants",    getAllApplicants);

// ── NEW: rich applicant list + full detail + history (admin-parity) ──
// NOTE: these specific paths must be registered BEFORE "/:id" routes below
router.get("/applications/:applicationId/applicant-details",     getSanghaApplicantDetails);
router.get("/applications/:applicationId/scholarship-history",   getSanghaApplicantScholarshipHistory);

// ── Scholarships ──────────────────────────────────────────────
router.get("/",              getScholarships);
router.post("/",             createScholarship);
router.put("/:id",           updateScholarship);
router.delete("/:id",        deleteScholarship);

// ── NEW: rich applicants-list modal for a given scholarship ──
router.get("/:id/applicants-detail",                     getScholarshipApplicantsList);

// ── Beneficiary approval (existing, unchanged) ─────────────────
router.get("/:id/applicants/stats",                      getApplicantStats);
router.get("/:id/applicants/:profileId/profile",         getApplicantProfile);
router.get("/:id/applicants",                            getApplicants);
router.patch("/:id/applicants/:applicationId",           updateApplicantStatus);

module.exports = router;
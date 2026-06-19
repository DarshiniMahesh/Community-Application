// Community-Application\backend\src\routes\sanghaschlroutes.js
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
  updateApplicantStatus,
  getApplicantStats,
  getApplicantProfile,
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

// ── Scholarships ──────────────────────────────────────────────
router.get("/",              getScholarships);
router.post("/",             createScholarship);
router.put("/:id",           updateScholarship);
router.delete("/:id",        deleteScholarship);

// ── Beneficiary approval ──────────────────────────────────────
router.get("/:id/applicants/stats",                      getApplicantStats);
router.get("/:id/applicants/:profileId/profile",         getApplicantProfile);
router.get("/:id/applicants",                            getApplicants);
router.patch("/:id/applicants/:applicationId",           updateApplicantStatus);

module.exports = router;
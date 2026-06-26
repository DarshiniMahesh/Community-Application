// Community-Application\backend\src\routes\adminschl.js
const express = require("express");
const router = express.Router();
const {
  getAllScholarships,
  getScholarshipById,
  getScholarshipApplicants,
  getApplicantDetails,
  getApplicantScholarshipHistory, // ← add this import
  getAllSanghas,
  getScholarshipCategories,
  getScholarshipStates,
} = require("../controllers/adminschlcontroller");

router.get("/scholarships", getAllScholarships);
router.get("/scholarships/:id", getScholarshipById);
router.get("/scholarships/:id/applicants", getScholarshipApplicants);
router.get("/applications/:applicationId/applicant-details", getApplicantDetails);
router.get("/applications/:applicationId/scholarship-history", getApplicantScholarshipHistory); // ← add this route
router.get("/sanghas", getAllSanghas);
router.get("/scholarship-categories", getScholarshipCategories);
router.get("/scholarship-states", getScholarshipStates);

module.exports = router;
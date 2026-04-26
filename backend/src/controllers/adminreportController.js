// Community-Application\backend\src\controllers\adminreportController.js
const pool = require('../config/db');

// ─── Helper: default date range (past 30 days) ───────────────
const getDefaultRange = (start_date, end_date) => {
  if (!start_date || !end_date) {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    const start = past.toISOString().split('T')[0];
    return { start: start_date || start, end: end_date || end };
  }
  return { start: start_date, end: end_date };
};

// ─── GET /admin/reports/general/overview ─────────────────────
// Returns: sangha stats, user stats, reviewer-based stats, gender×status stats
const getGeneralOverview = async (req, res) => {
  try {
    const { start, end } = getDefaultRange(req.query.start_date, req.query.end_date);
    const endFull = end + ' 23:59:59';
    const p = [start, endFull];

    const [
      sanghaReg, sanghaApproved, sanghaRejected, sanghaPending,
      usersReg,
      usersApproved, usersRejected, usersChanges,
      adminApproved, sanghaApproved2, adminRejected, sanghaRejected2,
      genderStatus,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM sanghas WHERE created_at BETWEEN $1 AND $2`, p),
      pool.query(`SELECT COUNT(*) FROM sanghas WHERE status='approved' AND updated_at BETWEEN $1 AND $2`, p),
      pool.query(`SELECT COUNT(*) FROM sanghas WHERE status='rejected' AND updated_at BETWEEN $1 AND $2`, p),
      pool.query(`SELECT COUNT(*) FROM sanghas WHERE status='pending_approval' AND created_at BETWEEN $1 AND $2`, p),

      pool.query(
        `SELECT COUNT(*) FROM users WHERE role='user' AND is_deleted=FALSE AND created_at BETWEEN $1 AND $2`, p
      ),

      pool.query(`SELECT COUNT(*) FROM profiles WHERE status='approved' AND reviewed_at BETWEEN $1 AND $2`, p),
      pool.query(`SELECT COUNT(*) FROM profiles WHERE status='rejected' AND reviewed_at BETWEEN $1 AND $2`, p),
      pool.query(`SELECT COUNT(*) FROM profiles WHERE status='changes_requested' AND reviewed_at BETWEEN $1 AND $2`, p),

      // Approved by admin
      pool.query(
        `SELECT COUNT(*) FROM profiles p
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status='approved' AND u.role='admin' AND p.reviewed_at BETWEEN $1 AND $2`, p
      ),
      // Approved by sangha
      pool.query(
        `SELECT COUNT(*) FROM profiles p
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status='approved' AND u.role='sangha' AND p.reviewed_at BETWEEN $1 AND $2`, p
      ),
      // Rejected by admin
      pool.query(
        `SELECT COUNT(*) FROM profiles p
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status='rejected' AND u.role='admin' AND p.reviewed_at BETWEEN $1 AND $2`, p
      ),
      // Rejected by sangha
      pool.query(
        `SELECT COUNT(*) FROM profiles p
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status='rejected' AND u.role='sangha' AND p.reviewed_at BETWEEN $1 AND $2`, p
      ),

      // Gender × status breakdown (for charts)
      pool.query(
        `SELECT pd.gender, p.status, COUNT(*) AS count
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status IN ('approved','rejected','changes_requested')
           AND p.reviewed_at BETWEEN $1 AND $2
         GROUP BY pd.gender, p.status
         ORDER BY pd.gender, p.status`, p
      ),
    ]);

    res.json({
      date_range: { start_date: start, end_date: end },
      sangha: {
        registered:  parseInt(sanghaReg.rows[0].count),
        approved:    parseInt(sanghaApproved.rows[0].count),
        rejected:    parseInt(sanghaRejected.rows[0].count),
        pending:     parseInt(sanghaPending.rows[0].count),
      },
      users: {
        registered:        parseInt(usersReg.rows[0].count),
        approved:          parseInt(usersApproved.rows[0].count),
        rejected:          parseInt(usersRejected.rows[0].count),
        changes_requested: parseInt(usersChanges.rows[0].count),
      },
      by_reviewer: {
        admin_approved:   parseInt(adminApproved.rows[0].count),
        sangha_approved:  parseInt(sanghaApproved2.rows[0].count),
        admin_rejected:   parseInt(adminRejected.rows[0].count),
        sangha_rejected:  parseInt(sanghaRejected2.rows[0].count),
      },
      gender_status: genderStatus.rows,   // [{gender, status, count}]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/general/date-registration ────────────
// Date-wise user & sangha registration for sparkline / bar chart
const getDateRegistration = async (req, res) => {
  try {
    const { start, end } = getDefaultRange(req.query.start_date, req.query.end_date);
    const p = [start, end + ' 23:59:59'];

    const [users, sanghas] = await Promise.all([
      pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM users WHERE role='user' AND is_deleted=FALSE AND created_at BETWEEN $1 AND $2
         GROUP BY DATE(created_at) ORDER BY date`, p
      ),
      pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM sanghas WHERE created_at BETWEEN $1 AND $2
         GROUP BY DATE(created_at) ORDER BY date`, p
      ),
    ]);

    res.json({
      date_range:           { start_date: start, end_date: end },
      user_registrations:   users.rows,
      sangha_registrations: sanghas.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/general/sidebar-user-analytics ───────
// Aggregate (no date filter) for sidebar user analytics panel
const getSidebarUserAnalytics = async (req, res) => {
  try {
    const [statusDist, genderDist, reviewerBreakdown] = await Promise.all([
      pool.query(
        `SELECT p.status, COUNT(*) AS count
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         WHERE u.is_deleted=FALSE
         GROUP BY p.status ORDER BY count DESC`
      ),
      pool.query(
        `SELECT pd.gender, p.status, COUNT(*) AS count
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status IN ('approved','rejected','changes_requested')
         GROUP BY pd.gender, p.status ORDER BY pd.gender, count DESC`
      ),
      pool.query(
        `SELECT u.role AS reviewer_role, p.status, COUNT(*) AS count
         FROM profiles p
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status IN ('approved','rejected')
         GROUP BY u.role, p.status ORDER BY u.role`
      ),
    ]);

    res.json({
      status_distribution: statusDist.rows,
      gender_status:       genderDist.rows,
      reviewer_breakdown:  reviewerBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/general/sidebar-sangha-analytics ─────
// Aggregate sangha data for sidebar sangha analytics panel
const getSidebarSanghaAnalytics = async (req, res) => {
  try {
    const [statusDist, byState, memberCounts] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) AS count FROM sanghas GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT state, COUNT(*) AS count FROM sanghas GROUP BY state ORDER BY count DESC`),
      pool.query(
        `SELECT s.id, s.sangha_name, COUNT(sm.id) AS member_count
         FROM sanghas s
         LEFT JOIN sangha_members sm ON sm.sangha_id = s.id
         WHERE s.status='approved'
         GROUP BY s.id, s.sangha_name ORDER BY member_count DESC LIMIT 10`
      ),
    ]);

    res.json({
      status_distribution: statusDist.rows,
      by_state:            byState.rows,
      top_by_members:      memberCounts.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/population ──────────────────
const getPopulationStats = async (req, res) => {
  try {
    const [families, genderDist, marriedDist, disabilityDist, membersTotal, membersGender] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM profiles WHERE status='approved'`),
      pool.query(
        `SELECT pd.gender, COUNT(*) AS count
         FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' GROUP BY pd.gender`
      ),
      pool.query(
        `SELECT is_married, COUNT(*) AS count
         FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' GROUP BY is_married`
      ),
      pool.query(
        `SELECT has_disability, COUNT(*) AS count
         FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' GROUP BY has_disability`
      ),
      pool.query(
        `SELECT COUNT(*) FROM family_members fm
         JOIN profiles p ON p.id = fm.profile_id WHERE p.status='approved'`
      ),
      pool.query(
        `SELECT fm.gender, COUNT(*) AS count
         FROM family_members fm JOIN profiles p ON p.id = fm.profile_id
         WHERE p.status='approved' GROUP BY fm.gender`
      ),
    ]);

    res.json({
      total_families:       parseInt(families.rows[0].count),
      total_population:     parseInt(membersTotal.rows[0].count),
      gender_distribution:  genderDist.rows,
      family_member_gender: membersGender.rows,
      marriage_status:      marriedDist.rows,
      disability_status:    disabilityDist.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/age-groups ──────────────────
const getAgeGroups = async (req, res) => {
  try {
    const [profileAges, memberAges] = await Promise.all([
      pool.query(
        `SELECT
           CASE
             WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 18            THEN 'Under 18'
             WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) BETWEEN 18 AND 30 THEN '18 – 30'
             WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) BETWEEN 31 AND 45 THEN '31 – 45'
             WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) BETWEEN 46 AND 60 THEN '46 – 60'
             ELSE 'Above 60'
           END AS age_group,
           COUNT(*) AS count
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND pd.date_of_birth IS NOT NULL
         GROUP BY age_group ORDER BY age_group`
      ),
      pool.query(
        `SELECT
           CASE
             WHEN EXTRACT(YEAR FROM AGE(fm.dob)) < 18            THEN 'Under 18'
             WHEN EXTRACT(YEAR FROM AGE(fm.dob)) BETWEEN 18 AND 30 THEN '18 – 30'
             WHEN EXTRACT(YEAR FROM AGE(fm.dob)) BETWEEN 31 AND 45 THEN '31 – 45'
             WHEN EXTRACT(YEAR FROM AGE(fm.dob)) BETWEEN 46 AND 60 THEN '46 – 60'
             ELSE 'Above 60'
           END AS age_group,
           fm.gender,
           COUNT(*) AS count
         FROM family_members fm
         JOIN profiles p ON p.id = fm.profile_id
         WHERE p.status='approved' AND fm.dob IS NOT NULL
         GROUP BY age_group, fm.gender ORDER BY age_group, fm.gender`
      ),
    ]);

    res.json({
      profile_age_groups:           profileAges.rows,
      member_age_groups_by_gender:  memberAges.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/education ───────────────────
const getEducationStats = async (req, res) => {
  try {
    const [educationLevels, professionTypes, selfEmployed, industries, studyStatus, workStatus] = await Promise.all([
      pool.query(
        `SELECT me.highest_education, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' AND me.highest_education IS NOT NULL
         GROUP BY me.highest_education ORDER BY count DESC`
      ),
      pool.query(
        `SELECT me.profession_type::text AS profession_type, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' AND me.profession_type IS NOT NULL
         GROUP BY me.profession_type ORDER BY count DESC`
      ),
      pool.query(
        `SELECT me.self_employed_type::text AS self_employed_type, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' AND me.self_employed_type IS NOT NULL
         GROUP BY me.self_employed_type ORDER BY count DESC`
      ),
      pool.query(
        `SELECT me.industry, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' AND me.industry IS NOT NULL
         GROUP BY me.industry ORDER BY count DESC LIMIT 15`
      ),
      pool.query(
        `SELECT is_currently_studying, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' GROUP BY is_currently_studying`
      ),
      pool.query(
        `SELECT is_currently_working, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' GROUP BY is_currently_working`
      ),
    ]);

    res.json({
      education_levels:   educationLevels.rows,
      profession_types:   professionTypes.rows,
      self_employed_types: selfEmployed.rows,
      industries:         industries.rows,
      study_status:       studyStatus.rows,
      work_status:        workStatus.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/geo ─────────────────────────
const getGeoStats = async (req, res) => {
  try {
    const [byState, byDistrict, byPincode, byCity, byCityGender, byPincodeGender] = await Promise.all([
      pool.query(
        `SELECT a.state, COUNT(*) AS count
         FROM addresses a JOIN profiles p ON p.id = a.profile_id
         WHERE p.status='approved' AND a.state IS NOT NULL
         GROUP BY a.state ORDER BY count DESC`
      ),
      pool.query(
        `SELECT a.district, a.state, COUNT(*) AS count
         FROM addresses a JOIN profiles p ON p.id = a.profile_id
         WHERE p.status='approved' AND a.district IS NOT NULL
         GROUP BY a.district, a.state ORDER BY count DESC LIMIT 20`
      ),
      pool.query(
        `SELECT a.pincode, COUNT(*) AS count
         FROM addresses a JOIN profiles p ON p.id = a.profile_id
         WHERE p.status='approved' AND a.pincode IS NOT NULL
         GROUP BY a.pincode ORDER BY count DESC LIMIT 20`
      ),
      pool.query(
        `SELECT a.city, COUNT(*) AS count
         FROM addresses a JOIN profiles p ON p.id = a.profile_id
         WHERE p.status='approved' AND a.city IS NOT NULL
         GROUP BY a.city ORDER BY count DESC LIMIT 15`
      ),
      pool.query(
        `SELECT a.city, pd.gender, COUNT(*) AS count
         FROM addresses a
         JOIN profiles p ON p.id = a.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND a.city IS NOT NULL
         GROUP BY a.city, pd.gender
         ORDER BY a.city, pd.gender`
      ),
      pool.query(
        `SELECT a.pincode, pd.gender, COUNT(*) AS count
         FROM addresses a
         JOIN profiles p ON p.id = a.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND a.pincode IS NOT NULL
         GROUP BY a.pincode, pd.gender
         ORDER BY a.pincode, pd.gender`
      ),
    ]);

    res.json({
      by_state:    byState.rows,
      by_district: byDistrict.rows,
      by_pincode:  byPincode.rows,
      by_city:     byCity.rows,
      by_city_gender: byCityGender.rows,
      by_pincode_gender: byPincodeGender.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/religious ───────────────────
const getReligiousStats = async (req, res) => {
  try {
    const [gotraRows, kuladevataRows, pravaraRows] = await Promise.all([
      pool.query(
        `SELECT rd.gotra, pd.gender, COUNT(*) AS count
         FROM religious_details rd
         JOIN profiles p ON p.id = rd.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND rd.gotra IS NOT NULL AND TRIM(rd.gotra) <> ''
         GROUP BY rd.gotra, pd.gender
         ORDER BY COUNT(*) DESC`
      ),
      pool.query(
        `SELECT COALESCE(rd.kuladevata, rd.kuladevata_other) AS kuladevata, pd.gender, COUNT(*) AS count
         FROM religious_details rd
         JOIN profiles p ON p.id = rd.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND COALESCE(rd.kuladevata, rd.kuladevata_other) IS NOT NULL
         GROUP BY COALESCE(rd.kuladevata, rd.kuladevata_other), pd.gender
         ORDER BY COUNT(*) DESC`
      ),
      pool.query(
        `SELECT rd.pravara, pd.gender, COUNT(*) AS count
         FROM religious_details rd
         JOIN profiles p ON p.id = rd.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND rd.pravara IS NOT NULL AND TRIM(rd.pravara) <> ''
         GROUP BY rd.pravara, pd.gender
         ORDER BY COUNT(*) DESC`
      ),
    ]);

    res.json({
      gotra_gender: gotraRows.rows,
      kuladevata_gender: kuladevataRows.rows,
      pravara_gender: pravaraRows.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/income ──────────────────────
const getIncomeStats = async (req, res) => {
  try {
    const [selfIncome, familyIncome, selfByGender] = await Promise.all([
      pool.query(
        `SELECT ed.self_income::text AS income_range, COUNT(*) AS count
         FROM economic_details ed JOIN profiles p ON p.id = ed.profile_id
         WHERE p.status='approved' AND ed.self_income IS NOT NULL
         GROUP BY ed.self_income ORDER BY count DESC`
      ),
      pool.query(
        `SELECT ed.family_income::text AS income_range, COUNT(*) AS count
         FROM economic_details ed JOIN profiles p ON p.id = ed.profile_id
         WHERE p.status='approved' AND ed.family_income IS NOT NULL
         GROUP BY ed.family_income ORDER BY count DESC`
      ),
      pool.query(
        `SELECT pd.gender, ed.self_income::text AS income_range, COUNT(*) AS count
         FROM economic_details ed
         JOIN profiles p ON p.id = ed.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved' AND ed.self_income IS NOT NULL
         GROUP BY pd.gender, ed.self_income ORDER BY pd.gender, count DESC`
      ),
    ]);

    res.json({
      self_income_distribution:   selfIncome.rows,
      family_income_distribution: familyIncome.rows,
      self_income_by_gender:      selfByGender.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/economic ────────────────────
const getEconomicStats = async (req, res) => {
  try {
    const [assetsSummary, investSummary, professionBreakdown] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE fac_own_house = TRUE)          AS own_house,
           COUNT(*) FILTER (WHERE fac_agricultural_land = TRUE)  AS agricultural_land,
           COUNT(*) FILTER (WHERE fac_two_wheeler = TRUE)        AS two_wheeler,
           COUNT(*) FILTER (WHERE fac_car = TRUE)                AS four_wheeler,
           COUNT(*) FILTER (WHERE fac_rented_house = TRUE)       AS rented_house,
           COUNT(*)                                              AS total
         FROM economic_details ed
         JOIN profiles p ON p.id = ed.profile_id
         WHERE p.status='approved'`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE inv_fixed_deposits = TRUE)     AS fixed_deposits,
           COUNT(*) FILTER (WHERE inv_mutual_funds_sip = TRUE)   AS mutual_funds_sip,
           COUNT(*) FILTER (WHERE inv_shares_demat = TRUE)       AS shares_demat,
           COUNT(*) FILTER (WHERE inv_others = TRUE)             AS other_investments,
           COUNT(*)                                              AS total
         FROM economic_details ed
         JOIN profiles p ON p.id = ed.profile_id
         WHERE p.status='approved'`
      ),
      pool.query(
        `SELECT me.profession_type::text AS profession, COUNT(*) AS count
         FROM member_education me JOIN profiles p ON p.id = me.profile_id
         WHERE p.status='approved' AND me.profession_type IS NOT NULL
         GROUP BY me.profession_type ORDER BY count DESC`
      ),
    ]);

    res.json({
      assets:               assetsSummary.rows[0],
      investments:          investSummary.rows[0],
      profession_breakdown: professionBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/insurance ───────────────────
const getInsuranceStats = async (req, res) => {
  try {
    const [summary, byProfile] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE array_length(health_coverage, 1) > 0)       AS has_health,
           COUNT(*) FILTER (WHERE array_length(life_coverage, 1) > 0)         AS has_life,
           COUNT(*) FILTER (WHERE array_length(term_coverage, 1) > 0)         AS has_term,
           COUNT(*) FILTER (WHERE array_length(konkani_card_coverage, 1) > 0) AS has_konkani_card,
           COUNT(*) FILTER (WHERE
             array_length(health_coverage, 1) IS NULL AND
             array_length(life_coverage, 1)  IS NULL AND
             array_length(term_coverage, 1)  IS NULL
           )                                                                   AS no_insurance,
           COUNT(*)                                                            AS total_records
         FROM member_insurance mi
         JOIN profiles p ON p.id = mi.profile_id
         WHERE p.status='approved'`
      ),
      pool.query(
        `SELECT pd.gender,
           COUNT(*) FILTER (WHERE array_length(mi.health_coverage, 1) > 0) AS has_health,
           COUNT(*) FILTER (WHERE array_length(mi.life_coverage, 1)  > 0)  AS has_life,
           COUNT(*) FILTER (WHERE array_length(mi.term_coverage, 1)  > 0)  AS has_term
         FROM member_insurance mi
         JOIN profiles p ON p.id = mi.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved'
         GROUP BY pd.gender`
      ),
    ]);

    res.json({
      insurance_summary:    summary.rows[0],
      insurance_by_gender:  byProfile.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/documents ───────────────────
const getDocumentStats = async (req, res) => {
  try {
    const [summary, byGender] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE aadhaar_coverage IS NOT NULL AND aadhaar_coverage::text <> 'none') AS has_aadhaar,
           COUNT(*) FILTER (WHERE pan_coverage     IS NOT NULL AND pan_coverage::text     <> 'none') AS has_pan,
           COUNT(*) FILTER (WHERE voter_id_coverage IS NOT NULL AND voter_id_coverage::text <> 'none') AS has_voter_id,
           COUNT(*) FILTER (WHERE land_doc_coverage IS NOT NULL AND land_doc_coverage::text <> 'none') AS has_land_doc,
           COUNT(*) FILTER (WHERE dl_coverage       IS NOT NULL AND dl_coverage::text       <> 'none') AS has_dl,
           COUNT(*)                                                                                    AS total_records
         FROM member_documents md
         JOIN profiles p ON p.id = md.profile_id
         WHERE p.status='approved'`
      ),
      pool.query(
        `SELECT pd.gender,
           COUNT(*) FILTER (WHERE md.aadhaar_coverage IS NOT NULL AND md.aadhaar_coverage::text <> 'none') AS has_aadhaar,
           COUNT(*) FILTER (WHERE md.pan_coverage     IS NOT NULL AND md.pan_coverage::text     <> 'none') AS has_pan,
           COUNT(*) FILTER (WHERE md.voter_id_coverage IS NOT NULL AND md.voter_id_coverage::text <> 'none') AS has_voter_id
         FROM member_documents md
         JOIN profiles p ON p.id = md.profile_id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status='approved'
         GROUP BY pd.gender`
      ),
    ]);

    res.json({
      document_summary:    summary.rows[0],
      documents_by_gender: byGender.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/advanced/gender-status-detail ────────
// Deep-linked from General dashboard Details button.
// Returns full gender × status × reviewer breakdown.
const getGenderStatusDetail = async (req, res) => {
  try {
    const [genderStatus, reviewerGender] = await Promise.all([
      pool.query(
        `SELECT pd.gender, p.status, COUNT(*) AS count
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status IN ('approved','rejected','changes_requested')
         GROUP BY pd.gender, p.status
         ORDER BY pd.gender, p.status`
      ),
      pool.query(
        `SELECT pd.gender, p.status, u.role AS reviewer_role, COUNT(*) AS count
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         JOIN users u ON u.id = p.reviewed_by
         WHERE p.status IN ('approved','rejected')
         GROUP BY pd.gender, p.status, u.role
         ORDER BY pd.gender, p.status, u.role`
      ),
    ]);

    res.json({
      gender_status_breakdown:    genderStatus.rows,
      gender_status_by_reviewer:  reviewerGender.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/export ───────────────────────────────
// Returns raw data for client-side CSV/Excel export.
const getExportData = async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;

    let rows = [];
    let filename = 'report';

    switch (category) {
      case 'users': {
        const r = await pool.query(
          `SELECT u.email, u.phone, u.created_at AS registered_on,
                  p.status, p.submitted_at, p.reviewed_at,
                  pd.first_name, pd.last_name, pd.gender, pd.date_of_birth,
                  pd.is_married, s.sangha_name
           FROM users u
           JOIN profiles p ON p.user_id = u.id
           LEFT JOIN personal_details pd ON pd.profile_id = p.id
           LEFT JOIN sanghas s ON s.id = p.sangha_id
           WHERE u.role='user' AND u.is_deleted=FALSE
           ORDER BY u.created_at DESC`
        );
        rows = r.rows; filename = 'users_report';
        break;
      }
      case 'sangha': {
        const r = await pool.query(
          `SELECT s.sangha_name, s.email, s.phone, s.district, s.state,
                  s.status, s.is_blocked, s.created_at, s.updated_at
           FROM sanghas s ORDER BY s.created_at DESC`
        );
        rows = r.rows; filename = 'sangha_report';
        break;
      }
      case 'population': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender, pd.date_of_birth,
                  pd.is_married, pd.has_disability,
                  p.status, s.sangha_name
           FROM profiles p
           JOIN personal_details pd ON pd.profile_id = p.id
           LEFT JOIN sanghas s ON s.id = p.sangha_id
           WHERE p.status='approved' ORDER BY pd.last_name`
        );
        rows = r.rows; filename = 'population_report';
        break;
      }
      case 'economic': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  ed.self_income::text, ed.family_income::text,
                  ed.fac_own_house, ed.fac_agricultural_land,
                  ed.fac_two_wheeler, ed.fac_car, ed.fac_rented_house,
                  ed.inv_fixed_deposits, ed.inv_mutual_funds_sip,
                  ed.inv_shares_demat, ed.inv_others
           FROM economic_details ed
           JOIN profiles p ON p.id = ed.profile_id
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE p.status='approved' ORDER BY pd.last_name`
        );
        rows = r.rows; filename = 'economic_report';
        break;
      }
      case 'education': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  me.member_name, me.member_relation, me.highest_education,
                  me.profession_type::text, me.self_employed_type::text,
                  me.industry, me.is_currently_studying, me.is_currently_working
           FROM member_education me
           JOIN profiles p ON p.id = me.profile_id
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE p.status='approved' ORDER BY pd.last_name`
        );
        rows = r.rows; filename = 'education_report';
        break;
      }
      case 'insurance': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  mi.member_name, mi.member_relation,
                  mi.health_coverage, mi.life_coverage,
                  mi.term_coverage, mi.konkani_card_coverage
           FROM member_insurance mi
           JOIN profiles p ON p.id = mi.profile_id
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE p.status='approved' ORDER BY pd.last_name`
        );
        rows = r.rows; filename = 'insurance_report';
        break;
      }
      case 'documents': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  md.member_name, md.member_relation,
                  md.aadhaar_coverage::text, md.pan_coverage::text,
                  md.voter_id_coverage::text, md.land_doc_coverage::text, md.dl_coverage::text
           FROM member_documents md
           JOIN profiles p ON p.id = md.profile_id
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE p.status='approved' ORDER BY pd.last_name`
        );
        rows = r.rows; filename = 'documents_report';
        break;
      }
      case 'geo': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  a.address_type, a.city, a.district, a.state, a.pincode, a.taluk
           FROM addresses a
           JOIN profiles p ON p.id = a.profile_id
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE p.status='approved' ORDER BY a.state, a.district`
        );
        rows = r.rows; filename = 'geo_report';
        break;
      }
      case 'gender_status': {
        const r = await pool.query(
          `SELECT pd.first_name, pd.last_name, pd.gender,
                  p.status, p.reviewed_at,
                  u.role AS reviewer_role
           FROM profiles p
           JOIN personal_details pd ON pd.profile_id = p.id
           LEFT JOIN users u ON u.id = p.reviewed_by
           WHERE p.status IN ('approved','rejected','changes_requested')
           ORDER BY pd.gender, p.status`
        );
        rows = r.rows; filename = 'gender_status_report';
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid category. Valid: users, sangha, population, economic, education, insurance, documents, geo, gender_status' });
    }

    res.json({ filename, data: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/reports/sangha-analytics ─────────────────────
const getSanghaAnalytics = async (req, res) => {
  try {
    const towns = [].concat(req.query.towns ?? []);
    const limit = parseInt(req.query.limit ?? '3');

    const townFilter = towns.length > 0
      ? `AND LOWER(COALESCE(s.city, s.village_town, s.district)) = ANY(ARRAY[${towns.map((_, i) => `$${i + 1}`).join(',')}]::text[])`
      : '';
    const params = towns.map((t) => t.toLowerCase());

    const topTowns = await pool.query(
      `SELECT
         COALESCE(s.city, s.village_town, s.district) AS town,
         s.state,
         COUNT(DISTINCT s.id)                         AS sangha_count,
         COUNT(DISTINCT sm.id)                        AS member_count
       FROM sanghas s
       LEFT JOIN sangha_members sm ON sm.sangha_id = s.id
       WHERE s.status = 'approved'
       ${townFilter}
       GROUP BY COALESCE(s.city, s.village_town, s.district), s.state
       ORDER BY sangha_count DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    const ageAnalytics = await pool.query(
      `SELECT
         COALESCE(s.city, s.village_town, s.district) AS town,
         CASE
           WHEN EXTRACT(YEAR FROM AGE(sm.dob)) < 18            THEN 'Under 18'
           WHEN EXTRACT(YEAR FROM AGE(sm.dob)) BETWEEN 18 AND 30 THEN '18 – 30'
           WHEN EXTRACT(YEAR FROM AGE(sm.dob)) BETWEEN 31 AND 45 THEN '31 – 45'
           WHEN EXTRACT(YEAR FROM AGE(sm.dob)) BETWEEN 46 AND 60 THEN '46 – 60'
           ELSE 'Above 60'
         END AS age_group,
         COUNT(*) AS count
       FROM sangha_members sm
       JOIN sanghas s ON s.id = sm.sangha_id
       WHERE s.status = 'approved' AND sm.dob IS NOT NULL
       ${townFilter}
       GROUP BY town, age_group
       ORDER BY town, age_group`,
      params
    );

    const memberTypeAnalytics = await pool.query(
      `SELECT
         COALESCE(s.city, s.village_town, s.district) AS town,
         sm.member_type,
         COUNT(*) AS count
       FROM sangha_members sm
       JOIN sanghas s ON s.id = sm.sangha_id
       WHERE s.status = 'approved'
       ${townFilter}
       GROUP BY town, sm.member_type
       ORDER BY town`,
      params
    );

    const economicByTown = await pool.query(
      `SELECT
         COALESCE(s.city, s.village_town, s.district) AS town,
         COUNT(DISTINCT p.id)                         AS approved_user_count,
         COUNT(DISTINCT sm_member.id)                 AS sangha_member_count
       FROM sanghas s
       LEFT JOIN profiles p ON p.sangha_id = s.id AND p.status = 'approved'
       LEFT JOIN sangha_members sm_member ON sm_member.sangha_id = s.id
       WHERE s.status = 'approved'
       ${townFilter}
       GROUP BY COALESCE(s.city, s.village_town, s.district)
       ORDER BY sangha_member_count DESC`,
      params
    );

    const availableTowns = await pool.query(
      `SELECT DISTINCT COALESCE(city, village_town, district) AS town, state
       FROM sanghas WHERE status = 'approved' AND COALESCE(city, village_town, district) IS NOT NULL
       ORDER BY town LIMIT 50`
    );

    res.json({
      top_towns: topTowns.rows,
      age_analytics: ageAnalytics.rows,
      member_type: memberTypeAnalytics.rows,
      economic_by_town: economicByTown.rows,
      available_towns: availableTowns.rows,
    });
  } catch (err) {
    console.error('sanghaAnalytics error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

module.exports = {
  getGeneralOverview,
  getDateRegistration,
  getSidebarUserAnalytics,
  getSidebarSanghaAnalytics,
  getPopulationStats,
  getAgeGroups,
  getEducationStats,
  getGeoStats,
  getReligiousStats,
  getIncomeStats,
  getEconomicStats,
  getInsuranceStats,
  getDocumentStats,
  getGenderStatusDetail,
  getExportData,
  getSanghaAnalytics,
};
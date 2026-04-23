// Community-Application\backend\src\controllers\customReportController.js
const pool = require('../config/db');

/**
 * GET /admin/reports/custom
 * Query params:
 *   - sections[]  : one or more of personal, economic, education, family, documents, insurance
 *   - status      : 'approved' | omit for all statuses
 *
 * Always returns personal base columns. Joins additional tables per section.
 */
const getCustomReport = async (req, res) => {
  try {
    const sections = [].concat(req.query.sections ?? ['personal']);
    const statusFilter = req.query.status; // e.g. 'approved', or absent for all

    const statusClause = statusFilter
      ? `AND p.status = '${statusFilter}'`
      : `AND p.status IN ('approved','rejected','pending','changes_requested','draft')`;

    // ── Always join personal ──────────────────────────────────
    let selectCols = `
      CONCAT(pd.first_name, ' ', pd.last_name)     AS full_name,
      u.email,
      u.phone,
      pd.gender,
      pd.date_of_birth,
      p.status,
      p.submitted_at,
      p.reviewed_at
    `;
    let joins = `
      JOIN users u         ON u.id = p.user_id
      JOIN personal_details pd ON pd.profile_id = p.id
    `;
    let extraSelects = [];

    if (sections.includes('economic')) {
      joins += `LEFT JOIN economic_details ed ON ed.profile_id = p.id\n`;
      extraSelects.push(`
        ed.self_income::text    AS self_income,
        ed.family_income::text  AS family_income,
        ed.fac_own_house,
        ed.fac_agricultural_land,
        ed.fac_two_wheeler,
        ed.fac_car,
        ed.fac_rented_house,
        ed.inv_fixed_deposits,
        ed.inv_mutual_funds_sip,
        ed.inv_shares_demat,
        ed.inv_others
      `);
    }

    if (sections.includes('education')) {
      // Use LATERAL to get first education row per profile
      joins += `LEFT JOIN LATERAL (
        SELECT member_name, member_relation, highest_education,
               profession_type::text AS profession_type,
               self_employed_type::text AS self_employed_type,
               industry, is_currently_studying, is_currently_working
        FROM member_education WHERE profile_id = p.id ORDER BY sort_order LIMIT 1
      ) medu ON TRUE\n`;
      extraSelects.push(`
        medu.member_name            AS edu_member_name,
        medu.member_relation        AS edu_member_relation,
        medu.highest_education,
        medu.profession_type,
        medu.self_employed_type,
        medu.industry,
        medu.is_currently_studying,
        medu.is_currently_working
      `);
    }

    if (sections.includes('family')) {
      // LATERAL to get first family member per profile
      joins += `LEFT JOIN LATERAL (
        SELECT relation, name, gender AS fm_gender, age, dob, disability
        FROM family_members WHERE profile_id = p.id ORDER BY sort_order LIMIT 1
      ) fm ON TRUE\n`;
      extraSelects.push(`
        fm.relation      AS fm_relation,
        fm.name          AS fm_name,
        fm.fm_gender,
        fm.age           AS fm_age,
        fm.dob           AS fm_dob,
        fm.disability    AS fm_disability
      `);
    }

    if (sections.includes('documents')) {
      joins += `LEFT JOIN LATERAL (
        SELECT member_name, member_relation,
               aadhaar_coverage::text, pan_coverage::text,
               voter_id_coverage::text, land_doc_coverage::text, dl_coverage::text
        FROM member_documents WHERE profile_id = p.id ORDER BY sort_order LIMIT 1
      ) mdoc ON TRUE\n`;
      extraSelects.push(`
        mdoc.member_name          AS doc_member_name,
        mdoc.member_relation      AS doc_member_relation,
        mdoc.aadhaar_coverage,
        mdoc.pan_coverage,
        mdoc.voter_id_coverage,
        mdoc.land_doc_coverage,
        mdoc.dl_coverage
      `);
    }

    if (sections.includes('insurance')) {
      joins += `LEFT JOIN LATERAL (
        SELECT member_name, member_relation,
               health_coverage, life_coverage, term_coverage, konkani_card_coverage
        FROM member_insurance WHERE profile_id = p.id ORDER BY sort_order LIMIT 1
      ) mins ON TRUE\n`;
      extraSelects.push(`
        mins.member_name             AS ins_member_name,
        mins.member_relation         AS ins_member_relation,
        mins.health_coverage::text,
        mins.life_coverage::text,
        mins.term_coverage::text,
        mins.konkani_card_coverage::text
      `);
    }

    const allSelect = [selectCols, ...extraSelects].join(',');

    const query = `
      SELECT ${allSelect}
      FROM profiles p
      ${joins}
      WHERE u.is_deleted = FALSE
      ${statusClause}
      ORDER BY p.submitted_at DESC NULLS LAST
      LIMIT 2000
    `;

    const result = await pool.query(query);

    res.json({
      total: result.rows.length,
      sections,
      data: result.rows,
    });
  } catch (err) {
    console.error('customReport error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

/**
 * GET /admin/reports/sangha-analytics
 * Town-wise sangha analytics with filters.
 * Query params:
 *   - towns[]  : filter by one or more towns/cities (optional)
 *   - limit    : default 3 (top N towns)
 */
const getSanghaAnalytics = async (req, res) => {
  try {
    const towns = [].concat(req.query.towns ?? []);
    const limit = parseInt(req.query.limit ?? '3');

    const townFilter = towns.length > 0
      ? `AND LOWER(COALESCE(s.city, s.village_town, s.district)) = ANY(ARRAY[${towns.map((_, i) => `$${i + 1}`).join(',')}]::text[])`
      : '';
    const params = towns.map(t => t.toLowerCase());

    // Top towns by sangha count
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

    // Member age-wise analytics across those towns
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

    // Part-time vs full-time per town
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

    // Economic status of users in those towns (approved profiles)
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

    // Available towns (for filter dropdown)
    const availableTowns = await pool.query(
      `SELECT DISTINCT COALESCE(city, village_town, district) AS town, state
       FROM sanghas WHERE status = 'approved' AND COALESCE(city, village_town, district) IS NOT NULL
       ORDER BY town LIMIT 50`
    );

    res.json({
      top_towns:           topTowns.rows,
      age_analytics:       ageAnalytics.rows,
      member_type:         memberTypeAnalytics.rows,
      economic_by_town:    economicByTown.rows,
      available_towns:     availableTowns.rows,
    });
  } catch (err) {
    console.error('sanghaAnalytics error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

module.exports = { getCustomReport, getSanghaAnalytics };
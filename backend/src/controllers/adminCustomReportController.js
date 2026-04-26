// backend\src\controllers\adminCustomReportController.js
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
    const statusFilter = req.query.status;

    const statusClause = statusFilter
      ? `AND p.status = '${statusFilter}'`
      : `AND p.status IN ('approved','rejected','pending','changes_requested','draft')`;

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
    const extraSelects = [];

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
      joins += `LEFT JOIN family_info fi ON fi.profile_id = p.id\n`;
      joins += `LEFT JOIN LATERAL (
        SELECT relation, name, gender AS fm_gender, age, dob, disability
        FROM family_members WHERE profile_id = p.id ORDER BY sort_order LIMIT 1
      ) fm ON TRUE\n`;
      extraSelects.push(`
        fi.family_type::text AS family_type,
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

    if (sections.includes('location')) {
      joins += `LEFT JOIN LATERAL (
        SELECT city, district, state, pincode
        FROM addresses WHERE profile_id = p.id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1
      ) adr ON TRUE\n`;
      extraSelects.push(`
        adr.city,
        adr.district,
        adr.state,
        adr.pincode
      `);
    }

    if (sections.includes('religious')) {
      joins += `LEFT JOIN religious_details rd ON rd.profile_id = p.id\n`;
      extraSelects.push(`
        rd.gotra,
        rd.pravara,
        rd.kuladevata
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
    console.error('admin custom report error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
};

module.exports = { getCustomReport };

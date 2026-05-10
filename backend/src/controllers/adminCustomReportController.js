// Community-Application\backend\src\controllers\adminCustomReportController.js
//
// Main table (exportFull) = ONE ROW PER REGISTERED USER
//   - personal-details: includes "Primary Sangha" = sg_primary.sangha_name
//   - education-profession: the user's own (Self/Head-of-family) education row
//   - economic-details, insurance, documents: aggregated per profile
//
// Family sub-table (getFamilyMembers) = ONE ROW PER FAMILY MEMBER
//
// Sangha Memberships (getSanghaMemberships) = cross-membership
//   Columns: User Full Name, Gender, Age, Member In, Type of Member
//
// Sangha Members Roster (exportSanghas + sangha-members section):
//   Reads from sangha_members table (manually added by sangha admin) — NOT profiles
//
// Sangha User Table (getSanghaUsers):
//   Returns registered users (profiles) whose primary sangha is one of the given sanghaIds
//   Groups by sangha via _sangha_id / _sangha_name

const pool = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reports/custom/users
// Returns ONE ROW PER REGISTERED USER (profile)
// ─────────────────────────────────────────────────────────────────────────────
async function exportFull(req, res) {
  try {
    const {
      sections = [],
      includeAllStatuses = false,
      includeAll = false,
      dateFrom,
      dateTo,
    } = req.body;

    const allowAllStatuses = includeAllStatuses || includeAll;

    if (!sections.length) return res.json([]);

    // ── Always-present base columns ───────────────────────────────────────────
    const joins  = [];
    const select = [
      "p.id                                                                           AS _profile_id",
      "TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.middle_name,''),' ',pd.last_name))   AS \"Full Name\"",
      "u.email                                                                         AS \"Email\"",
      "u.phone                                                                         AS \"Phone\"",
      "p.status::text                                                                   AS \"Status\"",
    ];

    // personal_details is always joined (needed for Full Name)
    joins.push("LEFT JOIN personal_details pd ON pd.profile_id = p.id");
    // Always join primary sangha so it's available for personal-details section
    joins.push("LEFT JOIN sanghas sg_primary ON sg_primary.id = p.sangha_id");

    // ── Section: personal-details ─────────────────────────────────────────────
    if (sections.includes("personal-details")) {
      select.push(
        "pd.gender::text                                                               AS \"Gender\"",
        "TO_CHAR(pd.date_of_birth, 'DD-Mon-YYYY')                                     AS \"Date of Birth\"",
        "CASE WHEN pd.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int ELSE NULL END AS \"Age\"",
        "pd.fathers_name                                                               AS \"Father's Name\"",
        "pd.mothers_name                                                               AS \"Mother's Name\"",
        "pd.surname_in_use                                                             AS \"Surname in Use\"",
        "pd.surname_as_per_gotra                                                       AS \"Surname as per Gotra\"",
        "CASE WHEN pd.marital_status IS NOT NULL AND pd.marital_status <> '' THEN 'Yes' ELSE 'No' END AS \"Is Married\"",
        "CASE WHEN LOWER(COALESCE(pd.has_disability,'no')) IN ('yes','true','1') THEN 'Yes' ELSE 'No' END AS \"Has Disability\"",
        "COALESCE(sg_primary.sangha_name, '—')                                        AS \"Primary Sangha\"",
        "TO_CHAR(p.submitted_at, 'DD-Mon-YYYY')                                       AS \"Submitted At\"",
        "TO_CHAR(p.reviewed_at,  'DD-Mon-YYYY')                                       AS \"Reviewed At\""
      );
    }

    // ── Section: religious-details ────────────────────────────────────────────
    if (sections.includes("religious-details")) {
      joins.push(
        "LEFT JOIN religious_details rd ON rd.profile_id = p.id",
        "LEFT JOIN family_history    fh ON fh.profile_id = p.id"
      );
      select.push(
        "rd.gotra                                                                      AS \"Gotra\"",
        "rd.pravara                                                                    AS \"Pravara\"",
        "COALESCE(NULLIF(rd.kuladevata_other,''), rd.kuladevata)                       AS \"Kuladevata\"",
        "rd.kuladevata_other                                                           AS \"Kuladevata Other\"",
        "rd.surname_in_use                                                             AS \"Surname in Use\"",
        "rd.surname_as_per_gotra                                                       AS \"Surname as per Gotra\"",
        "rd.priest_name                                                                AS \"Priest Name\"",
        "rd.priest_location                                                            AS \"Priest Location\"",
        "rd.upanama_general                                                            AS \"Upanama General\"",
        "rd.upanama_proper                                                             AS \"Upanama Proper\"",
        "ARRAY_TO_STRING(rd.demi_gods, ', ')                                           AS \"Demi Gods\"",
        "rd.demi_god_other                                                             AS \"Demi God Other\"",
        "rd.ancestral_challenge                                                        AS \"Ancestral Challenge\"",
        "rd.ancestral_challenge_notes                                                  AS \"Ancestral Challenge Notes\""
      );
    }

    // ── Section: location-information ─────────────────────────────────────────
    if (sections.includes("location-information")) {
      joins.push(
        "LEFT JOIN addresses addr ON addr.profile_id = p.id AND addr.address_type = 'current'"
      );
      select.push(
        "addr.flat_no                                                                  AS \"Flat/House No\"",
        "addr.building                                                                 AS \"Building\"",
        "addr.street                                                                   AS \"Street\"",
        "addr.area                                                                     AS \"Area\"",
        "addr.city                                                                     AS \"City\"",
        "addr.taluk                                                                    AS \"Taluk\"",
        "addr.district                                                                 AS \"District\"",
        "addr.state                                                                    AS \"State\"",
        "addr.pincode                                                                  AS \"Pincode\"",
        "addr.country                                                                  AS \"Country\""
      );
    }

    // ── Section: education-profession ─────────────────────────────────────────
    // FIX: Removed the `OR me.member_name = TRIM(CONCAT(pd.first_name...))` branch
    // that referenced the outer `pd` alias inside the LATERAL subquery.
    // PostgreSQL cannot resolve outer table aliases inside a LATERAL when those
    // aliases are themselves defined via a join (not the base FROM table).
    // The IN ('self', 'head of family', 'head') filter is sufficient and correct —
    // the empty string '' catch-all has also been removed to avoid picking up
    // unrelated rows where member_relation is NULL or blank.
    // NOTE: member_education.highest_education is never written by saveStep5 —
    // degree data is stored in the child member_educations table as degree_type rows.
    // We derive "Education Level" from member_educations, picking the highest-ranked
    // degree_type via a priority CASE sort (Doctorate = highest priority).
    if (sections.includes("education-profession")) {
      joins.push(
        `LEFT JOIN LATERAL (
           SELECT
             me.member_name,
             me.member_relation,
             me.profession_type::text  AS profession_type,
             me.industry,
             me.is_currently_studying,
             me.is_currently_working,
             me.id                     AS me_id
           FROM member_education me
           WHERE me.profile_id = p.id
             AND LOWER(COALESCE(me.member_relation, '')) IN ('self', 'head of family', 'head')
           ORDER BY me.sort_order ASC, me.created_at ASC
           LIMIT 1
         ) edu ON TRUE`,
        `LEFT JOIN LATERAL (
           SELECT me2.degree_type AS highest_education
           FROM member_educations me2
           WHERE me2.member_education_id = edu.me_id
             AND me2.degree_type IS NOT NULL
             AND me2.degree_type <> ''
           ORDER BY
             CASE LOWER(me2.degree_type)
               WHEN 'doctorate'                       THEN 1
               WHEN 'specialised professional degree' THEN 2
               WHEN 'postgraduate / master''s'        THEN 3
               WHEN 'undergraduate / bachelor''s'     THEN 4
               WHEN 'diploma & associate degree'      THEN 5
               WHEN 'pre-university'                  THEN 6
               WHEN 'high school'                     THEN 7
               ELSE 8
             END ASC
           LIMIT 1
         ) edu_level ON TRUE`,
        `LEFT JOIN LATERAL (
           SELECT STRING_AGG(
             COALESCE(NULLIF(ml.language_other,''), ml.language), ', '
             ORDER BY ml.language
           ) AS langs
           FROM member_languages ml
           WHERE ml.member_education_id = edu.me_id
         ) lang_agg ON TRUE`
      );
      select.push(
        "COALESCE(edu.member_name, TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.middle_name,''),' ',pd.last_name))) AS \"Member Name\"",
        "COALESCE(edu.member_relation, 'Self')                                         AS \"Relation\"",
        "COALESCE(edu_level.highest_education, '—')                                    AS \"Education Level\"",
        "COALESCE(edu.profession_type, '—')                                            AS \"Profession Type\"",
        "CASE WHEN edu.is_currently_studying THEN 'Yes' ELSE 'No' END                 AS \"Currently Studying\"",
        "CASE WHEN edu.is_currently_working  THEN 'Yes' ELSE 'No' END                 AS \"Currently Working\"",
        "COALESCE(edu.industry, '—')                                                   AS \"Industry\"",
        "COALESCE(lang_agg.langs, '—')                                                 AS \"Languages Known\""
      );
    }

    // ── Section: economic-details ─────────────────────────────────────────────
    if (sections.includes("economic-details")) {
      joins.push("LEFT JOIN economic_details  ed  ON ed.profile_id  = p.id");
      select.push(
        "ed.self_income::text                                                          AS \"Self Income\"",
        "ed.family_income::text                                                        AS \"Family Income\"",
        "CASE WHEN ed.fac_own_house         THEN 'Yes' ELSE 'No' END                  AS \"Owns House\"",
        "CASE WHEN ed.fac_rented_house      THEN 'Yes' ELSE 'No' END                  AS \"Renting\"",
        "CASE WHEN ed.fac_agricultural_land THEN 'Yes' ELSE 'No' END                  AS \"Agricultural Land\"",
        "CASE WHEN ed.fac_car               THEN 'Yes' ELSE 'No' END                  AS \"Has Car\"",
        "CASE WHEN ed.fac_two_wheeler       THEN 'Yes' ELSE 'No' END                  AS \"Has Two-Wheeler\"",
        "CASE WHEN ed.inv_fixed_deposits    THEN 'Yes' ELSE 'No' END                  AS \"Fixed Deposits\"",
        "CASE WHEN ed.inv_mutual_funds_sip  THEN 'Yes' ELSE 'No' END                  AS \"Mutual Funds/SIP\"",
        "CASE WHEN ed.inv_shares_demat      THEN 'Yes' ELSE 'No' END                  AS \"Shares/Demat\"",
        "CASE WHEN ed.inv_others            THEN 'Yes' ELSE 'No' END                  AS \"Other Investments\""
      );
    }

    // ── Section: insurance (aggregate — Yes/No per coverage type) ─────────────
    if (sections.includes("insurance")) {
      joins.push(
        `LEFT JOIN LATERAL (
           SELECT
             BOOL_OR(mi.health_coverage        IS NOT NULL AND array_length(mi.health_coverage, 1) > 0) AS has_health,
             BOOL_OR(mi.life_coverage          IS NOT NULL AND array_length(mi.life_coverage, 1) > 0)   AS has_life,
             BOOL_OR(mi.term_coverage          IS NOT NULL AND array_length(mi.term_coverage, 1) > 0)   AS has_term,
             BOOL_OR(mi.konkani_card_coverage  IS NOT NULL AND array_length(mi.konkani_card_coverage, 1) > 0) AS has_konkani
           FROM member_insurance mi
           WHERE mi.profile_id = p.id
         ) ins_agg ON TRUE`
      );
      select.push(
        "CASE WHEN ins_agg.has_health  THEN 'Yes' ELSE 'No' END                       AS \"Health Coverage\"",
        "CASE WHEN ins_agg.has_life    THEN 'Yes' ELSE 'No' END                       AS \"Life Coverage\"",
        "CASE WHEN ins_agg.has_term    THEN 'Yes' ELSE 'No' END                       AS \"Term Coverage\"",
        "CASE WHEN ins_agg.has_konkani THEN 'Yes' ELSE 'No' END                       AS \"Konkani Card Coverage\""
      );
    }

    // ── Section: documents (aggregate — Yes/No per doc type) ─────────────────
    if (sections.includes("documents")) {
      joins.push(
        `LEFT JOIN LATERAL (
           SELECT
             BOOL_OR(md.aadhaar_coverage  IS NOT NULL) AS has_aadhaar,
             BOOL_OR(md.pan_coverage      IS NOT NULL) AS has_pan,
             BOOL_OR(md.voter_id_coverage IS NOT NULL) AS has_voter,
             BOOL_OR(md.land_doc_coverage IS NOT NULL) AS has_land_doc,
             BOOL_OR(md.dl_coverage       IS NOT NULL) AS has_dl
           FROM member_documents md
           WHERE md.profile_id = p.id
         ) doc_agg ON TRUE`
      );
      select.push(
        "CASE WHEN doc_agg.has_aadhaar  THEN 'Yes' ELSE 'No' END                      AS \"Aadhaar\"",
        "CASE WHEN doc_agg.has_pan      THEN 'Yes' ELSE 'No' END                      AS \"PAN Card\"",
        "CASE WHEN doc_agg.has_voter    THEN 'Yes' ELSE 'No' END                      AS \"Voter ID\"",
        "CASE WHEN doc_agg.has_land_doc THEN 'Yes' ELSE 'No' END                      AS \"Land Docs\"",
        "CASE WHEN doc_agg.has_dl       THEN 'Yes' ELSE 'No' END                      AS \"DL\""
      );
    }

    // ── Status filter ─────────────────────────────────────────────────────────
    const statusClause = allowAllStatuses ? "" : "AND p.status = 'approved'";

    // ── Date filter ───────────────────────────────────────────────────────────
    const dateParams  = [];
    let   dateClause  = "";
    let   paramOffset = 1;
    if (dateFrom) { dateClause += ` AND p.created_at >= $${paramOffset++}`; dateParams.push(dateFrom); }
    if (dateTo)   { dateClause += ` AND p.created_at <= $${paramOffset++}`; dateParams.push(dateTo); }

    const sql = `
      SELECT
        ${select.join(",\n        ")}
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      ${joins.join("\n      ")}
      WHERE u.is_deleted = false
        ${statusClause}
        ${dateClause}
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(sql, dateParams);

    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = (v === null || v === undefined) ? "—" : v;
      }
      return out;
    });

    return res.json(rows);
  } catch (err) {
    console.error("[exportFull]", err);
    return res.status(500).json({ message: "Failed to export report", error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reports/custom/sanghas
// Returns rows per sangha.
// - sangha-members section: reads from sangha_members table (roster added by sangha admin)
//   NOT from profiles table.
// ─────────────────────────────────────────────────────────────────────────────
async function exportSanghas(req, res) {
  try {
    const {
      sections = [],
      includeAllStatuses = false,
      includeAll = false,
      dateFrom,
      dateTo,
    } = req.body;

    const allowAllStatuses = includeAllStatuses || includeAll;

    if (!sections.length) return res.json([]);

    const joins  = [];
    const select = [
      "s.id                                                                            AS _sangha_id",
      "s.sangha_name                                                                   AS \"Sangha Name\"",
      "u.email                                                                         AS \"Email\"",
      "u.phone                                                                         AS \"Phone\"",
      "s.status::text                                                                  AS \"Status\"",
    ];

    if (sections.includes("sangha-details")) {
      select.push(
        "s.description                                                                 AS \"Description\"",
        "s.sangha_phone                                                                AS \"Sangha Phone\"",
        "s.sangha_email                                                                AS \"Sangha Email\"",
        "CASE WHEN s.is_blocked THEN 'Yes' ELSE 'No' END                              AS \"Is Blocked\"",
        "TO_CHAR(s.created_at, 'DD-Mon-YYYY')                                         AS \"Created At\""
      );
    }

    if (sections.includes("sangha-location")) {
      select.push(
        "s.address_line                                                                AS \"Address Line 1\"",
        "s.address_line2                                                               AS \"Address Line 2\"",
        "s.address_line3                                                               AS \"Address Line 3\"",
        "s.city                                                                        AS \"City\"",
        "s.village_town                                                                AS \"Village/Town\"",
        "s.taluk                                                                       AS \"Taluk\"",
        "s.district                                                                    AS \"District\"",
        "s.state                                                                       AS \"State\"",
        "s.pincode                                                                     AS \"Pincode\""
      );
    }

    // ── sangha-members: reads from sangha_members (roster), NOT profiles ─────
    // This table stores members manually added by the sangha admin,
    // as well as auto-synced entries when a user profile is approved.
    if (sections.includes("sangha-members")) {
      joins.push(
        `JOIN sangha_members sm ON sm.sangha_id = s.id`
      );
      select.push(
        `TRIM(CONCAT(sm.first_name,' ',COALESCE(sm.middle_name,''),' ',sm.last_name)) AS "Member Name"`,
        `COALESCE(sm.gender, '—')                                                     AS "Gender"`,
        `TO_CHAR(sm.dob, 'DD-Mon-YYYY')                                               AS "Date of Birth"`,
        `CASE WHEN sm.dob IS NOT NULL THEN EXTRACT(YEAR FROM AGE(sm.dob))::int ELSE NULL END AS "Age"`,
        `COALESCE(sm.phone, '—')                                                      AS "Member Phone"`,
        `COALESCE(sm.email, '—')                                                      AS "Member Email"`,
        `COALESCE(sm.role, '—')                                                       AS "Role"`,
        `COALESCE(sm.member_type, '—')                                                AS "Member Type"`
      );
    }

    const statusClause = allowAllStatuses ? "" : "AND s.status = 'approved'";

    const dateParams  = [];
    let   dateClause  = "";
    let   paramOffset = 1;
    if (dateFrom) { dateClause += ` AND s.created_at >= $${paramOffset++}`; dateParams.push(dateFrom); }
    if (dateTo)   { dateClause += ` AND s.created_at <= $${paramOffset++}`; dateParams.push(dateTo); }

    const sql = `
      SELECT
        ${select.join(",\n        ")}
      FROM sanghas s
      JOIN users u ON u.id = s.sangha_auth_id
      ${joins.join("\n      ")}
      WHERE u.is_deleted = false
        ${statusClause}
        ${dateClause}
      ORDER BY s.created_at DESC
    `;

    const result = await pool.query(sql, dateParams);

    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === "_sangha_id") { out[k] = v; continue; }
        out[k] = (v === null || v === undefined || v === "") ? "—" : v;
      }
      return out;
    });

    return res.json(rows);
  } catch (err) {
    console.error("[exportSanghas]", err);
    return res.status(500).json({ message: "Failed to export sangha report", error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reports/custom/family-members
// Returns ONE ROW PER FAMILY MEMBER
// ─────────────────────────────────────────────────────────────────────────────
async function getFamilyMembers(req, res) {
  try {
    const { profileIds = [] } = req.body;
    if (!profileIds.length) return res.json([]);

    const placeholders = profileIds.map((_, i) => `$${i + 1}`).join(", ");

    // FIX: All three LATERALs (me, mi, md) now use case-insensitive strict
    // name+relation matching instead of the old OR-chain that could match the
    // wrong family member when multiple members share the same relation
    // (e.g. two Spouse entries, or relation-only fallback picking an unrelated row).
    // LOWER() on both sides handles the mixed-case values seen in the data
    // (e.g. "Self", "Spouse", "Daughter" stored with capital first letter).
    const sql = `
      SELECT
        TRIM(CONCAT(
          pd_owner.first_name, ' ',
          COALESCE(pd_owner.middle_name, ''), ' ',
          pd_owner.last_name
        ))                                                   AS "Owner",

        fm.name                                              AS "Family Member Name",
        fm.relation                                          AS "Relation",
        TO_CHAR(fm.dob, 'DD-Mon-YYYY')                      AS "Date of Birth",
        fm.gender::text                                      AS "Gender",
        fm.status::text                                      AS "Status",
        CASE
          WHEN LOWER(COALESCE(fm.disability,'no')) IN ('yes','true','1') THEN 'Yes'
          ELSE 'No'
        END                                                  AS "Disability",

        COALESCE(ARRAY_TO_STRING(mi.health_coverage,       ', '), '—') AS "Health Coverage",
        COALESCE(ARRAY_TO_STRING(mi.life_coverage,         ', '), '—') AS "Life Coverage",
        COALESCE(ARRAY_TO_STRING(mi.term_coverage,         ', '), '—') AS "Term Coverage",
        COALESCE(ARRAY_TO_STRING(mi.konkani_card_coverage, ', '), '—') AS "Konkani Card Coverage",

        CASE WHEN me.is_currently_studying THEN 'Yes' ELSE 'No' END    AS "Currently Studying",
        CASE WHEN me.is_currently_working  THEN 'Yes' ELSE 'No' END    AS "Currently Working",
        COALESCE(me.profession_type::text, '—')                         AS "Type of Profession",
        COALESCE(me.industry, '—')                                      AS "Industry",
        COALESCE(me_level.highest_education, '—')                       AS "Education Level",

        COALESCE(lang_agg.langs, '—')                                  AS "Languages Known",

        CASE WHEN md.aadhaar_coverage  IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Aadhaar",
        CASE WHEN md.pan_coverage      IS NOT NULL THEN 'Yes' ELSE 'No' END AS "PAN Card",
        CASE WHEN md.voter_id_coverage IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Voter ID",
        CASE WHEN md.land_doc_coverage IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Land Docs",
        CASE WHEN md.dl_coverage       IS NOT NULL THEN 'Yes' ELSE 'No' END AS "DL"

      FROM family_members fm
      JOIN family_info      fi         ON fi.id          = fm.family_info_id
      JOIN profiles         p          ON p.id           = fi.profile_id
      JOIN personal_details pd_owner   ON pd_owner.profile_id = p.id

      LEFT JOIN LATERAL (
        SELECT me.*
        FROM member_education me
        WHERE me.profile_id = p.id
          AND LOWER(COALESCE(me.member_name, ''))     = LOWER(COALESCE(fm.name, ''))
          AND LOWER(COALESCE(me.member_relation, '')) = LOWER(COALESCE(fm.relation, ''))
        ORDER BY me.sort_order ASC, me.created_at ASC
        LIMIT 1
      ) me ON TRUE

      LEFT JOIN LATERAL (
        SELECT me2.degree_type AS highest_education
        FROM member_educations me2
        WHERE me2.member_education_id = me.id
          AND me2.degree_type IS NOT NULL
          AND me2.degree_type <> ''
        ORDER BY
          CASE LOWER(me2.degree_type)
            WHEN 'doctorate'                       THEN 1
            WHEN 'specialised professional degree' THEN 2
            WHEN 'postgraduate / master''s'        THEN 3
            WHEN 'undergraduate / bachelor''s'     THEN 4
            WHEN 'diploma & associate degree'      THEN 5
            WHEN 'pre-university'                  THEN 6
            WHEN 'high school'                     THEN 7
            ELSE 8
          END ASC
        LIMIT 1
      ) me_level ON TRUE

      LEFT JOIN LATERAL (
        SELECT STRING_AGG(
          COALESCE(NULLIF(ml.language_other,''), ml.language), ', '
          ORDER BY ml.language
        ) AS langs
        FROM member_languages ml
        WHERE ml.member_education_id = me.id
      ) lang_agg ON TRUE

      LEFT JOIN LATERAL (
        SELECT mi2.*
        FROM member_insurance mi2
        WHERE mi2.profile_id = p.id
          AND LOWER(COALESCE(mi2.member_name, ''))     = LOWER(COALESCE(fm.name, ''))
          AND LOWER(COALESCE(mi2.member_relation, '')) = LOWER(COALESCE(fm.relation, ''))
        ORDER BY mi2.sort_order ASC
        LIMIT 1
      ) mi ON TRUE

      LEFT JOIN LATERAL (
        SELECT md2.*
        FROM member_documents md2
        WHERE md2.profile_id = p.id
          AND LOWER(COALESCE(md2.member_name, ''))     = LOWER(COALESCE(fm.name, ''))
          AND LOWER(COALESCE(md2.member_relation, '')) = LOWER(COALESCE(fm.relation, ''))
        ORDER BY md2.sort_order ASC
        LIMIT 1
      ) md ON TRUE

      WHERE fm.profile_id = ANY(ARRAY[${placeholders}]::uuid[])
        AND fm.status <> 'passed_away'

      ORDER BY
        pd_owner.first_name ASC,
        fi.profile_id,
        fm.sort_order ASC,
        fm.created_at ASC
    `;

    const result = await pool.query(sql, profileIds);
    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = (v === null || v === undefined || v === "") ? "—" : v;
      }
      return out;
    });

    return res.json(rows);
  } catch (err) {
    console.error("[getFamilyMembers]", err);
    return res.status(500).json({ message: "Failed to fetch family members", error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reports/custom/sangha-memberships
//
// Cross-membership table: "Which sanghas is each user ALSO a member of?"
// A user submits their profile to ONE primary sangha (profiles.sangha_id),
// but can be a member of MANY sanghas via member_sanghas table.
//
// Columns: User Full Name, Gender, Age, Member In, Type of Member
// ─────────────────────────────────────────────────────────────────────────────
async function getSanghaMemberships(req, res) {
  try {
    const { profileIds = [] } = req.body;
    if (!profileIds.length) return res.json([]);

    const placeholders = profileIds.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      SELECT
        -- User identification
        TRIM(CONCAT(
          pd.first_name, ' ',
          COALESCE(pd.middle_name, ''), ' ',
          pd.last_name
        ))                                        AS "User Full Name",

        -- Demographics
        COALESCE(pd.gender::text, '—')            AS "Gender",

        CASE
          WHEN pd.date_of_birth IS NOT NULL
          THEN EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int
          ELSE NULL
        END                                       AS "Age",

        -- Which sangha this membership entry refers to
        COALESCE(ms.sangha_name, '—')             AS "Member In",

        -- Type of member — from the sangha_members roster entry matched by email/phone
        COALESCE(sm_match.member_type, '—')       AS "Type of Member"

      FROM member_sanghas ms
      JOIN profiles         p   ON p.id  = ms.profile_id
      JOIN users            u   ON u.id  = p.user_id
      JOIN personal_details pd  ON pd.profile_id = p.id
      LEFT JOIN LATERAL (
        SELECT sm.member_type
        FROM sangha_members sm
        WHERE sm.sangha_id = ms.sangha_id
          AND (
            (u.email IS NOT NULL AND sm.email = u.email)
            OR (u.phone IS NOT NULL AND sm.phone = u.phone)
          )
        LIMIT 1
      ) sm_match ON TRUE

      WHERE ms.profile_id = ANY(ARRAY[${placeholders}]::uuid[])
        AND ms.status = 'approved'

      ORDER BY
        pd.first_name ASC,
        ms.sort_order ASC,
        ms.created_at ASC
    `;

    const result = await pool.query(sql, profileIds);
    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = (v === null || v === undefined || v === "") ? "—" : v;
      }
      return out;
    });

    return res.json(rows);
  } catch (err) {
    console.error("[getSanghaMemberships]", err);
    return res.status(500).json({ message: "Failed to fetch sangha memberships", error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/reports/custom/sangha-users
//
// Returns registered users (from profiles table) whose PRIMARY sangha
// is one of the given sanghaIds.
//
// Response rows include _sangha_id and _sangha_name so the frontend
// can group them by sangha (each sangha gets a header row + user rows).
//
// Columns: Full Name, Email, Phone, Status, Gender, Date of Birth, Age,
//          City, District, State, Submitted At, Reviewed At
// ─────────────────────────────────────────────────────────────────────────────
async function getSanghaUsers(req, res) {
  try {
    const { sanghaIds = [] } = req.body;
    if (!sanghaIds.length) return res.json([]);

    const placeholders = sanghaIds.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      SELECT
        -- Internal grouping keys (not shown as columns in the table)
        p.sangha_id                                                                    AS _sangha_id,
        s.sangha_name                                                                  AS _sangha_name,

        -- User identity
        TRIM(CONCAT(
          pd.first_name, ' ',
          COALESCE(pd.middle_name, ''), ' ',
          pd.last_name
        ))                                                                             AS "Full Name",
        u.email                                                                        AS "Email",
        u.phone                                                                        AS "Phone",
        p.status::text                                                                 AS "Status",

        -- Demographics
        COALESCE(pd.gender::text, '—')                                                AS "Gender",
        TO_CHAR(pd.date_of_birth, 'DD-Mon-YYYY')                                      AS "Date of Birth",
        CASE
          WHEN pd.date_of_birth IS NOT NULL
          THEN EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int
          ELSE NULL
        END                                                                            AS "Age",

        -- Location (current address)
        COALESCE(addr.city, '—')                                                       AS "City",
        COALESCE(addr.district, '—')                                                   AS "District",
        COALESCE(addr.state, '—')                                                      AS "State",

        -- Timestamps
        TO_CHAR(p.submitted_at, 'DD-Mon-YYYY')                                        AS "Submitted At",
        TO_CHAR(p.reviewed_at,  'DD-Mon-YYYY')                                        AS "Reviewed At"

      FROM profiles p
      JOIN sanghas s          ON s.id = p.sangha_id
      JOIN users u            ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN LATERAL (
        SELECT city, district, state
        FROM addresses
        WHERE profile_id = p.id AND address_type = 'current'
        LIMIT 1
      ) addr ON TRUE

      WHERE p.sangha_id = ANY(ARRAY[${placeholders}]::uuid[])
        AND u.is_deleted = false

      ORDER BY
        s.sangha_name ASC,
        pd.first_name ASC,
        p.created_at DESC
    `;

    const result = await pool.query(sql, sanghaIds);
    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        // Preserve internal keys as-is; fill blanks for display columns
        if (k === "_sangha_id" || k === "_sangha_name") { out[k] = v; continue; }
        out[k] = (v === null || v === undefined || v === "") ? "—" : v;
      }
      return out;
    });

    return res.json(rows);
  } catch (err) {
    console.error("[getSanghaUsers]", err);
    return res.status(500).json({ message: "Failed to fetch sangha users", error: err.message });
  }
}

module.exports = {
  exportFull,
  exportSanghas,
  getFamilyMembers,
  getSanghaMemberships,
  getSanghaUsers,
};
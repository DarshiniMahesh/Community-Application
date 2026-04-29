//Community-Application\backend\src\controllers\adminCustomReportController.js
// Community-Application\backend\src\controllers\adminCustomReportController.js
//
// Serves:
//   POST /sangha/reports/export/full      → exportFull   (main custom table)
//   POST /sangha/reports/family-members   → getFamilyMembers
//
// Column names returned MUST match the frontend SECTIONS[].columns exactly.

const { pool } = require("../config/db"); // adjust to your DB pool path

// ─── Helpers ──────────────────────────────────────────────────────────────────

function boolYesNo(val) {
  if (val === true  || val === "true")  return "Yes";
  if (val === false || val === "false") return "No";
  return val ?? "—";
}

function arrayToString(arr) {
  if (!arr) return "—";
  if (Array.isArray(arr)) return arr.filter(Boolean).join(", ") || "—";
  return String(arr);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /sangha/reports/export/full
//
// Body: { sections: string[], includeAllStatuses: boolean,
//         dateFrom?: string, dateTo?: string }
//
// Sections:  personal-details | economic-details | education-profession
//            | location-information | religious-details
//
// Returns: array of flat row objects whose keys match SECTIONS[].columns
// plus _profile_id (used by the family fetch button on each row).
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

    // ── Base JOIN list ────────────────────────────────────────────────────────
    // Always start from profiles + users so we always have
    // Full Name, Email, Phone, Status, _profile_id
    const joins  = [];
    const select = [
      "p.id                                         AS _profile_id",
      "TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.middle_name,''),' ',pd.last_name)) AS \"Full Name\"",
      "u.email                                       AS \"Email\"",
      "u.phone                                       AS \"Phone\"",
      "p.status::text                                AS \"Status\"",
    ];

    // We always need personal_details for the name columns
    joins.push(
      "LEFT JOIN personal_details pd ON pd.profile_id = p.id"
    );

    // ── Section: personal-details ─────────────────────────────────────────────
    if (sections.includes("personal-details")) {
      select.push(
        "pd.gender::text                              AS \"Gender\"",
        "TO_CHAR(pd.date_of_birth, 'DD-Mon-YYYY')    AS \"Date of Birth\"",
        "pd.date_of_birth                            AS \"_dob_raw\"",   // used by Age in frontend
        "TO_CHAR(p.submitted_at, 'DD-Mon-YYYY')      AS \"Submitted At\"",
        "TO_CHAR(p.reviewed_at,  'DD-Mon-YYYY')      AS \"Reviewed At\"",
        // Age is computed client-side from "Date of Birth", but we surface it too
        "CASE WHEN pd.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int ELSE NULL END AS \"Age\""
      );
    }

    // ── Section: location-information ─────────────────────────────────────────
    if (sections.includes("location-information")) {
      joins.push(
        "LEFT JOIN addresses addr ON addr.profile_id = p.id AND addr.address_type = 'current'"
      );
      select.push(
        "addr.city       AS \"City\"",
        "addr.district   AS \"District\"",
        "addr.state      AS \"State\"",
        "addr.pincode    AS \"Pincode\""
      );
    }

    // ── Section: economic-details ─────────────────────────────────────────────
    if (sections.includes("economic-details")) {
      joins.push(
        "LEFT JOIN economic_details  ed  ON ed.profile_id  = p.id",
        // documents — one row per profile (aggregate across members)
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
        "ed.self_income::text                          AS \"Self Income (Individual)\"",
        "ed.family_income::text                        AS \"Family Income (Annual)\"",
        "CASE WHEN ed.fac_own_house         THEN 'Yes' ELSE 'No' END AS \"Owns House\"",
        "CASE WHEN ed.fac_agricultural_land THEN 'Yes' ELSE 'No' END AS \"Has Agricultural Land\"",
        "CASE WHEN ed.fac_car               THEN 'Yes' ELSE 'No' END AS \"Has 4-Wheeler\"",
        "CASE WHEN ed.fac_two_wheeler       THEN 'Yes' ELSE 'No' END AS \"Has 2-Wheeler\"",
        "CASE WHEN ed.fac_rented_house      THEN 'Yes' ELSE 'No' END AS \"Renting\"",
        "CASE WHEN doc_agg.has_aadhaar  THEN 'Yes' ELSE 'No' END AS \"Aadhaar\"",
        "CASE WHEN doc_agg.has_pan      THEN 'Yes' ELSE 'No' END AS \"PAN Card\"",
        "CASE WHEN doc_agg.has_voter    THEN 'Yes' ELSE 'No' END AS \"Voter ID\"",
        "CASE WHEN doc_agg.has_land_doc THEN 'Yes' ELSE 'No' END AS \"Land Docs\"",
        "CASE WHEN doc_agg.has_dl       THEN 'Yes' ELSE 'No' END AS \"DL\"",
        "CASE WHEN ed.inv_fixed_deposits    THEN 'Yes' ELSE 'No' END AS \"Invests in Fixed Deposits\"",
        "CASE WHEN ed.inv_mutual_funds_sip  THEN 'Yes' ELSE 'No' END AS \"Invests in Mutual Funds / SIP\"",
        "CASE WHEN ed.inv_shares_demat      THEN 'Yes' ELSE 'No' END AS \"Invests in Shares / Demat\"",
        "CASE WHEN ed.inv_others            THEN 'Yes' ELSE 'No' END AS \"Other Investments\""
      );
    }

    // ── Section: education-profession ─────────────────────────────────────────
    // One row per profile — aggregate across members (head-of-family / self row)
    if (sections.includes("education-profession")) {
      joins.push(
        // Take the first (sort_order ASC) member_education row per profile
        `LEFT JOIN LATERAL (
           SELECT
             me.member_name,
             me.member_relation,
             me.highest_education,
             me.profession_type::text  AS profession_type,
             me.is_currently_studying,
             me.is_currently_working,
             me.id                     AS me_id
           FROM member_education me
           WHERE me.profile_id = p.id
           ORDER BY me.sort_order ASC, me.created_at ASC
           LIMIT 1
         ) edu ON TRUE`,
        // Aggregate languages for that education row
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
        "edu.member_name                               AS \"Member Name\"",
        "edu.member_relation                           AS \"Relation\"",
        "edu.highest_education                         AS \"Education Level\"",
        "edu.profession_type                           AS \"Profession\"",
        "CASE WHEN edu.is_currently_studying THEN 'Yes' ELSE 'No' END AS \"Currently Studying\"",
        "CASE WHEN edu.is_currently_working  THEN 'Yes' ELSE 'No' END AS \"Currently Working\"",
        "COALESCE(lang_agg.langs, '—')                AS \"Languages Known\""
      );
    }

    // ── Section: religious-details ────────────────────────────────────────────
    if (sections.includes("religious-details")) {
      joins.push(
        "LEFT JOIN religious_details rd ON rd.profile_id = p.id",
        "LEFT JOIN family_history    fh ON fh.profile_id = p.id"
      );
      select.push(
        "rd.gotra                                      AS \"Gotra\"",
        "rd.pravara                                    AS \"Pravara\"",
        "COALESCE(NULLIF(rd.kuladevata_other,''), rd.kuladevata) AS \"Kuladevata\"",
        "rd.surname_in_use                             AS \"Surname in Use\"",
        "rd.surname_as_per_gotra                       AS \"Surname as per Gotra\"",
        "rd.priest_name                                AS \"Priest Name\"",
        "rd.priest_location                            AS \"Priest Location\"",
        "rd.upanama_general                            AS \"Upanama General\"",
        "rd.upanama_proper                             AS \"Upanama Proper\"",
        // demi_gods is an ARRAY column
        "ARRAY_TO_STRING(rd.demi_gods, ', ')           AS \"Demi Gods\"",
        "rd.ancestral_challenge                        AS \"Ancestral Challenge\"",
        "rd.ancestral_challenge_notes                  AS \"Ancestral Challenge Notes\"",
        "fh.common_relative_names                      AS \"Common Relative Names\""
      );
    }

    // ── Status filter ─────────────────────────────────────────────────────────
    const statusClause = allowAllStatuses
      ? ""
      : "AND p.status = 'approved'";

    // ── Date filter ───────────────────────────────────────────────────────────
    const dateParams  = [];
    let   dateClause  = "";
    let   paramOffset = 1;

    if (dateFrom) {
      dateClause += ` AND p.created_at >= $${paramOffset++}`;
      dateParams.push(dateFrom);
    }
    if (dateTo) {
      dateClause += ` AND p.created_at <= $${paramOffset++}`;
      dateParams.push(dateTo);
    }

    // ── Build & run query ─────────────────────────────────────────────────────
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

    // Post-process — strip internal _dob_raw, ensure no nulls in display
    const rows = result.rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === "_dob_raw") continue;              // internal only
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
// POST /sangha/reports/family-members
//
// Body: { profileIds: string[] }
//
// Returns flat rows with ALL_FAMILY_COLUMNS keys (see frontend constant).
// One row per family_member × their education record (LEFT JOIN so members
// without education still appear).
// ─────────────────────────────────────────────────────────────────────────────
async function getFamilyMembers(req, res) {
  try {
    const { profileIds = [] } = req.body;

    if (!profileIds.length) return res.json([]);

    // Parameterised IN list  ($1, $2, …)
    const placeholders = profileIds.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      SELECT
        -- Owner (registered user)
        TRIM(CONCAT(
          pd_owner.first_name, ' ',
          COALESCE(pd_owner.middle_name, ''), ' ',
          pd_owner.last_name
        ))                                                 AS "Owner (Registered User)",

        -- Family member identity
        fm.name                                            AS "Family Member Name",
        fm.relation                                        AS "Relation",
        TO_CHAR(fm.dob, 'DD-Mon-YYYY')                    AS "Date of Birth",
        fm.gender::text                                    AS "Gender",
        fm.status::text                                    AS "Status",
        CASE
          WHEN LOWER(fm.disability) IN ('yes','true','1') THEN 'Yes'
          WHEN LOWER(fm.disability) IN ('no','false','0') THEN 'No'
          ELSE COALESCE(fm.disability, 'No')
        END                                                AS "Disability",

        -- Insurance (from member_insurance matched by name+relation)
        ARRAY_TO_STRING(mi.health_coverage,        ', ')  AS "Health Coverage",
        ARRAY_TO_STRING(mi.life_coverage,          ', ')  AS "Life Coverage",
        ARRAY_TO_STRING(mi.term_coverage,          ', ')  AS "Term Coverage",
        ARRAY_TO_STRING(mi.konkani_card_coverage,  ', ')  AS "Konkani Card Coverage",

        -- Education (member_educations — one degree row per member_education)
        medu.degree_name                                   AS "Degree Name",
        medu.degree_type                                   AS "Type of Degree",
        medu.university                                    AS "University",
        TO_CHAR(medu.start_date, 'DD-Mon-YYYY')           AS "Start Date",
        TO_CHAR(medu.end_date,   'DD-Mon-YYYY')           AS "End Date",
        medu.certificate                                   AS "Certificate",

        -- member_education (profession / study flags)
        CASE WHEN me.is_currently_studying THEN 'Yes' ELSE 'No' END  AS "Currently Studying",
        CASE WHEN me.is_currently_working  THEN 'Yes' ELSE 'No' END  AS "Currently Working",
        me.profession_type::text                           AS "Type of Profession",
        me.industry                                        AS "Industry / Field",

        -- Languages (aggregated)
        COALESCE(lang_agg.langs, '—')                     AS "Languages Known",

        -- Documents
        CASE WHEN md.aadhaar_coverage  IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Aadhaar",
        CASE WHEN md.pan_coverage      IS NOT NULL THEN 'Yes' ELSE 'No' END AS "PAN Card",
        CASE WHEN md.voter_id_coverage IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Voter ID",
        CASE WHEN md.land_doc_coverage IS NOT NULL THEN 'Yes' ELSE 'No' END AS "Land Docs",
        CASE WHEN md.dl_coverage       IS NOT NULL THEN 'Yes' ELSE 'No' END AS "DL"

      FROM family_members fm

      -- Owner's profile chain
      JOIN family_info     fi         ON fi.id         = fm.family_info_id
      JOIN profiles        p          ON p.id          = fi.profile_id
      JOIN personal_details pd_owner  ON pd_owner.profile_id = p.id

      -- member_education matched by name + relation (self/head row first)
      LEFT JOIN LATERAL (
        SELECT me.*
        FROM member_education me
        WHERE me.profile_id    = fm.profile_id
          AND (
            -- try exact match on name & relation
            (me.member_name     = fm.name     AND me.member_relation = fm.relation)
            -- fallback: same relation only
            OR (me.member_relation = fm.relation)
          )
        ORDER BY
          (me.member_name = fm.name AND me.member_relation = fm.relation) DESC,
          me.sort_order ASC
        LIMIT 1
      ) me ON TRUE

      -- One degree row per member_education (first/primary degree)
      LEFT JOIN LATERAL (
        SELECT *
        FROM member_educations medu2
        WHERE medu2.member_education_id = me.id
        ORDER BY medu2.sort_order ASC, medu2.created_at ASC
        LIMIT 1
      ) medu ON TRUE

      -- Languages
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(
          COALESCE(NULLIF(ml.language_other,''), ml.language), ', '
          ORDER BY ml.language
        ) AS langs
        FROM member_languages ml
        WHERE ml.member_education_id = me.id
      ) lang_agg ON TRUE

      -- Insurance matched by name + relation
      LEFT JOIN LATERAL (
        SELECT *
        FROM member_insurance mi2
        WHERE mi2.profile_id = fm.profile_id
          AND (
            (mi2.member_name = fm.name AND mi2.member_relation = fm.relation)
            OR mi2.member_relation = fm.relation
          )
        ORDER BY
          (mi2.member_name = fm.name AND mi2.member_relation = fm.relation) DESC,
          mi2.sort_order ASC
        LIMIT 1
      ) mi ON TRUE

      -- Documents matched by name + relation
      LEFT JOIN LATERAL (
        SELECT *
        FROM member_documents md2
        WHERE md2.profile_id = fm.profile_id
          AND (
            (md2.member_name = fm.name AND md2.member_relation = fm.relation)
            OR md2.member_relation = fm.relation
          )
        ORDER BY
          (md2.member_name = fm.name AND md2.member_relation = fm.relation) DESC,
          md2.sort_order ASC
        LIMIT 1
      ) md ON TRUE

      WHERE fm.profile_id = ANY(ARRAY[${placeholders}]::uuid[])
        AND fm.status <> 'passed_away'   -- include all active members; remove to show all

      ORDER BY
        pd_owner.first_name ASC,
        fi.profile_id,
        fm.sort_order ASC,
        fm.created_at ASC
    `;

    const result = await pool.query(sql, profileIds);

    // Replace nulls with "—" for clean frontend display
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

module.exports = {
  exportFull,
  getFamilyMembers,
};
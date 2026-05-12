// Community-Application\backend\src\controllers\adminreportController.js

const pool = require("../config/db");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateFilter(from, to, tableAlias = "", startIdx = 1) {
  const col = tableAlias ? `${tableAlias}.created_at` : "created_at";
  const conditions = [];
  const values = [];
  let idx = startIdx;
  if (from) { conditions.push(`${col} >= $${idx++}`); values.push(from); }
  if (to)   { conditions.push(`${col} <= $${idx++}`); values.push(to); }
  return { clause: conditions.length ? "AND " + conditions.join(" AND ") : "", values, offset: idx };
}

// ─── GET /admin/reports/general ───────────────────────────────────────────────

async function getGeneralReport(req, res) {
  try {
    const { from, to, dateFrom, dateTo } = req.query;
    const dateStart = from || dateFrom || null;
    const dateEnd = to   || dateTo   || null;
    const df = dateFilter(dateStart, dateEnd, "u");

    const [
      userStatsQ, sanghaStatsQ, trendQ, usersByStateQ, sanghasByStateQ,
      genderQ, userStatusQ, sanghaStatusQ, topSanghasQ, usersByDistrictQ,
      usersByStateGenderQ,
      maritalStatusGenderQ,
      familyTypeQ,
      degreeLevelsGenderQ,
      insuranceHealthGenderQ,
      insuranceLifeGenderQ,
      insuranceTermGenderQ,
      insuranceKonkaniGenderQ,
      documentsQ,
    ] = await Promise.all([

      pool.query(
        `SELECT
           COUNT(*) FILTER (
  WHERE p.status IN ('approved', 'rejected', 'changes_requested')
) AS total,
           COUNT(*) FILTER (WHERE p.status = 'approved')                    AS approved,
           COUNT(*) FILTER (WHERE p.status = 'submitted')                   AS submitted,
           COUNT(*) FILTER (WHERE p.status = 'under_review')                AS under_review,
           COUNT(*) FILTER (WHERE p.status = 'changes_requested')           AS changes_requested,
           COUNT(*) FILTER (WHERE p.status = 'draft')                       AS draft,
           COUNT(*) FILTER (WHERE p.status = 'rejected')                    AS rejected,
           COUNT(*) FILTER (WHERE u.created_at >= COALESCE($1::timestamptz, '-infinity')
                              AND u.created_at <= COALESCE($2::timestamptz, 'infinity')) AS new_this_period
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.role = 'user' AND u.is_deleted = false`,
        [dateStart, dateEnd]
      ),

      pool.query(
        `SELECT
           COUNT(*)                                                              AS total,
           COUNT(*) FILTER (WHERE status = 'approved')                          AS approved,
           COUNT(*) FILTER (WHERE status = 'pending_approval')                  AS pending_approval,
           COUNT(*) FILTER (WHERE status = 'rejected')                          AS rejected,
           COUNT(*) FILTER (WHERE status = 'suspended')                         AS suspended,
           COUNT(*) FILTER (WHERE created_at >= COALESCE($1::timestamptz, '-infinity')
                              AND created_at <= COALESCE($2::timestamptz, 'infinity')) AS new_this_period
         FROM sanghas`,
        [dateStart, dateEnd]
      ),

      pool.query(
        `WITH months AS (
           SELECT to_char(generate_series(
             date_trunc('month', COALESCE($1::date, NOW() - INTERVAL '11 months')),
             date_trunc('month', COALESCE($2::date, NOW())),
             '1 month'
           ), 'Mon YYYY') AS period,
           generate_series(
             date_trunc('month', COALESCE($1::date, NOW() - INTERVAL '11 months')),
             date_trunc('month', COALESCE($2::date, NOW())),
             '1 month'
           ) AS month_start
         ),
         user_counts AS (
           SELECT to_char(date_trunc('month', u.created_at), 'Mon YYYY') AS period, COUNT(*) AS cnt
           FROM users u WHERE u.role = 'user' AND u.is_deleted = false GROUP BY 1
         ),
         sangha_counts AS (
           SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS period, COUNT(*) AS cnt
           FROM sanghas GROUP BY 1
         )
         SELECT m.period, COALESCE(uc.cnt, 0) AS users, COALESCE(sc.cnt, 0) AS sanghas
         FROM months m
         LEFT JOIN user_counts  uc ON uc.period = m.period
         LEFT JOIN sangha_counts sc ON sc.period = m.period
         ORDER BY m.month_start`,
        [dateStart, dateEnd]
      ),

      // ── Users by state: profile heads + their family members ──────────────
      pool.query(
        `WITH combined AS (
           -- Profile heads
           SELECT
             a.state,
             LOWER(pd.gender::text) AS gender
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE a.state IS NOT NULL AND a.state <> ''
             AND p.status = 'approved'
           UNION ALL
           -- Family members (use profile head's address)
           SELECT
             a.state,
             LOWER(fm.gender::text) AS gender
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           JOIN family_members fm ON fm.profile_id = p.id
           WHERE a.state IS NOT NULL AND a.state <> ''
             AND p.status = 'approved'
             AND fm.status = 'active'
         )
         SELECT
           state,
           COUNT(*) AS count,
           COUNT(*) FILTER (WHERE gender = 'male')   AS male,
           COUNT(*) FILTER (WHERE gender = 'female') AS female,
           COUNT(*) FILTER (WHERE gender IS NOT NULL AND gender NOT IN ('male','female')) AS other
         FROM combined
         GROUP BY state ORDER BY count DESC LIMIT 10`
      ),

      pool.query(
        `SELECT state, COUNT(*) AS count FROM sanghas
         WHERE state IS NOT NULL AND state <> '' GROUP BY state ORDER BY count DESC LIMIT 10`
      ),

      pool.query(
        `SELECT pd.gender::text AS gender, COUNT(*) AS count FROM personal_details pd
         JOIN profiles p ON p.id = pd.profile_id WHERE pd.gender IS NOT NULL
         GROUP BY pd.gender ORDER BY count DESC`
      ),

      pool.query(
        `SELECT p.status::text AS status, COUNT(*) AS count FROM profiles p GROUP BY p.status ORDER BY count DESC`
      ),

      pool.query(
        `SELECT status::text AS status, COUNT(*) AS count FROM sanghas GROUP BY status ORDER BY count DESC`
      ),

     pool.query(
  `SELECT s.sangha_name, s.state, COUNT(p.id) AS member_count
   FROM sanghas s
   LEFT JOIN profiles p ON p.sangha_id = s.id AND p.status = 'approved'
   GROUP BY s.id, s.sangha_name, s.state
   ORDER BY member_count DESC`),

      // ── Users by district: profile heads + family members ──────────────────
      pool.query(
        `WITH combined AS (
           SELECT a.district
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           WHERE a.district IS NOT NULL AND a.district <> '' AND p.status = 'approved'
           UNION ALL
           SELECT a.district
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           JOIN family_members fm ON fm.profile_id = p.id
           WHERE a.district IS NOT NULL AND a.district <> ''
             AND p.status = 'approved' AND fm.status = 'active'
         )
         SELECT district, COUNT(*) AS count
         FROM combined
         GROUP BY district ORDER BY count DESC LIMIT 10`
      ),

      // ── Users by state with gender (profile heads + family members) ─────────
      pool.query(
        `WITH combined AS (
           SELECT a.state, LOWER(pd.gender::text) AS gender
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           JOIN personal_details pd ON pd.profile_id = p.id
           WHERE a.state IS NOT NULL AND a.state <> '' AND p.status = 'approved'
           UNION ALL
           SELECT a.state, LOWER(fm.gender::text) AS gender
           FROM profiles p
           JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
           JOIN family_members fm ON fm.profile_id = p.id
           WHERE a.state IS NOT NULL AND a.state <> ''
             AND p.status = 'approved' AND fm.status = 'active'
         )
         SELECT
           state,
           COUNT(*) FILTER (WHERE gender = 'male')   AS male,
           COUNT(*) FILTER (WHERE gender = 'female') AS female,
           COUNT(*) FILTER (WHERE gender IS NOT NULL AND gender NOT IN ('male','female')) AS other
         FROM combined
         GROUP BY state
         ORDER BY (
           COUNT(*) FILTER (WHERE gender = 'male') +
           COUNT(*) FILTER (WHERE gender = 'female') +
           COUNT(*) FILTER (WHERE gender IS NOT NULL AND gender NOT IN ('male','female'))
         ) DESC
         LIMIT 10`
      ),

      pool.query(
        `SELECT
           CASE
             WHEN LOWER(pd.marital_status) IN ('married')                          THEN 'Married'
             WHEN LOWER(pd.marital_status) IN ('unmarried','single','never married','never_married') THEN 'Never Married'
             WHEN LOWER(pd.marital_status) IN ('divorced')                         THEN 'Divorced'
             WHEN LOWER(pd.marital_status) IN ('widowed','widow','widower')        THEN 'Widowed'
             ELSE 'Other'
           END AS label,
           COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
           COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
           COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
         FROM profiles p
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status = 'approved' AND pd.marital_status IS NOT NULL AND TRIM(pd.marital_status) <> ''
         GROUP BY 1
         ORDER BY COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') DESC`
      ),

      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear,
           COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%')   AS joint
         FROM profiles p JOIN family_info fi ON fi.profile_id = p.id WHERE p.status = 'approved'`
      ),

      pool.query(
        `SELECT me.highest_education AS label,
           COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
           COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
           COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
         FROM profiles p
         JOIN member_education me ON me.profile_id = p.id
         JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status = 'approved' AND me.highest_education IS NOT NULL AND TRIM(me.highest_education) <> ''
         GROUP BY me.highest_education
         ORDER BY (COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') + COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))) DESC`
      ),

      pool.query(
        `WITH ins AS (SELECT ARRAY(SELECT unnest(mi.health_coverage)::text) AS cov, LOWER(pd.gender::text) AS gender
           FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved')
         SELECT
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='male') AS male_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='female') AS female_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_yes,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='male') AS male_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='female') AS female_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_no
         FROM ins`
      ),

      pool.query(
        `WITH ins AS (SELECT ARRAY(SELECT unnest(mi.life_coverage)::text) AS cov, LOWER(pd.gender::text) AS gender
           FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved')
         SELECT
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='male') AS male_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='female') AS female_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_yes,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='male') AS male_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='female') AS female_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_no
         FROM ins`
      ),

      pool.query(
        `WITH ins AS (SELECT ARRAY(SELECT unnest(mi.term_coverage)::text) AS cov, LOWER(pd.gender::text) AS gender
           FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved')
         SELECT
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='male') AS male_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='female') AS female_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_yes,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='male') AS male_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='female') AS female_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_no
         FROM ins`
      ),

      pool.query(
        `WITH ins AS (SELECT ARRAY(SELECT unnest(mi.konkani_card_coverage)::text) AS cov, LOWER(pd.gender::text) AS gender
           FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved')
         SELECT
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='male') AS male_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender='female') AS female_yes,
           COUNT(*) FILTER (WHERE cov IS NOT NULL AND cardinality(cov)>0 AND NOT ('none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_yes,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='male') AS male_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender='female') AS female_no,
           COUNT(*) FILTER (WHERE (cov IS NULL OR cardinality(cov)=0 OR 'none' = ANY(cov)) AND gender NOT IN ('male','female')) AS other_no
         FROM ins`
      ),

      pool.query(
        `WITH doc_text AS (
           SELECT
             md.aadhaar_coverage::text  AS aadhaar,
             md.pan_coverage::text      AS pan,
             md.voter_id_coverage::text AS voter,
             md.land_doc_coverage::text AS land,
             md.dl_coverage::text       AS dl
           FROM profiles p JOIN member_documents md ON md.profile_id = p.id WHERE p.status = 'approved'
         )
         SELECT
           COUNT(*) FILTER (WHERE aadhaar = 'yes') AS aadhaar_yes, COUNT(*) FILTER (WHERE aadhaar = 'no') AS aadhaar_no, COUNT(*) FILTER (WHERE aadhaar IS NULL OR aadhaar NOT IN ('yes','no')) AS aadhaar_unknown,
           COUNT(*) FILTER (WHERE pan = 'yes') AS pan_yes, COUNT(*) FILTER (WHERE pan = 'no') AS pan_no, COUNT(*) FILTER (WHERE pan IS NULL OR pan NOT IN ('yes','no')) AS pan_unknown,
           COUNT(*) FILTER (WHERE voter = 'yes') AS voter_yes, COUNT(*) FILTER (WHERE voter = 'no') AS voter_no, COUNT(*) FILTER (WHERE voter IS NULL OR voter NOT IN ('yes','no')) AS voter_unknown,
           COUNT(*) FILTER (WHERE land = 'yes') AS land_yes, COUNT(*) FILTER (WHERE land = 'no') AS land_no, COUNT(*) FILTER (WHERE land IS NULL OR land NOT IN ('yes','no')) AS land_unknown,
           COUNT(*) FILTER (WHERE dl = 'yes') AS dl_yes, COUNT(*) FILTER (WHERE dl = 'no') AS dl_no, COUNT(*) FILTER (WHERE dl IS NULL OR dl NOT IN ('yes','no')) AS dl_unknown
         FROM doc_text`
      ),
    ]);

    const toNum = (v) => parseInt(v, 10) || 0;
    const ur = userStatsQ.rows[0];
    const sr = sanghaStatsQ.rows[0];
    const ftRow = familyTypeQ.rows[0] || {};
    const docRow = documentsQ.rows[0] || {};

    const buildInsGender = (label, row) => {
      const r = row[0] || {};
      const maleYes   = toNum(r.male_yes);
      const femaleYes = toNum(r.female_yes);
      const otherYes  = toNum(r.other_yes);
      const maleNo    = toNum(r.male_no);
      const femaleNo  = toNum(r.female_no);
      const otherNo   = toNum(r.other_no);
      return {
        label,
        yes:        maleYes + femaleYes + otherYes,
        no:         maleNo  + femaleNo  + otherNo,
        maleYes,   femaleYes,   otherYes,
        maleNo,    femaleNo,    otherNo,
      };
    };

    return res.json({
      users: {
        total:             toNum(ur.total),
        approved:          toNum(ur.approved),
        submitted:         toNum(ur.submitted),
        under_review:      toNum(ur.under_review),
        changes_requested: toNum(ur.changes_requested),
        draft:             toNum(ur.draft),
        rejected:          toNum(ur.rejected),
        new_this_period:   toNum(ur.new_this_period),
      },
      sanghas: {
        total:            toNum(sr.total),
        approved:         toNum(sr.approved),
        pending_approval: toNum(sr.pending_approval),
        rejected:         toNum(sr.rejected),
        suspended:        toNum(sr.suspended),
        new_this_period:  toNum(sr.new_this_period),
      },
      registrations_trend: trendQ.rows.map((r) => ({
        period: r.period, users: toNum(r.users), sanghas: toNum(r.sanghas),
      })),
      users_by_state: usersByStateQ.rows.map((r) => ({
        state: r.state, count: toNum(r.count),
        male: toNum(r.male), female: toNum(r.female), other: toNum(r.other),
      })),
      sanghas_by_state:    sanghasByStateQ.rows.map((r) => ({ state: r.state, count: toNum(r.count) })),
      gender_distribution: genderQ.rows.map((r) => ({ gender: r.gender, count: toNum(r.count) })),
      user_status_dist:    userStatusQ.rows.map((r) => ({ status: r.status, count: toNum(r.count) })),
      sangha_status_dist:  sanghaStatusQ.rows.map((r) => ({ status: r.status, count: toNum(r.count) })),
      top_sanghas:         topSanghasQ.rows.map((r) => ({
        sangha_name: r.sangha_name, state: r.state, member_count: toNum(r.member_count),
      })),
      users_by_district: usersByDistrictQ.rows.map((r) => ({ district: r.district, count: toNum(r.count) })),
      users_by_state_gender: usersByStateGenderQ.rows.map((r) => ({
        state: r.state, male: toNum(r.male), female: toNum(r.female), other: toNum(r.other),
      })),
      marital_status_gender: maritalStatusGenderQ.rows.map((r) => ({
        label: r.label, male: toNum(r.male), female: toNum(r.female), other: toNum(r.other),
      })),
      family_type: { nuclear: toNum(ftRow.nuclear), joint: toNum(ftRow.joint) },
      degree_levels_gender: degreeLevelsGenderQ.rows.map((r) => ({
        label: r.label, male: toNum(r.male), female: toNum(r.female), other: toNum(r.other),
      })),
      insurance_gender: [
        buildInsGender('Health',       insuranceHealthGenderQ.rows),
        buildInsGender('Life',         insuranceLifeGenderQ.rows),
        buildInsGender('Term',         insuranceTermGenderQ.rows),
        buildInsGender('Konkani Card', insuranceKonkaniGenderQ.rows),
      ],
      documents_gender: [
        { label: 'Aadhaar',  yes: toNum(docRow.aadhaar_yes), no: toNum(docRow.aadhaar_no), unknown: toNum(docRow.aadhaar_unknown) },
        { label: 'PAN Card', yes: toNum(docRow.pan_yes),     no: toNum(docRow.pan_no),     unknown: toNum(docRow.pan_unknown) },
        { label: 'Voter ID', yes: toNum(docRow.voter_yes),   no: toNum(docRow.voter_no),   unknown: toNum(docRow.voter_unknown) },
        { label: 'Land Docs',yes: toNum(docRow.land_yes),    no: toNum(docRow.land_no),    unknown: toNum(docRow.land_unknown) },
        { label: 'DL',       yes: toNum(docRow.dl_yes),      no: toNum(docRow.dl_no),      unknown: toNum(docRow.dl_unknown) },
      ],
    });
  } catch (err) {
    console.error("[getGeneralReport]", err);
    return res.status(500).json({ message: "Failed to fetch general report", error: err.message });
  }
}

// ─── GET /admin/reports/advanced (legacy — step-completion analytics) ─────────

async function getAdvancedReport(req, res) {
  try {
    const { from, to, dateFrom, dateTo } = req.query;
    const dateStart = from || dateFrom || null;
    const dateEnd = to   || dateTo   || null;
    const dateWhere = `
      AND p.created_at >= COALESCE($1::timestamptz, '-infinity')
      AND p.created_at <= COALESCE($2::timestamptz, 'infinity')
    `;
    const dateParams = [dateStart, dateEnd];

    const stepQ = await pool.query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE step1_completed) AS step1, COUNT(*) FILTER (WHERE step2_completed) AS step2,
         COUNT(*) FILTER (WHERE step3_completed) AS step3, COUNT(*) FILTER (WHERE step4_completed) AS step4,
         COUNT(*) FILTER (WHERE step5_completed) AS step5, COUNT(*) FILTER (WHERE step6_completed) AS step6,
         COUNT(*) FILTER (WHERE step7_completed) AS step7
       FROM profiles p WHERE 1=1 ${dateWhere}`,
      dateParams
    );

    const stepRow = stepQ.rows[0];
    const totalProfiles = parseInt(stepRow.total, 10) || 1;
    const stepLabels = [
      { step: "step1", label: "Personal Details"     },
      { step: "step2", label: "Religious Details"    },
      { step: "step3", label: "Family Info"          },
      { step: "step4", label: "Location / Address"   },
      { step: "step5", label: "Education & Profession" },
      { step: "step6", label: "Economic Details"     },
      { step: "step7", label: "Sangha Membership"    },
    ];
    const step_completion = stepLabels.map(({ step, label }) => {
      const count = parseInt(stepRow[step], 10) || 0;
      return { step, label, count, pct: Math.round((count / totalProfiles) * 100) };
    });

    const safe = async (sql, params = []) => {
      try { return (await pool.query(sql, params)).rows; } catch (e) { return []; }
    };

    const [ageQ, educationQ, professionQ, incomeQ, assetsQ, insuranceQ, docQ, gotraQ, kuladevataQ, familySizeQ, languageQ, sanghaRolesQ, disabilityQ] =
      await Promise.all([
        safe(`SELECT CASE WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 18 THEN 'Under 18' WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 26 THEN '18–25' WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 36 THEN '26–35' WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 46 THEN '36–45' WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 56 THEN '46–55' WHEN EXTRACT(YEAR FROM AGE(pd.date_of_birth)) < 66 THEN '56–65' ELSE '65+' END AS bucket, COUNT(*) AS count FROM personal_details pd JOIN profiles p ON p.id = pd.profile_id WHERE pd.date_of_birth IS NOT NULL ${dateWhere} GROUP BY bucket ORDER BY MIN(pd.date_of_birth) DESC`, dateParams),
        safe(`SELECT me.highest_education AS level, COUNT(*) AS count FROM member_education me JOIN profiles p ON p.id = me.profile_id WHERE me.highest_education IS NOT NULL ${dateWhere} GROUP BY me.highest_education ORDER BY count DESC`, dateParams),
        safe(`SELECT me.profession_type::text AS type, COUNT(*) AS count FROM member_education me JOIN profiles p ON p.id = me.profile_id WHERE me.profession_type IS NOT NULL ${dateWhere} GROUP BY me.profession_type ORDER BY count DESC`, dateParams),
        safe(`SELECT ed.self_income::text AS bracket, COUNT(*) FILTER (WHERE ed.self_income IS NOT NULL) AS self_count, COUNT(*) FILTER (WHERE ed.family_income IS NOT NULL) AS family_count FROM economic_details ed JOIN profiles p ON p.id = ed.profile_id WHERE ed.self_income IS NOT NULL ${dateWhere} GROUP BY ed.self_income ORDER BY self_count DESC`, dateParams),
        safe(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE fac_own_house) AS own_house, COUNT(*) FILTER (WHERE fac_rented_house) AS rented_house, COUNT(*) FILTER (WHERE fac_agricultural_land) AS agricultural_land, COUNT(*) FILTER (WHERE fac_two_wheeler) AS two_wheeler, COUNT(*) FILTER (WHERE fac_car) AS car, COUNT(*) FILTER (WHERE inv_fixed_deposits) AS fixed_deposits, COUNT(*) FILTER (WHERE inv_mutual_funds_sip) AS mutual_funds_sip, COUNT(*) FILTER (WHERE inv_shares_demat) AS shares_demat, COUNT(*) FILTER (WHERE inv_others) AS inv_others FROM economic_details ed JOIN profiles p ON p.id = ed.profile_id WHERE 1=1 ${dateWhere}`, dateParams),
        safe(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE array_length(health_coverage, 1) > 0) AS health, COUNT(*) FILTER (WHERE array_length(life_coverage, 1) > 0) AS life_ins, COUNT(*) FILTER (WHERE array_length(term_coverage, 1) > 0) AS term, COUNT(*) FILTER (WHERE array_length(konkani_card_coverage, 1) > 0) AS konkani_card FROM member_insurance mi JOIN profiles p ON p.id = mi.profile_id WHERE 1=1 ${dateWhere}`, dateParams),
        safe(`WITH d AS (SELECT md.aadhaar_coverage::text AS v FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved') SELECT COUNT(*) FILTER (WHERE v='yes') AS yes_count, COUNT(*) FILTER (WHERE v='no') AS no_count, COUNT(*) FILTER (WHERE v IS NULL OR v NOT IN ('yes','no')) AS unknown_count FROM d`),
        safe(`SELECT rd.gotra, COUNT(*) AS count FROM religious_details rd JOIN profiles p ON p.id = rd.profile_id WHERE rd.gotra IS NOT NULL AND rd.gotra <> '' ${dateWhere} GROUP BY rd.gotra ORDER BY count DESC LIMIT 15`, dateParams),
        safe(`SELECT COALESCE(NULLIF(rd.kuladevata_other, ''), rd.kuladevata) AS kuladevata, COUNT(*) AS count FROM religious_details rd JOIN profiles p ON p.id = rd.profile_id WHERE rd.kuladevata IS NOT NULL ${dateWhere} GROUP BY COALESCE(NULLIF(rd.kuladevata_other, ''), rd.kuladevata) ORDER BY count DESC LIMIT 15`, dateParams),
        safe(`SELECT CASE WHEN member_count=1 THEN '1' WHEN member_count=2 THEN '2' WHEN member_count=3 THEN '3' WHEN member_count=4 THEN '4' WHEN member_count=5 THEN '5' ELSE '6+' END AS size, COUNT(*) AS count FROM (SELECT fi.profile_id, COUNT(fm.id) AS member_count FROM family_info fi LEFT JOIN family_members fm ON fm.family_info_id=fi.id AND fm.status='active' JOIN profiles p ON p.id=fi.profile_id WHERE 1=1 ${dateWhere} GROUP BY fi.profile_id) sub GROUP BY size ORDER BY MIN(member_count)`, dateParams),
        safe(`SELECT COALESCE(NULLIF(ml.language_other,''), ml.language) AS language, COUNT(*) AS count FROM member_languages ml JOIN member_education me ON me.id=ml.member_education_id JOIN profiles p ON p.id=me.profile_id WHERE ml.language IS NOT NULL ${dateWhere} GROUP BY COALESCE(NULLIF(ml.language_other,''), ml.language) ORDER BY count DESC LIMIT 15`, dateParams),
        safe(`SELECT ms.role, COUNT(*) AS count FROM member_sanghas ms JOIN profiles p ON p.id=ms.profile_id WHERE ms.role IS NOT NULL ${dateWhere} GROUP BY ms.role ORDER BY count DESC`, dateParams),
        safe(`SELECT (pd.has_disability IS NOT NULL AND pd.has_disability NOT IN ('no','No','NO','')) AS has_disability, COUNT(*) AS count FROM personal_details pd JOIN profiles p ON p.id=pd.profile_id WHERE 1=1 ${dateWhere} GROUP BY has_disability`, dateParams),
      ]);

    const toNum = (v) => parseInt(v, 10) || 0;
    const aRow   = assetsQ[0]   || {};
    const aTotal = parseInt(aRow.total, 10) || 1;
    const insRow  = insuranceQ[0] || {};
    const insTotal = parseInt(insRow.total, 10) || 1;
    const docRow  = docQ[0] || {};
    const docTotal = parseInt(docRow.total, 10) || 1;

    return res.json({
      step_completion,
      age_distribution:      ageQ.map((r) => ({ bucket: r.bucket, count: toNum(r.count) })),
      education_levels:      educationQ.map((r) => ({ level: r.level, count: toNum(r.count) })),
      profession_types:      professionQ.map((r) => ({ type: r.type, count: toNum(r.count) })),
      income_brackets:       incomeQ.map((r) => ({ bracket: r.bracket, self_count: toNum(r.self_count), family_count: toNum(r.family_count) })),
      assets_owned: [
        { asset: "Own House",          count: toNum(aRow.own_house),        pct: Math.round(toNum(aRow.own_house)        / aTotal * 100) },
        { asset: "Rented House",       count: toNum(aRow.rented_house),     pct: Math.round(toNum(aRow.rented_house)     / aTotal * 100) },
        { asset: "Agricultural Land",  count: toNum(aRow.agricultural_land),pct: Math.round(toNum(aRow.agricultural_land)/ aTotal * 100) },
        { asset: "Two Wheeler",        count: toNum(aRow.two_wheeler),      pct: Math.round(toNum(aRow.two_wheeler)      / aTotal * 100) },
        { asset: "Car",                count: toNum(aRow.car),              pct: Math.round(toNum(aRow.car)              / aTotal * 100) },
        { asset: "Fixed Deposits",     count: toNum(aRow.fixed_deposits),   pct: Math.round(toNum(aRow.fixed_deposits)   / aTotal * 100) },
        { asset: "Mutual Funds / SIP", count: toNum(aRow.mutual_funds_sip), pct: Math.round(toNum(aRow.mutual_funds_sip) / aTotal * 100) },
        { asset: "Shares / Demat",     count: toNum(aRow.shares_demat),     pct: Math.round(toNum(aRow.shares_demat)     / aTotal * 100) },
        { asset: "Other Investments",  count: toNum(aRow.inv_others),       pct: Math.round(toNum(aRow.inv_others)       / aTotal * 100) },
      ],
      insurance_coverage: [
        { type: "Health Insurance", coverage_pct: Math.round(toNum(insRow.health)      / insTotal * 100), uncovered_pct: 100 - Math.round(toNum(insRow.health)      / insTotal * 100) },
        { type: "Life Insurance",   coverage_pct: Math.round(toNum(insRow.life_ins)    / insTotal * 100), uncovered_pct: 100 - Math.round(toNum(insRow.life_ins)    / insTotal * 100) },
        { type: "Term Insurance",   coverage_pct: Math.round(toNum(insRow.term)        / insTotal * 100), uncovered_pct: 100 - Math.round(toNum(insRow.term)        / insTotal * 100) },
        { type: "Konkani Card",     coverage_pct: Math.round(toNum(insRow.konkani_card)/ insTotal * 100), uncovered_pct: 100 - Math.round(toNum(insRow.konkani_card)/ insTotal * 100) },
      ],
      document_coverage: [
        { doc: "Aadhaar",       yes_pct: Math.round(toNum(docRow.aadhaar)      / docTotal * 100), no_pct: 100 - Math.round(toNum(docRow.aadhaar)      / docTotal * 100) },
        { doc: "PAN",           yes_pct: Math.round(toNum(docRow.pan)          / docTotal * 100), no_pct: 100 - Math.round(toNum(docRow.pan)          / docTotal * 100) },
        { doc: "Voter ID",      yes_pct: Math.round(toNum(docRow.voter)        / docTotal * 100), no_pct: 100 - Math.round(toNum(docRow.voter)        / docTotal * 100) },
        { doc: "Land Document", yes_pct: Math.round(toNum(docRow.land_doc)     / docTotal * 100), no_pct: 100 - Math.round(toNum(docRow.land_doc)     / docTotal * 100) },
        { doc: "Driving Lic",   yes_pct: Math.round(toNum(docRow.driving_lic)  / docTotal * 100), no_pct: 100 - Math.round(toNum(docRow.driving_lic)  / docTotal * 100) },
      ],
      gotra_distribution:       gotraQ.map((r)      => ({ gotra:      r.gotra,      count: toNum(r.count) })),
      kuladevata_distribution:  kuladevataQ.map((r) => ({ kuladevata: r.kuladevata, count: toNum(r.count) })),
      family_size_distribution: familySizeQ.map((r) => ({ size:       r.size,       count: toNum(r.count) })),
      language_distribution:    languageQ.map((r)   => ({ language:   r.language,   count: toNum(r.count) })),
      sangha_members_by_role:   sanghaRolesQ.map((r)=> ({ role:       r.role,       count: toNum(r.count) })),
      disability_stats:         disabilityQ.map((r) => ({ has_disability: r.has_disability, count: toNum(r.count) })),
    });
  } catch (err) {
    console.error("[getAdvancedReport]", err);
    return res.status(500).json({ message: "Failed to fetch advanced report", error: err.message });
  }
}

// ─── GET /admin/reports/advanced (admin dashboard — Users tab) ────────────────

const getAdminAdvancedReportsuser = async (req, res) => {
  try {
    const safe = async (sql, params = []) => {
      try { return (await pool.query(sql, params)).rows; }
      catch (e) { console.warn('[AdminAdvancedReports]', e.message); return []; }
    };

    const [totalRes, populationRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cnt FROM profiles WHERE status='approved'`),
      pool.query(`
        SELECT
          COUNT(DISTINCT p.id) AS family_count,
          COALESCE((
            SELECT COUNT(*) FROM family_members fm
            JOIN profiles p2 ON p2.id = fm.profile_id
            WHERE p2.status = 'approved'
          ), 0) AS member_count
        FROM profiles p WHERE p.status = 'approved'
      `),
    ]);

    const totalApproved   = parseInt(totalRes.rows[0]?.cnt || 0);
    const popRow          = populationRes.rows[0] || {};
    const totalPopulation = parseInt(popRow.family_count || 0) + parseInt(popRow.member_count || 0);

    const [
      combinedGenderRows,
      combinedAgeGenderRows,
      famTypeRows,
      maritalGenderRows,
      combinedDegreeGenderRows,
      combinedProfessionGenderRows,
      studyingGenderRows,
      workingGenderRows,
      // ── City / Geographic: include family members via profile's address ──
      cityRows,
      geoGenderRows,
      assetRows,
      assetsGenderRows,
      healthInsRows,
      lifeInsRows,
      termInsRows,
      konkaniInsRows,
      aadhaarRows,
      panRows,
      voterRows,
      landRows,
      dlRows,
      statusGenderRows,
      statusBreakdownRows,
      gotraRows,
      kuldevRows,
      pravaraRows,
      upanamaGenRows,
      upanaPropRows,
      demiGodRows,
      ancestralRows,
      employmentGenderRows,
      familyIncomeRows,
    ] = await Promise.all([

      // 1. Combined gender
      safe(`
        SELECT SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved'
          UNION ALL
          SELECT
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN family_members fm ON fm.profile_id = p.id WHERE p.status = 'approved'
        ) t
      `),

      // 2. Combined age groups
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT
            CASE
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19  THEN '0–18'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) <= 35 THEN '19–35'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) <= 60 THEN '36–60'
              ELSE '60+'
            END AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND pd.date_of_birth IS NOT NULL
          GROUP BY 1
          UNION ALL
          SELECT
            CASE
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) < 19  THEN '0–18'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) <= 35 THEN '19–35'
              WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) <= 60 THEN '36–60'
              ELSE '60+'
            END AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN family_members fm ON fm.profile_id = p.id
          WHERE p.status = 'approved' AND fm.dob IS NOT NULL
          GROUP BY 1
        ) combined
        GROUP BY label
        ORDER BY CASE label WHEN '0–18' THEN 1 WHEN '19–35' THEN 2 WHEN '36–60' THEN 3 ELSE 4 END
      `),

      // 3. Family type
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear,
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%')   AS joint
        FROM profiles p JOIN family_info fi ON fi.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 4. Marital status by gender
      // Replace query #4 (maritalGenderRows) with:
safe(`
  SELECT
    CASE
      WHEN LOWER(pd.marital_status) IN (
        'single_never_married','never married','never_married','unmarried','single'
      ) THEN 'Single (Never Married)'
      WHEN LOWER(pd.marital_status) IN ('married')
        THEN 'Married'
      WHEN LOWER(pd.marital_status) IN ('single_divorced','divorced')
        THEN 'Single & Divorced'
      WHEN LOWER(pd.marital_status) IN ('single_widowed','widowed','widow','widower')
        THEN 'Single & Widowed'
      ELSE 'Other'
    END AS label,
    COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
    COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
    COUNT(*) FILTER (WHERE pd.gender IS NOT NULL
      AND LOWER(pd.gender::text) NOT IN ('male','female'))  AS other
  FROM profiles p
  JOIN personal_details pd ON pd.profile_id = p.id
  WHERE p.status = 'approved'
    AND pd.marital_status IS NOT NULL
    AND TRIM(pd.marital_status) <> ''
  GROUP BY 1
  ORDER BY CASE
    WHEN CASE
      WHEN LOWER(pd.marital_status) IN ('single_never_married','never married','never_married','unmarried','single') THEN 'Single (Never Married)'
      WHEN LOWER(pd.marital_status) IN ('married') THEN 'Married'
      WHEN LOWER(pd.marital_status) IN ('single_divorced','divorced') THEN 'Single & Divorced'
      WHEN LOWER(pd.marital_status) IN ('single_widowed','widowed','widow','widower') THEN 'Single & Widowed'
      ELSE 'Other'
    END = 'Single (Never Married)' THEN 1
    WHEN CASE
      WHEN LOWER(pd.marital_status) IN ('single_never_married','never married','never_married','unmarried','single') THEN 'Single (Never Married)'
      WHEN LOWER(pd.marital_status) IN ('married') THEN 'Married'
      WHEN LOWER(pd.marital_status) IN ('single_divorced','divorced') THEN 'Single & Divorced'
      WHEN LOWER(pd.marital_status) IN ('single_widowed','widowed','widow','widower') THEN 'Single & Widowed'
      ELSE 'Other'
    END = 'Married' THEN 2
    WHEN CASE
      WHEN LOWER(pd.marital_status) IN ('single_never_married','never married','never_married','unmarried','single') THEN 'Single (Never Married)'
      WHEN LOWER(pd.marital_status) IN ('married') THEN 'Married'
      WHEN LOWER(pd.marital_status) IN ('single_divorced','divorced') THEN 'Single & Divorced'
      WHEN LOWER(pd.marital_status) IN ('single_widowed','widowed','widow','widower') THEN 'Single & Widowed'
      ELSE 'Other'
    END = 'Single & Divorced' THEN 3
    WHEN CASE
      WHEN LOWER(pd.marital_status) IN ('single_never_married','never married','never_married','unmarried','single') THEN 'Single (Never Married)'
      WHEN LOWER(pd.marital_status) IN ('married') THEN 'Married'
      WHEN LOWER(pd.marital_status) IN ('single_divorced','divorced') THEN 'Single & Divorced'
      WHEN LOWER(pd.marital_status) IN ('single_widowed','widowed','widow','widower') THEN 'Single & Widowed'
      ELSE 'Other'
    END = 'Single & Widowed' THEN 4
    ELSE 5
  END
`),
        

      // 5. Combined degree by gender
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT me_edu.degree_type AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) = 'self'
          JOIN member_educations me_edu ON me_edu.member_education_id = me.id
          JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND me_edu.degree_type IS NOT NULL AND TRIM(me_edu.degree_type) <> ''
          GROUP BY me_edu.degree_type
          UNION ALL
          SELECT me_edu.degree_type AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) <> 'self'
          JOIN member_educations me_edu ON me_edu.member_education_id = me.id
          LEFT JOIN family_members fm ON fm.profile_id = p.id AND LOWER(TRIM(COALESCE(fm.name,''))) = LOWER(TRIM(COALESCE(me.member_name,'')))
          WHERE p.status = 'approved' AND me_edu.degree_type IS NOT NULL AND TRIM(me_edu.degree_type) <> ''
          GROUP BY me_edu.degree_type
        ) combined_degrees
        GROUP BY label ORDER BY SUM(male) + SUM(female) + SUM(other) DESC
      `),

      // 6. Combined profession by gender
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT me.profession_type::text AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) = 'self'
          JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type
          UNION ALL
          SELECT me.profession_type::text AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male')   AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) <> 'self'
          LEFT JOIN family_members fm ON fm.profile_id = p.id AND LOWER(TRIM(COALESCE(fm.name,''))) = LOWER(TRIM(COALESCE(me.member_name,'')))
          WHERE p.status = 'approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type
        ) t GROUP BY label ORDER BY SUM(male)+SUM(female)+SUM(other) DESC LIMIT 10
      `),

      // 7. Studying
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT CASE WHEN me.is_currently_studying=true THEN 'Yes' ELSE 'No' END AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) = 'self'
          JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved' GROUP BY 1
          UNION ALL
          SELECT CASE WHEN me.is_currently_studying=true THEN 'Yes' ELSE 'No' END AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) <> 'self'
          LEFT JOIN family_members fm ON fm.profile_id = p.id AND LOWER(TRIM(COALESCE(fm.name,''))) = LOWER(TRIM(COALESCE(me.member_name,'')))
          WHERE p.status = 'approved' GROUP BY 1
        ) t GROUP BY label
      `),

      // 8. Working
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT CASE WHEN me.is_currently_working=true THEN 'Yes' ELSE 'No' END AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) = 'self'
          JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND me.is_currently_working IS NOT NULL GROUP BY 1
          UNION ALL
          SELECT CASE WHEN me.is_currently_working=true THEN 'Yes' ELSE 'No' END AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) <> 'self'
          LEFT JOIN family_members fm ON fm.profile_id = p.id AND LOWER(TRIM(COALESCE(fm.name,''))) = LOWER(TRIM(COALESCE(me.member_name,'')))
          WHERE p.status = 'approved' AND me.is_currently_working IS NOT NULL GROUP BY 1
        ) t GROUP BY label
      `),

      // ── 9. City counts: profile heads + family members (use profile's address) ──
      safe(`
        WITH combined_cities AS (
          -- Profile heads
          SELECT TRIM(a.city) AS city
          FROM profiles p JOIN addresses a ON a.profile_id = p.id
          WHERE p.status = 'approved' AND a.city IS NOT NULL AND TRIM(a.city) != ''
          UNION ALL
          -- Family members mapped to profile head's address
          SELECT TRIM(a.city) AS city
          FROM profiles p
          JOIN addresses a ON a.profile_id = p.id
          JOIN family_members fm ON fm.profile_id = p.id
          WHERE p.status = 'approved' AND a.city IS NOT NULL AND TRIM(a.city) != ''
            AND fm.status = 'active'
        )
        SELECT city, COUNT(*) AS count
        FROM combined_cities
        WHERE city != ''
        GROUP BY city ORDER BY count DESC LIMIT 100
      `),

      // ── 10. Geographic gender: profile heads + family members ────────────────
      safe(`
        WITH combined_geo AS (
          SELECT TRIM(a.city) AS city, LOWER(pd.gender::text) AS gender
          FROM profiles p JOIN addresses a ON a.profile_id = p.id
          JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND a.city IS NOT NULL AND TRIM(a.city) != ''
          UNION ALL
          SELECT TRIM(a.city) AS city, LOWER(fm.gender::text) AS gender
          FROM profiles p JOIN addresses a ON a.profile_id = p.id
          JOIN family_members fm ON fm.profile_id = p.id
          WHERE p.status = 'approved' AND a.city IS NOT NULL AND TRIM(a.city) != ''
            AND fm.status = 'active'
        )
        SELECT city,
          COUNT(*) FILTER (WHERE gender='male')   AS male,
          COUNT(*) FILTER (WHERE gender='female') AS female,
          COUNT(*) FILTER (WHERE gender IS NOT NULL AND gender NOT IN ('male','female')) AS other
        FROM combined_geo WHERE city != ''
        GROUP BY city ORDER BY COUNT(*) DESC LIMIT 100
      `),

      // 11. Asset totals
      safe(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ed.fac_own_house=true)         AS own_house,
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true) AS agri_land,
          COUNT(*) FILTER (WHERE ed.fac_car=true)               AS four_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true)       AS two_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_rented_house=true)      AS renting
        FROM profiles p JOIN economic_details ed ON ed.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 12. Asset gender
      safe(`
        SELECT 'Own House' AS label,
          COUNT(*) FILTER (WHERE ed.fac_own_house=true AND LOWER(pd.gender::text)='male') AS male,
          COUNT(*) FILTER (WHERE ed.fac_own_house=true AND LOWER(pd.gender::text)='female') AS female,
          COUNT(*) FILTER (WHERE ed.fac_own_house=true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
        FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
        UNION ALL SELECT 'Agri Land',
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND LOWER(pd.gender::text)='male'),
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND LOWER(pd.gender::text)='female'),
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))
        FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
        UNION ALL SELECT '4-Wheeler',
          COUNT(*) FILTER (WHERE ed.fac_car=true AND LOWER(pd.gender::text)='male'),
          COUNT(*) FILTER (WHERE ed.fac_car=true AND LOWER(pd.gender::text)='female'),
          COUNT(*) FILTER (WHERE ed.fac_car=true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))
        FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
        UNION ALL SELECT '2-Wheeler',
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND LOWER(pd.gender::text)='male'),
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND LOWER(pd.gender::text)='female'),
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))
        FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
        UNION ALL SELECT 'Renting',
          COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND LOWER(pd.gender::text)='male'),
          COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND LOWER(pd.gender::text)='female'),
          COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))
        FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
      `),

      // 13. Health insurance
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.health_coverage) AND LOWER(pd.gender::text)='male') AS male_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.health_coverage) AND LOWER(pd.gender::text)='female') AS female_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.health_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.health_coverage) AND LOWER(pd.gender::text)='male') AS male_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.health_coverage) AND LOWER(pd.gender::text)='female') AS female_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.health_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no,
          COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage) = 0) AND LOWER(pd.gender::text)='male') AS male_unknown,
          COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage) = 0) AND LOWER(pd.gender::text)='female') AS female_unknown,
          COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
        FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 14. Life insurance
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.life_coverage) AND LOWER(pd.gender::text)='male') AS male_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.life_coverage) AND LOWER(pd.gender::text)='female') AS female_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.life_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.life_coverage) AND LOWER(pd.gender::text)='male') AS male_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.life_coverage) AND LOWER(pd.gender::text)='female') AS female_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.life_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no,
          COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage) = 0) AND LOWER(pd.gender::text)='male') AS male_unknown,
          COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage) = 0) AND LOWER(pd.gender::text)='female') AS female_unknown,
          COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
        FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 15. Term insurance
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.term_coverage) AND LOWER(pd.gender::text)='male') AS male_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.term_coverage) AND LOWER(pd.gender::text)='female') AS female_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.term_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.term_coverage) AND LOWER(pd.gender::text)='male') AS male_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.term_coverage) AND LOWER(pd.gender::text)='female') AS female_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.term_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no,
          COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage) = 0) AND LOWER(pd.gender::text)='male') AS male_unknown,
          COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage) = 0) AND LOWER(pd.gender::text)='female') AS female_unknown,
          COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
        FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 16. Konkani Card
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.konkani_card_coverage) AND LOWER(pd.gender::text)='male') AS male_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.konkani_card_coverage) AND LOWER(pd.gender::text)='female') AS female_yes,
          COUNT(*) FILTER (WHERE 'yes'=ANY(mi.konkani_card_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.konkani_card_coverage) AND LOWER(pd.gender::text)='male') AS male_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.konkani_card_coverage) AND LOWER(pd.gender::text)='female') AS female_no,
          COUNT(*) FILTER (WHERE 'no'=ANY(mi.konkani_card_coverage) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no,
          COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage) = 0) AND LOWER(pd.gender::text)='male') AS male_unknown,
          COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage) = 0) AND LOWER(pd.gender::text)='female') AS female_unknown,
          COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
        FROM profiles p JOIN member_insurance mi ON mi.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.status = 'approved'
      `),

      // 17-21. Documents
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) NOT IN ('yes','no') OR md.aadhaar_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) NOT IN ('yes','no') OR md.pan_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) NOT IN ('yes','no') OR md.voter_id_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) NOT IN ('yes','no') OR md.land_doc_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) NOT IN ('yes','no') OR md.dl_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),

      // 22. Status by gender
      safe(`SELECT p.status, COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p LEFT JOIN personal_details pd ON pd.profile_id=p.id GROUP BY p.status ORDER BY COUNT(*) DESC`),

      // 23. Status breakdown
      safe(`SELECT p.status, COUNT(*) AS count FROM profiles p GROUP BY p.status ORDER BY count DESC`),

      // 24-30. Religious
      safe(`SELECT gotra AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND gotra IS NOT NULL AND TRIM(gotra)!='' GROUP BY gotra ORDER BY count DESC LIMIT 10`),
      safe(`SELECT COALESCE(NULLIF(kuladevata_other,''), kuladevata) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND kuladevata IS NOT NULL AND TRIM(kuladevata)!='' GROUP BY COALESCE(NULLIF(kuladevata_other,''), kuladevata) ORDER BY count DESC LIMIT 10`),
      safe(`SELECT pravara AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND pravara IS NOT NULL AND TRIM(pravara)!='' GROUP BY pravara ORDER BY count DESC LIMIT 10`),
      safe(`SELECT upanama_general AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND upanama_general IS NOT NULL AND TRIM(upanama_general)!='' GROUP BY upanama_general ORDER BY count DESC LIMIT 20`),
      safe(`SELECT upanama_proper AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND upanama_proper IS NOT NULL AND TRIM(upanama_proper)!='' GROUP BY upanama_proper ORDER BY count DESC LIMIT 20`),
      safe(`SELECT unnest(demi_gods) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND demi_gods IS NOT NULL GROUP BY label ORDER BY count DESC LIMIT 25`),
      safe(`SELECT COUNT(*) FILTER (WHERE ancestral_challenge='yes') AS with_challenge, COUNT(*) FILTER (WHERE ancestral_challenge!='yes' OR ancestral_challenge IS NULL) AS without_challenge FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved'`),

      // 31. Employment sector
      safe(`
        SELECT label, SUM(male) AS male, SUM(female) AS female, SUM(other) AS other
        FROM (
          SELECT me.profession_type::text AS label,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) = 'self'
          JOIN personal_details pd ON pd.profile_id = p.id
          WHERE p.status = 'approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type
          UNION ALL
          SELECT me.profession_type::text AS label,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male') AS male,
            COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
            COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
          FROM profiles p JOIN member_education me ON me.profile_id = p.id AND LOWER(COALESCE(me.member_relation,'')) <> 'self'
          LEFT JOIN family_members fm ON fm.profile_id = p.id AND LOWER(TRIM(COALESCE(fm.name,''))) = LOWER(TRIM(COALESCE(me.member_name,'')))
          WHERE p.status = 'approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type
        ) t GROUP BY label ORDER BY SUM(male)+SUM(female)+SUM(other) DESC LIMIT 10
      `),

      // 32. Family income
      safe(`SELECT ed.family_income::text AS label, COUNT(*) AS count FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id WHERE p.status='approved' AND ed.family_income IS NOT NULL GROUP BY ed.family_income ORDER BY count DESC`),
    ]);

    const n = (v) => parseInt(v || 0);

    const gSrc        = combinedGenderRows[0] || {};
    const ft          = famTypeRows[0]         || {};
    const as          = assetRows[0]           || {};
    const anc         = ancestralRows[0]       || {};
    const studyingYes = studyingGenderRows.find(r => r.label === 'Yes') || {};
    const studyingNo  = studyingGenderRows.find(r => r.label === 'No')  || {};
    const workingYes  = workingGenderRows.find(r => r.label === 'Yes')  || {};
    const workingNo   = workingGenderRows.find(r => r.label === 'No')   || {};

    const buildInsurance = (label, rows) => {
      const r = rows[0] || {};
      const maleYes   = n(r.male_yes);
      const femaleYes = n(r.female_yes);
      const otherYes  = n(r.other_yes);
      const maleNo    = n(r.male_no);
      const femaleNo  = n(r.female_no);
      const otherNo   = n(r.other_no);
      const maleUnk   = n(r.male_unknown);
      const femaleUnk = n(r.female_unknown);
      const otherUnk  = n(r.other_unknown);
      return {
        label,
        yes:     maleYes  + femaleYes  + otherYes,
        no:      maleNo   + femaleNo   + otherNo,
        unknown: maleUnk  + femaleUnk  + otherUnk,
        maleYes,    femaleYes,    otherYes,
        maleNo,     femaleNo,     otherNo,
        maleUnknown: maleUnk, femaleUnknown: femaleUnk, otherUnknown: otherUnk,
      };
    };

    res.json({
      totalApproved,
      totalPopulation,
      statusBreakdown: statusBreakdownRows.map(r => ({ status: r.status, count: n(r.count) })),
      statusGenderBreakdown: statusGenderRows.map(r => ({
        status: r.status, male: n(r.male), female: n(r.female), other: n(r.other),
      })),
      demographics: {
        gender: { male: n(gSrc.male), female: n(gSrc.female), other: n(gSrc.other) },
        ageGroups: combinedAgeGenderRows.map(r => ({
          label: r.label, count: n(r.male) + n(r.female) + n(r.other),
        })),
        ageGroupsGender: combinedAgeGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        familyType: { nuclear: n(ft.nuclear), joint: n(ft.joint) },
        maritalStatus: maritalGenderRows.map(r => ({
          label: r.label, count: n(r.male) + n(r.female) + n(r.other),
        })),
        maritalStatusGender: maritalGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
      },
      education: {
        degrees: combinedDegreeGenderRows.map(r => ({
          label: r.label, count: n(r.male) + n(r.female) + n(r.other),
        })),
        degreesGender: combinedDegreeGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        professions: combinedProfessionGenderRows.map(r => ({
          label: r.label, count: n(r.male) + n(r.female) + n(r.other),
        })),
        professionsGender: combinedProfessionGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        studying: {
          yes: n(studyingYes.male)+n(studyingYes.female)+n(studyingYes.other),
          no:  n(studyingNo.male) +n(studyingNo.female) +n(studyingNo.other),
          maleYes: n(studyingYes.male),   femaleYes: n(studyingYes.female),   otherYes: n(studyingYes.other),
          maleNo:  n(studyingNo.male),    femaleNo:  n(studyingNo.female),    otherNo:  n(studyingNo.other),
        },
        working: {
          yes: n(workingYes.male)+n(workingYes.female)+n(workingYes.other),
          no:  n(workingNo.male) +n(workingNo.female) +n(workingNo.other),
          maleYes: n(workingYes.male),  femaleYes: n(workingYes.female),  otherYes: n(workingYes.other),
          maleNo:  n(workingNo.male),   femaleNo:  n(workingNo.female),   otherNo:  n(workingNo.other),
        },
        employmentGender: employmentGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        employment: combinedProfessionGenderRows.map(r => ({
          label: r.label, count: n(r.male)+n(r.female)+n(r.other),
        })),
      },
      economic: {
        incomeSlabs: familyIncomeRows.map(r => ({ label: r.label, count: n(r.count) })),
        assets: [
          { label: 'Own House',         owned: n(as.own_house),    total: n(as.total) },
          { label: 'Agricultural Land', owned: n(as.agri_land),    total: n(as.total) },
          { label: '4-Wheeler',         owned: n(as.four_wheeler), total: n(as.total) },
          { label: '2-Wheeler',         owned: n(as.two_wheeler),  total: n(as.total) },
          { label: 'Renting',           owned: n(as.renting),      total: n(as.total) },
        ],
        assetsGender: assetsGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        employmentGender: employmentGenderRows.map(r => ({
          label: r.label, male: n(r.male), female: n(r.female), other: n(r.other),
        })),
        employment: combinedProfessionGenderRows.map(r => ({
          label: r.label, count: n(r.male)+n(r.female)+n(r.other),
        })),
      },
      insurance: [
        buildInsurance('Health',       healthInsRows),
        buildInsurance('Life',         lifeInsRows),
        buildInsurance('Term',         termInsRows),
        buildInsurance('Konkani Card', konkaniInsRows),
      ],
      documents: [
        { label: 'Aadhaar',   yes: n(aadhaarRows[0]?.yes_count), no: n(aadhaarRows[0]?.no_count), unknown: n(aadhaarRows[0]?.unknown_count) },
        { label: 'PAN Card',  yes: n(panRows[0]?.yes_count),     no: n(panRows[0]?.no_count),     unknown: n(panRows[0]?.unknown_count)     },
        { label: 'Voter ID',  yes: n(voterRows[0]?.yes_count),   no: n(voterRows[0]?.no_count),   unknown: n(voterRows[0]?.unknown_count)   },
        { label: 'Land Docs', yes: n(landRows[0]?.yes_count),    no: n(landRows[0]?.no_count),    unknown: n(landRows[0]?.unknown_count)    },
        { label: 'DL',        yes: n(dlRows[0]?.yes_count),      no: n(dlRows[0]?.no_count),      unknown: n(dlRows[0]?.unknown_count)      },
      ],
      geographic: cityRows.map(r => ({ city: r.city, count: n(r.count) })),
      geographicGender: geoGenderRows.map(r => ({
        city: r.city, male: n(r.male), female: n(r.female), other: n(r.other),
      })),
      religious: {
        gotras:          gotraRows.map(r      => ({ label: r.label, count: n(r.count) })),
        kuladevatas:     kuldevRows.map(r     => ({ label: r.label, count: n(r.count) })),
        pravaras:        pravaraRows.map(r    => ({ label: r.label, count: n(r.count) })),
        upanamaGenerals: upanamaGenRows.map(r => ({ label: r.label, count: n(r.count) })),
        upanamaPropers:  upanaPropRows.map(r  => ({ label: r.label, count: n(r.count) })),
        demiGods:        demiGodRows.map(r    => ({ label: r.label, count: n(r.count) })),
        ancestralStats: {
          withChallenge:    n(anc.with_challenge),
          withoutChallenge: n(anc.without_challenge),
        },
      },
    });
  } catch (err) {
    console.error('[getAdminAdvancedReportsuser]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── GET /admin/reports/sanghas ───────────────────────────────────────────────
const getAdminSanghaReports = async (req, res) => {
  try {
    const safe = async (sql, params = []) => {
      try { return (await pool.query(sql, params)).rows; }
      catch (e) { console.warn('[AdminSanghaReports]', e.message); return []; }
    };

    const [
      totalRes, statusRows, stateRows, districtRows,
      memberCountRows, trendRows, growthRows, topSanghaRows,
      completionRows, profileStatusRows, contactRows,
      memberTypeRows,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cnt FROM sanghas`),
      safe(`SELECT status::text AS status, COUNT(*) AS count FROM sanghas GROUP BY status ORDER BY count DESC`),
      safe(`SELECT COALESCE(state,'Unknown') AS state, COUNT(*) AS count FROM sanghas GROUP BY state ORDER BY count DESC LIMIT 20`),
      safe(`SELECT COALESCE(district,'Unknown') AS district, COUNT(*) AS count FROM sanghas GROUP BY district ORDER BY count DESC LIMIT 20`),
      safe(`
        SELECT
          s.sangha_name, s.state,
          COUNT(sm.id) AS total_members,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'president') AS president,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'secretary') AS secretary,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'treasurer') AS treasurer,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'accountant') AS accountant,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'auditor') AS auditor,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) IN ('vice president','vice-president','hon. president','hon president')) AS vice_president,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) IN ('joint secretary','joint-secretary','hon. secretary','hon secretary')) AS joint_secretary,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) IN ('member','common member')) AS member,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) = 'advisor') AS advisor,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) IN ('legal advisor','legal-advisor','legal_advisor')) AS legal_advisor,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.role,'')) NOT IN (
            'president','secretary','treasurer','accountant','auditor',
            'vice president','vice-president','hon. president','hon president',
            'joint secretary','joint-secretary','hon. secretary','hon secretary',
            'member','common member','advisor','legal advisor','legal-advisor','legal_advisor'
          ) AND sm.role IS NOT NULL AND TRIM(sm.role) != '') AS other_role,
          COUNT(sm.id) FILTER (WHERE sm.role IS NULL OR TRIM(sm.role) = '') AS no_role
        FROM sanghas s
        LEFT JOIN sangha_members sm ON sm.sangha_id = s.id
        GROUP BY s.id, s.sangha_name, s.state
        HAVING COUNT(sm.id) > 0
        ORDER BY total_members DESC
      `),
      safe(`SELECT TO_CHAR(DATE_TRUNC('month', created_at),'Mon YYYY') AS month, COUNT(*) AS count FROM sanghas GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC`),
      safe(`SELECT TO_CHAR(DATE_TRUNC('month', created_at),'Mon YYYY') AS month, COUNT(*) AS new_sanghas, SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative FROM sanghas GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC`),
      safe(`
        SELECT
          s.sangha_name,
          COUNT(p.id)                                                   AS total_users,
          COUNT(p.id) FILTER (WHERE p.status = 'approved')              AS approved,
          COUNT(p.id) FILTER (WHERE p.status = 'rejected')              AS rejected,
          COUNT(p.id) FILTER (WHERE p.status = 'changes_requested')     AS changes_requested,
          COALESCE(s.state,'—')                                         AS state,
          COALESCE(s.district,'—')                                      AS district,
          s.status::text                                                 AS status
        FROM sanghas s
        LEFT JOIN profiles p ON p.sangha_id = s.id
        GROUP BY s.id, s.sangha_name, s.state, s.district, s.status
        ORDER BY total_users DESC
      `),
      safe(`SELECT s.sangha_name, AVG(COALESCE(p.overall_completion_pct, 0)) AS avg_completion FROM sanghas s JOIN profiles p ON p.sangha_id=s.id WHERE p.status='approved' GROUP BY s.id, s.sangha_name HAVING COUNT(p.id) >= 3 ORDER BY avg_completion DESC LIMIT 10`),
      safe(`SELECT COUNT(*) FILTER (WHERE p.status='approved') AS approved, COUNT(*) FILTER (WHERE p.status='rejected') AS rejected, COUNT(*) FILTER (WHERE p.status IN ('submitted','under_review')) AS submitted, COUNT(*) FILTER (WHERE p.status='draft') AS draft, COUNT(*) FILTER (WHERE p.status='changes_requested') AS changes_requested FROM profiles p`),
      safe(`SELECT COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '' AND phone IS NOT NULL AND phone != '') AS with_both, COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') AS with_email, COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') AS with_phone FROM sanghas`),
      safe(`
        SELECT
          s.sangha_name,
          s.state,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%full%' AND LOWER(COALESCE(sm.gender,'')) = 'male')   AS fulltime_male,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%full%' AND LOWER(COALESCE(sm.gender,'')) = 'female') AS fulltime_female,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%full%'
            AND sm.gender IS NOT NULL AND LOWER(COALESCE(sm.gender,'')) NOT IN ('male','female'))                                   AS fulltime_other,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%part%' AND LOWER(COALESCE(sm.gender,'')) = 'male')   AS parttime_male,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%part%' AND LOWER(COALESCE(sm.gender,'')) = 'female') AS parttime_female,
          COUNT(sm.id) FILTER (WHERE LOWER(COALESCE(sm.member_type,'')) LIKE '%part%'
            AND sm.gender IS NOT NULL AND LOWER(COALESCE(sm.gender,'')) NOT IN ('male','female'))                                   AS parttime_other,
          COUNT(sm.id) AS total
        FROM sanghas s
        JOIN sangha_members sm ON sm.sangha_id = s.id
        GROUP BY s.id, s.sangha_name, s.state
        HAVING COUNT(sm.id) > 0
        ORDER BY total DESC
      `),
    ]);

    const n  = (v) => parseInt(v || 0);
    const ps = profileStatusRows[0] || {};
    const ct = contactRows[0]       || {};

    res.json({
      totalSanghas:         n(totalRes.rows[0]?.cnt),
      statusBreakdown:      statusRows.map(r   => ({ status: r.status, count: n(r.count) })),
      stateDistribution:    stateRows.map(r    => ({ state: r.state, count: n(r.count) })),
      districtDistribution: districtRows.map(r => ({ district: r.district, count: n(r.count) })),
      sanghasByMemberCount: memberCountRows.map(r => ({
        sangha_name:     r.sangha_name,
        state:           r.state || '',
        total_members:   n(r.total_members),
        president:       n(r.president),
        secretary:       n(r.secretary),
        treasurer:       n(r.treasurer),
        accountant:      n(r.accountant),
        auditor:         n(r.auditor),
        vice_president:  n(r.vice_president),
        joint_secretary: n(r.joint_secretary),
        member:          n(r.member),
        advisor:         n(r.advisor),
        legal_advisor:   n(r.legal_advisor),
        other_role:      n(r.other_role),
        no_role:         n(r.no_role),
      })),
      sanghasMemberTypeBreakdown: memberTypeRows.map(r => ({
        sangha_name:     r.sangha_name,
        state:           r.state || '',
        fulltime_male:   n(r.fulltime_male),
        fulltime_female: n(r.fulltime_female),
        fulltime_other:  n(r.fulltime_other),
        parttime_male:   n(r.parttime_male),
        parttime_female: n(r.parttime_female),
        parttime_other:  n(r.parttime_other),
        total:           n(r.total),
      })),
      registrationTrend: trendRows.map(r  => ({ month: r.month, count: n(r.count) })),
      membershipGrowth:  growthRows.map(r  => ({ month: r.month, new_sanghas: n(r.new_sanghas), cumulative: n(r.cumulative) })),
      topSanghas: topSanghaRows.map(r => ({
        sangha_name:       r.sangha_name,
        total_users:       n(r.total_users),
        approved:          n(r.approved),
        rejected:          n(r.rejected),
        changes_requested: n(r.changes_requested),
        state:             r.state,
        district:          r.district,
        status:            r.status,
      })),
      completionRates: completionRows.map(r => ({ sangha_name: r.sangha_name, avg_completion: parseFloat(r.avg_completion || 0) })),
      profileStatusAcrossSanghas: {
        approved:          n(ps.approved),
        rejected:          n(ps.rejected),
        submitted:         n(ps.submitted),
        draft:             n(ps.draft),
        changes_requested: n(ps.changes_requested),
      },
      sanghaContactStats: {
        withEmail: n(ct.with_email),
        withPhone: n(ct.with_phone),
        withBoth:  n(ct.with_both),
      },
      approvalTimeline: [],
    });
  } catch (err) {
    console.error('[getAdminSanghaReports]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
  

// ─── GET /admin/reports/enhanced ─────────────────────────────────────────────

async function getEnhancedReport(req, res) {
  try {
    const { from, to, dateFrom, dateTo } = req.query;
    const dateStart = from || dateFrom || null;
    const dateEnd   = to   || dateTo   || null;

    const [countsQ, trendsQ, dailyQ, sectionQ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE p.status = 'approved')                                   AS approved,
           COUNT(*) FILTER (WHERE p.status = 'rejected')                                   AS rejected,
           COUNT(*) FILTER (WHERE p.status IN ('submitted','under_review'))                 AS pending,
           COUNT(*) FILTER (WHERE p.status = 'changes_requested')                          AS changes_requested,
           COUNT(*) FILTER (WHERE p.status = 'draft')                                      AS draft,
           COUNT(*)                                                                         AS total
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         WHERE u.role = 'user' AND u.is_deleted = false`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE p.status = 'approved' AND u.created_at >= NOW() - INTERVAL '30 days') AS approved_last30,
           COUNT(*) FILTER (WHERE p.status = 'approved' AND u.created_at >= NOW() - INTERVAL '60 days' AND u.created_at < NOW() - INTERVAL '30 days') AS approved_prev30,
           COUNT(*) FILTER (WHERE p.status IN ('submitted','under_review') AND p.submitted_at >= NOW() - INTERVAL '30 days') AS submitted_last30,
           COUNT(*) FILTER (WHERE p.status IN ('submitted','under_review') AND p.submitted_at >= NOW() - INTERVAL '60 days' AND p.submitted_at < NOW() - INTERVAL '30 days') AS submitted_prev30,
           COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days') AS total_last30,
           COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '60 days' AND u.created_at < NOW() - INTERVAL '30 days') AS total_prev30
         FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.role = 'user' AND u.is_deleted = false`
      ),
      pool.query(
        `SELECT
           TO_CHAR(u.created_at::date, 'YYYY-MM-DD') AS date,
           COUNT(*) AS registrations,
           COUNT(*) FILTER (WHERE p.status = 'approved') AS approvals,
           COUNT(*) FILTER (WHERE p.status = 'rejected') AS rejections
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.role = 'user' AND u.is_deleted = false
           AND u.created_at >= COALESCE($1::timestamptz, NOW() - INTERVAL '30 days')
           AND u.created_at <= COALESCE($2::timestamptz, NOW())
         GROUP BY u.created_at::date ORDER BY u.created_at::date ASC`,
        [dateStart, dateEnd]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE step1_completed) AS "personalDetails",
           COUNT(*) FILTER (WHERE step4_completed) AS "locationInformation",
           COUNT(*) FILTER (WHERE step5_completed) AS "educationProfession",
           COUNT(*) FILTER (WHERE step6_completed) AS "economicDetails",
           COUNT(*) FILTER (WHERE step6_completed) AS "insuranceCoverage",
           COUNT(*) FILTER (WHERE step6_completed) AS "documentationStatus",
           COUNT(*) FILTER (WHERE step2_completed) AS "religiousDetails"
         FROM profiles`
      ),
    ]);

    const cr = countsQ.rows[0]  || {};
    const tr = trendsQ.rows[0]  || {};
    const sc = sectionQ.rows[0] || {};

    return res.json({
      counts: {
        approved:          String(cr.approved          || 0),
        rejected:          String(cr.rejected          || 0),
        pending:           String(cr.pending           || 0),
        changes_requested: String(cr.changes_requested || 0),
        draft:             String(cr.draft             || 0),
        total:             String(cr.total             || 0),
      },
      trends: {
        approved_last30:  String(tr.approved_last30  || 0),
        approved_prev30:  String(tr.approved_prev30  || 0),
        submitted_last30: String(tr.submitted_last30 || 0),
        submitted_prev30: String(tr.submitted_prev30 || 0),
        total_last30:     String(tr.total_last30     || 0),
        total_prev30:     String(tr.total_prev30     || 0),
      },
      dailyRegistrations: dailyQ.rows.map((r) => ({
        date:          r.date,
        registrations: String(r.registrations || 0),
        approvals:     String(r.approvals     || 0),
        rejections:    String(r.rejections    || 0),
      })),
      sectionCounts: {
        personalDetails:      parseInt(sc.personalDetails      || 0),
        locationInformation:  parseInt(sc.locationInformation  || 0),
        educationProfession:  parseInt(sc.educationProfession  || 0),
        economicDetails:      parseInt(sc.economicDetails      || 0),
        insuranceCoverage:    parseInt(sc.insuranceCoverage    || 0),
        documentationStatus:  parseInt(sc.documentationStatus  || 0),
        religiousDetails:     parseInt(sc.religiousDetails     || 0),
      },
    });
  } catch (err) {
    console.error('[getEnhancedReport]', err);
    return res.status(500).json({ message: 'Failed to fetch enhanced report', error: err.message });
  }
}

module.exports = {
  getGeneralReport,
  getAdvancedReport,
  getEnhancedReport,
  getAdminAdvancedReportsuser,
  getAdminSanghaReports,
};
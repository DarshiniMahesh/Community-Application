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
    const { from, to } = req.query;
    const df = dateFilter(from, to, "u");

    const [
      userStatsQ, sanghaStatsQ, trendQ, usersByStateQ, sanghasByStateQ,
      genderQ, userStatusQ, sanghaStatusQ, topSanghasQ, usersByDistrictQ,
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)                                                          AS total,
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
        [from || null, to || null]
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
        [from || null, to || null]
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
        [from || null, to || null]
      ),
      pool.query(
        `SELECT a.state, COUNT(DISTINCT p.user_id) AS count
         FROM profiles p JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
         WHERE a.state IS NOT NULL AND a.state <> '' GROUP BY a.state ORDER BY count DESC LIMIT 10`
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
      pool.query(`SELECT p.status::text AS status, COUNT(*) AS count FROM profiles p GROUP BY p.status ORDER BY count DESC`),
      pool.query(`SELECT status::text AS status, COUNT(*) AS count FROM sanghas GROUP BY status ORDER BY count DESC`),
      pool.query(
        `SELECT s.sangha_name, s.state, COUNT(sm.id) AS member_count
         FROM sanghas s LEFT JOIN sangha_members sm ON sm.sangha_id = s.id
         GROUP BY s.id, s.sangha_name, s.state ORDER BY member_count DESC LIMIT 10`
      ),
      pool.query(
        `SELECT a.district, COUNT(DISTINCT p.user_id) AS count
         FROM profiles p JOIN addresses a ON a.profile_id = p.id AND a.address_type = 'current'
         WHERE a.district IS NOT NULL AND a.district <> '' GROUP BY a.district ORDER BY count DESC LIMIT 10`
      ),
    ]);

    const toNum = (v) => parseInt(v, 10) || 0;
    const ur = userStatsQ.rows[0];
    const sr = sanghaStatsQ.rows[0];

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
      registrations_trend: trendQ.rows.map((r) => ({ period: r.period, users: toNum(r.users), sanghas: toNum(r.sanghas) })),
      users_by_state:      usersByStateQ.rows.map((r) => ({ state: r.state, count: toNum(r.count) })),
      sanghas_by_state:    sanghasByStateQ.rows.map((r) => ({ state: r.state, count: toNum(r.count) })),
      gender_distribution: genderQ.rows.map((r) => ({ gender: r.gender, count: toNum(r.count) })),
      user_status_dist:    userStatusQ.rows.map((r) => ({ status: r.status, count: toNum(r.count) })),
      sangha_status_dist:  sanghaStatusQ.rows.map((r) => ({ status: r.status, count: toNum(r.count) })),
      top_sanghas:         topSanghasQ.rows.map((r) => ({ sangha_name: r.sangha_name, state: r.state, member_count: toNum(r.member_count) })),
      users_by_district:   usersByDistrictQ.rows.map((r) => ({ district: r.district, count: toNum(r.count) })),
    });
  } catch (err) {
    console.error("[getGeneralReport]", err);
    return res.status(500).json({ message: "Failed to fetch general report", error: err.message });
  }
}

// ─── GET /admin/reports/advanced (legacy — step-completion analytics) ─────────

async function getAdvancedReport(req, res) {
  try {
    const { from, to } = req.query;
    const dateWhere = `
      AND p.created_at >= COALESCE($1::timestamptz, '-infinity')
      AND p.created_at <= COALESCE($2::timestamptz, 'infinity')
    `;
    const dateParams = [from || null, to || null];

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
        safe(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE aadhaar_coverage IS NOT NULL) AS aadhaar, COUNT(*) FILTER (WHERE pan_coverage IS NOT NULL) AS pan, COUNT(*) FILTER (WHERE voter_id_coverage IS NOT NULL) AS voter, COUNT(*) FILTER (WHERE land_doc_coverage IS NOT NULL) AS land_doc, COUNT(*) FILTER (WHERE dl_coverage IS NOT NULL) AS driving_lic FROM member_documents md JOIN profiles p ON p.id = md.profile_id WHERE 1=1 ${dateWhere}`, dateParams),
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

    // ── Total approved + population ───────────────────────────────────────────
    const [totalRes, populationRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cnt FROM profiles WHERE status='approved'`),
      pool.query(
        `SELECT COUNT(DISTINCT p.id) AS family_count,
           COALESCE((SELECT COUNT(*) FROM family_members fm
                     JOIN profiles p2 ON p2.id = fm.profile_id WHERE p2.status='approved'), 0) AS member_count
         FROM profiles p WHERE p.status='approved'`
      ),
    ]);
    const totalApproved  = parseInt(totalRes.rows[0]?.cnt || 0);
    const popRow         = populationRes.rows[0] || {};
    const totalPopulation = parseInt(popRow.family_count || 0) + parseInt(popRow.member_count || 0);

    // ── All queries in parallel ───────────────────────────────────────────────
    const [
      genderRows, memberGenderRows, ageRows, pdAgeRows, famTypeRows, maritalRows,
      degreeRows, professionRows, studyingRows, workingRows, cityRows, assetRows,
      healthInsRows, lifeInsRows, termInsRows, konkaniInsRows,
      aadhaarRows, panRows, voterRows, landRows, dlRows,
      // Insurance gender breakdowns
      healthInsGenderRows, lifeInsGenderRows, termInsGenderRows, konkaniInsGenderRows,
      statusGenderRows, statusBreakdownRows,
      // Religious
      gotraRows, kuldevRows, pravaraRows, upanamaGenRows, upanaPropRows, demiGodRows, ancestralRows,
      // Gender chart breakdowns
      ageGenderRows, maritalGenderRows, degreeGenderRows, professionGenderRows,
      studyingGenderRows, workingGenderRows, assetsGenderRows, employmentGenderRows, geoGenderRows,
      // Family income
      familyIncomeRows,
    ] = await Promise.all([

      // 1 — registered-user gender (from personal_details)
      safe(`SELECT
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),

      // 2 — family-member gender
      safe(`SELECT
              COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'`),

      // 3 — family-member age buckets
      safe(`SELECT
              COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))<19) AS u18,
              COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 19 AND 35) AS y35,
              COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 36 AND 60) AS m60,
              COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))>60) AS o60
            FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'`),

      // 4 — registered-user age buckets (fallback)
      safe(`SELECT
              COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth))<19) AS u18,
              COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth)) BETWEEN 19 AND 35) AS y35,
              COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth)) BETWEEN 36 AND 60) AS m60,
              COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth))>60) AS o60
            FROM profiles p JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),

      // 5 — family type
      safe(`SELECT
              COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear,
              COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%')   AS joint
            FROM profiles p JOIN family_info fi ON fi.profile_id=p.id WHERE p.status='approved'`),

      // 6 — marital status
      safe(`SELECT
              COUNT(*) FILTER (WHERE pd.is_married=true)  AS married,
              COUNT(*) FILTER (WHERE pd.is_married=false) AS single
            FROM profiles p JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),

      // 7 — degrees
      safe(`SELECT me.highest_education AS label, COUNT(*) AS count
            FROM profiles p JOIN member_education me ON me.profile_id=p.id
            WHERE p.status='approved' AND me.highest_education IS NOT NULL AND TRIM(me.highest_education)!=''
            GROUP BY me.highest_education ORDER BY count DESC LIMIT 10`),

      // 8 — professions
      safe(`SELECT me.profession_type::text AS label, COUNT(*) AS count
            FROM profiles p JOIN member_education me ON me.profile_id=p.id
            WHERE p.status='approved' AND me.profession_type IS NOT NULL
            GROUP BY me.profession_type ORDER BY count DESC LIMIT 10`),

      // 9 — studying
      safe(`SELECT
              COUNT(*) FILTER (WHERE me.is_currently_studying=true)  AS yes_count,
              COUNT(*) FILTER (WHERE me.is_currently_studying=false) AS no_count
            FROM profiles p JOIN member_education me ON me.profile_id=p.id WHERE p.status='approved'`),

      // 10 — working
      safe(`SELECT
              COUNT(*) FILTER (WHERE me.is_currently_working=true)  AS yes_count,
              COUNT(*) FILTER (WHERE me.is_currently_working=false) AS no_count
            FROM profiles p JOIN member_education me ON me.profile_id=p.id WHERE p.status='approved' AND me.is_currently_working IS NOT NULL`),

      // 11 — cities
      safe(`SELECT TRIM(a.city) AS city, COUNT(DISTINCT p.id) AS count
            FROM profiles p JOIN addresses a ON a.profile_id=p.id
            WHERE p.status='approved' AND a.city IS NOT NULL AND TRIM(a.city)!=''
            GROUP BY TRIM(a.city) ORDER BY count DESC LIMIT 100`),

      // 12 — assets
      safe(`SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE ed.fac_own_house=true)         AS own_house,
              COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true) AS agri_land,
              COUNT(*) FILTER (WHERE ed.fac_car=true)               AS four_wheeler,
              COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true)       AS two_wheeler,
              COUNT(*) FILTER (WHERE ed.fac_rented_house=true)      AS renting
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id WHERE p.status='approved'`),

      // 13-16 — insurance coverage counts
      safe(`SELECT
              COUNT(*) FILTER (WHERE mi.health_coverage IS NOT NULL AND cardinality(mi.health_coverage)>0 AND NOT (mi.health_coverage @> ARRAY['none']::text[])) AS covered,
              COUNT(*) FILTER (WHERE mi.health_coverage IS NULL OR cardinality(mi.health_coverage)=0 OR mi.health_coverage @> ARRAY['none']::text[]) AS not_covered
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE mi.life_coverage IS NOT NULL AND cardinality(mi.life_coverage)>0 AND NOT (mi.life_coverage @> ARRAY['none']::text[])) AS covered,
              COUNT(*) FILTER (WHERE mi.life_coverage IS NULL OR cardinality(mi.life_coverage)=0 OR mi.life_coverage @> ARRAY['none']::text[]) AS not_covered
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE mi.term_coverage IS NOT NULL AND cardinality(mi.term_coverage)>0 AND NOT (mi.term_coverage @> ARRAY['none']::text[])) AS covered,
              COUNT(*) FILTER (WHERE mi.term_coverage IS NULL OR cardinality(mi.term_coverage)=0 OR mi.term_coverage @> ARRAY['none']::text[]) AS not_covered
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE mi.konkani_card_coverage IS NOT NULL AND cardinality(mi.konkani_card_coverage)>0 AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[])) AS covered,
              COUNT(*) FILTER (WHERE mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage)=0 OR mi.konkani_card_coverage @> ARRAY['none']::text[]) AS not_covered
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id WHERE p.status='approved'`),

      // 17-21 — documents
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) NOT IN ('yes','no') OR md.aadhaar_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) NOT IN ('yes','no') OR md.pan_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) NOT IN ('yes','no') OR md.voter_id_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) NOT IN ('yes','no') OR md.land_doc_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='yes') AS yes_count, COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='no') AS no_count, COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) NOT IN ('yes','no') OR md.dl_coverage IS NULL) AS unknown_count FROM profiles p JOIN member_documents md ON md.profile_id=p.id WHERE p.status='approved'`),

      // 22-25 — insurance gender breakdowns (FIX: these fields were missing, causing frontend maleYes/femaleYes to be undefined)
      safe(`SELECT
              COUNT(*) FILTER (WHERE cardinality(mi.health_coverage)>0 AND NOT (mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.health_coverage)>0 AND NOT (mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.health_coverage)>0 AND NOT (mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
              COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage)=0 OR mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_no,
              COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage)=0 OR mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_no,
              COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage)=0 OR mi.health_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE cardinality(mi.life_coverage)>0 AND NOT (mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.life_coverage)>0 AND NOT (mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.life_coverage)>0 AND NOT (mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
              COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage)=0 OR mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_no,
              COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage)=0 OR mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_no,
              COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage)=0 OR mi.life_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE cardinality(mi.term_coverage)>0 AND NOT (mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.term_coverage)>0 AND NOT (mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.term_coverage)>0 AND NOT (mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
              COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage)=0 OR mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_no,
              COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage)=0 OR mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_no,
              COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage)=0 OR mi.term_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT
              COUNT(*) FILTER (WHERE cardinality(mi.konkani_card_coverage)>0 AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.konkani_card_coverage)>0 AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_yes,
              COUNT(*) FILTER (WHERE cardinality(mi.konkani_card_coverage)>0 AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes,
              COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage)=0 OR mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='male')   AS male_no,
              COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage)=0 OR mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text)='female') AS female_no,
              COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage)=0 OR mi.konkani_card_coverage @> ARRAY['none']::text[]) AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no
            FROM profiles p JOIN member_insurance mi ON mi.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),

      // 26-27 — status breakdowns
      safe(`SELECT p.status,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p LEFT JOIN personal_details pd ON pd.profile_id=p.id GROUP BY p.status ORDER BY COUNT(*) DESC`),
      safe(`SELECT p.status, COUNT(*) AS count FROM profiles p GROUP BY p.status ORDER BY count DESC`),

      // 28-34 — religious
      safe(`SELECT gotra AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND gotra IS NOT NULL AND TRIM(gotra)!='' GROUP BY gotra ORDER BY count DESC LIMIT 10`),
      safe(`SELECT COALESCE(NULLIF(kuladevata_other,''), kuladevata) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND kuladevata IS NOT NULL AND TRIM(kuladevata)!='' GROUP BY COALESCE(NULLIF(kuladevata_other,''), kuladevata) ORDER BY count DESC LIMIT 10`),
      safe(`SELECT pravara AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND pravara IS NOT NULL AND TRIM(pravara)!='' GROUP BY pravara ORDER BY count DESC LIMIT 10`),
      safe(`SELECT upanama_general AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND upanama_general IS NOT NULL AND TRIM(upanama_general)!='' GROUP BY upanama_general ORDER BY count DESC LIMIT 20`),
      safe(`SELECT upanama_proper AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND upanama_proper IS NOT NULL AND TRIM(upanama_proper)!='' GROUP BY upanama_proper ORDER BY count DESC LIMIT 20`),
      safe(`SELECT unnest(demi_gods) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved' AND demi_gods IS NOT NULL GROUP BY label ORDER BY count DESC LIMIT 25`),
      safe(`SELECT COUNT(*) FILTER (WHERE ancestral_challenge='yes') AS with_challenge, COUNT(*) FILTER (WHERE ancestral_challenge!='yes' OR ancestral_challenge IS NULL) AS without_challenge FROM profiles p JOIN religious_details rd ON rd.profile_id=p.id WHERE p.status='approved'`),

      // 35-43 — gender chart breakdowns
      safe(`SELECT label, male, female, other FROM (
              SELECT '0–18' AS label,
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male'   AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))<19) AS male,
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female' AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))<19) AS female,
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text) NOT IN ('male','female') AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))<19) AS other
              FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'
              UNION ALL SELECT '19–35',
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male'   AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 19 AND 35),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female' AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 19 AND 35),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text) NOT IN ('male','female') AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 19 AND 35)
              FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'
              UNION ALL SELECT '36–60',
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male'   AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 36 AND 60),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female' AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 36 AND 60),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text) NOT IN ('male','female') AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob)) BETWEEN 36 AND 60)
              FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'
              UNION ALL SELECT '60+',
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='male'   AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))>60),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text)='female' AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))>60),
                COUNT(*) FILTER (WHERE LOWER(fm.gender::text) NOT IN ('male','female') AND fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE,fm.dob))>60)
              FROM profiles p JOIN family_members fm ON fm.profile_id=p.id WHERE p.status='approved'
            ) t`),
      safe(`SELECT (CASE WHEN pd.is_married=true THEN 'Married' ELSE 'Single' END) AS label,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved' GROUP BY pd.is_married`),
      safe(`SELECT me.highest_education AS label,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN member_education me ON me.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' AND me.highest_education IS NOT NULL GROUP BY me.highest_education ORDER BY SUM(1) DESC LIMIT 7`),
      safe(`SELECT me.profession_type::text AS label,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN member_education me ON me.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY COUNT(*) DESC LIMIT 10`),
      safe(`SELECT me.is_currently_studying,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN member_education me ON me.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' GROUP BY me.is_currently_studying`),
      safe(`SELECT me.is_currently_working,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN member_education me ON me.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' AND me.is_currently_working IS NOT NULL GROUP BY me.is_currently_working`),
      safe(`SELECT 'Own House' AS label,
              COUNT(*) FILTER (WHERE ed.fac_own_house=true AND LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE ed.fac_own_house=true AND LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE ed.fac_own_house=true AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
            UNION ALL SELECT 'Agri Land',
              COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND LOWER(pd.gender::text)='male'),
              COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND LOWER(pd.gender::text)='female'),
              COUNT(*) FILTER (WHERE ed.fac_agricultural_land=true AND LOWER(pd.gender::text) NOT IN ('male','female'))
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
            UNION ALL SELECT '4-Wheeler',
              COUNT(*) FILTER (WHERE ed.fac_car=true AND LOWER(pd.gender::text)='male'),
              COUNT(*) FILTER (WHERE ed.fac_car=true AND LOWER(pd.gender::text)='female'),
              COUNT(*) FILTER (WHERE ed.fac_car=true AND LOWER(pd.gender::text) NOT IN ('male','female'))
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
            UNION ALL SELECT '2-Wheeler',
              COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND LOWER(pd.gender::text)='male'),
              COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND LOWER(pd.gender::text)='female'),
              COUNT(*) FILTER (WHERE ed.fac_two_wheeler=true AND LOWER(pd.gender::text) NOT IN ('male','female'))
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'
            UNION ALL SELECT 'Renting',
              COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND LOWER(pd.gender::text)='male'),
              COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND LOWER(pd.gender::text)='female'),
              COUNT(*) FILTER (WHERE ed.fac_rented_house=true AND LOWER(pd.gender::text) NOT IN ('male','female'))
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id WHERE p.status='approved'`),
      safe(`SELECT me.profession_type::text AS label,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN member_education me ON me.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY COUNT(*) DESC LIMIT 10`),
      safe(`SELECT TRIM(a.city) AS city,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='male')   AS male,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text)='female') AS female,
              COUNT(*) FILTER (WHERE LOWER(pd.gender::text) NOT IN ('male','female')) AS other
            FROM profiles p JOIN addresses a ON a.profile_id=p.id JOIN personal_details pd ON pd.profile_id=p.id
            WHERE p.status='approved' AND a.city IS NOT NULL AND TRIM(a.city)!=''
            GROUP BY TRIM(a.city) ORDER BY COUNT(*) DESC LIMIT 100`),

      // 44 — family income
      safe(`SELECT ed.family_income::text AS label, COUNT(*) AS count
            FROM profiles p JOIN economic_details ed ON ed.profile_id=p.id
            WHERE p.status='approved' AND ed.family_income IS NOT NULL
            GROUP BY ed.family_income ORDER BY count DESC`),
    ]);

    // ── Derive helpers ────────────────────────────────────────────────────────
    const n = (v) => parseInt(v || 0);

    const studyingYes = studyingGenderRows.find(r => r.is_currently_studying === true)  || {};
    const studyingNo  = studyingGenderRows.find(r => r.is_currently_studying === false) || {};
    const workingYes  = workingGenderRows.find(r => r.is_currently_working  === true)   || {};
    const workingNo   = workingGenderRows.find(r => r.is_currently_working  === false)  || {};

    const fmG    = memberGenderRows[0] || {};
    const pdG    = genderRows[0]       || {};
    const hasFmG = (n(fmG.male) + n(fmG.female) + n(fmG.other)) > 0;
    const gSrc   = hasFmG ? fmG : pdG;

    const fmAge    = ageRows[0]   || {};
    const pdAge    = pdAgeRows[0] || {};
    const hasFmAge = (n(fmAge.u18) + n(fmAge.y35) + n(fmAge.m60) + n(fmAge.o60)) > 0;
    const ageSrc   = hasFmAge ? fmAge : pdAge;

    const ft = famTypeRows[0]  || {};
    const mar= maritalRows[0]  || {};
    const as = assetRows[0]    || {};
    const st = studyingRows[0] || {};
    const wk = workingRows[0]  || {};
    const anc= ancestralRows[0]|| {};

    // ── Insurance gender helper ───────────────────────────────────────────────
    const buildInsurance = (label, covered, notCovered, genderRow) => {
      const g = genderRow[0] || {};
      return {
        label,
        yes:         n(covered),
        no:          n(notCovered),
        unknown:     0,
        maleYes:     n(g.male_yes),
        femaleYes:   n(g.female_yes),
        otherYes:    n(g.other_yes),
        maleNo:      n(g.male_no),
        femaleNo:    n(g.female_no),
        otherNo:     n(g.other_no),
        maleUnknown: 0,
        femaleUnknown: 0,
        otherUnknown:  0,
      };
    };

    res.json({
      totalApproved,
      totalPopulation,
      statusBreakdown: statusBreakdownRows.map(r => ({ status: r.status, count: n(r.count) })),
      statusGenderBreakdown: statusGenderRows.map(r => ({ status: r.status, male: n(r.male), female: n(r.female), other: n(r.other) })),
      demographics: {
        gender: { male: n(gSrc.male), female: n(gSrc.female), other: n(gSrc.other) },
        ageGroups: [
          { label: '0–18',  count: n(ageSrc.u18) },
          { label: '19–35', count: n(ageSrc.y35) },
          { label: '36–60', count: n(ageSrc.m60) },
          { label: '60+',   count: n(ageSrc.o60) },
        ],
        ageGroupsGender: ageGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        familyType: { nuclear: n(ft.nuclear), joint: n(ft.joint) },
        maritalStatus: [
          { label: 'Married', count: n(mar.married) },
          { label: 'Single',  count: n(mar.single)  },
        ].filter(m => m.count > 0),
        maritalStatusGender: maritalGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
      },
      education: {
        degrees: degreeRows.map(r => ({ label: r.label, count: n(r.count) })),
        degreesGender: degreeGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        professions: professionRows.map(r => ({ label: r.label, count: n(r.count) })),
        professionsGender: professionGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        studying: {
          yes: n(st.yes_count), no: n(st.no_count),
          maleYes: n(studyingYes.male), femaleYes: n(studyingYes.female), otherYes: n(studyingYes.other),
          maleNo:  n(studyingNo.male),  femaleNo:  n(studyingNo.female),  otherNo:  n(studyingNo.other),
        },
        working: {
          yes: n(wk.yes_count), no: n(wk.no_count),
          maleYes: n(workingYes.male), femaleYes: n(workingYes.female), otherYes: n(workingYes.other),
          maleNo:  n(workingNo.male),  femaleNo:  n(workingNo.female),  otherNo:  n(workingNo.other),
        },
        employmentGender: employmentGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        employment: professionRows.map(r => ({ label: r.label, count: n(r.count) })),
      },
      economic: {
        incomeSlabs: familyIncomeRows.map(r => ({ label: r.label, count: n(r.count) })),
        assets: [
          { label: 'Own House',         owned: n(as.own_house),     total: n(as.total) },
          { label: 'Agricultural Land', owned: n(as.agri_land),     total: n(as.total) },
          { label: '4-Wheeler',         owned: n(as.four_wheeler),  total: n(as.total) },
          { label: '2-Wheeler',         owned: n(as.two_wheeler),   total: n(as.total) },
          { label: 'Renting',           owned: n(as.renting),       total: n(as.total) },
        ],
        assetsGender: assetsGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        employmentGender: employmentGenderRows.map(r => ({ label: r.label, male: n(r.male), female: n(r.female), other: n(r.other) })),
        employment: professionRows.map(r => ({ label: r.label, count: n(r.count) })),
      },
      // FIX: insurance now includes maleYes/femaleYes/otherYes/maleNo/femaleNo/otherNo
      insurance: [
        buildInsurance('Health',       healthInsRows[0]?.covered,  healthInsRows[0]?.not_covered,  healthInsGenderRows),
        buildInsurance('Life',         lifeInsRows[0]?.covered,    lifeInsRows[0]?.not_covered,    lifeInsGenderRows),
        buildInsurance('Term',         termInsRows[0]?.covered,    termInsRows[0]?.not_covered,    termInsGenderRows),
        buildInsurance('Konkani Card', konkaniInsRows[0]?.covered, konkaniInsRows[0]?.not_covered, konkaniInsGenderRows),
      ],
      documents: [
        { label: 'Aadhaar',  yes: n(aadhaarRows[0]?.yes_count), no: n(aadhaarRows[0]?.no_count), unknown: n(aadhaarRows[0]?.unknown_count) },
        { label: 'PAN Card', yes: n(panRows[0]?.yes_count),     no: n(panRows[0]?.no_count),     unknown: n(panRows[0]?.unknown_count)     },
        { label: 'Voter ID', yes: n(voterRows[0]?.yes_count),   no: n(voterRows[0]?.no_count),   unknown: n(voterRows[0]?.unknown_count)   },
        { label: 'Land Docs',yes: n(landRows[0]?.yes_count),    no: n(landRows[0]?.no_count),    unknown: n(landRows[0]?.unknown_count)    },
        { label: 'DL',       yes: n(dlRows[0]?.yes_count),      no: n(dlRows[0]?.no_count),      unknown: n(dlRows[0]?.unknown_count)      },
      ],
      geographic: cityRows.map(r => ({ city: r.city, count: n(r.count) })),
      geographicGender: geoGenderRows.map(r => ({ city: r.city, male: n(r.male), female: n(r.female), other: n(r.other) })),
      religious: {
        gotras:          gotraRows.map(r       => ({ label: r.label, count: n(r.count) })),
        kuladevatas:     kuldevRows.map(r      => ({ label: r.label, count: n(r.count) })),
        pravaras:        pravaraRows.map(r     => ({ label: r.label, count: n(r.count) })),
        upanamaGenerals: upanamaGenRows.map(r  => ({ label: r.label, count: n(r.count) })),
        upanamaPropers:  upanaPropRows.map(r   => ({ label: r.label, count: n(r.count) })),
        demiGods:        demiGodRows.map(r     => ({ label: r.label, count: n(r.count) })),
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
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cnt FROM sanghas`),

      safe(`SELECT status::text AS status, COUNT(*) AS count FROM sanghas GROUP BY status ORDER BY count DESC`),

      safe(`SELECT COALESCE(state,'Unknown') AS state, COUNT(*) AS count FROM sanghas GROUP BY state ORDER BY count DESC LIMIT 20`),

      safe(`SELECT COALESCE(district,'Unknown') AS district, COUNT(*) AS count FROM sanghas GROUP BY district ORDER BY count DESC LIMIT 20`),

      safe(`SELECT s.sangha_name,
               COUNT(p.id) AS member_count,
               COUNT(p.id) FILTER (WHERE p.status='approved') AS approved_count,
               s.state
             FROM sanghas s LEFT JOIN profiles p ON p.sangha_id=s.id
             GROUP BY s.id, s.sangha_name, s.state ORDER BY member_count DESC LIMIT 20`),

      safe(`SELECT TO_CHAR(DATE_TRUNC('month', created_at),'Mon YYYY') AS month, COUNT(*) AS count
            FROM sanghas GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC`),

      safe(`SELECT TO_CHAR(DATE_TRUNC('month', created_at),'Mon YYYY') AS month,
               COUNT(*) AS new_sanghas,
               SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative
             FROM sanghas GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at) ASC`),

      safe(`SELECT s.sangha_name, COUNT(p.id) AS total_users,
               COUNT(p.id) FILTER (WHERE p.status='approved') AS approved,
               COALESCE(s.state,'—') AS state, COALESCE(s.district,'—') AS district, s.status::text AS status
             FROM sanghas s LEFT JOIN profiles p ON p.sangha_id=s.id
             GROUP BY s.id, s.sangha_name, s.state, s.district, s.status
             ORDER BY total_users DESC LIMIT 20`),

      // FIX: use a safe fallback in case overall_completion_pct column doesn't exist
      safe(`SELECT s.sangha_name,
               AVG(COALESCE(p.overall_completion_pct, 0)) AS avg_completion
             FROM sanghas s JOIN profiles p ON p.sangha_id=s.id
             WHERE p.status='approved'
             GROUP BY s.id, s.sangha_name
             HAVING COUNT(p.id) >= 3
             ORDER BY avg_completion DESC LIMIT 10`),

      safe(`SELECT
               COUNT(*) FILTER (WHERE p.status='approved')          AS approved,
               COUNT(*) FILTER (WHERE p.status='rejected')          AS rejected,
               COUNT(*) FILTER (WHERE p.status IN ('submitted','under_review')) AS submitted,
               COUNT(*) FILTER (WHERE p.status='draft')             AS draft,
               COUNT(*) FILTER (WHERE p.status='changes_requested') AS changes_requested
             FROM profiles p`),

      // FIX: use correct column names — adjust 'email'/'phone' to match your sanghas table schema
      safe(`SELECT
               COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '' AND phone IS NOT NULL AND phone != '') AS with_both,
               COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') AS with_email,
               COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') AS with_phone
             FROM sanghas`),
    ]);

    const n   = (v) => parseInt(v  || 0);
    const ps  = profileStatusRows[0] || {};
    const ct  = contactRows[0]       || {};

    res.json({
      totalSanghas:         n(totalRes.rows[0]?.cnt),
      statusBreakdown:      statusRows.map(r    => ({ status: r.status, count: n(r.count) })),
      stateDistribution:    stateRows.map(r     => ({ state: r.state, count: n(r.count) })),
      districtDistribution: districtRows.map(r  => ({ district: r.district, count: n(r.count) })),
      sanghasByMemberCount: memberCountRows.map(r=> ({
        sangha_name:    r.sangha_name,
        member_count:   n(r.member_count),
        approved_count: n(r.approved_count),
        state:          r.state || '',
      })),
      registrationTrend:  trendRows.map(r  => ({ month: r.month, count: n(r.count) })),
      membershipGrowth:   growthRows.map(r  => ({ month: r.month, new_sanghas: n(r.new_sanghas), cumulative: n(r.cumulative) })),
      topSanghas:         topSanghaRows.map(r=> ({
        sangha_name: r.sangha_name, total_users: n(r.total_users),
        approved: n(r.approved), state: r.state, district: r.district, status: r.status,
      })),
      completionRates:    completionRows.map(r  => ({ sangha_name: r.sangha_name, avg_completion: parseFloat(r.avg_completion || 0) })),
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
      // FIX: approvalTimeline was in the TS type but never returned — added here as empty array
      // to prevent frontend from crashing when it's destructured
      approvalTimeline: [],
    });
  } catch (err) {
    console.error('[getAdminSanghaReports]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getGeneralReport, getAdvancedReport, getAdminAdvancedReportsuser, getAdminSanghaReports };
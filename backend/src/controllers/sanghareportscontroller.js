// Community-Application\backend\src\controllers\sanghareportscontroller.js
const pool = require('../config/db');

// ─── Helper: Get sangha ID from user ID ────────────────────────────────────
async function getSanghaId(userId) {
  console.log("👉 getSanghaId called with userId:", userId);
  const res = await pool.query(
    'SELECT id FROM sanghas WHERE sangha_auth_id=$1', [userId]
  );
  console.log("👉 DB result:", res.rows);
  const sanghaId = res.rows[0]?.id || null;
  console.log("👉 Extracted sanghaId:", sanghaId);
  return res.rows[0]?.id || null;
}

// ─── Helper: safe query (returns [] on error) ───────────────────────────────
async function safe(sql, params) {
  try {
    return (await pool.query(sql, params)).rows;
  } catch (e) {
    console.warn('[AdvancedReports] Query skipped:', e.message);
    return [];
  }
}

// ─── Helper: normalize education degree label ───────────────────────────────
function normalizeDegree(label) {
  if (!label) return 'Other';
  const l = label.toLowerCase().trim();
  if (l.includes('high school') || l.includes('10th') || l.includes('ssc') || l.includes('matriculation') || l === '10') return 'High School';
  if (l.includes('pre-university') || l.includes('pre university') || l.includes('puc') || l.includes('12th') || l.includes('hsc') || l.includes('intermediate') || l === '12') return 'Pre-University';
  if (l.includes('diploma') || l.includes('associate') || l.includes('polytechnic')) return 'Diploma & Associate Degree';
  if (l.includes('bachelor') || l.includes('undergraduate') || l.includes('b.e') || l.includes('b.tech') || l.includes('be ') || l.includes('btech') || l.includes('b.sc') || l.includes('bsc') || l.includes('bca') || l.includes('bba') || l.includes('b.com') || l.includes('ba ') || l.includes('ug') || (l.includes('graduate') && !l.includes('post') && !l.includes('under'))) return "Undergraduate / Bachelor's";
  if (l.includes('master') || l.includes('postgraduate') || l.includes('post graduate') || l.includes('m.e') || l.includes('m.tech') || l.includes('mtech') || l.includes('mba') || l.includes('m.sc') || l.includes('msc') || l.includes('mca') || l.includes('m.com') || l.includes('ma ') || l.includes('pg')) return "Postgraduate / Master's";
  if (l.includes('doctor') || l.includes('phd') || l.includes('ph.d') || l.includes('doctorate')) return 'Doctorate';
  if (l.includes('chartered') || l.includes('ca') || l.includes('cs ') || l.includes('icai') || l.includes('mbbs') || l.includes('md ') || l.includes('llb') || l.includes('llm') || l.includes('law') || l.includes('professional')) return 'Specialised Professional Degree';
  return 'Other';
}

// ─── Helper: build date range filter clause ─────────────────────────────────
function buildDateFilter(dateFrom, dateTo, existingParamCount = 1, dateField = 'p.submitted_at') {
  const clauses = [];
  const params  = [];
  if (dateFrom) {
    params.push(dateFrom);
    clauses.push(`${dateField} >= $${existingParamCount + params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    clauses.push(`${dateField} < ($${existingParamCount + params.length}::date + INTERVAL '1 day')`);
  }
  return { clause: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params };
}

// ════════════════════════════════════════════════════════════
// REPORTS & LOGS
// ════════════════════════════════════════════════════════════
const getReports = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='approved')                      AS approved_users,
         COUNT(*) FILTER (WHERE status='rejected')                      AS rejected_users,
         COUNT(*) FILTER (WHERE status IN ('submitted','under_review')) AS pending_users,
         COUNT(*) FILTER (WHERE status='changes_requested')             AS changes_requested,
         COUNT(*)                                                        AS total_users
       FROM profiles WHERE sangha_id = $1`,
      [sanghaId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const result = await pool.query(
      `SELECT
         p.id AS profile_id, u.id AS user_id, u.email, u.phone,
         pd.first_name, pd.last_name, p.status,
         p.submitted_at, p.reviewed_at, p.review_comment
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1
       ORDER BY COALESCE(p.submitted_at, p.created_at) DESC`,
      [sanghaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ENHANCED REPORTS
// ════════════════════════════════════════════════════════════
const getEnhancedReports = async (req, res) => {
   try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const rawFrom  = req.query.dateFrom;
    const rawTo    = req.query.dateTo;
    const dateFrom = (rawFrom && rawFrom !== 'null' && rawFrom !== 'undefined') ? rawFrom : null;
    const dateTo   = (rawTo   && rawTo   !== 'null' && rawTo   !== 'undefined') ? rawTo   : null;
    console.log("dateFrom:", dateFrom);
    console.log("dateTo:", dateTo);
    const df = buildDateFilter(dateFrom, dateTo, 1, 'created_at');
    

    const [currentCounts, trendData, dailyRegs] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'approved')                       AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')                       AS rejected,
           COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review'))   AS pending,
           COUNT(*) FILTER (WHERE status = 'changes_requested')              AS changes_requested,
           COUNT(*) FILTER (WHERE status = 'draft')                          AS draft,
           COUNT(*)                                                           AS total
         FROM profiles WHERE sangha_id = $1 ${df.clause}`,
        [sanghaId, ...df.params]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status='approved' AND reviewed_at >= NOW()-INTERVAL '30 days') AS approved_last30,
           COUNT(*) FILTER (WHERE status='approved' AND reviewed_at >= NOW()-INTERVAL '60 days'
                             AND reviewed_at < NOW()-INTERVAL '30 days')                         AS approved_prev30,
           COUNT(*) FILTER (WHERE submitted_at >= NOW()-INTERVAL '30 days')                      AS submitted_last30,
           COUNT(*) FILTER (WHERE submitted_at >= NOW()-INTERVAL '60 days'
                             AND submitted_at < NOW()-INTERVAL '30 days')                        AS submitted_prev30,
           COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days')                        AS total_last30,
           COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '60 days'
                             AND created_at < NOW()-INTERVAL '30 days')                          AS total_prev30
         FROM profiles WHERE sangha_id = $1`,
        [sanghaId]
      ),
      pool.query(
        `SELECT
           TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
           COUNT(*) AS registrations,
           COUNT(*) FILTER (WHERE status='approved') AS approvals,
           COUNT(*) FILTER (WHERE status='rejected') AS rejections
         FROM profiles
         WHERE sangha_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`,
        [sanghaId]
      ),
    ]);

    res.json({
      counts:             currentCounts.rows[0],
      trends:             trendData.rows[0],
      dailyRegistrations: dailyRegs.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// ADVANCED REPORTS
// ════════════════════════════════════════════════════════════
const getAdvancedReports = async (req, res) => {
  try {
    console.log("==== getAdvancedReports HIT ====");
    console.log("User:", req.user);
    console.log("Query Params:", req.query);
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const rawFrom  = req.query.dateFrom;
    const rawTo    = req.query.dateTo;
    const dateFrom = (rawFrom && rawFrom !== 'null' && rawFrom !== 'undefined') ? rawFrom : null;
    const dateTo   = (rawTo   && rawTo   !== 'null' && rawTo   !== 'undefined') ? rawTo   : null;

    const drSubmitted    = buildDateFilter(dateFrom, dateTo, 1, 'p.submitted_at');
    const drSubmittedP2  = buildDateFilter(dateFrom, dateTo, 1, 'p2.submitted_at');

    const approvedDateFilter  = `AND p.status='approved'${drSubmitted.clause}`;
    const allStatusDateFilter = drSubmitted.clause;

    const totalRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM profiles p WHERE sangha_id=$1 ${approvedDateFilter}`,
      [sanghaId, ...drSubmitted.params]
    );
    const totalApproved = parseInt(totalRes.rows[0]?.cnt || 0);

    const populationRes = await pool.query(
      `SELECT
         COUNT(DISTINCT p.id) AS family_count,
         COALESCE((
           SELECT COUNT(*)
           FROM family_members fm
           JOIN profiles p2 ON p2.id = fm.profile_id
           WHERE p2.sangha_id=$1
             AND p2.status='approved'
             ${drSubmittedP2.clause}
         ), 0) AS member_count
       FROM profiles p
       WHERE p.sangha_id=$1 ${approvedDateFilter}`,
      [sanghaId, ...drSubmitted.params]
    );
    const popRow = populationRes.rows[0] || {};
    const totalPopulation =
      parseInt(popRow.family_count || 0) + parseInt(popRow.member_count || 0);

    const statusGenderRows = await safe(`
      SELECT
        p.status AS label,
        COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
        COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
        COUNT(*) FILTER (WHERE pd.gender IS NOT NULL
          AND LOWER(pd.gender::text) NOT IN ('male','female'))     AS other,
        COUNT(*)                                                    AS total
      FROM profiles p
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      WHERE p.sangha_id=$1 ${allStatusDateFilter}
        AND p.status IN ('approved','rejected','changes_requested','submitted','draft')
      GROUP BY p.status
      ORDER BY total DESC
    `, [sanghaId, ...drSubmitted.params]);

    const [
      genderRows,
      memberGenderRows,
      ageRows,
      pdAgeRows,
      ageGenderRows,
      pdAgeGenderRows,
      famTypeRows,
      maritalRows,
      maritalGenderRows,
      degreeGenderRows,
      professionRows,
      professionGenderRows,
      studyingRows,
      studyingGenderRows,
      workingRows,
      workingGenderRows,
      cityRows,
      cityGenderRows,
      assetRows,
      assetGenderRows,
      employmentRows,
      employmentGenderRows,
      healthInsRows,
      lifeInsRows,
      termInsRows,
      konkaniInsRows,
      aadhaarRows,
      panRows,
      voterRows,
      landRows,
      dlRows,
      gotraRows,
      kuladevataRows,
      surnameRows,
      pravaraRows,
      upanamaGeneralRows,
      upanamaProperRows,
      demiGodRows,
      religiousSummaryRows,
      ancestralStatsRows,
    ] = await Promise.all([

      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE fm.gender IS NOT NULL AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN family_members fm ON fm.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) < 19) AS u18, COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 19 AND 35) AS y35, COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 36 AND 60) AS m60, COUNT(*) FILTER (WHERE fm.dob IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) > 60) AS o60 FROM profiles p JOIN family_members fm ON fm.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19) AS u18, COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 19 AND 35) AS y35, COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 36 AND 60) AS m60, COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) > 60) AS o60 FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT age_bucket AS label, COUNT(*) FILTER (WHERE LOWER(gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE gender IS NOT NULL AND LOWER(gender::text) NOT IN ('male','female')) AS other FROM (SELECT fm.gender, CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) < 19 THEN '0–18' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) <= 35 THEN '19–35' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) <= 60 THEN '36–60' ELSE '60+' END AS age_bucket FROM profiles p JOIN family_members fm ON fm.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND fm.dob IS NOT NULL) sub GROUP BY age_bucket ORDER BY MIN(CASE age_bucket WHEN '0–18' THEN 1 WHEN '19–35' THEN 2 WHEN '36–60' THEN 3 ELSE 4 END)`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT age_bucket AS label, COUNT(*) FILTER (WHERE LOWER(gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE gender IS NOT NULL AND LOWER(gender::text) NOT IN ('male','female')) AS other FROM (SELECT pd.gender, CASE WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19 THEN '0–18' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) <= 35 THEN '19–35' WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) <= 60 THEN '36–60' ELSE '60+' END AS age_bucket FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND pd.date_of_birth IS NOT NULL) sub GROUP BY age_bucket ORDER BY MIN(CASE age_bucket WHEN '0–18' THEN 1 WHEN '19–35' THEN 2 WHEN '36–60' THEN 3 ELSE 4 END)`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear, COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%') AS joint FROM profiles p JOIN family_info fi ON fi.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE pd.is_married = true) AS married, COUNT(*) FILTER (WHERE pd.is_married = false) AS single FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT CASE WHEN pd.is_married = true THEN 'Married' ELSE 'Single' END AS label, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND pd.is_married IS NOT NULL GROUP BY pd.is_married ORDER BY pd.is_married DESC`, [sanghaId, ...drSubmitted.params]),
      safe(`
  SELECT
    mes.degree_type AS label,
    COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
    COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
    COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
  FROM profiles p
  JOIN member_education me   ON me.profile_id = p.id
  JOIN member_educations mes ON mes.member_education_id = me.id
  JOIN personal_details pd   ON pd.profile_id = p.id
  WHERE p.sangha_id=$1 ${approvedDateFilter}
    AND mes.degree_type IS NOT NULL
    AND TRIM(mes.degree_type) != ''
  GROUP BY mes.degree_type
  ORDER BY (COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female')) DESC
  LIMIT 50
`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT me.profession_type::text AS label, COUNT(*) AS count FROM profiles p JOIN member_education me ON me.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY count DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT me.profession_type::text AS label, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN member_education me ON me.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY (COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female')) DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE me.is_currently_studying = true) AS yes_count, COUNT(*) FILTER (WHERE me.is_currently_studying = false) AS no_count FROM profiles p JOIN member_education me ON me.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE me.is_currently_studying = true AND LOWER(pd.gender::text) = 'male') AS male_yes, COUNT(*) FILTER (WHERE me.is_currently_studying = true AND LOWER(pd.gender::text) = 'female') AS female_yes, COUNT(*) FILTER (WHERE me.is_currently_studying = true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes, COUNT(*) FILTER (WHERE me.is_currently_studying = false AND LOWER(pd.gender::text) = 'male') AS male_no, COUNT(*) FILTER (WHERE me.is_currently_studying = false AND LOWER(pd.gender::text) = 'female') AS female_no, COUNT(*) FILTER (WHERE me.is_currently_studying = false AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no FROM profiles p JOIN member_education me ON me.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE me.is_currently_working = true) AS yes_count, COUNT(*) FILTER (WHERE me.is_currently_working = false) AS no_count FROM profiles p JOIN member_education me ON me.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.is_currently_working IS NOT NULL`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE me.is_currently_working = true AND LOWER(pd.gender::text) = 'male') AS male_yes, COUNT(*) FILTER (WHERE me.is_currently_working = true AND LOWER(pd.gender::text) = 'female') AS female_yes, COUNT(*) FILTER (WHERE me.is_currently_working = true AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_yes, COUNT(*) FILTER (WHERE me.is_currently_working = false AND LOWER(pd.gender::text) = 'male') AS male_no, COUNT(*) FILTER (WHERE me.is_currently_working = false AND LOWER(pd.gender::text) = 'female') AS female_no, COUNT(*) FILTER (WHERE me.is_currently_working = false AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_no FROM profiles p JOIN member_education me ON me.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.is_currently_working IS NOT NULL`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT TRIM(a.city) AS city, COUNT(DISTINCT p.id) AS count FROM profiles p JOIN addresses a ON a.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND a.city IS NOT NULL AND TRIM(a.city) != '' GROUP BY TRIM(a.city) ORDER BY count DESC LIMIT 100`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT TRIM(a.city) AS city, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN addresses a ON a.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND a.city IS NOT NULL AND TRIM(a.city) != '' GROUP BY TRIM(a.city) ORDER BY (COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female')) DESC LIMIT 100`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ed.fac_own_house = true) AS own_house, COUNT(*) FILTER (WHERE ed.fac_agricultural_land = true) AS agri_land, COUNT(*) FILTER (WHERE ed.fac_car = true) AS four_wheeler, COUNT(*) FILTER (WHERE ed.fac_two_wheeler = true) AS two_wheeler, COUNT(*) FILTER (WHERE ed.fac_rented_house = true) AS renting FROM profiles p JOIN economic_details ed ON ed.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT asset_label AS label, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM (SELECT p.id AS pid, pd.gender, UNNEST(ARRAY[CASE WHEN ed.fac_own_house=true THEN 'Own House' END, CASE WHEN ed.fac_agricultural_land=true THEN 'Agricultural Land' END, CASE WHEN ed.fac_car=true THEN '4-Wheeler' END, CASE WHEN ed.fac_two_wheeler=true THEN '2-Wheeler' END, CASE WHEN ed.fac_rented_house=true THEN 'Renting' END]) AS asset_label FROM profiles p JOIN economic_details ed ON ed.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}) sub WHERE asset_label IS NOT NULL GROUP BY asset_label ORDER BY asset_label`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT me.profession_type::text AS label, COUNT(*) AS count FROM profiles p JOIN member_education me ON me.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY count DESC`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT me.profession_type::text AS label, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') AS male, COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female, COUNT(*) FILTER (WHERE pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other FROM profiles p JOIN member_education me ON me.profile_id = p.id JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND me.profession_type IS NOT NULL GROUP BY me.profession_type ORDER BY (COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male') + COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female')) DESC`, [sanghaId, ...drSubmitted.params]),

      // Insurance (4 types)
     // ── Replace the 4 insurance safe() calls ──────────────────────────────────
// ── HEALTH INSURANCE ──────────────────────────────────────────────────────
safe(`
  SELECT
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['yes']::text[])                                                                                          AS yes_count,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['no']::text[])                                                                                           AS no_count,
    COUNT(*) FILTER (WHERE mi.health_coverage IS NULL OR cardinality(mi.health_coverage::text[]) = 0)                                                                    AS null_count,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'male')                                                       AS male_yes,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'female')                                                     AS female_yes,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['yes']::text[] AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))              AS other_yes,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'male')                                                       AS male_no,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'female')                                                     AS female_no,
    COUNT(*) FILTER (WHERE mi.health_coverage::text[] @> ARRAY['no']::text[]  AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))              AS other_no,
    COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'male')                              AS male_unknown,
    COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'female')                            AS female_unknown,
    COUNT(*) FILTER (WHERE (mi.health_coverage IS NULL OR cardinality(mi.health_coverage::text[]) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
  FROM profiles p
  JOIN member_insurance mi ON mi.profile_id = p.id
  JOIN personal_details pd ON pd.profile_id = p.id
  WHERE p.sangha_id=$1 ${approvedDateFilter}
`, [sanghaId, ...drSubmitted.params]),

// ── LIFE INSURANCE ────────────────────────────────────────────────────────
safe(`
  SELECT
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['yes']::text[])                                                                                            AS yes_count,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['no']::text[])                                                                                             AS no_count,
    COUNT(*) FILTER (WHERE mi.life_coverage IS NULL OR cardinality(mi.life_coverage::text[]) = 0)                                                                        AS null_count,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'male')                                                         AS male_yes,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'female')                                                       AS female_yes,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['yes']::text[] AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))                AS other_yes,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'male')                                                         AS male_no,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'female')                                                       AS female_no,
    COUNT(*) FILTER (WHERE mi.life_coverage::text[] @> ARRAY['no']::text[]  AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))                AS other_no,
    COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'male')                                  AS male_unknown,
    COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'female')                                AS female_unknown,
    COUNT(*) FILTER (WHERE (mi.life_coverage IS NULL OR cardinality(mi.life_coverage::text[]) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
  FROM profiles p
  JOIN member_insurance mi ON mi.profile_id = p.id
  JOIN personal_details pd ON pd.profile_id = p.id
  WHERE p.sangha_id=$1 ${approvedDateFilter}
`, [sanghaId, ...drSubmitted.params]),

// ── TERM INSURANCE ────────────────────────────────────────────────────────
safe(`
  SELECT
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['yes']::text[])                                                                                            AS yes_count,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['no']::text[])                                                                                             AS no_count,
    COUNT(*) FILTER (WHERE mi.term_coverage IS NULL OR cardinality(mi.term_coverage::text[]) = 0)                                                                        AS null_count,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'male')                                                         AS male_yes,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'female')                                                       AS female_yes,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['yes']::text[] AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))                AS other_yes,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'male')                                                         AS male_no,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'female')                                                       AS female_no,
    COUNT(*) FILTER (WHERE mi.term_coverage::text[] @> ARRAY['no']::text[]  AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))                AS other_no,
    COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'male')                                  AS male_unknown,
    COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'female')                                AS female_unknown,
    COUNT(*) FILTER (WHERE (mi.term_coverage IS NULL OR cardinality(mi.term_coverage::text[]) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
  FROM profiles p
  JOIN member_insurance mi ON mi.profile_id = p.id
  JOIN personal_details pd ON pd.profile_id = p.id
  WHERE p.sangha_id=$1 ${approvedDateFilter}
`, [sanghaId, ...drSubmitted.params]),

// ── KONKANI CARD INSURANCE ────────────────────────────────────────────────
safe(`
  SELECT
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['yes']::text[])                                                                                     AS yes_count,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['no']::text[])                                                                                      AS no_count,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage::text[]) = 0)                                                         AS null_count,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'male')                                                  AS male_yes,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['yes']::text[] AND LOWER(pd.gender::text) = 'female')                                                AS female_yes,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['yes']::text[] AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))         AS other_yes,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'male')                                                  AS male_no,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['no']::text[]  AND LOWER(pd.gender::text) = 'female')                                                AS female_no,
    COUNT(*) FILTER (WHERE mi.konkani_card_coverage::text[] @> ARRAY['no']::text[]  AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female'))         AS other_no,
    COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'male')                   AS male_unknown,
    COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage::text[]) = 0) AND LOWER(pd.gender::text) = 'female')                 AS female_unknown,
    COUNT(*) FILTER (WHERE (mi.konkani_card_coverage IS NULL OR cardinality(mi.konkani_card_coverage::text[]) = 0) AND pd.gender IS NOT NULL AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other_unknown
  FROM profiles p
  JOIN member_insurance mi ON mi.profile_id = p.id
  JOIN personal_details pd ON pd.profile_id = p.id
  WHERE p.sangha_id=$1 ${approvedDateFilter}
`, [sanghaId, ...drSubmitted.params]),




      // ── ADD THESE 5 DOCUMENT QUERIES HERE ────────────────────────────────
      safe(`SELECT
        COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='yes')                                                        AS yes_count,
        COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text)='no')                                                         AS no_count,
        COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) NOT IN ('yes','no') OR md.aadhaar_coverage IS NULL)           AS unknown_count
      FROM profiles p JOIN member_documents md ON md.profile_id = p.id
      WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),

      safe(`SELECT
        COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='yes')                                                            AS yes_count,
        COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text)='no')                                                             AS no_count,
        COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) NOT IN ('yes','no') OR md.pan_coverage IS NULL)                   AS unknown_count
      FROM profiles p JOIN member_documents md ON md.profile_id = p.id
      WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),

      safe(`SELECT
        COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='yes')                                                       AS yes_count,
        COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text)='no')                                                        AS no_count,
        COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) NOT IN ('yes','no') OR md.voter_id_coverage IS NULL)         AS unknown_count
      FROM profiles p JOIN member_documents md ON md.profile_id = p.id
      WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),

      safe(`SELECT
        COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='yes')                                                       AS yes_count,
        COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text)='no')                                                        AS no_count,
        COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) NOT IN ('yes','no') OR md.land_doc_coverage IS NULL)         AS unknown_count
      FROM profiles p JOIN member_documents md ON md.profile_id = p.id
      WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),

      safe(`SELECT
        COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='yes')                                                             AS yes_count,
        COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text)='no')                                                              AS no_count,
        COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) NOT IN ('yes','no') OR md.dl_coverage IS NULL)                     AS unknown_count
      FROM profiles p JOIN member_documents md ON md.profile_id = p.id
      WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      // ─────────────────────────────────────────────────────────────────────

      

      // Religious
      safe(`SELECT TRIM(rd.gotra) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND rd.gotra IS NOT NULL AND TRIM(rd.gotra) != '' GROUP BY TRIM(rd.gotra) ORDER BY count DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COALESCE(NULLIF(TRIM(rd.kuladevata_other),''), TRIM(rd.kuladevata)) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND (rd.kuladevata IS NOT NULL OR rd.kuladevata_other IS NOT NULL) AND COALESCE(NULLIF(TRIM(rd.kuladevata_other),''), TRIM(rd.kuladevata)) != '' GROUP BY 1 ORDER BY count DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use)) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id LEFT JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use)) IS NOT NULL AND COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use)) != '' GROUP BY 1 ORDER BY count DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT TRIM(rd.pravara) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND rd.pravara IS NOT NULL AND TRIM(rd.pravara) != '' GROUP BY TRIM(rd.pravara) ORDER BY count DESC LIMIT 10`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT TRIM(rd.upanama_general) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND rd.upanama_general IS NOT NULL AND TRIM(rd.upanama_general) != '' GROUP BY TRIM(rd.upanama_general) ORDER BY count DESC LIMIT 20`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT TRIM(rd.upanama_proper) AS label, COUNT(*) AS count FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND rd.upanama_proper IS NOT NULL AND TRIM(rd.upanama_proper) != '' GROUP BY TRIM(rd.upanama_proper) ORDER BY count DESC LIMIT 20`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT label, COUNT(*) AS count FROM (SELECT UNNEST(rd.demi_gods::text[]) AS label FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND rd.demi_gods IS NOT NULL AND cardinality(rd.demi_gods::text[]) > 0) sub WHERE label IS NOT NULL AND TRIM(label) != '' GROUP BY label ORDER BY count DESC`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(DISTINCT rd.gotra) FILTER (WHERE rd.gotra IS NOT NULL AND TRIM(rd.gotra) != '') AS unique_gotras, COUNT(DISTINCT COALESCE(NULLIF(TRIM(rd.kuladevata_other),''), TRIM(rd.kuladevata))) FILTER (WHERE COALESCE(NULLIF(TRIM(rd.kuladevata_other),''), TRIM(rd.kuladevata)) IS NOT NULL AND COALESCE(NULLIF(TRIM(rd.kuladevata_other),''), TRIM(rd.kuladevata)) != '') AS unique_kuladevatas, COUNT(DISTINCT COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use))) FILTER (WHERE COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use)) IS NOT NULL AND COALESCE(NULLIF(TRIM(rd.surname_in_use),''), TRIM(pd.surname_in_use)) != '') AS unique_surnames, COUNT(*) FILTER (WHERE LOWER(rd.ancestral_challenge) IN ('yes','true')) AS ancestral_challenges FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id LEFT JOIN personal_details pd ON pd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
      safe(`SELECT COUNT(*) FILTER (WHERE LOWER(rd.ancestral_challenge) IN ('yes','true')) AS with_challenge, COUNT(*) FILTER (WHERE LOWER(rd.ancestral_challenge) IN ('no','false') OR rd.ancestral_challenge IS NULL) AS without_challenge, COUNT(*) FILTER (WHERE rd.priest_name IS NOT NULL AND TRIM(rd.priest_name) != '') AS with_priest, COUNT(*) FILTER (WHERE rd.demi_gods IS NOT NULL AND cardinality(rd.demi_gods::text[]) > 0) AS with_demi_gods, COUNT(*) FILTER (WHERE rd.upanama_general IS NOT NULL AND TRIM(rd.upanama_general) != '') AS with_upanama, COUNT(*) AS total FROM profiles p JOIN religious_details rd ON rd.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter}`, [sanghaId, ...drSubmitted.params]),
    ]);

    const fmAge = ageRows[0] || {};
    const pdAge = pdAgeRows[0] || {};
    const hasFmAge = (parseInt(fmAge.u18||0)+parseInt(fmAge.y35||0)+parseInt(fmAge.m60||0)+parseInt(fmAge.o60||0)) > 0;
    const ageSource = hasFmAge ? fmAge : pdAge;
    const hasFmAgeGender = ageGenderRows.length > 0 && ageGenderRows.some(r => parseInt(r.male||0)+parseInt(r.female||0) > 0);
    const ageGenderSource = hasFmAgeGender ? ageGenderRows : pdAgeGenderRows;
    const fmG = memberGenderRows[0] || {};
    const pdG = genderRows[0] || {};
    const hasFmGender = parseInt(fmG.male||0)+parseInt(fmG.female||0)+parseInt(fmG.other||0) > 0;
    const gSrc = hasFmGender ? fmG : pdG;
    const ft  = famTypeRows[0]  || {};
    const mar = maritalRows[0]  || {};
    const as  = assetRows[0]    || {};
    const st  = studyingRows[0] || {};
    const stG = studyingGenderRows[0] || {};
    const wk  = workingRows[0]  || {};
    const wkG = workingGenderRows[0]  || {};
    const healthIns  = healthInsRows[0]  || {};
    const lifeIns    = lifeInsRows[0]    || {};
    const termIns    = termInsRows[0]    || {};
    const konkaniIns = konkaniInsRows[0] || {};
    const aadhaar = aadhaarRows[0] || {};
    const pan     = panRows[0]     || {};
    const voter   = voterRows[0]   || {};
    const land    = landRows[0]    || {};
    const dl      = dlRows[0]      || {};

    const DEGREE_ORDER = ['High School','Pre-University','Diploma & Associate Degree',"Undergraduate / Bachelor's","Postgraduate / Master's",'Doctorate','Specialised Professional Degree'];
    const degreeMap = {};
    for (const row of degreeGenderRows) {
      const normalized = normalizeDegree(row.label);
      if (!degreeMap[normalized]) degreeMap[normalized] = { label: normalized, male: 0, female: 0, other: 0 };
      degreeMap[normalized].male   += parseInt(row.male   || 0);
      degreeMap[normalized].female += parseInt(row.female || 0);
      degreeMap[normalized].other  += parseInt(row.other  || 0);
    }
    const normalizedDegreesGender = DEGREE_ORDER.map(d => degreeMap[d] || { label: d, male: 0, female: 0, other: 0 });

    const familyIncomeSlabs = await (async () => {
      try {
        const rows = await pool.query(`SELECT ed.family_income::text AS label, COUNT(*) AS count FROM profiles p JOIN economic_details ed ON ed.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND ed.family_income IS NOT NULL GROUP BY ed.family_income ORDER BY count DESC`, [sanghaId, ...drSubmitted.params]);
        return rows.rows.map(r => ({ label: r.label, count: parseInt(r.count || 0) }));
      } catch (e) { console.warn('[AdvancedReports] familyIncomeSlabs skipped:', e.message); return []; }
    })();

    const relSum  = religiousSummaryRows[0] || {};
    const relStat = ancestralStatsRows[0]   || {};
    const commonRelRes = await safe(`SELECT COUNT(*) AS cnt FROM profiles p JOIN family_history fh ON fh.profile_id = p.id WHERE p.sangha_id=$1 ${approvedDateFilter} AND fh.common_relative_names IS NOT NULL AND TRIM(fh.common_relative_names) != ''`, [sanghaId, ...drSubmitted.params]);
    const withCommonRelatives = parseInt(commonRelRes[0]?.cnt || 0);

    res.json({
      totalApproved,
      totalPopulation,
      appliedDateRange: { dateFrom: dateFrom || null, dateTo: dateTo || null },
      statusBreakdown: statusGenderRows.map(r => ({ status: r.label, count: parseInt(r.total || 0) })),
      statusGenderBreakdown: statusGenderRows.map(r => ({ status: r.label, male: parseInt(r.male||0), female: parseInt(r.female||0), other: parseInt(r.other||0) })),
      demographics: {
        gender: { male: parseInt(gSrc.male||0), female: parseInt(gSrc.female||0), other: parseInt(gSrc.other||0) },
        ageGroups: [{ label:'0–18',count:parseInt(ageSource.u18||0) },{ label:'19–35',count:parseInt(ageSource.y35||0) },{ label:'36–60',count:parseInt(ageSource.m60||0) },{ label:'60+',count:parseInt(ageSource.o60||0) }],
        ageGroupsGender: ageGenderSource.map(r => ({ label:r.label, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
        familyType: { nuclear: parseInt(ft.nuclear||0), joint: parseInt(ft.joint||0) },
        maritalStatus: [{ label:'Married',count:parseInt(mar.married||0) },{ label:'Single',count:parseInt(mar.single||0) }].filter(m=>m.count>0),
        maritalStatusGender: maritalGenderRows.map(r => ({ label:r.label, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
      },
      education: {
        degrees: normalizedDegreesGender.map(d => ({ label: d.label, count: d.male+d.female+d.other })),
        degreesGender: normalizedDegreesGender,
        studying: { yes:parseInt(st.yes_count||0),no:parseInt(st.no_count||0),maleYes:parseInt(stG.male_yes||0),femaleYes:parseInt(stG.female_yes||0),otherYes:parseInt(stG.other_yes||0),maleNo:parseInt(stG.male_no||0),femaleNo:parseInt(stG.female_no||0),otherNo:parseInt(stG.other_no||0) },
        working: { yes:parseInt(wk.yes_count||0),no:parseInt(wk.no_count||0),maleYes:parseInt(wkG.male_yes||0),femaleYes:parseInt(wkG.female_yes||0),otherYes:parseInt(wkG.other_yes||0),maleNo:parseInt(wkG.male_no||0),femaleNo:parseInt(wkG.female_no||0),otherNo:parseInt(wkG.other_no||0) },
        professions: professionRows.map(r => ({ label:r.label, count:parseInt(r.count||0) })),
        professionsGender: professionGenderRows.map(r => ({ label:r.label, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
      },
      economic: {
        incomeSlabs: familyIncomeSlabs,
        assets: [
          { label:'Own House',owned:parseInt(as.own_house||0),total:parseInt(as.total||0) },
          { label:'Agricultural Land',owned:parseInt(as.agri_land||0),total:parseInt(as.total||0) },
          { label:'4-Wheeler',owned:parseInt(as.four_wheeler||0),total:parseInt(as.total||0) },
          { label:'2-Wheeler',owned:parseInt(as.two_wheeler||0),total:parseInt(as.total||0) },
          { label:'Renting',owned:parseInt(as.renting||0),total:parseInt(as.total||0) },
        ],
        assetsGender: assetGenderRows.map(r => ({ label:r.label, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
        employment: employmentRows.map(r => ({ label:r.label, count:parseInt(r.count||0) })),
        employmentGender: employmentGenderRows.map(r => ({ label:r.label, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
      },
      insurance: [
  {
    label: 'Health Insurance',
    yes: parseInt(healthIns.yes_count || 0), no: parseInt(healthIns.no_count || 0), unknown: parseInt(healthIns.null_count || 0),
    maleYes: parseInt(healthIns.male_yes || 0), femaleYes: parseInt(healthIns.female_yes || 0), otherYes: parseInt(healthIns.other_yes || 0),
    maleNo:  parseInt(healthIns.male_no  || 0), femaleNo:  parseInt(healthIns.female_no  || 0), otherNo:  parseInt(healthIns.other_no  || 0),
    maleUnknown: parseInt(healthIns.male_unknown || 0), femaleUnknown: parseInt(healthIns.female_unknown || 0), otherUnknown: parseInt(healthIns.other_unknown || 0),
  },
  {
    label: 'Life Insurance',
    yes: parseInt(lifeIns.yes_count || 0), no: parseInt(lifeIns.no_count || 0), unknown: parseInt(lifeIns.null_count || 0),
    maleYes: parseInt(lifeIns.male_yes || 0), femaleYes: parseInt(lifeIns.female_yes || 0), otherYes: parseInt(lifeIns.other_yes || 0),
    maleNo:  parseInt(lifeIns.male_no  || 0), femaleNo:  parseInt(lifeIns.female_no  || 0), otherNo:  parseInt(lifeIns.other_no  || 0),
    maleUnknown: parseInt(lifeIns.male_unknown || 0), femaleUnknown: parseInt(lifeIns.female_unknown || 0), otherUnknown: parseInt(lifeIns.other_unknown || 0),
  },
  {
    label: 'Term Insurance',
    yes: parseInt(termIns.yes_count || 0), no: parseInt(termIns.no_count || 0), unknown: parseInt(termIns.null_count || 0),
    maleYes: parseInt(termIns.male_yes || 0), femaleYes: parseInt(termIns.female_yes || 0), otherYes: parseInt(termIns.other_yes || 0),
    maleNo:  parseInt(termIns.male_no  || 0), femaleNo:  parseInt(termIns.female_no  || 0), otherNo:  parseInt(termIns.other_no  || 0),
    maleUnknown: parseInt(termIns.male_unknown || 0), femaleUnknown: parseInt(termIns.female_unknown || 0), otherUnknown: parseInt(termIns.other_unknown || 0),
  },
  {
    label: 'Konkani Card',
    yes: parseInt(konkaniIns.yes_count || 0), no: parseInt(konkaniIns.no_count || 0), unknown: parseInt(konkaniIns.null_count || 0),
    maleYes: parseInt(konkaniIns.male_yes || 0), femaleYes: parseInt(konkaniIns.female_yes || 0), otherYes: parseInt(konkaniIns.other_yes || 0),
    maleNo:  parseInt(konkaniIns.male_no  || 0), femaleNo:  parseInt(konkaniIns.female_no  || 0), otherNo:  parseInt(konkaniIns.other_no  || 0),
    maleUnknown: parseInt(konkaniIns.male_unknown || 0), femaleUnknown: parseInt(konkaniIns.female_unknown || 0), otherUnknown: parseInt(konkaniIns.other_unknown || 0),

  },
],
      
      documents: [
        { label:'Aadhaar',yes:parseInt(aadhaar.yes_count||0),no:parseInt(aadhaar.no_count||0),unknown:parseInt(aadhaar.unknown_count||0) },
        { label:'PAN Card',yes:parseInt(pan.yes_count||0),no:parseInt(pan.no_count||0),unknown:parseInt(pan.unknown_count||0) },
        { label:'Voter ID',yes:parseInt(voter.yes_count||0),no:parseInt(voter.no_count||0),unknown:parseInt(voter.unknown_count||0) },
        { label:'Land Docs',yes:parseInt(land.yes_count||0),no:parseInt(land.no_count||0),unknown:parseInt(land.unknown_count||0) },
        { label:'DL',yes:parseInt(dl.yes_count||0),no:parseInt(dl.no_count||0),unknown:parseInt(dl.unknown_count||0) },
      ],
      geographic: cityRows.map(r => ({ city:r.city, count:parseInt(r.count||0) })),
      geographicGender: cityGenderRows.map(r => ({ city:r.city, male:parseInt(r.male||0), female:parseInt(r.female||0), other:parseInt(r.other||0) })),
      religious: {
        gotras:          gotraRows.map(r    => ({ label:r.label, count:parseInt(r.count||0) })),
        kuladevatas:     kuladevataRows.map(r => ({ label:r.label, count:parseInt(r.count||0) })),
        surnames:        surnameRows.map(r   => ({ label:r.label, count:parseInt(r.count||0) })),
        pravaras:        pravaraRows.map(r   => ({ label:r.label, count:parseInt(r.count||0) })),
        upanamaGenerals: upanamaGeneralRows.map(r => ({ label:r.label, count:parseInt(r.count||0) })),
        upanamaPropers:  upanamaProperRows.map(r  => ({ label:r.label, count:parseInt(r.count||0) })),
        demiGods:        demiGodRows.map(r        => ({ label:r.label, count:parseInt(r.count||0) })),
        summary: { uniqueGotras:parseInt(relSum.unique_gotras||0), uniqueKuladevatas:parseInt(relSum.unique_kuladevatas||0), uniqueSurnames:parseInt(relSum.unique_surnames||0), ancestralChallenges:parseInt(relSum.ancestral_challenges||0) },
        ancestralStats: { withChallenge:parseInt(relStat.with_challenge||0), withoutChallenge:parseInt(relStat.without_challenge||0), withPriest:parseInt(relStat.with_priest||0), withDemiGods:parseInt(relStat.with_demi_gods||0), withUpanama:parseInt(relStat.with_upanama||0), withCommonRelatives },
      },
    });
  } catch (err) {
    console.error('[getAdvancedReports]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// EXPORT DATA
// ════════════════════════════════════════════════════════════
const getExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { category, filter, dateFrom, dateTo } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const BASE_SELECT = `
      SELECT DISTINCT
        TRIM(CONCAT(COALESCE(pd.first_name,''),' ',COALESCE(pd.middle_name||' ',''),COALESCE(pd.last_name,''))) AS "Full Name",
        u.email AS "Email", u.phone AS "Phone", p.status AS "Status",
        TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At",
        TO_CHAR(p.reviewed_at,'DD-Mon-YYYY')  AS "Reviewed At"
    `;
    let extraCols = '', joinClause = '';
    const baseCond = `WHERE p.sangha_id = $1`;
    let params = [sanghaId];
    const df = buildDateFilter(dateFrom, dateTo, params.length, 'p.submitted_at');
    if (df.clause) params = [...params, ...df.params];
    const dateClause = df.clause;
    let statusCond = `AND p.status = 'approved'`;
    const paramOffset = params.length;

    switch (category) {
      case 'status': {
        const f = (filter||'approved').toLowerCase();
        if (f==='pending'||f==='submitted') statusCond=`AND p.status IN ('submitted','under_review')`;
        else if (f==='changes'||f==='changes_requested') statusCond=`AND p.status='changes_requested'`;
        else if (f==='rejected') statusCond=`AND p.status='rejected'`;
        else if (f==='draft') statusCond=`AND p.status='draft'`;
        else if (f==='all'||f==='') statusCond='';
        else { statusCond=`AND p.status=$${paramOffset+1}`; params.push(f); }
        break;
      }
      case 'city': { joinClause=`JOIN addresses a ON a.profile_id=p.id`; extraCols=`, TRIM(a.city) AS "City",a.district AS "District",a.state AS "State",a.pincode AS "Pincode"`; if(filter){statusCond+=` AND LOWER(TRIM(a.city))=LOWER($${paramOffset+1})`;params.push(filter);} break; }
      case 'gender': { extraCols=`, pd.gender::text AS "Gender",pd.date_of_birth AS "Date of Birth"`; if(filter){statusCond+=` AND LOWER(pd.gender::text)=LOWER($${paramOffset+1})`;params.push(filter);} break; }
      case 'age_group': {
        extraCols=`, pd.gender::text AS "Gender",pd.date_of_birth AS "Date of Birth",EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth))::int AS "Age"`;
        statusCond+=` AND pd.date_of_birth IS NOT NULL`;
        const rangeMap={'0–18':`EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth))<19`,'19–35':`EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth)) BETWEEN 19 AND 35`,'36–60':`EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth)) BETWEEN 36 AND 60`,'60+':`EXTRACT(YEAR FROM AGE(CURRENT_DATE,pd.date_of_birth))>60`};
        if(filter&&rangeMap[filter])statusCond+=` AND ${rangeMap[filter]}`; break;
      }
      case 'income': { joinClause=`JOIN economic_details ed ON ed.profile_id=p.id`; extraCols=`, ed.self_income::text AS "Self Income (Individual)",ed.family_income::text AS "Family Income (Annual)"`; if(filter){statusCond+=` AND ed.family_income::text=$${paramOffset+1}`;params.push(filter);} break; }
      case 'asset': { joinClause=`JOIN economic_details ed ON ed.profile_id=p.id`; extraCols=`, ed.self_income::text AS "Self Income",ed.family_income::text AS "Family Income",ed.fac_own_house AS "Owns House",ed.fac_agricultural_land AS "Has Agricultural Land",ed.fac_car AS "Has 4-Wheeler",ed.fac_two_wheeler AS "Has 2-Wheeler",ed.fac_rented_house AS "Renting"`; const assetMap={'Own House':`ed.fac_own_house=true`,'Agricultural Land':`ed.fac_agricultural_land=true`,'4-Wheeler':`ed.fac_car=true`,'2-Wheeler':`ed.fac_two_wheeler=true`,'Renting':`ed.fac_rented_house=true`}; if(filter&&assetMap[filter])statusCond+=` AND ${assetMap[filter]}`; break; }
      case 'insurance': { joinClause=`JOIN member_insurance mi ON mi.profile_id=p.id`; const insColMap={'Health':'mi.health_coverage','Life':'mi.life_coverage','Term':'mi.term_coverage','Konkani Card':'mi.konkani_card_coverage'}; const col=insColMap[filter]; if(col){extraCols=`, mi.member_name AS "Member Name",mi.member_relation AS "Relation",array_to_string(${col}::text[],', ') AS "${filter} Coverage"`;statusCond+=` AND ${col}::text[] IS NOT NULL AND cardinality(${col}::text[])>0 AND NOT (${col}::text[] @> ARRAY['none']::text[])`;}else{extraCols=`, mi.member_name AS "Member Name",mi.member_relation AS "Relation",array_to_string(mi.health_coverage::text[],', ') AS "Health Coverage",array_to_string(mi.life_coverage::text[],', ') AS "Life Coverage",array_to_string(mi.term_coverage::text[],', ') AS "Term Coverage",array_to_string(mi.konkani_card_coverage::text[],', ') AS "Konkani Card Coverage"`;} break; }
      case 'document': { joinClause=`JOIN member_documents md ON md.profile_id=p.id`; const docColMap={'Aadhaar':'md.aadhaar_coverage','PAN Card':'md.pan_coverage','Voter ID':'md.voter_id_coverage','Land Docs':'md.land_doc_coverage','DL':'md.dl_coverage'}; const col=docColMap[filter]; if(col){extraCols=`, md.member_name AS "Member Name",md.member_relation AS "Relation",${col}::text AS "${filter} Status"`;statusCond+=` AND LOWER(${col}::text)='yes'`;}else{extraCols=`, md.member_name AS "Member Name",md.member_relation AS "Relation",md.aadhaar_coverage::text AS "Aadhaar",md.pan_coverage::text AS "PAN Card",md.voter_id_coverage::text AS "Voter ID",md.land_doc_coverage::text AS "Land Docs",md.dl_coverage::text AS "DL"`;} break; }
      case 'education': { joinClause=`JOIN member_education me ON me.profile_id=p.id`; extraCols=`, me.member_name AS "Member Name",me.member_relation AS "Relation",me.highest_education AS "Education Level",me.profession_type::text AS "Profession",me.is_currently_studying AS "Currently Studying",me.is_currently_working AS "Currently Working"`; if(filter){statusCond+=` AND LOWER(me.highest_education) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);} break; }
      case 'occupation': { joinClause=`JOIN member_education me ON me.profile_id=p.id`; extraCols=`, me.member_name AS "Member Name",me.member_relation AS "Relation",me.profession_type::text AS "Profession",me.highest_education AS "Education Level",me.is_currently_working AS "Currently Working"`; if(filter){statusCond+=` AND LOWER(me.profession_type::text) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);} break; }
      case 'family_type': { joinClause=`JOIN family_info fi ON fi.profile_id=p.id`; extraCols=`, fi.family_type::text AS "Family Type"`; if(filter){statusCond+=` AND LOWER(fi.family_type::text) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);} break; }
      case 'marital': { extraCols=`, pd.is_married AS "Is Married",pd.date_of_birth AS "Date of Birth"`; const f=(filter||'').toLowerCase(); if(f==='married')statusCond+=` AND pd.is_married=true`; else if(f==='single')statusCond+=` AND pd.is_married=false`; break; }
      case 'gotra': case 'kuladevata': case 'pravara': case 'surname': case 'ancestral': {
        joinClause=`JOIN religious_details rd ON rd.profile_id=p.id`;
        extraCols=`, rd.gotra AS "Gotra",rd.pravara AS "Pravara",rd.upanama_general AS "Upanama General",rd.upanama_proper AS "Upanama Proper",COALESCE(NULLIF(TRIM(rd.kuladevata_other),''),rd.kuladevata) AS "Kuladevata",COALESCE(NULLIF(TRIM(rd.surname_in_use),''),pd.surname_in_use) AS "Surname in Use",rd.surname_as_per_gotra AS "Surname as per Gotra",rd.priest_name AS "Priest Name",rd.priest_location AS "Priest Location",array_to_string(rd.demi_gods::text[],', ') AS "Demi Gods",rd.demi_god_other AS "Other Demi Gods",rd.ancestral_challenge AS "Ancestral Challenge",rd.ancestral_challenge_notes AS "Ancestral Challenge Notes"`;
        if(filter&&category==='gotra'){statusCond+=` AND LOWER(TRIM(rd.gotra)) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);}
        else if(filter&&category==='kuladevata'){statusCond+=` AND LOWER(COALESCE(NULLIF(TRIM(rd.kuladevata_other),''),rd.kuladevata)) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);}
        else if(filter&&category==='pravara'){statusCond+=` AND LOWER(TRIM(rd.pravara)) LIKE LOWER($${paramOffset+1})`;params.push(`%${filter}%`);}
        break;
      }
      default: break;
    }

    const sql = `${BASE_SELECT} ${extraCols} FROM profiles p JOIN users u ON u.id=p.user_id LEFT JOIN personal_details pd ON pd.profile_id=p.id ${joinClause} ${baseCond} ${statusCond} ${dateClause} ORDER BY "Full Name" LIMIT 5000`;
    try {
      const result = await pool.query(sql, params);
      return res.json(result.rows);
    } catch (queryErr) {
      console.warn('[getExportData] Main query failed, using safe fallback:', queryErr.message);
      const fallback = await pool.query(`SELECT DISTINCT TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.last_name,''))) AS "Full Name",u.email AS "Email",u.phone AS "Phone",p.status AS "Status",TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At" FROM profiles p JOIN users u ON u.id=p.user_id LEFT JOIN personal_details pd ON pd.profile_id=p.id WHERE p.sangha_id=$1 AND p.status='approved' ORDER BY "Full Name" LIMIT 5000`, [sanghaId]);
      return res.json(fallback.rows);
    }
  } catch (err) {
    console.error('[getExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FULL EXPORT DATA  (includes _profile_id for frontend)
// ════════════════════════════════════════════════════════════
const getFullExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sections = [], includeAllStatuses = false, dateFrom, dateTo } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const statusFilter = includeAllStatuses ? '' : `AND p.status = 'approved'`;
    const df = buildDateFilter(dateFrom, dateTo, 1, 'p.submitted_at');
    const dateFilter = df.clause;

    const baseRows = await pool.query(
      `SELECT
         p.id AS profile_id, p.status AS "Status", u.id AS user_id,
         u.email AS "Email", u.phone AS "Phone",
         TRIM(CONCAT(COALESCE(pd.first_name,''),' ',COALESCE(pd.middle_name||' ',''),COALESCE(pd.last_name,''))) AS "Full Name",
         pd.gender::text AS "Gender",
         TO_CHAR(pd.date_of_birth,'DD-Mon-YYYY') AS "Date of Birth",
         pd.is_married AS "Is Married",
         TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At",
         TO_CHAR(p.reviewed_at,'DD-Mon-YYYY')  AS "Reviewed At"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1 ${statusFilter} ${dateFilter}
       ORDER BY "Full Name"
       LIMIT 5000`,
      [sanghaId, ...df.params]
    );

    const rowMap = new Map();
    for (const row of baseRows.rows) rowMap.set(row.profile_id, { ...row });
    const profileIds = baseRows.rows.map(r => r.profile_id);
    if (profileIds.length === 0) return res.json([]);

    if (sections.includes('economic-details')) {
      // ── Economic basics ──────────────────────────────────────────────────
      const ecRows = await pool.query(
        `SELECT profile_id,
           self_income::text AS "Self Income (Individual)", family_income::text AS "Family Income (Annual)",
           fac_own_house AS "Owns House", fac_agricultural_land AS "Has Agricultural Land",
           fac_car AS "Has 4-Wheeler", fac_two_wheeler AS "Has 2-Wheeler", fac_rented_house AS "Renting",
           inv_fixed_deposits AS "Invests in Fixed Deposits", inv_mutual_funds_sip AS "Invests in Mutual Funds / SIP",
           inv_shares_demat AS "Invests in Shares / Demat", inv_others AS "Other Investments"
         FROM economic_details WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const ec of ecRows.rows) {
        const r = rowMap.get(ec.profile_id);
        if (r) Object.assign(r, ec);
      }

      // ── Insurance — "Self" row from member_insurance ─────────────────────
      const insRows = await pool.query(
        `SELECT profile_id,
           array_to_string(health_coverage::text[],       ', ') AS "Health Insurance",
           array_to_string(life_coverage::text[],         ', ') AS "Life Insurance",
           array_to_string(term_coverage::text[],         ', ') AS "Term Insurance",
           array_to_string(konkani_card_coverage::text[], ', ') AS "Konkani Card"
         FROM member_insurance
         WHERE profile_id = ANY($1)
           AND LOWER(member_relation) = 'self'
         ORDER BY profile_id, sort_order`,
        [profileIds]
      );
      // Use a map so only the first (lowest sort_order) Self row wins
      const insMap = new Map();
      for (const ins of insRows.rows) {
        if (!insMap.has(ins.profile_id)) insMap.set(ins.profile_id, ins);
      }
      for (const [pid, ins] of insMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Health Insurance"] = ins["Health Insurance"] || '';
          r["Life Insurance"]   = ins["Life Insurance"]   || '';
          r["Term Insurance"]   = ins["Term Insurance"]   || '';
          r["Konkani Card"]     = ins["Konkani Card"]     || '';
        }
      }

      // ── Documents — "Self" row from member_documents ─────────────────────
      const docRows = await pool.query(
        `SELECT profile_id,
           aadhaar_coverage::text  AS "Aadhaar",
           pan_coverage::text      AS "PAN Card",
           voter_id_coverage::text AS "Voter ID",
           land_doc_coverage::text AS "Land Docs",
           dl_coverage::text       AS "DL"
         FROM member_documents
         WHERE profile_id = ANY($1)
           AND LOWER(member_relation) = 'self'
         ORDER BY profile_id, sort_order`,
        [profileIds]
      );
      const docMap = new Map();
      for (const doc of docRows.rows) {
        if (!docMap.has(doc.profile_id)) docMap.set(doc.profile_id, doc);
      }
      for (const [pid, doc] of docMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Aadhaar"]   = doc["Aadhaar"]   || '';
          r["PAN Card"]  = doc["PAN Card"]  || '';
          r["Voter ID"]  = doc["Voter ID"]  || '';
          r["Land Docs"] = doc["Land Docs"] || '';
          r["DL"]        = doc["DL"]        || '';
        }
      }
    }

    if (sections.includes('education-profession')) {
      const eduRows = await pool.query(
        `SELECT me.profile_id, me.member_name AS "Member Name", me.member_relation AS "Relation",
           me.highest_education AS "Education Level", me.profession_type::text AS "Profession",
           me.is_currently_studying AS "Currently Studying", me.is_currently_working AS "Currently Working",
           (SELECT STRING_AGG(ml.language,', ') FROM member_languages ml WHERE ml.member_education_id=me.id) AS "Languages Known"
         FROM member_education me
         WHERE me.profile_id = ANY($1)
           AND LOWER(me.member_relation) = 'self'
         ORDER BY me.sort_order`,
        [profileIds]
      );
      const eduMap = new Map();
      for (const edu of eduRows.rows) {
        if (!eduMap.has(edu.profile_id)) eduMap.set(edu.profile_id, edu);
      }
      for (const [pid, edu] of eduMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Member Name"]        = edu["Member Name"];
          r["Relation"]           = edu["Relation"];
          r["Education Level"]    = edu["Education Level"];
          r["Profession"]         = edu["Profession"];
          r["Currently Studying"] = edu["Currently Studying"];
          r["Currently Working"]  = edu["Currently Working"];
          r["Languages Known"]    = edu["Languages Known"];
        }
      }
    }

    // family-information section: no columns added to main table rows
    // (handled separately via getFamilyMembersData endpoint)

    if (sections.includes('location-information')) {
      const addrRows = await pool.query(
        `SELECT profile_id, TRIM(city) AS "City", district AS "District", state AS "State", pincode AS "Pincode"
         FROM addresses WHERE profile_id = ANY($1) LIMIT 5000`,
        [profileIds]
      );
      const addrMap = new Map();
      for (const a of addrRows.rows) {
        if (!addrMap.has(a.profile_id)) addrMap.set(a.profile_id, a);
      }
      for (const [pid, addr] of addrMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["City"]     = addr["City"];
          r["District"] = addr["District"];
          r["State"]    = addr["State"];
          r["Pincode"]  = addr["Pincode"];
        }
      }
    }

    if (sections.includes('religious-details')) {
      const relRows = await pool.query(
        `SELECT rd.profile_id, rd.gotra AS "Gotra", rd.pravara AS "Pravara",
           rd.upanama_general AS "Upanama General", rd.upanama_proper AS "Upanama Proper",
           COALESCE(NULLIF(TRIM(rd.kuladevata_other),''),rd.kuladevata) AS "Kuladevata",
           COALESCE(NULLIF(TRIM(rd.surname_in_use),''),pd.surname_in_use) AS "Surname in Use",
           rd.surname_as_per_gotra AS "Surname as per Gotra",
           rd.priest_name AS "Priest Name", rd.priest_location AS "Priest Location",
           array_to_string(rd.demi_gods::text[],', ') AS "Demi Gods",
           rd.ancestral_challenge AS "Ancestral Challenge",
           rd.ancestral_challenge_notes AS "Ancestral Challenge Notes",
           fh.common_relative_names AS "Common Relative Names"
         FROM religious_details rd
         LEFT JOIN personal_details pd ON pd.profile_id = rd.profile_id
         LEFT JOIN family_history fh ON fh.profile_id = rd.profile_id
         WHERE rd.profile_id = ANY($1)`,
        [profileIds]
      );
      for (const rel of relRows.rows) {
        const r = rowMap.get(rel.profile_id);
        if (r) Object.assign(r, rel);
      }
    }

    // ── Include _profile_id as a hidden field for frontend row-level family lookup ──
    const result = Array.from(rowMap.values()).map(row => {
      const { user_id, profile_id, ...rest } = row;
      return { _profile_id: profile_id, ...rest };
    });

    res.json(result);
  } catch (err) {
    console.error('[getFullExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// ════════════════════════════════════════════════════════════
// FAMILY MEMBERS DATA
// ════════════════════════════════════════════════════════════
const getFamilyMembersData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const { profileIds } = req.body;
    if (!Array.isArray(profileIds) || profileIds.length === 0) return res.json([]);

    const profileRes = await pool.query(
      `SELECT p.id,
         TRIM(CONCAT(COALESCE(pd.first_name,''),' ',COALESCE(pd.middle_name||' ',''),COALESCE(pd.last_name,''))) AS full_name
       FROM profiles p
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.id = ANY($1) AND p.sangha_id = $2`,
      [profileIds, sanghaId]
    );

    const validIds = profileRes.rows.map(r => r.id);
    const nameMap  = {};
    profileRes.rows.forEach(r => { nameMap[r.id] = r.full_name; });
    if (validIds.length === 0) return res.json([]);

    const fmRes = await pool.query(
      `SELECT fm.profile_id,
         fm.name AS "Family Member Name", fm.relation AS "Relation",
         TO_CHAR(fm.dob,'DD-Mon-YYYY') AS "Date of Birth",
         fm.gender::text AS "Gender", fm.status AS "Status",
         fm.disability AS "Disability", fm.sort_order
       FROM family_members fm
       WHERE fm.profile_id = ANY($1)
       ORDER BY fm.profile_id, fm.sort_order`,
      [validIds]
    );

    const insRes = await pool.query(
      `SELECT profile_id, member_name, member_relation, sort_order,
         array_to_string(health_coverage::text[],', ')       AS "Health Coverage",
         array_to_string(life_coverage::text[],', ')         AS "Life Coverage",
         array_to_string(term_coverage::text[],', ')         AS "Term Coverage",
         array_to_string(konkani_card_coverage::text[],', ') AS "Konkani Card Coverage"
       FROM member_insurance WHERE profile_id = ANY($1)
       ORDER BY profile_id, sort_order`,
      [validIds]
    );

    const docRes = await pool.query(
      `SELECT profile_id, member_name, member_relation, sort_order,
         aadhaar_coverage::text  AS "Aadhaar",
         pan_coverage::text      AS "PAN Card",
         voter_id_coverage::text AS "Voter ID",
         land_doc_coverage::text AS "Land Docs",
         dl_coverage::text       AS "DL"
       FROM member_documents WHERE profile_id = ANY($1)
       ORDER BY profile_id, sort_order`,
      [validIds]
    );

    const eduRes = await pool.query(
      `SELECT me.profile_id, me.member_name, me.member_relation, me.sort_order,
         me.is_currently_studying AS "Currently Studying",
         me.is_currently_working  AS "Currently Working",
         me.profession_type::text AS "Type of Profession",
         me.industry              AS "Industry / Field",
         STRING_AGG(DISTINCT mes.degree_name, ' | ' ORDER BY mes.degree_name) AS "Degree Name",
         STRING_AGG(DISTINCT mes.degree_type, ' | ' ORDER BY mes.degree_type) AS "Type of Degree",
         STRING_AGG(DISTINCT mes.university,  ' | ' ORDER BY mes.university)  AS "University",
         MIN(TO_CHAR(mes.start_date,'DD-Mon-YYYY')) AS "Start Date",
         MAX(TO_CHAR(mes.end_date,'DD-Mon-YYYY'))   AS "End Date",
         STRING_AGG(DISTINCT mes.certificate, ' | ' ORDER BY mes.certificate) AS "Certificate",
         (SELECT STRING_AGG(ml.language, ', ' ORDER BY ml.language)
          FROM member_languages ml WHERE ml.member_education_id = me.id) AS "Languages Known"
       FROM member_education me
       LEFT JOIN member_educations mes ON mes.member_education_id = me.id
       WHERE me.profile_id = ANY($1)
       GROUP BY me.id, me.profile_id, me.member_name, me.member_relation, me.sort_order,
                me.is_currently_studying, me.is_currently_working, me.profession_type, me.industry
       ORDER BY me.profile_id, me.sort_order`,
      [validIds]
    );

    const insMap = {};
    insRes.rows.forEach(r => { if (!insMap[r.profile_id]) insMap[r.profile_id] = []; insMap[r.profile_id].push(r); });
    const docMap = {};
    docRes.rows.forEach(r => { if (!docMap[r.profile_id]) docMap[r.profile_id] = []; docMap[r.profile_id].push(r); });
    const eduMap = {};
    eduRes.rows.forEach(r => { if (!eduMap[r.profile_id]) eduMap[r.profile_id] = []; eduMap[r.profile_id].push(r); });

    const result = fmRes.rows.map(fm => {
      const profileIns  = insMap[fm.profile_id] || [];
      const profileDocs = docMap[fm.profile_id] || [];
      const profileEdu  = eduMap[fm.profile_id] || [];

      const ins = profileIns.find(i => i.member_name === fm["Family Member Name"] && i.member_relation === fm["Relation"])
                || profileIns.find(i => i.sort_order === fm.sort_order) || {};
      const doc = profileDocs.find(d => d.member_name === fm["Family Member Name"] && d.member_relation === fm["Relation"])
                || profileDocs.find(d => d.sort_order === fm.sort_order) || {};
      const edu = profileEdu.find(e => e.member_name === fm["Family Member Name"] && e.member_relation === fm["Relation"])
                || profileEdu.find(e => e.sort_order === fm.sort_order) || {};

      return {
        _profile_id:               fm.profile_id,
        "Owner (Registered User)": nameMap[fm.profile_id] || "",
        "Family Member Name":      fm["Family Member Name"] || "",
        "Relation":                fm["Relation"] || "",
        "Date of Birth":           fm["Date of Birth"] || "",
        "Gender":                  fm["Gender"] || "",
        "Status":                  fm["Status"] || "",
        "Disability":              fm["Disability"] || "",
        "Health Coverage":         ins["Health Coverage"] || "",
        "Life Coverage":           ins["Life Coverage"] || "",
        "Term Coverage":           ins["Term Coverage"] || "",
        "Konkani Card Coverage":   ins["Konkani Card Coverage"] || "",
        "Degree Name":             edu["Degree Name"] || "",
        "Type of Degree":          edu["Type of Degree"] || "",
        "University":              edu["University"] || "",
        "Start Date":              edu["Start Date"] || "",
        "End Date":                edu["End Date"] || "",
        "Certificate":             edu["Certificate"] || "",
        "Currently Studying":      edu["Currently Studying"] !== undefined ? (edu["Currently Studying"] ? "Yes" : "No") : "",
        "Currently Working":       edu["Currently Working"]  !== undefined ? (edu["Currently Working"]  ? "Yes" : "No") : "",
        "Type of Profession":      edu["Type of Profession"] || "",
        "Industry / Field":        edu["Industry / Field"] || "",
        "Languages Known":         edu["Languages Known"] || "",
        "Aadhaar":                 doc["Aadhaar"] || "",
        "PAN Card":                doc["PAN Card"] || "",
        "Voter ID":                doc["Voter ID"] || "",
        "Land Docs":               doc["Land Docs"] || "",
        "DL":                      doc["DL"] || "",
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[getFamilyMembersData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
  getReports,
  getEnhancedReports,
  getAdvancedReports,
  getActivityLogs,
  getExportData,
  getFullExportData,
  getFamilyMembersData,
};
// Community-Application\backend\src\controllers\sanghareportscontroller.js
const pool = require('../config/db');

// ─── Helper: Get sangha ID from user ID ────────────────────────────────────
async function getSanghaId(userId) {
  const res = await pool.query(
    'SELECT id FROM sanghas WHERE sangha_auth_id=$1', [userId]
  );
  return res.rows[0]?.id || null;
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
// GET /sangha/reports/enhanced
// ════════════════════════════════════════════════════════════
const getEnhancedReports = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const [currentCounts, trendData, dailyRegs] = await Promise.all([

      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'approved')                       AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')                       AS rejected,
           COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review'))   AS pending,
           COUNT(*) FILTER (WHERE status = 'changes_requested')              AS changes_requested,
           COUNT(*) FILTER (WHERE status = 'draft')                          AS draft,
           COUNT(*)                                                           AS total
         FROM profiles WHERE sangha_id = $1`,
        [sanghaId]
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
           COUNT(*) FILTER (WHERE status='approved') AS approvals
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
// ADVANCED REPORTS — FIXED & ENHANCED
// GET /sangha/reports/advanced
//
// FIX 1:  All data sourced from profiles table (sangha's registered users only,
//         NOT from sangha_members table which is manual team entries).
// FIX 2:  Insurance uses cardinality() for correct empty-array handling.
// FIX 3:  Gender "other" counted for any value not male/female.
// NEW 1:  totalPopulation = approved heads + all their family_members rows.
// NEW 2:  Income chart uses family_income (not self_income).
// NEW 3:  All cities returned (up to 100) to support frontend city filter.
// ════════════════════════════════════════════════════════════
const getAdvancedReports = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const safe = async (sql, params) => {
      try {
        return (await pool.query(sql, params)).rows;
      } catch (e) {
        console.warn('[AdvancedReports] Query skipped:', e.message);
        return [];
      }
    };

    // ── Total approved families ────────────────────────────
    const totalRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM profiles WHERE sangha_id=$1 AND status='approved'`,
      [sanghaId]
    );
    const totalApproved = parseInt(totalRes.rows[0]?.cnt || 0);

    // ── Total population = heads + all their family_members ─
    const populationRes = await pool.query(
      `SELECT
         COUNT(DISTINCT p.id) AS family_count,
         COALESCE((
           SELECT COUNT(*) FROM family_members fm
           JOIN profiles p2 ON p2.id = fm.profile_id
           WHERE p2.sangha_id=$1 AND p2.status='approved'
         ), 0) AS member_count
       FROM profiles p
       WHERE p.sangha_id=$1 AND p.status='approved'`,
      [sanghaId]
    );
    const popRow = populationRes.rows[0] || {};
    const totalPopulation = parseInt(popRow.family_count || 0) + parseInt(popRow.member_count || 0);

    const [
      genderRows,       // personal_details gender (head)
      memberGenderRows, // family_members gender (all dependents)
      ageRows,          // family_members dob
      pdAgeRows,        // personal_details date_of_birth (head)
      famTypeRows,
      maritalRows,
      degreeRows,
      professionRows,
      studyingRows,
      workingRows,
      cityRows,
      assetRows,
      healthInsRows,
      lifeInsRows,
      termInsRows,
      konkaniInsRows,
      aadhaarRows,
      panRows,
      voterRows,
      landRows,
      dlRows,
    ] = await Promise.all([

      // Gender — heads (personal_details)
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'male')   AS male,
          COUNT(*) FILTER (WHERE LOWER(pd.gender::text) = 'female') AS female,
          COUNT(*) FILTER (WHERE pd.gender IS NOT NULL
                             AND LOWER(pd.gender::text) NOT IN ('male','female')) AS other
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Gender — family members
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'male')   AS male,
          COUNT(*) FILTER (WHERE LOWER(fm.gender::text) = 'female') AS female,
          COUNT(*) FILTER (WHERE fm.gender IS NOT NULL
                             AND LOWER(fm.gender::text) NOT IN ('male','female')) AS other
        FROM profiles p
        JOIN family_members fm ON fm.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Age — family_members.dob
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) < 19)             AS u18,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 19 AND 35) AS y35,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) BETWEEN 36 AND 60) AS m60,
          COUNT(*) FILTER (WHERE fm.dob IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, fm.dob)) > 60)             AS o60
        FROM profiles p
        JOIN family_members fm ON fm.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Age — personal_details.date_of_birth (head fallback)
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19)             AS u18,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 19 AND 35) AS y35,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 36 AND 60) AS m60,
          COUNT(*) FILTER (WHERE pd.date_of_birth IS NOT NULL
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) > 60)             AS o60
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Family type
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%nuclear%') AS nuclear,
          COUNT(*) FILTER (WHERE LOWER(fi.family_type::text) LIKE '%joint%')   AS joint
        FROM profiles p
        JOIN family_info fi ON fi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Marital status
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE pd.is_married = true)  AS married,
          COUNT(*) FILTER (WHERE pd.is_married = false) AS single
        FROM profiles p
        JOIN personal_details pd ON pd.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Education degrees
      safe(`
        SELECT me.highest_education AS label, COUNT(*) AS count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.highest_education IS NOT NULL AND TRIM(me.highest_education) != ''
        GROUP BY me.highest_education ORDER BY count DESC LIMIT 10
      `, [sanghaId]),

      // Professions
      safe(`
        SELECT me.profession_type::text AS label, COUNT(*) AS count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.profession_type IS NOT NULL
        GROUP BY me.profession_type ORDER BY count DESC LIMIT 10
      `, [sanghaId]),

      // Currently studying
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE me.is_currently_studying = true)  AS yes_count,
          COUNT(*) FILTER (WHERE me.is_currently_studying = false) AS no_count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Currently working
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE me.is_currently_working = true)  AS yes_count,
          COUNT(*) FILTER (WHERE me.is_currently_working = false) AS no_count
        FROM profiles p
        JOIN member_education me ON me.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND me.is_currently_working IS NOT NULL
      `, [sanghaId]),

      // Geographic — all cities (up to 100) so frontend can filter
      safe(`
        SELECT TRIM(a.city) AS city, COUNT(DISTINCT p.id) AS count
        FROM profiles p
        JOIN addresses a ON a.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
          AND a.city IS NOT NULL AND TRIM(a.city) != ''
        GROUP BY TRIM(a.city)
        ORDER BY count DESC
        LIMIT 100
      `, [sanghaId]),

      // Assets
      safe(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ed.fac_own_house = true)        AS own_house,
          COUNT(*) FILTER (WHERE ed.fac_agricultural_land = true) AS agri_land,
          COUNT(*) FILTER (WHERE ed.fac_car = true)              AS four_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_two_wheeler = true)      AS two_wheeler,
          COUNT(*) FILTER (WHERE ed.fac_rented_house = true)     AS renting
        FROM profiles p
        JOIN economic_details ed ON ed.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // ── Insurance — FIX: use cardinality() for correct empty-array handling ──
      // Each row in member_insurance represents one person (head or family member).
      // cardinality(arr) returns 0 for empty arrays, unlike array_length which returns NULL.
      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.health_coverage IS NOT NULL
              AND cardinality(mi.health_coverage) > 0
              AND NOT (mi.health_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.health_coverage IS NULL
               OR cardinality(mi.health_coverage) = 0
               OR mi.health_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.life_coverage IS NOT NULL
              AND cardinality(mi.life_coverage) > 0
              AND NOT (mi.life_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.life_coverage IS NULL
               OR cardinality(mi.life_coverage) = 0
               OR mi.life_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.term_coverage IS NOT NULL
              AND cardinality(mi.term_coverage) > 0
              AND NOT (mi.term_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.term_coverage IS NULL
               OR cardinality(mi.term_coverage) = 0
               OR mi.term_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (
            WHERE mi.konkani_card_coverage IS NOT NULL
              AND cardinality(mi.konkani_card_coverage) > 0
              AND NOT (mi.konkani_card_coverage @> ARRAY['none']::text[])
          ) AS covered,
          COUNT(*) FILTER (
            WHERE mi.konkani_card_coverage IS NULL
               OR cardinality(mi.konkani_card_coverage) = 0
               OR mi.konkani_card_coverage @> ARRAY['none']::text[]
          ) AS not_covered
        FROM profiles p
        JOIN member_insurance mi ON mi.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      // Documents
      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'yes')                   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'no')                    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.aadhaar_coverage::text) = 'unknown'
                            OR md.aadhaar_coverage IS NULL)                                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'yes')     AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'no')      AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.pan_coverage::text) = 'unknown'
                            OR md.pan_coverage IS NULL)                      AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'yes')   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'no')    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.voter_id_coverage::text) = 'unknown'
                            OR md.voter_id_coverage IS NULL)                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'yes')   AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'no')    AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.land_doc_coverage::text) = 'unknown'
                            OR md.land_doc_coverage IS NULL)                   AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),

      safe(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'yes')    AS yes_count,
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'no')     AS no_count,
          COUNT(*) FILTER (WHERE LOWER(md.dl_coverage::text) = 'unknown'
                            OR md.dl_coverage IS NULL)                     AS unknown_count
        FROM profiles p JOIN member_documents md ON md.profile_id = p.id
        WHERE p.sangha_id=$1 AND p.status='approved'
      `, [sanghaId]),
    ]);

    // ── Merge age data ─────────────────────────────────────
    const fmAge = ageRows[0] || {};
    const pdAge = pdAgeRows[0] || {};
    const hasFmAge = (parseInt(fmAge.u18 || 0) + parseInt(fmAge.y35 || 0) +
                      parseInt(fmAge.m60 || 0) + parseInt(fmAge.o60 || 0)) > 0;
    const ageSource = hasFmAge ? fmAge : pdAge;

    // ── Merge gender: family_members (all) preferred over personal_details (head only) ──
    const fmG = memberGenderRows[0] || {};
    const pdG = genderRows[0] || {};
    const hasFmGender = (parseInt(fmG.male || 0) + parseInt(fmG.female || 0) + parseInt(fmG.other || 0)) > 0;
    const gSrc = hasFmGender ? fmG : pdG;

    const ft  = famTypeRows[0]  || {};
    const mar = maritalRows[0]  || {};
    const as  = assetRows[0]    || {};
    const st  = studyingRows[0] || {};
    const wk  = workingRows[0]  || {};

    const healthIns  = healthInsRows[0]  || {};
    const lifeIns    = lifeInsRows[0]    || {};
    const termIns    = termInsRows[0]    || {};
    const konkaniIns = konkaniInsRows[0] || {};

    const aadhaar = aadhaarRows[0] || {};
    const pan     = panRows[0]     || {};
    const voter   = voterRows[0]   || {};
    const land    = landRows[0]    || {};
    const dl      = dlRows[0]      || {};

    // ── Family income distribution (chart uses family_income) ──
    const familyIncomeSlabs = await (async () => {
      try {
        const rows = await pool.query(`
          SELECT ed.family_income::text AS label, COUNT(*) AS count
          FROM profiles p
          JOIN economic_details ed ON ed.profile_id = p.id
          WHERE p.sangha_id=$1 AND p.status='approved'
            AND ed.family_income IS NOT NULL
          GROUP BY ed.family_income ORDER BY count DESC
        `, [sanghaId]);
        return rows.rows.map(r => ({ label: r.label, count: parseInt(r.count || 0) }));
      } catch (e) {
        console.warn('[AdvancedReports] familyIncomeSlabs skipped:', e.message);
        return [];
      }
    })();

    // ── Employment breakdown ───────────────────────────────
    const employment = await (async () => {
      try {
        const rows = await pool.query(`
          SELECT me.profession_type::text AS label, COUNT(*) AS count
          FROM profiles p
          JOIN member_education me ON me.profile_id = p.id
          WHERE p.sangha_id=$1 AND p.status='approved'
            AND me.profession_type IS NOT NULL
          GROUP BY me.profession_type ORDER BY count DESC
        `, [sanghaId]);
        return rows.rows.map(r => ({ label: r.label, count: parseInt(r.count || 0) }));
      } catch (e) {
        console.warn('[AdvancedReports] employment skipped:', e.message);
        return [];
      }
    })();

    res.json({
      totalApproved,
      totalPopulation,  // NEW: includes heads + all family members

      demographics: {
        gender: {
          male:   parseInt(gSrc.male   || 0),
          female: parseInt(gSrc.female || 0),
          other:  parseInt(gSrc.other  || 0),  // FIX: counted from all members
        },
        ageGroups: [
          { label: '0–18',  count: parseInt(ageSource.u18 || 0) },
          { label: '19–35', count: parseInt(ageSource.y35 || 0) },
          { label: '36–60', count: parseInt(ageSource.m60 || 0) },
          { label: '60+',   count: parseInt(ageSource.o60 || 0) },
        ],
        familyType: {
          nuclear: parseInt(ft.nuclear || 0),
          joint:   parseInt(ft.joint   || 0),
        },
        maritalStatus: [
          { label: 'Married', count: parseInt(mar.married || 0) },
          { label: 'Single',  count: parseInt(mar.single  || 0) },
        ].filter(m => m.count > 0),
      },

      education: {
        degrees:    degreeRows.map(r => ({ label: r.label, count: parseInt(r.count || 0) })),
        studying:   { yes: parseInt(st.yes_count || 0), no: parseInt(st.no_count || 0) },
        working:    { yes: parseInt(wk.yes_count || 0), no: parseInt(wk.no_count || 0) },
        professions: professionRows.map(r => ({ label: r.label, count: parseInt(r.count || 0) })),
      },

      economic: {
        // FIX: Chart now uses family_income (annual household income)
        incomeSlabs: familyIncomeSlabs,

        assets: [
          { label: 'Own House',         owned: parseInt(as.own_house    || 0), total: parseInt(as.total || 0) },
          { label: 'Agricultural Land', owned: parseInt(as.agri_land    || 0), total: parseInt(as.total || 0) },
          { label: '4-Wheeler',         owned: parseInt(as.four_wheeler || 0), total: parseInt(as.total || 0) },
          { label: '2-Wheeler',         owned: parseInt(as.two_wheeler  || 0), total: parseInt(as.total || 0) },
          { label: 'Renting',           owned: parseInt(as.renting      || 0), total: parseInt(as.total || 0) },
        ],

        employment,
      },

      // FIX: Insurance counts all rows in member_insurance (head + dependents),
      // using cardinality() for correct empty-array detection.
      insurance: [
        { label: 'Health',       covered: parseInt(healthIns.covered  || 0), notCovered: parseInt(healthIns.not_covered  || 0) },
        { label: 'Life',         covered: parseInt(lifeIns.covered    || 0), notCovered: parseInt(lifeIns.not_covered    || 0) },
        { label: 'Term',         covered: parseInt(termIns.covered    || 0), notCovered: parseInt(termIns.not_covered    || 0) },
        { label: 'Konkani Card', covered: parseInt(konkaniIns.covered || 0), notCovered: parseInt(konkaniIns.not_covered || 0) },
      ],

      documents: [
        { label: 'Aadhaar',  yes: parseInt(aadhaar.yes_count || 0), no: parseInt(aadhaar.no_count || 0), unknown: parseInt(aadhaar.unknown_count || 0) },
        { label: 'PAN Card', yes: parseInt(pan.yes_count     || 0), no: parseInt(pan.no_count     || 0), unknown: parseInt(pan.unknown_count     || 0) },
        { label: 'Voter ID', yes: parseInt(voter.yes_count   || 0), no: parseInt(voter.no_count   || 0), unknown: parseInt(voter.unknown_count   || 0) },
        { label: 'Land Docs',yes: parseInt(land.yes_count    || 0), no: parseInt(land.no_count    || 0), unknown: parseInt(land.unknown_count    || 0) },
        { label: 'DL',       yes: parseInt(dl.yes_count      || 0), no: parseInt(dl.no_count      || 0), unknown: parseInt(dl.unknown_count      || 0) },
      ],

      // All cities returned — frontend handles display/filtering
      geographic: cityRows.map(r => ({ city: r.city, count: parseInt(r.count || 0) })),
    });

  } catch (err) {
    console.error('[getAdvancedReports]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// EXPORT DATA — FIXED
// POST /sangha/reports/export
//
// FIX 1: Empty filter no longer adds a WHERE clause that returns 0 rows.
// FIX 2: 'pending' status correctly maps to ('submitted','under_review').
// FIX 3: 'changes' correctly maps to 'changes_requested'.
// FIX 4: Income exports BOTH self_income AND family_income columns.
// FIX 5: All category exports properly join & return data.
// ════════════════════════════════════════════════════════════
const getExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { category, filter } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    const BASE_SELECT = `
      SELECT DISTINCT
        TRIM(CONCAT(
          COALESCE(pd.first_name,''), ' ',
          COALESCE(pd.middle_name || ' ', ''),
          COALESCE(pd.last_name,'')
        ))                                    AS "Full Name",
        u.email                               AS "Email",
        u.phone                               AS "Phone",
        p.status                              AS "Status",
        TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At",
        TO_CHAR(p.reviewed_at, 'DD-Mon-YYYY') AS "Reviewed At"
    `;

    let extraCols  = '';
    let joinClause = '';
    // FIX: Default WHERE only targets this sangha's approved users from profiles
    let whereCond  = `WHERE p.sangha_id = $1 AND p.status = 'approved'`;
    let params     = [sanghaId];

    switch (category) {

      // ── Status filter ────────────────────────────────────
      case 'status': {
        // FIX: Map frontend filter values to actual DB status values
        const f = (filter || 'approved').toLowerCase();
        if (f === 'pending' || f === 'submitted') {
          // Pending = submitted + under_review
          whereCond = `WHERE p.sangha_id = $1 AND p.status IN ('submitted', 'under_review')`;
        } else if (f === 'changes' || f === 'changes_requested') {
          whereCond = `WHERE p.sangha_id = $1 AND p.status = 'changes_requested'`;
        } else {
          whereCond = `WHERE p.sangha_id = $1 AND p.status = $2`;
          params.push(f);
        }
        break;
      }

      // ── City ─────────────────────────────────────────────
      case 'city': {
        joinClause = `JOIN addresses a ON a.profile_id = p.id`;
        extraCols  = `, TRIM(a.city) AS "City", a.district AS "District", a.state AS "State", a.pincode AS "Pincode"`;
        if (filter) {
          whereCond += ` AND LOWER(TRIM(a.city)) = LOWER($2)`;
          params.push(filter);
        }
        break;
      }

      // ── Gender ───────────────────────────────────────────
      case 'gender': {
        extraCols = `, pd.gender::text AS "Gender", pd.date_of_birth AS "Date of Birth"`;
        if (filter) {
          whereCond += ` AND LOWER(pd.gender::text) = LOWER($2)`;
          params.push(filter);
        }
        break;
      }

      // ── Age group ────────────────────────────────────────
      case 'age_group': {
        extraCols = `, pd.gender::text AS "Gender",
                      pd.date_of_birth AS "Date of Birth",
                      EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth))::int AS "Age"`;
        whereCond += ` AND pd.date_of_birth IS NOT NULL`;
        const rangeMap = {
          '0–18':  `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) < 19`,
          '19–35': `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 19 AND 35`,
          '36–60': `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) BETWEEN 36 AND 60`,
          '60+':   `EXTRACT(YEAR FROM AGE(CURRENT_DATE, pd.date_of_birth)) > 60`,
        };
        if (filter && rangeMap[filter]) whereCond += ` AND ${rangeMap[filter]}`;
        break;
      }

      // ── Income — exports BOTH self_income & family_income ─
      case 'income': {
        joinClause = `JOIN economic_details ed ON ed.profile_id = p.id`;
        extraCols  = `, ed.self_income::text AS "Self Income (Individual)",
                        ed.family_income::text AS "Family Income (Annual)"`;
        // FIX: Filter on family_income (which is what the chart shows)
        if (filter) {
          whereCond += ` AND ed.family_income::text = $2`;
          params.push(filter);
        }
        break;
      }

      // ── Asset ownership ───────────────────────────────────
      case 'asset': {
        joinClause = `JOIN economic_details ed ON ed.profile_id = p.id`;
        extraCols  = `, ed.self_income::text AS "Self Income",
                        ed.family_income::text AS "Family Income",
                        ed.fac_own_house AS "Owns House",
                        ed.fac_agricultural_land AS "Has Agricultural Land",
                        ed.fac_car AS "Has 4-Wheeler",
                        ed.fac_two_wheeler AS "Has 2-Wheeler",
                        ed.fac_rented_house AS "Renting"`;
        const assetMap = {
          'Own House':         `ed.fac_own_house = true`,
          'Agricultural Land': `ed.fac_agricultural_land = true`,
          '4-Wheeler':         `ed.fac_car = true`,
          '2-Wheeler':         `ed.fac_two_wheeler = true`,
          'Renting':           `ed.fac_rented_house = true`,
        };
        if (filter && assetMap[filter]) whereCond += ` AND ${assetMap[filter]}`;
        break;
      }

      // ── Insurance ─────────────────────────────────────────
      case 'insurance': {
        joinClause = `JOIN member_insurance mi ON mi.profile_id = p.id`;
        const insColMap = {
          'Health':       'mi.health_coverage',
          'Life':         'mi.life_coverage',
          'Term':         'mi.term_coverage',
          'Konkani Card': 'mi.konkani_card_coverage',
        };
        const col = insColMap[filter];
        if (col) {
          extraCols = `, mi.member_name AS "Member Name",
                         mi.member_relation AS "Relation",
                         array_to_string(${col}, ', ') AS "${filter} Coverage"`;
          whereCond += ` AND ${col} IS NOT NULL
                          AND cardinality(${col}) > 0
                          AND NOT (${col} @> ARRAY['none']::text[])`;
        } else {
          // Export all insurance columns
          extraCols = `, mi.member_name AS "Member Name",
                         mi.member_relation AS "Relation",
                         array_to_string(mi.health_coverage,        ', ') AS "Health Coverage",
                         array_to_string(mi.life_coverage,          ', ') AS "Life Coverage",
                         array_to_string(mi.term_coverage,          ', ') AS "Term Coverage",
                         array_to_string(mi.konkani_card_coverage,  ', ') AS "Konkani Card Coverage"`;
        }
        break;
      }

      // ── Documents ─────────────────────────────────────────
      case 'document': {
        joinClause = `JOIN member_documents md ON md.profile_id = p.id`;
        const docColMap = {
          'Aadhaar':   'md.aadhaar_coverage',
          'PAN Card':  'md.pan_coverage',
          'Voter ID':  'md.voter_id_coverage',
          'Land Docs': 'md.land_doc_coverage',
          'DL':        'md.dl_coverage',
        };
        const col = docColMap[filter];
        if (col) {
          extraCols = `, md.member_name AS "Member Name",
                         md.member_relation AS "Relation",
                         ${col}::text AS "${filter} Status"`;
          whereCond += ` AND LOWER(${col}::text) = 'yes'`;
        } else {
          extraCols = `, md.member_name AS "Member Name",
                         md.member_relation AS "Relation",
                         md.aadhaar_coverage::text  AS "Aadhaar",
                         md.pan_coverage::text      AS "PAN Card",
                         md.voter_id_coverage::text AS "Voter ID",
                         md.land_doc_coverage::text AS "Land Docs",
                         md.dl_coverage::text       AS "DL"`;
        }
        break;
      }

      // ── Education ─────────────────────────────────────────
      case 'education': {
        joinClause = `JOIN member_education me ON me.profile_id = p.id`;
        extraCols  = `, me.member_name AS "Member Name",
                        me.member_relation AS "Relation",
                        me.highest_education AS "Education Level",
                        me.profession_type::text AS "Profession",
                        me.is_currently_studying AS "Currently Studying",
                        me.is_currently_working AS "Currently Working"`;
        if (filter) {
          whereCond += ` AND LOWER(me.highest_education) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Occupation ────────────────────────────────────────
      case 'occupation': {
        joinClause = `JOIN member_education me ON me.profile_id = p.id`;
        extraCols  = `, me.member_name AS "Member Name",
                        me.member_relation AS "Relation",
                        me.profession_type::text AS "Profession",
                        me.highest_education AS "Education Level",
                        me.is_currently_working AS "Currently Working"`;
        if (filter) {
          whereCond += ` AND LOWER(me.profession_type::text) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Family type ───────────────────────────────────────
      case 'family_type': {
        joinClause = `JOIN family_info fi ON fi.profile_id = p.id`;
        extraCols  = `, fi.family_type::text AS "Family Type"`;
        if (filter) {
          whereCond += ` AND LOWER(fi.family_type::text) LIKE LOWER($2)`;
          params.push(`%${filter}%`);
        }
        break;
      }

      // ── Marital ───────────────────────────────────────────
      case 'marital': {
        extraCols = `, pd.is_married AS "Is Married", pd.date_of_birth AS "Date of Birth"`;
        const f = (filter || '').toLowerCase();
        if (f === 'married') {
          whereCond += ` AND pd.is_married = true`;
        } else if (f === 'single') {
          whereCond += ` AND pd.is_married = false`;
        }
        break;
      }

      default:
        // All approved — no extra filter
        break;
    }

    const sql = `
      ${BASE_SELECT}
      ${extraCols}
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      ${joinClause}
      ${whereCond}
      ORDER BY "Full Name"
      LIMIT 5000
    `;

    try {
      const result = await pool.query(sql, params);
      return res.json(result.rows);
    } catch (queryErr) {
      console.warn('[getExportData] Main query failed, using safe fallback:', queryErr.message);
      // Safe minimal fallback
      const fallback = await pool.query(
        `SELECT DISTINCT
           TRIM(CONCAT(pd.first_name,' ',COALESCE(pd.last_name,''))) AS "Full Name",
           u.email AS "Email",
           u.phone AS "Phone",
           p.status AS "Status",
           TO_CHAR(p.submitted_at,'DD-Mon-YYYY') AS "Submitted At"
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.sangha_id=$1 AND p.status='approved'
         ORDER BY "Full Name" LIMIT 5000`,
        [sanghaId]
      );
      return res.json(fallback.rows);
    }

  } catch (err) {
    console.error('[getExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ════════════════════════════════════════════════════════════
// FULL EXPORT DATA
// POST /sangha/reports/export/full
// ════════════════════════════════════════════════════════════
const getFullExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sections = [], includeAllStatuses = false } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });
 
    // Status filter
    const statusFilter = includeAllStatuses
      ? '' // no status restriction
      : `AND p.status = 'approved'`;
 
    // ── Base query: always include profile + user + personal details ──────────
    const baseRows = await pool.query(
      `SELECT
         p.id                                                                    AS profile_id,
         p.status                                                                AS "Status",
         u.id                                                                    AS user_id,
         u.email                                                                 AS "Email",
         u.phone                                                                 AS "Phone",
         TRIM(CONCAT(
           COALESCE(pd.first_name,''), ' ',
           COALESCE(pd.middle_name || ' ', ''),
           COALESCE(pd.last_name,'')
         ))                                                                      AS "Full Name",
         pd.gender::text                                                         AS "Gender",
         TO_CHAR(pd.date_of_birth,'DD-Mon-YYYY')                                AS "Date of Birth",
         TO_CHAR(p.submitted_at,'DD-Mon-YYYY')                                  AS "Submitted At",
         TO_CHAR(p.reviewed_at, 'DD-Mon-YYYY')                                  AS "Reviewed At"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1 ${statusFilter}
       ORDER BY "Full Name"
       LIMIT 5000`,
      [sanghaId]
    );
 
    // Build profile_id → row map
    const rowMap = new Map();
    for (const row of baseRows.rows) {
      rowMap.set(row.profile_id, { ...row });
    }
    const profileIds = baseRows.rows.map(r => r.profile_id);
 
    if (profileIds.length === 0) return res.json([]);
 
    // ── Economic Details ───────────────────────────────────────────────────────
    if (sections.includes('economic-details')) {
      const ecRows = await pool.query(
        `SELECT
           profile_id,
           self_income::text                                         AS "Self Income (Individual)",
           family_income::text                                       AS "Family Income (Annual)",
           fac_own_house                                             AS "Owns House",
           fac_agricultural_land                                     AS "Has Agricultural Land",
           fac_car                                                   AS "Has 4-Wheeler",
           fac_two_wheeler                                           AS "Has 2-Wheeler",
           fac_rented_house                                          AS "Renting"
         FROM economic_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const ec of ecRows.rows) {
        const r = rowMap.get(ec.profile_id);
        if (r) {
          r["Self Income (Individual)"]  = ec["Self Income (Individual)"];
          r["Family Income (Annual)"]    = ec["Family Income (Annual)"];
          r["Owns House"]               = ec["Owns House"];
          r["Has Agricultural Land"]    = ec["Has Agricultural Land"];
          r["Has 4-Wheeler"]            = ec["Has 4-Wheeler"];
          r["Has 2-Wheeler"]            = ec["Has 2-Wheeler"];
          r["Renting"]                  = ec["Renting"];
        }
      }
    }
 
    // ── Education & Profession ─────────────────────────────────────────────────
    if (sections.includes('education-profession')) {
      const eduRows = await pool.query(
        `SELECT
           me.profile_id,
           me.member_name                                            AS "Member Name",
           me.member_relation                                        AS "Relation",
           me.highest_education                                      AS "Education Level",
           me.profession_type::text                                  AS "Profession",
           me.is_currently_studying                                  AS "Currently Studying",
           me.is_currently_working                                   AS "Currently Working"
         FROM member_education me
         WHERE me.profile_id = ANY($1)
         ORDER BY me.sort_order`,
        [profileIds]
      );
      // Group by profile_id — use first record for single-row merge
      // For multi-member education, concatenate
      const eduMap = new Map();
      for (const edu of eduRows.rows) {
        if (!eduMap.has(edu.profile_id)) {
          eduMap.set(edu.profile_id, edu);
        } else {
          // Append additional members
          const existing = eduMap.get(edu.profile_id);
          existing["Member Name"] = `${existing["Member Name"] || ''} | ${edu["Member Name"] || ''}`.trim().replace(/^\|/, '');
          existing["Education Level"] = `${existing["Education Level"] || ''} | ${edu["Education Level"] || ''}`.trim().replace(/^\|/, '');
          existing["Profession"] = `${existing["Profession"] || ''} | ${edu["Profession"] || ''}`.trim().replace(/^\|/, '');
        }
      }
      for (const [pid, edu] of eduMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Member Name"]          = edu["Member Name"];
          r["Relation"]             = edu["Relation"];
          r["Education Level"]      = edu["Education Level"];
          r["Profession"]           = edu["Profession"];
          r["Currently Studying"]   = edu["Currently Studying"];
          r["Currently Working"]    = edu["Currently Working"];
        }
      }
    }
 
    // ── Family Information + Insurance ────────────────────────────────────────
    if (sections.includes('family-information')) {
      const fiRows = await pool.query(
        `SELECT profile_id, family_type::text AS "Family Type"
         FROM family_info WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const fi of fiRows.rows) {
        const r = rowMap.get(fi.profile_id);
        if (r) r["Family Type"] = fi["Family Type"];
      }
 
      const insRows = await pool.query(
        `SELECT
           profile_id,
           array_to_string(health_coverage,       ', ') AS "Health Coverage",
           array_to_string(life_coverage,         ', ') AS "Life Coverage",
           array_to_string(term_coverage,         ', ') AS "Term Coverage",
           array_to_string(konkani_card_coverage, ', ') AS "Konkani Card Coverage"
         FROM member_insurance
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      // Use first row per profile
      const insMap = new Map();
      for (const ins of insRows.rows) {
        if (!insMap.has(ins.profile_id)) insMap.set(ins.profile_id, ins);
      }
      for (const [pid, ins] of insMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Health Coverage"]       = ins["Health Coverage"];
          r["Life Coverage"]         = ins["Life Coverage"];
          r["Term Coverage"]         = ins["Term Coverage"];
          r["Konkani Card Coverage"] = ins["Konkani Card Coverage"];
        }
      }
    }
 
    // ── Location Information ───────────────────────────────────────────────────
    if (sections.includes('location-information')) {
      const addrRows = await pool.query(
        `SELECT profile_id, TRIM(city) AS "City", district AS "District", state AS "State", pincode AS "Pincode"
         FROM addresses
         WHERE profile_id = ANY($1)
         LIMIT 5000`,
        [profileIds]
      );
      // Use first address per profile
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
 
    // ── Religious Details ──────────────────────────────────────────────────────
    if (sections.includes('religious-details')) {
      const relRows = await pool.query(
        `SELECT profile_id, gotra AS "Gotra", pravara AS "Pravara", kuladevata AS "Kuladevata"
         FROM religious_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const rel of relRows.rows) {
        const r = rowMap.get(rel.profile_id);
        if (r) {
          r["Gotra"]      = rel["Gotra"];
          r["Pravara"]    = rel["Pravara"];
          r["Kuladevata"] = rel["Kuladevata"];
        }
      }
    }
 
    // ── Document Status ────────────────────────────────────────────────────────
    if (sections.includes('personal-details')) {
      const docRows = await pool.query(
        `SELECT
           profile_id,
           aadhaar_coverage::text  AS "Aadhaar",
           pan_coverage::text      AS "PAN Card",
           voter_id_coverage::text AS "Voter ID",
           land_doc_coverage::text AS "Land Docs",
           dl_coverage::text       AS "DL"
         FROM member_documents
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      const docMap = new Map();
      for (const d of docRows.rows) {
        if (!docMap.has(d.profile_id)) docMap.set(d.profile_id, d);
      }
      for (const [pid, doc] of docMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Aadhaar"]   = doc["Aadhaar"];
          r["PAN Card"]  = doc["PAN Card"];
          r["Voter ID"]  = doc["Voter ID"];
          r["Land Docs"] = doc["Land Docs"];
          r["DL"]        = doc["DL"];
        }
      }
    }
 
    // ── Clean up internal keys before responding ───────────────────────────────
    const result = Array.from(rowMap.values()).map(row => {
      const { profile_id, user_id, ...rest } = row;
      return rest;
    });
 
    res.json(result);
 
  } catch (err) {
    console.error('[getFullExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getReports,
  getEnhancedReports,
  getAdvancedReports,
  getActivityLogs,
  getExportData,
  getFullExportData
};
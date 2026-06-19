// Community-Application\backend\src\controllers\userschlcontroller.js
const pool = require('../config/db');

function mapScholarship(row, appStatus, currentApprovals, applications = [], customCriteria = []) {
  const eligibility = [];

  if (row.age_min != null && row.age_max != null)
    eligibility.push(`Age ${row.age_min}–${row.age_max} years`);
  else if (row.age_min != null)
    eligibility.push(`Age ${row.age_min}+ years`);
  else if (row.age_max != null)
    eligibility.push(`Age up to ${row.age_max} years`);

  if (row.gender && row.gender !== 'all')
    eligibility.push(`Gender: ${row.gender}`);
  if (row.marital_status && row.marital_status !== 'all')
    eligibility.push(`Marital status: ${row.marital_status}`);
  if (row.disability_required)    eligibility.push('Disability required');
  if (row.single_parent_only)     eligibility.push('Single parent only');
  if (row.disabled_family_member) eligibility.push('Disabled family member');
  if (row.orphan)                 eligibility.push('Orphan');
  if (row.minority_community)     eligibility.push('Minority community');
  if (row.rural_background)       eligibility.push('Rural background');
  if (row.sports_quota)           eligibility.push('Sports quota');
  if (row.merit_based)            eligibility.push('Merit-based');
  if (row.currently_studying)     eligibility.push('Currently studying');
  if (row.domicile)               eligibility.push('Domicile required');
  if (row.konkani_card)           eligibility.push('Konkani card holder');
  if (row.family_type && row.family_type !== 'all')
    eligibility.push(`Family type: ${row.family_type}`);
  if (row.employment_status && row.employment_status !== 'all')
    eligibility.push(`Employment: ${row.employment_status}`);
  if (row.annual_family_income_max != null)
    eligibility.push(`Family income ≤ ₹${Number(row.annual_family_income_max).toLocaleString('en-IN')}/yr`);
  if (row.self_income_max != null)
    eligibility.push(`Self income ≤ ₹${Number(row.self_income_max).toLocaleString('en-IN')}/yr`);
  if (row.ews_only) eligibility.push('EWS only');
  if (row.education_levels && row.education_levels.length)
    eligibility.push(`Education: ${row.education_levels.join(', ')}`);

  const TOTAL_INDIAN_STATES = 28;
  const statesRestricted = row.states && row.states.length && row.states.length < TOTAL_INDIAN_STATES;

  if (row.states && row.states.length && row.states.length < TOTAL_INDIAN_STATES)
    eligibility.push(`State: ${row.states.join(', ')}`);

  if (statesRestricted && row.districts && row.districts.length > 0) {
    const DISTRICTS_BY_STATE_COUNT = {
      "Karnataka": 31, "Kerala": 14, "Tamil Nadu": 38, "Maharashtra": 36,
      "Gujarat": 33, "Andhra Pradesh": 26, "Telangana": 33,
    };
    const totalAvailable = row.states.reduce(
      (sum, s) => sum + (DISTRICTS_BY_STATE_COUNT[s] ?? 0), 0
    );
    const allDistrictsSelected = totalAvailable > 0 && row.districts.length >= totalAvailable;
    if (!allDistrictsSelected)
      eligibility.push(`District: ${row.districts.join(', ')}`);
  }

  if (row.cgpa_min != null)       eligibility.push(`Min CGPA: ${row.cgpa_min}`);
  if (row.percentage_min != null) eligibility.push(`Min %: ${row.percentage_min}`);

  const now = new Date();
  const end = row.application_end ? new Date(row.application_end) : null;
  let status = 'open';
  if (end && now > end) {
    status = 'closed';
  } else if (end) {
    const daysLeft = Math.ceil((end - now) / 86400000);
    if (daysLeft <= 7) status = 'closing_soon';
  }
  const dbStatus = (row.scholarship_status || '').toLowerCase();
  if (['closed', 'draft', 'archived', 'inactive'].includes(dbStatus)) status = 'closed';

  const rawTiers = row.tiers;
  const tieredAmounts = Array.isArray(rawTiers)
    ? rawTiers.map(t => ({
        label:     t.label          || '',
        amount:    Number(t.amount) || 0,
        condition: t.condition_note || '',
      }))
    : [];

  return {
    id:               row.id,
    name:             row.name             || '',
    description:      row.description      || '',
    category:         row.category_name    || 'General',
    categoryColor:    row.category_color   || '#534AB7',
    baseAmount:       Number(row.base_amount) || 0,
    tieredAmounts,
    eligibility,
    // ── Custom criteria set by the sangha ─────────────────────────────────
    customCriteria: Array.isArray(customCriteria) ? customCriteria : [],
    status,
    applicationStatus:  appStatus,
    applications,
    applicationStart:   row.application_start || '',
    applicationEnd:     row.application_end   || '',
    disbursementDate:   row.disbursement_date  || '',
    visibility:         row.visibility        || 'all_users',
    sanghaName:         row.sangha_name       || undefined,
    maxApprovals:       row.max_approvals_unlimited === false && row.max_approvals != null
                          ? Number(row.max_approvals) : undefined,
    currentApprovals:   row.max_approvals_unlimited === false && row.max_approvals != null
                          ? (currentApprovals ?? 0) : undefined,
    raw: {
      age_min:                  row.age_min,
      age_max:                  row.age_max,
      gender:                   row.gender,
      disability_required:      row.disability_required,
      marital_status:           row.marital_status,
      single_parent_only:       row.single_parent_only,
      disabled_family_member:   row.disabled_family_member,
      orphan:                   row.orphan,
      minority_community:       row.minority_community,
      rural_background:         row.rural_background,
      sports_quota:             row.sports_quota,
      merit_based:              row.merit_based,
      currently_studying:       row.currently_studying,
      employment_status:        row.employment_status,
      annual_family_income_max: row.annual_family_income_max,
      self_income_max:          row.self_income_max,
      ews_only:                 row.ews_only,
      education_levels:         row.education_levels,
      states:                   row.states,
      cgpa_min:                 row.cgpa_min,
      percentage_min:           row.percentage_min,
    },
  };
}

// ─── GET /userschl/scholarships ──────────────────────────────────────────────
exports.getScholarships = async (req, res) => {
  try {
    const userId = req.user.id;
    let profileId = null;
    let primarySanghaId = null;

    try {
      const profileRes = await pool.query(
        `SELECT id AS profile_id, sangha_id FROM profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (profileRes.rows.length) {
        profileId       = profileRes.rows[0].profile_id;
        primarySanghaId = profileRes.rows[0].sangha_id;
      }
    } catch (profileErr) {
      console.warn('[getScholarships] Could not resolve profile:', profileErr.message);
    }

    const schResult = await pool.query(
      `SELECT
          s.id, s.name, s.description, s.base_amount,
          s.status AS scholarship_status,
          s.age_min, s.age_max, s.gender, s.disability_required,
          s.marital_status, s.max_family_size, s.max_dependents,
          s.single_parent_only, s.disabled_family_member, s.family_type,
          s.states, s.districts, s.education_levels, s.degrees, s.universities,
          s.merit_based, s.currently_studying, s.employment_status,
          s.annual_family_income_min, s.annual_family_income_max,
          s.self_income_min, s.self_income_max, s.ews_only,
          s.house_ownership, s.agricultural_family, s.vehicle_ownership,
          s.has_assets, s.has_investments, s.visibility,
          s.max_approvals_unlimited, s.max_approvals,
          s.application_start, s.application_end, s.disbursement_date,
          s.religion, s.caste, s.domicile, s.orphan, s.minority_community,
          s.sports_quota, s.rural_background, s.cgpa_min, s.percentage_min,
          s.konkani_card, s.sangha_id,
          sg.sangha_name,
          sc.name  AS category_name,
          sc.color AS category_color,
          COALESCE(
            json_agg(
              json_build_object(
                'label',          st.label,
                'amount',         st.amount,
                'condition_note', st.condition_note
              ) ORDER BY st.sort_order
            ) FILTER (WHERE st.id IS NOT NULL),
            '[]'::json
          ) AS tiers
       FROM scholarships s
       JOIN sanghas sg ON sg.id = s.sangha_id
       LEFT JOIN scholarship_categories sc ON sc.id = s.category_id
       LEFT JOIN scholarship_tiers st ON st.scholarship_id = s.id
       WHERE s.status NOT IN ('draft')
         AND (
           s.visibility = 'all_users'
           OR (
             s.visibility = 'primary_sangha_only'
             AND $1::uuid IS NOT NULL
             AND s.sangha_id = $1::uuid
           )
         )
       GROUP BY s.id, sg.sangha_name, sc.name, sc.color
       ORDER BY s.created_at DESC`,
      [primarySanghaId]
    );

    if (schResult.rows.length === 0) return res.json({ data: [] });

    const scholarshipIds = schResult.rows.map(r => r.id);

    // ── Per-member application rows ─────────────────────────────────────────
    const applicationsByScholarship = {};
    const appliedMemberIdsByScholarship = {};
    const bestStatusByScholarship = {};

    if (profileId) {
      const appRes = await pool.query(
        `SELECT
            sa.scholarship_id,
            sa.family_member_id,
            sa.status,
            CASE
              WHEN sa.family_member_id IS NULL THEN COALESCE(pd.first_name || ' ' || pd.last_name, 'You')
              ELSE fm.name
            END AS member_name,
            CASE
              WHEN sa.family_member_id IS NULL THEN 'Self'
              ELSE fm.relation
            END AS relation
         FROM scholarship_applications sa
         LEFT JOIN family_members fm ON fm.id = sa.family_member_id
         LEFT JOIN personal_details pd ON pd.profile_id = $1
         WHERE sa.profile_id = $1
           AND sa.scholarship_id = ANY($2::uuid[])`,
        [profileId, scholarshipIds]
      );

      for (const row of appRes.rows) {
        const sid = row.scholarship_id;
        const memberKey = row.family_member_id ?? 'self';

        const mappedStatus =
          row.status === 'approved' ? 'approved' :
          row.status === 'rejected' ? 'rejected' : 'applied';

        if (!applicationsByScholarship[sid]) applicationsByScholarship[sid] = [];
        applicationsByScholarship[sid].push({
          memberId:   memberKey,
          memberName: (row.member_name || '').trim() || (row.family_member_id ? 'Member' : 'You'),
          relation:   row.relation || 'Self',
          status:     mappedStatus,
        });

        if (!appliedMemberIdsByScholarship[sid]) appliedMemberIdsByScholarship[sid] = new Set();
        appliedMemberIdsByScholarship[sid].add(memberKey);

        const existing = bestStatusByScholarship[sid];
        if (
          !existing ||
          mappedStatus === 'approved' ||
          (mappedStatus === 'applied' && existing === 'rejected')
        ) {
          bestStatusByScholarship[sid] = mappedStatus;
        }
      }
    }

    // ── Total available members count for this profile ─────────────────────
    let totalMemberCount = 1;
    if (profileId) {
      try {
        const memberCountRes = await pool.query(
          `SELECT COUNT(*) AS cnt
           FROM family_members
           WHERE profile_id = $1
             AND status = 'active'
             AND relation != 'Self'`,
          [profileId]
        );
        totalMemberCount = 1 + parseInt(memberCountRes.rows[0].cnt, 10);
      } catch (e) {
        console.warn('[getScholarships] Could not count family members:', e.message);
      }
    }

    // ── Build final appStatus per scholarship ───────────────────────────────
    const appStatusMap = {};
    for (const sid of scholarshipIds) {
      const appliedCount = appliedMemberIdsByScholarship[sid]?.size ?? 0;
      if (appliedCount === 0) {
        appStatusMap[sid] = 'not_applied';
      } else if (appliedCount < totalMemberCount) {
        appStatusMap[sid] = 'not_applied';
      } else {
        appStatusMap[sid] = bestStatusByScholarship[sid] || 'applied';
      }
    }

    // ── Quota map ───────────────────────────────────────────────────────────
    const quotaMap = {};
    const quotaRes = await pool.query(
      `SELECT scholarship_id, COUNT(*) AS approval_count
       FROM scholarship_applications
       WHERE scholarship_id = ANY($1::uuid[]) AND status = 'approved'
       GROUP BY scholarship_id`,
      [scholarshipIds]
    );
    for (const row of quotaRes.rows) {
      quotaMap[row.scholarship_id] = parseInt(row.approval_count, 10);
    }

    // ── Custom criteria map ─────────────────────────────────────────────────
    // Fetches sangha-defined custom criteria linked to each scholarship via
    // scholarship_custom_criteria_values → scholarship_custom_criteria.
    const customCriteriaMap = {};
    try {
      const customCriteriaRes = await pool.query(
        `SELECT
            sccv.scholarship_id,
            scc.label,
            scc.description,
            scc.sort_order
         FROM scholarship_custom_criteria_values sccv
         JOIN scholarship_custom_criteria scc
           ON scc.id = sccv.custom_criteria_id
         WHERE sccv.scholarship_id = ANY($1::uuid[])
         ORDER BY scc.sort_order ASC`,
        [scholarshipIds]
      );

      for (const row of customCriteriaRes.rows) {
        const sid = row.scholarship_id;
        if (!customCriteriaMap[sid]) customCriteriaMap[sid] = [];
        customCriteriaMap[sid].push({
          label:       row.label       || '',
          description: row.description || '',
        });
      }
    } catch (e) {
      // Non-fatal — custom criteria are supplementary; degrade gracefully.
      console.warn('[getScholarships] Could not fetch custom criteria:', e.message);
    }

    return res.json({
      data: schResult.rows.map(row =>
        mapScholarship(
          row,
          appStatusMap[row.id] || 'not_applied',
          quotaMap[row.id] || 0,
          applicationsByScholarship[row.id] || [],
          customCriteriaMap[row.id]         || [],
        )
      ),
    });

  } catch (err) {
    console.error('[getScholarships] ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch scholarships', detail: err.message });
  }
};

// ─── GET /userschl/scholarships/:id/members ──────────────────────────────────
exports.getScholarshipMembers = async (req, res) => {
  const { id: scholarshipId } = req.params;
  const userId = req.user.id;

  try {
    const profileRes = await pool.query(
      `SELECT p.id AS profile_id, p.status AS profile_status, p.sangha_id,
              pd.first_name, pd.last_name, pd.gender, pd.date_of_birth,
              pd.marital_status, pd.has_disability
       FROM profiles p
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!profileRes.rows.length)
      return res.status(404).json({ message: 'Profile not found.' });

    const profile = profileRes.rows[0];

    if (profile.profile_status !== 'approved')
      return res.status(400).json({ message: 'Your profile must be approved before applying.' });

    const familyRes = await pool.query(
      `SELECT id, relation, name, age, gender, dob, disability
       FROM family_members
       WHERE profile_id = $1
         AND status = 'active'
         AND relation != 'Self'
       ORDER BY sort_order`,
      [profile.profile_id]
    );

    const appsRes = await pool.query(
      `SELECT family_member_id, status
       FROM scholarship_applications
       WHERE scholarship_id = $1 AND profile_id = $2`,
      [scholarshipId, profile.profile_id]
    );

    const appStatusMap = {};
    for (const row of appsRes.rows) {
      const key = row.family_member_id ?? 'self';
      appStatusMap[key] = row.status === 'approved' ? 'approved'
                        : row.status === 'rejected' ? 'rejected' : 'applied';
    }

    const calcAge = (dob) => {
      if (!dob) return null;
      return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    };

    const members = [
      {
        id:                'self',
        label:             'Self',
        name:              [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'You',
        relation:          'Self',
        age:               calcAge(profile.date_of_birth),
        gender:            profile.gender        || null,
        disability:        profile.has_disability === 'yes' ? 'yes' : 'no',
        maritalStatus:     profile.marital_status || null,
        applicationStatus: appStatusMap['self']  || 'not_applied',
      },
      ...familyRes.rows.map(fm => ({
        id:                fm.id,
        label:             fm.relation || fm.name,
        name:              fm.name     || fm.relation,
        relation:          fm.relation,
        age:               fm.age ?? calcAge(fm.dob),
        gender:            fm.gender   || null,
        disability:        fm.disability || 'no',
        maritalStatus:     null,
        applicationStatus: appStatusMap[fm.id] || 'not_applied',
      })),
    ];

    return res.json({ data: members });

  } catch (err) {
    console.error('[getScholarshipMembers] ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch members.', detail: err.message });
  }
};

// ─── POST /userschl/scholarships/:id/apply ───────────────────────────────────
exports.applyScholarship = async (req, res) => {
  const { id: scholarshipId } = req.params;
  const userId = req.user.id;
  const { applications = [] } = req.body;

  if (!applications.length)
    return res.status(400).json({ message: 'Select at least one member to apply.' });

  try {
    const profileRes = await pool.query(
      `SELECT id AS profile_id, sangha_id, status AS profile_status
       FROM profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!profileRes.rows.length)
      return res.status(400).json({ message: 'Profile not found. Please complete your profile first.' });

    const { profile_id: profileId, sangha_id: primarySanghaId, profile_status } = profileRes.rows[0];

    if (profile_status !== 'approved')
      return res.status(400).json({ message: 'Your profile must be approved before applying for scholarships.' });

    if (!primarySanghaId)
      return res.status(400).json({ message: 'You must have a primary sangha to apply for scholarships.' });

    const scholRes = await pool.query(
      `SELECT id, status, visibility, sangha_id,
              max_approvals_unlimited, max_approvals,
              application_start, application_end
       FROM scholarships WHERE id = $1 LIMIT 1`,
      [scholarshipId]
    );

    if (!scholRes.rows.length)
      return res.status(404).json({ message: 'Scholarship not found.' });

    const schol = scholRes.rows[0];
    const dbStatus = (schol.status || '').toLowerCase();

    if (['draft', 'archived', 'inactive', 'closed'].includes(dbStatus))
      return res.status(400).json({ message: 'This scholarship is not currently accepting applications.' });

    if (schol.visibility === 'primary_sangha_only' && schol.sangha_id !== primarySanghaId)
      return res.status(403).json({ message: 'This scholarship is only available to members of its primary sangha.' });

    const now = new Date();
    if (schol.application_end && now > new Date(schol.application_end))
      return res.status(400).json({ message: 'The application window for this scholarship has closed.' });
    if (schol.application_start && now < new Date(schol.application_start))
      return res.status(400).json({ message: 'Applications for this scholarship have not opened yet.' });

    if (schol.max_approvals_unlimited === false && schol.max_approvals != null) {
      const countRes = await pool.query(
        `SELECT COUNT(*) AS cnt FROM scholarship_applications
         WHERE scholarship_id = $1 AND status = 'approved'`,
        [scholarshipId]
      );
      if (parseInt(countRes.rows[0].cnt, 10) >= schol.max_approvals)
        return res.status(400).json({ message: 'This scholarship has reached its approval quota.' });
    }

    const results = [];
    const errors  = [];

    for (const app of applications) {
      const { memberId, checkedCriteria = [] } = app;
      const isSelf         = memberId === 'self';
      const familyMemberId = isSelf ? null : memberId;

      const dupCheck = await pool.query(
        `SELECT id FROM scholarship_applications
         WHERE scholarship_id = $1
           AND profile_id = $2
           AND (family_member_id = $3 OR ($3 IS NULL AND family_member_id IS NULL))
         LIMIT 1`,
        [scholarshipId, profileId, familyMemberId]
      );

      if (dupCheck.rows.length) {
        errors.push({ memberId, error: 'Already applied for this member.' });
        continue;
      }

      if (!isSelf) {
        const memberCheck = await pool.query(
          `SELECT id FROM family_members
           WHERE id = $1 AND profile_id = $2 LIMIT 1`,
          [familyMemberId, profileId]
        );
        if (!memberCheck.rows.length) {
          errors.push({ memberId, error: 'Family member not found.' });
          continue;
        }
      }

      const insertRes = await pool.query(
        `INSERT INTO scholarship_applications
           (scholarship_id, profile_id, sangha_id, family_member_id,
            status, applied_at, checked_criteria)
         VALUES ($1, $2, $3, $4, 'pending', NOW(), $5)
         RETURNING id, applied_at`,
        [scholarshipId, profileId, primarySanghaId, familyMemberId,
         JSON.stringify(checkedCriteria)]
      );

      results.push({
        applicationId: insertRes.rows[0].id,
        appliedAt:     insertRes.rows[0].applied_at,
        memberId,
        status:        'applied',
      });
    }

    if (results.length === 0)
      return res.status(409).json({
        message: errors[0]?.error || 'No new applications submitted.',
        errors,
      });

    return res.status(201).json({
      data: { applications: results, errors },
      message: `Application${results.length > 1 ? 's' : ''} submitted successfully.`,
    });

  } catch (err) {
    console.error('[applyScholarship] ERROR:', err.message);
    console.error('[applyScholarship] DETAIL:', err.detail);
    console.error('[applyScholarship] HINT:', err.hint);
    return res.status(500).json({
      message: 'Failed to submit application.',
      detail: err.message,
      hint: err.hint,
    });
  }
};
// Community-Application\backend\src\controllers\userschlcontroller.js
const pool = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
console.log('[userschlcontroller] SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('[userschlcontroller] SUPABASE_SERVICE_KEY present:', !!process.env.SUPABASE_SERVICE_KEY, 'length:', process.env.SUPABASE_SERVICE_KEY?.length);


const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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


// ─── Helpers for member education/bank endpoints ─────────────────────────────
async function resolveProfileId(userId) {
  const r = await pool.query(`SELECT id FROM profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  if (!r.rows.length) return null;
  return r.rows[0].id;
}

function toFamilyMemberId(memberId) {
  return memberId === 'self' ? null : memberId;
}

// ─── GET /userschl/members/:memberId/education ────────────────────────────────
exports.getMemberEducation = async (req, res) => {
  try {
    const profileId = await resolveProfileId(req.user.id);
    if (!profileId) return res.status(404).json({ message: 'Profile not found.' });

    const familyMemberId = toFamilyMemberId(req.params.memberId);
   const r = await pool.query(
  `SELECT
      employment_type,
      pursuing_degree,

      sslc_pursued,
      pu_pursued,

      sslc_school_name,
      sslc_year,
      sslc_percentage,
      sslc_marks_card_url,

      pu_college_name,
      pu_year,
      pu_percentage,
      pu_marks_card_url,

      degree_name,
      degree_institution,
      degree_year,
      degree_percentage,
      degree_certificate_url

   FROM member_education_details
   WHERE profile_id = $1
     AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
   LIMIT 1`,
  [profileId, familyMemberId]
);

    if (!r.rows.length) return res.json({ data: null });

    const row = r.rows[0];
    return res.json({
      data: {
        employmentType:      row.employment_type,
        pursuingDegree:      row.pursuing_degree,
        sslcPursued: row.sslc_pursued,
        puPursued: row.pu_pursued,
        sslcSchoolName:      row.sslc_school_name,
        sslcYear:            row.sslc_year,
        sslcPercentage:      row.sslc_percentage,
        sslcMarksCardUrl:    row.sslc_marks_card_url,
        puCollegeName:       row.pu_college_name,
        puYear:              row.pu_year,
        puPercentage:        row.pu_percentage,
        puMarksCardUrl:      row.pu_marks_card_url,
        degreeName:          row.degree_name,
        degreeInstitution:   row.degree_institution,
        degreeYear:          row.degree_year,
        degreePercentage:    row.degree_percentage,
        degreeCertificateUrl: row.degree_certificate_url,
      },
    });
  } catch (err) {
    console.error('[getMemberEducation] ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch education details.', detail: err.message });
  }
};

// ─── PUT /userschl/members/:memberId/education ────────────────────────────────
exports.saveMemberEducation = async (req, res) => {
  try {
    const profileId = await resolveProfileId(req.user.id);
    if (!profileId) return res.status(404).json({ message: 'Profile not found.' });

    const familyMemberId = toFamilyMemberId(req.params.memberId);

    if (familyMemberId) {
      const memberCheck = await pool.query(
        `SELECT id FROM family_members WHERE id = $1 AND profile_id = $2 LIMIT 1`,
        [familyMemberId, profileId]
      );
      if (!memberCheck.rows.length) {
        return res.status(404).json({ message: 'Family member not found.' });
      }
    }

  const {
  employmentType = null,
  pursuingDegree = null,

  sslcPursued = null,
  puPursued = null,

  sslcSchoolName = null,
  sslcYear = null,
  sslcPercentage = null,
  sslcMarksCardUrl = null,

  puCollegeName = null,
  puYear = null,
  puPercentage = null,
  puMarksCardUrl = null,

  degreeName = null,
  degreeInstitution = null,
  degreeYear = null,
  degreePercentage = null,
  degreeCertificateUrl = null,
} = req.body;

    const existing = await pool.query(
      `SELECT id, sslc_marks_card_url, pu_marks_card_url, degree_certificate_url
       FROM member_education_details
       WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
       LIMIT 1`,
      [profileId, familyMemberId]
    );

    // Preserve existing file URLs if this save doesn't include a new one
    // (so a text-field-only save via onBlur doesn't wipe out an uploaded file).
    const finalSslcUrl   = sslcMarksCardUrl   ?? existing.rows[0]?.sslc_marks_card_url   ?? null;
    const finalPuUrl     = puMarksCardUrl     ?? existing.rows[0]?.pu_marks_card_url     ?? null;
    const finalDegreeUrl = degreeCertificateUrl ?? existing.rows[0]?.degree_certificate_url ?? null;

    if (existing.rows.length) {
      await pool.query(
        `UPDATE member_education_details SET
   employment_type = $1,
   pursuing_degree = $2,

   sslc_pursued = $3,
   pu_pursued = $4,

   sslc_school_name = $5,
   sslc_year = $6,
   sslc_percentage = $7,
   sslc_marks_card_url = $8,

   pu_college_name = $9,
   pu_year = $10,
   pu_percentage = $11,
   pu_marks_card_url = $12,

   degree_name = $13,
   degree_institution = $14,
   degree_year = $15,
   degree_percentage = $16,
   degree_certificate_url = $17,

   updated_at = NOW()
WHERE id = $18`,
        [
  employmentType,
  pursuingDegree,

  sslcPursued,
  puPursued,

  sslcSchoolName,
  sslcYear,
  sslcPercentage,
  finalSslcUrl,

  puCollegeName,
  puYear,
  puPercentage,
  finalPuUrl,

  degreeName,
  degreeInstitution,
  degreeYear,
  degreePercentage,
  finalDegreeUrl,

  existing.rows[0].id
]
      );
    } else {
      await pool.query(
        `INSERT INTO member_education_details
(
 profile_id,
 family_member_id,

 employment_type,
 pursuing_degree,

 sslc_pursued,
 pu_pursued,

 sslc_school_name,
 sslc_year,
 sslc_percentage,
 sslc_marks_card_url,

 pu_college_name,
 pu_year,
 pu_percentage,
 pu_marks_card_url,

 degree_name,
 degree_institution,
 degree_year,
 degree_percentage,
 degree_certificate_url
)
VALUES
(
 $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
)`,
        [
  profileId,
  familyMemberId,

  employmentType,
  pursuingDegree,

  sslcPursued,
  puPursued,

  sslcSchoolName,
  sslcYear,
  sslcPercentage,
  finalSslcUrl,

  puCollegeName,
  puYear,
  puPercentage,
  finalPuUrl,

  degreeName,
  degreeInstitution,
  degreeYear,
  degreePercentage,
  finalDegreeUrl
]
      );
    }

    return res.json({ message: 'Education details saved.' });
  } catch (err) {
    console.error('[saveMemberEducation] ERROR:', err);
    return res.status(500).json({ message: 'Failed to save education details.', detail: err.message });
  }
};

// ─── POST /userschl/members/:memberId/education/documents/:docType ───────────
// docType: sslc | pu | degree
const DOC_TYPE_TO_COLUMN = {
  sslc:   'sslc_marks_card_url',
  pu:     'pu_marks_card_url',
  degree: 'degree_certificate_url',
};

exports.uploadMemberEducationDocument = async (req, res) => {
  try {
    const profileId = await resolveProfileId(req.user.id);
    if (!profileId) return res.status(404).json({ message: 'Profile not found.' });

    const { docType } = req.params;
    const column = DOC_TYPE_TO_COLUMN[docType];
    if (!column) return res.status(400).json({ message: 'Invalid document type. Must be sslc, pu, or degree.' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const familyMemberId = toFamilyMemberId(req.params.memberId);

    if (familyMemberId) {
      const memberCheck = await pool.query(
        `SELECT id FROM family_members WHERE id = $1 AND profile_id = $2 LIMIT 1`,
        [familyMemberId, profileId]
      );
      if (!memberCheck.rows.length) {
        return res.status(404).json({ message: 'Family member not found.' });
      }
    }

    const ext = req.file.originalname.split('.').pop();
    const memberSegment = familyMemberId || 'self';
    const filePath = `${profileId}/${memberSegment}/${docType}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseStorage.storage
      .from('scholarship-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadMemberEducationDocument] Supabase upload error:', uploadError.message);
      return res.status(500).json({ message: 'Failed to upload document.', detail: uploadError.message });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseStorage.storage
      .from('scholarship-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    if (signedUrlError) {
      console.error('[uploadMemberEducationDocument] Signed URL error:', signedUrlError.message);
      return res.status(500).json({ message: 'File uploaded but failed to generate URL.', detail: signedUrlError.message });
    }

    const fileUrl = signedUrlData.signedUrl;

    // Persist the URL into member_education_details immediately
    const existing = await pool.query(
      `SELECT id FROM member_education_details
       WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
       LIMIT 1`,
      [profileId, familyMemberId]
    );

    if (existing.rows.length) {
      await pool.query(
        `UPDATE member_education_details SET ${column} = $1, updated_at = NOW() WHERE id = $2`,
        [fileUrl, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO member_education_details (profile_id, family_member_id, ${column})
         VALUES ($1, $2, $3)`,
        [profileId, familyMemberId, fileUrl]
      );
    }

    return res.status(201).json({ data: { fileUrl, docType } });
  } catch (err) {
    console.error('[uploadMemberEducationDocument] ERROR:', err);
    return res.status(500).json({ message: 'Failed to upload document.', detail: err.message });
  }
};

// ─── GET /userschl/members/:memberId/bank ──────────────────────────────────────
exports.getMemberBank = async (req, res) => {
  try {
    const profileId = await resolveProfileId(req.user.id);
    if (!profileId) return res.status(404).json({ message: 'Profile not found.' });

    const familyMemberId = toFamilyMemberId(req.params.memberId);
    const r = await pool.query(
      `SELECT account_holder_name, bank_name, account_number, ifsc, branch
       FROM member_bank_details
       WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
       LIMIT 1`,
      [profileId, familyMemberId]
    );

    if (!r.rows.length) return res.json({ data: null });

    const row = r.rows[0];
    return res.json({
      data: {
        accountHolderName: row.account_holder_name,
        bankName:          row.bank_name,
        accountNumber:     row.account_number,
        ifsc:               row.ifsc,
        branch:            row.branch,
      },
    });
  } catch (err) {
    console.error('[getMemberBank] ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch bank details.', detail: err.message });
  }
};

// ─── PUT /userschl/members/:memberId/bank ──────────────────────────────────────
exports.saveMemberBank = async (req, res) => {
  try {
    const profileId = await resolveProfileId(req.user.id);
    if (!profileId) return res.status(404).json({ message: 'Profile not found.' });

    const familyMemberId = toFamilyMemberId(req.params.memberId);

    if (familyMemberId) {
      const memberCheck = await pool.query(
        `SELECT id FROM family_members WHERE id = $1 AND profile_id = $2 LIMIT 1`,
        [familyMemberId, profileId]
      );
      if (!memberCheck.rows.length) {
        return res.status(404).json({ message: 'Family member not found.' });
      }
    }

    const {
      accountHolderName = null, bankName = null, accountNumber = null, ifsc = null, branch = null,
    } = req.body;

    const existing = await pool.query(
      `SELECT id FROM member_bank_details
       WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
       LIMIT 1`,
      [profileId, familyMemberId]
    );

    if (existing.rows.length) {
      await pool.query(
        `UPDATE member_bank_details SET
           account_holder_name = $1, bank_name = $2, account_number = $3, ifsc = $4, branch = $5,
           updated_at = NOW()
         WHERE id = $6`,
        [accountHolderName, bankName, accountNumber, ifsc, branch, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO member_bank_details
           (profile_id, family_member_id, account_holder_name, bank_name, account_number, ifsc, branch)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [profileId, familyMemberId, accountHolderName, bankName, accountNumber, ifsc, branch]
      );
    }

    return res.json({ message: 'Bank details saved.' });
  } catch (err) {
    console.error('[saveMemberBank] ERROR:', err);
    return res.status(500).json({ message: 'Failed to save bank details.', detail: err.message });
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
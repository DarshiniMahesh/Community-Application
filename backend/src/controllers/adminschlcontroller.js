//Community-Application\backend\src\controllers\adminschlcontroller.js
const pool = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER – map a raw DB row into a clean scholarship object
// ─────────────────────────────────────────────────────────────────────────────
function mapScholarship(row) {
  const eligibility = [];
  if (row.age_min != null && row.age_max != null)
    eligibility.push(`Age ${row.age_min}–${row.age_max} years`);
  if (row.annual_family_income_max != null)
    eligibility.push(`Income ≤ ₹${Number(row.annual_family_income_max).toLocaleString("en-IN")}`);
  if (row.gender && row.gender !== "all")
    eligibility.push(`Gender: ${row.gender}`);
  if (Array.isArray(row.caste) && row.caste.length > 0)
    eligibility.push(`Caste: ${row.caste.join(", ")}`);
  if (Array.isArray(row.education_levels) && row.education_levels.length > 0)
    eligibility.push(`Education: ${row.education_levels.join(", ")}`);

  return {
    id: row.id,
    title: row.name,
    description: row.description,
    category: row.category_name || null,
    categoryColor: row.category_color || "#f97316",
    amount: row.base_amount,
    seats: row.max_approvals_unlimited ? null : row.max_approvals,
    deadline: row.application_end,
    applicationStart: row.application_start || null,
    disbursementDate: row.disbursement_date || row.application_end || null,
    state: Array.isArray(row.states) && row.states.length > 0 ? row.states[0] : null,
    district: Array.isArray(row.districts) && row.districts.length > 0 ? row.districts[0] : null,
    status: row.status,
    createdAt: row.created_at,
    eligibility,
    eligibilityCount: eligibility.length,
    sangha: {
      id: row.sangha_id,
      name: row.sangha_name,
      state: row.sangha_state,
      district: row.sangha_district,
      logo: row.sangha_logo,
    },
    stats: {
      totalApplicants: Number(row.total_applicants || 0),
      approved: Number(row.approved_count || 0),
      rejected: Number(row.rejected_count || 0),
      pending: Number(row.pending_count || 0),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/scholarships
// ─────────────────────────────────────────────────────────────────────────────
async function getAllScholarships(req, res) {
  try {
    const {
      search = "",
      category = "",
      state = "",
      sangha_id = "",
      status = "",
      year = "",
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    const conditions = ["s.status::text != 'draft'"];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(s.name ILIKE $${params.length} OR s.description ILIKE $${params.length} OR sg.sangha_name ILIKE $${params.length})`
      );
    }
    if (category) {
      params.push(category);
      conditions.push(`sc.name = $${params.length}`);
    }
    if (state) {
      params.push(state);
      conditions.push(`($${params.length} = ANY(s.states) OR sg.state ILIKE $${params.length})`);
    }
    if (sangha_id) {
      params.push(sangha_id);
      conditions.push(`s.sangha_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`s.status::text = $${params.length}`);
    }
    if (year) {
      params.push(Number(year));
      conditions.push(`EXTRACT(YEAR FROM s.application_end)::int = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM scholarships s
      JOIN sanghas sg ON sg.id = s.sangha_id
      LEFT JOIN scholarship_categories sc ON sc.id = s.category_id
      ${whereClause}
    `;

    params.push(Number(limit));
    params.push(offset);

    const mainQuery = `
      SELECT
        s.*,
        sg.sangha_name    AS sangha_name,
        sg.state          AS sangha_state,
        sg.district       AS sangha_district,
        sg.logo_url       AS sangha_logo,
        sc.name           AS category_name,
        sc.color          AS category_color,
        COUNT(sa.id)                                                    AS total_applicants,
        COUNT(sa.id) FILTER (WHERE sa.status = 'approved')              AS approved_count,
        COUNT(sa.id) FILTER (WHERE sa.status = 'rejected')              AS rejected_count,
        COUNT(sa.id) FILTER (WHERE sa.status = 'pending')               AS pending_count
      FROM scholarships s
      JOIN sanghas sg ON sg.id = s.sangha_id
      LEFT JOIN scholarship_categories sc ON sc.id = s.category_id
      LEFT JOIN scholarship_applications sa ON sa.scholarship_id = s.id
      ${whereClause}
      GROUP BY s.id, sg.id, sc.id
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, params.length - 2)),
      pool.query(mainQuery, params),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);
    const scholarships = dataResult.rows.map(mapScholarship);

    return res.status(200).json({
      success: true,
      data: scholarships,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getAllScholarships error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/scholarships/:id
// ─────────────────────────────────────────────────────────────────────────────
async function getScholarshipById(req, res) {
  try {
    const { id } = req.params;

    const schlResult = await pool.query(
      `SELECT
         s.*,
         sg.sangha_name    AS sangha_name,
         sg.state          AS sangha_state,
         sg.district       AS sangha_district,
         sg.logo_url       AS sangha_logo,
         sc.name           AS category_name,
         sc.color          AS category_color,
         COUNT(sa.id)                                               AS total_applicants,
         COUNT(sa.id) FILTER (WHERE sa.status = 'approved')         AS approved_count,
         COUNT(sa.id) FILTER (WHERE sa.status = 'rejected')         AS rejected_count,
         COUNT(sa.id) FILTER (WHERE sa.status = 'pending')          AS pending_count
       FROM scholarships s
       JOIN sanghas sg ON sg.id = s.sangha_id
       LEFT JOIN scholarship_categories sc ON sc.id = s.category_id
       LEFT JOIN scholarship_applications sa ON sa.scholarship_id = s.id
       WHERE s.id = $1 AND s.status::text != 'draft'
       GROUP BY s.id, sg.id, sc.id`,
      [id]
    );

    if (!schlResult.rows.length) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    const row = schlResult.rows[0];

    const tiersResult = await pool.query(
      `SELECT id, label, amount, condition_note AS condition, sort_order
       FROM scholarship_tiers
       WHERE scholarship_id = $1
       ORDER BY sort_order ASC`,
      [id]
    );

    const base = mapScholarship(row);
    const seatsFilled = Number(row.approved_count || 0);

    return res.status(200).json({
      success: true,
      data: {
        ...base,
        tiers: tiersResult.rows,
        categoryColor: row.category_color || "#f97316",
        applicationStart: row.application_start || null,
        disbursementDate: row.disbursement_date || row.application_end || null,
        seatsFilled,
      },
    });
  } catch (err) {
    console.error("getScholarshipById error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/scholarships/:id/applicants
// ─────────────────────────────────────────────────────────────────────────────
async function getScholarshipApplicants(req, res) {
  try {
    const { id } = req.params;
    const { status = "all", page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const schlCheck = await pool.query(
      `SELECT s.id, s.name AS title, sg.sangha_name AS sangha_name
       FROM scholarships s
       JOIN sanghas sg ON sg.id = s.sangha_id
       WHERE s.id = $1 AND s.status::text != 'draft'`,
      [id]
    );
    if (!schlCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    const params = [id];
    const conditions = ["sa.scholarship_id = $1"];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`sa.status = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*) AS total FROM scholarship_applications sa ${whereClause}
    `;

    params.push(Number(limit));
    params.push(offset);

    const dataQuery = `
      SELECT
        sa.id                  AS application_id,
        sa.status,
        sa.applied_at,
        sa.reviewed_at,
        sa.review_comment,
        sa.family_member_id,
        u.id                   AS user_id,
        u.email,
        u.phone,
        TRIM(CONCAT(
          pd.first_name, ' ',
          COALESCE(pd.middle_name || ' ', ''),
          pd.last_name
        ))                     AS full_name,
        p.photo_url            AS profile_photo,
        p.id                   AS profile_id,
        adr.state              AS user_state,
        adr.district           AS user_district,
        EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int AS age,
        -- family member name if applicable
        fm.name                AS family_member_name,
        fm.relation            AS family_member_relation
      FROM scholarship_applications sa
      JOIN profiles p          ON p.id       = sa.profile_id
      JOIN users u             ON u.id       = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN family_members fm   ON fm.id = sa.family_member_id
      LEFT JOIN LATERAL (
        SELECT state, district
        FROM addresses
        WHERE profile_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) adr ON true
      ${whereClause}
      ORDER BY sa.applied_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, params.length - 2)),
      pool.query(dataQuery, params),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);

    const applicants = dataResult.rows.map((row) => ({
      applicationId: row.application_id,
      status: row.status,
      appliedAt: row.applied_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.status === "rejected" ? row.review_comment : null,
      approvalNotes: row.status === "approved" ? row.review_comment : null,
      familyMemberId: row.family_member_id || null,
      familyMemberName: row.family_member_name || null,
      familyMemberRelation: row.family_member_relation || null,
      profileId: row.profile_id,
      user: {
        id: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        state: row.user_state,
        district: row.user_district,
        profilePhoto: row.profile_photo,
        age: row.age,
        caste: null,
        annualIncome: null,
        educationLevel: null,
      },
    }));

    return res.status(200).json({
      success: true,
      scholarship: {
        id: schlCheck.rows[0].id,
        title: schlCheck.rows[0].title,
        sanghaName: schlCheck.rows[0].sangha_name,
      },
      data: applicants,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getScholarshipApplicants error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/applications/:applicationId/applicant-details
// Returns full profile details for the applicant.
// If family_member_id is set → show only that family member's info.
// Otherwise → show the user's own info (no family member details).
// ─────────────────────────────────────────────────────────────────────────────
async function getApplicantDetails(req, res) {
  try {
    const { applicationId } = req.params;

    // 1. Fetch the application to know profile_id and family_member_id
    const appResult = await pool.query(
      `SELECT sa.profile_id, sa.family_member_id, sa.status, sa.applied_at, sa.reviewed_at, sa.review_comment
       FROM scholarship_applications sa
       WHERE sa.id = $1`,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const app = appResult.rows[0];
    const profileId = app.profile_id;
    const familyMemberId = app.family_member_id;
    const isFamilyMember = !!familyMemberId;

    // 2. Always fetch base user info
    const userResult = await pool.query(
      `SELECT
         u.id AS user_id, u.email, u.phone,
         p.id AS profile_id, p.photo_url, p.status AS profile_status,
         pd.first_name, pd.middle_name, pd.last_name, pd.gender,
         pd.date_of_birth, pd.fathers_name, pd.mothers_name,
         pd.mothers_maiden_name, pd.wife_name, pd.wife_maiden_name,
         pd.husbands_name, pd.surname_in_use, pd.surname_as_per_gotra,
         pd.has_disability, pd.marital_status
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.id = $1`,
      [profileId]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    const userRow = userResult.rows[0];

    // ── FAMILY MEMBER APPLICANT ──────────────────────────────────────────────
    if (isFamilyMember) {
      // Fetch the specific family member's basic info
      const fmResult = await pool.query(
        `SELECT fm.id, fm.name, fm.relation, fm.age, fm.dob, fm.gender,
                fm.disability, fm.status, fm.photo_url
         FROM family_members fm
         WHERE fm.id = $1 AND fm.profile_id = $2`,
        [familyMemberId, profileId]
      );

      if (!fmResult.rows.length) {
        return res.status(404).json({ success: false, message: "Family member not found" });
      }
      const fm = fmResult.rows[0];

      // Family member education
      const fmEduResult = await pool.query(
        `SELECT me.id, me.member_name, me.member_relation, me.highest_education,
                me.brief_profile, me.profession_type, me.profession_other,
                me.self_employed_type, me.self_employed_other, me.industry,
                me.is_currently_studying, me.is_currently_working
         FROM member_education me
         WHERE me.profile_id = $1 AND me.member_name = $2 AND me.member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmEdu = fmEduResult.rows[0] || null;

      // Degrees for that education record
      let fmDegrees = [];
      if (fmEdu) {
        const degResult = await pool.query(
          `SELECT degree_name, degree_type, university, start_date, end_date, certificate
           FROM member_educations WHERE member_education_id = $1 ORDER BY sort_order`,
          [fmEdu.id]
        );
        fmDegrees = degResult.rows;

        const langResult = await pool.query(
          `SELECT language, language_other FROM member_languages WHERE member_education_id = $1`,
          [fmEdu.id]
        );
        fmEdu.languages = langResult.rows;
        fmEdu.degrees = fmDegrees;
      }

      // Family member insurance
      const fmInsResult = await pool.query(
        `SELECT health_coverage, life_coverage, term_coverage, konkani_card_coverage
         FROM member_insurance
         WHERE profile_id = $1 AND member_name = $2 AND member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmIns = fmInsResult.rows[0] || null;

      // Family member documents
      const fmDocResult = await pool.query(
        `SELECT aadhaar_coverage, pan_coverage, voter_id_coverage, land_doc_coverage, dl_coverage
         FROM member_documents
         WHERE profile_id = $1 AND member_name = $2 AND member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmDoc = fmDocResult.rows[0] || null;

      // Education documents (SSLC / PU pursued flags + certificate details)
      const fmEduDocResult = await pool.query(
        `SELECT sslc_pursued, pu_pursued,
                sslc_school_name, sslc_year, sslc_percentage, sslc_marks_card_url,
                pu_college_name, pu_year, pu_percentage, pu_marks_card_url,
                degree_name, degree_institution, degree_year, degree_percentage, degree_certificate_url,
                employment_type, pursuing_degree
         FROM member_education_details
         WHERE profile_id = $1 AND family_member_id = $2
         LIMIT 1`,
        [profileId, familyMemberId]
      );
      const fmEduDoc = fmEduDocResult.rows[0] || null;

      return res.status(200).json({
        success: true,
        applicantType: "family_member",
        data: {
          // Basic info of the family member
          name: fm.name,
          relation: fm.relation,
          age: fm.age,
          dob: fm.dob,
          gender: fm.gender,
          disability: fm.disability,
          status: fm.status,
          photoUrl: fm.photo_url,
          // Education
          education: fmEdu ? {
            highestEducation: fmEdu.highest_education,
            briefProfile: fmEdu.brief_profile,
            professionType: fmEdu.profession_type,
            professionOther: fmEdu.profession_other,
            selfEmployedType: fmEdu.self_employed_type,
            selfEmployedOther: fmEdu.self_employed_other,
            industry: fmEdu.industry,
            isCurrentlyStudying: fmEdu.is_currently_studying,
            isCurrentlyWorking: fmEdu.is_currently_working,
            degrees: fmDegrees,
            languages: fmEdu.languages || [],
          } : null,
          // Insurance
          insurance: fmIns ? {
            healthCoverage: fmIns.health_coverage,
            lifeCoverage: fmIns.life_coverage,
            termCoverage: fmIns.term_coverage,
            konkaniCardCoverage: fmIns.konkani_card_coverage,
          } : null,
          // Identity documents (existing)
          documents: fmDoc ? {
            aadhaarCoverage: fmDoc.aadhaar_coverage,
            panCoverage: fmDoc.pan_coverage,
            voterIdCoverage: fmDoc.voter_id_coverage,
            landDocCoverage: fmDoc.land_doc_coverage,
            dlCoverage: fmDoc.dl_coverage,
          } : null,
          // NEW: SSLC / PU pursued status + certificate details
          educationStatus: fmEduDoc ? {
            sslcPursued: fmEduDoc.sslc_pursued,
            puPursued: fmEduDoc.pu_pursued,
            sslcSchoolName: fmEduDoc.sslc_school_name,
            sslcYear: fmEduDoc.sslc_year,
            sslcPercentage: fmEduDoc.sslc_percentage,
            sslcMarksCardUrl: fmEduDoc.sslc_marks_card_url,
            puCollegeName: fmEduDoc.pu_college_name,
            puYear: fmEduDoc.pu_year,
            puPercentage: fmEduDoc.pu_percentage,
            puMarksCardUrl: fmEduDoc.pu_marks_card_url,
            degreeName: fmEduDoc.degree_name,
            degreeInstitution: fmEduDoc.degree_institution,
            degreeYear: fmEduDoc.degree_year,
            degreePercentage: fmEduDoc.degree_percentage,
            degreeCertificateUrl: fmEduDoc.degree_certificate_url,
            employmentType: fmEduDoc.employment_type,
            pursuingDegree: fmEduDoc.pursuing_degree,
          } : null,
        },
      });
    }

    // ── USER (SELF) APPLICANT ────────────────────────────────────────────────
    // Fetch religious details
    const relResult = await pool.query(
      `SELECT gotra, pravara, kuladevata, kuladevata_other, surname_in_use,
              surname_as_per_gotra, priest_name, priest_location,
              upanama_general, upanama_proper, demi_gods, demi_god_other,
              ancestral_challenge, ancestral_challenge_notes
       FROM religious_details WHERE profile_id = $1`,
      [profileId]
    );
    const rel = relResult.rows[0] || null;

    // Fetch addresses
    const addrResult = await pool.query(
      `SELECT address_type, flat_no, building, street, landmark, area,
              city, taluk, district, state, pincode, country
       FROM addresses WHERE profile_id = $1 ORDER BY created_at ASC`,
      [profileId]
    );
    const addresses = addrResult.rows;

    // Fetch economic details
    const ecoResult = await pool.query(
      `SELECT self_income, family_income,
              inv_fixed_deposits, inv_mutual_funds_sip, inv_shares_demat, inv_others,
              fac_rented_house, fac_own_house, fac_agricultural_land, fac_two_wheeler, fac_car
       FROM economic_details WHERE profile_id = $1`,
      [profileId]
    );
    const eco = ecoResult.rows[0] || null;

    // Fetch user's own education (relation = 'Self')
    const eduResult = await pool.query(
      `SELECT me.id, me.highest_education, me.brief_profile, me.profession_type,
              me.profession_other, me.self_employed_type, me.self_employed_other,
              me.industry, me.is_currently_studying, me.is_currently_working
       FROM member_education me
       WHERE me.profile_id = $1 AND (me.member_relation = 'Self' OR me.sort_order = 0)
       ORDER BY me.sort_order ASC
       LIMIT 1`,
      [profileId]
    );
    const edu = eduResult.rows[0] || null;

    let degrees = [];
    let languages = [];
    if (edu) {
      const degResult = await pool.query(
        `SELECT degree_name, degree_type, university, start_date, end_date, certificate
         FROM member_educations WHERE member_education_id = $1 ORDER BY sort_order`,
        [edu.id]
      );
      degrees = degResult.rows;

      const langResult = await pool.query(
        `SELECT language, language_other FROM member_languages WHERE member_education_id = $1`,
        [edu.id]
      );
      languages = langResult.rows;
    }

    // Fetch user's own insurance (relation = 'Self')
    const userName = [userRow.first_name, userRow.last_name].filter(Boolean).join(" ");
    const insResult = await pool.query(
      `SELECT health_coverage, life_coverage, term_coverage, konkani_card_coverage
       FROM member_insurance
       WHERE profile_id = $1 AND (member_relation = 'Self' OR member_name = $2)
       ORDER BY sort_order ASC LIMIT 1`,
      [profileId, userName]
    );
    const ins = insResult.rows[0] || null;

    // Fetch user's own documents (relation = 'Self')
    const docResult = await pool.query(
      `SELECT aadhaar_coverage, pan_coverage, voter_id_coverage, land_doc_coverage, dl_coverage
       FROM member_documents
       WHERE profile_id = $1 AND (member_relation = 'Self' OR member_name = $2)
       ORDER BY sort_order ASC LIMIT 1`,
      [profileId, userName]
    );
    const doc = docResult.rows[0] || null;

    // Education documents (SSLC / PU pursued flags + certificate details) — self
    const eduDocResult = await pool.query(
      `SELECT sslc_pursued, pu_pursued,
              sslc_school_name, sslc_year, sslc_percentage, sslc_marks_card_url,
              pu_college_name, pu_year, pu_percentage, pu_marks_card_url,
              degree_name, degree_institution, degree_year, degree_percentage, degree_certificate_url,
              employment_type, pursuing_degree
       FROM member_education_details
       WHERE profile_id = $1 AND family_member_id IS NULL
       LIMIT 1`,
      [profileId]
    );
    const eduDoc = eduDocResult.rows[0] || null;

    // Fetch sangha memberships
    const sanghaResult = await pool.query(
      `SELECT ms.sangha_name, ms.role, ms.tenure, ms.status
       FROM member_sanghas ms
       WHERE ms.profile_id = $1`,
      [profileId]
    );
    const sanghas = sanghaResult.rows;

    return res.status(200).json({
      success: true,
      applicantType: "self",
      data: {
        // Personal
        personal: {
          firstName: userRow.first_name,
          middleName: userRow.middle_name,
          lastName: userRow.last_name,
          fullName: [userRow.first_name, userRow.middle_name, userRow.last_name].filter(Boolean).join(" "),
          gender: userRow.gender,
          dateOfBirth: userRow.date_of_birth,
          maritalStatus: userRow.marital_status,
          fathersName: userRow.fathers_name,
          mothersName: userRow.mothers_name,
          mothersMaidenName: userRow.mothers_maiden_name,
          wifeName: userRow.wife_name,
          wifeMaidenName: userRow.wife_maiden_name,
          husbandsName: userRow.husbands_name,
          surnameInUse: userRow.surname_in_use,
          surnameAsPerGotra: userRow.surname_as_per_gotra,
          hasDisability: userRow.has_disability,
          photoUrl: userRow.photo_url,
        },
        // Contact
        contact: {
          email: userRow.email,
          phone: userRow.phone,
        },
        // Religious
        religious: rel ? {
          gotra: rel.gotra,
          pravara: rel.pravara,
          kuladevata: rel.kuladevata_other || rel.kuladevata,
          surnameInUse: rel.surname_in_use,
          surnameAsPerGotra: rel.surname_as_per_gotra,
          priestName: rel.priest_name,
          priestLocation: rel.priest_location,
          upanamaGeneral: rel.upanama_general,
          upanamaProper: rel.upanama_proper,
          demiGods: Array.isArray(rel.demi_gods) ? rel.demi_gods : [],
          demiGodOther: rel.demi_god_other,
          ancestralChallenge: rel.ancestral_challenge,
          ancestralChallengeNotes: rel.ancestral_challenge_notes,
        } : null,
        // Addresses
        addresses: addresses.map(a => ({
          type: a.address_type,
          flatNo: a.flat_no,
          building: a.building,
          street: a.street,
          landmark: a.landmark,
          area: a.area,
          city: a.city,
          taluk: a.taluk,
          district: a.district,
          state: a.state,
          pincode: a.pincode,
          country: a.country,
        })),
        // Education
        education: edu ? {
          highestEducation: edu.highest_education,
          briefProfile: edu.brief_profile,
          professionType: edu.profession_type,
          professionOther: edu.profession_other,
          selfEmployedType: edu.self_employed_type,
          selfEmployedOther: edu.self_employed_other,
          industry: edu.industry,
          isCurrentlyStudying: edu.is_currently_studying,
          isCurrentlyWorking: edu.is_currently_working,
          degrees,
          languages,
        } : null,
        // Economic
        economic: eco ? {
          selfIncome: eco.self_income,
          familyIncome: eco.family_income,
          facilities: {
            rentedHouse: eco.fac_rented_house,
            ownHouse: eco.fac_own_house,
            agriculturalLand: eco.fac_agricultural_land,
            twoWheeler: eco.fac_two_wheeler,
            car: eco.fac_car,
          },
          investments: {
            fixedDeposits: eco.inv_fixed_deposits,
            mutualFunds: eco.inv_mutual_funds_sip,
            sharesDemat: eco.inv_shares_demat,
            others: eco.inv_others,
          },
        } : null,
        // Insurance
        insurance: ins ? {
          healthCoverage: ins.health_coverage,
          lifeCoverage: ins.life_coverage,
          termCoverage: ins.term_coverage,
          konkaniCardCoverage: ins.konkani_card_coverage,
        } : null,
        // Identity documents (existing)
        documents: doc ? {
          aadhaarCoverage: doc.aadhaar_coverage,
          panCoverage: doc.pan_coverage,
          voterIdCoverage: doc.voter_id_coverage,
          landDocCoverage: doc.land_doc_coverage,
          dlCoverage: doc.dl_coverage,
        } : null,
        // NEW: SSLC / PU pursued status + certificate details
        educationStatus: eduDoc ? {
          sslcPursued: eduDoc.sslc_pursued,
          puPursued: eduDoc.pu_pursued,
          sslcSchoolName: eduDoc.sslc_school_name,
          sslcYear: eduDoc.sslc_year,
          sslcPercentage: eduDoc.sslc_percentage,
          sslcMarksCardUrl: eduDoc.sslc_marks_card_url,
          puCollegeName: eduDoc.pu_college_name,
          puYear: eduDoc.pu_year,
          puPercentage: eduDoc.pu_percentage,
          puMarksCardUrl: eduDoc.pu_marks_card_url,
          degreeName: eduDoc.degree_name,
          degreeInstitution: eduDoc.degree_institution,
          degreeYear: eduDoc.degree_year,
          degreePercentage: eduDoc.degree_percentage,
          degreeCertificateUrl: eduDoc.degree_certificate_url,
          employmentType: eduDoc.employment_type,
          pursuingDegree: eduDoc.pursuing_degree,
        } : null,
        // Sangha memberships
        sanghas,
      },
    });
  } catch (err) {
    console.error("getApplicantDetails error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/applications/:applicationId/scholarship-history
// ─────────────────────────────────────────────────────────────────────────────
async function getApplicantScholarshipHistory(req, res) {
  try {
    const { applicationId } = req.params;
    const { type = "applied", start_date, end_date } = req.query;

    const appResult = await pool.query(
      `SELECT sa.profile_id, sa.family_member_id
       FROM scholarship_applications sa
       WHERE sa.id = $1`,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    const { profile_id: profileId, family_member_id: familyMemberId } = appResult.rows[0];

    const identityCondition = familyMemberId
      ? "sa.profile_id = $1 AND sa.family_member_id = $2"
      : "sa.profile_id = $1 AND sa.family_member_id IS NULL";
    const identityParams = familyMemberId ? [profileId, familyMemberId] : [profileId];

    const yearsResult = await pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM sa.applied_at)::int AS yr
       FROM scholarship_applications sa
       WHERE ${identityCondition}
       ORDER BY yr DESC`,
      identityParams
    );
    const availableYears = yearsResult.rows.map(r => r.yr);
    const currentYear = new Date().getFullYear();

    const conditions = [identityCondition];
    const params = [...identityParams];

    if (type === "benefitted") {
      conditions.push("sa.status = 'approved'");
    }

    if (start_date) {
      params.push(start_date);
      conditions.push(`sa.applied_at >= $${params.length}::date`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`sa.applied_at < ($${params.length}::date + interval '1 day')`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const dataQuery = `
      SELECT
        sa.id                AS application_id,
        sa.status,
        sa.applied_at,
        sa.reviewed_at,
        sa.review_comment,
        s.id                 AS scholarship_id,
        s.name               AS scholarship_title,
        s.base_amount        AS amount,
        s.disbursement_date  AS disbursement_date,
        s.application_end    AS deadline,
        s.status             AS scholarship_status,
        sg.id                AS sangha_id,
        sg.sangha_name       AS sangha_name,
        sg.state             AS sangha_state,
        sg.district          AS sangha_district,
        sg.logo_url          AS sangha_logo,
        st.label             AS tier_label,
        st.amount            AS tier_amount
      FROM scholarship_applications sa
      JOIN scholarships s   ON s.id  = sa.scholarship_id
      JOIN sanghas sg       ON sg.id = s.sangha_id
      LEFT JOIN LATERAL (
        SELECT label, amount
        FROM scholarship_tiers
        WHERE scholarship_id = s.id
        ORDER BY sort_order ASC
        LIMIT 1
      ) st ON true
      ${whereClause}
      ORDER BY sa.applied_at DESC
    `;

    const dataResult = await pool.query(dataQuery, params);

    const records = dataResult.rows.map(row => ({
      applicationId: row.application_id,
      status: row.status,
      appliedAt: row.applied_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.status === "rejected" ? row.review_comment : null,
      approvalNotes: row.status === "approved" ? row.review_comment : null,
      scholarship: {
        id: row.scholarship_id,
        title: row.scholarship_title,
        amount: row.amount != null ? row.amount : row.tier_amount,
        disbursementDate: row.disbursement_date || row.deadline || null,
        deadline: row.deadline,
        status: row.scholarship_status,
      },
      sangha: {
        id: row.sangha_id,
        name: row.sangha_name,
        state: row.sangha_state,
        district: row.sangha_district,
        logo: row.sangha_logo,
      },
    }));

    return res.status(200).json({
      success: true,
      data: records,
      meta: {
        type,
        startDate: start_date || null,
        endDate: end_date || null,
        availableYears,
        currentYear,
      },
    });
  } catch (err) {
    console.error("getApplicantScholarshipHistory error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/applicants
// Returns all applicants across all scholarships, filtered by year / date range
// Query params: year, start_date, end_date, status, sangha_id, page, limit
// ─────────────────────────────────────────────────────────────────────────────
async function getAllApplicants(req, res) {
  try {
    const {
      year = "",
      start_date = "",
      end_date = "",
      status = "",
      sangha_id = "",
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Base conditions/params — everything EXCEPT the status filter.
    // Used for tab counts so they don't collapse when a tab is selected.
    const baseConditions = ["s.status::text != 'draft'"];
    const baseParams = [];

    if (sangha_id) {
      baseParams.push(sangha_id);
      baseConditions.push(`s.sangha_id = $${baseParams.length}`);
    }
    if (year) {
      baseParams.push(Number(year));
      baseConditions.push(`EXTRACT(YEAR FROM sa.applied_at)::int = $${baseParams.length}`);
    }
    if (start_date) {
      baseParams.push(start_date);
      baseConditions.push(`sa.applied_at >= $${baseParams.length}::date`);
    }
    if (end_date) {
      baseParams.push(end_date);
      baseConditions.push(`sa.applied_at < ($${baseParams.length}::date + interval '1 day')`);
    }
    const baseWhereClause = `WHERE ${baseConditions.join(" AND ")}`;

    // Full conditions/params — base + status filter (used for the actual list + pagination)
    const conditions = [...baseConditions];
    const params = [...baseParams];
    if (status && status !== "all") {
      params.push(status);
      conditions.push(`sa.status = $${params.length}`);
    }
    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN sanghas sg ON sg.id = s.sangha_id
      LEFT JOIN profiles p ON p.id = sa.profile_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN family_members fm ON fm.id = sa.family_member_id
      ${whereClause}
    `;

    const filteredScholarshipCountQuery = `
      SELECT COUNT(DISTINCT sa.scholarship_id) AS cnt
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN sanghas sg ON sg.id = s.sangha_id
      ${whereClause}
    `;

    // Status breakdown — respects year/date/sangha filters but NOT the status filter
    const statusCountsQuery = `
      SELECT sa.status, COUNT(*) AS cnt
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN sanghas sg ON sg.id = s.sangha_id
      ${baseWhereClause}
      GROUP BY sa.status
    `;

    const grandTotalsQuery = `
      SELECT
        COUNT(*)                              AS total_applicants,
        COUNT(DISTINCT sa.scholarship_id)     AS total_scholarships
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      WHERE s.status::text != 'draft'
    `;

    const dataParams = [...params];
    dataParams.push(Number(limit));
    dataParams.push(offset);

    const dataQuery = `
      SELECT
        sa.id                AS application_id,
        sa.status,
        sa.applied_at,
        sa.reviewed_at,
        sa.review_comment,
        sa.family_member_id,
        s.id                 AS scholarship_id,
        s.name               AS scholarship_title,
        sg.sangha_name       AS sangha_name,
        u.id                 AS user_id,
        u.email,
        u.phone,
        TRIM(CONCAT(
          pd.first_name, ' ',
          COALESCE(pd.middle_name || ' ', ''),
          pd.last_name
        ))                   AS full_name,
        p.photo_url          AS profile_photo,
        p.id                 AS profile_id,
        EXTRACT(YEAR FROM AGE(pd.date_of_birth))::int AS age,
        fm.name              AS family_member_name,
        fm.relation          AS family_member_relation,
        adr.state            AS user_state,
        adr.district         AS user_district
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      JOIN sanghas sg ON sg.id = s.sangha_id
      LEFT JOIN profiles p ON p.id = sa.profile_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN personal_details pd ON pd.profile_id = p.id
      LEFT JOIN family_members fm ON fm.id = sa.family_member_id
      LEFT JOIN LATERAL (
        SELECT state, district FROM addresses
        WHERE profile_id = p.id ORDER BY created_at DESC LIMIT 1
      ) adr ON true
      ${whereClause}
      ORDER BY sa.applied_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const [countResult, filteredSchlCountResult, statusCountsResult, grandTotalsResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(filteredScholarshipCountQuery, params),
      pool.query(statusCountsQuery, baseParams),
      pool.query(grandTotalsQuery, []),
      pool.query(dataQuery, dataParams),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);

    const statusCounts = { approved: 0, rejected: 0, pending: 0 };
    let allCount = 0;
    statusCountsResult.rows.forEach((r) => {
      const cnt = Number(r.cnt || 0);
      allCount += cnt;
      if (r.status && Object.prototype.hasOwnProperty.call(statusCounts, r.status)) {
        statusCounts[r.status] = cnt;
      }
    });

    const applicants = dataResult.rows.map((row) => ({
      applicationId: row.application_id,
      status: row.status,
      appliedAt: row.applied_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.status === "rejected" ? row.review_comment : null,
      approvalNotes: row.status === "approved" ? row.review_comment : null,
      familyMemberId: row.family_member_id || null,
      familyMemberName: row.family_member_name || null,
      familyMemberRelation: row.family_member_relation || null,
      profileId: row.profile_id,
      scholarshipId: row.scholarship_id,
      scholarshipTitle: row.scholarship_title,
      sanghaName: row.sangha_name,
      user: {
        id: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        state: row.user_state,
        district: row.user_district,
        profilePhoto: row.profile_photo,
        age: row.age,
      },
    }));

    return res.status(200).json({
      success: true,
      data: applicants,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      meta: {
        filteredApplicants: total,
        filteredScholarships: Number(filteredSchlCountResult.rows[0]?.cnt || 0),
        totalApplicants: Number(grandTotalsResult.rows[0]?.total_applicants || 0),
        totalScholarships: Number(grandTotalsResult.rows[0]?.total_scholarships || 0),
        statusCounts: { all: allCount, ...statusCounts },
      },
    });
  } catch (err) {
    console.error("getAllApplicants error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/sanghas
// ─────────────────────────────────────────────────────────────────────────────
async function getAllSanghas(req, res) {
  try {
    const { search = "", state = "" } = req.query;
    const params = [];
    const conditions = ["sg.is_blocked = false"];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`sg.sangha_name ILIKE $${params.length}`);
    }
    if (state) {
      params.push(state);
      conditions.push(`sg.state ILIKE $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT
         sg.id,
         sg.sangha_name AS name,
         sg.state,
         sg.district,
         sg.logo_url    AS logo,
         sg.created_at,
         COUNT(s.id) FILTER (WHERE s.status::text != 'draft')           AS total_scholarships,
         COUNT(s.id) FILTER (WHERE s.status::text = 'active')           AS active_scholarships
       FROM sanghas sg
       LEFT JOIN scholarships s ON s.sangha_id = sg.id
       ${whereClause}
       GROUP BY sg.id
       ORDER BY sg.sangha_name ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        state: r.state,
        district: r.district,
        logo: r.logo,
        createdAt: r.created_at,
        totalScholarships: Number(r.total_scholarships),
        activeScholarships: Number(r.active_scholarships),
      })),
    });
  } catch (err) {
    console.error("getAllSanghas error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/scholarship-categories
// ─────────────────────────────────────────────────────────────────────────────
async function getScholarshipCategories(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT sc.name AS category, sc.color AS color
       FROM scholarship_categories sc
       WHERE sc.name IS NOT NULL
       ORDER BY sc.name ASC`
    );
    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({ name: r.category, color: r.color })),
    });
  } catch (err) {
    console.error("getScholarshipCategories error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/scholarship-states
// ─────────────────────────────────────────────────────────────────────────────
async function getScholarshipStates(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT UNNEST(states) AS state
       FROM scholarships
       WHERE states IS NOT NULL
         AND array_length(states, 1) > 0
         AND status::text != 'draft'
       UNION
       SELECT DISTINCT state
       FROM sanghas
       WHERE is_blocked = false AND state IS NOT NULL
       ORDER BY state ASC`
    );
    return res.status(200).json({
      success: true,
      data: rows.map((r) => r.state),
    });
  } catch (err) {
    console.error("getScholarshipStates error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getAllScholarships,
  getScholarshipById,
  getScholarshipApplicants,
  getApplicantDetails,
  getApplicantScholarshipHistory,
  getAllApplicants,
  getAllSanghas,
  getScholarshipCategories,
  getScholarshipStates,
};
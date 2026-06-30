const pool = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Helper: get company id from auth user ─────────────────────
async function getCompanyId(authId) {
  const r = await pool.query(`SELECT id, status FROM companies WHERE company_auth_id=$1`, [authId]);
  if (r.rows.length === 0) throw { status: 404, message: 'Company not found' };
  if (r.rows[0].status !== 'approved') throw { status: 403, message: 'Company is not approved yet' };
  return r.rows[0].id;
}

// ── Create Job ─────────────────────────────────────────────────
const createJob = async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);

    // Fetch company info for auto-fill
    const comp = await pool.query(
      `SELECT company_name FROM companies WHERE id=$1`, [companyId]
    );

    const {
      job_title, job_description, location, postal_code, country,
      job_code, department, functional_area,
      work_setting, employment_type,
      experience_min_years, experience_min_months,
      experience_max_years, experience_max_months,
      duration, contract_duration,
      company_website, industry,
      required_skills, preferred_skills, technical_skills, soft_skills,
      required_experience, preferred_qualifications, certifications, licenses,
      responsibilities, key_responsibilities,
      role_overview, day_to_day_activities, long_term_goals,
      team_information, reports_to, travel_requirements,
      relocation_requirements, physical_requirements, shift_schedule,
      salary_min, salary_max, salary_grade,
      performance_bonuses, signing_bonus, health_benefits,
      retirement_plan, paid_time_off, flexible_hours,
      remote_work_options, other_perks,
      screening_questions,
      resume_required, cover_letter_required, portfolio_required,
      application_deadline, expected_start_date, recruitment_timeline,
      contact_phone, contact_email,
      job_poster, hiring_manager, job_expiration, number_of_openings,
      equal_opportunity_statement, ada_compliance,
      legal_disclosures, background_check_required,
      reason_for_vacancy, budget_code, resume_scoring,
    } = req.body;

    // Validate mandatory fields
    if (!job_title || !job_description || !location || !postal_code || !country ||
      !work_setting || !employment_type || !company_website ||
      !required_skills || !responsibilities || !key_responsibilities ||
      !contact_email || !equal_opportunity_statement)
      return res.status(400).json({ message: 'Missing mandatory fields' });

    // Validate contract_duration only for contract type
    if (employment_type === 'Contract' && contract_duration === undefined)
      return res.status(400).json({ message: 'Contract duration required for Contract employment type' });

    // Validate dates
    if (job_expiration) {
      const exp = new Date(job_expiration);
      if (exp < new Date()) return res.status(400).json({ message: 'Expiry date cannot be in the past' });
    }
    if (application_deadline && job_expiration) {
      if (new Date(application_deadline) > new Date(job_expiration))
        return res.status(400).json({ message: 'Application deadline cannot be after job expiry' });
    }

    const result = await pool.query(
      `INSERT INTO company_jobs (
        company_id, company_name,
        job_title, job_description, location, postal_code, country,
        job_code, department, functional_area,
        work_setting, employment_type,
        experience_min_years, experience_min_months,
        experience_max_years, experience_max_months,
        duration, contract_duration,
        company_website, industry,
        required_skills, preferred_skills, technical_skills, soft_skills,
        required_experience, preferred_qualifications, certifications, licenses,
        responsibilities, key_responsibilities,
        role_overview, day_to_day_activities, long_term_goals,
        team_information, reports_to, travel_requirements,
        relocation_requirements, physical_requirements, shift_schedule,
        salary_min, salary_max, salary_grade,
        performance_bonuses, signing_bonus, health_benefits,
        retirement_plan, paid_time_off, flexible_hours,
        remote_work_options, other_perks,
        screening_questions,
        resume_required, cover_letter_required, portfolio_required,
        application_deadline, expected_start_date, recruitment_timeline,
        contact_phone, contact_email,
        job_poster, hiring_manager, expiry_date, number_of_openings,
        equal_opportunity_statement, ada_compliance,
        legal_disclosures, background_check_required,
        reason_for_vacancy, budget_code, resume_scoring,
        status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
        $35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66,
        $67,$68,$69,$70,'active'
      ) RETURNING id`,
      [
        companyId, comp.rows[0].company_name,
        job_title, job_description, location, postal_code, country,
        job_code || null, department || null, functional_area || null,
        work_setting, employment_type,
        experience_min_years || 0, experience_min_months || 0,
        experience_max_years || null, experience_max_months || null,
        duration || null, contract_duration || null,
        company_website, industry || null,
        required_skills, preferred_skills || null, technical_skills || null, soft_skills || null,
        required_experience || null, preferred_qualifications || null,
        certifications || null, licenses || null,
        responsibilities, key_responsibilities,
        role_overview || null, day_to_day_activities || null, long_term_goals || null,
        team_information || null, reports_to || null, travel_requirements || null,
        relocation_requirements || null, physical_requirements || null, shift_schedule || null,
        salary_min || null, salary_max || null, salary_grade || null,
        performance_bonuses || null, signing_bonus || null, health_benefits || null,
        retirement_plan || null, paid_time_off || null, flexible_hours || null,
        remote_work_options || null, other_perks || null,
        JSON.stringify(screening_questions || []),
        resume_required !== false, cover_letter_required || false, portfolio_required || false,
        application_deadline || null, expected_start_date || null, recruitment_timeline || null,
        contact_phone || null, contact_email,
        job_poster || null, hiring_manager || null, job_expiration || null,
        number_of_openings || null,
        equal_opportunity_statement, ada_compliance || null,
        legal_disclosures || null, background_check_required || false,
        reason_for_vacancy || null, budget_code || null,
        resume_scoring || null,
      ]
    );

    return res.status(201).json({ message: 'Job posted', job_id: result.rows[0].id });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('createJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// ── Update Job ─────────────────────────────────────────────────
const updateJob = async (req, res) => {
  const { id } = req.params;
  try {
    const companyId = await getCompanyId(req.user.id);

    // Verify ownership
    const ownership = await pool.query(
      `SELECT id FROM company_jobs WHERE id=$1 AND company_id=$2`,
      [id, companyId]
    );
    if (ownership.rows.length === 0)
      return res.status(404).json({ message: 'Job not found or not authorized' });

    const {
      job_title, job_description, location, postal_code, country,
      job_code, department, functional_area,
      work_setting, employment_type,
      experience_min_years, experience_max_years,
      company_website, industry,
      required_skills, preferred_skills, technical_skills, soft_skills,
      key_responsibilities, responsibilities,
      salary_min, salary_max,
      contact_email, contact_phone,
      screening_questions,
      cover_letter_required, portfolio_required,
      background_check_required,
      application_deadline, expected_start_date, job_expiration,
      number_of_openings, equal_opportunity_statement,
      status,
    } = req.body;

    await pool.query(
      `UPDATE company_jobs SET
        job_title = COALESCE($1, job_title),
        job_description = COALESCE($2, job_description),
        location = COALESCE($3, location),
        postal_code = COALESCE($4, postal_code),
        country = COALESCE($5, country),
        job_code = COALESCE($6, job_code),
        department = COALESCE($7, department),
        functional_area = COALESCE($8, functional_area),
        work_setting = COALESCE($9, work_setting),
        employment_type = COALESCE($10, employment_type),
        experience_min_years = COALESCE($11, experience_min_years),
        experience_max_years = COALESCE($12, experience_max_years),
        company_website = COALESCE($13, company_website),
        industry = COALESCE($14, industry),
        required_skills = COALESCE($15, required_skills),
        preferred_skills = COALESCE($16, preferred_skills),
        technical_skills = COALESCE($17, technical_skills),
        soft_skills = COALESCE($18, soft_skills),
        key_responsibilities = COALESCE($19, key_responsibilities),
        responsibilities = COALESCE($20, responsibilities),
        salary_min = COALESCE($21, salary_min),
        salary_max = COALESCE($22, salary_max),
        contact_email = COALESCE($23, contact_email),
        contact_phone = COALESCE($24, contact_phone),
        screening_questions = COALESCE($25, screening_questions),
        cover_letter_required = COALESCE($26, cover_letter_required),
        portfolio_required = COALESCE($27, portfolio_required),
        background_check_required = COALESCE($28, background_check_required),
        application_deadline = COALESCE($29, application_deadline),
        expected_start_date = COALESCE($30, expected_start_date),
        expiry_date = COALESCE($31, expiry_date),
        number_of_openings = COALESCE($32, number_of_openings),
        equal_opportunity_statement = COALESCE($33, equal_opportunity_statement),
        status = COALESCE($34, status),
        updated_at = now()
      WHERE id=$35`,
      [
        job_title, job_description, location, postal_code, country,
        job_code, department, functional_area,
        work_setting, employment_type,
        experience_min_years, experience_max_years,
        company_website, industry,
        required_skills, preferred_skills, technical_skills, soft_skills,
        key_responsibilities, responsibilities,
        salary_min, salary_max,
        contact_email, contact_phone,
        screening_questions ? JSON.stringify(screening_questions) : undefined,
        cover_letter_required, portfolio_required,
        background_check_required,
        application_deadline || null,
        expected_start_date || null,
        job_expiration || null,
        number_of_openings,
        equal_opportunity_statement,
        status,
        id,
      ]
    );

    const updated = await pool.query(
      `SELECT cj.*, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       WHERE cj.id=$1 GROUP BY cj.id`,
      [id]
    );
    return res.json({ message: 'Job updated', job: updated.rows[0] });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('updateJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// ── List Jobs (company) ────────────────────────────────────────
const listJobs = async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    const result = await pool.query(
      `SELECT cj.*, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       WHERE cj.company_id=$1
       GROUP BY cj.id
       ORDER BY cj.posted_at DESC`,
      [companyId]
    );
    return res.json({ jobs: result.rows });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('listJobs:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get Job ────────────────────────────────────────────────────
const getJob = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT cj.*, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       WHERE cj.id=$1 GROUP BY cj.id`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Job not found' });
    return res.json({ job: result.rows[0] });
  } catch (err) {
    console.error('getJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Delete Job ─────────────────────────────────────────────────
const deleteJob = async (req, res) => {
  const { id } = req.params;
  try {
    const companyId = await getCompanyId(req.user.id);
    const result = await pool.query(
      `DELETE FROM company_jobs WHERE id=$1 AND company_id=$2 RETURNING id`,
      [id, companyId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Job not found or not authorized' });
    return res.json({ message: 'Job deleted' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('deleteJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get Applicants for a Job ───────────────────────────────────
const getJobApplicants = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ja.id, ja.status, ja.applied_at, ja.resume_url,
              ja.cover_letter_url, ja.portfolio_url,
              u.email as applicant_email,
              COALESCE(pd.first_name || ' ' || pd.last_name, u.email) as applicant_name
       FROM job_applications ja
       JOIN users u ON u.id = ja.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE ja.job_id=$1
       ORDER BY ja.applied_at DESC`,
      [id]
    );
    return res.json({ applicants: result.rows });
  } catch (err) {
    console.error('getJobApplicants:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Update Applicant Status ────────────────────────────────────
const updateApplicantStatus = async (req, res) => {
  const { jobId, applicantId } = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ['Submitted','Application Viewed','In Review','Interviewing','Rejected','Offer'];
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  try {
    // Get current status
    const current = await pool.query(
      `SELECT status FROM job_applications WHERE id=$1 AND job_id=$2`,
      [applicantId, jobId]
    );
    if (current.rows.length === 0)
      return res.status(404).json({ message: 'Application not found' });

    const currentStatus = current.rows[0].status;
    const currentIdx = VALID_STATUSES.indexOf(currentStatus);
    const newIdx = VALID_STATUSES.indexOf(status);

    // Cannot move back to Submitted once progressed
    if (status === 'Submitted' && currentIdx > 0)
      return res.status(400).json({ message: 'Cannot move back to Submitted' });
    // Cannot move to earlier status (except Rejected which can always be set)
    if (newIdx < currentIdx && status !== 'Rejected')
      return res.status(400).json({ message: 'Cannot move to a previous status' });

    await pool.query(
      `UPDATE job_applications SET status=$1, updated_at=now() WHERE id=$2`,
      [status, applicantId]
    );
    return res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('updateApplicantStatus:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get All Applications (company-wide) ───────────────────────
const getAllApplications = async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    const result = await pool.query(
      `SELECT ja.id, ja.status, ja.applied_at, ja.resume_url, ja.cover_letter_url,
              ja.portfolio_url, ja.job_id, cj.job_title,
              u.email as applicant_email,
              COALESCE(pd.first_name || ' ' || pd.last_name, u.email) as applicant_name
       FROM job_applications ja
       JOIN company_jobs cj ON cj.id = ja.job_id
       JOIN users u ON u.id = ja.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE cj.company_id=$1
       ORDER BY ja.applied_at DESC`,
      [companyId]
    );
    return res.json({ applications: result.rows });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('getAllApplications:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Public: List Jobs (for user job search) ───────────────────
const publicListJobs = async (req, res) => {
  const { title, location, work_setting, industry, company, experience_level, employment_type } = req.query;
  try {
    const result = await pool.query(
      `SELECT cj.id, cj.job_title, cj.company_name, cj.location, cj.work_setting,
              cj.employment_type, cj.salary_min, cj.salary_max,
              cj.experience_min_years, cj.experience_max_years,
              cj.posted_at, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       JOIN companies c ON c.id = cj.company_id
       WHERE cj.status='active'
         AND c.status='approved'
         AND ($1::text IS NULL OR cj.job_title ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR cj.location ILIKE '%' || $2 || '%')
         AND ($3::text IS NULL OR cj.work_setting=$3)
         AND ($4::text IS NULL OR cj.industry ILIKE '%' || $4 || '%')
         AND ($5::text IS NULL OR cj.company_name ILIKE '%' || $5 || '%')
         AND ($6::text IS NULL OR cj.employment_type=$6)
       GROUP BY cj.id
       ORDER BY cj.posted_at DESC`,
      [title || null, location || null, work_setting || null,
       industry || null, company || null, employment_type || null]
    );
    return res.json({ jobs: result.rows });
  } catch (err) {
    console.error('publicListJobs:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Public: Get Job Detail ────────────────────────────────────
const publicGetJob = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT cj.id, cj.job_title, cj.company_name, cj.location, cj.country,
              cj.work_setting, cj.employment_type, cj.job_description,
              cj.required_skills, cj.preferred_skills, cj.responsibilities,
              cj.key_responsibilities, cj.salary_min, cj.salary_max,
              cj.experience_min_years, cj.experience_max_years,
              cj.application_deadline, cj.expected_start_date,
              cj.contact_email, cj.contact_phone,
              cj.resume_required, cj.cover_letter_required, cj.portfolio_required,
              cj.screening_questions, cj.equal_opportunity_statement,
              cj.background_check_required, cj.number_of_openings,
              cj.posted_at, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       WHERE cj.id=$1 AND cj.status='active'
       GROUP BY cj.id`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Job not found' });
    return res.json({ job: result.rows[0] });
  } catch (err) {
    console.error('publicGetJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Apply to Job ────────────────────────────────────────
const applyToJob = async (req, res) => {
  const { id } = req.params;
  const { portfolio_url, answers } = req.body;
const resumeFile = req.files?.resume?.[0];
const coverFile = req.files?.cover_letter?.[0];
if (!resumeFile)
  return res.status(400).json({ message: 'Resume is required' });
const resume_url = `/uploads/resumes/${resumeFile.filename}`;
const cover_letter_url = coverFile ? `/uploads/resumes/${coverFile.filename}` : null;
const screening_answers = answers ? JSON.parse(answers) : {};

  try {
    // Check already applied
    const existing = await pool.query(
      `SELECT id FROM job_applications WHERE job_id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'You have already applied to this job' });

    // Check job exists and active
    const job = await pool.query(
      `SELECT id FROM company_jobs WHERE id=$1 AND status='active'`, [id]
    );
    if (job.rows.length === 0)
      return res.status(404).json({ message: 'Job not found or no longer active' });

    await pool.query(
      `INSERT INTO job_applications
         (job_id, user_id, resume_url, cover_letter_url, portfolio_url, screening_answers, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Submitted')`,
      [id, req.user.id, resume_url, cover_letter_url || null,
       portfolio_url || null, JSON.stringify(screening_answers)]
    );
    return res.status(201).json({ message: 'Application submitted' });
  } catch (err) {
    console.error('applyToJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Application Tracker ─────────────────────────────────
const getUserApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ja.id, ja.job_id, cj.job_title, cj.company_name, ja.applied_at, ja.status
 FROM job_applications ja
 JOIN company_jobs cj ON cj.id = ja.job_id
 WHERE ja.user_id=$1
 ORDER BY ja.applied_at DESC`,
      [req.user.id]
    );
    return res.json({ applications: result.rows });
  } catch (err) {
    console.error('getUserApplications:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Save / Unsave Job ───────────────────────────────────
const saveJob = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      `SELECT id FROM saved_jobs WHERE job_id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (existing.rows.length > 0) {
      await pool.query(`DELETE FROM saved_jobs WHERE job_id=$1 AND user_id=$2`, [id, req.user.id]);
      return res.json({ message: 'Job removed from saved', saved: false });
    }
    await pool.query(`INSERT INTO saved_jobs (job_id, user_id) VALUES ($1,$2)`, [id, req.user.id]);
    return res.json({ message: 'Job saved', saved: true });
  } catch (err) {
    console.error('saveJob:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Get Saved Jobs ──────────────────────────────────────
const getSavedJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sj.id, cj.id as job_id, cj.job_title, cj.company_name,
              cj.location, cj.work_setting, cj.employment_type, sj.saved_at
       FROM saved_jobs sj
       JOIN company_jobs cj ON cj.id = sj.job_id
       WHERE sj.user_id=$1
       ORDER BY sj.saved_at DESC`,
      [req.user.id]
    );
    return res.json({ saved_jobs: result.rows });
  } catch (err) {
    console.error('getSavedJobs:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Admin: View all job postings ──────────────────────────────
const adminListJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cj.*, c.company_name as co_name, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       JOIN companies c ON c.id = cj.company_id
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       GROUP BY cj.id, c.company_name
       ORDER BY cj.posted_at DESC`
    );
    return res.json({ jobs: result.rows });
  } catch (err) {
    console.error('adminListJobs:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createJob, listJobs, getJob, deleteJob, updateJob,
  getJobApplicants, updateApplicantStatus, getAllApplications,
  publicListJobs, publicGetJob,
  applyToJob, getUserApplications, saveJob, getSavedJobs,
  adminListJobs,
};
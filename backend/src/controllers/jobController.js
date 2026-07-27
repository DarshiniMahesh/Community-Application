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

    const comp = await pool.query(
      `SELECT company_name, website, company_category FROM companies WHERE id=$1`, [companyId]
    );
    const companyName = comp.rows[0].company_name;
    const companyWebsite = comp.rows[0].website;
    const industry = comp.rows[0].company_category;

    const {
      job_title, job_description, location, postal_code, country,
      job_code, department, functional_area,
      certifications,
      work_setting, employment_type,
      experience_min_years, experience_min_months,
      experience_max_years, experience_max_months,
      duration, contract_duration,
      salary_min, salary_max, salary_grade,
      bonuses_offered, bonus_details, other_perks,
      screening_questions,
      resume_required, cover_letter_required, portfolio_required,
      application_deadline, expected_start_date, recruitment_timeline,
      contact_phone, contact_email,
      job_poster, hiring_manager, number_of_openings,
      equal_opportunity_statement, ada_compliance,
      legal_disclosures, background_check_required,
      reason_for_vacancy, budget_code,
    } = req.body;

    if (!job_title || !job_description || !location || !postal_code || !country ||
      !work_setting || !employment_type || !contact_email || !equal_opportunity_statement)
      return res.status(400).json({ message: 'Missing mandatory fields' });

    if (employment_type === 'Contract' && contract_duration === undefined)
      return res.status(400).json({ message: 'Contract duration required for Contract employment type' });

    const result = await pool.query(
      `INSERT INTO company_jobs (
        company_id, company_name,
        job_title, job_description, location, postal_code, country,
        job_code, department, functional_area, certifications,
        work_setting, employment_type,
        experience_min_years, experience_min_months,
        experience_max_years, experience_max_months,
        duration, contract_duration,
        company_website, industry,
        salary_min, salary_max, salary_grade,
        bonuses_offered, bonus_details, other_perks,
        screening_questions,
        resume_required, cover_letter_required, portfolio_required,
        application_deadline, expected_start_date, recruitment_timeline,
        contact_phone, contact_email,
        job_poster, hiring_manager, number_of_openings,
        equal_opportunity_statement, ada_compliance,
        legal_disclosures, background_check_required,
        reason_for_vacancy, budget_code,
        status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        $37,$38,$39,$40,$41,$42,$43,$44,$45,'active'
      ) RETURNING id`,
      [
        companyId, companyName,
        job_title, job_description, location, postal_code, country,
        job_code || null, department || null, functional_area || null,
        certifications && certifications.length ? certifications.join(', ') : null,
        work_setting, employment_type,
        experience_min_years || 0, experience_min_months || 0,
        experience_max_years || null, experience_max_months || null,
        duration || null, contract_duration || null,
        companyWebsite || null, industry || null,
        salary_min || null, salary_max || null, salary_grade || null,
        bonuses_offered || false, bonus_details || null, other_perks || null,
        JSON.stringify(screening_questions || []),
        resume_required !== false, cover_letter_required || false, portfolio_required || false,
        application_deadline || null, expected_start_date || null, recruitment_timeline || null,
        contact_phone || null, contact_email,
        job_poster || null, hiring_manager || null, number_of_openings || null,
        equal_opportunity_statement, ada_compliance || null,
        legal_disclosures || null, background_check_required || false,
        reason_for_vacancy || null, budget_code || null,
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

    const ownership = await pool.query(
      `SELECT id FROM company_jobs WHERE id=$1 AND company_id=$2`,
      [id, companyId]
    );
    if (ownership.rows.length === 0)
      return res.status(404).json({ message: 'Job not found or not authorized' });

    const {
      job_title, job_description, location, postal_code, country,
      job_code, department, functional_area, certifications,
      work_setting, employment_type,
      experience_min_years, experience_max_years,
      salary_min, salary_max,
      bonuses_offered, bonus_details,
      contact_email, contact_phone,
      screening_questions,
      cover_letter_required, portfolio_required,
      background_check_required,
      application_deadline, expected_start_date,
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
        certifications = COALESCE($9, certifications),
        work_setting = COALESCE($10, work_setting),
        employment_type = COALESCE($11, employment_type),
        experience_min_years = COALESCE($12, experience_min_years),
        experience_max_years = COALESCE($13, experience_max_years),
        salary_min = COALESCE($14, salary_min),
        salary_max = COALESCE($15, salary_max),
        bonuses_offered = COALESCE($16, bonuses_offered),
        bonus_details = COALESCE($17, bonus_details),
        contact_email = COALESCE($18, contact_email),
        contact_phone = COALESCE($19, contact_phone),
        screening_questions = COALESCE($20, screening_questions),
        cover_letter_required = COALESCE($21, cover_letter_required),
        portfolio_required = COALESCE($22, portfolio_required),
        background_check_required = COALESCE($23, background_check_required),
        application_deadline = COALESCE($24, application_deadline),
        expected_start_date = COALESCE($25, expected_start_date),
        number_of_openings = COALESCE($26, number_of_openings),
        equal_opportunity_statement = COALESCE($27, equal_opportunity_statement),
        status = COALESCE($28, status),
        updated_at = now()
      WHERE id=$29`,
      [
        job_title, job_description, location, postal_code, country,
        job_code, department, functional_area,
        Array.isArray(certifications) ? certifications.join(', ') : certifications,
        work_setting, employment_type,
        experience_min_years, experience_max_years,
        salary_min, salary_max,
        bonuses_offered, bonus_details,
        contact_email, contact_phone,
        screening_questions ? JSON.stringify(screening_questions) : undefined,
        cover_letter_required, portfolio_required,
        background_check_required,
        application_deadline || null,
        expected_start_date || null,
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
              ja.cover_letter_url, ja.portfolio_url, ja.resume_score,
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
    const current = await pool.query(
      `SELECT status FROM job_applications WHERE id=$1 AND job_id=$2`,
      [applicantId, jobId]
    );
    if (current.rows.length === 0)
      return res.status(404).json({ message: 'Application not found' });

    const currentStatus = current.rows[0].status;
    const currentIdx = VALID_STATUSES.indexOf(currentStatus);
    const newIdx = VALID_STATUSES.indexOf(status);

    if (status === 'Submitted' && currentIdx > 0)
      return res.status(400).json({ message: 'Cannot move back to Submitted' });
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

// ── Set Resume Score (one-time only, then frozen) ──────────────
const setResumeScore = async (req, res) => {
  const { jobId, applicantId } = req.params;
  const { resume_score } = req.body;

  const score = Number(resume_score);
  if (resume_score === undefined || resume_score === null || Number.isNaN(score) || score < 0 || score > 100)
    return res.status(400).json({ message: 'Resume score must be a number between 0 and 100' });

  try {
    const existing = await pool.query(
      `SELECT resume_score FROM job_applications WHERE id=$1 AND job_id=$2`,
      [applicantId, jobId]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ message: 'Application not found' });
    if (existing.rows[0].resume_score !== null)
      return res.status(409).json({ message: 'Resume score has already been set and cannot be changed' });

    await pool.query(
      `UPDATE job_applications SET resume_score=$1, updated_at=now() WHERE id=$2`,
      [score, applicantId]
    );
    return res.json({ message: 'Resume score set', resume_score: score });
  } catch (err) {
    console.error('setResumeScore:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get All Applications (company-wide) ───────────────────────
const getAllApplications = async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    const result = await pool.query(
      `SELECT ja.id, ja.status, ja.applied_at, ja.resume_url, ja.cover_letter_url,
              ja.portfolio_url, ja.resume_score, ja.job_id, cj.job_title,
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
              cj.department, cj.functional_area, cj.certifications,
              cj.work_setting, cj.employment_type, cj.job_description,
              cj.salary_min, cj.salary_max,
              cj.experience_min_years, cj.experience_max_years,
              cj.bonuses_offered, cj.bonus_details, cj.other_perks,
              cj.application_deadline, cj.expected_start_date,
              cj.contact_email, cj.contact_phone, cj.company_website, cj.industry,
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

  const screening_answers = answers ? JSON.parse(answers) : {};
  const BUCKET = 'resumes';

  try {
    const existing = await pool.query(
      `SELECT id FROM job_applications WHERE job_id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'You have already applied to this job' });

    const job = await pool.query(
      `SELECT id FROM company_jobs WHERE id=$1 AND status='active'`, [id]
    );
    if (job.rows.length === 0)
      return res.status(404).json({ message: 'Job not found or no longer active' });

    // ── Upload resume to Supabase Storage ──────────────────────
    const resumeExt = resumeFile.originalname.split('.').pop();
    const resumePath = `resume_${req.user.id}_${Date.now()}.${resumeExt}`;
    const { error: resumeUploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(resumePath, resumeFile.buffer, { contentType: resumeFile.mimetype });
    if (resumeUploadErr) throw resumeUploadErr;
    const { data: resumePublicUrl } = supabase.storage.from(BUCKET).getPublicUrl(resumePath);
    const resume_url = resumePublicUrl.publicUrl;

    // ── Upload cover letter (if provided) ──────────────────────
    let cover_letter_url = null;
    if (coverFile) {
      const coverExt = coverFile.originalname.split('.').pop();
      const coverPath = `cover_${req.user.id}_${Date.now()}.${coverExt}`;
      const { error: coverUploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(coverPath, coverFile.buffer, { contentType: coverFile.mimetype });
      if (coverUploadErr) throw coverUploadErr;
      const { data: coverPublicUrl } = supabase.storage.from(BUCKET).getPublicUrl(coverPath);
      cover_letter_url = coverPublicUrl.publicUrl;
    }

    await pool.query(
      `INSERT INTO job_applications
         (job_id, user_id, resume_url, cover_letter_url, portfolio_url, screening_answers, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Submitted')`,
      [id, req.user.id, resume_url, cover_letter_url,
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

// ── Admin: View all job postings (optionally scoped to one company) ───
const adminListJobs = async (req, res) => {
  const { company_id } = req.query;
  try {
    const result = await pool.query(
      `SELECT cj.*, c.company_name as co_name, COUNT(ja.id) as applicant_count
       FROM company_jobs cj
       JOIN companies c ON c.id = cj.company_id
       LEFT JOIN job_applications ja ON ja.job_id = cj.id
       WHERE ($1::uuid IS NULL OR cj.company_id = $1)
       GROUP BY cj.id, c.company_name
       ORDER BY cj.posted_at DESC`,
      [company_id || null]
    );
    return res.json({ jobs: result.rows });
  } catch (err) {
    console.error('adminListJobs:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createJob, listJobs, getJob, deleteJob, updateJob,
  getJobApplicants, updateApplicantStatus, setResumeScore, getAllApplications,
  publicListJobs, publicGetJob,
  applyToJob, getUserApplications, saveJob, getSavedJobs,
  adminListJobs,
};
const pool = require('../config/db');

// ── User: Post Referral ───────────────────────────────────────
const createReferral = async (req, res) => {
  const {
    job_title, company_name, location, work_type, employment_type,
    job_posting_url, job_reference_number, job_description,
    application_deadline, message_for_applicants,
    // optional
    experience_level_required, salary_range,
    key_skills_required, benefits_highlights,
    brief_job_description, why_join, who_to_contact,
    personal_note, tags,
  } = req.body;

  // Mandatory fields
  if (!job_title || !location || !work_type || !employment_type ||
    !job_posting_url || !job_reference_number || !job_description ||
    !message_for_applicants)
    return res.status(400).json({ message: 'Missing mandatory referral fields' });

  // Validate URL
  try { new URL(job_posting_url); } catch {
    return res.status(400).json({ message: 'Job Posting URL must be a valid URL' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO job_referrals (
        user_id, job_title, company_name, location, work_type, employment_type,
        job_posting_url, job_reference_number, job_description,
        application_deadline, message_for_applicants,
        experience_level_required, salary_range, key_skills_required,
        benefits_highlights, brief_job_description, why_join,
        who_to_contact, personal_note, tags, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pending')
      RETURNING id`,
      [
        req.user.id,
        job_title,
        company_name || null,
        location,
        work_type,
        employment_type,
        job_posting_url,
        job_reference_number,
        job_description,
        application_deadline || null,
        message_for_applicants,
        experience_level_required || null,
        salary_range || null,
        key_skills_required || null,
        benefits_highlights || null,
        brief_job_description || null,
        why_join || null,
        who_to_contact || null,
        personal_note || null,
        Array.isArray(tags) ? tags : (tags ? [tags] : []),
      ]
    );
    return res.status(201).json({ message: 'Referral submitted for moderation', id: result.rows[0].id });
  } catch (err) {
    console.error('createReferral:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Get my referrals (with applicant counts) ─────────────
const getMyReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jr.*, COUNT(ra.id) as applicant_count
       FROM job_referrals jr
       LEFT JOIN referral_applications ra ON ra.referral_id = jr.id
       WHERE jr.user_id=$1
       GROUP BY jr.id
       ORDER BY jr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ referrals: result.rows });
  } catch (err) {
    console.error('getMyReferrals:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Public: List approved referrals ──────────────────────────
const listApprovedReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jr.*, u.email as posted_by_email
       FROM job_referrals jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.status='approved'
       ORDER BY jr.created_at DESC`
    );
    return res.json({ referrals: result.rows });
  } catch (err) {
    console.error('listApprovedReferrals:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Moderator: List referrals by status ───────────────────────
const moderatorListReferrals = async (req, res) => {
  const { status } = req.query;
  try {
    const result = await pool.query(
      `SELECT jr.*, u.email as posted_by_email
       FROM job_referrals jr
       JOIN users u ON u.id = jr.user_id
       WHERE ($1::text IS NULL OR jr.status=$1)
       ORDER BY jr.created_at DESC`,
      [status || null]
    );
    return res.json({ referrals: result.rows });
  } catch (err) {
    console.error('moderatorListReferrals:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Moderator: Approve referral ───────────────────────────────
const approveReferral = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE job_referrals SET status='approved', moderated_by=$1, moderated_at=now()
       WHERE id=$2 RETURNING id`,
      [req.user.id, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Referral not found' });
    return res.json({ message: 'Referral approved' });
  } catch (err) {
    console.error('approveReferral:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Moderator: Reject referral ────────────────────────────────
const rejectReferral = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE job_referrals SET status='rejected', rejection_reason=$1,
       moderated_by=$2, moderated_at=now()
       WHERE id=$3 RETURNING id`,
      [reason || null, req.user.id, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Referral not found' });
    return res.json({ message: 'Referral rejected' });
  } catch (err) {
    console.error('rejectReferral:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Apply to a referral ──────────────────────────────────
const applyToReferral = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      `SELECT id FROM referral_applications WHERE referral_id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'Already applied' });

    await pool.query(
      `INSERT INTO referral_applications (referral_id, user_id) VALUES ($1,$2)`,
      [id, req.user.id]
    );
    return res.status(201).json({ message: 'Applied successfully' });
  } catch (err) {
    console.error('applyToReferral:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Get applicants for a referral ────────────────────────
const getReferralApplicants = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ra.id, ra.status, ra.applied_at,
              u.email, COALESCE(pd.first_name||' '||pd.last_name, u.email) as name
       FROM referral_applications ra
       JOIN users u ON u.id = ra.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE ra.referral_id=$1 ORDER BY ra.applied_at DESC`,
      [id]
    );
    return res.json({ applicants: result.rows });
  } catch (err) {
    console.error('getReferralApplicants:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Referrer: Update applicant status (approve/reject) ─────────
const updateReferralApplicantStatus = async (req, res) => {
  const { id, applicantId } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'applied'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  try {
    // Verify the referral belongs to this user
    const referral = await pool.query(
      `SELECT id FROM job_referrals WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (referral.rows.length === 0)
      return res.status(403).json({ message: 'Not authorized to manage this referral' });

    const result = await pool.query(
      `UPDATE referral_applications SET status=$1 WHERE id=$2 AND referral_id=$3 RETURNING id`,
      [status, applicantId, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Applicant not found' });

    return res.json({ message: 'Applicant status updated' });
  } catch (err) {
    console.error('updateReferralApplicantStatus:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── User: Get my referral applications (status check) ──────────
const getMyReferralApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ra.id, ra.referral_id, ra.status, ra.applied_at, jr.job_title, jr.company_name
       FROM referral_applications ra
       JOIN job_referrals jr ON jr.id = ra.referral_id
       WHERE ra.user_id=$1
       ORDER BY ra.applied_at DESC`,
      [req.user.id]
    );
    return res.json({ applications: result.rows });
  } catch (err) {
    console.error('getMyReferralApplications:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createReferral, getMyReferrals, listApprovedReferrals,
  moderatorListReferrals, approveReferral, rejectReferral,
  applyToReferral, getReferralApplicants,
  updateReferralApplicantStatus, getMyReferralApplications,
};
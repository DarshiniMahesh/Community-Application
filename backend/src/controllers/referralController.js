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

// ── User: Get my referrals ─────────────────────────────────────
const getMyReferrals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM job_referrals WHERE user_id=$1 ORDER BY created_at DESC`,
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

module.exports = {
  createReferral, getMyReferrals, listApprovedReferrals,
  moderatorListReferrals, approveReferral, rejectReferral,
};
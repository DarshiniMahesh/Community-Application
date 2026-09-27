const pool = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BUCKET = 'resumes';
const MAX_RESUMES = 5;

// ── List saved resumes ──────────────────────────────────────────
const listResumes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, file_name, resume_url, file_size, is_default, uploaded_at
       FROM user_resumes WHERE user_id=$1 ORDER BY uploaded_at DESC`,
      [req.user.id]
    );
    return res.json({ resumes: result.rows });
  } catch (err) {
    console.error('listResumes:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Upload a new resume into the library ────────────────────────
const uploadResume = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'A resume file is required' });

  try {
    const count = await pool.query(`SELECT COUNT(*) FROM user_resumes WHERE user_id=$1`, [req.user.id]);
    if (Number(count.rows[0].count) >= MAX_RESUMES)
      return res.status(409).json({ message: `You can save up to ${MAX_RESUMES} resumes. Delete one first.` });

    const ext = file.originalname.split('.').pop();
    const storagePath = `resume_${req.user.id}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });
    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const makeDefault = count.rows[0].count === '0'; // first resume becomes the default automatically
    if (makeDefault) {
      await pool.query(`UPDATE user_resumes SET is_default=false WHERE user_id=$1`, [req.user.id]);
    }

    const inserted = await pool.query(
      `INSERT INTO user_resumes (user_id, file_name, resume_url, storage_path, file_size, is_default)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, file_name, resume_url, file_size, is_default, uploaded_at`,
      [req.user.id, file.originalname, publicUrlData.publicUrl, storagePath, file.size, makeDefault]
    );

    return res.status(201).json({ message: 'Resume uploaded', resume: inserted.rows[0] });
  } catch (err) {
    console.error('uploadResume:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Delete a resume from the library ────────────────────────────
const deleteResume = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      `SELECT storage_path, is_default FROM user_resumes WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ message: 'Resume not found' });

    await supabase.storage.from(BUCKET).remove([existing.rows[0].storage_path]);
    await pool.query(`DELETE FROM user_resumes WHERE id=$1`, [id]);

    // If the deleted resume was the default, promote the most recent remaining one
    if (existing.rows[0].is_default) {
      const remaining = await pool.query(
        `SELECT id FROM user_resumes WHERE user_id=$1 ORDER BY uploaded_at DESC LIMIT 1`,
        [req.user.id]
      );
      if (remaining.rows.length > 0)
        await pool.query(`UPDATE user_resumes SET is_default=true WHERE id=$1`, [remaining.rows[0].id]);
    }

    return res.json({ message: 'Resume deleted' });
  } catch (err) {
    console.error('deleteResume:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Set a resume as the default (pre-selected when applying) ───
const setDefaultResume = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      `SELECT id FROM user_resumes WHERE id=$1 AND user_id=$2`, [id, req.user.id]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ message: 'Resume not found' });

    await pool.query(`UPDATE user_resumes SET is_default=false WHERE user_id=$1`, [req.user.id]);
    await pool.query(`UPDATE user_resumes SET is_default=true WHERE id=$1`, [id]);

    return res.json({ message: 'Default resume updated' });
  } catch (err) {
    console.error('setDefaultResume:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { listResumes, uploadResume, deleteResume, setDefaultResume };
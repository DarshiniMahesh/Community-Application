// Community-Application\backend\src\controllers\careerProfileController.js
const pool = require('../config/db');

// ── Limits (mirrored on the frontend) ──────────────────────────
const LIMITS = {
  TITLE_MAX: 150,
  BIO_MAX: 1000,
  URL_MAX: 500,
  OTHER_LINKS_MAX: 5,
  EXPERIENCES_MAX: 20,
  NAME_MAX: 150,
  RESP_LINES_MAX: 4,
  RESP_LINE_CHARS_MAX: 250,
  EMAIL_MAX: 254,
  PHONE_MAX: 15,
  COUNTRY_CODE_MAX: 5,
};

const bad = (message) => ({ status: 400, message });

// ── Validation helpers ─────────────────────────────────────────
function cleanText(v, max, label) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.length > max) throw bad(`${label} must be at most ${max} characters`);
  return s;
}

function cleanUrl(v, label) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim();
  if (!s) return null;
  if (s.length > LIMITS.URL_MAX) throw bad(`${label} is too long`);
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = new URL(s); } catch { throw bad(`${label} is not a valid URL`); }
  if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.'))
    throw bad(`${label} is not a valid URL`);
  return u.toString();
}

function cleanEmail(v, label) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (s.length > LIMITS.EMAIL_MAX) throw bad(`${label} is too long`);
  // Simple, deliberately permissive RFC-ish check — real verification happens via OTP/email-verify elsewhere.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad(`${label} is not a valid email address`);
  return s;
}

function cleanPhone(v, label) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > LIMITS.PHONE_MAX)
    throw bad(`${label} must be a valid phone number`);
  return digits;
}

function cleanCountryCode(v, label) {
  if (v === undefined || v === null) return '+91';
  const s = String(v).trim();
  if (!s) return '+91';
  if (!/^\+\d{1,4}$/.test(s) || s.length > LIMITS.COUNTRY_CODE_MAX)
    throw bad(`${label} must look like +91`);
  return s;
}

function cleanDate(v, label) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw bad(`${label} must be a valid date`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s)
    throw bad(`${label} must be a valid date`);
  return s;
}

function cleanResponsibilities(v, label) {
  if (v === undefined || v === null) return null;
  const lines = String(v)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length > LIMITS.RESP_LINES_MAX)
    throw bad(`${label}: at most ${LIMITS.RESP_LINES_MAX} lines allowed`);
  if (lines.some((l) => l.length > LIMITS.RESP_LINE_CHARS_MAX))
    throw bad(`${label}: each line must be at most ${LIMITS.RESP_LINE_CHARS_MAX} characters`);
  return lines.join('\n');
}

function cleanOtherLinks(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw bad('other_links must be a list');
  if (v.length > LIMITS.OTHER_LINKS_MAX)
    throw bad(`You can add at most ${LIMITS.OTHER_LINKS_MAX} other links`);
  const out = [];
  v.forEach((item, i) => {
    const url = cleanUrl(item?.url, `Other link ${i + 1}`);
    if (!url) return; // ignore blank rows
    const label = cleanText(item?.label, 50, `Other link ${i + 1} label`) || new URL(url).hostname;
    out.push({ label, url });
  });
  return out;
}

function cleanExperiences(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw bad('experiences must be a list');
  if (v.length > LIMITS.EXPERIENCES_MAX)
    throw bad(`You can add at most ${LIMITS.EXPERIENCES_MAX} work experiences`);

  return v.map((e, i) => {
    const n = i + 1;
    const job_title = cleanText(e?.job_title, LIMITS.NAME_MAX, `Experience ${n} job title`);
    const company_name = cleanText(e?.company_name, LIMITS.NAME_MAX, `Experience ${n} company name`);
    if (!job_title) throw bad(`Experience ${n}: job title is required`);
    if (!company_name) throw bad(`Experience ${n}: company name is required`);

    const start_date = cleanDate(e?.start_date, `Experience ${n} start date`);
    if (!start_date) throw bad(`Experience ${n}: start date is required`);

    const is_current = e?.is_current === true;
    let end_date = null;
    if (!is_current) {
      end_date = cleanDate(e?.end_date, `Experience ${n} end date`);
      if (!end_date) throw bad(`Experience ${n}: end date is required (or tick "I currently work here")`);
      if (end_date < start_date) throw bad(`Experience ${n}: end date cannot be before start date`);
    }

    const responsibilities = cleanResponsibilities(e?.responsibilities, `Experience ${n}`);
    return { job_title, company_name, start_date, end_date, is_current, responsibilities };
  });
}

// ── Contact details: primary + secondary email/phone ────────────
function cleanContact(body) {
  const primary_email = cleanEmail(body.primary_email, 'Primary email');
  const secondary_email = cleanEmail(body.secondary_email, 'Secondary email');
  if (secondary_email && primary_email && secondary_email === primary_email)
    throw bad('Secondary email must be different from the primary email');

  const primary_phone_country_code = cleanCountryCode(body.primary_phone_country_code, 'Primary phone country code');
  const primary_phone = cleanPhone(body.primary_phone, 'Primary phone');

  const secondary_phone_country_code = cleanCountryCode(body.secondary_phone_country_code, 'Secondary phone country code');
  const secondary_phone = cleanPhone(body.secondary_phone, 'Secondary phone');
  if (
    secondary_phone && primary_phone &&
    secondary_phone === primary_phone &&
    secondary_phone_country_code === primary_phone_country_code
  ) throw bad('Secondary phone must be different from the primary phone');

  return {
    primary_email, secondary_email,
    primary_phone, primary_phone_country_code,
    secondary_phone, secondary_phone_country_code,
  };
}

// ── Education & credentials: ALWAYS read live from existing tables ─
// Sources (in the order they are shown):
//   member_educations         → degrees / diplomas added in the Education step (self)
//   member_education_details  → degree, PU, SSLC entered in the academic-details step (self)
//   member_certifications     → certifications (self)
async function fetchEducation(db, userId) {
  const empty = { education: [], certifications: [], highest_education: null };

  const prof = await db.query(`SELECT id FROM profiles WHERE user_id=$1`, [userId]);
  if (prof.rows.length === 0) return empty;
  const profileId = prof.rows[0].id;

  // The user's own education row (not a family member's)
  const me = await db.query(
    `SELECT id, highest_education
       FROM member_education
      WHERE profile_id=$1
      ORDER BY (LOWER(COALESCE(member_relation,'')) IN ('self','myself','me')) DESC,
               sort_order ASC, created_at ASC
      LIMIT 1`,
    [profileId]
  );
  const meRow = me.rows[0] || null;

  const [degrees, certs, details] = await Promise.all([
    meRow
      ? db.query(
          `SELECT id, degree_name, degree_type, university,
                  to_char(start_date,'YYYY-MM-DD') AS start_date,
                  to_char(end_date,'YYYY-MM-DD')   AS end_date
             FROM member_educations
            WHERE member_education_id=$1
            ORDER BY end_date DESC NULLS FIRST, sort_order ASC`,
          [meRow.id]
        )
      : Promise.resolve({ rows: [] }),
    meRow
      ? db.query(
          `SELECT id, certification
             FROM member_certifications
            WHERE member_education_id=$1
            ORDER BY sort_order ASC`,
          [meRow.id]
        )
      : Promise.resolve({ rows: [] }),
    db.query(
      `SELECT degree_name, degree_institution, degree_year, degree_percentage, pursuing_degree,
              pu_college_name, pu_year, pu_percentage, pu_first_status, pu_second_status,
              sslc_school_name, sslc_year, sslc_percentage
         FROM member_education_details
        WHERE profile_id=$1 AND family_member_id IS NULL
        ORDER BY updated_at DESC
        LIMIT 1`,
      [profileId]
    ),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const education = [];
  const seen = new Set();

  degrees.rows.forEach((d) => {
    if (!d.degree_name && !d.university) return;
    const isExpected = !!d.end_date && d.end_date > today;
    education.push({
      key: `deg-${d.id}`,
      level: 'degree',
      degree: d.degree_name || null,
      field_of_study: d.degree_type || null,
      institution: d.university || null,
      graduation_year: d.end_date ? d.end_date.slice(0, 4) : null,
      is_expected: isExpected || (!d.end_date && !!d.start_date),
      grade: null,
    });
    if (d.degree_name) seen.add(d.degree_name.trim().toLowerCase());
  });

  const det = details.rows[0];
  if (det) {
    if (det.degree_name && !seen.has(det.degree_name.trim().toLowerCase())) {
      education.push({
        key: 'det-degree',
        level: 'degree',
        degree: det.degree_name,
        field_of_study: null,
        institution: det.degree_institution || null,
        graduation_year: det.degree_year || null,
        is_expected: !!det.pursuing_degree,
        grade: det.degree_percentage || null,
      });
    }
    if (det.pu_college_name) {
      education.push({
        key: 'det-pu',
        level: 'pu',
        degree: 'Pre-University (PUC)',
        field_of_study: null,
        institution: det.pu_college_name,
        graduation_year: det.pu_year || null,
        is_expected: det.pu_first_status === 'pursuing' || det.pu_second_status === 'pursuing',
        grade: det.pu_percentage || null,
      });
    }
    if (det.sslc_school_name) {
      education.push({
        key: 'det-sslc',
        level: 'sslc',
        degree: 'SSLC (Class 10)',
        field_of_study: null,
        institution: det.sslc_school_name,
        graduation_year: det.sslc_year || null,
        is_expected: false,
        grade: det.sslc_percentage || null,
      });
    }
  }

  return {
    education,
    certifications: certs.rows.map((c) => ({ id: c.id, name: c.certification })),
    highest_education: meRow?.highest_education || null,
  };
}

// ── Career profile + experiences (stored data) ─────────────────
async function fetchCareerData(db, userId) {
  const p = await db.query(
    `SELECT id, professional_title, bio, linkedin_url, github_url, portfolio_url, other_links,
            primary_email, secondary_email,
            primary_phone, primary_phone_country_code,
            secondary_phone, secondary_phone_country_code,
            updated_at
       FROM career_profiles WHERE user_id=$1`,
    [userId]
  );

  let profile = {
    professional_title: '',
    bio: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    other_links: [],
    primary_email: '',
    secondary_email: '',
    primary_phone: '',
    primary_phone_country_code: '+91',
    secondary_phone: '',
    secondary_phone_country_code: '+91',
    updated_at: null,
  };
  let experiences = [];

  if (p.rows.length > 0) {
    const row = p.rows[0];
    profile = {
      professional_title: row.professional_title || '',
      bio: row.bio || '',
      linkedin_url: row.linkedin_url || '',
      github_url: row.github_url || '',
      portfolio_url: row.portfolio_url || '',
      other_links: Array.isArray(row.other_links) ? row.other_links : [],
      primary_email: row.primary_email || '',
      secondary_email: row.secondary_email || '',
      primary_phone: row.primary_phone || '',
      primary_phone_country_code: row.primary_phone_country_code || '+91',
      secondary_phone: row.secondary_phone || '',
      secondary_phone_country_code: row.secondary_phone_country_code || '+91',
      updated_at: row.updated_at,
    };
    const ex = await db.query(
      `SELECT id, job_title, company_name,
              to_char(start_date,'YYYY-MM-DD') AS start_date,
              to_char(end_date,'YYYY-MM-DD')   AS end_date,
              is_current, responsibilities
         FROM career_work_experiences
        WHERE career_profile_id=$1
        ORDER BY sort_order ASC`,
      [row.id]
    );
    experiences = ex.rows.map((r) => ({ ...r, responsibilities: r.responsibilities || '' }));
  }

  return { profile, experiences };
}

async function buildResponse(db, userId) {
  const [career, edu] = await Promise.all([fetchCareerData(db, userId), fetchEducation(db, userId)]);
  return { ...career, ...edu, limits: LIMITS };
}

// ── GET /career-profile ────────────────────────────────────────
const getCareerProfile = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await buildResponse(pool, req.user.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('getCareerProfile:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /career-profile/education (lightweight live refresh) ───
const getCareerEducation = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await fetchEducation(pool, req.user.id));
  } catch (err) {
    console.error('getCareerEducation:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PUT /career-profile (create or update, all-or-nothing) ─────
const saveCareerProfile = async (req, res) => {
  const body = req.body || {};
  let client;
  try {
    // Validate everything before touching the database
    const professional_title = cleanText(body.professional_title, LIMITS.TITLE_MAX, 'Professional title');
    const bio = cleanText(body.bio, LIMITS.BIO_MAX, 'Professional bio');
    const linkedin_url = cleanUrl(body.linkedin_url, 'LinkedIn URL');
    const github_url = cleanUrl(body.github_url, 'GitHub URL');
    const portfolio_url = cleanUrl(body.portfolio_url, 'Portfolio URL');
    const other_links = cleanOtherLinks(body.other_links);
    const experiences = cleanExperiences(body.experiences);
    const contact = cleanContact(body);

    client = await pool.connect();
    await client.query('BEGIN');

    const up = await client.query(
      `INSERT INTO career_profiles
         (user_id, professional_title, bio, linkedin_url, github_url, portfolio_url, other_links,
          primary_email, secondary_email,
          primary_phone, primary_phone_country_code,
          secondary_phone, secondary_phone_country_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (user_id) DO UPDATE SET
         professional_title         = EXCLUDED.professional_title,
         bio                        = EXCLUDED.bio,
         linkedin_url               = EXCLUDED.linkedin_url,
         github_url                 = EXCLUDED.github_url,
         portfolio_url              = EXCLUDED.portfolio_url,
         other_links                = EXCLUDED.other_links,
         primary_email              = EXCLUDED.primary_email,
         secondary_email            = EXCLUDED.secondary_email,
         primary_phone              = EXCLUDED.primary_phone,
         primary_phone_country_code = EXCLUDED.primary_phone_country_code,
         secondary_phone            = EXCLUDED.secondary_phone,
         secondary_phone_country_code = EXCLUDED.secondary_phone_country_code,
         updated_at                 = now()
       RETURNING id`,
      [
        req.user.id, professional_title, bio, linkedin_url, github_url, portfolio_url, JSON.stringify(other_links),
        contact.primary_email, contact.secondary_email,
        contact.primary_phone, contact.primary_phone_country_code,
        contact.secondary_phone, contact.secondary_phone_country_code,
      ]
    );
    const careerProfileId = up.rows[0].id;

    await client.query(`DELETE FROM career_work_experiences WHERE career_profile_id=$1`, [careerProfileId]);
    for (let i = 0; i < experiences.length; i++) {
      const e = experiences[i];
      await client.query(
        `INSERT INTO career_work_experiences
           (career_profile_id, job_title, company_name, start_date, end_date, is_current, responsibilities, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [careerProfileId, e.job_title, e.company_name, e.start_date, e.end_date, e.is_current, e.responsibilities, i]
      );
    }

    await client.query('COMMIT');

    const fresh = await buildResponse(pool, req.user.id);
    return res.json({ message: 'Career profile saved', ...fresh });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('saveCareerProfile:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { getCareerProfile, getCareerEducation, saveCareerProfile };
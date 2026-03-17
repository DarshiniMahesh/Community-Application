const pool = require('../config/db');

// ─── GET PROFILE (summary) ────────────────────────────────────
const getProfile = async (req, res) => {
  const { id: userId } = req.user;

  let profile = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);

  if (profile.rows.length === 0) {
    const newProfile = await pool.query(
      'INSERT INTO profiles (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return res.json(newProfile.rows[0]);
  }

  res.json(profile.rows[0]);
};

// ─── GET FULL PROFILE (all steps) ────────────────────────────
const getFullProfile = async (req, res) => {
  const { id: userId } = req.user;

  const profile = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
  const profileId = profile.rows[0].id;

  const [personal, religious, familyInfo, familyMembers, addresses, education, economic, insurance, documents] =
    await Promise.all([
      pool.query('SELECT * FROM personal_details WHERE profile_id=$1', [profileId]),
      pool.query('SELECT * FROM religious_details WHERE profile_id=$1', [profileId]),
      pool.query('SELECT * FROM family_info WHERE profile_id=$1', [profileId]),
      pool.query('SELECT * FROM family_members WHERE profile_id=$1 ORDER BY sort_order', [profileId]),
      pool.query('SELECT * FROM addresses WHERE profile_id=$1', [profileId]),
      pool.query('SELECT * FROM member_education WHERE profile_id=$1 ORDER BY sort_order', [profileId]),
      pool.query('SELECT * FROM economic_details WHERE profile_id=$1', [profileId]),
      pool.query('SELECT * FROM member_insurance WHERE profile_id=$1 ORDER BY sort_order', [profileId]),
      pool.query('SELECT * FROM member_documents WHERE profile_id=$1 ORDER BY sort_order', [profileId]),
    ]);

  res.json({
    profile: profile.rows[0],
    step1: personal.rows[0] || null,
    step2: religious.rows[0] || null,
    step3: { family_info: familyInfo.rows[0] || null, members: familyMembers.rows },
    step4: addresses.rows,
    step5: education.rows,
    step6: { economic: economic.rows[0] || null, insurance: insurance.rows, documents: documents.rows },
  });
};

// ─── STEP 1: PERSONAL DETAILS ─────────────────────────────────
const saveStep1 = async (req, res) => {
  const { id: userId } = req.user;
  const {
    first_name, middle_name, last_name, gender, date_of_birth,
    fathers_name, mothers_name, mothers_maiden_name,
    wife_name, wife_maiden_name, husbands_name,
    surname_in_use, surname_as_per_gotra, is_married,
  } = req.body;

  if (!first_name || !last_name || !gender) {
    return res.status(400).json({ message: 'first_name, last_name and gender are required' });
  }

  let profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) {
    profile = await pool.query('INSERT INTO profiles (user_id) VALUES ($1) RETURNING id', [userId]);
  }
  const profileId = profile.rows[0].id;

  await pool.query(`
    INSERT INTO personal_details (
      profile_id, first_name, middle_name, last_name, gender, date_of_birth,
      fathers_name, mothers_name, mothers_maiden_name, wife_name, wife_maiden_name,
      husbands_name, surname_in_use, surname_as_per_gotra, is_married
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT (profile_id) DO UPDATE SET
      first_name=$2, middle_name=$3, last_name=$4, gender=$5, date_of_birth=$6,
      fathers_name=$7, mothers_name=$8, mothers_maiden_name=$9, wife_name=$10,
      wife_maiden_name=$11, husbands_name=$12, surname_in_use=$13,
      surname_as_per_gotra=$14, is_married=$15
  `, [
    profileId, first_name, middle_name || null, last_name, gender, date_of_birth || null,
    fathers_name || null, mothers_name || null, mothers_maiden_name || null,
    wife_name || null, wife_maiden_name || null, husbands_name || null,
    surname_in_use || null, surname_as_per_gotra || null, is_married || false,
  ]);

  const pct = calcStep1Pct(req.body);
  await pool.query(
    'UPDATE profiles SET step1_personal_pct=$1, step1_completed=$2 WHERE id=$3',
    [pct, pct >= 80, profileId]
  );

  res.json({ message: 'Step 1 saved', completion: pct });
};

// ─── STEP 2: RELIGIOUS DETAILS ────────────────────────────────
const saveStep2 = async (req, res) => {
  const { id: userId } = req.user;
  const { gotra, pravara, upanama, kuladevata, kuladevata_other, surname_in_use, surname_as_per_gotra, priest_name, priest_location } = req.body;

  const profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Complete step 1 first' });
  const profileId = profile.rows[0].id;

  await pool.query(`
    INSERT INTO religious_details
      (profile_id, gotra, pravara, upanama, kuladevata, kuladevata_other, surname_in_use, surname_as_per_gotra, priest_name, priest_location)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (profile_id) DO UPDATE SET
      gotra=$2, pravara=$3, upanama=$4, kuladevata=$5, kuladevata_other=$6,
      surname_in_use=$7, surname_as_per_gotra=$8, priest_name=$9, priest_location=$10
  `, [profileId, gotra || null, pravara || null, upanama || null, kuladevata || null,
      kuladevata_other || null, surname_in_use || null, surname_as_per_gotra || null,
      priest_name || null, priest_location || null]);

  const pct = calcStep2Pct(req.body);
  await pool.query(
    'UPDATE profiles SET step2_religious_pct=$1, step2_completed=$2 WHERE id=$3',
    [pct, pct >= 50, profileId]
  );

  res.json({ message: 'Step 2 saved', completion: pct });
};

// ─── STEP 3: FAMILY INFO + MEMBERS ───────────────────────────
const saveStep3 = async (req, res) => {
  const { id: userId } = req.user;
  const { family_type, members } = req.body;

  const profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Complete step 1 first' });
  const profileId = profile.rows[0].id;

  // Upsert family_info
  let fi = await pool.query('SELECT id FROM family_info WHERE profile_id=$1', [profileId]);
  if (fi.rows.length === 0) {
    fi = await pool.query(
      'INSERT INTO family_info (profile_id, family_type) VALUES ($1,$2) RETURNING id',
      [profileId, family_type || null]
    );
  } else {
    await pool.query('UPDATE family_info SET family_type=$1 WHERE profile_id=$2', [family_type || null, profileId]);
    fi = await pool.query('SELECT id FROM family_info WHERE profile_id=$1', [profileId]);
  }
  const familyInfoId = fi.rows[0].id;

  // Replace members
  if (Array.isArray(members)) {
    await pool.query('DELETE FROM family_members WHERE profile_id=$1', [profileId]);
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      await pool.query(
        `INSERT INTO family_members (profile_id, family_info_id, relation, name, age, gender, status, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [profileId, familyInfoId, m.relation, m.name || null, m.age || null,
         m.gender || null, m.status || 'active', i]
      );
    }
  }

  const pct = members && members.length > 0 ? 100 : 30;
  await pool.query(
    'UPDATE profiles SET step3_family_pct=$1, step3_completed=$2 WHERE id=$3',
    [pct, pct === 100, profileId]
  );

  res.json({ message: 'Step 3 saved', completion: pct });
};

// ─── STEP 4: ADDRESSES ────────────────────────────────────────
const saveStep4 = async (req, res) => {
  const { id: userId } = req.user;
  const { addresses } = req.body; // [{ address_type, flat_no, building, street, area, city, state, pincode, latitude, longitude }]

  const profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Complete step 1 first' });
  const profileId = profile.rows[0].id;

  if (Array.isArray(addresses)) {
    for (const addr of addresses) {
      await pool.query(`
        INSERT INTO addresses
          (profile_id, address_type, flat_no, building, street, area, city, state, pincode, latitude, longitude)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (profile_id, address_type) DO UPDATE SET
          flat_no=$3, building=$4, street=$5, area=$6, city=$7, state=$8, pincode=$9, latitude=$10, longitude=$11
      `, [profileId, addr.address_type, addr.flat_no || null, addr.building || null,
          addr.street || null, addr.area || null, addr.city || null,
          addr.state || null, addr.pincode || null, addr.latitude || null, addr.longitude || null]);
    }
  }

  const hasCurrent = addresses?.some(a => a.address_type === 'current' && a.city);
  const pct = hasCurrent ? 100 : 50;
  await pool.query(
    'UPDATE profiles SET step4_location_pct=$1, step4_completed=$2 WHERE id=$3',
    [pct, hasCurrent, profileId]
  );

  res.json({ message: 'Step 4 saved', completion: pct });
};

// ─── STEP 5: EDUCATION & PROFESSION ──────────────────────────
const saveStep5 = async (req, res) => {
  const { id: userId } = req.user;
  const { members } = req.body; // [{ member_name, member_relation, highest_education, profession_type, certifications[], languages[] }]

  const profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Complete step 1 first' });
  const profileId = profile.rows[0].id;

  if (Array.isArray(members)) {
    // Delete existing
    const existing = await pool.query('SELECT id FROM member_education WHERE profile_id=$1', [profileId]);
    for (const row of existing.rows) {
      await pool.query('DELETE FROM member_certifications WHERE member_education_id=$1', [row.id]);
      await pool.query('DELETE FROM member_languages WHERE member_education_id=$1', [row.id]);
    }
    await pool.query('DELETE FROM member_education WHERE profile_id=$1', [profileId]);

    // Re-insert
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const eduRes = await pool.query(`
        INSERT INTO member_education
          (profile_id, member_name, member_relation, sort_order, highest_education,
           brief_profile, profession_type, profession_other, self_employed_type, self_employed_other, industry)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
      `, [profileId, m.member_name || null, m.member_relation || null, i,
          m.highest_education || null, m.brief_profile || null,
          m.profession_type || null, m.profession_other || null,
          m.self_employed_type || null, m.self_employed_other || null, m.industry || null]);

      const eduId = eduRes.rows[0].id;

      if (Array.isArray(m.certifications)) {
        for (let j = 0; j < m.certifications.length; j++) {
          await pool.query(
            'INSERT INTO member_certifications (member_education_id, certification, sort_order) VALUES ($1,$2,$3)',
            [eduId, m.certifications[j], j]
          );
        }
      }

      if (Array.isArray(m.languages)) {
        for (const lang of m.languages) {
          await pool.query(
            `INSERT INTO member_languages (member_education_id, language, language_other)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [eduId, lang.language, lang.language_other || null]
          );
        }
      }
    }
  }

  const pct = members && members.length > 0 ? 100 : 0;
  await pool.query(
    'UPDATE profiles SET step5_education_pct=$1, step5_completed=$2 WHERE id=$3',
    [pct, pct === 100, profileId]
  );

  res.json({ message: 'Step 5 saved', completion: pct });
};

// ─── STEP 6: ECONOMIC DETAILS ─────────────────────────────────
const saveStep6 = async (req, res) => {
  const { id: userId } = req.user;
  const { economic, insurance, documents } = req.body;

  const profile = await pool.query('SELECT id FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Complete step 1 first' });
  const profileId = profile.rows[0].id;

  if (economic) {
    await pool.query(`
      INSERT INTO economic_details
        (profile_id, self_income, family_income, inv_fixed_deposits, inv_mutual_funds_sip,
         inv_shares_demat, inv_others, fac_rented_house, fac_own_house,
         fac_agricultural_land, fac_two_wheeler, fac_car)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (profile_id) DO UPDATE SET
        self_income=$2, family_income=$3, inv_fixed_deposits=$4, inv_mutual_funds_sip=$5,
        inv_shares_demat=$6, inv_others=$7, fac_rented_house=$8, fac_own_house=$9,
        fac_agricultural_land=$10, fac_two_wheeler=$11, fac_car=$12
    `, [profileId, economic.self_income || null, economic.family_income || null,
        economic.inv_fixed_deposits || false, economic.inv_mutual_funds_sip || false,
        economic.inv_shares_demat || false, economic.inv_others || false,
        economic.fac_rented_house || false, economic.fac_own_house || false,
        economic.fac_agricultural_land || false, economic.fac_two_wheeler || false,
        economic.fac_car || false]);
  }

  if (Array.isArray(insurance)) {
    await pool.query('DELETE FROM member_insurance WHERE profile_id=$1', [profileId]);
    for (let i = 0; i < insurance.length; i++) {
      const ins = insurance[i];
      await pool.query(
        `INSERT INTO member_insurance
           (profile_id, member_name, member_relation, sort_order, health_coverage, life_coverage, term_coverage)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [profileId, ins.member_name || null, ins.member_relation || null, i,
         ins.health_coverage || null, ins.life_coverage || null, ins.term_coverage || null]
      );
    }
  }

  if (Array.isArray(documents)) {
    await pool.query('DELETE FROM member_documents WHERE profile_id=$1', [profileId]);
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      await pool.query(
        `INSERT INTO member_documents
           (profile_id, member_name, member_relation, sort_order,
            ration_card_coverage, aadhaar_coverage, pan_coverage, all_records_coverage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [profileId, doc.member_name || null, doc.member_relation || null, i,
         doc.ration_card_coverage || null, doc.aadhaar_coverage || null,
         doc.pan_coverage || null, doc.all_records_coverage || null]
      );
    }
  }

  const pct = economic ? 100 : 0;
  await pool.query(
    'UPDATE profiles SET step6_economic_pct=$1, step6_completed=$2 WHERE id=$3',
    [pct, pct === 100, profileId]
  );

  res.json({ message: 'Step 6 saved', completion: pct });
};

// ─── SUBMIT APPLICATION ───────────────────────────────────────
const submitApplication = async (req, res) => {
  const { id: userId } = req.user;
  const { sangha_id } = req.body;

  const profile = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
  if (profile.rows.length === 0) return res.status(400).json({ message: 'Profile not found' });

  const p = profile.rows[0];
  if (['submitted', 'under_review', 'approved'].includes(p.status)) {
    return res.status(409).json({ message: 'Application already submitted' });
  }
  if (!p.step1_completed) {
    return res.status(400).json({ message: 'Complete at least Step 1 before submitting' });
  }

  await pool.query(
    `UPDATE profiles SET status='submitted', submitted_at=NOW(), sangha_id=$1 WHERE user_id=$2`,
    [sangha_id || null, userId]
  );

  res.json({ message: 'Application submitted successfully' });
};

// ─── PENDING USERS (sangha / admin view) ─────────────────────
const getPendingUsers = async (req, res) => {
  const { id: sanghaId, role } = req.user;

  let result;
  if (role === 'admin') {
    result = await pool.query(`
      SELECT u.id, u.email, u.phone,
             p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'submitted'
      ORDER BY p.submitted_at DESC
    `);
  } else {
    result = await pool.query(`
      SELECT u.id, u.email, u.phone,
             p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'submitted' AND p.sangha_id = $1
      ORDER BY p.submitted_at DESC
    `, [sanghaId]);
  }

  res.json(result.rows);
};

// ─── GET USER BY ID ───────────────────────────────────────────
const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await pool.query(
    'SELECT id, email, phone, role FROM users WHERE id=$1 AND is_deleted=FALSE',
    [id]
  );
  if (user.rows.length === 0) return res.status(404).json({ message: 'User not found' });

  const profile = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [id]);

  res.json({ user: user.rows[0], profile: profile.rows[0] || null });
};

// ─── HELPERS ──────────────────────────────────────────────────
function calcStep1Pct(data) {
  const required = ['first_name', 'last_name', 'gender'];
  const optional = ['date_of_birth', 'fathers_name', 'mothers_name', 'surname_in_use'];
  const r = required.filter(f => data[f]).length;
  const o = optional.filter(f => data[f]).length;
  return Math.round((r / required.length) * 70 + (o / optional.length) * 30);
}

function calcStep2Pct(data) {
  const fields = ['gotra', 'pravara', 'kuladevata', 'priest_name'];
  return Math.round((fields.filter(f => data[f]).length / fields.length) * 100);
}

module.exports = {
  getProfile, getFullProfile,
  saveStep1, saveStep2, saveStep3, saveStep4, saveStep5, saveStep6,
  submitApplication, getPendingUsers, getUserById,
};
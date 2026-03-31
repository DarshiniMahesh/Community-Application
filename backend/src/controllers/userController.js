const pool = require('../config/db');

// ─── HELPER: get or create profile ───────────────────────────
const getOrCreateProfile = async (userId) => {
  let res = await pool.query('SELECT * FROM profiles WHERE user_id=$1', [userId]);
  if (res.rows.length === 0) {
    res = await pool.query(
      'INSERT INTO profiles (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
  }
  return res.rows[0];
};

// ─── HELPER: update step completion pct ──────────────────────
const updateProfilePct = async (profileId, stepKey, pct, completed) => {
  const stepNumber = stepKey.match(/step(\d+)/)[1];
  await pool.query(
    `UPDATE profiles SET
       ${stepKey}_pct  = $1,
       step${stepNumber}_completed = $2
     WHERE id=$3`,
    [pct, completed, profileId]
  );
};

// ─── GET /users/profile ──────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const user = await pool.query(
      'SELECT id, email, phone, role FROM users WHERE id=$1',
      [userId]
    );
    if (user.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const profile = await pool.query(
      'SELECT * FROM profiles WHERE user_id=$1',
      [userId]
    );
    const profileData = profile.rows[0] || {};
    res.json({
      ...profileData,
      email: user.rows[0].email,
      phone: user.rows[0].phone,
      role:  user.rows[0].role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /users/profile/full ─────────────────────────────────
const getFullProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const [s1, s2, s3fi, s3mem, s4, s5raw, s6eco, s6ins, s6doc] = await Promise.all([
      pool.query('SELECT * FROM personal_details  WHERE profile_id=$1 LIMIT 1', [pid]),
      pool.query('SELECT * FROM religious_details WHERE profile_id=$1 LIMIT 1', [pid]),
      pool.query('SELECT * FROM family_info        WHERE profile_id=$1 LIMIT 1', [pid]),
      pool.query('SELECT * FROM family_members     WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM addresses          WHERE profile_id=$1', [pid]),
      pool.query('SELECT * FROM member_education   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM economic_details   WHERE profile_id=$1 LIMIT 1', [pid]),
      pool.query('SELECT * FROM member_insurance   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
      pool.query('SELECT * FROM member_documents   WHERE profile_id=$1 ORDER BY sort_order', [pid]),
    ]);

    const step5 = await Promise.all(
      s5raw.rows.map(async (edu) => {
        const [certs, langs] = await Promise.all([
          pool.query(
            'SELECT certification FROM member_certifications WHERE member_education_id=$1 ORDER BY sort_order',
            [edu.id]
          ),
          pool.query(
            'SELECT language, language_other FROM member_languages WHERE member_education_id=$1',
            [edu.id]
          ),
        ]);
        return {
          ...edu,
          certifications: certs.rows.map(r => r.certification),
          languages:      langs.rows,
        };
      })
    );

    res.json({
      profile: profile,
      step1:   s1.rows[0]  || null,
      step2:   s2.rows[0]  || null,
      step3: {
        family_info: s3fi.rows[0] || null,
        members:     s3mem.rows   || [],
      },
      step4: s4.rows   || [],
      step5: step5     || [],
      step6: {
        economic:  s6eco.rows[0] || null,
        insurance: s6ins.rows    || [],
        documents: s6doc.rows    || [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step1 ───────────────────────────────
const saveStep1 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const {
      first_name, middle_name, last_name,
      gender, date_of_birth,
      surname_in_use, surname_as_per_gotra,
      fathers_name, mothers_name, mothers_maiden_name,
      is_married, wife_name, wife_maiden_name, husbands_name,
      has_disability,
      is_part_of_sangha, sangha_name, sangha_role,
    } = req.body;

    if (!first_name || !last_name || !gender) {
      return res.status(400).json({ message: 'first_name, last_name and gender are required' });
    }

    const exists = await pool.query(
      'SELECT id FROM personal_details WHERE profile_id=$1', [pid]
    );

    if (exists.rows.length > 0) {
      await pool.query(
        `UPDATE personal_details SET
           first_name=$1, middle_name=$2, last_name=$3,
           gender=$4, date_of_birth=$5,
           surname_in_use=$6, surname_as_per_gotra=$7,
           fathers_name=$8, mothers_name=$9, mothers_maiden_name=$10,
           is_married=$11, wife_name=$12, wife_maiden_name=$13, husbands_name=$14,
           has_disability=$15,
           is_part_of_sangha=$16, sangha_name=$17, sangha_role=$18,
           updated_at=NOW()
         WHERE profile_id=$19`,
        [
          first_name, middle_name || null, last_name,
          gender, date_of_birth || null,
          surname_in_use || null, surname_as_per_gotra || null,
          fathers_name || null, mothers_name || null, mothers_maiden_name || null,
          is_married || false, wife_name || null, wife_maiden_name || null, husbands_name || null,
          has_disability || null,
          is_part_of_sangha || null,
          is_part_of_sangha === 'yes' ? sangha_name || null : null,
          is_part_of_sangha === 'yes' ? sangha_role || null : null,
          pid,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO personal_details
           (profile_id, first_name, middle_name, last_name,
            gender, date_of_birth,
            surname_in_use, surname_as_per_gotra,
            fathers_name, mothers_name, mothers_maiden_name,
            is_married, wife_name, wife_maiden_name, husbands_name,
            has_disability,
            is_part_of_sangha, sangha_name, sangha_role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          pid,
          first_name, middle_name || null, last_name,
          gender, date_of_birth || null,
          surname_in_use || null, surname_as_per_gotra || null,
          fathers_name || null, mothers_name || null, mothers_maiden_name || null,
          is_married || false, wife_name || null, wife_maiden_name || null, husbands_name || null,
          has_disability || null,
          is_part_of_sangha || null,
          is_part_of_sangha === 'yes' ? sangha_name || null : null,
          is_part_of_sangha === 'yes' ? sangha_role || null : null,
        ]
      );
    }

    const pct = calcStep1Pct(req.body);
    await updateProfilePct(pid, 'step1_personal', pct, pct >= 80);
    res.json({ message: 'Step 1 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step2 ───────────────────────────────
const saveStep2 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const {
      gotra, pravara, upanama,
      kuladevata, kuladevata_other,
      surname_in_use, surname_as_per_gotra,
      priest_name, priest_location,
    } = req.body;

    const exists = await pool.query(
      'SELECT id FROM religious_details WHERE profile_id=$1', [pid]
    );

    if (exists.rows.length > 0) {
      await pool.query(
        `UPDATE religious_details SET
           gotra=$1, pravara=$2, upanama=$3,
           kuladevata=$4, kuladevata_other=$5,
           surname_in_use=$6, surname_as_per_gotra=$7,
           priest_name=$8, priest_location=$9,
           updated_at=NOW()
         WHERE profile_id=$10`,
        [
          gotra || null, pravara || null, upanama || null,
          kuladevata || null, kuladevata_other || null,
          surname_in_use || null, surname_as_per_gotra || null,
          priest_name || null, priest_location || null,
          pid,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO religious_details
           (profile_id, gotra, pravara, upanama,
            kuladevata, kuladevata_other,
            surname_in_use, surname_as_per_gotra,
            priest_name, priest_location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pid,
          gotra || null, pravara || null, upanama || null,
          kuladevata || null, kuladevata_other || null,
          surname_in_use || null, surname_as_per_gotra || null,
          priest_name || null, priest_location || null,
        ]
      );
    }

    const pct = calcStep2Pct(req.body);
    await updateProfilePct(pid, 'step2_religious', pct, pct >= 50);
    res.json({ message: 'Step 2 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step3 ───────────────────────────────
const saveStep3 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const { family_type, members = [] } = req.body;

    const fi = await pool.query('SELECT id FROM family_info WHERE profile_id=$1', [pid]);
    let familyInfoId;
    if (fi.rows.length === 0) {
      const ins = await pool.query(
        'INSERT INTO family_info (profile_id, family_type) VALUES ($1,$2) RETURNING id',
        [pid, family_type || null]
      );
      familyInfoId = ins.rows[0].id;
    } else {
      await pool.query(
        'UPDATE family_info SET family_type=$1, updated_at=NOW() WHERE profile_id=$2',
        [family_type || null, pid]
      );
      familyInfoId = fi.rows[0].id;
    }

    await pool.query('DELETE FROM family_members WHERE profile_id=$1', [pid]);

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      await pool.query(
        `INSERT INTO family_members
           (profile_id, family_info_id, relation, name, age, dob, gender, status, disability, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pid, familyInfoId,
          m.relation || null, m.name || null,
          m.age || null, m.dob || null,
          m.gender || null, m.status || 'active',
          m.disability || 'no', i,
        ]
      );
    }

    const pct = (family_type && members.length > 0) ? 100 : 30;
    await updateProfilePct(pid, 'step3_family', pct, pct === 100);
    res.json({ message: 'Step 3 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step4 ───────────────────────────────
const saveStep4 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const { addresses = [] } = req.body;

    for (const addr of addresses) {
      await pool.query(
        `INSERT INTO addresses
           (profile_id, address_type, flat_no, building, street, area,
            city, state, pincode, latitude, longitude)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (profile_id, address_type) DO UPDATE SET
           flat_no=$3, building=$4, street=$5, area=$6,
           city=$7, state=$8, pincode=$9,
           latitude=$10, longitude=$11, updated_at=NOW()`,
        [
          pid, addr.address_type,
          addr.flat_no || null, addr.building || null,
          addr.street || null, addr.area || null,
          addr.city || null, addr.state || null,
          addr.pincode || null,
          addr.latitude  != null ? Number(addr.latitude)  : null,
          addr.longitude != null ? Number(addr.longitude) : null,
        ]
      );
    }

    const current = addresses.find(a => a.address_type === 'current');
    const pct = (current?.city && current?.state) ? 100 : 50;
    await updateProfilePct(pid, 'step4_location', pct, pct === 100);
    res.json({ message: 'Step 4 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step5 ───────────────────────────────
const saveStep5 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const { members = [] } = req.body;

    const existing = await pool.query(
      'SELECT id FROM member_education WHERE profile_id=$1', [pid]
    );
    for (const row of existing.rows) {
      await pool.query('DELETE FROM member_certifications WHERE member_education_id=$1', [row.id]);
      await pool.query('DELETE FROM member_languages      WHERE member_education_id=$1', [row.id]);
    }
    await pool.query('DELETE FROM member_education WHERE profile_id=$1', [pid]);

    for (let i = 0; i < members.length; i++) {
      const m = members[i];

      const eduRes = await pool.query(
        `INSERT INTO member_education
           (profile_id, member_name, member_relation, sort_order,
            highest_education, brief_profile,
            profession_type, profession_other,
            self_employed_type, self_employed_other, industry,
            is_currently_studying)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          pid,
          m.member_name || null, m.member_relation || null, i,
          m.highest_education || null, m.brief_profile || null,
          m.is_currently_studying ? null : (m.profession_type || null),
          m.is_currently_studying ? null : (m.profession_other || null),
          m.is_currently_studying ? null : (m.self_employed_type || null),
          m.is_currently_studying ? null : (m.self_employed_other || null),
          m.is_currently_studying ? null : (m.industry || null),
          m.is_currently_studying || false,
        ]
      );

      const eduId = eduRes.rows[0].id;

      if (Array.isArray(m.certifications)) {
        for (let j = 0; j < m.certifications.length; j++) {
          const cert = m.certifications[j];
          if (cert && cert.trim()) {
            await pool.query(
              'INSERT INTO member_certifications (member_education_id, certification, sort_order) VALUES ($1,$2,$3)',
              [eduId, cert.trim(), j]
            );
          }
        }
      }

      if (Array.isArray(m.languages)) {
        for (const lang of m.languages) {
          if (lang.language) {
            await pool.query(
              `INSERT INTO member_languages (member_education_id, language, language_other)
               VALUES ($1,$2,$3)
               ON CONFLICT (member_education_id, language) DO UPDATE SET language_other=$3`,
              [eduId, lang.language, lang.language_other || null]
            );
          }
        }
      }
    }

    const pct = members.length > 0 && members[0]?.highest_education ? 100 : 0;
    await updateProfilePct(pid, 'step5_education', pct, pct === 100);
    res.json({ message: 'Step 5 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/step6 ───────────────────────────────
const saveStep6 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;

    const { economic = {}, insurance = [], documents = [] } = req.body;

    const ecoExists = await pool.query(
      'SELECT id FROM economic_details WHERE profile_id=$1', [pid]
    );

    if (ecoExists.rows.length > 0) {
      await pool.query(
        `UPDATE economic_details SET
           self_income=$1, family_income=$2,
           fac_rented_house=$3, fac_own_house=$4, fac_agricultural_land=$5,
           fac_two_wheeler=$6, fac_car=$7,
           inv_fixed_deposits=$8, inv_mutual_funds_sip=$9,
           inv_shares_demat=$10, inv_others=$11,
           updated_at=NOW()
         WHERE profile_id=$12`,
        [
          economic.self_income || null, economic.family_income || null,
          economic.fac_rented_house || false, economic.fac_own_house || false,
          economic.fac_agricultural_land || false, economic.fac_two_wheeler || false,
          economic.fac_car || false,
          economic.inv_fixed_deposits || false, economic.inv_mutual_funds_sip || false,
          economic.inv_shares_demat || false, economic.inv_others || false,
          pid,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO economic_details
           (profile_id, self_income, family_income,
            fac_rented_house, fac_own_house, fac_agricultural_land,
            fac_two_wheeler, fac_car,
            inv_fixed_deposits, inv_mutual_funds_sip,
            inv_shares_demat, inv_others)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          pid,
          economic.self_income || null, economic.family_income || null,
          economic.fac_rented_house || false, economic.fac_own_house || false,
          economic.fac_agricultural_land || false, economic.fac_two_wheeler || false,
          economic.fac_car || false,
          economic.inv_fixed_deposits || false, economic.inv_mutual_funds_sip || false,
          economic.inv_shares_demat || false, economic.inv_others || false,
        ]
      );
    }

    await pool.query('DELETE FROM member_insurance WHERE profile_id=$1', [pid]);
    for (let i = 0; i < insurance.length; i++) {
      const ins = insurance[i];
      await pool.query(
        `INSERT INTO member_insurance
           (profile_id, member_name, member_relation, sort_order,
            health_coverage, life_coverage, term_coverage,
            konkani_card_coverage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          pid,
          ins.member_name || null, ins.member_relation || null, i,
          ins.health_coverage || [],
          ins.life_coverage   || [],
          ins.term_coverage   || [],
          ins.konkani_card_coverage || [],
        ]
      );
    }

    await pool.query('DELETE FROM member_documents WHERE profile_id=$1', [pid]);
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      await pool.query(
        `INSERT INTO member_documents
           (profile_id, member_name, member_relation, sort_order,
            aadhaar_coverage, pan_coverage,
            voter_id_coverage, land_doc_coverage, dl_coverage,
            all_records_coverage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pid,
          doc.member_name || null, doc.member_relation || null, i,
          doc.aadhaar_coverage     || [],
          doc.pan_coverage         || [],
          doc.voter_id_coverage    || [],
          doc.land_doc_coverage    || [],
          doc.dl_coverage          || [],
          doc.all_records_coverage || [],
        ]
      );
    }

    const pct = (economic.self_income && economic.family_income) ? 100 : 50;
    await updateProfilePct(pid, 'step6_economic', pct, pct === 100);
    res.json({ message: 'Step 6 saved', completion: pct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/submit ──────────────────────────────
const submitApplication = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sangha_id } = req.body;

    if (!sangha_id)
      return res.status(400).json({ message: 'Please select a Sangha before submitting' });

    const profile = await pool.query(
      'SELECT id, status, step1_completed FROM profiles WHERE user_id=$1',
      [userId]
    );
    if (profile.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: pid, status, step1_completed } = profile.rows[0];

    if (['submitted', 'under_review', 'approved'].includes(status))
      return res.status(409).json({ message: 'Application already submitted' });

    if (!step1_completed)
      return res.status(400).json({ message: 'Complete at least Step 1 before submitting' });

    // Verify sangha exists and is approved
    const sanghaCheck = await pool.query(
      `SELECT u.id FROM users u
       JOIN sangha_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1 AND sp.status = 'approved'`,
      [sangha_id]
    );
    if (sanghaCheck.rows.length === 0)
      return res.status(400).json({ message: 'Selected Sangha is not valid' });

    await pool.query(
      "UPDATE profiles SET status='submitted', submitted_at=NOW(), sangha_id=$1 WHERE id=$2",
      [sangha_id, pid]
    );

    res.json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset (FULL) ────────────────────────
const resetProfile = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await pool.query(
      'SELECT id, status FROM profiles WHERE user_id=$1', [userId]
    );
    if (profile.rows.length === 0)
      return res.status(404).json({ message: 'Profile not found' });

    const { id: pid, status } = profile.rows[0];

    if (status === 'submitted' || status === 'under_review')
      return res.status(400).json({ message: 'Cannot reset while profile is under review' });

    await pool.query('DELETE FROM personal_details  WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM religious_details WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM family_members    WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM family_info       WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM addresses         WHERE profile_id=$1', [pid]);

    const edus = await pool.query('SELECT id FROM member_education WHERE profile_id=$1', [pid]);
    for (const row of edus.rows) {
      await pool.query('DELETE FROM member_certifications WHERE member_education_id=$1', [row.id]);
      await pool.query('DELETE FROM member_languages      WHERE member_education_id=$1', [row.id]);
    }
    await pool.query('DELETE FROM member_education  WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM economic_details  WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM member_insurance  WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM member_documents  WHERE profile_id=$1', [pid]);

    await pool.query(
      `UPDATE profiles SET
         status='draft', submitted_at=NULL, reviewed_at=NULL,
         reviewed_by=NULL, review_comment=NULL, sangha_id=NULL,
         step1_personal_pct=0, step2_religious_pct=0,
         step3_family_pct=0,  step4_location_pct=0,
         step5_education_pct=0, step6_economic_pct=0,
         step1_completed=FALSE, step2_completed=FALSE,
         step3_completed=FALSE, step4_completed=FALSE,
         step5_completed=FALSE, step6_completed=FALSE
       WHERE id=$1`,
      [pid]
    );

    res.json({ message: 'Profile reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step1 ─────────────────────────
const resetStep1 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    await pool.query('DELETE FROM personal_details WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step1_personal_pct=0, step1_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 1 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step2 ─────────────────────────
const resetStep2 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    await pool.query('DELETE FROM religious_details WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step2_religious_pct=0, step2_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 2 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step3 ─────────────────────────
const resetStep3 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    await pool.query('DELETE FROM family_members WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM family_info    WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step3_family_pct=0, step3_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 3 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step4 ─────────────────────────
const resetStep4 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    await pool.query('DELETE FROM addresses WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step4_location_pct=0, step4_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 4 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step5 ─────────────────────────
const resetStep5 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    const edus = await pool.query('SELECT id FROM member_education WHERE profile_id=$1', [pid]);
    for (const row of edus.rows) {
      await pool.query('DELETE FROM member_certifications WHERE member_education_id=$1', [row.id]);
      await pool.query('DELETE FROM member_languages      WHERE member_education_id=$1', [row.id]);
    }
    await pool.query('DELETE FROM member_education WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step5_education_pct=0, step5_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 5 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /users/profile/reset/step6 ─────────────────────────
const resetStep6 = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const profile = await getOrCreateProfile(userId);
    const pid = profile.id;
    await pool.query('DELETE FROM economic_details WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM member_insurance  WHERE profile_id=$1', [pid]);
    await pool.query('DELETE FROM member_documents  WHERE profile_id=$1', [pid]);
    await pool.query(
      `UPDATE profiles SET step6_economic_pct=0, step6_completed=FALSE WHERE id=$1`, [pid]
    );
    res.json({ message: 'Step 6 reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /users/pending ──────────────────────────────────────
const getPendingUsers = async (req, res) => {
  try {
    const { id: callerId, role } = req.user;
    let result;
    if (role === 'admin') {
      result = await pool.query(
        `SELECT u.id, u.email, u.phone,
                p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
                pd.first_name, pd.last_name
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status IN ('submitted','under_review')
         ORDER BY p.submitted_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT u.id, u.email, u.phone,
                p.id AS profile_id, p.status, p.submitted_at, p.overall_completion_pct,
                pd.first_name, pd.last_name
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN personal_details pd ON pd.profile_id = p.id
         WHERE p.status IN ('submitted','under_review') AND p.sangha_id=$1
         ORDER BY p.submitted_at DESC`,
        [callerId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /users/:id ──────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query(
      'SELECT id, email, phone, role FROM users WHERE id=$1 AND is_deleted=FALSE', [id]
    );
    if (user.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const profile = await pool.query(
      'SELECT * FROM profiles WHERE user_id=$1', [id]
    );
    res.json({ user: user.rows[0], profile: profile.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── HELPERS ─────────────────────────────────────────────────
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
  submitApplication,
  resetProfile,
  resetStep1, resetStep2, resetStep3, resetStep4, resetStep5, resetStep6,
  getPendingUsers, getUserById,
};
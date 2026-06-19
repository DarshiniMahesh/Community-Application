// Community-Application\backend\src\controllers\sanghaschlcontroller.js
const pool = require("../config/db");

async function getSanghaId(sanghaAuthId) {
  const { rows } = await pool.query(
    `SELECT id FROM sanghas WHERE sangha_auth_id = $1 AND is_blocked = false`,
    [sanghaAuthId]
  );
  if (!rows.length) throw new Error("Sangha not found or blocked");
  return rows[0].id;
}

// ════════════════════════════════════════════════════════════════════════════════
// SCHOLARSHIP CATEGORIES
// ════════════════════════════════════════════════════════════════════════════════

async function getCategories(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { rows } = await pool.query(
      `SELECT id, name, color, sort_order
       FROM scholarship_categories
       WHERE sangha_id = $1 OR sangha_id IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      [sanghaId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCategory(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { name, color = "#534AB7" } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO scholarship_categories (sangha_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, sort_order`,
      [sanghaId, name.trim(), color]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CUSTOM ELIGIBILITY CRITERIA  (sangha-scoped)
// ════════════════════════════════════════════════════════════════════════════════

async function getCustomCriteria(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { rows } = await pool.query(
      `SELECT id, label, description, sort_order, created_at
       FROM scholarship_custom_criteria
       WHERE sangha_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [sanghaId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getCustomCriteria error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createCustomCriterion(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { label, description = null } = req.body;
    if (!label?.trim()) {
      return res.status(400).json({ success: false, message: "Criterion label is required" });
    }

    // Put new items at the end
    const { rows: maxRow } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM scholarship_custom_criteria
       WHERE sangha_id = $1`,
      [sanghaId]
    );
    const nextOrder = maxRow[0].next_order;

    const { rows } = await pool.query(
      `INSERT INTO scholarship_custom_criteria (sangha_id, label, description, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, description, sort_order, created_at`,
      [sanghaId, label.trim(), description?.trim() || null, nextOrder]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createCustomCriterion error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateCustomCriterion(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { criterionId } = req.params;
    const { label, description = null } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ success: false, message: "Criterion label is required" });
    }

    const { rowCount } = await pool.query(
      `UPDATE scholarship_custom_criteria
       SET label = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND sangha_id = $4`,
      [label.trim(), description?.trim() || null, criterionId, sanghaId]
    );

    if (!rowCount) {
      return res.status(404).json({ success: false, message: "Custom criterion not found" });
    }

    res.json({ success: true, message: "Criterion updated" });
  } catch (err) {
    console.error("updateCustomCriterion error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteCustomCriterion(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sanghaId = await getSanghaId(req.user.id);
    const { criterionId } = req.params;

    const { rows } = await client.query(
      `SELECT id FROM scholarship_custom_criteria WHERE id = $1 AND sangha_id = $2`,
      [criterionId, sanghaId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Custom criterion not found" });
    }

    // Cascade via FK, but explicit delete for clarity
    await client.query(
      `DELETE FROM scholarship_custom_criteria_values WHERE custom_criteria_id = $1`,
      [criterionId]
    );
    await client.query(
      `DELETE FROM scholarship_custom_criteria WHERE id = $1`,
      [criterionId]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Custom criterion deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteCustomCriterion error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SCHOLARSHIPS (CRUD)
// ════════════════════════════════════════════════════════════════════════════════

async function getScholarships(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);

    // ── Auto-close any active scholarships whose application_end < today ────────
    await pool.query(
      `UPDATE scholarships
       SET status     = 'closed',
           updated_at = NOW()
       WHERE sangha_id          = $1
         AND status             = 'active'
         AND application_end    IS NOT NULL
         AND application_end    < CURRENT_DATE`,
      [sanghaId]
    );

    const { rows: scholarships } = await pool.query(
      `SELECT
         s.id,
         s.name,
         s.description,
         s.category_id          AS "categoryId",
         s.base_amount          AS "baseAmount",
         s.status,
         s.visibility,
         s.max_approvals_unlimited AS "maxApprovalsUnlimited",
         s.max_approvals        AS "maxApprovals",
         s.application_start    AS "applicationStart",
         s.application_end      AS "applicationEnd",
         s.disbursement_date    AS "disbursementDate",
         s.created_at           AS "createdAt",
         s.age_min, s.age_max,
         s.gender,
         s.disability_required,
         s.marital_status,
         s.states, s.districts,
         s.education_levels, s.degrees, s.universities,
         s.merit_based, s.currently_studying,
         s.employment_status,
         s.annual_family_income_min, s.annual_family_income_max,
         s.self_income_min, s.self_income_max,
         s.ews_only, s.house_ownership, s.agricultural_family,
         s.vehicle_ownership, s.has_assets, s.has_investments,
         s.religion, s.caste, s.domicile,
         s.single_parent_only, s.orphan, s.minority_community,
         s.sports_quota, s.rural_background,
         s.cgpa_min, s.percentage_min,
         s.health_insurance, s.life_insurance, s.term_insurance,
         s.aadhaar_card, s.pan_card, s.voter_id, s.driving_license,
         s.konkani_card, s.land_documents,
         s.fac_rented_house, s.fac_own_house, s.fac_agricultural_land,
         s.fac_two_wheeler, s.fac_car,
         s.inv_fixed_deposits, s.inv_mutual_funds_sip,
         s.inv_shares_demat, s.inv_others
       FROM scholarships s
       WHERE s.sangha_id = $1
       ORDER BY s.created_at DESC`,
      [sanghaId]
    );

    if (!scholarships.length) {
      return res.json({ success: true, data: [] });
    }

    const ids = scholarships.map((s) => s.id);

    const { rows: tiers } = await pool.query(
      `SELECT id, scholarship_id AS "scholarshipId", label, amount, condition_note AS condition, sort_order
       FROM scholarship_tiers
       WHERE scholarship_id = ANY($1)
       ORDER BY sort_order ASC`,
      [ids]
    );

    // ── Load custom criteria values for all scholarships ─────────────────────
    const { rows: customVals } = await pool.query(
      `SELECT
         sccv.scholarship_id AS "scholarshipId",
         sccv.custom_criteria_id AS "criterionId",
         sccv.coverage,
         scc.label,
         scc.description
       FROM scholarship_custom_criteria_values sccv
       JOIN scholarship_custom_criteria scc ON scc.id = sccv.custom_criteria_id
       WHERE sccv.scholarship_id = ANY($1)
       ORDER BY scc.sort_order ASC`,
      [ids]
    );

    const tiersById = {};
    tiers.forEach((t) => {
      if (!tiersById[t.scholarshipId]) tiersById[t.scholarshipId] = [];
      tiersById[t.scholarshipId].push({ id: t.id, label: t.label, amount: t.amount, condition: t.condition || "" });
    });

    const customValsById = {};
    customVals.forEach((v) => {
      if (!customValsById[v.scholarshipId]) customValsById[v.scholarshipId] = [];
      customValsById[v.scholarshipId].push({
        criterionId: v.criterionId,
        label: v.label,
        description: v.description || "",
        coverage: v.coverage,
      });
    });

    const shaped = scholarships.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || "",
      categoryId: s.categoryId || "",
      baseAmount: s.baseAmount ?? "",
      tieredAmounts: tiersById[s.id] || [],
      customCriteriaValues: customValsById[s.id] || [],
      status: s.status,
      visibility: s.visibility,
      maxApprovalsUnlimited: s.maxApprovalsUnlimited,
      maxApprovals: s.maxApprovals ?? "",
      applicationStart: s.applicationStart || "",
      applicationEnd: s.applicationEnd || "",
      disbursementDate: s.disbursementDate || "",
      createdAt: s.createdAt,
      criteria: {
        ageLimit: { min: s.age_min ?? "", max: s.age_max ?? "" },
        gender: s.gender,
        disabilityRequired: s.disability_required,
        maritalStatus: s.marital_status,
        states: s.states || [],
        districts: s.districts || [],
        educationLevels: s.education_levels || [],
        degrees: s.degrees || [],
        universities: s.universities || [],
        meritBased: s.merit_based,
        currentlyStudying: s.currently_studying,
        employmentStatus: s.employment_status,
        annualFamilyIncome: { min: s.annual_family_income_min ?? "", max: s.annual_family_income_max ?? "" },
        selfIncome: { min: s.self_income_min ?? "", max: s.self_income_max ?? "" },
        ewsOnly: s.ews_only,
        houseOwnership: s.house_ownership,
        agriculturalFamily: s.agricultural_family,
        vehicleOwnership: s.vehicle_ownership,
        hasAssets: s.has_assets,
        hasInvestments: s.has_investments,
        aadhaarRequired: "not_required",
        religion: s.religion || [],
        caste: s.caste || [],
        domicile: s.domicile,
        singleParentFamily: s.single_parent_only,
        orphan: s.orphan,
        minorityCommunity: s.minority_community,
        sportsQuota: s.sports_quota,
        ruralBackground: s.rural_background,
        cgpaMin: s.cgpa_min ?? "",
        percentageMin: s.percentage_min ?? "",
        healthInsurance: s.health_insurance,
        lifeInsurance: s.life_insurance,
        termInsurance: s.term_insurance,
        konkaniCard: s.konkani_card,
        aadhaar: s.aadhaar_card,
        pan: s.pan_card,
        voterId: s.voter_id,
        drivingLicense: s.driving_license,
        landDocuments: s.land_documents,
        facRentedHouse: s.fac_rented_house,
        facOwnHouse: s.fac_own_house,
        facAgriculturalLand: s.fac_agricultural_land,
        facTwoWheeler: s.fac_two_wheeler,
        facCar: s.fac_car,
        invFixedDeposits: s.inv_fixed_deposits,
        invMutualFundsSip: s.inv_mutual_funds_sip,
        invSharesDemat: s.inv_shares_demat,
        invOthers: s.inv_others,
      },
    }));

    res.json({ success: true, data: shaped });
  } catch (err) {
    console.error("getScholarships error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createScholarship(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sanghaId = await getSanghaId(req.user.id);
    const { criteria: c, tieredAmounts = [], customCriteriaValues = [], ...top } = req.body;

    if (!top.name?.trim()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Scholarship name is required" });
    }

    const { rows } = await client.query(
      `INSERT INTO scholarships (
         sangha_id, name, description, category_id,
         base_amount, status, visibility,
         max_approvals_unlimited, max_approvals,
         application_start, application_end, disbursement_date,
         age_min, age_max, gender, disability_required, marital_status,
         states, districts, education_levels, degrees, universities,
         merit_based, currently_studying, employment_status,
         annual_family_income_min, annual_family_income_max,
         self_income_min, self_income_max,
         ews_only, house_ownership, agricultural_family,
         vehicle_ownership, has_assets, has_investments,
         religion, caste, domicile, single_parent_only, orphan,
         minority_community, sports_quota, rural_background,
         cgpa_min, percentage_min,
         health_insurance, life_insurance, term_insurance,
         aadhaar_card, pan_card, voter_id, driving_license,
         konkani_card, land_documents,
         fac_rented_house, fac_own_house, fac_agricultural_land,
         fac_two_wheeler, fac_car,
         inv_fixed_deposits, inv_mutual_funds_sip, inv_shares_demat, inv_others
       ) VALUES (
         $1,$2,$3,$4,
         $5,$6,$7,
         $8,$9,
         $10,$11,$12,
         $13,$14,$15,$16,$17,
         $18,$19,$20,$21,$22,
         $23,$24,$25,
         $26,$27,
         $28,$29,
         $30,$31,$32,
         $33,$34,$35,
         $36,$37,$38,$39,$40,
         $41,$42,$43,
         $44,$45,
         $46,$47,$48,
         $49,$50,$51,$52,
         $53,$54,
         $55,$56,$57,
         $58,$59,
         $60,$61,$62,$63
       )
       RETURNING id, created_at AS "createdAt"`,
      [
        sanghaId, top.name.trim(), top.description || null, top.categoryId || null,
        top.baseAmount || null, top.status || "draft", top.visibility || "primary_sangha_only",
        top.maxApprovalsUnlimited ?? true, top.maxApprovals || null,
        top.applicationStart || null, top.applicationEnd || null, top.disbursementDate || null,
        c?.ageLimit?.min || null, c?.ageLimit?.max || null,
        c?.gender || "all", c?.disabilityRequired ?? null, c?.maritalStatus || "all",
        c?.states || [], c?.districts || [],
        c?.educationLevels || [], c?.degrees || [], c?.universities || [],
        c?.meritBased ?? null, c?.currentlyStudying ?? null, c?.employmentStatus || "all",
        c?.annualFamilyIncome?.min || null, c?.annualFamilyIncome?.max || null,
        c?.selfIncome?.min || null, c?.selfIncome?.max || null,
        c?.ewsOnly ?? null, c?.houseOwnership || "all", c?.agriculturalFamily ?? null,
        c?.vehicleOwnership || "all", c?.hasAssets ?? null, c?.hasInvestments ?? null,
        c?.religion || [], c?.caste || [],
        c?.domicile ?? null, c?.singleParentFamily ?? null, c?.orphan ?? null,
        c?.minorityCommunity ?? null, c?.sportsQuota ?? null, c?.ruralBackground ?? null,
        c?.cgpaMin || null, c?.percentageMin || null,
        c?.healthInsurance ?? null, c?.lifeInsurance ?? null, c?.termInsurance ?? null,
        c?.aadhaar || "all", c?.pan || "all", c?.voterId || "all", c?.drivingLicense || "all",
        c?.konkaniCard ?? null, c?.landDocuments ?? null,
        c?.facRentedHouse ?? null, c?.facOwnHouse ?? null, c?.facAgriculturalLand ?? null,
        c?.facTwoWheeler ?? null, c?.facCar ?? null,
        c?.invFixedDeposits ?? null, c?.invMutualFundsSip ?? null,
        c?.invSharesDemat ?? null, c?.invOthers ?? null,
      ]
    );

    const scholarshipId = rows[0].id;

    if (tieredAmounts.length) {
      for (let i = 0; i < tieredAmounts.length; i++) {
        const t = tieredAmounts[i];
        await client.query(
          `INSERT INTO scholarship_tiers (scholarship_id, label, amount, condition_note, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [scholarshipId, t.label, t.amount, t.condition || null, i]
        );
      }
    }

    // ── Save custom criteria values ──────────────────────────────────────────
    for (const cv of customCriteriaValues) {
      if (!cv.criterionId || !cv.coverage || cv.coverage === "all") continue;
      // Verify the criterion belongs to this sangha
      const { rows: check } = await client.query(
        `SELECT id FROM scholarship_custom_criteria WHERE id = $1 AND sangha_id = $2`,
        [cv.criterionId, sanghaId]
      );
      if (!check.length) continue;
      await client.query(
        `INSERT INTO scholarship_custom_criteria_values (scholarship_id, custom_criteria_id, coverage)
         VALUES ($1, $2, $3)
         ON CONFLICT (scholarship_id, custom_criteria_id) DO UPDATE SET coverage = EXCLUDED.coverage`,
        [scholarshipId, cv.criterionId, cv.coverage]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: { id: scholarshipId, createdAt: rows[0].createdAt } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createScholarship error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

async function updateScholarship(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sanghaId = await getSanghaId(req.user.id);
    const { id } = req.params;
    const { criteria: c, tieredAmounts = [], customCriteriaValues = [], ...top } = req.body;

    const { rows: own } = await client.query(
      `SELECT id FROM scholarships WHERE id = $1 AND sangha_id = $2`,
      [id, sanghaId]
    );
    if (!own.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    await client.query(
      `UPDATE scholarships SET
         name=$1, description=$2, category_id=$3,
         base_amount=$4, status=$5, visibility=$6,
         max_approvals_unlimited=$7, max_approvals=$8,
         application_start=$9, application_end=$10, disbursement_date=$11,
         age_min=$12, age_max=$13, gender=$14, disability_required=$15, marital_status=$16,
         states=$17, districts=$18, education_levels=$19, degrees=$20, universities=$21,
         merit_based=$22, currently_studying=$23, employment_status=$24,
         annual_family_income_min=$25, annual_family_income_max=$26,
         self_income_min=$27, self_income_max=$28,
         ews_only=$29, house_ownership=$30, agricultural_family=$31,
         vehicle_ownership=$32, has_assets=$33, has_investments=$34,
         religion=$35, caste=$36, domicile=$37, single_parent_only=$38, orphan=$39,
         minority_community=$40, sports_quota=$41, rural_background=$42,
         cgpa_min=$43, percentage_min=$44,
         health_insurance=$45, life_insurance=$46, term_insurance=$47,
         aadhaar_card=$48, pan_card=$49, voter_id=$50, driving_license=$51,
         konkani_card=$52, land_documents=$53,
         fac_rented_house=$54, fac_own_house=$55, fac_agricultural_land=$56,
         fac_two_wheeler=$57, fac_car=$58,
         inv_fixed_deposits=$59, inv_mutual_funds_sip=$60,
         inv_shares_demat=$61, inv_others=$62,
         updated_at=NOW()
       WHERE id=$63`,
      [
        top.name?.trim(), top.description || null, top.categoryId || null,
        top.baseAmount || null, top.status, top.visibility,
        top.maxApprovalsUnlimited ?? true, top.maxApprovals || null,
        top.applicationStart || null, top.applicationEnd || null, top.disbursementDate || null,
        c?.ageLimit?.min || null, c?.ageLimit?.max || null,
        c?.gender || "all", c?.disabilityRequired ?? null, c?.maritalStatus || "all",
        c?.states || [], c?.districts || [],
        c?.educationLevels || [], c?.degrees || [], c?.universities || [],
        c?.meritBased ?? null, c?.currentlyStudying ?? null, c?.employmentStatus || "all",
        c?.annualFamilyIncome?.min || null, c?.annualFamilyIncome?.max || null,
        c?.selfIncome?.min || null, c?.selfIncome?.max || null,
        c?.ewsOnly ?? null, c?.houseOwnership || "all", c?.agriculturalFamily ?? null,
        c?.vehicleOwnership || "all", c?.hasAssets ?? null, c?.hasInvestments ?? null,
        c?.religion || [], c?.caste || [],
        c?.domicile ?? null, c?.singleParentFamily ?? null, c?.orphan ?? null,
        c?.minorityCommunity ?? null, c?.sportsQuota ?? null, c?.ruralBackground ?? null,
        c?.cgpaMin || null, c?.percentageMin || null,
        c?.healthInsurance ?? null, c?.lifeInsurance ?? null, c?.termInsurance ?? null,
        c?.aadhaar || "all", c?.pan || "all", c?.voterId || "all", c?.drivingLicense || "all",
        c?.konkaniCard ?? null, c?.landDocuments ?? null,
        c?.facRentedHouse ?? null, c?.facOwnHouse ?? null, c?.facAgriculturalLand ?? null,
        c?.facTwoWheeler ?? null, c?.facCar ?? null,
        c?.invFixedDeposits ?? null, c?.invMutualFundsSip ?? null,
        c?.invSharesDemat ?? null, c?.invOthers ?? null,
        id,
      ]
    );

    await client.query(`DELETE FROM scholarship_tiers WHERE scholarship_id = $1`, [id]);
    for (let i = 0; i < tieredAmounts.length; i++) {
      const t = tieredAmounts[i];
      await client.query(
        `INSERT INTO scholarship_tiers (scholarship_id, label, amount, condition_note, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, t.label, t.amount, t.condition || null, i]
      );
    }

    // ── Replace custom criteria values ───────────────────────────────────────
    await client.query(
      `DELETE FROM scholarship_custom_criteria_values WHERE scholarship_id = $1`,
      [id]
    );
    for (const cv of customCriteriaValues) {
      if (!cv.criterionId || !cv.coverage || cv.coverage === "all") continue;
      const { rows: check } = await client.query(
        `SELECT id FROM scholarship_custom_criteria WHERE id = $1 AND sangha_id = $2`,
        [cv.criterionId, sanghaId]
      );
      if (!check.length) continue;
      await client.query(
        `INSERT INTO scholarship_custom_criteria_values (scholarship_id, custom_criteria_id, coverage)
         VALUES ($1, $2, $3)`,
        [id, cv.criterionId, cv.coverage]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Scholarship updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateScholarship error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

async function deleteScholarship(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sanghaId = await getSanghaId(req.user.id);
    const { id } = req.params;

    const { rows } = await client.query(
      `SELECT id FROM scholarships WHERE id = $1 AND sangha_id = $2`,
      [id, sanghaId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    await client.query(`DELETE FROM scholarship_tiers WHERE scholarship_id = $1`, [id]);
    await client.query(`DELETE FROM scholarship_custom_criteria_values WHERE scholarship_id = $1`, [id]);
    await client.query(`DELETE FROM scholarship_applications WHERE scholarship_id = $1`, [id]);
    await client.query(`DELETE FROM scholarships WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Scholarship deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteScholarship error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// BENEFICIARY APPROVAL
// ════════════════════════════════════════════════════════════════════════════════

async function getApplicants(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { id: scholarshipId } = req.params;

    const { rows: own } = await pool.query(
      `SELECT id FROM scholarships WHERE id = $1 AND sangha_id = $2`,
      [scholarshipId, sanghaId]
    );
    if (!own.length) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    const { rows } = await pool.query(
      `SELECT
         sa.id                                            AS application_id,
         p.id                                             AS profile_id,
         TRIM(CONCAT_WS(' ',
           pd.first_name,
           NULLIF(pd.middle_name, ''),
           pd.last_name
         ))                                               AS full_name,
         u.email,
         u.phone,
         pd.gender::text,
         pd.date_of_birth,
         DATE_PART('year', AGE(pd.date_of_birth))::int   AS age,
         pd.marital_status,
         ed.family_income::text,
         ed.self_income::text,
         a.city,
         a.district,
         a.state,
         sa.applied_at                                    AS application_date,
         sa.status                                        AS approval_status,
         sa.review_comment,
         sa.family_member_id,
         fm.name                                          AS fm_name,
         fm.relation                                      AS fm_relation,
         fm.age                                           AS fm_age,
         fm.gender::text                                  AS fm_gender,
         fm.dob                                           AS fm_dob
       FROM scholarship_applications sa
       JOIN profiles               p   ON p.id  = sa.profile_id
       JOIN users                  u   ON u.id  = p.user_id
       LEFT JOIN personal_details  pd  ON pd.profile_id = p.id
       LEFT JOIN economic_details  ed  ON ed.profile_id = p.id
       LEFT JOIN addresses         a   ON a.profile_id  = p.id
                                       AND a.address_type = 'current'
       LEFT JOIN family_members    fm  ON fm.id = sa.family_member_id
       WHERE sa.scholarship_id = $1
       ORDER BY p.id, sa.applied_at DESC`,
      [scholarshipId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getApplicants error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateApplicantStatus(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sanghaId = await getSanghaId(req.user.id);
    const { id: scholarshipId, applicationId } = req.params;
    const { action, comment = null } = req.body;

    if (!["approve", "reject", "revoke"].includes(action)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "action must be approve | reject | revoke" });
    }

    const { rows: scholRows } = await client.query(
      `SELECT id, max_approvals_unlimited, max_approvals
       FROM scholarships
       WHERE id = $1 AND sangha_id = $2`,
      [scholarshipId, sanghaId]
    );
    if (!scholRows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }
    const schol = scholRows[0];

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*) AS cnt
       FROM scholarship_applications
       WHERE scholarship_id = $1 AND status = 'approved'`,
      [scholarshipId]
    );
    const approvedBefore = parseInt(countRows[0].cnt, 10);

    if (action === "approve" && !schol.max_approvals_unlimited) {
      if (approvedBefore >= schol.max_approvals) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Approval quota is full" });
      }
    }

    const newStatus =
      action === "approve" ? "approved" :
      action === "reject"  ? "rejected" :
      "pending";

    const reviewedAt = action === "revoke" ? null : new Date();
    const reviewedBy = action === "revoke" ? null : req.user.id;

    const { rowCount } = await client.query(
      `UPDATE scholarship_applications
       SET status         = $1,
           reviewed_at    = $2,
           reviewed_by    = $3,
           review_comment = $4
       WHERE id = $5 AND scholarship_id = $6`,
      [newStatus, reviewedAt, reviewedBy, comment, applicationId, scholarshipId]
    );

    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    await client.query("COMMIT");

    const approvedAfter = action === "approve" ? approvedBefore + 1 : approvedBefore;
    const quotaFull =
      action === "approve" &&
      !schol.max_approvals_unlimited &&
      schol.max_approvals !== null &&
      approvedAfter >= schol.max_approvals;

    res.json({
      success: true,
      message: `Application ${newStatus}`,
      newStatus,
      quotaFull,
      approvedCount: approvedAfter,
      maxApprovals: schol.max_approvals,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateApplicantStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

async function getApplicantStats(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { id: scholarshipId } = req.params;

    const { rows: own } = await pool.query(
      `SELECT id FROM scholarships WHERE id = $1 AND sangha_id = $2`,
      [scholarshipId, sanghaId]
    );
    if (!own.length) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }

    const { rows } = await pool.query(
      `SELECT
         COUNT(*)                                         AS total,
         COUNT(*) FILTER (WHERE status = 'approved')     AS approved,
         COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected,
         COUNT(*) FILTER (WHERE status = 'pending')      AS pending
       FROM scholarship_applications
       WHERE scholarship_id = $1`,
      [scholarshipId]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getApplicantStats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getApplicantProfile(req, res) {
  const client = await pool.connect();
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { id: scholarshipId, profileId } = req.params;

    const { rows: own } = await client.query(
      `SELECT id FROM scholarships WHERE id = $1 AND sangha_id = $2`,
      [scholarshipId, sanghaId]
    );
    if (!own.length) return res.status(404).json({ success: false, message: "Scholarship not found" });

    const { rows: appRows } = await client.query(
      `SELECT id FROM scholarship_applications WHERE scholarship_id = $1 AND profile_id = $2`,
      [scholarshipId, profileId]
    );
    if (!appRows.length) return res.status(404).json({ success: false, message: "Applicant not found" });

    const [
      { rows: [pd] },
      { rows: [rd] },
      { rows: [fi] },
      { rows: [ed] },
      { rows: [addr] },
      { rows: fms },
      { rows: meRows },
      { rows: [ins] },
      { rows: [docs] },
      { rows: [user] },
    ] = await Promise.all([
      client.query(`SELECT * FROM personal_details WHERE profile_id = $1`, [profileId]),
      client.query(`SELECT * FROM religious_details WHERE profile_id = $1`, [profileId]),
      client.query(`SELECT * FROM family_info WHERE profile_id = $1`, [profileId]),
      client.query(`SELECT * FROM economic_details WHERE profile_id = $1`, [profileId]),
      client.query(`SELECT * FROM addresses WHERE profile_id = $1 AND address_type = 'current'`, [profileId]),
      client.query(`SELECT * FROM family_members WHERE profile_id = $1 ORDER BY sort_order ASC`, [profileId]),
      client.query(`
        SELECT me.*,
               COALESCE(json_agg(DISTINCT mec) FILTER (WHERE mec.id IS NOT NULL), '[]') AS certifications,
               COALESCE(json_agg(DISTINCT mel) FILTER (WHERE mel.id IS NOT NULL), '[]') AS languages,
               COALESCE(json_agg(DISTINCT meed) FILTER (WHERE meed.id IS NOT NULL), '[]') AS educations
        FROM member_education me
        LEFT JOIN member_certifications mec ON mec.member_education_id = me.id
        LEFT JOIN member_languages mel ON mel.member_education_id = me.id
        LEFT JOIN member_educations meed ON meed.member_education_id = me.id
        WHERE me.profile_id = $1
        GROUP BY me.id
        ORDER BY me.sort_order ASC
      `, [profileId]),
      client.query(`SELECT * FROM member_insurance WHERE profile_id = $1 ORDER BY sort_order ASC`, [profileId]),
      client.query(`SELECT * FROM member_documents WHERE profile_id = $1 ORDER BY sort_order ASC`, [profileId]),
      client.query(
        `SELECT u.email, u.phone FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
        [profileId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        user: user || {},
        personalDetails: pd || null,
        religiousDetails: rd || null,
        familyInfo: fi || null,
        economicDetails: ed || null,
        address: addr || null,
        familyMembers: fms || [],
        memberEducation: meRows || [],
        memberInsurance: ins || null,
        memberDocuments: docs || null,
      },
    });
  } catch (err) {
    console.error("getApplicantProfile error:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getCategories,
  createCategory,
  getCustomCriteria,
  createCustomCriterion,
  updateCustomCriterion,
  deleteCustomCriterion,
  getScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getApplicants,
  updateApplicantStatus,
  getApplicantStats,
  getApplicantProfile,
};
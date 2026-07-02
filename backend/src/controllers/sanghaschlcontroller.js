// Community-Application\backend\src\controllers\sanghaschlcontroller.j s
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
// ALL APPLICANTS — across every scholarship owned by this sangha
// ════════════════════════════════════════════════════════════════════════════════

async function getAllApplicants(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const {
      year = "",
      start_date = "",
      end_date = "",
      status = "",
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Base conditions (sangha + year/date) — used for status tab counts,
    // so counts stay stable when switching tabs
    const baseConditions = ["s.sangha_id = $1"];
    const baseParams = [sanghaId];

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

    // Full conditions (base + status) — used for the actual list
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
      ${whereClause}
    `;

    const filteredScholarshipCountQuery = `
      SELECT COUNT(DISTINCT sa.scholarship_id) AS cnt
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      ${whereClause}
    `;

    const statusCountsQuery = `
      SELECT sa.status, COUNT(*) AS cnt
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      ${baseWhereClause}
      GROUP BY sa.status
    `;

    const grandTotalsQuery = `
      SELECT
        COUNT(*)                          AS total_applicants,
        COUNT(DISTINCT sa.scholarship_id) AS total_scholarships
      FROM scholarship_applications sa
      JOIN scholarships s ON s.id = sa.scholarship_id
      WHERE s.sangha_id = $1
    `;

    const dataParams = [...params];
    dataParams.push(Number(limit));
    dataParams.push(offset);

    const dataQuery = `
      SELECT
        sa.id                                            AS application_id,
        sa.status,
        sa.applied_at,
        sa.reviewed_at,
        sa.review_comment,
        sa.family_member_id,
        s.id                                              AS scholarship_id,
        s.name                                            AS scholarship_title,
        p.id                                               AS profile_id,
        TRIM(CONCAT_WS(' ',
          pd.first_name, NULLIF(pd.middle_name, ''), pd.last_name
        ))                                                AS full_name,
        u.email,
        u.phone,
        DATE_PART('year', AGE(pd.date_of_birth))::int    AS age,
        a.city, a.district, a.state,
        fm.name                                           AS fm_name,
        fm.relation                                       AS fm_relation
      FROM scholarship_applications sa
      JOIN scholarships          s  ON s.id  = sa.scholarship_id
      JOIN profiles               p  ON p.id  = sa.profile_id
      JOIN users                  u  ON u.id  = p.user_id
      LEFT JOIN personal_details  pd ON pd.profile_id = p.id
      LEFT JOIN addresses         a  ON a.profile_id  = p.id AND a.address_type = 'current'
      LEFT JOIN family_members    fm ON fm.id = sa.family_member_id
      ${whereClause}
      ORDER BY sa.applied_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const [countResult, filteredSchlCountResult, statusCountsResult, grandTotalsResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(filteredScholarshipCountQuery, params),
      pool.query(statusCountsQuery, baseParams),
      pool.query(grandTotalsQuery, [sanghaId]),
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
      familyMemberName: row.fm_name || null,
      familyMemberRelation: row.fm_relation || null,
      profileId: row.profile_id,
      scholarshipId: row.scholarship_id,
      scholarshipTitle: row.scholarship_title,
      user: {
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        age: row.age,
        city: row.city,
        district: row.district,
        state: row.state,
      },
    }));

    res.json({
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
    res.status(500).json({ success: false, message: err.message });
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

// ════════════════════════════════════════════════════════════════════════════════
// APPLICANTS PER SCHOLARSHIP (sangha-scoped) — mirrors admin's getScholarshipApplicants
// ════════════════════════════════════════════════════════════════════════════════

async function getScholarshipApplicantsList(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { id } = req.params;
    const { status = "all", page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const schlCheck = await pool.query(
      `SELECT s.id, s.name AS title
       FROM scholarships s
       WHERE s.id = $1 AND s.sangha_id = $2`,
      [id, sanghaId]
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

    const countQuery = `SELECT COUNT(*) AS total FROM scholarship_applications sa ${whereClause}`;

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
        TRIM(CONCAT_WS(' ', pd.first_name, NULLIF(pd.middle_name, ''), pd.last_name)) AS full_name,
        p.photo_url            AS profile_photo,
        p.id                   AS profile_id,
        adr.state              AS user_state,
        adr.district           AS user_district,
        DATE_PART('year', AGE(pd.date_of_birth))::int AS age,
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
      },
    }));

    return res.status(200).json({
      success: true,
      scholarship: { id: schlCheck.rows[0].id, title: schlCheck.rows[0].title },
      data: applicants,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getScholarshipApplicantsList error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// APPLICANT FULL DETAILS (sangha-scoped) — mirrors admin's getApplicantDetails,
// PLUS education documents (member_education_details) and bank details
// (member_bank_details), which admin's version does not have.
// ════════════════════════════════════════════════════════════════════════════════

async function getSanghaApplicantDetails(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { applicationId } = req.params;

    // 1. Fetch application + verify it belongs to a scholarship owned by this sangha
    const appResult = await pool.query(
      `SELECT sa.profile_id, sa.family_member_id, sa.status, sa.applied_at, sa.reviewed_at, sa.review_comment,
              s.sangha_id
       FROM scholarship_applications sa
       JOIN scholarships s ON s.id = sa.scholarship_id
       WHERE sa.id = $1`,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    const app = appResult.rows[0];
    if (app.sangha_id !== sanghaId) {
      return res.status(403).json({ success: false, message: "This application does not belong to your sangha" });
    }

    const profileId = app.profile_id;
    const familyMemberId = app.family_member_id;
    const isFamilyMember = !!familyMemberId;

    // 2. Base user info
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

    // ── Helper: fetch education documents + bank details (NEW — sangha-only addition) ──
    async function fetchEducationAndBank(fmId) {
      const [eduRes, bankRes] = await Promise.all([
        pool.query(
          `SELECT employment_type, pursuing_degree,
                  sslc_school_name, sslc_year, sslc_percentage, sslc_marks_card_url,
                  pu_college_name, pu_year, pu_percentage, pu_marks_card_url,
                  degree_name, degree_institution, degree_year, degree_percentage, degree_certificate_url
           FROM member_education_details
           WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
           LIMIT 1`,
          [profileId, fmId]
        ),
        pool.query(
          `SELECT account_holder_name, bank_name, account_number, ifsc, branch
           FROM member_bank_details
           WHERE profile_id = $1 AND (family_member_id = $2 OR ($2 IS NULL AND family_member_id IS NULL))
           LIMIT 1`,
          [profileId, fmId]
        ),
      ]);

      const e = eduRes.rows[0] || null;
      const b = bankRes.rows[0] || null;

      return {
        documents: e ? {
          employmentType: e.employment_type,
          pursuingDegree: e.pursuing_degree,
          sslcSchoolName: e.sslc_school_name,
          sslcYear: e.sslc_year,
          sslcPercentage: e.sslc_percentage,
          sslcMarksCardUrl: e.sslc_marks_card_url,
          puCollegeName: e.pu_college_name,
          puYear: e.pu_year,
          puPercentage: e.pu_percentage,
          puMarksCardUrl: e.pu_marks_card_url,
          degreeName: e.degree_name,
          degreeInstitution: e.degree_institution,
          degreeYear: e.degree_year,
          degreePercentage: e.degree_percentage,
          degreeCertificateUrl: e.degree_certificate_url,
        } : null,
        bankDetails: b ? {
          accountHolderName: b.account_holder_name,
          bankName: b.bank_name,
          accountNumber: b.account_number,
          ifsc: b.ifsc,
          branch: b.branch,
        } : null,
      };
    }

    // ── FAMILY MEMBER APPLICANT ──────────────────────────────────────────────
    if (isFamilyMember) {
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

      const fmEduResult = await pool.query(
        `SELECT me.id, me.highest_education, me.brief_profile, me.profession_type,
                me.profession_other, me.self_employed_type, me.self_employed_other,
                me.industry, me.is_currently_studying, me.is_currently_working
         FROM member_education me
         WHERE me.profile_id = $1 AND me.member_name = $2 AND me.member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmEdu = fmEduResult.rows[0] || null;

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
      }

      const fmInsResult = await pool.query(
        `SELECT health_coverage, life_coverage, term_coverage, konkani_card_coverage
         FROM member_insurance
         WHERE profile_id = $1 AND member_name = $2 AND member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmIns = fmInsResult.rows[0] || null;

      const fmDocResult = await pool.query(
        `SELECT aadhaar_coverage, pan_coverage, voter_id_coverage, land_doc_coverage, dl_coverage
         FROM member_documents
         WHERE profile_id = $1 AND member_name = $2 AND member_relation = $3
         LIMIT 1`,
        [profileId, fm.name, fm.relation]
      );
      const fmDoc = fmDocResult.rows[0] || null;

      const { documents: eduDocuments, bankDetails } = await fetchEducationAndBank(familyMemberId);

      return res.status(200).json({
        success: true,
        applicantType: "family_member",
        data: {
          name: fm.name,
          relation: fm.relation,
          age: fm.age,
          dob: fm.dob,
          gender: fm.gender,
          disability: fm.disability,
          status: fm.status,
          photoUrl: fm.photo_url,
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
          insurance: fmIns ? {
            healthCoverage: fmIns.health_coverage,
            lifeCoverage: fmIns.life_coverage,
            termCoverage: fmIns.term_coverage,
            konkaniCardCoverage: fmIns.konkani_card_coverage,
          } : null,
          identityDocuments: fmDoc ? {
            aadhaarCoverage: fmDoc.aadhaar_coverage,
            panCoverage: fmDoc.pan_coverage,
            voterIdCoverage: fmDoc.voter_id_coverage,
            landDocCoverage: fmDoc.land_doc_coverage,
            dlCoverage: fmDoc.dl_coverage,
          } : null,
          // ── NEW: education certificates + bank details ──
          documents: eduDocuments,
          bankDetails,
        },
      });
    }

    // ── USER (SELF) APPLICANT ────────────────────────────────────────────────
    const relResult = await pool.query(
      `SELECT gotra, pravara, kuladevata, kuladevata_other, surname_in_use,
              surname_as_per_gotra, priest_name, priest_location,
              upanama_general, upanama_proper, demi_gods, demi_god_other,
              ancestral_challenge, ancestral_challenge_notes
       FROM religious_details WHERE profile_id = $1`,
      [profileId]
    );
    const rel = relResult.rows[0] || null;

    const addrResult = await pool.query(
      `SELECT address_type, flat_no, building, street, landmark, area,
              city, taluk, district, state, pincode, country
       FROM addresses WHERE profile_id = $1 ORDER BY created_at ASC`,
      [profileId]
    );
    const addresses = addrResult.rows;

    const ecoResult = await pool.query(
      `SELECT self_income, family_income,
              inv_fixed_deposits, inv_mutual_funds_sip, inv_shares_demat, inv_others,
              fac_rented_house, fac_own_house, fac_agricultural_land, fac_two_wheeler, fac_car
       FROM economic_details WHERE profile_id = $1`,
      [profileId]
    );
    const eco = ecoResult.rows[0] || null;

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

    const userName = [userRow.first_name, userRow.last_name].filter(Boolean).join(" ");
    const insResult = await pool.query(
      `SELECT health_coverage, life_coverage, term_coverage, konkani_card_coverage
       FROM member_insurance
       WHERE profile_id = $1 AND (member_relation = 'Self' OR member_name = $2)
       ORDER BY sort_order ASC LIMIT 1`,
      [profileId, userName]
    );
    const ins = insResult.rows[0] || null;

    const docResult = await pool.query(
      `SELECT aadhaar_coverage, pan_coverage, voter_id_coverage, land_doc_coverage, dl_coverage
       FROM member_documents
       WHERE profile_id = $1 AND (member_relation = 'Self' OR member_name = $2)
       ORDER BY sort_order ASC LIMIT 1`,
      [profileId, userName]
    );
    const doc = docResult.rows[0] || null;

    const sanghaResult = await pool.query(
      `SELECT ms.sangha_name, ms.role, ms.tenure, ms.status
       FROM member_sanghas ms
       WHERE ms.profile_id = $1`,
      [profileId]
    );
    const sanghas = sanghaResult.rows;

    const { documents: eduDocuments, bankDetails } = await fetchEducationAndBank(null);

    return res.status(200).json({
      success: true,
      applicantType: "self",
      data: {
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
        contact: { email: userRow.email, phone: userRow.phone },
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
        addresses: addresses.map(a => ({
          type: a.address_type, flatNo: a.flat_no, building: a.building, street: a.street,
          landmark: a.landmark, area: a.area, city: a.city, taluk: a.taluk,
          district: a.district, state: a.state, pincode: a.pincode, country: a.country,
        })),
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
        insurance: ins ? {
          healthCoverage: ins.health_coverage,
          lifeCoverage: ins.life_coverage,
          termCoverage: ins.term_coverage,
          konkaniCardCoverage: ins.konkani_card_coverage,
        } : null,
        identityDocuments: doc ? {
          aadhaarCoverage: doc.aadhaar_coverage,
          panCoverage: doc.pan_coverage,
          voterIdCoverage: doc.voter_id_coverage,
          landDocCoverage: doc.land_doc_coverage,
          dlCoverage: doc.dl_coverage,
        } : null,
        sanghas,
        // ── NEW: education certificates + bank details ──
        documents: eduDocuments,
        bankDetails,
      },
    });
  } catch (err) {
    console.error("getSanghaApplicantDetails error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SCHOLARSHIP HISTORY (Applied / Benefitted tabs) — sangha-scoped
// mirrors admin's getApplicantScholarshipHistory
// ════════════════════════════════════════════════════════════════════════════════

async function getSanghaApplicantScholarshipHistory(req, res) {
  try {
    const sanghaId = await getSanghaId(req.user.id);
    const { applicationId } = req.params;
    const { type = "applied", start_date, end_date } = req.query;

    const appResult = await pool.query(
      `SELECT sa.profile_id, sa.family_member_id, s.sangha_id
       FROM scholarship_applications sa
       JOIN scholarships s ON s.id = sa.scholarship_id
       WHERE sa.id = $1`,
      [applicationId]
    );
    if (!appResult.rows.length) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    const { profile_id: profileId, family_member_id: familyMemberId, sangha_id: ownerSanghaId } = appResult.rows[0];
    if (ownerSanghaId !== sanghaId) {
      return res.status(403).json({ success: false, message: "This application does not belong to your sangha" });
    }

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
        st.amount            AS tier_amount
      FROM scholarship_applications sa
      JOIN scholarships s   ON s.id  = sa.scholarship_id
      JOIN sanghas sg       ON sg.id = s.sangha_id
      LEFT JOIN LATERAL (
        SELECT amount FROM scholarship_tiers
        WHERE scholarship_id = s.id ORDER BY sort_order ASC LIMIT 1
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
      meta: { type, startDate: start_date || null, endDate: end_date || null, availableYears, currentYear },
    });
  } catch (err) {
    console.error("getSanghaApplicantScholarshipHistory error:", err);
    return res.status(500).json({ success: false, message: err.message });
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
  getAllApplicants,
  updateApplicantStatus,
  getApplicantStats,
  getApplicantProfile,
  // ── NEW ──
  getScholarshipApplicantsList,
  getSanghaApplicantDetails,
  getSanghaApplicantScholarshipHistory,
};
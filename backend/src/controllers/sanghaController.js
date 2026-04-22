// ════════════════════════════════════════════════════════════
// FULL EXPORT — for Custom Report tab
// POST /sangha/reports/export/full
//
// Accepts: { sections: string[], includeAllStatuses: boolean }
// Returns: merged flat rows joining all requested sections.
//
// Sections:
//   "personal-details"    → personal_details + addresses (partial)
//   "economic-details"    → economic_details
//   "education-profession"→ member_education
//   "family-information"  → family_info + member_insurance
//   "location-information"→ addresses
//   "religious-details"   → religious_details
// ════════════════════════════════════════════════════════════

const getFullExportData = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { sections = [], includeAllStatuses = false } = req.body;
    const sanghaId = await getSanghaId(userId);
    if (!sanghaId) return res.status(404).json({ message: 'Sangha not found' });

    // Status filter
    const statusFilter = includeAllStatuses
      ? '' // no status restriction
      : `AND p.status = 'approved'`;

    // ── Base query: always include profile + user + personal details ──────────
    const baseRows = await pool.query(
      `SELECT
         p.id                                                                    AS profile_id,
         p.status                                                                AS "Status",
         u.id                                                                    AS user_id,
         u.email                                                                 AS "Email",
         u.phone                                                                 AS "Phone",
         TRIM(CONCAT(
           COALESCE(pd.first_name,''), ' ',
           COALESCE(pd.middle_name || ' ', ''),
           COALESCE(pd.last_name,'')
         ))                                                                      AS "Full Name",
         pd.gender::text                                                         AS "Gender",
         TO_CHAR(pd.date_of_birth,'DD-Mon-YYYY')                                AS "Date of Birth",
         TO_CHAR(p.submitted_at,'DD-Mon-YYYY')                                  AS "Submitted At",
         TO_CHAR(p.reviewed_at, 'DD-Mon-YYYY')                                  AS "Reviewed At"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN personal_details pd ON pd.profile_id = p.id
       WHERE p.sangha_id = $1 ${statusFilter}
       ORDER BY "Full Name"
       LIMIT 5000`,
      [sanghaId]
    );

    // Build profile_id → row map
    const rowMap = new Map();
    for (const row of baseRows.rows) {
      rowMap.set(row.profile_id, { ...row });
    }
    const profileIds = baseRows.rows.map(r => r.profile_id);

    if (profileIds.length === 0) return res.json([]);

    // ── Economic Details ───────────────────────────────────────────────────────
    if (sections.includes('economic-details')) {
      const ecRows = await pool.query(
        `SELECT
           profile_id,
           self_income::text                                         AS "Self Income (Individual)",
           family_income::text                                       AS "Family Income (Annual)",
           fac_own_house                                             AS "Owns House",
           fac_agricultural_land                                     AS "Has Agricultural Land",
           fac_car                                                   AS "Has 4-Wheeler",
           fac_two_wheeler                                           AS "Has 2-Wheeler",
           fac_rented_house                                          AS "Renting"
         FROM economic_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const ec of ecRows.rows) {
        const r = rowMap.get(ec.profile_id);
        if (r) {
          r["Self Income (Individual)"]  = ec["Self Income (Individual)"];
          r["Family Income (Annual)"]    = ec["Family Income (Annual)"];
          r["Owns House"]               = ec["Owns House"];
          r["Has Agricultural Land"]    = ec["Has Agricultural Land"];
          r["Has 4-Wheeler"]            = ec["Has 4-Wheeler"];
          r["Has 2-Wheeler"]            = ec["Has 2-Wheeler"];
          r["Renting"]                  = ec["Renting"];
        }
      }
    }

    // ── Education & Profession ─────────────────────────────────────────────────
    if (sections.includes('education-profession')) {
      const eduRows = await pool.query(
        `SELECT
           me.profile_id,
           me.member_name                                            AS "Member Name",
           me.member_relation                                        AS "Relation",
           me.highest_education                                      AS "Education Level",
           me.profession_type::text                                  AS "Profession",
           me.is_currently_studying                                  AS "Currently Studying",
           me.is_currently_working                                   AS "Currently Working"
         FROM member_education me
         WHERE me.profile_id = ANY($1)
         ORDER BY me.sort_order`,
        [profileIds]
      );
      // Group by profile_id — use first record for single-row merge
      // For multi-member education, concatenate
      const eduMap = new Map();
      for (const edu of eduRows.rows) {
        if (!eduMap.has(edu.profile_id)) {
          eduMap.set(edu.profile_id, edu);
        } else {
          // Append additional members
          const existing = eduMap.get(edu.profile_id);
          existing["Member Name"] = `${existing["Member Name"] || ''} | ${edu["Member Name"] || ''}`.trim().replace(/^\|/, '');
          existing["Education Level"] = `${existing["Education Level"] || ''} | ${edu["Education Level"] || ''}`.trim().replace(/^\|/, '');
          existing["Profession"] = `${existing["Profession"] || ''} | ${edu["Profession"] || ''}`.trim().replace(/^\|/, '');
        }
      }
      for (const [pid, edu] of eduMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Member Name"]          = edu["Member Name"];
          r["Relation"]             = edu["Relation"];
          r["Education Level"]      = edu["Education Level"];
          r["Profession"]           = edu["Profession"];
          r["Currently Studying"]   = edu["Currently Studying"];
          r["Currently Working"]    = edu["Currently Working"];
        }
      }
    }

    // ── Family Information + Insurance ────────────────────────────────────────
    if (sections.includes('family-information')) {
      const fiRows = await pool.query(
        `SELECT profile_id, family_type::text AS "Family Type"
         FROM family_info WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const fi of fiRows.rows) {
        const r = rowMap.get(fi.profile_id);
        if (r) r["Family Type"] = fi["Family Type"];
      }

      const insRows = await pool.query(
        `SELECT
           profile_id,
           array_to_string(health_coverage,       ', ') AS "Health Coverage",
           array_to_string(life_coverage,         ', ') AS "Life Coverage",
           array_to_string(term_coverage,         ', ') AS "Term Coverage",
           array_to_string(konkani_card_coverage, ', ') AS "Konkani Card Coverage"
         FROM member_insurance
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      // Use first row per profile
      const insMap = new Map();
      for (const ins of insRows.rows) {
        if (!insMap.has(ins.profile_id)) insMap.set(ins.profile_id, ins);
      }
      for (const [pid, ins] of insMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Health Coverage"]       = ins["Health Coverage"];
          r["Life Coverage"]         = ins["Life Coverage"];
          r["Term Coverage"]         = ins["Term Coverage"];
          r["Konkani Card Coverage"] = ins["Konkani Card Coverage"];
        }
      }
    }

    // ── Location Information ───────────────────────────────────────────────────
    if (sections.includes('location-information')) {
      const addrRows = await pool.query(
        `SELECT profile_id, TRIM(city) AS "City", district AS "District", state AS "State", pincode AS "Pincode"
         FROM addresses
         WHERE profile_id = ANY($1)
         LIMIT 5000`,
        [profileIds]
      );
      // Use first address per profile
      const addrMap = new Map();
      for (const a of addrRows.rows) {
        if (!addrMap.has(a.profile_id)) addrMap.set(a.profile_id, a);
      }
      for (const [pid, addr] of addrMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["City"]     = addr["City"];
          r["District"] = addr["District"];
          r["State"]    = addr["State"];
          r["Pincode"]  = addr["Pincode"];
        }
      }
    }

    // ── Religious Details ──────────────────────────────────────────────────────
    if (sections.includes('religious-details')) {
      const relRows = await pool.query(
        `SELECT profile_id, gotra AS "Gotra", pravara AS "Pravara", kuladevata AS "Kuladevata"
         FROM religious_details
         WHERE profile_id = ANY($1)`,
        [profileIds]
      );
      for (const rel of relRows.rows) {
        const r = rowMap.get(rel.profile_id);
        if (r) {
          r["Gotra"]      = rel["Gotra"];
          r["Pravara"]    = rel["Pravara"];
          r["Kuladevata"] = rel["Kuladevata"];
        }
      }
    }

    // ── Document Status ────────────────────────────────────────────────────────
    if (sections.includes('personal-details')) {
      const docRows = await pool.query(
        `SELECT
           profile_id,
           aadhaar_coverage::text  AS "Aadhaar",
           pan_coverage::text      AS "PAN Card",
           voter_id_coverage::text AS "Voter ID",
           land_doc_coverage::text AS "Land Docs",
           dl_coverage::text       AS "DL"
         FROM member_documents
         WHERE profile_id = ANY($1)
         ORDER BY sort_order`,
        [profileIds]
      );
      const docMap = new Map();
      for (const d of docRows.rows) {
        if (!docMap.has(d.profile_id)) docMap.set(d.profile_id, d);
      }
      for (const [pid, doc] of docMap) {
        const r = rowMap.get(pid);
        if (r) {
          r["Aadhaar"]   = doc["Aadhaar"];
          r["PAN Card"]  = doc["PAN Card"];
          r["Voter ID"]  = doc["Voter ID"];
          r["Land Docs"] = doc["Land Docs"];
          r["DL"]        = doc["DL"];
        }
      }
    }

    // ── Clean up internal keys before responding ───────────────────────────────
    const result = Array.from(rowMap.values()).map(row => {
      const { profile_id, user_id, ...rest } = row;
      return rest;
    });

    res.json(result);

  } catch (err) {
    console.error('[getFullExportData]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Also update getEnhancedReports to include daily rejections ───────────────
// In getEnhancedReports, replace the dailyRegs query with:
//
//   pool.query(
//     `SELECT
//        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
//        COUNT(*) AS registrations,
//        COUNT(*) FILTER (WHERE status='approved') AS approvals,
//        COUNT(*) FILTER (WHERE status='rejected') AS rejections
//      FROM profiles
//      WHERE sangha_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
//      GROUP BY DATE(created_at)
//      ORDER BY DATE(created_at) ASC`,
//     [sanghaId]
//   ),

module.exports = { getFullExportData };

// ─── ADD THESE LINES to sanghaController.js module.exports: ──────────────────
// getFullExportData,
//
// ─── ADD THIS ROUTE to sangha.js (before module.exports): ────────────────────
// router.post('/reports/export/full', requireRole('sangha', 'admin'), sc.getFullExportData);
-- ============================================================
-- RSB COMMUNITY PORTAL — Complete PostgreSQL Schema
-- Covers: User + Sangha + Admin (Unified users table)
-- ============================================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'sangha', 'admin');

CREATE TYPE profile_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'changes_requested'
);

CREATE TYPE sangha_status AS ENUM (
  'pending_approval',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE family_type AS ENUM ('nuclear', 'joint');
CREATE TYPE member_status AS ENUM ('active', 'passed_away', 'unknown');

CREATE TYPE profession_type AS ENUM (
  'private', 'government', 'ias_ips_ifs',
  'self_employed', 'farmer', 'training', 'other'
);

CREATE TYPE self_employed_type AS ENUM (
  'self_small_firm', 'self_company', 'self_shop',
  'freelancer', 'farmer', 'other', 'training'
);

CREATE TYPE income_slab AS ENUM (
  'below_1l', '1_2l', '2_3l', '3_5l',
  '5_10l', '10_25l', '25l_plus'
);

CREATE TYPE doc_coverage AS ENUM ('self', 'wife', 'kids', 'parents', 'all');
CREATE TYPE review_action AS ENUM ('approved', 'rejected', 'changes_requested');

-- ============================================================
-- 1. USERS — Single table for all roles
-- ============================================================

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role                user_role NOT NULL DEFAULT 'user',
  email               VARCHAR(255) UNIQUE,
  phone               VARCHAR(20) UNIQUE,
  password_hash       TEXT,
  otp_code            VARCHAR(6),
  otp_expires_at      TIMESTAMP,
  is_phone_verified   BOOLEAN DEFAULT FALSE,
  is_email_verified   BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  is_deleted          BOOLEAN DEFAULT FALSE,
  last_login_at       TIMESTAMP,
  last_login_ip       VARCHAR(45),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. SANGHA PROFILES — One per sangha user
-- ============================================================

CREATE TABLE sangha_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sangha_name      VARCHAR(255) NOT NULL,
  location         VARCHAR(255) NOT NULL,
  contact_person   VARCHAR(255) NOT NULL,
  area_covered     VARCHAR(255),
  status           sangha_status NOT NULL DEFAULT 'pending_approval',
  approved_at      TIMESTAMP,
  approved_by      UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- 3. SANGHA MEMBERS — Internal team members of a Sangha
-- ============================================================

CREATE TABLE sangha_members (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sangha_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name      VARCHAR(150) NOT NULL,
  gender         VARCHAR(10),
  phone          VARCHAR(20),
  email          VARCHAR(255),
  dob            DATE,
  role           VARCHAR(100),
  member_type    VARCHAR(50),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. PROFILES — Census form, one per user
-- ============================================================

CREATE TABLE profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                  profile_status NOT NULL DEFAULT 'draft',
  submitted_at            TIMESTAMP,
  reviewed_at             TIMESTAMP,
  reviewed_by             UUID REFERENCES users(id),
  review_comment          TEXT,
  sangha_id               UUID REFERENCES users(id),
  step1_personal_pct      SMALLINT DEFAULT 0,
  step2_religious_pct     SMALLINT DEFAULT 0,
  step3_family_pct        SMALLINT DEFAULT 0,
  step4_location_pct      SMALLINT DEFAULT 0,
  step5_education_pct     SMALLINT DEFAULT 0,
  step6_economic_pct      SMALLINT DEFAULT 0,
  overall_completion_pct  SMALLINT DEFAULT 0,
  step1_completed         BOOLEAN DEFAULT FALSE,
  step2_completed         BOOLEAN DEFAULT FALSE,
  step3_completed         BOOLEAN DEFAULT FALSE,
  step4_completed         BOOLEAN DEFAULT FALSE,
  step5_completed         BOOLEAN DEFAULT FALSE,
  step6_completed         BOOLEAN DEFAULT FALSE,
  photo_url               TEXT,
  photo_uploaded_at       TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- 5. PERSONAL DETAILS — Step 1
-- ============================================================

CREATE TABLE personal_details (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name            VARCHAR(100) NOT NULL,
  middle_name           VARCHAR(100),
  last_name             VARCHAR(100) NOT NULL,
  gender                gender_type NOT NULL,
  date_of_birth         DATE,
  fathers_name          VARCHAR(150),
  mothers_name          VARCHAR(150),
  mothers_maiden_name   VARCHAR(150),
  wife_name             VARCHAR(150),
  wife_maiden_name      VARCHAR(150),
  husbands_name         VARCHAR(150),
  surname_in_use        VARCHAR(100),
  surname_as_per_gotra  VARCHAR(100),
  is_married            BOOLEAN DEFAULT FALSE,
  has_disability        VARCHAR(5),
  is_part_of_sangha     VARCHAR(5),
  sangha_name           VARCHAR(255),
  sangha_role           VARCHAR(100),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ============================================================
-- 6. RELIGIOUS DETAILS — Step 2
-- ============================================================

CREATE TABLE religious_details (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gotra                 VARCHAR(100),
  pravara               VARCHAR(200),
  upanama               VARCHAR(100),
  kuladevata            VARCHAR(100),
  kuladevata_other      VARCHAR(100),
  surname_in_use        VARCHAR(100),
  surname_as_per_gotra  VARCHAR(100),
  priest_name           VARCHAR(150),
  priest_location       VARCHAR(200),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ============================================================
-- 7. FAMILY INFORMATION — Step 3
-- ============================================================

CREATE TABLE family_info (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_type family_type,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE TABLE family_members (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_info_id UUID NOT NULL REFERENCES family_info(id) ON DELETE CASCADE,
  relation       VARCHAR(100) NOT NULL,
  name           VARCHAR(150),
  age            SMALLINT,
  dob            DATE,
  disability     VARCHAR(5) DEFAULT 'no',
  gender         gender_type,
  photo_url      TEXT,
  status         member_status DEFAULT 'active',
  sort_order     SMALLINT DEFAULT 0,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 8. ADDRESSES — Step 4
-- ============================================================

CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL,
  flat_no      VARCHAR(50),
  building     VARCHAR(150),
  street       VARCHAR(200),
  area         VARCHAR(150),
  city         VARCHAR(100),
  state        VARCHAR(100),
  pincode      VARCHAR(10),
  latitude     DECIMAL(10, 8),
  longitude    DECIMAL(11, 8),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, address_type)
);

-- ============================================================
-- 9. EDUCATION & PROFESSION — Step 5
-- ============================================================

CREATE TABLE member_education (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_name           VARCHAR(150),
  member_relation       VARCHAR(100),
  sort_order            SMALLINT DEFAULT 0,
  highest_education     VARCHAR(100),
  brief_profile         TEXT,
  profession_type       profession_type,
  profession_other      VARCHAR(200),
  self_employed_type    self_employed_type,
  self_employed_other   VARCHAR(200),
  industry              VARCHAR(150),
  is_currently_studying BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE TABLE member_certifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_education_id UUID NOT NULL REFERENCES member_education(id) ON DELETE CASCADE,
  certification       VARCHAR(300) NOT NULL,
  sort_order          SMALLINT DEFAULT 0
);

CREATE TABLE member_languages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_education_id UUID NOT NULL REFERENCES member_education(id) ON DELETE CASCADE,
  language            VARCHAR(50) NOT NULL,
  language_other      VARCHAR(100),
  UNIQUE(member_education_id, language)
);

-- ============================================================
-- 10. ECONOMIC DETAILS — Step 6
-- ============================================================

CREATE TABLE economic_details (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  self_income           income_slab,
  family_income         income_slab,
  inv_fixed_deposits    BOOLEAN DEFAULT FALSE,
  inv_mutual_funds_sip  BOOLEAN DEFAULT FALSE,
  inv_shares_demat      BOOLEAN DEFAULT FALSE,
  inv_others            BOOLEAN DEFAULT FALSE,
  fac_rented_house      BOOLEAN DEFAULT FALSE,
  fac_own_house         BOOLEAN DEFAULT FALSE,
  fac_agricultural_land BOOLEAN DEFAULT FALSE,
  fac_two_wheeler       BOOLEAN DEFAULT FALSE,
  fac_car               BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE TABLE member_insurance (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_name           VARCHAR(150),
  member_relation       VARCHAR(100),
  sort_order            SMALLINT DEFAULT 0,
  health_coverage       doc_coverage[],
  life_coverage         doc_coverage[],
  term_coverage         doc_coverage[],
  konkani_card_coverage doc_coverage[]
);

CREATE TABLE member_documents (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_name          VARCHAR(150),
  member_relation      VARCHAR(100),
  sort_order           SMALLINT DEFAULT 0,
  aadhaar_coverage     doc_coverage[],
  pan_coverage         doc_coverage[],
  voter_id_coverage    doc_coverage[],
  land_doc_coverage    doc_coverage[],
  dl_coverage          doc_coverage[],
  all_records_coverage doc_coverage[]
);

-- ============================================================
-- 11. FAMILY HISTORY — Ancestral info
-- ============================================================

CREATE TABLE family_history (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ancestral_challenge_notes TEXT,
  demigods_info             TEXT,
  snake_god_naga_info       TEXT,
  common_relative_names     TEXT,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ============================================================
-- 12. PROFILE REVIEW HISTORY — Audit trail
-- ============================================================

CREATE TABLE profile_review_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action       review_action NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  comment      TEXT,
  snapshot     JSONB,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 13. PROFILE EDIT REQUESTS
-- ============================================================

CREATE TABLE profile_edit_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  reason       TEXT,
  status       VARCHAR(20) DEFAULT 'pending',
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role  ON users(role);

-- Sangha
CREATE INDEX idx_sangha_profiles_user   ON sangha_profiles(user_id);
CREATE INDEX idx_sangha_profiles_status ON sangha_profiles(status);
CREATE INDEX idx_sangha_members_sangha  ON sangha_members(sangha_user_id);

-- Profiles
CREATE INDEX idx_profiles_user   ON profiles(user_id);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_sangha ON profiles(sangha_id);

-- Profile detail tables
CREATE INDEX idx_family_members_profile   ON family_members(profile_id);
CREATE INDEX idx_addresses_profile        ON addresses(profile_id);
CREATE INDEX idx_member_edu_profile       ON member_education(profile_id);
CREATE INDEX idx_member_insurance_profile ON member_insurance(profile_id);
CREATE INDEX idx_member_documents_profile ON member_documents(profile_id);
CREATE INDEX idx_review_history_profile   ON profile_review_history(profile_id);
CREATE INDEX idx_review_history_performer ON profile_review_history(performed_by);

-- ============================================================
-- FUNCTION — auto updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION — auto overall_completion_pct
-- ============================================================

CREATE OR REPLACE FUNCTION update_overall_completion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_completion_pct := (
    NEW.step1_personal_pct +
    NEW.step2_religious_pct +
    NEW.step3_family_pct +
    NEW.step4_location_pct +
    NEW.step5_education_pct +
    NEW.step6_economic_pct
  ) / 6;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at triggers
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sangha_profiles_updated
  BEFORE UPDATE ON sangha_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sangha_members_updated
  BEFORE UPDATE ON sangha_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_personal_updated
  BEFORE UPDATE ON personal_details
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_religious_updated
  BEFORE UPDATE ON religious_details
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_family_updated
  BEFORE UPDATE ON family_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_location_updated
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_education_updated
  BEFORE UPDATE ON member_education
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_economic_updated
  BEFORE UPDATE ON economic_details
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_family_history_updated
  BEFORE UPDATE ON family_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Completion pct trigger
CREATE TRIGGER trg_completion_pct
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_overall_completion();

-- ============================================================
-- SEED — Default admin account
-- ============================================================

-- First insert the user
INSERT INTO users (email, phone, role, is_email_verified, is_active)
VALUES ('admin@gmail.com', '9999999999', 'admin', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Then set the bcrypt hash for password: admin123
UPDATE users 
SET password_hash = '$2b$10$wHh8lQFQmY7zv9qK1QzQ6uYJqz0J6QJp0qvR6z7Yt8Xw8Gq9J1m9W'
WHERE email = 'admin@gmail.com';
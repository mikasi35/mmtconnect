-- ============================================================
--  MMT Care Connect — Complete Database Schema
--  Run: psql -U postgres -d mmt_care_connect -f migrate.sql
-- ============================================================

-- Extensions (required for fuzzy location matching and UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fuzzy search

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'admin', 'coordinator', 'facility_manager', 'hospital_user'
);

CREATE TYPE facility_type AS ENUM ('SIL', 'SDA', 'STA');

CREATE TYPE vacancy_status AS ENUM ('available', 'reserved', 'occupied');

CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'immediate');

CREATE TYPE referral_source AS ENUM (
  'hospital', 'coordinator', 'family', 'self'
);

CREATE TYPE referral_status AS ENUM (
  'new', 'reviewing', 'matched', 'placed', 'rejected'
);

CREATE TYPE entity_type AS ENUM (
  'referral', 'facility', 'vacancy', 'user', 'placement'
);

-- ── Users ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'coordinator',
  organisation  VARCHAR(255),
  phone         VARCHAR(50),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);

-- ── Facilities ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  type            facility_type NOT NULL,
  address         VARCHAR(500) NOT NULL,
  suburb          VARCHAR(100) NOT NULL,
  state           VARCHAR(10) NOT NULL,
  postcode        VARCHAR(10),
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),
  description     TEXT,
  image_url       VARCHAR(1000),
  image_urls      JSONB NOT NULL DEFAULT '[]',
  contact_name    VARCHAR(255),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  capacity        INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facilities_type     ON facilities(type);
CREATE INDEX idx_facilities_state    ON facilities(state);
CREATE INDEX idx_facilities_active   ON facilities(is_active);
CREATE INDEX idx_facilities_location ON facilities(latitude, longitude);
CREATE INDEX idx_facilities_name_trgm   ON facilities USING gin(name   gin_trgm_ops);
CREATE INDEX idx_facilities_suburb_trgm ON facilities USING gin(suburb gin_trgm_ops);
CREATE INDEX idx_facilities_lat         ON facilities(latitude);
CREATE INDEX idx_facilities_lng         ON facilities(longitude);

ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]';

-- ── Vacancies ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vacancies (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id           UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  status                vacancy_status NOT NULL DEFAULT 'available',
  label                 VARCHAR(255),          -- e.g. "Room A, ground floor"
  care_level_supported  JSONB NOT NULL DEFAULT '{}',
  start_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date              DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vacancies_facility  ON vacancies(facility_id);
CREATE INDEX idx_vacancies_status    ON vacancies(status);
CREATE INDEX idx_vacancies_care      ON vacancies USING gin(care_level_supported);

-- ── Referrals ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referrals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name         VARCHAR(255) NOT NULL,
  client_age          INTEGER NOT NULL CHECK (client_age >= 0 AND client_age <= 120),
  care_needs          JSONB NOT NULL DEFAULT '{}',
  urgency             urgency_level NOT NULL DEFAULT 'medium',
  location_preference VARCHAR(255),
  source_type         referral_source NOT NULL,
  source_contact      VARCHAR(255),          -- hospital/coordinator name
  notes               TEXT,
  status              referral_status NOT NULL DEFAULT 'new',
  assigned_facility_id UUID REFERENCES facilities(id),
  assigned_vacancy_id  UUID REFERENCES vacancies(id),
  submitted_by         UUID NOT NULL REFERENCES users(id),
  reviewed_by          UUID REFERENCES users(id),
  placed_at            TIMESTAMPTZ,
  rejected_reason      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_status     ON referrals(status);
CREATE INDEX idx_referrals_urgency    ON referrals(urgency);
CREATE INDEX idx_referrals_submitted  ON referrals(submitted_by);
CREATE INDEX idx_referrals_created    ON referrals(created_at DESC);
CREATE INDEX idx_referrals_care       ON referrals USING gin(care_needs);
CREATE INDEX idx_referrals_name_trgm  ON referrals USING gin(client_name gin_trgm_ops);

-- ── Activity Logs ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     entity_type NOT NULL,
  entity_id       UUID NOT NULL,
  action          VARCHAR(100) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  performed_by    UUID REFERENCES users(id),
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_entity    ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_performed ON activity_logs(performed_by);
CREATE INDEX idx_activity_created   ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_action    ON activity_logs(action);

-- ── Refresh Tokens ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- ── Updated-at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER facilities_updated_at
  BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vacancies_updated_at
  BEFORE UPDATE ON vacancies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed Data ────────────────────────────────────────────────
-- Default admin user  (password: Admin@2026!)
-- bcrypt hash generated at cost 10

INSERT INTO users (id, name, email, password_hash, role, organisation)
VALUES (
  uuid_generate_v4(),
  'MMT Admin',
  'admin@mmtcare.com.au',
  '$2b$10$X8IpEFn.P3M5EB0GlhDaFe4Q7zDvEpR2KJc0TNLHpxF1j3dNfGqGK',
  'admin',
  'MMT Care Services'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, name, email, password_hash, role, organisation)
VALUES (
  uuid_generate_v4(),
  'Sarah Johnson',
  'sarah@mmtcare.com.au',
  '$2b$10$X8IpEFn.P3M5EB0GlhDaFe4Q7zDvEpR2KJc0TNLHpxF1j3dNfGqGK',
  'coordinator',
  'MMT Care Services'
) ON CONFLICT (email) DO NOTHING;

-- ── Password Reset Tokens ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_user    ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_expires ON password_reset_tokens(expires_at);

-- ── Push Notifications ────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ,
  entity_type TEXT,
  entity_id   UUID
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

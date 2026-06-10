-- Migration 003: Extended facility details for public website display
-- Run once against the Supabase database

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS amenities          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS features           JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tenant_profile     TEXT,
  ADD COLUMN IF NOT EXISTS eligibility        TEXT,
  ADD COLUMN IF NOT EXISTS care_types         JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sda_design_category TEXT,
  ADD COLUMN IF NOT EXISTS website_url        TEXT,
  ADD COLUMN IF NOT EXISTS is_published       BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN facilities.amenities           IS 'Array of amenity keys (e.g. ensuite_bathroom, ducted_ac)';
COMMENT ON COLUMN facilities.features            IS 'Free-text feature list shown on the public listing page';
COMMENT ON COLUMN facilities.tenant_profile      IS 'Current tenant profile description for matching';
COMMENT ON COLUMN facilities.eligibility         IS 'Eligibility requirements (e.g. Requires SDA funding in NDIS plan)';
COMMENT ON COLUMN facilities.care_types          IS 'Care services offered array';
COMMENT ON COLUMN facilities.sda_design_category IS 'SDA design category: High Physical Support | Improved Liveability | Fully Accessible | Robust | Basic';
COMMENT ON COLUMN facilities.website_url         IS 'Public website URL for this facility';
COMMENT ON COLUMN facilities.is_published        IS 'Whether this facility appears on the public /api/v1/public/facilities endpoint';

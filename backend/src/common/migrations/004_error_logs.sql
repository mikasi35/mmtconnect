-- Migration 004: Error logs table for admin diagnostics
-- Run once against the Supabase database

CREATE TABLE IF NOT EXISTS error_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level        TEXT        NOT NULL DEFAULT 'error',   -- 'error' | 'warn'
  error_name   TEXT,
  message      TEXT        NOT NULL,
  stack        TEXT,
  path         TEXT,
  method       TEXT,
  status_code  INT,
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  ip_address   TEXT,
  body         JSONB,
  query        JSONB,
  metadata     JSONB,
  resolved     BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_level_idx       ON error_logs (level);
CREATE INDEX IF NOT EXISTS error_logs_resolved_idx    ON error_logs (resolved);

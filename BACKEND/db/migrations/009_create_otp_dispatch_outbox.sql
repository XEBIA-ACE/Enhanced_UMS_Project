-- =============================================================================
-- Migration 009: Create otp_dispatch_outbox table (US-017)
-- =============================================================================
-- One row per registration, written in the same transaction as the users row,
-- so a committed 'pending' user always has a durable record that OTP initiation
-- is owed. Marked 'done' once DefaultOtpService.sendOtp has issued an OTP.

CREATE TABLE otp_dispatch_outbox (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'done', 'failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT    NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE INDEX idx_otp_dispatch_outbox_status ON otp_dispatch_outbox(status, created_at);

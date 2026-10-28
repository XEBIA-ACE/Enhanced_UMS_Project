-- =============================================================================
-- Migration 009: Create admin_accounts table (US-012)
-- =============================================================================
-- Authoritative record of which users hold the administrator role. Consulted
-- by AdminController.validateAdminRole after session authentication succeeds
-- (US-012-ac-1). A user is an administrator only if a row exists here AND the
-- row is not revoked — there is no role column on `users`.

CREATE TABLE admin_accounts (
  user_id     TEXT    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at  TEXT    NOT NULL,
  revoked_at  TEXT    NULL
);

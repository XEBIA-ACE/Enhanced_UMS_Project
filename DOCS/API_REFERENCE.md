# API Reference — User Management Service

Base URL (local): `http://localhost:3000`

All request/response bodies are JSON (`Content-Type: application/json`). All endpoints were verified live against a running instance during Phase 6/7/11 verification.

**Note on error-body casing**: the codebase is not fully consistent about `errorCode` vs `error_code` across features (both forms exist — see per-endpoint tables below for the exact casing each endpoint returns). Frontend clients should check for both, or normalize on receipt. See `docs/FRONTEND_INTEGRATION_GUIDE.md`.

---

## POST /api/v1/users/register

Registers a new user account in `pending` status and queues an activation email.

- **Auth**: none
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  { "username": "string", "emailAddress": "string", "password": "string", "passwordConfirmation": "string" }
  ```
- **Validation rules** (in order — first failure wins):
  1. All 4 fields present, non-empty, and `password === passwordConfirmation`
  2. `emailAddress` matches a structural email regex
  3. `password` satisfies the password policy: min 8 / max 128 chars (configurable), requires uppercase, lowercase, digit, special char (all configurable via `.env`)
  4. `username` is not already taken (case-insensitive)
- **Success — 201**:
  ```json
  { "userId": "uuid", "message": "Registration successful. Please check your email to activate your account." }
  ```
- **Errors**:
  | Status | Body | Cause |
  |---|---|---|
  | 422 | `{ "isValid": false, "fieldErrors": [...] }` | missing/mismatched mandatory fields |
  | 422 | `{ "isValid": false, "fieldErrors": [{"fieldName":"emailAddress",...}] }` | malformed email |
  | 422 | `{ "error": "PASSWORD_POLICY_VIOLATION", "violations": [...] }` | password fails policy |
  | 409 | `{ "error_code": "USERNAME_UNAVAILABLE", "message": "...", "field": "username", "suggestion_hint": "..." }` | username taken |
  | 500 | `{ "error": "An unexpected error occurred during registration." }` | unexpected |

## POST /api/v1/users/activate

Consumes an activation token and transitions the account to `active`.

- **Auth**: none — the token itself is the credential
- **Body**: `{ "token": "string" }` (max 512 chars)
- **Success — 200**: `{ "message": "Account successfully activated.", "userId": "uuid" }`
- **Errors**:
  | Status | errorCode | Cause |
  |---|---|---|
  | 400 | — | token missing/empty/too long |
  | 404 | `TOKEN_NOT_FOUND` | no such token |
  | 410 | `TOKEN_EXPIRED` | token past `expires_at` (default 24h) |
  | 410 | `TOKEN_CONSUMED` | token already used |
  | 409 | `ACCOUNT_NOT_PENDING` | account not in `pending` status |
  | 500 | — | unexpected |

## POST /api/v1/admin/users/:user_id/resend-confirmation

Admin-only: re-queues the activation email for a still-pending user. Not part of the original 12-route spec list, but exists and is spec-driven (F-01 design.md).

- **Auth**: `Authorization: Bearer <ADMIN_BEARER_TOKEN>`
- **Body**: none
- **Success — 202**: `{ "message": "Confirmation email enqueue requested." }`
- **Errors**: 401 (missing/malformed header), 403 (wrong token), 400 (missing user_id), 404 (`{"error":"User not found."}`), 409 (`{"error":"Account is not pending activation."}`), 500

## GET /api/v1/admin/dashboard

Admin Dashboard entry point (US-012). Authenticates the session, then validates the caller's admin role against the SQLite `admin_accounts` table (migration 009). A user is an administrator only if an `admin_accounts` row exists for them with `revoked_at IS NULL`.

- **Auth**: `Authorization: Bearer <session_token>` (from `POST /api/v1/auth/login`)
- **Success — 200**: `{ "access": "granted", "admin_user_id": "uuid" }`
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 401 | `AUTH_HEADER_MISSING` / `AUTH_HEADER_MALFORMED` / `SESSION_*` | not authenticated |
  | 403 | `ADMIN_ROLE_REQUIRED` | authenticated, but not an administrator — `message`: "Unauthorized: administrator role is required to access the Admin Dashboard." |
  | 403 | `AUTH_ACCOUNT_NOT_ACTIVE` | account suspended/deleted |
  | 500 | — | unexpected (no admin data returned) |

## POST /api/v1/otp/send / POST /api/v1/otp/resend

Issues (or re-issues) a one-time code, delivered via **email** (not SMS — intentional deviation, see `docs/IMPLEMENTATION_STATUS.md`). There is no separate OTP-verification endpoint in this codebase.

- **Auth**: none
- **Body**: `{ "userId": "uuid" }`
- **Success — 202**: `{ "status": "accepted" }` or `{ "status": "dispatch_failed" }` (202 either way — the OTP is persisted regardless of email delivery outcome; plaintext OTP is never returned)
- **Errors**:
  | Status | errorCode | Cause |
  |---|---|---|
  | 400 | — | missing `userId` |
  | 403 | `OTP_FORBIDDEN` | user not found or not active |
  | 429 | `OTP_RATE_LIMIT_EXCEEDED` | more than `OTP_MAX_ATTEMPTS_PER_WINDOW` (default 5) requests in `OTP_RATE_LIMIT_WINDOW_MINUTES` (default 15), tracked in Redis |
  | 500 | — | unexpected |

## POST /api/v1/auth/login

- **Auth**: none
- **Body**: `{ "email": "string", "password": "string" }`
- **Success — 200**: `{ "token": "string", "expires_at": "ISO-8601" }` (session expires per `SESSION_EXPIRY_SECONDS`, default 3600s)
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 400 | — | missing email/password |
  | 401 | `AUTH_INVALID_CREDENTIALS` | wrong email/password |
  | 403 | `AUTH_ACCOUNT_NOT_ACTIVE` | account not `active` (pending/suspended/deleted) |
  | 423 | `AUTH_ACCOUNT_LOCKED` (+ `retry_after` ISO timestamp) | ≥5 consecutive failed logins (configurable `LOGIN_LOCKOUT_THRESHOLD`), locked for `LOGIN_LOCKOUT_DURATION_MINUTES` (default 15) |
  | 500 | `SESSION_CREATION_FAILED` | unexpected |

## POST /api/v1/auth/logout

- **Auth**: `Authorization: Bearer <session token>`
- **Body**: none
- **Success — 200**: `{ "message": "Logged out." }` — idempotent: returns 200 even if the token is already expired/invalidated
- **Errors**: 401 if the `Authorization` header itself is missing/malformed (no Bearer token supplied at all)

## POST /api/v1/auth/password-recovery

Anti-enumeration by design: always returns 202 with the same body, whether or not the email is registered.

- **Auth**: none
- **Body**: `{ "email": "string" }`
- **Success — 202**: `{ "message": "If that email is registered, a recovery link has been sent." }`
- **Errors**: 400 only if `email` missing

## POST /api/v1/auth/password-reset

- **Auth**: none — the recovery token is the credential
- **Body**: `{ "recovery_token": "string", "new_password": "string" }`
- **Success — 200**: `{ "message": "Password has been reset. Please log in again." }` (all existing sessions for the user are invalidated)
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 400 | — | missing fields |
  | 404 | `TOKEN_NOT_FOUND` | no such recovery token |
  | 410 | `TOKEN_EXPIRED` | token past `expires_at` (default 1h) |
  | 422 | `PASSWORD_POLICY_VIOLATION` (+ `violations`) | new password fails policy |
  | 500 | — | unexpected |

## GET /health

- **Auth**: none (intentionally — for API Gateway probing)
- **Success — 200 always**: `{ "status": "ok", "db_reachable": true|false }` — never returns non-200, even if the DB is down

## GET /api/v1/users/me

Returns the calling user's own profile, including their current active-session count.

- **Auth**: `Authorization: Bearer <session token>`
- **Success — 200**: `{ "username": "string", "email": "string", "status": "pending"|"active"|"suspended"|"deleted", "registrationTimestamp": "ISO-8601", "lastLoginAt": "ISO-8601"|null, "activeSessions": number }`
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 401 | `AUTH_HEADER_MISSING` / `AUTH_HEADER_MALFORMED` / `SESSION_NOT_FOUND` / `SESSION_EXPIRED` / `SESSION_INVALIDATED` | session middleware rejection |
  | 404 | `USER_NOT_FOUND` | the session's owning user record no longer exists |
  | 500 | — | unexpected |

## POST /api/v1/users/deletion-requests

Requests self-service account deletion; queues a confirmation email.

- **Auth**: `Authorization: Bearer <session token>`
- **Body**: none
- **Success — 202**: `{ "message": "A confirmation code has been sent to your email." }`
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 401 | `AUTH_HEADER_MISSING` / `AUTH_HEADER_MALFORMED` / `SESSION_NOT_FOUND` / `SESSION_EXPIRED` / `SESSION_INVALIDATED` | session middleware rejection |
  | 403 | `AUTH_ACCOUNT_NOT_ACTIVE` | account not active |
  | 409 | `DELETION_REQUEST_ALREADY_PENDING` | a pending request already exists |
  | 500 | — | unexpected |

## DELETE /api/v1/users/deletion-requests

Cancels the caller's own pending deletion request.

- **Auth**: `Authorization: Bearer <session token>`
- **Body**: none
- **Success — 200**: `{ "message": "Your pending deletion request has been cancelled." }`
- **Errors**: same session-middleware 401s as above; 404 `DELETION_REQUEST_NOT_FOUND` if no pending request exists; 500

## POST /api/v1/users/deletion-requests/confirm

Finalizes deletion: anonymizes the user's email/username, marks the account `deleted`, invalidates all sessions, queues a post-deletion notice email — all atomically. The code is checked against the caller's own pending request, so this route requires the same session as the request that created it.

- **Auth**: `Authorization: Bearer <session token>`
- **Body**: `{ "code": "string" }` (6-digit OTP code emailed by the request-deletion call above)
- **Success — 200**: `{ "userId": "uuid", "deletedAt": "ISO-8601" }`
- **Errors**:
  | Status | error_code | Cause |
  |---|---|---|
  | 400 | — | missing code |
  | 401 | `AUTH_HEADER_MISSING` / `AUTH_HEADER_MALFORMED` / `SESSION_NOT_FOUND` / `SESSION_EXPIRED` / `SESSION_INVALIDATED` | session middleware rejection |
  | 404 | `DELETION_REQUEST_NOT_FOUND` | no pending request for the caller |
  | 410 | `DELETION_OTP_EXPIRED` | code past `expires_at` (default 10min) |
  | 422 | `DELETION_OTP_INVALID` | submitted code does not match |
  | 500 | — | unexpected |

  **Fixed during Phase 6 verification**: this endpoint previously returned `500` unconditionally due to a SQL parameter-type bug (see `docs/RUN_APPLICATION.md` "Fixes applied" table, item 1). Confirmed working (`200`) after the fix.

---

## Session-validation middleware (applies to all three deletion-request routes)

All protected routes require `Authorization: Bearer <token>` from a successful `/login`. Failure modes (all return before the route handler runs):

| Status | error_code | Cause |
|---|---|---|
| 401 | `AUTH_HEADER_MISSING` | no `Authorization` header |
| 401 | `AUTH_HEADER_MALFORMED` | header present but not `Bearer <token>` |
| 401 | `SESSION_NOT_FOUND` | token doesn't match any session |
| 401 | `SESSION_EXPIRED` | session past `expires_at` |
| 401 | `SESSION_INVALIDATED` | session was logged out / invalidated |
| 403 | `AUTH_ACCOUNT_NOT_ACTIVE` | the session's owning account is no longer `active` (covers suspended and deleted) |

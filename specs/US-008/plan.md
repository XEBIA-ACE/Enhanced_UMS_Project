# Implementation Plan: US-008

## Overview
This plan addresses the secure administrator login feature with HTTPS transmission, credential validation, session token generation, and concurrent session handling.

## Grounding Context

### Codebase Snapshot
- **Deterministic grounding reference**: `80b48af29026f6fa`
- **Repository**: `https://github.com/XEBIA-ACE/Enhanced_UMS_Project`
- **Commit**: `9c1ae9afe729dda0341e27ac4d218fc5d7aee4c8`
- **Branch**: `main`

### Affected Components
- `§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/controllers/auth.controller.ts` (AuthController.login method, object ID 1036)
- `createAuthRouter` (object ID 2428) — registers the login endpoint
- `createAdminRouter` (object ID 2372) — admin route configuration
- `LoginRequestDto` (object ID 1484) — credential schema validation
- `Promise` (object ID 986) — async credential validation
- `login` (object ID 1190, 1192) — downstream callees for session token generation
- `Error` (object ID 984) — error handling

### Accepted Impact Analysis
- **Hash**: `sha256:c4bee7d22e63a3e34abcd3cf3980447262a3a8f9d6df7f6854a9a2cb10fc599b`
- **Revision**: `1`
- **Confidence**: `high` (100%)
- **Blast radius**: 2 direct callers, 0 transitive callers, 5 callees, 20 transactions, 1 data object

## Contract Changes Required

### API Contract
- **Endpoint**: POST /admin/login
- **Protocol**: HTTPS
- **Status**: Change required
- **Description**: Admin credential submission entry point

### Data Contracts
- Admin credentials transmitted via HTTPS (encrypted in transit) — change required
- SQLite database queried for admin role verification — change required
- Session tokens stored and managed in memory or secure session store — change required
- Login transaction logs may contain sensitive timing or state information — change required

## Implementation Constraints & Assumptions

### Known Gaps (Evidence Gaps)

1. **Database Objects Not Measured**: CAST did not return database objects; SQLite admin role table is assumed to exist but not measured. The exact schema and query structure are not visible in the structural facts.

2. **Session Token Generation**: Session token generation is assumed to occur within one of the downstream callees (login 1190 or 1192), but CAST does not confirm which one or the token generation algorithm.

3. **Dashboard Redirection**: Dashboard redirection is assumed to be handled by the caller (createAuthRouter) or a middleware layer not directly measured.

4. **HTTPS Enforcement**: HTTPS enforcement is assumed to be configured at the router or middleware level, not within admin_login itself. Exact middleware configuration is not measured.

5. **Concurrent Session Handling**: Concurrent session handling is assumed to be managed by the HTTP server or session middleware, not directly in admin_login.

6. **API Endpoint Context**: API endpoint context returned errors; exact HTTP method and path not confirmed by CAST.

7. **Intra-Object Structural Facts**: No intra-object structural facts (loops, SQL-in-loop) available for admin_login.

8. **Transaction Call Graphs**: No transaction call graphs expanded; exact flow through LoginForm, LoginGuard, and other transactions is unmeasured.

9. **Downstream Security Posture**: No co-occurring violations detected; security posture of downstream callees unknown.

### Unresolved Questions

1. Which downstream callee (login 1190 or 1192) generates the session token?
2. Is HTTPS enforcement implemented in createAuthRouter or in a separate middleware?
3. What is the session token expiration policy and concurrent session limit?
4. How does the system handle concurrent login attempts from the same admin account?
5. Are there rate-limiting or brute-force protections on the admin_login endpoint?

### Requirement Traceability Status

**Incomplete traceability for**:
- US-008-ac-1: Partially mapped (HTTPS enforcement not confirmed at endpoint level)
- US-008-ac-2: Unmapped (database objects not measured)
- US-008-ac-3: Partially mapped (token generation callee not confirmed)
- US-008-ac-4: Unmapped (redirection logic not measured)
- US-008-ac-5: Unmapped (concurrent handling is runtime behavior, not measured by static analysis)

## Design Steps

1. **Implement HTTPS-only enforcement** for admin_login endpoint via createAuthRouter middleware configuration
2. **Enhance LoginRequestDto validation** to enforce credential schema and prevent credential exposure in logs or error messages
3. **Verify Promise-based async handling** in login callees (1190, 1192) for proper error handling and rejection management
4. **Implement secure session token generation** in downstream login method with cryptographic strength and uniqueness guarantees
5. **Add admin role verification query** against SQLite database in Authentication Service before session establishment
6. **Implement session establishment and redirect logic** to Admin Dashboard with appropriate HTTP response code
7. **Add concurrent session handling and connection pooling** to support 50+ simultaneous administrator logins
8. **Implement rate-limiting and brute-force protection** on admin_login endpoint
9. **Add comprehensive logging** that excludes credentials, tokens, and sensitive authentication data
10. **Implement session token expiration policy** and concurrent session limit enforcement

## Security & Quality Obligations

### Security Obligations
- Enforce HTTPS-only credential transmission for admin_login
- Implement secure session token generation with cryptographic strength
- Validate admin role against SQLite database before session establishment
- Protect session tokens from exposure in logs or error responses
- Validate credential and personal-data handling against the Jira requirement
- Validate credential and personal-data handling against the story's acceptance criteria

### Quality Attributes
- Verify the changed user flow against the stated accessibility criteria

### Test Obligations
- Verify HTTPS enforcement at the admin_login entry point
- Test concurrent login handling with 50+ simultaneous admin sessions
- Validate session token uniqueness and expiration
- Confirm admin role verification queries SQLite correctly
- Test dashboard redirection after successful authentication
- Verify error responses do not leak credential or token information

## Verification Plan

### Acceptance Criteria Verification

**US-008-ac-1**: Given an administrator is on the Admin Login Screen, When they enter valid admin credentials and submit, Then the credentials are transmitted securely via HTTPS
- *Status*: Partially mapped
- *Gap*: CAST does not confirm HTTPS enforcement at the endpoint level; middleware or router configuration for HTTPS-only is not measured. Credential transmission security depends on infrastructure configuration outside the measured code.
- *Evidence*: admin_login method in auth.controller.ts, createAuthRouter function registers the login endpoint

**US-008-ac-2**: Given valid admin credentials are submitted, When the Authentication Service validates the credentials, Then the admin role is verified against the SQLite database
- *Status*: Unmapped
- *Gap*: CAST returned no database objects; SQLite admin role table and verification query are not measured. The Authentication Service and its database interaction are not visible in the structural facts.
- *Evidence*: None measured

**US-008-ac-3**: Given credentials are valid and admin role is confirmed, When authentication succeeds, Then a secure session token is generated
- *Status*: Partially mapped
- *Gap*: CAST does not confirm which downstream callee generates the session token or the token generation algorithm. Cryptographic strength and token uniqueness are not measured.
- *Evidence*: Downstream callees include two login methods and Promise class for async handling

**US-008-ac-4**: Given authentication is successful, When the session is established, Then the administrator is redirected to the Admin Dashboard
- *Status*: Unmapped
- *Gap*: Dashboard redirection logic is not measured in the structural facts. The redirect endpoint, response code, and session establishment flow are not visible in CAST data.
- *Evidence*: None measured

**US-008-ac-5**: Given the system is under load, When approximately 50 administrators log in concurrently, Then all sessions function correctly
- *Status*: Unmapped
- *Gap*: Concurrent session handling and load testing are runtime behaviors not captured by static structural analysis. CAST does not measure session concurrency limits, connection pooling, or performance under 50-user load.
- *Evidence*: None measured

## Dependency Impacts

- **LoginRequestDto (1484)**: Must enforce credential schema validation
- **Promise (986)**: Used for async credential validation — ensure no unhandled rejections
- **login (1190) and login (1192)**: Downstream methods must complete within session timeout
- **createAuthRouter (2428)**: Must register admin_login with HTTPS-only middleware

## Risk Assessment

- **Risk Level**: HIGH
- **Remediation Priority**: CRITICAL
- **Implementation Blocked**: No (gap acceptance allowed)
- **Gap Acceptance Status**: Allowed

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `1`
- **Accepted impact analysis hash**: `sha256:c4bee7d22e63a3e34abcd3cf3980447262a3a8f9d6df7f6854a9a2cb10fc599b`
- **Repository baseline commit**: `9c1ae9afe729dda0341e27ac4d218fc5d7aee4c8`
- **Deterministic grounding reference**: `80b48af29026f6fa`
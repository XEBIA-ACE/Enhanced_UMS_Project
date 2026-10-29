# Implementation Plan: US-010
## Administrator Session Timeout and Expiry

---

## Technical Context

### Grounding Evidence
- **Codebase snapshot**: `5e7d4b07dc257e51`
- **Accepted impact analysis**: `sha256:a6f48056c05814e3f54f49796e3b2bd9a10b850d8db12eeaa8a1c242efc25994` (revision 1)
- **Repository**: `https://github.com/XEBIA-ACE/Enhanced_UMS_Project` @ `598bd2a86986db6a41506c02a09fe8db0873bb66`

### Focus Object
- **Name**: `logout` (Typescript Method)
- **ID**: 1035
- **File**: `§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/controllers/auth.controller.ts`
- **Direct caller**: createAuthRouter (2428)
- **Callees**: Error (984), Promise (986), invalidateSession (1226, 1231)

### Related Components
- `createAuthRouter` (2428, Typescript Function) — routes logout endpoint
- `invalidateSession` (1226, 1231, Typescript Methods) — invalidate session state
- `Error` (984, Typescript Class) — exception handling
- `Promise` (986, Typescript Class) — async session handling

### Affected API Endpoints
- `api/v1/auth/logout/` (POST operation, transaction ID 3364)

### Transaction Dependency Graph
1. LogoutResult (1481, Typescript Interface)
2. api/v1/auth/logout/ (3364, NodeJS Post Operation)
3. handleLogout (2525, Typescript Function)
4. logout (1035, Typescript Method)
5. logoutUser (2935, Typescript Function)

---

## Design Steps

### Step 1: Implement Configurable Session Timeout Detection
**Addresses**: US-010-ac-1 (FR-001)

Modify the `logout` method (1035) to detect and handle automatic session invalidation when the configured timeout period is reached:
- Add timeout period configuration parameter
- Implement timeout detection logic
- Ensure session invalidation occurs when timeout is detected
- Ground decision in accepted impact analysis (sha256:a6f48056c05814e3f54f49796e3b2bd9a10b850d8db12eeaa8a1c242efc25994)

**Known gaps**:
- Timeout period calculation and monitoring mechanism not measured in CAST data
- Does logout method implement configurable timeout logic, or is timeout managed elsewhere?
- Intra-object structural details (loops, conditional logic, error paths) not available

### Step 2: Enforce Redirect on Expired Session
**Addresses**: US-010-ac-2 (FR-002)

Modify `createAuthRouter` (2428) to enforce redirect to Admin Login Screen when expired session is detected:
- Add session expiry detection middleware
- Implement redirect logic to Admin Login Screen
- Ensure redirect applies to all administrator actions
- Coordinate with logout endpoint (api/v1/auth/logout/)

**Known gaps**:
- CAST does not show redirect logic or controller/middleware enforcing redirect
- Redirect implementation not measured

### Step 3: Display Session Expiry Notification
**Addresses**: US-010-ac-3 (FR-003)

Extend logout handler and session invalidation flow to display session expiry notification:
- Add notification message generation on session expiry
- Integrate notification display with redirect flow
- Ensure notification is shown upon redirect to Admin Login Screen

**Known gaps**:
- CAST structural facts do not contain evidence of notification or message handling
- No components, transactions, or callees related to session expiry notification display are present in measured data
- Notification implementation not measured (unmapped requirement)

### Step 4: Implement Re-authentication Guard for Admin Dashboard
**Addresses**: US-010-ac-4 (FR-004)

Implement re-authentication requirement for Admin Dashboard access after session expiry:
- Add access control logic to Admin Dashboard
- Require credential re-validation after session expiry
- Coordinate with session invalidation callees

**Known gaps**:
- CAST does not measure Admin Dashboard access control logic or re-authentication checks
- Dashboard protection and re-auth enforcement not measured in structural facts

### Step 5: Ensure Atomic Session Invalidation
**Addresses**: Security obligation

Ensure `invalidateSession` callees (1226, 1231) atomically clear session state:
- Verify atomic operations in both invalidateSession implementations
- Prevent race conditions in session state clearing
- Clear session state from both client and server

**Known gaps**:
- Database objects accessed by logout or its callees not returned by CAST
- What database tables or sessions are invalidated by the two invalidateSession callees?
- Transaction call graph expansion not available; full transitive caller chain not measured

### Step 6: Update Auth Controller for Configurable Timeout
**Addresses**: Implementation constraint

Update `auth.controller.ts` to support configurable timeout parameter and integrate timeout monitoring:
- Add timeout configuration parameter
- Integrate timeout monitoring with Promise-based async session handling
- Ensure compatibility with existing Error handling

**Known gaps**:
- Intra-object structural facts (loops, SQL-in-loop) not available
- Internal complexity of logout method not measured
- Does logout method implement configurable timeout logic, or is timeout managed elsewhere?

---

## Security and Quality Obligations

### Security Requirements
- **Atomic invalidation**: Session invalidation must occur atomically to prevent race conditions
- **Endpoint protection**: Logout endpoint must not be accessible after session expiry
- **State clearing**: Session state must be cleared from both client and server
- **Data handling**: Validate credential and personal-data handling against the Jira requirement and acceptance criteria

### Quality Attributes
- Preserve the availability, reliability, and observability constraints grounded by `5e7d4b07dc257e51`

---

## API Contract Changes

### Endpoint: api/v1/auth/logout/
**Change required**: Yes
**Reason**: Grounded API impact identified; endpoint requires contract specification for session timeout and expiry behavior

---

## Verification Obligations

All of the following must be satisfied before release:

### Acceptance Criteria Verification
1. **US-010-ac-1**: Given an administrator has an active session, When the session timeout period is reached, Then the session is automatically invalidated
2. **US-010-ac-2**: Given a session has expired, When the administrator attempts any action, Then they are redirected to the Admin Login Screen
3. **US-010-ac-3**: Given a session has expired, When the administrator is redirected to login, Then a notification indicating session expiry is displayed
4. **US-010-ac-4**: Given a session has expired, When the administrator attempts to access the Admin Dashboard, Then re-authentication is required

### Impact-Based Test Obligations
1. Unit tests for logout method covering success and error paths
2. Integration tests verifying session invalidation across invalidateSession callees
3. End-to-end tests for session timeout expiry and redirect flow
4. Test coverage for configurable timeout period configuration

---

## Unresolved Questions Requiring Investigation

Before implementation begins, the following must be resolved or explicitly accepted:

1. What database tables or sessions are invalidated by the two invalidateSession callees (1226, 1231)?
2. Are there transitive callers beyond createAuthRouter that depend on logout behavior?
3. What is the full dependency graph of the 5 measured transactions?
4. Does the logout method implement configurable timeout logic, or is timeout managed elsewhere?
5. API endpoint context returned errors; full endpoint inventory for logout not retrieved
6. Are there intra-object structural details (loops, conditional logic, error paths) in the logout method?

---

## Implementation Readiness Status

**Status**: Ready with gaps

**Blocking items**: None (gap acceptance allowed)

**Evidence gaps requiring explicit acceptance**:
- Database objects accessed by logout or its callees not returned by CAST
- Transaction call graph expansion not available; full transitive caller chain not measured
- API endpoint context returned errors; full endpoint inventory for logout not retrieved
- Intra-object structural facts (loops, SQL-in-loop) not available; internal complexity of logout method not measured
- Requirement traceability incomplete for US-010-ac-1, US-010-ac-2, US-010-ac-3, US-010-ac-4

---

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `1`
- **Accepted impact analysis hash**: `sha256:a6f48056c05814e3f54f49796e3b2bd9a10b850d8db12eeaa8a1c242efc25994`
- **Repository baseline commit**: `598bd2a86986db6a41506c02a09fe8db0873bb66`
- **Deterministic grounding reference**: `5e7d4b07dc257e51`

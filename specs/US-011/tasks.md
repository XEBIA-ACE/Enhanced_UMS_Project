# Implementation Tasks: US-011 — Administrator Logout

## Functional Requirements Implementation

### T001: FR-001 — Immediate Session Invalidation via Logout Endpoint
- [ ] Implement immediate session invalidation in logout endpoint (POST /api/v1/auth/logout/)
- [ ] Coordinate calls to invalidateSession (1226) and invalidateSession (1231)
- [ ] Ensure atomic clearing of session state across all session stores (LogoutResult, handleLogout, logoutUser transactions)
- [ ] Verify session invalidation occurs upon logout invocation
- **Acceptance**: The logout endpoint must immediately invalidate the administrator's session by calling invalidateSession methods to clear session state across all session stores (LogoutResult, handleLogout, logoutUser transactions) upon logout invocation.

### T002: FR-002 — Redirect to Admin Login Screen After Logout
- [ ] Implement or coordinate redirect to Admin Login Screen after logout completion
- [ ] Determine whether redirect is triggered by logout method or handled by caller (createAuthRouter) or frontend
- [ ] Verify redirect occurs after all session invalidation operations complete
- **Acceptance**: After logout completion, the system must redirect the administrator to the Admin Login Screen; this redirect may be triggered by the logout method or handled by the caller (createAuthRouter) or frontend.

### T003: FR-003 — Token Validation and Access Denial
- [ ] Implement token validation logic in §{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/controllers/auth.controller.ts
- [ ] Implement token blacklisting or invalidation mechanism
- [ ] Ensure previous session tokens are denied access post-logout
- [ ] Require re-authentication for post-logout access attempts
- **Acceptance**: The system must deny access to any request that attempts to use a previous session token after logout, requiring re-authentication; this requires token validation logic and token blacklisting or invalidation mechanisms.

### T004: FR-004 — Redirect Behavior After Session Invalidation
- [ ] Ensure redirect to Admin Login Screen occurs after all session invalidation operations complete
- [ ] Coordinate timing between session invalidation and redirect
- [ ] Verify redirect behavior is consistent with FR-002
- **Acceptance**: Upon logout completion, the administrator must be redirected to the Admin Login Screen; this redirect behavior must occur after all session invalidation operations complete.

## Verification Tasks

### T005: Verify US-011-ac-1 — Session Immediately Invalidated
- [ ] Test: Given an administrator is logged in to the Admin Dashboard, When they select the logout option, Then the session is immediately invalidated
- [ ] Verify session state is cleared in all 5 database objects (LogoutResult, api/v1/auth/logout/, handleLogout, logout, logoutUser)
- [ ] Verify invalidateSession (1226) and invalidateSession (1231) are both called
- [ ] Verify no residual session state remains after logout
- **Test type**: Characterization
- **Required before**: Release
- **Required environment**: CI

### T006: Verify US-011-ac-2 — Redirect to Admin Login Screen
- [ ] Test: Given an administrator has logged out, When they attempt to access the Admin Dashboard, Then they are redirected to the Admin Login Screen
- [ ] Verify redirect occurs after logout completion
- [ ] Verify redirect target is Admin Login Screen
- [ ] Verify no access to Admin Dashboard is granted post-logout
- **Test type**: Characterization
- **Required before**: Release
- **Required environment**: CI

### T007: Verify US-011-ac-3 — Previous Session Token Denied
- [ ] Test: Given an administrator has logged out, When they attempt to use the previous session token, Then access is denied and re-authentication is required
- [ ] Verify previous session token is rejected
- [ ] Verify access is denied with appropriate error response
- [ ] Verify re-authentication is required
- [ ] Verify token validation logic is in place
- **Test type**: Characterization
- **Required before**: Release
- **Required environment**: CI

### T008: Verify US-011-ac-4 — Redirect After Logout Complete
- [ ] Test: Given an administrator has logged out, When the logout is complete, Then they are redirected to the Admin Login Screen
- [ ] Verify redirect occurs after logout completion
- [ ] Verify redirect target is Admin Login Screen
- [ ] Verify timing of redirect relative to session invalidation
- **Test type**: Characterization
- **Required before**: Release
- **Required environment**: CI

## Impact Verification Tasks

### T009: Verify Session Immediately Invalidated When Logout Selected
- [ ] Verify session is immediately invalidated when logout is selected
- [ ] Measure invalidation latency
- [ ] Verify no race conditions between invalidateSession calls
- [ ] Verify atomic completion of all session store updates

### T010: Verify Administrator Redirected to Admin Login Screen After Logout
- [ ] Verify administrator is redirected to Admin Login Screen after logout
- [ ] Verify redirect occurs for all logout paths
- [ ] Verify redirect is not bypassed by any code path

### T011: Verify Previous Session Token Rejected with Access Denied
- [ ] Verify previous session token is rejected with access denied
- [ ] Verify error response is appropriate
- [ ] Verify no partial access is granted
- [ ] Verify token blacklist is consulted for all requests

### T012: Verify Re-authentication Required After Logout
- [ ] Verify re-authentication is required after logout
- [ ] Verify no session bypass mechanisms exist
- [ ] Verify re-authentication flow is triggered correctly
- [ ] Verify credentials are validated against current state

## Implementation Readiness Checklist

- [ ] Resolve: Requirement traceability incomplete for US-011-ac-1, US-011-ac-2, US-011-ac-3, US-011-ac-4
- [ ] Resolve or accept: Are the two invalidateSession methods (1226, 1231) called sequentially or in parallel, and what is the atomicity guarantee?
- [ ] Resolve or accept: Do all 5 database objects represent distinct session stores, or are some redundant references?
- [ ] Resolve or accept: Is there a timeout or retry mechanism if one invalidateSession call fails?
- [ ] Resolve or accept: How is the redirect to Admin Login Screen triggered—is it part of the logout method or handled by the caller (createAuthRouter)?
- [ ] Acknowledge: Intra-object structural facts (loops, SQL-in-loop) not available from CAST MCP
- [ ] Acknowledge: Transaction call graphs not available from CAST MCP
- [ ] Acknowledge: No explicit evidence of session token validation or denial logic in the measured facts
- [ ] Acknowledge: No explicit evidence of redirect logic in the measured facts
- [ ] Acknowledge: The two invalidateSession methods (1226, 1231) represent distinct session invalidation pathways (e.g., token cache and database session store)
- [ ] Acknowledge: All 5 database objects (LogoutResult, api/v1/auth/logout/, handleLogout, logout, logoutUser) are session-related and must be cleared atomically
- [ ] Acknowledge: The Promise class (986) is used for asynchronous session invalidation coordination

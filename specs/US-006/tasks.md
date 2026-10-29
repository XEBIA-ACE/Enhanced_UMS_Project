# Tasks: US-006

## Functional Requirements

- [ ] **T001** — FR-001: Implement rate-limit counter tracking per IP address within a 15-minute sliding window.

- [ ] **T002** — FR-002: Ensure the system allows registration attempts when the count for an IP address is fewer than 5 within the 15-minute window.

- [ ] **T003** — FR-003: Ensure the system blocks registration attempts when an IP address has made 5 or more attempts within the 15-minute window.

- [ ] **T004** — FR-004: Implement error response that clearly indicates the rate-limit block status and temporary nature of the restriction when an attempt is blocked.

- [ ] **T005** — FR-005: Implement 15-minute window reset logic to reset the rate-limit counter for an IP address after 15 minutes have elapsed since the first attempt in the current window.

## Acceptance Criteria Verification

- [ ] **T006** — Verify US-006-ac-1: Given an IP address has made fewer than 5 registration attempts in 15 minutes, When another attempt is made, Then the registration attempt is allowed to proceed

- [ ] **T007** — Verify US-006-ac-2: Given an IP address has made exactly 5 registration attempts within 15 minutes, When a 6th attempt is made, Then the attempt is blocked

- [ ] **T008** — Verify US-006-ac-3: Given a user is rate limited, When they attempt to register, Then an error message clearly indicates the temporary block status

- [ ] **T009** — Verify US-006-ac-4: Given 15 minutes have passed since the first attempt in a window, When the user attempts registration again, Then the rate limit counter resets and the attempt is allowed

## Impact Verification

- [ ] **T010** — Verify that fewer than 5 attempts within 15 minutes are allowed.

- [ ] **T011** — Verify that the 6th attempt within 15 minutes is blocked.

- [ ] **T012** — Verify that the error message clearly indicates the temporary block status.

- [ ] **T013** — Verify that after 15 minutes, the counter resets and a new attempt is allowed.

- [ ] **T014** — Verify that rate limiting is enforced per IP address, not per user or globally.

## Implementation Readiness Resolution

- [ ] **T015** — Resolve candidate verification concern: Confirm whether OtpRateLimitExceededError (provider-object:2997) or RedisRateLimitGuard (provider-object:3007) is the correct focus object for rate-limit enforcement. Re-run impact analysis if necessary.

- [ ] **T016** — Verify rate-limit counter storage mechanism in source code (in-memory, Redis, session store, or database).

- [ ] **T017** — Verify IP address extraction and tracking mechanism in source code.

- [ ] **T018** — Verify 15-minute window reset logic implementation (middleware, interceptor, or issueOtp method).

- [ ] **T019** — Clarify endpoint scope: Determine whether rate limiting applies to api/v1/otp/send/ only or to other registration endpoints (e.g., api/v1/register/).

## Provenance

- **Accepted impact analysis revision**: `2`
- **Accepted impact analysis hash**: `sha256:c9c68abec5eef897dcd41e2fd59b6a6bfaa753854f8de2b2773b7b1a2b23e23c`
- **Repository baseline commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Deterministic grounding reference**: `f875a52838761d9d`

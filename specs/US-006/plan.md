# Implementation Plan: US-006

## Overview

This plan addresses the implementation of registration rate limiting by IP address to prevent automated abuse and brute-force attacks. The specification is grounded in the Enhanced_UMS_Project codebase and anchored to accepted impact analysis revision 2.

## Grounding Context

### Codebase References

The following components have been identified through impact analysis:

- **OtpRateLimitExceededError** (provider-object:2997) — Error class for OTP rate-limit violations
- **issueOtp** (provider-object:1203) — Method that raises rate-limit errors
- **createRegistrationRouter** (provider-object:2443) — Registration flow entry point
- **AlertDescription_fragment_1** (provider-object:3128) — UI component for error messaging
- **Error** (provider-object:984) — Parent class of OtpRateLimitExceededError
- **Source file**: `§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/errors/otp.errors.ts`

### API Impact

- **Endpoint**: `POST api/v1/otp/send/` (transaction 13513)
- **Change required**: Yes — rate-limit enforcement must be integrated into this transaction

### Deterministic Grounding

- **Fingerprint**: `f875a52838761d9d`
- **Repository**: `https://github.com/XEBIA-ACE/Enhanced_UMS_Project`
- **Branch**: `main`
- **Commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Provider**: `cast`

## Implementation Readiness Issues

The following items must be resolved or explicitly accepted before implementation:

### Critical Gaps

1. **Candidate verification concern**: The impact analysis flagged OtpRateLimitExceededError as potentially implausible for this requirement. RedisRateLimitGuard (provider-object:3007) was identified as a possibly better-matching alternative. **Action required**: Re-run impact analysis anchored on RedisRateLimitGuard or explicitly accept OtpRateLimitExceededError as the correct focus object.

2. **Rate-limit counter storage**: CAST does not show database access from OtpRateLimitExceededError. The counter storage mechanism (in-memory, Redis, session store, or database) must be verified in source code.

3. **IP address extraction**: The error class itself does not appear to perform IP extraction. The mechanism for extracting and tracking IP addresses must be verified.

4. **Window reset logic**: CAST does not show any logic for 15-minute window reset or counter expiration. This mechanism must be implemented and verified separately, possibly in middleware or a separate interceptor.

5. **Endpoint scope**: It is unclear whether rate limiting is OTP-specific (api/v1/otp/send/) or applies to other registration endpoints (e.g., api/v1/register/). This must be clarified.

### Evidence Gaps

- No database objects returned by CAST query — cannot verify where rate-limit counters are persisted.
- No transitive callers — cannot determine if other registration flows also invoke this rate-limit check.
- No structural evidence of IP extraction, counter increment, or window-reset logic within the measured objects.
- Application-level inventory contains only UI dependencies (@radix-ui/*) and no rate-limiting libraries (e.g., express-rate-limit, redis) — cannot confirm implementation technology.

### Requirement Traceability Status

- **US-006-ac-1**: Partially mapped — counter increment and comparison logic must be verified in source code.
- **US-006-ac-2**: Partially mapped — threshold comparison (>= 5) must be verified in source code.
- **US-006-ac-3**: Partially mapped — error message content and HTTP response status must be verified.
- **US-006-ac-4**: Unmapped — no window reset or counter expiration logic visible in call graph.

## Design Steps

1. **Implement rate-limit counter tracking** per IP address within a 15-minute sliding window in issueOtp (provider-object:1203)

2. **Modify OtpRateLimitExceededError** (provider-object:2997) to enforce blocking when IP address has made 5 or more registration attempts within the 15-minute window

3. **Update error message** in OtpRateLimitExceededError (provider-object:2997) to clearly indicate rate-limit block status and temporary nature of restriction

4. **Implement 15-minute window reset logic** in issueOtp (provider-object:1203) to reset rate-limit counter after elapsed time

5. **Integrate rate-limit enforcement** into createRegistrationRouter (provider-object:2443) registration flow

6. **Update AlertDescription_fragment_1** (provider-object:3128) to display rate-limit error messaging to end users

## Quality Attributes

- Preserve the availability, reliability, and observability constraints grounded by `f875a52838761d9d`

## Verification Plan

The following test obligations must be satisfied before release:

- **US-006-ac-1**: Verify that fewer than 5 attempts within 15 minutes are allowed.
- **US-006-ac-2**: Verify that the 6th attempt within 15 minutes is blocked.
- **US-006-ac-3**: Verify that the error message clearly indicates the temporary block status.
- **US-006-ac-4**: Verify that after 15 minutes, the counter resets and a new attempt is allowed.
- **IMPACT**: Verify that rate limiting is enforced per IP address, not per user or globally.

## Constraints and Assumptions

- OtpRateLimitExceededError is the primary enforcement point for rate-limit violations in the OTP flow (assumption from impact analysis).
- The rate-limit logic is implemented within or called by issueOtp (1203) (assumption from impact analysis).
- The transaction api/v1/otp/send/ (13513) represents the registration/OTP request entry point (assumption from impact analysis).
- No database objects are directly queried by the error class itself; rate-limit state is managed elsewhere, likely in-memory or via a cache/session store not captured in CAST (assumption from impact analysis).
- The call chain depth of 8 indicates the error is raised deep within the OTP issuance workflow (observation from impact analysis).

## Unresolved Questions

1. Where is the rate-limit counter (5 attempts in 15 minutes) actually stored and incremented? CAST does not show database access from OtpRateLimitExceededError.

2. How is the IP address extracted and tracked? The error class itself does not appear to perform this extraction.

3. Is the 15-minute window reset logic implemented in issueOtp or in a separate middleware/interceptor not visible in the call graph?

4. Are there other registration endpoints (e.g., api/v1/register/) that also enforce this rate limit, or is it OTP-specific?

## Provenance

- **Accepted impact analysis revision**: `2`
- **Accepted impact analysis hash**: `sha256:c9c68abec5eef897dcd41e2fd59b6a6bfaa753854f8de2b2773b7b1a2b23e23c`
- **Repository baseline commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Deterministic grounding reference**: `f875a52838761d9d`

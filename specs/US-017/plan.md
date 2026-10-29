# Implementation Plan: US-017

## Overview
This plan addresses the OTP verification initiation on successful registration (US-017). The implementation must resolve critical atomicity and recovery path gaps identified in the accepted impact analysis.

## Grounding Context

**Accepted Impact Analysis**: sha256:47f322f4396c7019e6590b52a7009127a0e86eb7ea7bfe5687ef6575620a0d41 (revision 2)

**Codebase Grounding Snapshot**: c5193e2b043c65b8

**Repository Baseline**: e782768d250abd2627bc142076653a796bf45a43 (main branch)

## Affected Components

- RegistrationController.registerUser
- DefaultOtpService.sendOtp
- DefaultOtpService.issueOtp
- OtpRequestRepository
- EmailOtpDeliveryAdapter
- RegistrationForm (frontend)
- OtpVerificationForm (frontend)

## Contract Changes Required

### API Contracts
- POST /api/v1/users/register: Triggers OTP dispatch on success; returns user message informing of verification requirement
- POST /api/v1/otp/send: Issues OTP code, persists to otp_requests, dispatches via email
- POST /api/v1/otp/resend: Re-issues OTP (recovery path for failed initial dispatch); not routed from registration UX
- POST /api/v1/otp/verify: Verifies code, activates account (user status pending → active)

### Event Contracts
- **otp_requests (writes)**: OTP code and hash persisted; status managed via repository methods
- **email_dispatch (publishes)**: OTP code dispatched via EmailOtpDeliveryAdapter; delivery status tracked in otp_requests.status

### Data Contracts
- **otp_requests table**: Row inserted per initiation; partial unique index uidx_otp_requests_active_per_user enforces one active OTP per user; status transitions pending → delivered | failed — **change required**
- **users table**: Status 'pending' → 'active' on verify; activated_at timestamp set — **change required**
- **Atomicity risk**: User row committed before OTP initiation; issueOtp failure leaves user stranded with status 'pending' and zero otp_requests rows — **change required**

## Design Steps

1. **Establish atomic transaction boundary** spanning RegistrationController.registerUser and DefaultOtpService.sendOtp to guarantee 100% OTP initiation on successful registration (AC-3 remediation)

2. **Implement exception handling** in RegistrationController.registerUser catch block to route issueOtp failures (OtpForbiddenError, OtpRateLimitExceededError, database errors) to resend flow instead of 500 response

3. **Add outbox/retry pattern** to DefaultOtpService.issueOtp with persistent otp_dispatch_outbox table to decouple user account creation from OTP delivery

4. **Implement reconciliation sweep job** to detect and recover orphaned pending users with zero otp_requests rows

5. **Modify RegistrationForm** to display recovery path (resend OTP link) on registration failure due to OTP initiation

6. **Enhance OtpVerificationForm** to support resend flow from registration error state

7. **Update OtpRequestRepository** to enforce partial unique index uidx_otp_requests_active_per_user and manage status transitions (pending → delivered | failed)

8. **Verify EmailOtpDeliveryAdapter** rate-limiting and OTP code hashing (bcrypt) implementation

## Security and Quality Constraints

- OTP code must be hashed before persistence (issueOtp:165 implements bcrypt hashing)
- OTP delivery must be rate-limited to prevent brute-force attacks (OtpRateLimitExceededError enforced at issueOtp:170)
- One active OTP per user must be enforced (partial unique index uidx_otp_requests_active_per_user on otp_requests)
- User status must transition from 'pending' to 'active' only after successful OTP verification (verifyOtp enforces this)
- Validate credential and personal-data handling against the Jira requirement
- Validate credential and personal-data handling against the story's acceptance criteria
- Preserve the availability, reliability, and observability constraints grounded by c5193e2b043c65b8

## Implementation Readiness Blockers

The following items must be resolved or explicitly accepted before implementation proceeds:

- A second check confirms OtpController (2958) as the likely correct object for this requirement -- re-run impact analysis anchored on it rather than treating this as unmapped.
- AC-3's '100% initiation' claim is violated by a non-atomic sequence between account creation and OTP dispatch
- CAST-measured focus object (email function) does not represent the OTP verification feature; search term derivation error (snake_case vs. camelCase) caused the miss
- CAST-measured focus object (email function, ID 2587) is a false positive from snake_case search terms; true focus is DefaultOtpService.sendOtp (ID 1012) and related OTP service methods
- Candidate verification flagged a possibly better-matching alternative that was not selected: OtpController (2958) -- review before accepting.
- Candidate verification found the selected focus object implausible for this requirement
- Measured blast radius (21 transactions, 1 direct caller) reflects the generic email function's footprint, not OTP-specific impact
- Measured blast radius does not reflect OTP-specific caller depth or transaction scope; re-measurement anchored on DefaultOtpService.sendOtp is required
- No measured evidence of the atomicity defect in CAST structural facts; defect is confirmed by code review of registration.controller.ts and otp.service.ts
- No reconciliation sweep exists for orphaned pending users with zero otp_requests rows
- Recovery path (POST /api/v1/otp/resend) exists but is not integrated into registration UX
- Requirement traceability incomplete for US-017-ac-3

## Unresolved Questions

- Should OTP initiation be made atomic with account creation (single transaction), or should an outbox/retry pattern be added with a reconciliation sweep for pending users?
- This codebase has two parallel email-verification mechanisms: (a) OTP code flow (otp_requests, POST /api/v1/otp/verify) and (b) Activation link flow (activation_tokens, createActivationRouter). US-017 names only OTP. Which is authoritative? Is (b) legacy or intentionally supported in parallel?

## Verification Plan

### Acceptance Criteria Verification

**US-017-ac-1**: Given a user successfully creates an account with valid registration data, When the account is created, Then the OTP verification process is automatically initiated.

**US-017-ac-2**: Given OTP verification is initiated, When the process starts, Then the user is informed that email verification is required to complete registration.

**US-017-ac-3**: Given a successful registration occurs, When OTP verification is triggered, Then 100% of successful registrations result in OTP verification initiation.

### Test Coverage

**IMPACT**: Integration test coverage exists: BACKEND/src/integration/otp.integration.spec.ts (RecordingOtpDeliveryPort captures dispatched codes for registration → activation flow)

**IMPACT**: Unit test coverage exists: BACKEND/src/services/otp.service.test.ts, BACKEND/src/adapters/email-otp-delivery.adapter.test.ts

**IMPACT**: Test gap: no coverage for issueOtp failure paths (OtpForbiddenError, OtpRateLimitExceededError, DB errors) when called from registration endpoint; no test for user stranding scenario

# Feature Specification: US-017

## User Story
**Title**: OTP Verification Initiation on Successful Registration

**Description**: As a New User, I want OTP verification to be initiated after successful registration, so that I can verify my email address and complete account setup.

## Acceptance Criteria

### US-017-ac-1
Given a user successfully creates an account with valid registration data, When the account is created, Then the OTP verification process is automatically initiated.

### US-017-ac-2
Given OTP verification is initiated, When the process starts, Then the user is informed that email verification is required to complete registration.

### US-017-ac-3
Given a successful registration occurs, When OTP verification is triggered, Then 100% of successful registrations result in OTP verification initiation.

## Functional Requirements

**FR-001**: Upon successful account creation with valid registration data (POST /api/v1/users/register returns 201), the system shall automatically invoke the OTP verification process via DefaultOtpService.sendOtp() without requiring additional user action.

**FR-002**: When OTP verification is initiated following successful registration, the backend shall return a 201 response message informing the user that email verification is required to complete registration (e.g., 'Registration successful. Please check your email for the verification code to activate your account.').

**FR-003**: The frontend shall display a user-facing message confirming that a verification code has been sent to the user's email address and shall navigate the user to the OTP verification form (OtpVerificationForm component).

**FR-004**: The system shall guarantee that 100% of successful registrations result in OTP verification initiation; however, this requirement is currently violated by a non-atomic sequence: user account creation (registrationService.register) commits in its own transaction, while OTP initiation (otpService.sendOtp) runs outside that transaction. Failure in issueOtp (OtpForbiddenError, OtpRateLimitExceededError, or database errors) results in a 500 response with the user stranded at status 'pending' and no OTP issued. A recovery path (POST /api/v1/otp/resend) exists but is not routed from the registration UX. No reconciliation sweep exists for orphaned pending users with zero otp_requests rows. Remediation is required to make OTP initiation atomic with account creation or to implement an outbox/retry pattern with reconciliation.

## API Contracts

### POST /api/v1/users/register
- **Impact**: Triggers OTP dispatch on success; returns user message informing of verification requirement
- **Status Code**: 201

### POST /api/v1/otp/send
- **Impact**: Issues OTP code, persists to otp_requests, dispatches via email

### POST /api/v1/otp/resend
- **Impact**: Re-issues OTP (recovery path for failed initial dispatch); not routed from registration UX

### POST /api/v1/otp/verify
- **Impact**: Verifies code, activates account (user status pending → active)

## Event Contracts

### otp_requests (writes)
OTP code and hash persisted; status managed via repository methods

### email_dispatch (publishes)
OTP code dispatched via EmailOtpDeliveryAdapter; delivery status tracked in otp_requests.status

## Data Contracts

### otp_requests table
Row inserted per initiation; partial unique index uidx_otp_requests_active_per_user enforces one active OTP per user; status transitions pending → delivered | failed

### users table
Status 'pending' → 'active' on verify; activated_at timestamp set

### Atomicity Risk
User row committed before OTP initiation; issueOtp failure leaves user stranded with status 'pending' and zero otp_requests rows

## Security Obligations

- OTP code must be hashed before persistence (issueOtp:165 implements bcrypt hashing)
- OTP delivery must be rate-limited to prevent brute-force attacks (OtpRateLimitExceededError enforced at issueOtp:170)
- One active OTP per user must be enforced (partial unique index uidx_otp_requests_active_per_user on otp_requests)
- User status must transition from 'pending' to 'active' only after successful OTP verification (verifyOtp enforces this)
- Validate credential and personal-data handling against the Jira requirement
- Validate credential and personal-data handling against the story's acceptance criteria

## Quality Attributes

- Preserve the availability, reliability, and observability constraints grounded by c5193e2b043c65b8

## Provenance

- **Policy version**: ace-spec-format/v1
- **Accepted impact analysis revision**: 2
- **Accepted impact analysis hash**: sha256:47f322f4396c7019e6590b52a7009127a0e86eb7ea7bfe5687ef6575620a0d41
- **Repository baseline commit**: e782768d250abd2627bc142076653a796bf45a43
- **Deterministic grounding reference**: c5193e2b043c65b8
- **Requirement context ID**: requirements_agent:6f24753d-278c-4e53-a4c0-dfde9f37c6e3:US-017

## Implementation Readiness Blockers

The following items must be resolved or explicitly accepted before implementation:

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

## Evidence References

- BACKEND/src/controllers/registration.controller.ts:126 — await this.otpService.sendOtp(result.userId) called unconditionally on success path
- BACKEND/src/services/otp.service.ts:92 — sendOtp method
- BACKEND/src/services/otp.service.ts:153 — issueOtp generates code, hashes, persists otp_requests row, dispatches via delivery port
- BACKEND/src/services/otp.service.ts:165 — OTP code hashing (bcrypt)
- BACKEND/src/services/otp.service.ts:170 — OTP rate-limiting enforcement
- BACKEND/src/routes/registration.routes.ts:38,52 — OtpService wiring
- BACKEND/src/controllers/registration.controller.ts:128 — 201 response with verification message
- FRONTEND/src/app/components/organisms/RegistrationForm.tsx:132 — displays verification message
- FRONTEND/src/app/components/organisms/RegistrationForm.tsx:202-203 — navigate to OTP verification form
- FRONTEND/src/app/components/organisms/OtpVerificationForm.tsx — OTP verification form component
- BACKEND/src/integration/otp.integration.spec.ts — Integration test coverage
- BACKEND/src/services/otp.service.test.ts — Unit test coverage
- BACKEND/src/adapters/email-otp-delivery.adapter.test.ts — Unit test coverage
- provider-object:2587 — email function in LoginForm.tsx (focus object)
- component:EmailDeliveryPort — OTP delivery interface
- component:EmailOtpDeliveryAdapter — OTP delivery adapter implementation

# Implementation Tasks: US-017

## Functional Requirements

### T001: FR-001 — Automatic OTP Initiation on Registration Success
**Requirement**: Upon successful account creation with valid registration data (POST /api/v1/users/register returns 201), the system shall automatically invoke the OTP verification process via DefaultOtpService.sendOtp() without requiring additional user action.

**Acceptance Criteria**:
- [ ] RegistrationController.registerUser calls DefaultOtpService.sendOtp() on success path
- [ ] OTP initiation is triggered before 201 response is returned
- [ ] No additional user action is required to initiate OTP verification

**Evidence References**:
- BACKEND/src/controllers/registration.controller.ts:126
- BACKEND/src/routes/registration.routes.ts:38,52
- BACKEND/src/services/otp.service.ts:92

---

### T002: FR-002 — User Notification of Email Verification Requirement
**Requirement**: When OTP verification is initiated following successful registration, the backend shall return a 201 response message informing the user that email verification is required to complete registration (e.g., 'Registration successful. Please check your email for the verification code to activate your account.').

**Acceptance Criteria**:
- [ ] POST /api/v1/users/register returns 201 status code
- [ ] Response includes message: 'Registration successful. Please check your email for the verification code to activate your account.'
- [ ] Message is user-facing and clearly communicates email verification requirement

**Evidence References**:
- BACKEND/src/controllers/registration.controller.ts:128

---

### T003: FR-003 — Frontend Display and Navigation to OTP Verification
**Requirement**: The frontend shall display a user-facing message confirming that a verification code has been sent to the user's email address and shall navigate the user to the OTP verification form (OtpVerificationForm component).

**Acceptance Criteria**:
- [ ] RegistrationForm displays message: 'We've sent a verification code to [email]'
- [ ] RegistrationForm navigates to OtpVerificationForm on successful registration
- [ ] Navigation passes email and userId in state
- [ ] OtpVerificationForm is rendered and ready for user input

**Evidence References**:
- FRONTEND/src/app/components/organisms/RegistrationForm.tsx:132
- FRONTEND/src/app/components/organisms/RegistrationForm.tsx:202-203
- FRONTEND/src/app/components/organisms/OtpVerificationForm.tsx

---

### T004: FR-004 — Guarantee 100% OTP Initiation (Atomicity Remediation)
**Requirement**: The system shall guarantee that 100% of successful registrations result in OTP verification initiation. This requirement is currently violated by a non-atomic sequence: user account creation (registrationService.register) commits in its own transaction, while OTP initiation (otpService.sendOtp) runs outside that transaction. Failure in issueOtp (OtpForbiddenError, OtpRateLimitExceededError, or database errors) results in a 500 response with the user stranded at status 'pending' and no OTP issued. A recovery path (POST /api/v1/otp/resend) exists but is not routed from the registration UX. No reconciliation sweep exists for orphaned pending users with zero otp_requests rows. Remediation is required to make OTP initiation atomic with account creation or to implement an outbox/retry pattern with reconciliation.

**Acceptance Criteria**:
- [ ] Establish atomic transaction boundary spanning RegistrationController.registerUser and DefaultOtpService.sendOtp
- [ ] Implement exception handling to route issueOtp failures to resend flow instead of 500 response
- [ ] Add outbox/retry pattern with persistent otp_dispatch_outbox table
- [ ] Implement reconciliation sweep job for orphaned pending users
- [ ] Modify RegistrationForm to display recovery path (resend OTP link) on registration failure
- [ ] Enhance OtpVerificationForm to support resend flow from registration error state
- [ ] Verify 100% initiation guarantee under failure scenarios

**Evidence References**:
- BACKEND/src/controllers/registration.controller.ts:126
- BACKEND/src/services/otp.service.ts:92,153,165,170,173,180,182
- BACKEND/src/controllers/registration.controller.ts catch block
- Accepted impact analysis: sha256:47f322f4396c7019e6590b52a7009127a0e86eb7ea7bfe5687ef6575620a0d41

---

## Verification Tasks

### T005: Verify US-017-ac-1
**Acceptance Criterion**: Given a user successfully creates an account with valid registration data, When the account is created, Then the OTP verification process is automatically initiated.

**Test Type**: Characterization

**Verification Steps**:
- [ ] Create test user with valid registration data
- [ ] Submit registration form
- [ ] Verify POST /api/v1/users/register returns 201
- [ ] Verify DefaultOtpService.sendOtp() was called
- [ ] Verify otp_requests row was created
- [ ] Verify email dispatch was triggered

**Evidence Reference**: 012e0992-6a2b-5e66-93fc-d33a2a26c19c:test:characterization:US-017-ac-1

---

### T006: Verify US-017-ac-2
**Acceptance Criterion**: Given OTP verification is initiated, When the process starts, Then the user is informed that email verification is required to complete registration.

**Test Type**: Characterization

**Verification Steps**:
- [ ] Complete registration successfully
- [ ] Verify 201 response message contains email verification requirement
- [ ] Verify frontend displays verification message
- [ ] Verify user is navigated to OtpVerificationForm
- [ ] Verify message clearly communicates next steps

**Evidence Reference**: 012e0992-6a2b-5e66-93fc-d33a2a26c19c:test:characterization:US-017-ac-2

---

### T007: Verify US-017-ac-3
**Acceptance Criterion**: Given a successful registration occurs, When OTP verification is triggered, Then 100% of successful registrations result in OTP verification initiation.

**Test Type**: Characterization

**Verification Steps**:
- [ ] Execute 100 successful registrations
- [ ] Verify 100% result in otp_requests row creation
- [ ] Verify 100% result in email dispatch
- [ ] Test under normal conditions
- [ ] Test under issueOtp failure scenarios (OtpForbiddenError, OtpRateLimitExceededError, DB errors)
- [ ] Verify recovery path is available for failed OTP initiations
- [ ] Verify no orphaned pending users exist after recovery

**Evidence Reference**: 012e0992-6a2b-5e66-93fc-d33a2a26c19c:test:characterization:US-017-ac-3

**Note**: This criterion is currently QUARANTINED due to atomicity violations. Verification must confirm remediation.

---

### T008: Verify Integration Test Coverage
**Requirement**: Integration test coverage exists: BACKEND/src/integration/otp.integration.spec.ts (RecordingOtpDeliveryPort captures dispatched codes for registration → activation flow)

**Verification Steps**:
- [ ] Confirm BACKEND/src/integration/otp.integration.spec.ts exists
- [ ] Verify RecordingOtpDeliveryPort is implemented
- [ ] Verify registration → OTP dispatch → verification flow is tested end-to-end
- [ ] Verify test captures dispatched OTP codes
- [ ] Verify test validates user status transitions (pending → active)

**Evidence Reference**: Impact analysis test obligations

---

### T009: Verify Unit Test Coverage
**Requirement**: Unit test coverage exists: BACKEND/src/services/otp.service.test.ts, BACKEND/src/adapters/email-otp-delivery.adapter.test.ts

**Verification Steps**:
- [ ] Confirm BACKEND/src/services/otp.service.test.ts exists
- [ ] Confirm BACKEND/src/adapters/email-otp-delivery.adapter.test.ts exists
- [ ] Verify DefaultOtpService.sendOtp() is tested
- [ ] Verify DefaultOtpService.issueOtp() is tested
- [ ] Verify EmailOtpDeliveryAdapter is tested
- [ ] Verify OTP code hashing (bcrypt) is tested
- [ ] Verify rate-limiting is tested

**Evidence Reference**: Impact analysis test obligations

---

### T010: Address Test Gap — issueOtp Failure Paths
**Requirement**: Test gap: no coverage for issueOtp failure paths (OtpForbiddenError, OtpRateLimitExceededError, DB errors) when called from registration endpoint; no test for user stranding scenario

**Verification Steps**:
- [ ] Add test for OtpForbiddenError during registration
- [ ] Add test for OtpRateLimitExceededError during registration
- [ ] Add test for database errors during OTP initiation
- [ ] Add test for user stranding scenario (user created, OTP initiation fails)
- [ ] Verify recovery path is available and functional
- [ ] Verify reconciliation sweep detects and recovers orphaned users
- [ ] Verify no 500 response is returned; instead route to resend flow

**Evidence Reference**: Impact analysis test obligations

---

## Implementation Readiness Blockers

Before proceeding with implementation, the following items must be resolved or explicitly accepted:

- [ ] A second check confirms OtpController (2958) as the likely correct object for this requirement -- re-run impact analysis anchored on it rather than treating this as unmapped.
- [ ] AC-3's '100% initiation' claim is violated by a non-atomic sequence between account creation and OTP dispatch — **DECISION REQUIRED**: atomic transaction or outbox/retry pattern?
- [ ] CAST-measured focus object (email function) does not represent the OTP verification feature; search term derivation error (snake_case vs. camelCase) caused the miss — **ACKNOWLEDGED**
- [ ] CAST-measured focus object (email function, ID 2587) is a false positive from snake_case search terms; true focus is DefaultOtpService.sendOtp (ID 1012) and related OTP service methods — **ACKNOWLEDGED**
- [ ] Candidate verification flagged a possibly better-matching alternative that was not selected: OtpController (2958) -- review before accepting. — **DECISION REQUIRED**
- [ ] Candidate verification found the selected focus object implausible for this requirement — **ACKNOWLEDGED**
- [ ] Measured blast radius (21 transactions, 1 direct caller) reflects the generic email function's footprint, not OTP-specific impact — **ACKNOWLEDGED**
- [ ] Measured blast radius does not reflect OTP-specific caller depth or transaction scope; re-measurement anchored on DefaultOtpService.sendOtp is required — **ACKNOWLEDGED**
- [ ] No measured evidence of the atomicity defect in CAST structural facts; defect is confirmed by code review of registration.controller.ts and otp.service.ts — **ACKNOWLEDGED**
- [ ] No reconciliation sweep exists for orphaned pending users with zero otp_requests rows — **REMEDIATION REQUIRED**
- [ ] Recovery path (POST /api/v1/otp/resend) exists but is not integrated into registration UX — **REMEDIATION REQUIRED**
- [ ] Requirement traceability incomplete for US-017-ac-3 — **REMEDIATION REQUIRED**
- [ ] This codebase has two parallel email-verification mechanisms: (a) OTP code flow (otp_requests, POST /api/v1/otp/verify) and (b) Activation link flow (activation_tokens, createActivationRouter). US-017 names only OTP. Which is authoritative? Is (b) legacy or intentionally supported in parallel? — **DECISION REQUIRED**

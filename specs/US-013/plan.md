# Implementation Plan: US-013 — Registration Form Data Collection

## Overview

This plan details the implementation of user story US-013, which requires a registration form with full name, email address, and password fields, along with comprehensive field-level validation and error handling.

## Grounding & Evidence

### Accepted Impact Analysis
- **Revision**: 1
- **Hash**: `sha256:51956e4aca4cabce3b91d9ed72842e46f73b6b12ebf04ad393ef3737c8659b4a`
- **Status**: Accepted

### Codebase Grounding
- **Snapshot reference**: `f875a52838761d9d`
- **Repository**: `https://github.com/XEBIA-ACE/Enhanced_UMS_Project`
- **Base branch**: `main`
- **Commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`

### Affected Components

**Backend Service Layer**:
- `register` (id=1222) — Typescript Method in `§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/services/registration.service.ts`
- `RegistrationRequestDto` (id=1502) — Typescript Interface
- `RegisterUserValidationErrorResponse` (id=1563) — Typescript Interface
- `RegisterUserFieldError` (id=1564) — Typescript Interface
- `RegisterUserSuccessResponse` (id=1565) — Typescript Interface
- `RegisterUserPasswordPolicyErrorResponse` (id=1562) — Typescript Interface
- `RegisterUserUsernameUnavailableErrorResponse` (id=1561) — Typescript Interface
- `RegisterUserGenericErrorResponse` (id=1560) — Typescript Interface
- `UsernameConflictError` (id=2986) — Typescript Class
- `withTransaction` (id=2407) — Typescript Function
- `isUsernameConflictError` (id=2458) — Typescript Function

**Backend Controller Layer**:
- `registerUser` (id=1052) — Typescript Method in `§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/controllers/registration.controller.ts`

**API Endpoint**:
- `api/v1/users/register/` (id=3370) — NodeJS Post Operation

**Frontend Components**:
- `FormControl_fragment_1` (id=3231) — HTML Fragment
- `useFormField` (id=2793) — Typescript Function
- `onRegister` (id=2657, 2660, 2664) — Typescript Function (multiple instances)
- `goToRegister` (id=2655) — Typescript Function

### Blast Radius

- **Direct callers**: 4 (registerUser, enqueueConfirmationEmail, getProfile, resendConfirmation)
- **Transitive callers**: 0
- **Callees**: 12
- **Transactions**: 21
- **Data objects**: 13

## Implementation Constraints & Readiness Items

### Unresolved Implementation-Readiness Issues

**Critical**:
1. **Candidate verification uncertainty**: The selected focus object `register` (id=1222) has a name that aligns with the registration requirement, but without access to the method's implementation details, it is unclear whether it specifically handles the full name, email, and password data collection described in the requirement. The candidate list includes `registerUser` (id=1052), which may be a more semantically precise match for user account creation.
   - **Action required**: Review and confirm that `register` (1222) is the correct focus object, or revise to use `registerUser` (1052) if more appropriate.

2. **Field validation architecture**: Does the `register` method validate all three fields (name, email, password) or does validation occur at a higher layer?
   - **Action required**: Clarify validation responsibility and layer.

3. **Error aggregation structure**: What is the exact structure of `RegisterUserFieldError` — does it support multiple field errors in a single response?
   - **Action required**: Confirm DTO structure supports multi-field error responses.

4. **Password policy enforcement**: Is password policy validation (US-013-ac-4) enforced in the `register` method or in a separate password validator?
   - **Action required**: Clarify password validation responsibility.

5. **Form submission blocking mechanism**: How does the frontend form blocking mechanism work — is it client-side validation, server-side rejection, or both?
   - **Action required**: Document blocking strategy (client-side, server-side, or hybrid).

6. **Rate limiting & abuse prevention**: Are there rate-limiting or account lockout mechanisms in place to prevent registration abuse?
   - **Action required**: Implement or document rate-limiting strategy.

### Evidence Gaps

- Frontend form rendering logic is not visible in backend structural analysis
- Specific field-level validation rules are not detailed in CAST object-level facts
- Password policy enforcement details are not specified
- Form submission blocking mechanism (client vs. server) is not documented in structural facts
- Transaction call graph details are not available (returned empty from CAST MCP)
- Requirement traceability incomplete for US-013-ac-1, US-013-ac-2, US-013-ac-3, US-013-ac-4, US-013-ac-5

## Contract Changes Required

### API Endpoint
- **POST** `api/v1/users/register/` — User registration endpoint (change required)

### Event Contracts
- `RegisterUserFieldError` — Individual field validation errors (change required)
- `RegisterUserValidationErrorResponse` — Validation failure response (change required)
- `RegisterUserSuccessResponse` — Successful registration response (change required)

### Data Contracts
- `RegisterUserRequest` — Incoming registration payload (change required)
- `RegisterUserSuccessResponse` — Successful registration response (change required)
- `RegisterUserValidationErrorResponse` — Validation failure response (change required)
- `RegisterUserFieldError` — Individual field validation errors (change required)
- `RegisterUserPasswordPolicyErrorResponse` — Password policy violations (change required)
- `RegisterUserUsernameUnavailableErrorResponse` — Username conflict response (change required)
- `RegisterUserGenericErrorResponse` — Generic error fallback (change required)

## Security & Quality Obligations

### Security
- Password must be validated against policy before storage
- Username uniqueness must be enforced at database level
- Registration requests must be rate-limited to prevent abuse
- Sensitive data (passwords) must not be logged or exposed in error responses
- Validate credential and personal-data handling against the Jira requirement
- Validate credential and personal-data handling against the story's acceptance criteria

### Quality Attributes
- Preserve the availability, reliability, and observability constraints grounded by f875a52838761d9d

### Accessibility
- Validation error messages must be associated with form fields using ARIA labels
- Error messages must be announced to screen readers
- Form fields must have proper labels and be keyboard navigable

## Test Obligations

- Verify registration form displays with full name, email, and password fields (US-013-ac-1)
- Validate that missing full name triggers validation error and blocks submission (US-013-ac-2)
- Validate that missing email triggers validation error and blocks submission (US-013-ac-3)
- Validate that missing password triggers validation error and blocks submission (US-013-ac-4)
- Validate that multiple missing fields trigger all corresponding validation errors and block submission (US-013-ac-5)
- Test transaction atomicity for concurrent registration attempts
- Verify error responses match expected DTO structures

## Implementation Approach

### Phase 1: Clarify & Resolve Readiness Items
1. Confirm focus object selection (`register` vs. `registerUser`)
2. Document field validation architecture and responsibility layers
3. Confirm `RegisterUserFieldError` DTO structure for multi-field errors
4. Clarify password policy validation responsibility
5. Document form submission blocking strategy
6. Define rate-limiting and abuse prevention mechanisms

### Phase 2: Backend Implementation
1. Enhance `register` (1222) method to validate full name, email, and password fields per US-013-ac-1 through US-013-ac-5
2. Ensure `RegistrationRequestDto` (1502) contains required fields: full name, email, password
3. Implement field-level validation in `register` method to enforce required field constraints (US-013-ac-2, US-013-ac-3, US-013-ac-4)
4. Implement multi-field validation aggregation in `register` method to return all validation errors simultaneously (US-013-ac-5)
5. Ensure `RegisterUserValidationErrorResponse` and `RegisterUserFieldError` are populated with validation failures
6. Ensure `RegisterUserSuccessResponse` is returned on successful registration
7. Verify `withTransaction` wrapper maintains atomicity of registration operations
8. Verify `UsernameConflictError` handling via `isUsernameConflictError` classification
9. Enhance `registerUser` (1052) controller method to invoke `register` service and handle validation responses
10. Ensure `api/v1/users/register/` POST endpoint routes to `registerUser` controller

### Phase 3: Frontend Implementation
1. Enhance `FormControl_fragment_1` and `useFormField` to render registration form with full name, email, password fields (US-013-ac-1)
2. Enhance `onRegister` handlers to invoke `api/v1/users/register/` endpoint and display validation errors (US-013-ac-2 through US-013-ac-5)
3. Implement form submission blocking when validation errors are present
4. Ensure validation error messages are associated with form fields using ARIA labels for accessibility
5. Ensure error messages are announced to screen readers
6. Ensure form fields have proper labels and are keyboard navigable

### Phase 4: Testing & Verification
1. Execute characterization tests for all five acceptance criteria
2. Verify transaction atomicity under concurrent registration attempts
3. Validate error response DTO structures
4. Perform accessibility compliance testing
5. Conduct security testing for password handling and rate-limiting

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `1`
- **Accepted impact analysis hash**: `sha256:51956e4aca4cabce3b91d9ed72842e46f73b6b12ebf04ad393ef3737c8659b4a`
- **Repository baseline commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Deterministic grounding reference**: `f875a52838761d9d`

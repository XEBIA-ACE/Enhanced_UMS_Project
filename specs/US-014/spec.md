# Feature Specification: US-014 — Email Format and Uniqueness Validation

## User Story
As a New User, I want the system to validate my email format and check for uniqueness, so that I can ensure my email is valid and not already registered.

## Acceptance Criteria

### US-014-ac-1
Given a user enters an email address that does not conform to RFC 5322 format, When they attempt to submit the registration form, Then a validation error is displayed indicating the email format is invalid.

### US-014-ac-2
Given a user enters an email address that is already registered in the system, When they attempt to submit the registration form, Then an error is displayed indicating the email is already in use and no account is created.

### US-014-ac-3
Given a user enters a valid RFC 5322 compliant email that is not already registered, When the email validation is performed, Then no email-related validation errors are displayed.

### US-014-ac-4
Given a user enters a duplicate email, When the error is displayed, Then the user can correct the email and resubmit the form.

## Functional Requirements

**FR-001**: The system shall validate email format against RFC 5322 standard during registration form submission. If the email does not conform to RFC 5322, a validation error message indicating the email format is invalid shall be displayed to the user.

**FR-002**: The system shall check email uniqueness against all previously registered emails in the system during registration form submission. If the email is already registered, an error message indicating the email is already in use shall be displayed, and no new account shall be created.

**FR-003**: The system shall perform email validation (both format and uniqueness checks) and return no email-related validation errors when the email conforms to RFC 5322 format and is not already registered in the system.

**FR-004**: The system shall allow users to correct an invalid or duplicate email address and resubmit the registration form after receiving a validation error, with the form retaining the ability to accept corrected input and re-validate.

## API and Data Contracts

### Endpoint
- **POST /register** — Registration endpoint that triggers email validation; API context query returned errors, so exact path not confirmed by CAST.

### Data Contracts
- **RegistrationRequestDto** — Email field in RegistrationRequestDto must be validated before any downstream processing.
- **RegistrationValidationResult** — Validation result (RegistrationValidationResult) must clearly indicate format vs. uniqueness failures.
- **User database** — No duplicate email records should be created in the user database as a result of this validation.

## Security Obligations

- Email format validation must reject malformed addresses to prevent injection or bypass attacks.
- Uniqueness check must prevent account enumeration attacks (e.g., timing-based or error-message-based user discovery).
- Validation errors must not leak sensitive information (e.g., exact list of registered emails) in error messages.
- Validate credential and personal-data handling against the Jira requirement.
- Validate credential and personal-data handling against the story's acceptance criteria.

## Quality Attributes

- Preserve the availability, reliability, and observability constraints grounded by f875a52838761d9d.

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `1`
- **Accepted impact analysis hash**: `sha256:fa1bbd338d623fcb35dbe709d6d2a997ba756f0eecaaacfba91df45dd4a75db2`
- **Repository baseline commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Deterministic grounding reference**: `f875a52838761d9d`
- **Generation mode**: `enhancement`
- **Run ID**: `ccc41280-43cf-59c6-ad53-d78477491940`
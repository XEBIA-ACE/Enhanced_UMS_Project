# Implementation Plan: US-001
## Login Form with Client-Side Validation and Responsive Layout

---

## Technical Context

- **Determinism snapshot**: `sha256:cc6f030278b8e5e89aa8aedb0bc27316e9fda19d8e7a9ecde7cf1ce695bf00ac`
- **Codebase grounding snapshot**: `provenance:6acbb7759a945845`
- **Accepted impact analysis**: `sha256:85b764148634fb2310b3edb1c8ee4a9dc7554e36104e5e3459c72b33b55ce06a` (revision 1)
- **Repository commit**: `485ef80ff27986bcf1f8331f80aa819e58bc3728` (ref: `main`, repo: `https://github.com/XEBIA-ACE/Enhanced_UMS_Project`)
- **CAST application**: `User_Management`
- **Grounding fingerprint**: `6acbb7759a945845` (grounded: true, provider: cast)

### Provider-Confirmed Objects

| Object | ID | Type | File |
|--------|----|------|------|
| LoginForm | 2580 | Typescript Function | `LoginForm.tsx` |
| LoginForm_fragment_1 | 3074 | HTML Fragment | `LoginForm.tsx` |
| LoginForm_fragment_2 | 3073 | HTML Fragment | `LoginForm.tsx` |
| LoginForm_fragment_3 | 3072 | HTML Fragment | `LoginForm.tsx` |
| LoginForm_fragment_4 | 3071 | HTML Fragment | `LoginForm.tsx` |
| LoginForm_fragment_5 | 3070 | HTML Fragment | `LoginForm.tsx` |
| LoginForm_fragment_6 | 3069 | HTML Fragment | `LoginForm.tsx` |
| LoginTemplate_fragment_1 | 3110 | HTML Fragment | — (sole direct caller) |
| RegistrationRequestDto | 1502 | Typescript Interface | — |
| RegistrationValidationResult | 1500 | Typescript Interface | — |
| handleSubmit | 2573 | Typescript Function | — |
| registerUser | 1052 | Typescript Method | — |
| validate | 1243 | Typescript Method | — |
| LoginForm.tsx | 1361 | Typescript Module | `LoginForm.tsx` |

### Affected File

- `§{main_sources}§/New_Prompt_UMS-develop/FRONTEND/src/app/components/organisms/LoginForm.tsx`

### Relevant Dependencies

- `@radix-ui/react-label@2.1.2` — label primitives for email/mobile and password field labels (WCAG 1.3.1)
- `@radix-ui/react-slot@1.1.2` — slot composition used across 5 elements in the component tree
- `@radix-ui/react-checkbox@1.1.4` — may be used for form controls within the login layout
- `@radix-ui/react-dialog@1.1.6` — dialog primitives present; may wrap or overlay the login form on some viewports

### CAST Blast Radius

- Direct callers: 3 | Transitive callers: 0 | Callees: 9 | Transactions: 47 | Data objects: 8

---

## Contract Changes

- No material API, event, or data contract change is evidenced.
- `spec_api_impact.contract_change_required`: false
- `spec_api_impact.status`: **blocked** — accepted impact was accepted_with_gaps; blocking reasons: requirement traceability incomplete for all 6 acceptance criteria (US-001-ac-1 through US-001-ac-6).

---

## Design Steps

**STEP 1** — Modify `LoginForm` (provider-confirmed TypeScript Function, object id 2580, file: `LoginForm.tsx`): Ensure the component renders two distinct, programmatically labelled input fields on mount — one for email/mobile (type='text' or 'email') and one for password (type='password'). Use `@radix-ui/react-label@2.1.2` (confirmed in dependency inventory) to associate labels with each input (WCAG 1.3.1). This addresses FR-001 and FR-007. [Gap: CAST structural facts only partially confirm distinct labelled inputs; field-level rendering must be verified by code inspection or unit test.]

**STEP 2** — Modify `LoginForm` (provider-confirmed, object id 2580): Implement or verify a responsive layout strategy (CSS media queries, Tailwind breakpoints, or container queries — approach unconfirmed from CAST structural facts and must be established during implementation) ensuring all form fields and controls remain fully usable at viewport widths down to 320 px without horizontal scrolling. Document the chosen approach. This addresses FR-002. [Gap: CAST structural facts contain no CSS/media-query metadata; responsiveness must be confirmed by visual regression tests.]

**STEP 3** — Modify `LoginForm` (provider-confirmed, object id 2580): Introduce or verify client-side validation state management for the email/mobile field. When the form submission event fires with the email/mobile field empty, display a visible, accessible validation error message associated with that field (using aria-live or role='alert' per WCAG 4.1.3) and guard against invoking the credential submission handler. This addresses FR-003 and FR-007. [Gap: validation logic not confirmed in CAST structural facts; must be verified by unit tests.]

**STEP 4** — Modify `LoginForm` (provider-confirmed, object id 2580): Introduce or verify client-side validation state management for the password field. When the form submission event fires with the password field empty, display a visible, accessible validation error message associated with the password field (aria-live or role='alert') and guard against invoking the credential submission handler. Ensure the password input uses type='password' to prevent plaintext DOM exposure (FR-008). This addresses FR-004, FR-007, and FR-008. [Gap: same as STEP 3; must be verified by unit tests.]

**STEP 5** — Modify `LoginForm` (provider-confirmed, object id 2580): Ensure simultaneous multi-field validation: when both the email/mobile and password fields are empty on submission, both validation error messages are displayed concurrently and the credential submission handler is not invoked. This addresses FR-005. [Gap: multi-field simultaneous validation state not confirmed in CAST structural facts; must be verified by unit tests.]

**STEP 6** — Modify `handleSubmit` (provider-confirmed TypeScript Function, object id 2573, direct caller of emailOrPhone): Update the submission guard logic so that when both fields contain non-empty values, client-side validation passes and the credential submission handler is invoked. Confirm the target credential-submission endpoint (e.g. POST /auth/login) — currently unconfirmed due to CAST API inventory retrieval errors — before finalising the submission flow. This addresses FR-006. [Gap: no confirmed backend API endpoint linked to LoginForm from CAST facts; must be resolved before credential-submission flow changes are finalised.]

**STEP 7** — Modify `validate` (provider-confirmed TypeScript Method, object id 1243, IMPLEMENT relationship from validateCredentials): Verify that the validate method enforces non-empty constraints for both email/mobile and password fields and returns structured validation results compatible with the error-display logic introduced in STEPs 3–5. Ensure server-side validation remains authoritative and client-side validation is not the sole guard (FR-008).

**STEP 8** — Modify `RegistrationRequestDto` (provider-confirmed TypeScript Interface, object id 1502, RELY_ON from validateCredentials): Confirm that the DTO includes fields for email/mobile and password as required by the login form submission contract. No structural changes expected; verify compatibility with the updated LoginForm submission flow.

**STEP 9** — Modify `RegistrationValidationResult` (provider-confirmed TypeScript Interface, object id 1500, RELY_ON from validateCredentials): Confirm that the validation result interface exposes per-field error structures sufficient to drive the field-level error display in LoginForm. Extend if necessary to support simultaneous multi-field error reporting (FR-005).

**STEP 10** — Modify `registerUser` (provider-confirmed TypeScript Method, object id 1052, direct caller of validateCredentials): Verify that registerUser is not invoked when client-side validation fails. Ensure no credential data is logged or persisted client-side during the validation or submission flow (FR-008 security obligation).

**STEP 11** — Modify `LoginForm_fragment_1` through `LoginForm_fragment_6` (provider-confirmed HTML Fragments, object ids 3074–3069, direct callees of LoginForm): Review each fragment's JSX sub-tree to ensure responsive layout classes, accessible label associations, and error-message containers (aria-live/role='alert') are correctly propagated. Fragments are downstream callees of LoginForm and will be affected by layout and validation changes introduced in STEPs 1–5.

**STEP 12** — Modify `LoginTemplate_fragment_1` (provider-confirmed HTML Fragment, object id 3110, sole direct caller of LoginForm): Regression-test the composition of LoginTemplate_fragment_1 with the updated LoginForm to confirm the entry-point rendering remains intact after all structural changes. This is the only confirmed upstream caller per CAST Level 1 and Level 2+ data.

**STEP 13** — Accessibility and security verification across all modified components: Confirm all form controls are keyboard-navigable and focusable without a mouse (WCAG 2.1.1); confirm validation state is not conveyed by colour alone (WCAG 1.4.1); confirm password field uses type='password'; confirm no credential data is logged or persisted client-side. These obligations apply across LoginForm and all affected fragments (FR-007, FR-008).

**STEP 14** — Test coverage: Write or update unit tests for LoginForm (object id 2580) covering: (a) renders email/mobile and password fields on mount; (b) empty email/mobile triggers error, no handler invoked; (c) empty password triggers error, no handler invoked; (d) both fields empty triggers both errors, no handler invoked; (e) both fields populated passes validation and invokes handler. Add responsive/visual regression test at 320 px viewport. Regression-test all 47 CAST-measured transactions passing through LoginForm after the enhancement. [Degraded: architecture context is degraded (missing api_contracts); accepted_impact_hash present and carried forward.]

---

## Security and Quality Obligations

- Client-side validation must not be the sole guard against empty or malformed credentials — server-side validation must remain authoritative.
- Password field must use input type='password' to prevent plaintext exposure in the DOM.
- No credential data should be logged or persisted client-side during validation.
- Validate credential and personal-data handling against the Jira requirement.
- Validate credential and personal-data handling against the story's acceptance criteria.
- Preserve the availability, reliability, and observability constraints grounded by `6acbb7759a945845`.

---

## Unresolved Items (must be resolved or explicitly accepted before implementation is finalised)

1. API inventory call failed with errors — are there any backend authentication endpoints (e.g. POST /auth/login) that LoginForm calls on submission? This must be confirmed before credential-submission flow changes are finalised.
2. API inventory for User_Management application returned errors — no confirmed endpoint paths available from CAST.
3. API inventory retrieval returned errors (NoneType, invalid arguments); no confirmed backend API endpoints are attributed to LoginForm from CAST facts.
4. Are the 20 medium-severity quality findings in the application inventory located within the LoginForm component tree, or elsewhere in the application?
5. DB object types for all 8 listed objects are 'unknown' — cannot confirm whether any represent real backend data stores.
6. Do any of the 6 LoginForm fragments individually own validation logic, or is all validation centralised in the parent LoginForm (2580) TypeScript function?
7. LoginTemplate_fragment_1 (3110) is the sole entry point rendering LoginForm; no other callers exist per CAST Level 1 and Level 2+ data.
8. No intra-object structural facts were returned for LoginForm_fragment_2 through _6 — internal logic of those fragments is unverified.
9. Requirement traceability incomplete for US-001-ac-1, US-001-ac-2, US-001-ac-3, US-001-ac-4, US-001-ac-5, US-001-ac-6.
10. The 6 downstream HTML Fragments (LoginForm_fragment_1 through _6) represent JSX sub-trees or render fragments within LoginForm.tsx and will all be affected by layout and validation changes.
11. The 8 CAST-listed 'database objects' (LoginForm, LoginForm.tsx, LoginForm_fragment_1 through _6) are CAST-catalogued frontend artifacts, not backend relational DB tables, because their names exactly match the component and its HTML Fragment callees.
12. Transaction call graphs returned empty (transaction_details focus=graph not available) — full call chain depth cannot be verified.
13. Transitive callers (Level 2+) returned 0 results — upstream caller chain beyond LoginTemplate_fragment_1 is unconfirmed.
14. What is the exact responsive breakpoint strategy used in the project (CSS media queries, Tailwind breakpoints, container queries)? CAST structural facts do not expose this.

---

## Verification Plan

- **US-001-ac-1**: Given a user navigates to the login page, When the page loads on a desktop screen, Then the login form is displayed with an email/mobile field and a password field.
- **US-001-ac-2**: Given a user navigates to the login page, When the page loads on a mobile or small screen, Then the login form is fully responsive and all fields and controls are usable without horizontal scrolling.
- **US-001-ac-3**: Given a user leaves the email/mobile field empty and submits the form, When the form submission is triggered, Then a validation error is shown on the email/mobile field and no credential lookup is attempted.
- **US-001-ac-4**: Given a user leaves the password field empty and submits the form, When the form submission is triggered, Then a validation error is shown on the password field and no credential lookup is attempted.
- **US-001-ac-5**: Given a user leaves both fields empty and submits the form, When the form submission is triggered, Then validation errors are shown on both fields and no credential lookup is attempted.
- **US-001-ac-6**: Given a user has entered values in both fields, When the form is submitted, Then client-side validation passes and the form proceeds to credential submission.
- **IMPACT**: Unit tests: LoginForm renders email/mobile field and password field on mount.
- **IMPACT**: Unit tests: Submitting with empty email/mobile field triggers validation error and does not invoke credential submission handler.
- **IMPACT**: Unit tests: Submitting with empty password field triggers validation error and does not invoke credential submission handler.
- **IMPACT**: Unit tests: Submitting with both fields empty triggers both validation errors and does not invoke credential submission handler.
- **IMPACT**: Unit tests: Submitting with both fields populated passes client-side validation and invokes credential submission handler.
- **IMPACT**: Responsive/visual tests: LoginForm renders without horizontal scroll at 320px viewport width.
- **IMPACT**: Integration tests: LoginTemplate_fragment_1 (3110) correctly composes and renders LoginForm (2580) — the sole direct caller must be regression-tested after any structural change to LoginForm.
- **IMPACT**: Regression tests: All 47 CAST-measured transactions passing through LoginForm must remain functional after the enhancement.

---

## Evidence References

- `determinism-snapshot:sha256:cc6f030278b8e5e89aa8aedb0bc27316e9fda19d8e7a9ecde7cf1ce695bf00ac`
- `provenance:6acbb7759a945845`
- `accepted_impact_hash:sha256:85b764148634fb2310b3edb1c8ee4a9dc7554e36104e5e3459c72b33b55ce06a`
- `provider-object:2580:LoginForm:Typescript Function`
- `provider-object:3074:LoginForm_fragment_1:HTML Fragment`
- `provider-object:3073:LoginForm_fragment_2:HTML Fragment`
- `provider-object:3072:LoginForm_fragment_3:HTML Fragment`
- `provider-object:3071:LoginForm_fragment_4:HTML Fragment`
- `provider-object:3070:LoginForm_fragment_5:HTML Fragment`
- `provider-object:3069:LoginForm_fragment_6:HTML Fragment`
- `provider-object:3110:LoginTemplate_fragment_1:HTML Fragment`
- `provider-object:1502:RegistrationRequestDto:Typescript Interface`
- `provider-object:1500:RegistrationValidationResult:Typescript Interface`
- `provider-object:2573:handleSubmit:Typescript Function`
- `provider-object:1052:registerUser:Typescript Method`
- `provider-object:1243:validate:Typescript Method`
- `provider-object:1361:LoginForm.tsx:Typescript Module`
- `affected-file:§{main_sources}§/New_Prompt_UMS-develop/FRONTEND/src/app/components/organisms/LoginForm.tsx`
- `dependency:@radix-ui/react-label@2.1.2`
- `dependency:@radix-ui/react-slot@1.1.2`
- `dependency:@radix-ui/react-checkbox@1.1.4`
- `dependency:@radix-ui/react-dialog@1.1.6`
- `cast-blast-radius:direct_callers=3,transitive_callers=0,callees=9,transactions=47,data_objects=8`
- `requirement:US-001-ac-1`
- `requirement:US-001-ac-2`
- `requirement:US-001-ac-3`
- `requirement:US-001-ac-4`
- `requirement:US-001-ac-5`
- `requirement:US-001-ac-6`
- `degraded-reason:architecture_context.missing_core=[api_contracts]`
- `degraded-reason:requirement_traceability_incomplete:US-001-ac-1,US-001-ac-2,US-001-ac-3,US-001-ac-4,US-001-ac-5,US-001-ac-6`
- `degraded-reason:cast_api_inventory_retrieval_errors:no_confirmed_backend_endpoint_for_LoginForm`
- `commit:485ef80ff27986bcf1f8331f80aa819e58bc3728:main:https://github.com/XEBIA-ACE/Enhanced_UMS_Project`

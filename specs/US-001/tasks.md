# Tasks: US-001
## Login Form with Client-Side Validation and Responsive Layout

> Implement only against Accepted impact analysis (revision 1) — fingerprint `sha256:85b764148634fb2310b3edb1c8ee4a9dc7554e36104e5e3459c72b33b55ce06a`.
> Architecture context is degraded (missing: api_contracts). All unresolved items listed in plan.md must be resolved or explicitly accepted before implementation is finalised.

---

### Implementation Tasks

- [ ] **T001** [FR-001 → US-001-ac-1] Modify `LoginForm` (id=2580, `LoginForm.tsx`): Ensure the component renders two distinct, programmatically labelled input fields on mount — one for email/mobile (type='text' or 'email') and one for password (type='password'). Use `@radix-ui/react-label@2.1.2` to associate labels with each input (WCAG 1.3.1). _Gap: CAST structural facts only partially confirm distinct labelled inputs; field-level rendering must be verified by code inspection or unit test._

- [ ] **T002** [FR-002 → US-001-ac-2] Modify `LoginForm` (id=2580): Implement or verify a responsive layout strategy (CSS media queries, Tailwind breakpoints, or container queries — approach unconfirmed from CAST structural facts and must be established during implementation) ensuring all form fields and controls remain fully usable at viewport widths down to 320 px without horizontal scrolling. Document the chosen approach. _Gap: CAST structural facts contain no CSS/media-query metadata; responsiveness must be confirmed by visual regression tests._

- [ ] **T003** [FR-003 → US-001-ac-3] Modify `LoginForm` (id=2580): Introduce or verify client-side validation state management for the email/mobile field. When the form submission event fires with the email/mobile field empty, display a visible, accessible validation error message (aria-live or role='alert', WCAG 4.1.3) and guard against invoking the credential submission handler. _Gap: validation logic not confirmed in CAST structural facts; must be verified by unit tests._

- [ ] **T004** [FR-004 → US-001-ac-4] Modify `LoginForm` (id=2580): Introduce or verify client-side validation state management for the password field. When the form submission event fires with the password field empty, display a visible, accessible validation error message (aria-live or role='alert') and guard against invoking the credential submission handler. Ensure the password input uses type='password' (FR-008). _Gap: same as T003; must be verified by unit tests._

- [ ] **T005** [FR-005 → US-001-ac-5] Modify `LoginForm` (id=2580): Ensure simultaneous multi-field validation — when both the email/mobile and password fields are empty on submission, both validation error messages are displayed concurrently and the credential submission handler is not invoked. _Gap: multi-field simultaneous validation state not confirmed in CAST structural facts; must be verified by unit tests._

- [ ] **T006** [FR-006 → US-001-ac-6] Modify `handleSubmit` (id=2573): Update the submission guard logic so that when both fields contain non-empty values, client-side validation passes and the credential submission handler is invoked. Confirm the target credential-submission endpoint (e.g. POST /auth/login) — currently unconfirmed due to CAST API inventory retrieval errors — before finalising the submission flow. _Gap: no confirmed backend API endpoint linked to LoginForm from CAST facts._

- [ ] **T007** [FR-007 — accessibility, supports US-001-ac-1, ac-3, ac-4, ac-5] Across `LoginForm` and all affected fragments: confirm all form controls are keyboard-navigable and focusable without a mouse (WCAG 2.1.1); confirm validation state is not conveyed by colour alone (WCAG 1.4.1); confirm `@radix-ui/react-label@2.1.2` is used for all field labels; confirm aria-live/role='alert' containers are present for all validation error messages.

- [ ] **T008** [FR-008 — security, supports US-001-ac-3, ac-4, ac-5, ac-6] Across `LoginForm` and all affected fragments: confirm password input uses type='password'; confirm client-side validation is not the sole guard (server-side validation remains authoritative); confirm no credential data is logged or persisted client-side during the validation or submission flow.

- [ ] **T009** Modify `validate` (id=1243): Verify that the validate method enforces non-empty constraints for both email/mobile and password fields and returns structured validation results compatible with the error-display logic introduced in T003–T005. Ensure server-side validation remains authoritative.

- [ ] **T010** Modify `RegistrationRequestDto` (id=1502): Confirm that the DTO includes fields for email/mobile and password as required by the login form submission contract. No structural changes expected; verify compatibility with the updated LoginForm submission flow.

- [ ] **T011** Modify `RegistrationValidationResult` (id=1500): Confirm that the validation result interface exposes per-field error structures sufficient to drive the field-level error display in LoginForm. Extend if necessary to support simultaneous multi-field error reporting (FR-005).

- [ ] **T012** Modify `registerUser` (id=1052): Verify that registerUser is not invoked when client-side validation fails. Ensure no credential data is logged or persisted client-side during the validation or submission flow (FR-008).

- [ ] **T013** Modify `LoginForm_fragment_1` through `LoginForm_fragment_6` (ids 3074–3069): Review each fragment's JSX sub-tree to ensure responsive layout classes, accessible label associations, and error-message containers (aria-live/role='alert') are correctly propagated. _Note: No intra-object structural facts were returned for LoginForm_fragment_2 through _6 — internal logic of those fragments is unverified._

- [ ] **T014** Modify `LoginTemplate_fragment_1` (id=3110, sole direct caller of LoginForm): Regression-test the composition of LoginTemplate_fragment_1 with the updated LoginForm to confirm the entry-point rendering remains intact after all structural changes. _Note: This is the only confirmed upstream caller per CAST Level 1 and Level 2+ data._

---

### Verification Tasks

- [ ] **T015** [Verify US-001-ac-1] Given a user navigates to the login page, When the page loads on a desktop screen, Then the login form is displayed with an email/mobile field and a password field. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-1)_

- [ ] **T016** [Verify US-001-ac-2] Given a user navigates to the login page, When the page loads on a mobile or small screen, Then the login form is fully responsive and all fields and controls are usable without horizontal scrolling. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-2)_

- [ ] **T017** [Verify US-001-ac-3] Given a user leaves the email/mobile field empty and submits the form, When the form submission is triggered, Then a validation error is shown on the email/mobile field and no credential lookup is attempted. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-3)_

- [ ] **T018** [Verify US-001-ac-4] Given a user leaves the password field empty and submits the form, When the form submission is triggered, Then a validation error is shown on the password field and no credential lookup is attempted. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-4)_

- [ ] **T019** [Verify US-001-ac-5] Given a user leaves both fields empty and submits the form, When the form submission is triggered, Then validation errors are shown on both fields and no credential lookup is attempted. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-5)_

- [ ] **T020** [Verify US-001-ac-6] Given a user has entered values in both fields, When the form is submitted, Then client-side validation passes and the form proceeds to credential submission. _(test type: characterization, required before: release, environment: ci, obligation id: e998d7fe-f29f-55db-92c5-f532fe59d9d9:test:characterization:US-001-ac-6)_

- [ ] **T021** [Verify IMPACT] Unit tests: LoginForm renders email/mobile field and password field on mount.

- [ ] **T022** [Verify IMPACT] Unit tests: Submitting with empty email/mobile field triggers validation error and does not invoke credential submission handler.

- [ ] **T023** [Verify IMPACT] Unit tests: Submitting with empty password field triggers validation error and does not invoke credential submission handler.

- [ ] **T024** [Verify IMPACT] Unit tests: Submitting with both fields empty triggers both validation errors and does not invoke credential submission handler.

- [ ] **T025** [Verify IMPACT] Unit tests: Submitting with both fields populated passes client-side validation and invokes credential submission handler.

- [ ] **T026** [Verify IMPACT] Responsive/visual tests: LoginForm renders without horizontal scroll at 320px viewport width.

- [ ] **T027** [Verify IMPACT] Integration tests: LoginTemplate_fragment_1 (3110) correctly composes and renders LoginForm (2580) — the sole direct caller must be regression-tested after any structural change to LoginForm.

- [ ] **T028** [Verify IMPACT] Regression tests: All 47 CAST-measured transactions passing through LoginForm must remain functional after the enhancement.

---

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `1`
- **Accepted impact analysis**: `sha256:85b764148634fb2310b3edb1c8ee4a9dc7554e36104e5e3459c72b33b55ce06a`
- **Repository baseline commit**: `485ef80ff27986bcf1f8331f80aa819e58bc3728`
- **Deterministic grounding reference**: `6acbb7759a945845`

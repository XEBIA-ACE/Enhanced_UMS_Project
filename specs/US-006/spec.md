# Feature Specification: US-006

## Story
**Title**: Registration Rate Limiting by IP Address

**Story ID**: US-006

**Description**: As a Security Administrator, I want registration attempts to be rate limited by IP address, so that automated abuse and brute-force attacks are prevented.

## Acceptance Criteria

- **US-006-ac-1**: Given an IP address has made fewer than 5 registration attempts in 15 minutes, When another attempt is made, Then the registration attempt is allowed to proceed

- **US-006-ac-2**: Given an IP address has made exactly 5 registration attempts within 15 minutes, When a 6th attempt is made, Then the attempt is blocked

- **US-006-ac-3**: Given a user is rate limited, When they attempt to register, Then an error message clearly indicates the temporary block status

- **US-006-ac-4**: Given 15 minutes have passed since the first attempt in a window, When the user attempts registration again, Then the rate limit counter resets and the attempt is allowed

## Functional Requirements

- **FR-001**: The system shall track registration attempts per IP address within a 15-minute sliding window.

- **FR-002**: The system shall allow registration attempts when the count for an IP address is fewer than 5 within the 15-minute window.

- **FR-003**: The system shall block registration attempts when an IP address has made 5 or more attempts within the 15-minute window.

- **FR-004**: The system shall return an error response that clearly indicates the rate-limit block status and temporary nature of the restriction when an attempt is blocked.

- **FR-005**: The system shall reset the rate-limit counter for an IP address after 15 minutes have elapsed since the first attempt in the current window, allowing subsequent attempts to proceed.

## Security Obligations

- Rate-limit enforcement must block the 6th and subsequent registration attempts within a 15-minute window per IP address.

- Error responses must clearly indicate rate-limit status to prevent user confusion.

- Rate-limit counters must be isolated per IP address to prevent cross-IP interference.

- The 15-minute window must reset after the first attempt in a new window.

## Provenance

- **Policy version**: `ace-spec-format/v1`
- **Accepted impact analysis revision**: `2`
- **Accepted impact analysis hash**: `sha256:c9c68abec5eef897dcd41e2fd59b6a6bfaa753854f8de2b2773b7b1a2b23e23c`
- **Repository baseline commit**: `32669486ed6e14b4bf7967c6c5023f0a5296da6c`
- **Deterministic grounding reference**: `f875a52838761d9d`
- **Generation mode**: `enhancement`
- **Requirement source**: `ace_context`

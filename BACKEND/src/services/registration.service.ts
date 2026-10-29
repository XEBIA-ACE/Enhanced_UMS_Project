/**
 * registration.service.ts
 *
 * User registration service — inserts the new `users` row. Account
 * activation is now handled by the OTP feature (see `OtpService.sendOtp`,
 * invoked by `RegistrationController` after this resolves) rather than the
 * email-link flow this service previously wrote `activation_tokens` /
 * `registration_email_records` rows for.
 *
 * Requirements: US-073 FR-001–004, FR-006–007, FR-010
 *
 * Security notes:
 *   - `dto.password` (plaintext) is hashed via bcrypt and then NEVER stored,
 *     logged, or returned. Only `passwordHash` is persisted.
 *   - bcrypt cost factor is read from `appConfig.bcryptCostFactor`, which is
 *     guaranteed ≥ 12 by the config loader.
 */

import bcrypt from 'bcrypt';
import type { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../db/with-transaction';
import { RegistrationRequestDto, UserCreatedResult } from '../types/registration.types';
import { EmailConflictError, UsernameConflictError } from '../errors/registration.errors';
import { appConfig } from '../config/app.config';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface RegistrationService {
  register(dto: RegistrationRequestDto): Promise<UserCreatedResult>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class DefaultRegistrationService implements RegistrationService {
  constructor(private readonly db: Database) {}

  /**
   * Creates a new user in `pending` status. Account activation (OTP send)
   * is triggered by the caller (`RegistrationController`) once this resolves.
   *
   * @param dto - Validated registration payload (validation is the caller's
   *              responsibility — see RegistrationController).
   * @returns    `UserCreatedResult` containing the new user's UUID and a
   *             human-readable confirmation message.
   * @throws     Re-throws any SQLite / bcrypt errors after the transaction
   *             auto-rolls-back.
   */
  async register(dto: RegistrationRequestDto): Promise<UserCreatedResult> {
    // -----------------------------------------------------------------------
    // 1. Hash password — plaintext is done with after this line
    // -----------------------------------------------------------------------
    const passwordHash = await bcrypt.hash(dto.password, appConfig.bcryptCostFactor);

    // -----------------------------------------------------------------------
    // 2. Normalise username (case-insensitive, leading/trailing whitespace removed)
    // -----------------------------------------------------------------------
    const usernameNormalised = dto.username.trim().toLowerCase();
    const now = new Date();
    const userId = uuidv4();

    try {
      await withTransaction(this.db, () => {
        this.db
          .prepare(
            `INSERT INTO users (id, username, username_normalised, email, password_hash, status, registration_timestamp, activated_at)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)`,
          )
          .run(userId, dto.username, usernameNormalised, dto.emailAddress, passwordHash, now.toISOString());

        // Same transaction as the user row: a committed user always has a
        // durable record that OTP initiation is owed (US-017 FR-004).
        this.db
          .prepare(
            `INSERT INTO otp_dispatch_outbox (id, user_id, status, attempts, created_at, updated_at)
             VALUES (?, ?, 'pending', 0, ?, ?)`,
          )
          .run(uuidv4(), userId, now.toISOString(), now.toISOString());
      });

      return {
        userId,
        message: 'Registration successful. Please check your email for the verification code to activate your account.',
      };
    } catch (err) {
      if (isEmailConflictError(err)) {
        throw new EmailConflictError();
      }

      if (isUsernameConflictError(err)) {
        throw new UsernameConflictError(usernameNormalised);
      }

      throw err;
    }
  }
}

/** Race-safe backstop: the `uidx_users_email` UNIQUE index rejected the insert. */
function isEmailConflictError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' &&
    'message' in err &&
    (err as { message: string }).message.includes('users.email')
  );
}

function isUsernameConflictError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' &&
    'message' in err &&
    (err as { message: string }).message.includes('users.username_normalised')
  );
}

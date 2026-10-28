/**
 * email-uniqueness.validator.ts
 *
 * Checks that a proposed email address is not already registered (US-014).
 * The comparison is case-insensitive and spans every account status.
 * Atomicity against concurrent registrations is delegated to the
 * `uidx_users_email` UNIQUE index (see RegistrationService).
 */

import { IUserRepository } from '../repositories/user.repository';
import { EmailConflictError, ValidationError } from '../errors/registration.errors';

export interface EmailUniquenessValidator {
  /**
   * Resolves when the email is available.
   * Rejects with ValidationError when blank, EmailConflictError when taken.
   */
  checkUniqueness(email: string): Promise<void>;
}

export class DefaultEmailUniquenessValidator implements EmailUniquenessValidator {
  constructor(private readonly userRepository: IUserRepository) {}

  async checkUniqueness(email: string): Promise<void> {
    if (email == null || email.trim() === '') {
      throw new ValidationError('An email address is required.', 'EMAIL_REQUIRED');
    }

    const existing = await this.userRepository.findByEmailCaseInsensitive(email.trim());
    if (existing !== null) {
      throw new EmailConflictError();
    }
  }
}

/**
 * otp.errors.ts
 *
 * Custom domain error classes for the OTP Delivery via SMS Feature (F-02).
 * All errors extend the built-in Error class so they are instanceof-compatible
 * with standard JS error handling.
 */

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export class OtpRateLimitExceededError extends Error {
  public readonly userId: string;
  public readonly retryAfterSeconds?: number;

  constructor(userId: string, retryAfterSeconds?: number) {
    super(`OTP rate limit exceeded for user '${userId}'.`);
    this.name = 'OtpRateLimitExceededError';
    this.userId = userId;
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, OtpRateLimitExceededError.prototype);
  }
}

/**
 * Raised when a client IP address has used up its registration attempt
 * quota for the current window (US-006). The message states that the block
 * is temporary and when it lifts.
 */
export class IpRateLimitExceededError extends OtpRateLimitExceededError {
  public readonly ipAddress: string;

  constructor(ipAddress: string, retryAfterSeconds: number) {
    super(ipAddress, retryAfterSeconds);
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    this.message =
      `Too many registration attempts from your IP address. You are temporarily blocked; ` +
      `this restriction is temporary — please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    this.name = 'IpRateLimitExceededError';
    this.ipAddress = ipAddress;
    Object.setPrototypeOf(this, IpRateLimitExceededError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Account state
// ---------------------------------------------------------------------------

export class OtpForbiddenError extends Error {
  public readonly userId: string;
  public readonly accountStatus: string;

  constructor(userId: string, accountStatus: string) {
    super(`OTP dispatch is forbidden for user '${userId}' with account status '${accountStatus}'.`);
    this.name = 'OtpForbiddenError';
    this.userId = userId;
    this.accountStatus = accountStatus;
    Object.setPrototypeOf(this, OtpForbiddenError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Dispatch failures
// ---------------------------------------------------------------------------

export class OtpDispatchFailedError extends Error {
  public readonly userId: string;

  constructor(userId: string, reason?: string) {
    super(`Failed to dispatch OTP for user '${userId}'${reason ? `: ${reason}` : ''}.`);
    this.name = 'OtpDispatchFailedError';
    this.userId = userId;
    Object.setPrototypeOf(this, OtpDispatchFailedError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Verification flow
// ---------------------------------------------------------------------------

export class OtpNotFoundError extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`No active OTP request was found for user '${userId}'.`);
    this.name = 'OtpNotFoundError';
    this.userId = userId;
    Object.setPrototypeOf(this, OtpNotFoundError.prototype);
  }
}

export class OtpExpiredError extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`The OTP for user '${userId}' has expired.`);
    this.name = 'OtpExpiredError';
    this.userId = userId;
    Object.setPrototypeOf(this, OtpExpiredError.prototype);
  }
}

export class OtpInvalidError extends Error {
  public readonly userId: string;

  constructor(userId: string) {
    super(`The submitted OTP is incorrect for user '${userId}'.`);
    this.name = 'OtpInvalidError';
    this.userId = userId;
    Object.setPrototypeOf(this, OtpInvalidError.prototype);
  }
}

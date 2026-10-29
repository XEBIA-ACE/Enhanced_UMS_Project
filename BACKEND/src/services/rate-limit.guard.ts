/**
 * rate-limit.guard.ts
 *
 * Redis-backed rolling-window rate limit guard for OTP send/resend requests.
 * Uses key pattern `otp:rl:{user_id}` with a TTL equal to the configured
 * rate-limit window, so the counter resets automatically once the window
 * elapses.
 *
 * Requirements: US-002 FR-008
 */

import { Redis } from 'ioredis';
import { otpConfig } from '../config/otp.config';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface RateLimitGuard {
  allow(userId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export interface IpRateLimitDecision {
  allowed: boolean;
  /** Seconds until the current window resets (meaningful when blocked). */
  retryAfterSeconds: number;
}

export interface IpRateLimitGuard {
  allow(ipAddress: string): Promise<IpRateLimitDecision>;
}

/**
 * Per-IP counter, key `{scope}:rl:ip:{ip}`. The TTL is set on the first
 * attempt only, so the window runs from the first attempt (US-006 FR-005);
 * blocked attempts still count but never extend the window.
 */
export class RedisIpRateLimitGuard implements IpRateLimitGuard {
  constructor(
    private readonly redis: Redis,
    private readonly scope: string,
    private readonly maxAttemptsPerWindow: number = 5,
    private readonly windowMinutes: number = 15,
  ) {}

  async allow(ipAddress: string): Promise<IpRateLimitDecision> {
    const key = `${this.scope}:rl:ip:${ipAddress}`;
    const windowSeconds = this.windowMinutes * 60;

    const attemptCount = await this.redis.incr(key);
    let ttl = windowSeconds;
    if (attemptCount === 1) {
      await this.redis.expire(key, windowSeconds);
    } else {
      ttl = await this.redis.ttl(key);
      if (ttl < 0) {
        // Key lost its TTL (e.g. crash between INCR and EXPIRE): heal it.
        await this.redis.expire(key, windowSeconds);
        ttl = windowSeconds;
      }
    }

    return { allowed: attemptCount <= this.maxAttemptsPerWindow, retryAfterSeconds: ttl };
  }
}

export class RedisRateLimitGuard implements RateLimitGuard {
  constructor(
    private readonly redis: Redis,
    private readonly maxAttemptsPerWindow: number = otpConfig.otpMaxAttemptsPerWindow,
    private readonly windowMinutes: number = otpConfig.otpRateLimitWindowMinutes,
  ) {}

  /**
   * Increment the rolling counter for a user and report whether this attempt
   * is within the allowed window quota.
   *
   * The first increment in a window sets the key's TTL; subsequent increments
   * within the window leave the TTL untouched so the window keeps rolling
   * from the first attempt, not each subsequent one.
   */
  async allow(userId: string): Promise<boolean> {
    const key = `otp:rl:${userId}`;
    const windowSeconds = this.windowMinutes * 60;

    const attemptCount = await this.redis.incr(key);

    if (attemptCount === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return attemptCount <= this.maxAttemptsPerWindow;
  }
}

/**
 * ip-rate-limit.middleware.ts
 *
 * Express middleware enforcing a per-client-IP attempt limit (US-006).
 * Blocked requests get 429 OTP_RATE_LIMIT_EXCEEDED with a Retry-After header
 * and a message stating the block is temporary.
 *
 * The client IP is `req.ip`, so proxy handling follows Express's
 * `trust proxy` setting; X-Forwarded-For is never parsed here, which stops
 * clients from spoofing their way out of the limit.
 *
 * Fails open if the counter store is unavailable (availability over strictness).
 *
 * Requirements: US-006 FR-001–FR-005
 */

import { NextFunction, Request, Response } from 'express';
import { IpRateLimitGuard } from '../services/rate-limit.guard';
import { IpRateLimitExceededError } from '../errors/otp.errors';

export function createIpRateLimitMiddleware(guard: IpRateLimitGuard) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ipAddress = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

    try {
      const decision = await guard.allow(ipAddress);
      if (!decision.allowed) {
        const err = new IpRateLimitExceededError(ipAddress, decision.retryAfterSeconds);
        res.setHeader('Retry-After', String(decision.retryAfterSeconds));
        res.status(429).json({
          errorCode: 'OTP_RATE_LIMIT_EXCEEDED',
          message: err.message,
          retryAfterSeconds: decision.retryAfterSeconds,
        });
        return;
      }
    } catch (err) {
      console.error('[ipRateLimit] Counter store unavailable, allowing request:', err);
    }

    next();
  };
}

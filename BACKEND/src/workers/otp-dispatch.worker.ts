/**
 * otp-dispatch.worker.ts
 *
 * Retries owed OTP initiation (US-017). Each tick:
 *   1. reconciliation sweep — enqueue 'pending' users with zero otp_requests rows;
 *   2. drain `otp_dispatch_outbox` by calling OtpService.sendOtp per row.
 *
 * sendOtp resolving (even with status 'failed') means an otp_requests row exists
 * and the user can use the resend flow, so the row is marked done. Thrown errors
 * are retried up to maxAttempts; OtpForbiddenError (account no longer
 * pending/active) is terminal.
 */

import { OtpService } from '../services/otp.service';
import { IOtpDispatchOutboxRepository } from '../repositories/otp-dispatch-outbox.repository';
import { OtpForbiddenError } from '../errors/otp.errors';

export class OtpDispatchWorker {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly outbox: IOtpDispatchOutboxRepository,
    private readonly otpService: OtpService,
    private readonly maxAttempts = 10,
    private readonly batchSize = 50,
  ) {}

  start(intervalMs = 30_000): void {
    if (this.intervalHandle !== null) return;
    this.intervalHandle = setInterval(() => {
      void this.processOutbox();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async processOutbox(): Promise<void> {
    try {
      const enqueued = this.outbox.enqueueOrphanedPendingUsers();
      if (enqueued > 0) {
        console.warn(`OTP reconciliation sweep enqueued ${enqueued} orphaned pending user(s).`);
      }

      for (const record of this.outbox.findPending(this.batchSize)) {
        try {
          await this.otpService.sendOtp(record.userId);
          this.outbox.markDone(record.userId);
        } catch (err) {
          if (err instanceof OtpForbiddenError) {
            this.outbox.markDone(record.userId);
            continue;
          }
          this.outbox.recordFailure(
            record.userId,
            err instanceof Error ? err.message : String(err),
            this.maxAttempts,
          );
        }
      }
    } catch (err) {
      console.error('OTP dispatch worker tick failed:', err);
    }
  }
}

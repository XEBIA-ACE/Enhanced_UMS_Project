/**
 * otp-dispatch-outbox.repository.ts
 *
 * Repository for the `otp_dispatch_outbox` table (US-017). A row records that
 * OTP initiation is owed for a freshly registered user, and survives an
 * issueOtp failure so a worker can retry it. Parameterised queries only.
 */

import type { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface OtpDispatchOutboxRecord {
  id: string;
  userId: string;
  attempts: number;
}

export interface IOtpDispatchOutboxRepository {
  findPending(limit: number): OtpDispatchOutboxRecord[];
  markDone(userId: string): void;
  recordFailure(userId: string, error: string, maxAttempts: number): void;
  /** Re-queue 'pending' users with no otp_requests row and no open outbox row. Returns count. */
  enqueueOrphanedPendingUsers(): number;
}

export class OtpDispatchOutboxRepository implements IOtpDispatchOutboxRepository {
  constructor(private readonly db: Database) {}

  findPending(limit: number): OtpDispatchOutboxRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, attempts FROM otp_dispatch_outbox
         WHERE status = 'pending' ORDER BY created_at LIMIT ?`,
      )
      .all(limit) as Array<{ id: string; user_id: string; attempts: number }>;
    return rows.map((r) => ({ id: r.id, userId: r.user_id, attempts: r.attempts }));
  }

  markDone(userId: string): void {
    this.db
      .prepare(`UPDATE otp_dispatch_outbox SET status = 'done', updated_at = ? WHERE user_id = ?`)
      .run(new Date().toISOString(), userId);
  }

  recordFailure(userId: string, error: string, maxAttempts: number): void {
    this.db
      .prepare(
        `UPDATE otp_dispatch_outbox
         SET attempts = attempts + 1,
             last_error = ?,
             status = CASE WHEN attempts + 1 >= ? THEN 'failed' ELSE 'pending' END,
             updated_at = ?
         WHERE user_id = ?`,
      )
      .run(error, maxAttempts, new Date().toISOString(), userId);
  }

  enqueueOrphanedPendingUsers(): number {
    const orphans = this.db
      .prepare(
        `SELECT u.id FROM users u
         WHERE u.status = 'pending'
           AND NOT EXISTS (SELECT 1 FROM otp_requests o WHERE o.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM otp_dispatch_outbox b WHERE b.user_id = u.id AND b.status = 'pending')`,
      )
      .all() as Array<{ id: string }>;

    const now = new Date().toISOString();
    const upsert = this.db.prepare(
      `INSERT INTO otp_dispatch_outbox (id, user_id, status, attempts, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET status = 'pending', attempts = 0, updated_at = excluded.updated_at`,
    );
    this.db.transaction(() => {
      for (const o of orphans) upsert.run(uuidv4(), o.id, now, now);
    })();
    return orphans.length;
  }
}

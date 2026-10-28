/**
 * admin-account.repository.ts
 *
 * Repository for the `admin_accounts` table.  All queries use parameterised
 * `?` placeholders — no string interpolation.
 *
 * Requirements: US-012 FR-001 (US-012-ac-1)
 */

import type { Database } from 'better-sqlite3';

export interface IAdminAccountRepository {
  /** True only if the user has a non-revoked admin_accounts row. */
  isActiveAdmin(userId: string): Promise<boolean>;
}

export class AdminAccountRepository implements IAdminAccountRepository {
  constructor(private readonly db: Database) {}

  async isActiveAdmin(userId: string): Promise<boolean> {
    const row = this.db
      .prepare('SELECT 1 FROM admin_accounts WHERE user_id = ? AND revoked_at IS NULL')
      .get(userId);
    return row !== undefined;
  }
}

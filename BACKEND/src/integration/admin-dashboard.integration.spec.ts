process.env.ADMIN_BEARER_TOKEN = 'test-admin-token';
process.env.SENDGRID_API_KEY = 'SG.test-key';
process.env.SENDGRID_TEMPLATE_ID = 'd-test-template';
process.env.ACTIVATION_BASE_URL = 'https://example.test';
process.env.FROM_EMAIL = 'no-reply@example.test';
process.env.PASSWORD_RECOVERY_BASE_URL = 'https://example.test';
process.env.PASSWORD_RECOVERY_EMAIL_TEMPLATE_ID = 'd-test-recovery-template';

/**
 * US-012 — Administrator Role Validation for Dashboard Access.
 * Exercises GET /api/v1/admin/dashboard end to end (createAdminRouter ->
 * SessionValidationMiddleware -> AdminController.validateAdminRole ->
 * AdminAccountRepository -> admin_accounts) against the real migration
 * schema. Each test name carries the acceptance-criterion id it verifies.
 */

import request from 'supertest';
import express from 'express';
import type { Database } from 'better-sqlite3';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { DefaultSessionService } from '../services/session.service';
import { createAdminRouter } from '../routes/admin.routes';
import { ADMIN_UNAUTHORIZED_MESSAGE } from '../controllers/admin.controller';
import { createTestDb, clearAllTables, closeTestDb, TestDb } from './test-db';

const DASHBOARD = '/api/v1/admin/dashboard';

let testDb: TestDb;
let db: Database;
let sessionService: DefaultSessionService;
let app: express.Express;

function insertUser(id: string): string {
  db.prepare(
    `INSERT INTO users (id, username, username_normalised, email, password_hash, status, registration_timestamp)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
  ).run(id, `user ${id}`, `user ${id}`, `${id}@example.test`, 'SECRET-HASH-VALUE', '2026-01-01T00:00:00.000Z');
  return id;
}

function grantAdmin(userId: string, revokedAt: string | null = null): void {
  db.prepare('INSERT INTO admin_accounts (user_id, granted_at, revoked_at) VALUES (?, ?, ?)').run(
    userId,
    '2026-01-01T00:00:00.000Z',
    revokedAt,
  );
}

async function loginAs(userId: string): Promise<string> {
  const { rawToken } = await sessionService.createSession(userId);
  return rawToken;
}

beforeAll(() => {
  testDb = createTestDb();
  db = testDb.db;
  sessionService = new DefaultSessionService(new SessionRepository(db), new UserRepository(db));
  app = express();
  app.use(express.json());
  app.use('/api/v1/admin', createAdminRouter(db, sessionService));
});

afterEach(() => clearAllTables(db));
afterAll(() => closeTestDb(testDb));

describe('Integration | US-012 admin dashboard role validation', () => {
  test('[US-012-ac-1] role is validated against the SQLite admin_accounts table after authentication', async () => {
    const userId = insertUser('u1');
    const token = await loginAs(userId);

    await request(app).get(DASHBOARD).set('Authorization', `Bearer ${token}`).expect(403);

    grantAdmin(userId);
    await request(app).get(DASHBOARD).set('Authorization', `Bearer ${token}`).expect(200);

    db.prepare('UPDATE admin_accounts SET revoked_at = ? WHERE user_id = ?').run('2026-02-01T00:00:00.000Z', userId);
    await request(app).get(DASHBOARD).set('Authorization', `Bearer ${token}`).expect(403);
  });

  test('[US-012-ac-2] authenticated admin is granted access to the Admin Dashboard', async () => {
    const adminId = insertUser('admin-1');
    grantAdmin(adminId);
    const token = await loginAs(adminId);

    const res = await request(app).get(DASHBOARD).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body).toEqual({ access: 'granted', admin_user_id: adminId });
  });

  test('[US-012-ac-3] authenticated non-admin is denied with an explicit unauthorized message', async () => {
    const token = await loginAs(insertUser('u1'));

    const res = await request(app).get(DASHBOARD).set('Authorization', `Bearer ${token}`).expect(403);

    expect(res.body).toEqual({ error_code: 'ADMIN_ROLE_REQUIRED', message: ADMIN_UNAUTHORIZED_MESSAGE });
  });

  test('[US-012-ac-4] denied callers receive no administrative data or functionality', async () => {
    const adminId = insertUser('admin-1');
    grantAdmin(adminId);
    const nonAdminToken = await loginAs(insertUser('u1'));

    const denied = await request(app).get(DASHBOARD).set('Authorization', `Bearer ${nonAdminToken}`).expect(403);
    expect(Object.keys(denied.body).sort()).toEqual(['error_code', 'message']);
    const body = JSON.stringify(denied.body);
    expect(body).not.toContain('granted');
    expect(body).not.toContain(adminId);
    expect(body).not.toContain('SECRET-HASH-VALUE');

    await request(app).get(DASHBOARD).expect(401);
    await request(app).get(DASHBOARD).set('Authorization', 'Bearer not-a-real-token').expect(401);
  });

  test('[US-012-ac-4] session token alone does not unlock the static-token admin route', async () => {
    const adminId = insertUser('admin-1');
    grantAdmin(adminId);
    const token = await loginAs(adminId);

    await request(app)
      .post(`/api/v1/admin/users/${adminId}/resend-confirmation`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

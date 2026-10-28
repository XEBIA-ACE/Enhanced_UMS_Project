/**
 * US-001 — View Profile Page with Personal Information.
 * Exercises GET /api/v1/users/me end to end (router -> session middleware ->
 * controller -> service -> repositories) against the real migration schema.
 * Each test name carries the acceptance-criterion id it verifies.
 */

import request from 'supertest';
import express from 'express';
import type { Database } from 'better-sqlite3';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { DefaultSessionService } from '../services/session.service';
import { createUserProfileRouter } from '../routes/user-profile.routes';
import { createTestDb, clearAllTables, closeTestDb, TestDb } from './test-db';

let testDb: TestDb;
let db: Database;
let sessionService: DefaultSessionService;
let app: express.Express;

const REGISTERED_AT = '2026-01-01T00:00:00.000Z';

function insertUser(id: string, email: string, status: string = 'active'): string {
  db.prepare(
    `INSERT INTO users (id, username, username_normalised, email, password_hash, status, registration_timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, 'Jane Doe', `jane doe ${id}`, email, 'SECRET-HASH-VALUE', status, REGISTERED_AT);
  return id;
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
  app.use('/api/v1/users', createUserProfileRouter(db, sessionService));
});

afterEach(() => clearAllTables(db));
afterAll(() => closeTestDb(testDb));

describe('Integration | US-001 profile page data', () => {
  test("[US-001-ac-1] displays the authenticated user's Name", async () => {
    const token = await loginAs(insertUser('u1', 'u1@example.test'));
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.username).toBe('Jane Doe');
  });

  test("[US-001-ac-2] displays the authenticated user's Email Address", async () => {
    const token = await loginAs(insertUser('u1', 'u1@example.test'));
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.email).toBe('u1@example.test');
  });

  test("[US-001-ac-3] displays the authenticated user's Registration Date", async () => {
    const token = await loginAs(insertUser('u1', 'u1@example.test'));
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.registrationTimestamp).toBe(REGISTERED_AT);
  });

  test("[US-001-ac-4] displays the authenticated user's Account Status", async () => {
    const token = await loginAs(insertUser('u1', 'u1@example.test', 'active'));
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.status).toBe('active');
  });

  test('[US-001-ac-5] profile loads within 1 second', async () => {
    const token = await loginAs(insertUser('u1', 'u1@example.test'));
    const start = Date.now();
    await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test('[US-001-ac-6] PII is protected: requires a valid session and never leaks credentials or other users', async () => {
    insertUser('other', 'other@example.test');
    const token = await loginAs(insertUser('u1', 'u1@example.test'));

    await request(app).get('/api/v1/users/me').expect(401);
    await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer not-a-real-token').expect(401);

    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('SECRET-HASH-VALUE');
    expect(body).not.toContain('password');
    expect(body).not.toContain('other@example.test');
    expect(res.body.email).toBe('u1@example.test');
  });
});

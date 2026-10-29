/**
 * US-017 — OTP initiation on successful registration (controller + worker).
 * Test names carry the acceptance-criterion id they cover.
 */

import type { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { RegistrationController } from './registration.controller';
import { DefaultRegistrationValidator } from '../validators/registration.validator';
import { DefaultEmailValidator } from '../validators/email.validator';
import { DefaultPasswordPolicyEvaluator } from '../validators/password-policy.evaluator';
import { OtpDispatchOutboxRepository } from '../repositories/otp-dispatch-outbox.repository';
import { OtpDispatchWorker } from '../workers/otp-dispatch.worker';
import { OtpForbiddenError, OtpRateLimitExceededError } from '../errors/otp.errors';

const MESSAGE =
  'Registration successful. Please check your email for the verification code to activate your account.';

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE otp_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE otp_dispatch_outbox (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  return db;
}

function seedOwedUser(db: Database.Database, id: string, withOutbox = true) {
  db.prepare(`INSERT INTO users (id, status) VALUES (?, 'pending')`).run(id);
  if (withOutbox) {
    db.prepare(
      `INSERT INTO otp_dispatch_outbox (id, user_id, created_at, updated_at) VALUES (?, ?, 'now', 'now')`,
    ).run(`ob-${id}`, id);
  }
}

function makeController(sendOtp: jest.Mock, outbox?: OtpDispatchOutboxRepository) {
  const registrationService = { register: jest.fn(async () => ({ userId: 'u1', message: MESSAGE })) };
  const controller = new RegistrationController(
    new DefaultRegistrationValidator(),
    new DefaultEmailValidator(),
    new DefaultPasswordPolicyEvaluator(),
    { checkUniqueness: jest.fn(async () => undefined) },
    { checkUniqueness: jest.fn(async () => undefined) } as any,
    registrationService as any,
    { sendOtp } as any,
    outbox,
  );
  return { controller, registrationService };
}

async function register(controller: RegistrationController) {
  const req = {
    body: {
      username: 'jane',
      emailAddress: 'jane@example.test',
      password: 'Passw0rd!',
      passwordConfirmation: 'Passw0rd!',
    },
  } as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  await controller.registerUser(req, res as unknown as Response);
  return res;
}

describe('US-017 OTP initiation on registration', () => {
  test('[US-017-AC1] successful registration automatically invokes sendOtp for the new user before responding 201', async () => {
    const sendOtp = jest.fn(async () => ({ accepted: true, status: 'delivered' }));
    const { controller } = makeController(sendOtp);

    const res = await register(controller);

    expect(sendOtp).toHaveBeenCalledWith('u1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('[US-017-AC2] 201 response tells the user to check their email for the verification code', async () => {
    const { controller } = makeController(jest.fn(async () => ({ accepted: true, status: 'delivered' })));

    const res = await register(controller);

    expect(res.json).toHaveBeenCalledWith({ userId: 'u1', message: MESSAGE });
  });

  test.each([
    ['OtpForbiddenError', new OtpForbiddenError('u1', 'suspended')],
    ['OtpRateLimitExceededError', new OtpRateLimitExceededError('u1')],
    ['database error', new Error('SQLITE_BUSY')],
  ])('[US-017-AC3] issueOtp %s still yields 201 and leaves the outbox row pending for retry', async (_n, failure) => {
    const db = makeDb();
    seedOwedUser(db, 'u1');
    const outbox = new OtpDispatchOutboxRepository(db);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { controller } = makeController(jest.fn().mockRejectedValue(failure), outbox);

    const res = await register(controller);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(outbox.findPending(10).map((r) => r.userId)).toEqual(['u1']);
  });

  test('[US-017-AC3] outbox row is cleared when initial initiation succeeds', async () => {
    const db = makeDb();
    seedOwedUser(db, 'u1');
    const outbox = new OtpDispatchOutboxRepository(db);
    const { controller } = makeController(jest.fn(async () => ({ accepted: true, status: 'delivered' })), outbox);

    await register(controller);

    expect(outbox.findPending(10)).toEqual([]);
  });

  test('[US-017-AC3] worker retries a stranded user until sendOtp succeeds', async () => {
    const db = makeDb();
    seedOwedUser(db, 'u1');
    const outbox = new OtpDispatchOutboxRepository(db);
    const sendOtp = jest
      .fn()
      .mockRejectedValueOnce(new OtpRateLimitExceededError('u1'))
      .mockResolvedValueOnce({ accepted: true, status: 'delivered' });
    const worker = new OtpDispatchWorker(outbox, { sendOtp } as any);

    await worker.processOutbox();
    expect(outbox.findPending(10)).toHaveLength(1);
    await worker.processOutbox();

    expect(sendOtp).toHaveBeenCalledTimes(2);
    expect(outbox.findPending(10)).toEqual([]);
  });

  test('[US-017-AC3] worker gives up after maxAttempts and stops retrying', async () => {
    const db = makeDb();
    seedOwedUser(db, 'u1');
    const outbox = new OtpDispatchOutboxRepository(db);
    const sendOtp = jest.fn().mockRejectedValue(new Error('down'));
    const worker = new OtpDispatchWorker(outbox, { sendOtp } as any, 2);

    await worker.processOutbox();
    await worker.processOutbox();
    await worker.processOutbox();

    expect(sendOtp).toHaveBeenCalledTimes(2);
  });

  test('[US-017-AC3] reconciliation sweep recovers a pending user with no otp_requests row and no outbox row', async () => {
    const db = makeDb();
    seedOwedUser(db, 'orphan', false);
    seedOwedUser(db, 'has-otp', false);
    db.prepare(`INSERT INTO otp_requests (id, user_id) VALUES ('r1', 'has-otp')`).run();
    const sendOtp = jest.fn(async () => ({ accepted: true, status: 'delivered' }));
    const worker = new OtpDispatchWorker(new OtpDispatchOutboxRepository(db), { sendOtp } as any);

    await worker.processOutbox();

    expect(sendOtp).toHaveBeenCalledTimes(1);
    expect(sendOtp).toHaveBeenCalledWith('orphan');
  });
});

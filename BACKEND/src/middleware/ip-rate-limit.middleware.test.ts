process.env.OTP_HASH_SECRET = 'test-otp-secret';
process.env.OTP_EMAIL_TEMPLATE_ID = 'd-test-otp-template';

import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { RedisIpRateLimitGuard } from '../services/rate-limit.guard';
import { createIpRateLimitMiddleware } from './ip-rate-limit.middleware';

/**
 * In-memory stand-in for the INCR / EXPIRE / TTL subset of ioredis, driven by
 * a controllable clock so the 15-minute window is deterministic.
 */
class FakeRedis {
  now = 0;
  private readonly counts = new Map<string, { value: number; expiresAt: number | null }>();

  private live(key: string) {
    const entry = this.counts.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= this.now) {
      this.counts.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string): Promise<number> {
    const entry = this.live(key) ?? { value: 0, expiresAt: null };
    entry.value += 1;
    this.counts.set(key, entry);
    return entry.value;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    entry.expiresAt = this.now + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.live(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.ceil((entry.expiresAt - this.now) / 1000);
  }
}

const WINDOW_MS = 15 * 60 * 1000;

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
  };
  return res;
}

/** Returns true when the request was allowed through, false when blocked. */
async function attempt(
  middleware: ReturnType<typeof createIpRateLimitMiddleware>,
  ip: string,
): Promise<{ allowed: boolean; res: ReturnType<typeof mockRes> }> {
  const res = mockRes();
  const next = jest.fn();
  await middleware({ ip } as Request, res as unknown as Response, next);
  return { allowed: next.mock.calls.length === 1, res };
}

describe('IP rate limiting for registration (US-006)', () => {
  let redis: FakeRedis;
  let middleware: ReturnType<typeof createIpRateLimitMiddleware>;

  beforeEach(() => {
    redis = new FakeRedis();
    middleware = createIpRateLimitMiddleware(
      new RedisIpRateLimitGuard(redis as unknown as Redis, 'otp-send', 5, 15),
    );
  });

  test('[US-006-AC1] allows attempts while the IP has made fewer than 5 in the window', async () => {
    for (let i = 0; i < 5; i++) {
      const { allowed, res } = await attempt(middleware, '203.0.113.1');
      expect(allowed).toBe(true);
      expect(res.statusCode).toBe(200);
    }
  });

  test('[US-006-AC2] blocks the 6th attempt from the same IP within 15 minutes', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt(middleware, '203.0.113.1');
    }

    const { allowed, res } = await attempt(middleware, '203.0.113.1');

    expect(allowed).toBe(false);
    expect(res.statusCode).toBe(429);
  });

  test('[US-006-AC2] limit is per IP: another IP is unaffected by a blocked one', async () => {
    for (let i = 0; i < 6; i++) {
      await attempt(middleware, '203.0.113.1');
    }

    const other = await attempt(middleware, '203.0.113.2');

    expect(other.allowed).toBe(true);
  });

  test('[US-006-AC3] blocked response states the block is temporary and when to retry', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt(middleware, '203.0.113.1');
    }
    redis.now += 5 * 60 * 1000;

    const { res } = await attempt(middleware, '203.0.113.1');
    const body = res.body as { errorCode: string; message: string; retryAfterSeconds: number };

    expect(body.errorCode).toBe('OTP_RATE_LIMIT_EXCEEDED');
    expect(body.message).toMatch(/temporarily blocked/i);
    expect(body.message).toMatch(/try again in 10 minutes/i);
    expect(body.retryAfterSeconds).toBe(10 * 60);
    expect(res.headers['Retry-After']).toBe(String(10 * 60));
  });

  test('[US-006-AC4] counter resets once 15 minutes have elapsed since the first attempt', async () => {
    for (let i = 0; i < 6; i++) {
      await attempt(middleware, '203.0.113.1');
    }
    expect((await attempt(middleware, '203.0.113.1')).allowed).toBe(false);

    redis.now += WINDOW_MS;

    expect((await attempt(middleware, '203.0.113.1')).allowed).toBe(true);
  });

  test('[US-006-AC4] blocked attempts do not extend the window', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt(middleware, '203.0.113.1');
    }
    redis.now += WINDOW_MS - 1000;
    expect((await attempt(middleware, '203.0.113.1')).allowed).toBe(false);

    redis.now += 1000;

    expect((await attempt(middleware, '203.0.113.1')).allowed).toBe(true);
  });

  test('fails open when the counter store is unavailable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = createIpRateLimitMiddleware({
      allow: jest.fn().mockRejectedValue(new Error('redis down')),
    });

    const { allowed } = await attempt(failing, '203.0.113.1');

    expect(allowed).toBe(true);
  });
});

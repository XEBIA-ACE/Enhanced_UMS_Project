/**
 * US-004 — Password complexity validation during registration.
 *
 * Each test name carries its acceptance-criterion id ([US-004-ACn]).
 */

import type { Request, Response } from 'express';
import { RegistrationController } from './registration.controller';
import { DefaultPasswordPolicyEvaluator } from '../validators/password-policy.evaluator';
import { DefaultRegistrationValidator } from '../validators/registration.validator';
import { passwordPolicyConfig } from '../config/password-policy.config';

const evaluator = new DefaultPasswordPolicyEvaluator();
const evaluate = (pw: string) => evaluator.evaluate(pw, passwordPolicyConfig);

const VALID = 'Abcdef1!';

describe('US-004 password policy evaluator', () => {
  test('[US-004-AC1] password shorter than 8 characters yields a minimum-length error', () => {
    const r = evaluate('Ab1!xyz');
    expect(r.valid).toBe(false);
    expect(r.violations).toContain('Password must be at least 8 characters.');
  });

  test('[US-004-AC2] password without uppercase yields an uppercase error', () => {
    const r = evaluate('abcdef1!');
    expect(r.valid).toBe(false);
    expect(r.violations).toEqual(['Password must contain at least one uppercase letter.']);
  });

  test('[US-004-AC3] password without lowercase yields a lowercase error', () => {
    const r = evaluate('ABCDEF1!');
    expect(r.valid).toBe(false);
    expect(r.violations).toEqual(['Password must contain at least one lowercase letter.']);
  });

  test('[US-004-AC4] password without a digit yields a digit error', () => {
    const r = evaluate('Abcdefg!');
    expect(r.valid).toBe(false);
    expect(r.violations).toEqual(['Password must contain at least one numeric digit.']);
  });

  test('[US-004-AC5] password without a special character yields a special-character error', () => {
    const r = evaluate('Abcdefg1');
    expect(r.valid).toBe(false);
    expect(r.violations).toEqual(['Password must contain at least one special character.']);
  });

  test('[US-004-AC7] password meeting all five rules passes with no violations', () => {
    expect(evaluate(VALID)).toEqual({ valid: true, violations: [] });
  });

  test('[US-004-AC1..AC5] all failed rules are reported together', () => {
    const r = evaluate('abc');
    expect(r.violations).toHaveLength(4);
  });
});

describe('US-004 registration controller blocking', () => {
  function build() {
    const register = jest.fn().mockResolvedValue({ userId: 'u1', message: 'ok' });
    const sendOtp = jest.fn().mockResolvedValue(undefined);
    const controller = new RegistrationController(
      new DefaultRegistrationValidator(),
      { validateFormat: jest.fn() } as any,
      evaluator,
      { checkUniqueness: jest.fn().mockResolvedValue(undefined) } as any,
      { checkUniqueness: jest.fn().mockResolvedValue(undefined) } as any,
      { register } as any,
      { sendOtp } as any,
    );
    return { controller, register, sendOtp };
  }

  function run(controller: RegistrationController, password: string) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const req = {
      body: {
        username: 'alice',
        emailAddress: 'alice@example.test',
        password,
        passwordConfirmation: password,
      },
    } as Request;
    return controller.registerUser(req, { status } as unknown as Response).then(() => ({ status, json }));
  }

  test('[US-004-AC6] invalid password returns 422 and nothing is persisted', async () => {
    const { controller, register, sendOtp } = build();
    const { status, json } = await run(controller, 'weak');

    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0]).toMatchObject({ error: 'PASSWORD_POLICY_VIOLATION' });
    expect(json.mock.calls[0][0].violations.length).toBeGreaterThan(0);
    expect(register).not.toHaveBeenCalled();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test('[US-004-AC7] compliant password passes validation and registration proceeds', async () => {
    const { controller, register } = build();
    const { status } = await run(controller, VALID);

    expect(status).toHaveBeenCalledWith(201);
    expect(register).toHaveBeenCalledTimes(1);
  });
});

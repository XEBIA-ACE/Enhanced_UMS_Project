/**
 * US-014 — Email format and uniqueness validation (controller + validators).
 * Test names carry the acceptance-criterion id they cover.
 */

import type { Request, Response } from 'express';
import { RegistrationController } from './registration.controller';
import { DefaultRegistrationValidator } from '../validators/registration.validator';
import { DefaultEmailValidator } from '../validators/email.validator';
import { DefaultPasswordPolicyEvaluator } from '../validators/password-policy.evaluator';
import { DefaultEmailUniquenessValidator } from '../validators/email-uniqueness.validator';
import { EmailConflictError, ValidationError } from '../errors/registration.errors';
import type { IUserRepository } from '../repositories/user.repository';
import type { UserEntity } from '../types/registration.types';

const REGISTERED_EMAIL = 'taken@example.test';

function makeRepo(registered: string[]): IUserRepository {
  return {
    findByEmailCaseInsensitive: jest.fn(async (email: string) =>
      registered.some((r) => r.toLowerCase() === email.toLowerCase())
        ? ({ id: 'existing' } as UserEntity)
        : null,
    ),
    findByNormalisedUsername: jest.fn(async () => null),
  } as unknown as IUserRepository;
}

function makeController(registered: string[] = [REGISTERED_EMAIL]) {
  const repo = makeRepo(registered);
  const registrationService = {
    register: jest.fn(async () => ({ userId: 'new-user', message: 'ok' })),
  };
  const otpService = { sendOtp: jest.fn(async () => undefined) };
  const usernameValidator = { checkUniqueness: jest.fn(async () => undefined) };
  const controller = new RegistrationController(
    new DefaultRegistrationValidator(),
    new DefaultEmailValidator(),
    new DefaultPasswordPolicyEvaluator(),
    usernameValidator,
    new DefaultEmailUniquenessValidator(repo),
    registrationService as any,
    otpService as any,
  );
  return { controller, registrationService, otpService };
}

function call(controller: RegistrationController, emailAddress: string) {
  const req = {
    body: {
      username: 'jane',
      emailAddress,
      password: 'Passw0rd!',
      passwordConfirmation: 'Passw0rd!',
    },
  } as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return controller.registerUser(req, res as unknown as Response).then(() => res);
}

describe('US-014 email validation', () => {
  test('[US-014-AC1] malformed email is rejected with 422 on emailAddress and no account is created', async () => {
    for (const bad of ['not-an-email', 'a@b', 'a b@example.test', 'a@@example.test', 'user@.com']) {
      const { controller, registrationService } = makeController();
      const res = await call(controller, bad);

      expect(res.status).toHaveBeenCalledWith(422);
      const body = res.json.mock.calls[0][0];
      expect(body.isValid).toBe(false);
      expect(body.fieldErrors[0].fieldName).toBe('emailAddress');
      expect(body.fieldErrors[0].errorMessage).toMatch(/invalid/i);
      expect(registrationService.register).not.toHaveBeenCalled();
    }
  });

  test('[US-014-AC2] already-registered email is rejected with 409 EMAIL_UNAVAILABLE and no account is created', async () => {
    const { controller, registrationService, otpService } = makeController();
    const res = await call(controller, REGISTERED_EMAIL);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body).toMatchObject({ error_code: 'EMAIL_UNAVAILABLE', field: 'emailAddress' });
    expect(body.message).toMatch(/already in use/i);
    expect(registrationService.register).not.toHaveBeenCalled();
    expect(otpService.sendOtp).not.toHaveBeenCalled();
  });

  test('[US-014-AC2] uniqueness is case-insensitive and the error never echoes the address', async () => {
    const { controller } = makeController();
    const res = await call(controller, 'TAKEN@Example.test');

    expect(res.status).toHaveBeenCalledWith(409);
    expect(JSON.stringify(res.json.mock.calls[0][0]).toLowerCase()).not.toContain('taken@');
  });

  test('[US-014-AC2] a unique-index race surfaced by the service is mapped to 409', async () => {
    const { controller, registrationService } = makeController([]);
    registrationService.register.mockRejectedValueOnce(new EmailConflictError());
    const res = await call(controller, 'race@example.test');

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error_code).toBe('EMAIL_UNAVAILABLE');
  });

  test('[US-014-AC3] valid, unregistered email yields no email error and the account is created', async () => {
    const { controller, registrationService } = makeController();
    const res = await call(controller, 'fresh@example.test');

    expect(res.status).toHaveBeenCalledWith(201);
    expect(registrationService.register).toHaveBeenCalledTimes(1);
  });

  test('[US-014-AC4] after a duplicate-email rejection, resubmitting a corrected email succeeds', async () => {
    const { controller, registrationService } = makeController();

    const first = await call(controller, REGISTERED_EMAIL);
    expect(first.status).toHaveBeenCalledWith(409);

    const second = await call(controller, 'corrected@example.test');
    expect(second.status).toHaveBeenCalledWith(201);
    expect(registrationService.register).toHaveBeenCalledTimes(1);
  });
});

describe('US-014 DefaultEmailUniquenessValidator', () => {
  test('[US-014-AC3] resolves when the email is not registered', async () => {
    const validator = new DefaultEmailUniquenessValidator(makeRepo([]));
    await expect(validator.checkUniqueness('new@example.test')).resolves.toBeUndefined();
  });

  test('[US-014-AC2] rejects with EmailConflictError when registered', async () => {
    const validator = new DefaultEmailUniquenessValidator(makeRepo([REGISTERED_EMAIL]));
    await expect(validator.checkUniqueness(REGISTERED_EMAIL)).rejects.toBeInstanceOf(EmailConflictError);
  });

  test('[US-014-AC1] rejects blank input with ValidationError', async () => {
    const validator = new DefaultEmailUniquenessValidator(makeRepo([]));
    await expect(validator.checkUniqueness('  ')).rejects.toBeInstanceOf(ValidationError);
  });
});

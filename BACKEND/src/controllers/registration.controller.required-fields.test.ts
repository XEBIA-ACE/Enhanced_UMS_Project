/**
 * US-013 — Registration form data collection: required-field validation.
 *
 * Each test name carries its acceptance-criterion id ([US-013-ACn]).
 *
 * Scope note: the backend DTO identifies the account holder by `username`
 * (it has no `fullName` field; the frontend collects "Full Name" but does not
 * send it). The "name is required" criterion is therefore exercised here
 * against the required identity field `username`. AC1 (form renders the
 * fields) is UI-only; the closest backend check is that a fully populated
 * submission is accepted. The frontend has no test runner configured.
 */

import type { Request, Response } from 'express';
import { RegistrationController } from './registration.controller';
import { DefaultRegistrationValidator } from '../validators/registration.validator';
import { DefaultPasswordPolicyEvaluator } from '../validators/password-policy.evaluator';

const VALID_BODY = {
  username: 'alice',
  emailAddress: 'alice@example.test',
  password: 'Abcdef1!',
  passwordConfirmation: 'Abcdef1!',
};

function build() {
  const register = jest.fn().mockResolvedValue({ userId: 'u1', message: 'ok' });
  const sendOtp = jest.fn().mockResolvedValue(undefined);
  const controller = new RegistrationController(
    new DefaultRegistrationValidator(),
    { validateFormat: jest.fn() } as any,
    new DefaultPasswordPolicyEvaluator(),
    { checkUniqueness: jest.fn().mockResolvedValue(undefined) } as any,
    { checkUniqueness: jest.fn().mockResolvedValue(undefined) } as any,
    { register } as any,
    { sendOtp } as any,
  );
  return { controller, register, sendOtp };
}

async function submit(body: Record<string, string>) {
  const { controller, register, sendOtp } = build();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  await controller.registerUser({ body } as Request, { status } as unknown as Response);
  return { status, json, register, sendOtp };
}

function fieldNames(json: jest.Mock): string[] {
  return json.mock.calls[0][0].fieldErrors.map((e: { fieldName: string }) => e.fieldName);
}

describe('US-013 required-field validation', () => {
  test('[US-013-AC1] a fully populated submission is accepted (all collected fields are consumed)', async () => {
    const { status, register } = await submit(VALID_BODY);
    expect(status).toHaveBeenCalledWith(201);
    expect(register).toHaveBeenCalledWith(expect.objectContaining(VALID_BODY));
  });

  test('[US-013-AC2] missing name field (username) yields a "required" error and blocks submission', async () => {
    const { status, json, register, sendOtp } = await submit({ ...VALID_BODY, username: '' });
    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0]).toMatchObject({
      isValid: false,
      fieldErrors: [{ fieldName: 'username', errorMessage: 'Username is required.' }],
    });
    expect(register).not.toHaveBeenCalled();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test('[US-013-AC3] missing email yields a "required" error and blocks submission', async () => {
    const { status, json, register } = await submit({ ...VALID_BODY, emailAddress: '' });
    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0]).toMatchObject({
      isValid: false,
      fieldErrors: [{ fieldName: 'emailAddress', errorMessage: 'Email address is required.' }],
    });
    expect(register).not.toHaveBeenCalled();
  });

  test('[US-013-AC4] missing password yields a "required" error and blocks submission', async () => {
    const { status, json, register } = await submit({ ...VALID_BODY, password: '' });
    expect(status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0].fieldErrors).toEqual(
      expect.arrayContaining([{ fieldName: 'password', errorMessage: 'Password is required.' }]),
    );
    expect(register).not.toHaveBeenCalled();
  });

  test('[US-013-AC5] several missing fields are all reported together and submission is blocked', async () => {
    const { status, json, register, sendOtp } = await submit({
      username: '',
      emailAddress: '   ',
      password: '',
      passwordConfirmation: '',
    });
    expect(status).toHaveBeenCalledWith(422);
    expect(fieldNames(json)).toEqual(['username', 'emailAddress', 'password', 'passwordConfirmation']);
    expect(register).not.toHaveBeenCalled();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test('[US-013-AC5] omitted (undefined) fields are treated as missing, not as a crash', async () => {
    const { status, json } = await submit({});
    expect(status).toHaveBeenCalledWith(422);
    expect(fieldNames(json)).toHaveLength(4);
  });

  test('[US-013-AC4] validation errors never echo the password back', async () => {
    const { json } = await submit({ ...VALID_BODY, username: '', password: 'Secret1!x', passwordConfirmation: 'Secret1!x' });
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('Secret1!x');
  });
});

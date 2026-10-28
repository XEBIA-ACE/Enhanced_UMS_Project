/**
 * US-012 — Administrator Role Validation for Dashboard Access.
 * Unit tests for AdminController.validateAdminRole / getDashboard. Each test
 * name carries the acceptance-criterion id it verifies.
 */

import { Request, Response } from 'express';
import { AdminController, ADMIN_UNAUTHORIZED_MESSAGE } from './admin.controller';
import { EmailDispatchService } from '../services/email-dispatch.service';
import { IAdminAccountRepository } from '../repositories/admin-account.repository';

function buildRequest(userId?: string): Request {
  return { userId } as unknown as Request;
}

function buildResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('AdminController — US-012 admin role validation', () => {
  let adminAccountRepository: jest.Mocked<IAdminAccountRepository>;
  let controller: AdminController;

  beforeEach(() => {
    adminAccountRepository = { isActiveAdmin: jest.fn() };
    const emailDispatchService = {} as EmailDispatchService;
    controller = new AdminController(emailDispatchService, adminAccountRepository);
  });

  test('[US-012-ac-1] validates the authenticated user against the admin accounts repository', async () => {
    adminAccountRepository.isActiveAdmin.mockResolvedValue(true);
    const next = jest.fn();

    await controller.validateAdminRole(buildRequest('admin-1'), buildResponse(), next);

    expect(adminAccountRepository.isActiveAdmin).toHaveBeenCalledWith('admin-1');
  });

  test('[US-012-ac-2] admin role confirmed -> next() is called and dashboard returns 200', async () => {
    adminAccountRepository.isActiveAdmin.mockResolvedValue(true);
    const req = buildRequest('admin-1');
    const res = buildResponse();
    const next = jest.fn();

    await controller.validateAdminRole(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    controller.getDashboard(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ access: 'granted', admin_user_id: 'admin-1' });
  });

  test('[US-012-ac-3] non-admin -> 403 with explicit unauthorized message', async () => {
    adminAccountRepository.isActiveAdmin.mockResolvedValue(false);
    const res = buildResponse();
    const next = jest.fn();

    await controller.validateAdminRole(buildRequest('user-1'), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error_code: 'ADMIN_ROLE_REQUIRED',
      message: ADMIN_UNAUTHORIZED_MESSAGE,
    });
  });

  test('[US-012-ac-4] non-admin -> next() is never called, so no admin handler runs', async () => {
    adminAccountRepository.isActiveAdmin.mockResolvedValue(false);
    const next = jest.fn();

    await controller.validateAdminRole(buildRequest('user-1'), buildResponse(), next);

    expect(next).not.toHaveBeenCalled();
  });

  test('[US-012-ac-4] missing authenticated user -> 401, no role lookup, next() not called', async () => {
    const res = buildResponse();
    const next = jest.fn();

    await controller.validateAdminRole(buildRequest(undefined), res, next);

    expect(adminAccountRepository.isActiveAdmin).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('[US-012-ac-4] role lookup failure fails closed -> 500, next() not called', async () => {
    adminAccountRepository.isActiveAdmin.mockRejectedValue(new Error('db down'));
    const res = buildResponse();
    const next = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await controller.validateAdminRole(buildRequest('admin-1'), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { UserRepository } from '../repositories/user.repository';
import { TokenRepository } from '../repositories/token.repository';
import { EmailRecordRepository } from '../repositories/email-record.repository';
import { AdminAccountRepository } from '../repositories/admin-account.repository';
import { DefaultEmailDispatchService } from '../services/email-dispatch.service';
import { SessionService } from '../services/session.service';
import { AdminController } from '../controllers/admin.controller';
import { requireAdminBearerToken } from '../middleware/admin-auth.middleware';
import { createSessionValidationMiddleware } from '../middleware/session-validation.middleware';

export function createAdminRouter(db: Database, sessionService: SessionService): Router {
  const router = Router();

  const userRepo = new UserRepository(db);
  const tokenRepo = new TokenRepository(db);
  const emailRecordRepo = new EmailRecordRepository(db);
  const controller = new AdminController(
    new DefaultEmailDispatchService(userRepo, emailRecordRepo, tokenRepo),
    new AdminAccountRepository(db),
  );

  const requireSession = createSessionValidationMiddleware(sessionService);

  router.post(
    '/users/:user_id/resend-confirmation',
    requireAdminBearerToken,
    (req, res) => { void controller.resendConfirmation(req, res); },
  );

  // US-012: GET /api/v1/admin/dashboard — session auth, then admin role check.
  router.get(
    '/dashboard',
    requireSession,
    (req, res, next) => { void controller.validateAdminRole(req, res, next); },
    (req, res) => { controller.getDashboard(req, res); },
  );

  return router;
}

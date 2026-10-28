import { Request, Response, NextFunction } from 'express';
import { EmailDispatchService } from '../services/email-dispatch.service';
import { IAdminAccountRepository } from '../repositories/admin-account.repository';
import { UserNotFoundException, AccountNotPendingException } from '../errors/registration.errors';

export const ADMIN_UNAUTHORIZED_MESSAGE =
  'Unauthorized: administrator role is required to access the Admin Dashboard.';

export class AdminController {
  constructor(
    private readonly emailDispatchService: EmailDispatchService,
    private readonly adminAccountRepository: IAdminAccountRepository,
  ) {}

  /**
   * US-012: runs after SessionValidationMiddleware has authenticated the
   * caller (req.userId populated). Checks the admin_accounts table and only
   * calls next() when the caller is an active administrator. Fails closed:
   * any other outcome ends the request without reaching an admin handler.
   */
  async validateAdminRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error_code: 'AUTH_REQUIRED', message: 'Authentication is required.' });
      return;
    }

    let isAdmin: boolean;
    try {
      isAdmin = await this.adminAccountRepository.isActiveAdmin(userId);
    } catch (err) {
      console.error('[AdminController] Admin role validation failed:', err);
      res.status(500).json({ error: 'An unexpected error occurred.' });
      return;
    }

    if (!isAdmin) {
      res.status(403).json({ error_code: 'ADMIN_ROLE_REQUIRED', message: ADMIN_UNAUTHORIZED_MESSAGE });
      return;
    }

    next();
  }

  /** US-012-ac-2: Admin Dashboard entry point, reachable only past validateAdminRole. */
  getDashboard(req: Request, res: Response): void {
    res.status(200).json({ access: 'granted', admin_user_id: req.userId });
  }

  async resendConfirmation(req: Request, res: Response): Promise<void> {
    const userId = req.params.user_id as string;

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      res.status(400).json({ error: 'User ID is required.' });
      return;
    }

    try {
      await this.emailDispatchService.resendConfirmation(userId.trim());
      res.status(202).json({ message: 'Confirmation email enqueue requested.' });
    } catch (err) {
      if (err instanceof UserNotFoundException) {
        res.status(404).json({ error: 'User not found.' });
      } else if (err instanceof AccountNotPendingException) {
        res.status(409).json({ error: 'Account is not pending activation.' });
      } else {
        console.error('[AdminController] Unexpected error:', err);
        res.status(500).json({ error: 'An unexpected error occurred.' });
      }
    }
  }
}

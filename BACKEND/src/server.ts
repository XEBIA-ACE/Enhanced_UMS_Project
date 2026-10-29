import 'dotenv/config';
import { Redis } from 'ioredis';
import { createDb } from './db/connection';
import { runMigrations } from './db/migrate';
import { createApp } from './app';
import { EmailRecordRepository } from './repositories/email-record.repository';
import { TokenRepository } from './repositories/token.repository';
import { UserRepository } from './repositories/user.repository';
import { DeletionNotificationRecordRepository } from './repositories/deletion-notification-record.repository';
import { SendGridEmailAdapter } from './adapters/sendgrid-email.adapter';
import { EmailOtpDeliveryAdapter } from './adapters/email-otp-delivery.adapter';
import { OutboxWorker } from './workers/outbox.worker';
import { AccountDeletionNotificationWorker } from './workers/account-deletion-notification.worker';
import { OtpDispatchWorker } from './workers/otp-dispatch.worker';
import { OtpDispatchOutboxRepository } from './repositories/otp-dispatch-outbox.repository';
import { OtpRequestRepository } from './repositories/otp-request.repository';
import { DefaultOtpService } from './services/otp.service';
import { RedisRateLimitGuard } from './services/rate-limit.guard';
import { otpConfig } from './config/otp.config';

const db = createDb();
runMigrations(db);

const otpRedisClient = new Redis(otpConfig.redisUrl);
const emailDeliveryPort = new SendGridEmailAdapter();
const otpDeliveryPort = new EmailOtpDeliveryAdapter(emailDeliveryPort);
const app = createApp(db, otpRedisClient, otpDeliveryPort, emailDeliveryPort);

const emailRecordRepository = new EmailRecordRepository(db);
const tokenRepository = new TokenRepository(db);
const userRepository = new UserRepository(db);
const outboxWorker = new OutboxWorker(
  emailRecordRepository,
  tokenRepository,
  userRepository,
  emailDeliveryPort,
);

const deletionNotificationRecordRepository = new DeletionNotificationRecordRepository(db);
const accountDeletionNotificationWorker = new AccountDeletionNotificationWorker(
  deletionNotificationRecordRepository,
  emailDeliveryPort,
);

const otpDispatchWorker = new OtpDispatchWorker(
  new OtpDispatchOutboxRepository(db),
  new DefaultOtpService(
    userRepository,
    new OtpRequestRepository(db),
    new RedisRateLimitGuard(otpRedisClient),
    otpDeliveryPort,
    db,
  ),
);

outboxWorker.start();
otpDispatchWorker.start();
accountDeletionNotificationWorker.start();

const port = parseInt(process.env.PORT ?? '3000', 10);
const server = app.listen(port, () => {
  console.log(`User Management Service listening on port ${port}`);
});

function shutdown(): void {
  console.log('Shutting down gracefully...');
  outboxWorker.stop();
  otpDispatchWorker.stop();
  accountDeletionNotificationWorker.stop();
  server.close(() => {
    db.close();
    otpRedisClient.quit().then(() => {
      console.log('Shutdown complete.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

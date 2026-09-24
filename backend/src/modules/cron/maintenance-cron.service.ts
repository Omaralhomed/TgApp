import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class MaintenanceCronService {
  private readonly logger = new Logger(MaintenanceCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: EventsGateway,
  ) {}

  /**
   * Daily Maintenance Job - Executes every midnight at 00:00:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightMaintenance() {
    this.logger.log('Starting automated midnight maintenance job...');
    const startTime = Date.now();

    try {
      // 1. Reset daily sent counters for all active Telegram accounts
      const resetResult = await this.prisma.telegramAccount.updateMany({
        where: { sentToday: { gt: 0 } },
        data: { sentToday: 0 },
      });
      this.logger.log(`Reset daily counter for ${resetResult.count} Telegram accounts.`);

      // 2. Auto-recover FloodWait accounts whose cooldown has elapsed
      const recoveredResult = await this.prisma.telegramAccount.updateMany({
        where: {
          status: 'FLOOD_WAIT',
          floodWaitUntil: { lte: new Date() },
        },
        data: {
          status: 'ACTIVE',
          floodWaitUntil: null,
        },
      });
      if (recoveredResult.count > 0) {
        this.logger.log(`Recovered ${recoveredResult.count} accounts from FLOOD_WAIT cooldown back to ACTIVE.`);
      }

      // 3. Subscription Expiration Check: Downgrade expired subscriptions to FREE
      const expiredUsers = await this.prisma.user.findMany({
        where: {
          subscriptionExpiresAt: { lte: new Date() },
          subscriptionTier: { not: 'FREE' },
        },
        select: { id: true, email: true, subscriptionTier: true },
      });

      for (const u of expiredUsers) {
        await this.prisma.user.update({
          where: { id: u.id },
          data: {
            subscriptionTier: 'FREE',
            plan: 'FREE',
            quotaMessagesLimit: 1000,
            quotaAccountsLimit: 2,
          },
        });

        this.wsGateway.emitToUser(u.id, 'system:plan_expired', {
          message: 'انتهت فترة اشتراكك وتم تحويل باقتك إلى الباقة المجانية. يمكنك الترقية في أي وقت من قسم الفوترة.',
          newTier: 'FREE',
        });
      }
      if (expiredUsers.length > 0) {
        this.logger.log(`Downgraded ${expiredUsers.length} expired user subscriptions.`);
      }

      // 4. Prune audit logs older than 45 days to keep database compact and fast
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const prunedLogs = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: fortyFiveDaysAgo } },
      });
      if (prunedLogs.count > 0) {
        this.logger.log(`Pruned ${prunedLogs.count} obsolete audit logs (>45 days old).`);
      }

      // 5. Prune expired or revoked sessions
      const prunedSessions = await this.prisma.userSession.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
        },
      });
      if (prunedSessions.count > 0) {
        this.logger.log(`Pruned ${prunedSessions.count} expired sessions.`);
      }

      const elapsedMs = Date.now() - startTime;
      this.logger.log(`Automated maintenance finished successfully in ${elapsedMs}ms.`);
      this.wsGateway.emitLog('INFO', `Automated daily maintenance completed (${elapsedMs}ms).`);
    } catch (err: any) {
      this.logger.error(`Automated maintenance failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Hourly Health Heartbeat - Checks for and cleans up stuck abandoned tasks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyHealthCheck() {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      // Clean up orphaned pending auth flows
      const staleAccounts = await this.prisma.telegramAccount.findMany({
        where: {
          status: 'PENDING_AUTH',
          createdAt: { lt: tenMinutesAgo },
          sessionString: null,
        },
        select: { id: true },
      });

      if (staleAccounts.length > 0) {
        await this.prisma.telegramAccount.deleteMany({
          where: { id: { in: staleAccounts.map((a) => a.id) } },
        });
        this.logger.log(`Cleaned up ${staleAccounts.length} stale pending authentication requests.`);
      }
    } catch (err: any) {
      this.logger.warn(`Hourly cleanup warning: ${err.message}`);
    }
  }

  /**
   * Manual Maintenance trigger for SuperAdmin
   */
  async runManualMaintenance() {
    await this.handleMidnightMaintenance();
    return { success: true, timestamp: new Date() };
  }
}

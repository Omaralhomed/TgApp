import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TelegramPolicyEngine } from '../../telegram/telegram-policy.service';
import { TelegramEngineService } from '../../telegram/telegram-engine.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class HealthProcessor {
  private readonly logger = new Logger(HealthProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyEngine: TelegramPolicyEngine,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
  ) {}

  /**
   * Evaluates and updates account health score, checks flood wait cooldown expiration
   */
  async checkAccountHealth(accountId: string) {
    try {
      const account = await this.prisma.telegramAccount.findUnique({
        where: { id: accountId },
        include: { proxy: true },
      });

      if (!account) return;

      // Check flood wait expiration
      const now = new Date();
      let status = account.status;
      if (account.status === 'FLOOD_WAIT' && account.floodWaitUntil && account.floodWaitUntil <= now) {
        status = 'ACTIVE';
        this.logger.log(`Account ${account.phone} cooldown ended. Reverting to ACTIVE.`);
        this.wsGateway.emitLog('INFO', `Account ${account.phone} cooldown ended. Status restored to ACTIVE.`);
      }

      const metrics = this.policyEngine.evaluateAccountHealth({
        ...account,
        status,
      });

      const updated = await this.prisma.telegramAccount.update({
        where: { id: accountId },
        data: {
          status,
          healthScore: metrics.healthScore,
          tier: metrics.tier,
        },
      });

      this.wsGateway.emitAccountStatus(updated.id, {
        accountId: updated.id,
        phone: updated.phone,
        status: updated.status,
        healthScore: updated.healthScore,
        tier: updated.tier,
      });

      return metrics;
    } catch (err: any) {
      this.logger.error(`Health evaluation error for ${accountId}: ${err.message}`);
    }
  }

  /**
   * Periodically runs health scan across all accounts
   */
  async runGlobalHealthScan() {
    try {
      const accounts = await this.prisma.telegramAccount.findMany();
      for (const acc of accounts) {
        await this.checkAccountHealth(acc.id);
      }
    } catch (err: any) {
      this.logger.warn(`Global health scan error: ${err.message}`);
    }
  }
}

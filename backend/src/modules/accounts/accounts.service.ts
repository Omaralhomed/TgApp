import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramEngineService, getAppAndDeviceProfileForPhone } from '../telegram/telegram-engine.service';
import { EventsGateway } from '../websocket/events.gateway';
import { CryptoService } from '../../common/crypto/crypto.service';

@Injectable()
export class AccountsService implements OnModuleInit {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    private readonly cryptoService: CryptoService,
  ) {}

  onModuleInit() {
    // Run automated account health, flood wait recovery and daily limit maintenance every 60 seconds
    setInterval(() => {
      this.runMaintenanceCheck().catch((err) => {
        this.logger.warn(`Account maintenance check error: ${err.message}`);
      });
    }, 60000);
  }

  private async runMaintenanceCheck() {
    const now = new Date();

    // 1. Recover accounts whose FLOOD_WAIT duration has passed
    const floodAccounts = await this.prisma.telegramAccount.findMany({
      where: {
        status: 'FLOOD_WAIT',
        floodWaitUntil: { lte: now },
      },
    });

    for (const acc of floodAccounts) {
      const health = this.tgEngine.policyEngine.evaluateAccountHealth({
        ...acc,
        status: 'ACTIVE',
        floodWaitUntil: null,
      });

      await this.prisma.telegramAccount.update({
        where: { id: acc.id },
        data: {
          status: 'ACTIVE',
          floodWaitUntil: null,
          healthScore: health.healthScore,
          tier: health.tier,
        },
      });
      this.wsGateway.emitLog('SUCCESS', `[${acc.phone}] Flood Wait expired. Account automatically restored to ACTIVE.`);
    }

    // 2. Daily reset of sentToday counter if last sent was on a previous calendar day
    const activeAccounts = await this.prisma.telegramAccount.findMany({
      where: {
        sentToday: { gt: 0 },
        lastSentAt: { not: null },
      },
    });

    for (const acc of activeAccounts) {
      if (acc.lastSentAt) {
        const lastSentDate = new Date(acc.lastSentAt);
        if (
          lastSentDate.getUTCFullYear() !== now.getUTCFullYear() ||
          lastSentDate.getUTCMonth() !== now.getUTCMonth() ||
          lastSentDate.getUTCDate() !== now.getUTCDate()
        ) {
          const newWarmupDays = acc.warmupMode ? (acc.warmupDays || 1) + 1 : (acc.warmupDays || 1);
          await this.prisma.telegramAccount.update({
            where: { id: acc.id },
            data: {
              sentToday: 0,
              warmupDays: newWarmupDays,
            },
          });
          this.wsGateway.emitLog('INFO', `[${acc.phone}] Daily quota reset to 0. Warmup day updated to ${newWarmupDays}.`);
        }
      }
    }
  }

  async listAccounts(userId?: string) {
    const accounts = await this.prisma.telegramAccount.findMany({
      where: userId ? { userId } : {},
      include: {
        proxy: {
          select: {
            id: true,
            host: true,
            port: true,
            protocol: true,
            isActive: true,
            responseTimeMs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((acc) => {
      const healthMetrics = this.tgEngine.policyEngine.evaluateAccountHealth(acc);
      return {
        ...acc,
        healthMetrics,
      };
    });
  }

  async getAccountDetails(id: string, userId?: string) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: userId ? { id, userId } : { id },
      include: {
        proxy: true,
        campaignLogs: {
          take: 50,
          orderBy: { sentAt: 'desc' },
        },
        addMembersLogs: {
          take: 50,
          orderBy: { addedAt: 'desc' },
        },
        sessions: {
          take: 10,
          orderBy: { lastActiveAt: 'desc' },
        },
      },
    });

    if (!account) throw new NotFoundException('Account not found');

    const healthMetrics = this.tgEngine.policyEngine.evaluateAccountHealth(account);
    return {
      ...account,
      healthMetrics,
    };
  }

  async initiateAuth(dto: { phone: string; apiId?: number; apiHash?: string; proxyId?: string; userId: string }) {
    let proxy = undefined;
    if (dto.proxyId) {
      proxy = await this.prisma.proxy.findUnique({ where: { id: dto.proxyId } });
    }

    // Quota check: Ensure user hasn't exceeded their account limit
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { quotaAccountsLimit: true },
      });
      if (user) {
        const currentAccountsCount = await this.prisma.telegramAccount.count({
          where: { userId: dto.userId, phone: { not: dto.phone } },
        });
        if (currentAccountsCount >= user.quotaAccountsLimit) {
          throw new ForbiddenException(
            `Account limit reached (${currentAccountsCount}/${user.quotaAccountsLimit}). Please upgrade your subscription tier to connect more Telegram accounts.`,
          );
        }
      }
    }

    const profile = getAppAndDeviceProfileForPhone(dto.phone, dto.apiId, dto.apiHash);
    const effectiveApiId = profile.apiId;
    const effectiveApiHash = profile.apiHash;

    const result = await this.tgEngine.initiatePhoneAuth(dto.phone, effectiveApiId, effectiveApiHash, proxy);

    await this.prisma.telegramAccount.upsert({
      where: { phone: dto.phone },
      update: {
        apiId: effectiveApiId,
        apiHash: effectiveApiHash,
        status: 'PENDING_AUTH',
        proxyId: dto.proxyId || null,
        userId: dto.userId,
      },
      create: {
        phone: dto.phone,
        apiId: effectiveApiId,
        apiHash: effectiveApiHash,
        status: 'PENDING_AUTH',
        proxyId: dto.proxyId || null,
        userId: dto.userId,
      },
    });

    return result;
  }

  async verifyAuth(dto: { phone: string; code: string; password2FA?: string }, userId?: string) {
    // 1. Validate phone ownership against requesting user
    const pendingAccount = await this.prisma.telegramAccount.findUnique({
      where: { phone: dto.phone },
    });

    if (!pendingAccount) {
      throw new NotFoundException(`No pending authorization found for phone ${dto.phone}`);
    }

    if (userId && pendingAccount.userId !== userId) {
      this.logger.warn(`Security alert: User ${userId} attempted unauthorized verification of phone ${dto.phone} owned by ${pendingAccount.userId}`);
      throw new ForbiddenException('You do not have permission to verify this phone number.');
    }

    const authResult = await this.tgEngine.completePhoneAuth(dto.phone, dto.code, dto.password2FA);

    if (authResult.requires2FA) {
      return authResult;
    }

    const encryptedSession = authResult.sessionString;

    const updated = await this.prisma.telegramAccount.update({
      where: { phone: dto.phone },
      data: {
        sessionString: encryptedSession,
        status: 'ACTIVE',
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        username: authResult.user.username,
        healthScore: 100,
        tier: 'TIER_1',
      },
      include: { proxy: true },
    });

    // Create session audit record
    await this.prisma.telegramSession.create({
      data: {
        accountId: updated.id,
        sessionHash: this.cryptoService.generateSecureToken(16),
        isActive: true,
      },
    });

    this.wsGateway.emitUserLog(updated.userId, 'SUCCESS', `Account ${dto.phone} is now ACTIVE and ready for tasks!`);
    return updated;
  }

  async deleteAccount(id: string, userId?: string) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: userId ? { id, userId } : { id },
    });
    if (!account) throw new NotFoundException('Account not found');

    await this.tgEngine.disconnectClient(account.phone);
    await this.prisma.telegramAccount.delete({ where: { id: account.id } });
    return { success: true, message: 'Account deleted successfully' };
  }

  async checkAccountHealth(id: string, userId?: string) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: userId ? { id, userId } : { id },
      include: { proxy: true },
    });
    if (!account || !account.sessionString) {
      throw new BadRequestException('Account is not authenticated');
    }

    try {
      const client = await this.tgEngine.getClient(
        account.phone,
        account.apiId,
        account.apiHash,
        account.sessionString,
        account.proxy,
      );
      const me = (await client.getMe()) as any;
      const metrics = this.tgEngine.policyEngine.evaluateAccountHealth({
        ...account,
        status: 'ACTIVE',
      });

      const updated = await this.prisma.telegramAccount.update({
        where: { id: account.id },
        data: {
          status: 'ACTIVE',
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username,
          healthScore: metrics.healthScore,
          tier: metrics.tier,
        },
      });

      return { status: 'ACTIVE', user: me, healthMetrics: metrics };
    } catch (err: any) {
      const classification = this.tgEngine.policyEngine.classifyTelegramError(err);
      const status = classification.code === 'FLOOD_WAIT' ? 'FLOOD_WAIT' : 'BANNED';
      
      await this.prisma.telegramAccount.update({
        where: { id: account.id },
        data: { status },
      });
      return { status, error: classification.message };
    }
  }

  async updateAccount(
    id: string,
    userId: string,
    data: { dailyLimit?: number; warmupMode?: boolean; proxyId?: string | null },
  ) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: { id, userId },
    });
    if (!account) throw new NotFoundException('Account not found');

    const updated = await this.prisma.telegramAccount.update({
      where: { id },
      data: {
        dailyLimit: data.dailyLimit !== undefined ? Number(data.dailyLimit) : undefined,
        warmupMode: data.warmupMode !== undefined ? Boolean(data.warmupMode) : undefined,
        proxyId: data.proxyId !== undefined ? data.proxyId : undefined,
      },
      include: { proxy: true },
    });

    return updated;
  }

  async bulkSyncHealth(userId?: string) {
    const accounts = await this.prisma.telegramAccount.findMany({
      where: userId ? { userId } : {},
    });

    const results = [];
    for (const acc of accounts) {
      if (acc.sessionString) {
        try {
          const res = await this.checkAccountHealth(acc.id, userId);
          results.push({ id: acc.id, phone: acc.phone, ...res });
        } catch (e: any) {
          results.push({ id: acc.id, phone: acc.phone, error: e.message });
        }
      }
    }
    return { synced: results.length, details: results };
  }

  /**
   * Task 7.1: Unified MTProto Inbox - Get account dialogs/conversations
   */
  async getAccountDialogs(accountId: string, userId: string, limit: number = 40) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: { id: accountId, userId },
      include: { proxy: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (!account.sessionString) throw new BadRequestException('Account session is not authenticated');

    const client = await this.tgEngine.getClient(
      account.phone,
      account.apiId,
      account.apiHash,
      account.sessionString,
      account.proxy,
    );

    // Attach real-time listener for incoming messages to route to user WebSocket
    this.tgEngine.attachInboxListener(client, account.id, userId);

    const dialogs = await this.tgEngine.getAccountDialogs(client, limit);
    return dialogs;
  }

  /**
   * Task 7.1: Unified MTProto Inbox - Get message history with a peer
   */
  async getDialogMessages(accountId: string, userId: string, peer: string, limit: number = 50) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: { id: accountId, userId },
      include: { proxy: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (!account.sessionString) throw new BadRequestException('Account session is not authenticated');

    const client = await this.tgEngine.getClient(
      account.phone,
      account.apiId,
      account.apiHash,
      account.sessionString,
      account.proxy,
    );

    const messages = await this.tgEngine.getDialogMessages(client, peer, limit);
    return messages;
  }

  /**
   * Task 7.1: Unified MTProto Inbox - Send direct reply to a peer
   */
  async sendDirectReply(accountId: string, userId: string, peer: string, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const account = await this.prisma.telegramAccount.findFirst({
      where: { id: accountId, userId },
      include: { proxy: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (!account.sessionString) throw new BadRequestException('Account session is not authenticated');

    const client = await this.tgEngine.getClient(
      account.phone,
      account.apiId,
      account.apiHash,
      account.sessionString,
      account.proxy,
    );

    const result = await this.tgEngine.sendTextMessage(client, peer, text.trim());
    return result;
  }

  /**
   * Task 7.4: Auto-assign the optimal proxy from pool to account
   */
  async autoAssignProxy(accountId: string, userId: string) {
    const account = await this.prisma.telegramAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Account not found');

    const proxies = await this.prisma.proxy.findMany({
      where: { userId },
      include: { accounts: { select: { id: true } } },
      orderBy: [{ isActive: 'desc' }, { responseTimeMs: 'asc' }],
    });

    if (proxies.length === 0) {
      throw new BadRequestException('No proxies available in your pool. Please add proxies first.');
    }

    // Pick active proxy with least accounts assigned
    proxies.sort((a, b) => a.accounts.length - b.accounts.length);
    const chosenProxy = proxies[0];

    const updated = await this.prisma.telegramAccount.update({
      where: { id: accountId },
      data: { proxyId: chosenProxy.id },
      include: { proxy: true },
    });

    return {
      success: true,
      message: `Assigned proxy ${chosenProxy.host}:${chosenProxy.port} to ${account.phone}`,
      account: updated,
    };
  }
}


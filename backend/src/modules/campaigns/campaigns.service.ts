import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramEngineService } from '../telegram/telegram-engine.service';
import { EventsGateway } from '../websocket/events.gateway';
import { parseSpintax } from './spintax.util';
import { CampaignProcessor } from '../queue/processors/campaign.processor';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CampaignsService implements OnModuleInit {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    private readonly campaignProcessor: CampaignProcessor,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    // Graceful recovery for orphaned RUNNING campaigns on startup
    try {
      const orphaned = await this.prisma.campaign.findMany({
        where: { status: 'RUNNING' },
      });
      if (orphaned.length > 0) {
        this.logger.warn(`Recovered ${orphaned.length} orphaned RUNNING campaigns. Resetting to PAUSED.`);
        await this.prisma.campaign.updateMany({
          where: { status: 'RUNNING' },
          data: { status: 'PAUSED' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Campaign init recovery error: ${err.message}`);
    }
  }

  async listCampaigns(userId?: string) {
    return this.prisma.campaign.findMany({
      where: userId ? { userId } : {},
      include: {
        group: {
          select: { title: true, memberCount: true },
        },
        runs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { logs: true, events: true, targets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignDetails(id: string, userId?: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: userId ? { id, userId } : { id },
      include: {
        group: true,
        runs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        events: {
          take: 100,
          orderBy: { createdAt: 'desc' },
          include: {
            account: {
              select: { phone: true, username: true },
            },
          },
        },
        logs: {
          take: 100,
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const isRunning = this.queueService.isExecuting(campaign.id);

    return {
      ...campaign,
      isRunning,
    };
  }

  async createCampaign(dto: {
    name: string;
    messageTemplate: string;
    groupId?: string;
    customTargetUserIds?: string[];
    delayMinSeconds?: number;
    delayMaxSeconds?: number;
    policyConfig?: any;
    userId: string;
  }) {
    let targetCount = 0;

    if (dto.groupId) {
      const group = await this.prisma.groupTarget.findFirst({
        where: { id: dto.groupId, userId: dto.userId },
      });
      if (!group) {
        throw new BadRequestException('Target group not found or does not belong to you.');
      }
      targetCount = await this.prisma.scrapedMember.count({
        where: { groupId: dto.groupId, isBot: false },
      });
    } else if (dto.customTargetUserIds && dto.customTargetUserIds.length > 0) {
      targetCount = dto.customTargetUserIds.length;
    } else {
      targetCount = await this.prisma.scrapedMember.count({
        where: { group: { userId: dto.userId }, isBot: false },
      });
    }

    if (targetCount === 0) {
      throw new BadRequestException('No valid targets found. Scrape a group or select an existing audience first.');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        messageTemplate: dto.messageTemplate,
        groupId: dto.groupId || null,
        delayMinSeconds: dto.delayMinSeconds ? Math.max(5, Number(dto.delayMinSeconds)) : 15,
        delayMaxSeconds: dto.delayMaxSeconds ? Math.max(10, Number(dto.delayMaxSeconds)) : 45,
        status: 'DRAFT',
        totalTargets: targetCount,
        policyConfig: dto.policyConfig ? JSON.stringify(dto.policyConfig) : null,
      },
      include: { group: true },
    });

    this.wsGateway.emitLog('INFO', `Created new campaign "${campaign.name}" with ${targetCount} targets.`);
    return campaign;
  }

  async startCampaign(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (this.queueService.isExecuting(campaign.id)) {
      throw new BadRequestException('Campaign is already running.');
    }

    const activeAccountsCount = await this.prisma.telegramAccount.count({
      where: { userId, status: 'ACTIVE', sessionString: { not: null } },
    });
    if (activeAccountsCount === 0) {
      throw new BadRequestException('Cannot start campaign: You need at least one ACTIVE Telegram account.');
    }

    // Quota and Subscription Enforcement
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        quotaMessagesLimit: true,
        quotaMessagesUsed: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
      },
    });

    if (user) {
      if (user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt) {
        throw new ForbiddenException(
          'Subscription expired. Please renew your plan or upgrade to continue launching campaigns.',
        );
      }

      if (user.quotaMessagesUsed >= user.quotaMessagesLimit) {
        throw new ForbiddenException(
          `Monthly message quota exceeded (${user.quotaMessagesUsed}/${user.quotaMessagesLimit}). Please upgrade your tier or top up credits.`,
        );
      }
    }

    // Dispatch campaign execution to BullMQ / Queue engine
    await this.queueService.addCampaignJob({ campaignId: campaign.id, userId });

    return { success: true, message: 'Campaign execution enqueued in background.' };
  }

  async pauseCampaign(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.queueService.cancelExecution(campaign.id);

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'PAUSED' },
    });

    this.wsGateway.emitCampaignProgress(campaign.id, {
      campaignId: campaign.id,
      status: 'PAUSED',
      total: campaign.totalTargets,
      sent: campaign.sentCount,
      failed: campaign.failedCount,
      progress: campaign.totalTargets > 0 ? Math.round((campaign.sentCount / campaign.totalTargets) * 100) : 0,
    });

    return { success: true, message: 'Campaign paused successfully.' };
  }

  async deleteCampaign(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    this.queueService.cancelExecution(campaign.id);

    await this.prisma.campaign.delete({ where: { id: campaign.id } });
    return { success: true, message: 'Campaign deleted successfully.' };
  }

  testSpintax(template: string, mockData?: { firstName?: string; username?: string }) {
    const variations = [];
    for (let i = 0; i < 5; i++) {
      let preview = parseSpintax(template);
      if (mockData) {
        preview = preview
          .replace(/{firstName}/g, mockData.firstName || 'Alex')
          .replace(/{username}/g, mockData.username ? `@${mockData.username}` : '@alex_dev');
      }
      variations.push(preview);
    }
    return { variations };
  }
}

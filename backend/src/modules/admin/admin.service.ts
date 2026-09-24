import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { EventsGateway } from '../websocket/events.gateway';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly wsGateway: EventsGateway,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Platform-wide high-level metrics for SuperAdmin Command Center
   */
  async getOverviewMetrics() {
    const [
      totalTenants,
      activeAccounts,
      runningCampaigns,
      totalCampaigns,
      pendingReceipts,
      activeBots,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.telegramAccount.count({ where: { status: 'ACTIVE' } }),
      this.prisma.campaign.count({ where: { status: 'RUNNING' } }),
      this.prisma.campaign.count(),
      this.prisma.paymentReceiptRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.telegramBot.count({ where: { isActive: true } }),
    ]);

    // Aggregate total messages sent platform-wide
    const accountsSent = await this.prisma.telegramAccount.aggregate({
      _sum: { totalSent: true, totalFailed: true },
    });

    const totalSentPlatform = accountsSent._sum.totalSent || 0;
    const totalFailedPlatform = accountsSent._sum.totalFailed || 0;

    // Calculate approximate platform revenue based on approved receipts
    const revenueAgg = await this.prisma.paymentReceiptRequest.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amountPaid: true },
    });
    const totalRevenue = revenueAgg._sum.amountPaid || 0;

    return {
      totalTenants,
      activeAccounts,
      runningCampaigns,
      totalCampaigns,
      pendingReceipts,
      activeBots,
      totalSentPlatform,
      totalFailedPlatform,
      totalRevenue,
      isEmergencyHalted: this.queueService.isEmergencyHalted,
      isRedisConnected: this.queueService.isRedisConnected,
    };
  }

  /**
   * List all tenant accounts with quotas and statuses
   */
  async listTenants(search?: string, tier?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tier && tier !== 'ALL') {
      where.subscriptionTier = tier;
    }

    const tenants = await this.prisma.user.findMany({
      where,
      include: {
        org: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { accounts: true, campaigns: true, groups: true, bots: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return tenants.map((t) => ({
      id: t.id,
      email: t.email,
      name: t.name,
      role: t.role,
      plan: t.plan,
      subscriptionTier: t.subscriptionTier,
      subscriptionExpiresAt: t.subscriptionExpiresAt,
      quotaMessagesLimit: t.quotaMessagesLimit,
      quotaMessagesUsed: t.quotaMessagesUsed,
      quotaAccountsLimit: t.quotaAccountsLimit,
      isActive: t.isActive,
      org: t.org,
      stats: t._count,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Toggle tenant active status (Suspend / Activate)
   */
  async toggleTenantStatus(targetUserId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Tenant user not found');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });

    if (!isActive) {
      // Pause any active campaigns for this tenant
      await this.prisma.campaign.updateMany({
        where: { userId: targetUserId, status: 'RUNNING' },
        data: { status: 'PAUSED' },
      });
      this.wsGateway.emitToUser(targetUserId, 'system:account_suspended', {
        message: 'Your workspace has been suspended by the administrator.',
      });
    }

    return updated;
  }

  /**
   * Update tenant quota limits and subscription plan manually
   */
  async updateTenantPlan(
    targetUserId: string,
    dto: {
      subscriptionTier?: string;
      quotaMessagesLimit?: number;
      quotaAccountsLimit?: number;
      extendDays?: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Tenant user not found');

    let newExpiresAt = user.subscriptionExpiresAt;
    if (dto.extendDays && dto.extendDays > 0) {
      const baseDate = user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
        ? user.subscriptionExpiresAt
        : new Date();
      newExpiresAt = new Date(baseDate.getTime() + dto.extendDays * 24 * 60 * 60 * 1000);
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        subscriptionTier: dto.subscriptionTier || user.subscriptionTier,
        plan: dto.subscriptionTier || user.plan,
        quotaMessagesLimit: dto.quotaMessagesLimit !== undefined ? Number(dto.quotaMessagesLimit) : user.quotaMessagesLimit,
        quotaAccountsLimit: dto.quotaAccountsLimit !== undefined ? Number(dto.quotaAccountsLimit) : user.quotaAccountsLimit,
        subscriptionExpiresAt: newExpiresAt,
      },
    });

    this.wsGateway.emitToUser(targetUserId, 'system:plan_updated', {
      tier: updated.subscriptionTier,
      quotaMessagesLimit: updated.quotaMessagesLimit,
      quotaAccountsLimit: updated.quotaAccountsLimit,
      expiresAt: updated.subscriptionExpiresAt,
    });

    return updated;
  }

  /**
   * SuperAdmin Impersonation (Login as Client)
   */
  async impersonateUser(targetUserId: string, adminUser: any) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { org: true },
    });
    if (!targetUser) throw new NotFoundException('Target user not found');

    const payload = {
      sub: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      orgId: targetUser.orgId,
      impersonatedBy: adminUser.id,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`Admin ${adminUser.email} impersonated client ${targetUser.email}`);

    return {
      accessToken: token,
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        plan: targetUser.plan,
        subscriptionTier: targetUser.subscriptionTier,
        org: targetUser.org,
        isImpersonated: true,
      },
    };
  }

  /**
   * List all payment receipts with filtering
   */
  async listPaymentReceipts(status?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return this.prisma.paymentReceiptRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true, subscriptionTier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Approve manual payment receipt and activate plan
   */
  async approvePaymentReceipt(receiptId: string, adminUserId: string) {
    const receipt = await this.prisma.paymentReceiptRequest.findUnique({
      where: { id: receiptId },
      include: { user: true },
    });
    if (!receipt) throw new NotFoundException('Payment receipt not found');
    if (receipt.status === 'APPROVED') throw new BadRequestException('Receipt is already approved');

    // Upgrade user limits based on requested plan or message top-up
    const tier = (receipt.planRequested || 'PRO').toUpperCase();
    const isTopUp = tier.startsWith('TOPUP_');

    let updatedTier = receipt.user.subscriptionTier;
    let newQuotaMessagesLimit = receipt.user.quotaMessagesLimit;
    let newQuotaAccountsLimit = receipt.user.quotaAccountsLimit;
    let subscriptionExpiresAt = receipt.user.subscriptionExpiresAt;

    if (isTopUp) {
      const topUpAmount = tier === 'TOPUP_50K' ? 50000 :
                          tier === 'TOPUP_25K' ? 25000 :
                          tier === 'TOPUP_10K' ? 10000 : 5000;
      newQuotaMessagesLimit = receipt.user.quotaMessagesLimit + topUpAmount;
      if (!subscriptionExpiresAt || subscriptionExpiresAt < new Date()) {
        subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      updatedTier = tier;
      if (tier === 'ENTERPRISE') {
        newQuotaMessagesLimit = 150000;
        newQuotaAccountsLimit = 100;
      } else if (tier === 'STARTER') {
        newQuotaMessagesLimit = 5000;
        newQuotaAccountsLimit = 5;
      } else {
        newQuotaMessagesLimit = 30000;
        newQuotaAccountsLimit = 25;
      }
      const durationDays = (receipt.durationMonths || 1) * 30;
      const baseDate = receipt.user.subscriptionExpiresAt && receipt.user.subscriptionExpiresAt > new Date()
        ? receipt.user.subscriptionExpiresAt
        : new Date();
      subscriptionExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // 1. Update user in transaction
    await this.prisma.$transaction([
      this.prisma.paymentReceiptRequest.update({
        where: { id: receipt.id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: receipt.userId },
        data: {
          subscriptionTier: updatedTier,
          plan: updatedTier,
          quotaMessagesLimit: newQuotaMessagesLimit,
          quotaAccountsLimit: newQuotaAccountsLimit,
          subscriptionExpiresAt,
        },
      }),
    ]);

    // 2. Notify client via WebSocket
    this.wsGateway.emitToUser(receipt.userId, 'payment:approved', {
      receiptId: receipt.id,
      tier: updatedTier,
      isTopUp,
      quotaMessagesLimit: newQuotaMessagesLimit,
      subscriptionExpiresAt,
      message: isTopUp
        ? `تم شحن رصيد رسائلك بنجاح بمقدار إضافي! حد الإرسال الجديد: ${newQuotaMessagesLimit.toLocaleString()}`
        : `تمت الموافقة وتفعيل اشتراكك بنجاح! باقتك الحالية: ${updatedTier}`,
    });

    return {
      success: true,
      message: isTopUp
        ? `Top-up approved successfully! User new message limit: ${newQuotaMessagesLimit}`
        : `Payment approved and user upgraded to ${updatedTier}.`,
    };
  }

  /**
   * Reject manual payment receipt
   */
  async rejectPaymentReceipt(receiptId: string, adminUserId: string, reason?: string) {
    const receipt = await this.prisma.paymentReceiptRequest.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Payment receipt not found');

    await this.prisma.paymentReceiptRequest.update({
      where: { id: receipt.id },
      data: {
        status: 'REJECTED',
        adminNotes: reason || 'Receipt verification declined by administrator.',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    this.wsGateway.emitToUser(receipt.userId, 'payment:rejected', {
      receiptId: receipt.id,
      reason: reason || 'Receipt verification declined by administrator.',
    });

    return { success: true, message: 'Receipt rejected successfully.' };
  }

  /**
   * Circuit Breaker Control
   */
  async triggerCircuitBreaker(enable: boolean, adminUserId: string) {
    return this.queueService.triggerEmergencyCircuitBreaker(enable, adminUserId);
  }

  /**
   * BullMQ Queue Health & Detailed Status
   */
  async getQueueStatus() {
    return this.queueService.getDetailedQueueStatus();
  }

  /**
   * Retry all failed BullMQ jobs
   */
  async retryFailedJobs() {
    return this.queueService.retryAllFailedJobs();
  }
}
